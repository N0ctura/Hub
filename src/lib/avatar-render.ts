// Rendering dell'avatar su <canvas> per il download in alta qualita' (@3x).
//
// Perche' non usiamo piu' l'API sharedAvatar come strada principale:
//  - richiede slot obbligatori (e l'errore reale veniva nascosto da un
//    generico "Download non riuscito");
//  - il PNG che restituisce vive su un CDN: il fetch() dal browser dipende
//    dagli header CORS e su Safari/iOS fallisce piu' spesso.
// Qui invece ricomponiamo i layer con LA STESSA geometria dell'anteprima
// (stessa calibrazione), quindi cio' che vedi e' cio' che scarichi.

import {
  layerWidthFraction,
  resolveAdjust,
  type AvatarCalibration,
} from "./avatar-calibration";
import type { WovLayerSpec } from "./wov-avatar";

export type Density = 1 | 2 | 3;

export class AvatarRenderError extends Error {
  reason: "load" | "canvas" | "empty";
  failedUrls: string[];
  constructor(reason: "load" | "canvas" | "empty", message: string, failedUrls: string[] = []) {
    super(message);
    this.reason = reason;
    this.failedUrls = failedUrls;
  }
}

/* ------------------------------ geometria ------------------------------- */

export interface LayerRect {
  /** px, origine in alto a sinistra del quadrato avatar */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Rettangolo di un layer dentro un quadrato largo `boxW` px e alto `boxH` px.
 * Ancoraggio: fondo-centro del quadrato (come il client del gioco).
 */
export function computeLayerRect(
  layer: Pick<WovLayerSpec, "key" | "kind" | "itemId">,
  natural: { w: number; h: number; density: number },
  cal: AvatarCalibration,
  boxW: number,
  boxH: number,
): LayerRect {
  const adj = resolveAdjust(cal, layer);
  const frac = layerWidthFraction(natural.w, natural.density, cal) * adj.scale;
  const w = frac * boxW;
  const h = w * (natural.h / natural.w);
  const x = boxW / 2 + (adj.dx / 100) * boxW - w / 2;
  const y = boxH - (adj.dy / 100) * boxW - h;
  return { x, y, w, h };
}

/* ------------------------- caricamento immagini ------------------------- */

function withCacheBust(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}cors=${Date.now()}`;
}

function loadOnce(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Senza crossOrigin il canvas risulterebbe "tainted" e toBlob() fallirebbe.
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`load failed: ${url}`));
    img.src = url;
  });
}

/**
 * Carica un'immagine con CORS. Secondo tentativo con parametro anti-cache:
 * Safari/Chrome possono riutilizzare la risposta "no-cors" messa in cache
 * dall'anteprima (<img> senza crossorigin) e rifiutarla per il canvas.
 */
async function loadImageCors(url: string): Promise<HTMLImageElement> {
  try {
    return await loadOnce(url);
  } catch {
    return await loadOnce(withCacheBust(url));
  }
}

export interface LoadedLayer {
  spec: WovLayerSpec;
  img: HTMLImageElement;
  density: Density;
}

/**
 * Per ogni layer prova @3x, poi @2x, poi @1x. Un layer che non esiste in
 * nessuna densita' viene saltato (e segnalato), ma non blocca tutto.
 */
async function loadLayers(
  sets: Record<Density, WovLayerSpec[]>,
  wanted: Density,
): Promise<{ loaded: LoadedLayer[]; failed: string[] }> {
  const order: Density[] = ([wanted, 2, 1] as Density[]).filter(
    (d, i, a) => a.indexOf(d) === i,
  );
  const base = sets[wanted];
  const failed: string[] = [];

  const results = await Promise.all(
    base.map(async (spec, index): Promise<LoadedLayer | null> => {
      for (const d of order) {
        const candidate = sets[d]?.[index];
        // stessa posizione = stesso layer (le liste sono costruite nello stesso ordine)
        if (!candidate || candidate.key !== spec.key) continue;
        try {
          const img = await loadImageCors(candidate.url);
          return { spec: candidate, img, density: d };
        } catch {
          /* prova la densita' successiva */
        }
      }
      failed.push(spec.url);
      return null;
    }),
  );

  return { loaded: results.filter((r): r is LoadedLayer => r !== null), failed };
}

/* ------------------------------- render --------------------------------- */

export interface RenderOptions {
  /** Layer costruiti per ogni densita' con buildAvatarLayers(..., d). */
  layerSets: Record<Density, WovLayerSpec[]>;
  calibration: AvatarCalibration;
  density?: Density; // default 3
}

export interface RenderResult {
  blob: Blob;
  width: number;
  height: number;
  /** Layer che non e' stato possibile caricare (saltati). */
  skipped: string[];
  /** Densita' effettivamente usata per ogni layer (utile per il debug). */
  densities: Record<string, Density>;
}

export async function renderAvatarBlob(opts: RenderOptions): Promise<RenderResult> {
  const density: Density = opts.density ?? 3;
  const cal = opts.calibration;

  if (!opts.layerSets[density]?.length) {
    throw new AvatarRenderError("empty", "Nessun layer da disegnare");
  }

  const { loaded, failed } = await loadLayers(opts.layerSets, density);
  if (!loaded.length) {
    throw new AvatarRenderError(
      "load",
      "Impossibile caricare le immagini dal CDN (probabile blocco CORS)",
      failed,
    );
  }

  // Dimensione del quadrato in pixel: 372 unita' @1x × densita'.
  const boxW = (cal.baseDivisor / 2) * density;
  const boxH = boxW * (cal.box.ratioH / cal.box.ratioW);

  const placed = loaded.map((l) => ({
    ...l,
    rect: computeLayerRect(
      l.spec,
      { w: l.img.naturalWidth, h: l.img.naturalHeight, density: l.density },
      cal,
      boxW,
      boxH,
    ),
  }));

  // Tela: il quadrato, oppure l'unione con tutti i layer (nessun taglio).
  let minX = 0;
  let minY = 0;
  let maxX = boxW;
  let maxY = boxH;
  if (cal.exportFit) {
    for (const p of placed) {
      minX = Math.min(minX, p.rect.x);
      minY = Math.min(minY, p.rect.y);
      maxX = Math.max(maxX, p.rect.x + p.rect.w);
      maxY = Math.max(maxY, p.rect.y + p.rect.h);
    }
  }
  const width = Math.max(1, Math.ceil(maxX - minX));
  const height = Math.max(1, Math.ceil(maxY - minY));

  // Limite prudente per iOS (la tela massima e' ~16,7 megapixel).
  if (width * height > 16_000_000) {
    throw new AvatarRenderError("canvas", "Immagine troppo grande per questo dispositivo");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new AvatarRenderError("canvas", "Canvas non disponibile");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Stesso z-order dell'anteprima (sort stabile: a parita' di z vale l'ordine di lista).
  const sorted = placed
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p.spec.z - b.p.spec.z || a.i - b.i);

  const densities: Record<string, Density> = {};
  for (const { p } of sorted) {
    ctx.drawImage(p.img, p.rect.x - minX, p.rect.y - minY, p.rect.w, p.rect.h);
    densities[p.spec.key] = p.density;
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(
                new AvatarRenderError(
                  "canvas",
                  "Il browser ha rifiutato l'esportazione (canvas bloccato da CORS)",
                ),
              ),
        "image/png",
      );
    } catch (e) {
      // SecurityError se il canvas e' "tainted"
      reject(
        new AvatarRenderError(
          "canvas",
          e instanceof Error ? e.message : "Esportazione canvas non riuscita",
        ),
      );
    }
  });

  return { blob, width, height, skipped: failed, densities };
}

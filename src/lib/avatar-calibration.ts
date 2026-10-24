// Calibrazione dell'avatar Wolvesville.
//
// Tutto cio' che si puo' regolare dal menu DEV vive in un unico oggetto JSON.
// I valori predefiniti stanno in  src/data/avatar-calibration.default.json :
// per renderli definitivi basta sostituire quel file con il JSON scaricato
// dal menu dev (oppure mandarlo a Claude).
//
// Unita' di misura (uguali in anteprima e nel PNG scaricato):
//   scale  = moltiplicatore (1 = invariato)
//   dx, dy = % della LARGHEZZA del quadrato avatar (dy > 0 sposta verso l'alto)

import defaultsJson from "@/data/avatar-calibration.default.json";

export interface Adjust {
  scale: number;
  dx: number;
  dy: number;
}

export interface ItemOverride extends Adjust {
  /** Metadati solo informativi: servono a trovare una regola per gli item "vecchi". */
  title?: string;
  type?: string;
  event?: string;
  rarity?: string;
  natural?: { w: number; h: number; density: number };
  raw?: Record<string, unknown>;
}

export interface BoxSettings {
  /** Larghezza del quadrato avatar in % del riquadro anteprima. */
  widthPct: number;
  /** Forma del quadrato (larghezza : altezza). */
  ratioW: number;
  ratioH: number;
  /** Spostamento del quadrato nell'anteprima, in % del riquadro anteprima. */
  offsetX: number;
  offsetY: number;
}

export interface AvatarCalibration {
  version: 1;
  box: BoxSettings;
  /** Divisore della formula larghezza = natural@2x / divisor (744 = formula del gioco). */
  baseDivisor: number;
  /** Omino: solo i layer del body paint (corpo, testa, bocca del body paint). */
  body: Adjust;
  /** Tutti gli item (cappelli, capelli, maglie...). */
  items: Adjust;
  /** Aggiustamento per slot, chiave = key del layer (hat, hair2, shirt...). */
  layers: Record<string, Adjust>;
  /** Aggiustamento per singolo item, chiave = id item (es. "AbC"). */
  overrides: Record<string, ItemOverride>;
  /** Nel PNG scaricato allarga la tela per non tagliare item che escono dal quadrato. */
  exportFit: boolean;
}

export const NEUTRAL: Adjust = { scale: 1, dx: 0, dy: 0 };

export const FALLBACK_CALIBRATION: AvatarCalibration = {
  version: 1,
  box: { widthPct: 76, ratioW: 372, ratioH: 430, offsetX: 0, offsetY: 0 },
  baseDivisor: 744,
  body: { ...NEUTRAL },
  items: { ...NEUTRAL },
  layers: {},
  overrides: {},
  exportFit: true,
};

// v3: l'omino ora usa le immagini @3x e scala 1 (niente piu' correzione 0.58 della v2).
// La chiave nuova evita che una vecchia calibrazione salvata copra i nuovi default.
export const CALIBRATION_STORAGE_KEY = "wov_calibration_v3";
const LEGACY_CALIBRATION_STORAGE_KEYS = ["wov_calibration_v2", "wov_calibration_v1"];

/* ------------------------------ sanitize -------------------------------- */

function num(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function adjust(v: unknown, fallback: Adjust = NEUTRAL): Adjust {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    scale: num(o.scale, fallback.scale, 0.05, 5),
    dx: num(o.dx, fallback.dx, -200, 200),
    dy: num(o.dy, fallback.dy, -200, 200),
  };
}

function record<T>(v: unknown, map: (x: unknown) => T): Record<string, T> {
  const out: Record<string, T> = {};
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = map(val);
    }
  }
  return out;
}

function override(v: unknown): ItemOverride {
  const base = adjust(v);
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const out: ItemOverride = { ...base };
  if (typeof o.title === "string") out.title = o.title;
  if (typeof o.type === "string") out.type = o.type;
  if (typeof o.event === "string") out.event = o.event;
  if (typeof o.rarity === "string") out.rarity = o.rarity;
  if (o.raw && typeof o.raw === "object") out.raw = o.raw as Record<string, unknown>;
  const n = o.natural as Record<string, unknown> | undefined;
  if (n && typeof n === "object") {
    out.natural = {
      w: num(n.w, 0, 0, 100000),
      h: num(n.h, 0, 0, 100000),
      density: num(n.density, 2, 1, 3),
    };
  }
  return out;
}

/** Rende valido (e completo) qualunque JSON importato o salvato. */
export function sanitizeCalibration(
  raw: unknown,
  base: AvatarCalibration = FALLBACK_CALIBRATION,
): AvatarCalibration {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const b = (o.box && typeof o.box === "object" ? o.box : {}) as Record<string, unknown>;
  return {
    version: 1,
    box: {
      widthPct: num(b.widthPct, base.box.widthPct, 10, 200),
      ratioW: num(b.ratioW, base.box.ratioW, 1, 10000),
      ratioH: num(b.ratioH, base.box.ratioH, 1, 10000),
      offsetX: num(b.offsetX, base.box.offsetX, -100, 100),
      offsetY: num(b.offsetY, base.box.offsetY, -100, 100),
    },
    baseDivisor: num(o.baseDivisor, base.baseDivisor, 100, 3000),
    body: adjust(o.body, base.body),
    items: adjust(o.items, base.items),
    layers: record(o.layers, (x) => adjust(x)),
    overrides: record(o.overrides, override),
    exportFit: typeof o.exportFit === "boolean" ? o.exportFit : base.exportFit,
  };
}

/** Valori predefiniti = file JSON in src/data (completati con i fallback). */
export const DEFAULT_CALIBRATION: AvatarCalibration = sanitizeCalibration(
  defaultsJson,
  FALLBACK_CALIBRATION,
);

/* ------------------------------ storage --------------------------------- */

export function loadCalibration(): AvatarCalibration {
  if (typeof window === "undefined") return DEFAULT_CALIBRATION;
  try {
    const raw = window.localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (raw) return sanitizeCalibration(JSON.parse(raw), DEFAULT_CALIBRATION);

    // Migrazione dalla v1: si tengono SOLO le regole per slot e per singolo item
    // (lavoro fatto a mano); box / omino / item globali tornano ai nuovi default.
    const legacy = LEGACY_CALIBRATION_STORAGE_KEYS.map((k) => window.localStorage.getItem(k)).find(Boolean);
    if (legacy) {
      const old = JSON.parse(legacy) as Record<string, unknown>;
      return sanitizeCalibration(
        { ...DEFAULT_CALIBRATION, layers: old.layers, overrides: old.overrides },
        DEFAULT_CALIBRATION,
      );
    }
    return DEFAULT_CALIBRATION;
  } catch {
    return DEFAULT_CALIBRATION;
  }
}

export function saveCalibration(cal: AvatarCalibration): void {
  try {
    window.localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(cal));
  } catch {
    /* quota piena: la calibrazione resta comunque in memoria */
  }
}

export function clearStoredCalibration(): void {
  try {
    window.localStorage.removeItem(CALIBRATION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------- risoluzione per layer ------------------------ */

export interface LayerIdentity {
  key: string;
  kind: "body" | "item";
  itemId?: string;
}

/**
 * Aggiustamento finale di un layer = globale (omino o item)
 *   × slot (layers[key]) × singolo item (overrides[id]).
 * Le scale si moltiplicano, gli spostamenti si sommano.
 */
export function resolveAdjust(cal: AvatarCalibration, layer: LayerIdentity): Adjust {
  const g = layer.kind === "body" ? cal.body : cal.items;
  const l = cal.layers[layer.key] ?? NEUTRAL;
  const o = (layer.itemId && cal.overrides[layer.itemId]) || NEUTRAL;
  return {
    scale: g.scale * l.scale * o.scale,
    dx: g.dx + l.dx + o.dx,
    dy: g.dy + l.dy + o.dy,
  };
}

/** Larghezza del layer come frazione (0..1+) della larghezza del quadrato. */
export function layerWidthFraction(
  naturalWidth: number,
  density: number,
  cal: AvatarCalibration,
): number {
  // natural@density / density = larghezza @1x ; il gioco usa @1x / 186 × 50%
  // => @1x / (divisor/2). Con density=2 e divisor=744 e' natural / 744.
  return naturalWidth / density / (cal.baseDivisor / 2);
}

export function isDefaultAdjust(a: Adjust): boolean {
  return a.scale === 1 && a.dx === 0 && a.dy === 0;
}

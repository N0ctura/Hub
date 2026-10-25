// Motore di rendering dell'avatar di Wolvesville.
// Ricostruito dal client ufficiale (React Native Web): ogni layer viene
// posizionato ancorato al FONDO del contenitore, centrato orizzontalmente,
// con larghezza = larghezzaNaturale / largeDefaultBodyWidth(186) × 50%.
//
// Il browser carica le immagini @2x: la larghezza @1x (usata dalla formula
// del gioco) è natural@2x / 2, quindi:
//   larghezza% del contenitore = naturalWidth@2x / 744 × 100
// Le immagini sono disegnate apposta per allinearsi così:
// NON servono coordinate per-item.

import type { WovAvatarSlots } from "./wov-api";

/** Rapporto del box di anteprima (larghezza/altezza in unità @2x). */
export const AVATAR_BOX_RATIO = "372 / 430";

/**
 * Larghezza base del box avatar in % del riquadro di anteprima.
 * Modificando AVATAR_BOX_BASE_WIDTH_SKIN_EDITOR cambi il valore
 * "100%" della scala dell'editor skin.
 */
export const AVATAR_BOX_BASE_WIDTH_PCT = 76;

/** Fattore di scala della lapide (renderer dedicato nel gioco: ×1.3). */
export const GRAVESTONE_SCALE = 1.3;

export interface WovLayerSpec {
  key: string;
  url: string;
  z: number;
  /** "body" = parti del body paint (omino), "item" = tutto il resto. */
  kind: "body" | "item";
  /** ID dell'item (o del body paint) da cui arriva il layer. */
  itemId?: string;
  /**
   * Densita' reale dell'immagine in `url` (default 2). I body paint usano sempre @3x,
   * come il client ufficiale: la larghezza va calcolata con la densita' VERA del file.
   */
  density?: 1 | 2 | 3;
}

/** Densita' con cui il client ufficiale carica le parti del body paint (misurato). */
export const BODY_PAINT_DENSITY = 3;

/** Vero se l'URL e' una "store icon" (`<slug>.store.png`, anche `.store@2x.png`). */
export function isStoreIconUrl(url: string): boolean {
  return /\.store(@\dx)?\.png/i.test(url);
}

function slugFromStoreUrl(storeUrl: string): string {
  const file = storeUrl.split("/").pop() ?? "";
  return file.replace(/\.store(@\dx)?\.png.*$/i, "");
}

function avatarLayerUrl(path: string): string {
  if (process.env.NODE_ENV === "development") {
    return `/__wov-cdn/${path}`;
  }
  return `https://cdn2.wolvesville.com/${path}`;
}

/**
 * Proxy CORS per gli asset di Wolvesville.
 *
 * Il CDN (cdn2.wolvesville.com e cdn-avatars.wolvesville.com) NON invia header
 * Access-Control-Allow-Origin. Senza di essi il browser non lascia leggere i pixel
 * dei layer in un <canvas> (canvas "tainted") ne' scaricare il PNG di sharedAvatar
 * con fetch(): il download restava trasparente/bloccato.
 * wsrv.nl (images.weserv.nl) rimanda l'immagine aggiungendo "Access-Control-Allow-Origin: *"
 * senza modificarne dimensioni ne' trasparenza.
 * In sviluppo il proxy non serve: il rewrite /__wov-cdn di next.config.mjs
 * serve gli stessi file same-origin.
 */
const CORS_PROXY_ORIGIN = "https://wsrv.nl/?url=";

/** URL leggibile dal canvas: se e' cross-origin passa dal proxy CORS. */
export function corsSafeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) return url;
  try {
    if (new URL(url).origin === window.location.origin) return url;
  } catch {
    return url;
  }
  return `${CORS_PROXY_ORIGIN}${encodeURIComponent(url)}`;
}

/** URL del layer avatar-large di un item, ricavato dalla store icon. */
export function itemLayerUrl(storeUrl: string, density: 1 | 2 | 3 = 2): string {
  const slug = slugFromStoreUrl(storeUrl);
  const suffix = density === 1 ? "" : `@${density}x`;
  return avatarLayerUrl(`avatarItems/${slug}.avatar-large${suffix}.png`);
}

/** I bodyPaint hanno 3 parti: body-, head-, mouth- + slug. */
export function bodyPaintLayerUrls(
  storeUrl: string,
  density: 1 | 2 | 3 = 2,
): {
  body: string;
  head: string;
  mouth: string;
} {
  const slug = slugFromStoreUrl(storeUrl);
  const suffix = density === 1 ? "" : `@${density}x`;
  const base = "bodyPaints";
  return {
    body: avatarLayerUrl(`${base}/body-${slug}.avatar-large${suffix}.png`),
    head: avatarLayerUrl(`${base}/head-${slug}.avatar-large${suffix}.png`),
    mouth: avatarLayerUrl(`${base}/mouth-${slug}.avatar-large${suffix}.png`),
  };
}

/** Icona del negozio in alta qualità: versione @2x su cdn2 (come il gioco). */
export function storeIconUrl(storeUrl: string): string {
  // Se non e' una store icon (es. preview di un pacchetto skin) NON va riscritta:
  // prima il filename intero finiva nello "slug" e usciva un URL inesistente (404).
  if (!isStoreIconUrl(storeUrl)) return storeUrl;
  const slug = slugFromStoreUrl(storeUrl);
  const dir = storeUrl.includes("/bodyPaints/") ? "bodyPaints" : "avatarItems";
  return `https://cdn2.wolvesville.com/${dir}/${slug}.store@2x.png`;
}

/**
 * Larghezza del layer in % della larghezza del contenitore.
 * Formula del gioco: dataWidth / 186 × 50%, dove dataWidth = larghezza @1x.
 * Le immagini che carichiamo sono @2x, quindi: natural@2x / 2 / 186 × 50%
 * = natural@2x / 744 × 100.
 */
export function layerWidthPercent(
  natural2xWidth: number,
  gravestone = false,
  divisor = 744,
): number {
  return ((natural2xWidth / divisor) * 100) * (gravestone ? GRAVESTONE_SCALE : 1);
}

/**
 * Ordine dei livelli identico al client ufficiale:
 * back → bodyPaint(corpo) → maglia → badge → bodyPaint(testa) → bocca →
 * occhi → capelli → maschera → occhiali → cappello → front.
 * La bocca del bodyPaint vale solo se non indossi un item bocca.
 */
export function buildAvatarLayers(
  slots: WovAvatarSlots,
  getItemStoreUrl: (id: string | null | undefined) => string | undefined,
  getBodyPaintStoreUrl: (id: string | null | undefined) => string | undefined,
  density: 1 | 2 | 3 = 2,
  bodyPaintDensity: 1 | 2 | 3 = BODY_PAINT_DENSITY,
): WovLayerSpec[] {
  const layers: WovLayerSpec[] = [];

  const pushItem = (key: string, slotKey: string, z: number) => {
    const id = slots[slotKey];
    const storeUrl = getItemStoreUrl(id);
    const url = itemLayerUrlIf(storeUrl, density);
    if (!url) return;
    layers.push({
      key,
      url,
      z,
      kind: "item",
      itemId: id ?? undefined,
      // Item personalizzati: un solo file, sempre alla sua densita' reale (2)
      ...(isCustomUrl(storeUrl) ? { density: 2 as const } : {}),
    });
  };
  const pushBody = (key: string, url: string, z: number) => {
    layers.push({
      key,
      url,
      z,
      kind: "body",
      itemId: slots.bodyPaintId ?? undefined,
      density: bodyPaintDensity,
    });
  };

  // Il client carica body/head/mouth a @3x; le miniature possono richiedere una densita'
  // inferiore per ridurre i dati trasferiti.
  const bpStore = getBodyPaintStoreUrl(slots.bodyPaintId);
  const bpUrls = bpStore ? bodyPaintLayerUrls(bpStore, bodyPaintDensity) : null;

  pushItem("back", "backId", 1);
  pushItem("back2", "backId2", 2);
  if (bpUrls) pushBody("body", bpUrls.body, 3);
  pushItem("legs", "legsId", 4);
  pushItem("legs2", "legsId2", 5);
  pushItem("shirt", "shirtId", 6);
  pushItem("shirt2", "shirtId2", 7);
  pushItem("badge", "badgeId", 6);
  pushItem("badge2", "badgeId2", 7);
  if (bpUrls) pushBody("head", bpUrls.head, 8);

  // La bocca del body paint vale solo se non indossi un item bocca.
  const mouthUrl = itemLayerUrlIf(getItemStoreUrl(slots.mouthId), density);
  if (mouthUrl) pushItem("mouth", "mouthId", 9);
  else if (bpUrls) pushBody("mouth", bpUrls.mouth, 9);

  pushItem("mouth2", "mouthId2", 10);
  pushItem("eyes", "eyesId", 11);
  pushItem("eyes2", "eyesId2", 12);
  pushItem("hair", "hairId", 13);
  pushItem("hair2", "hairId2", 14);
  pushItem("mask", "maskId", 15);
  pushItem("mask2", "maskId2", 16);
  pushItem("glasses", "glassesId", 17);
  pushItem("glasses2", "glassesId2", 18);
  pushItem("hat", "hatId", 19);
  pushItem("hat2", "hatId2", 20);
  pushItem("front", "frontId", 21);
  pushItem("front2", "frontId2", 22);

  return layers;
}

/** Item personalizzato: PNG locale in public/custom/ (non passa dal CDN di Wolvesville). */
function isCustomUrl(url: string | undefined): boolean {
  return !!url && !/^https?:/i.test(url) && url.includes("/custom/");
}

function itemLayerUrlIf(
  storeUrl: string | undefined,
  density: 1 | 2 | 3,
): string | undefined {
  if (!storeUrl) return undefined;
  return isCustomUrl(storeUrl) ? storeUrl : itemLayerUrl(storeUrl, density);
}

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
}

function slugFromStoreUrl(storeUrl: string): string {
  const file = storeUrl.split("/").pop() ?? "";
  return file.replace(/\.store\.png.*$/i, "");
}

/** URL del layer avatar-large di un item, ricavato dalla store icon. */
export function itemLayerUrl(storeUrl: string, density: 1 | 2 | 3 = 2): string {
  const slug = slugFromStoreUrl(storeUrl);
  const suffix = density === 1 ? "" : `@${density}x`;
  return `https://cdn2.wolvesville.com/avatarItems/${slug}.avatar-large${suffix}.png`;
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
  const base = "https://cdn2.wolvesville.com/bodyPaints";
  return {
    body: `${base}/body-${slug}.avatar-large${suffix}.png`,
    head: `${base}/head-${slug}.avatar-large${suffix}.png`,
    mouth: `${base}/mouth-${slug}.avatar-large${suffix}.png`,
  };
}

/** Icona del negozio in alta qualità: versione @2x su cdn2 (come il gioco). */
export function storeIconUrl(storeUrl: string): string {
  const file = storeUrl.split("/").pop() ?? "";
  const slug = file.replace(/\.store\.png.*$/i, "");
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
): WovLayerSpec[] {
  const layers: WovLayerSpec[] = [];

  const pushItem = (key: string, slotKey: string, z: number) => {
    const id = slots[slotKey];
    const url = itemLayerUrlIf(getItemStoreUrl(id), density);
    if (url) layers.push({ key, url, z, kind: "item", itemId: id ?? undefined });
  };
  const pushBody = (key: string, url: string, z: number) => {
    layers.push({ key, url, z, kind: "body", itemId: slots.bodyPaintId ?? undefined });
  };

  const bpStore = getBodyPaintStoreUrl(slots.bodyPaintId);
  const bpUrls = bpStore ? bodyPaintLayerUrls(bpStore, density) : null;

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

function itemLayerUrlIf(
  storeUrl: string | undefined,
  density: 1 | 2 | 3,
): string | undefined {
  return storeUrl ? itemLayerUrl(storeUrl, density) : undefined;
}

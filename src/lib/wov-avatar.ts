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
export const AVATAR_BOX_RATIO = "372 / 900";

/** Fattore di scala della lapide (renderer dedicato nel gioco: ×1.3). */
export const GRAVESTONE_SCALE = 1.3;

export interface WovLayerSpec {
  key: string;
  url: string;
  z: number;
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
export function layerWidthPercent(natural2xWidth: number, gravestone = false): number {
  return ((natural2xWidth / 744) * 100) * (gravestone ? GRAVESTONE_SCALE : 1);
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
  const push = (key: string, url: string | undefined, z: number) => {
    if (url) layers.push({ key, url, z });
  };

  const bpStore = getBodyPaintStoreUrl(slots.bodyPaintId);
  const bpUrls = bpStore ? bodyPaintLayerUrls(bpStore, density) : null;

  push("back", itemLayerUrlIf(getItemStoreUrl(slots.backId), density), 1);
  push("back2", itemLayerUrlIf(getItemStoreUrl(slots.backId2), density), 2);
  if (bpUrls) push("body", bpUrls.body, 3);
  push("shirt", itemLayerUrlIf(getItemStoreUrl(slots.shirtId), density), 4);
  push("shirt2", itemLayerUrlIf(getItemStoreUrl(slots.shirtId2), density), 5);
  push("badge", itemLayerUrlIf(getItemStoreUrl(slots.badgeId), density), 6);
  push("badge2", itemLayerUrlIf(getItemStoreUrl(slots.badgeId2), density), 7);
  if (bpUrls) push("head", bpUrls.head, 8);
  const mouthUrl = itemLayerUrlIf(getItemStoreUrl(slots.mouthId), density);
  if (mouthUrl) push("mouth", mouthUrl, 9);
  else if (bpUrls) push("mouth", bpUrls.mouth, 9);
  push("mouth2", itemLayerUrlIf(getItemStoreUrl(slots.mouthId2), density), 10);
  push("eyes", itemLayerUrlIf(getItemStoreUrl(slots.eyesId), density), 11);
  push("eyes2", itemLayerUrlIf(getItemStoreUrl(slots.eyesId2), density), 12);
  push("hair", itemLayerUrlIf(getItemStoreUrl(slots.hairId), density), 13);
  push("hair2", itemLayerUrlIf(getItemStoreUrl(slots.hairId2), density), 14);
  push("mask", itemLayerUrlIf(getItemStoreUrl(slots.maskId), density), 15);
  push("mask2", itemLayerUrlIf(getItemStoreUrl(slots.maskId2), density), 16);
  push("glasses", itemLayerUrlIf(getItemStoreUrl(slots.glassesId), density), 17);
  push("glasses2", itemLayerUrlIf(getItemStoreUrl(slots.glassesId2), density), 18);
  push("hat", itemLayerUrlIf(getItemStoreUrl(slots.hatId), density), 19);
  push("hat2", itemLayerUrlIf(getItemStoreUrl(slots.hatId2), density), 20);
  push("front", itemLayerUrlIf(getItemStoreUrl(slots.frontId), density), 21);
  push("front2", itemLayerUrlIf(getItemStoreUrl(slots.frontId2), density), 22);

  return layers;
}

function itemLayerUrlIf(
  storeUrl: string | undefined,
  density: 1 | 2 | 3,
): string | undefined {
  return storeUrl ? itemLayerUrl(storeUrl, density) : undefined;
}

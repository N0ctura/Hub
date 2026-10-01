// Motore di rendering dell'avatar di Wolvesville.
// Ricostruito dal client ufficiale (React Native Web): ogni layer viene
// posizionato ancorato al FONDO del contenitore, centrato orizzontalmente,
// con larghezza = larghezzaNaturale / largeDefaultBodyWidth(186) × 50%.
//
// Il browser carica le immagini @2x, quindi in unità @2x:
//   larghezza% del contenitore = naturalWidth@2x / 372 × 100
// (372 = 186 × 2). Le immagini sono disegnate apposta per allinearsi così:
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

/** URL del layer avatar-large@2x di un item, ricavato dalla store icon. */
export function itemLayerUrl(storeUrl: string): string {
  const slug = slugFromStoreUrl(storeUrl);
  return `https://cdn2.wolvesville.com/avatarItems/${slug}.avatar-large@2x.png`;
}

/** I bodyPaint hanno 3 parti: body-, head-, mouth- + slug. */
export function bodyPaintLayerUrls(storeUrl: string): {
  body: string;
  head: string;
  mouth: string;
} {
  const slug = slugFromStoreUrl(storeUrl);
  const base = "https://cdn2.wolvesville.com/bodyPaints";
  return {
    body: `${base}/body-${slug}.avatar-large@2x.png`,
    head: `${base}/head-${slug}.avatar-large@2x.png`,
    mouth: `${base}/mouth-${slug}.avatar-large@2x.png`,
  };
}

/** Larghezza del layer in % della larghezza del contenitore. */
export function layerWidthPercent(natural2xWidth: number, gravestone = false): number {
  return ((natural2xWidth / 372) * 100) * (gravestone ? GRAVESTONE_SCALE : 1);
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
): WovLayerSpec[] {
  const layers: WovLayerSpec[] = [];
  const push = (key: string, url: string | undefined, z: number) => {
    if (url) layers.push({ key, url, z });
  };

  const bpUrls = getBodyPaintStoreUrl(slots.bodyPaintId)
    ? bodyPaintLayerUrls(getBodyPaintStoreUrl(slots.bodyPaintId) as string)
    : null;

  push("back", itemLayerUrlIf(getItemStoreUrl(slots.backId)), 1);
  push("back2", itemLayerUrlIf(getItemStoreUrl(slots.backId2)), 2);
  if (bpUrls) push("body", bpUrls.body, 3);
  push("shirt", itemLayerUrlIf(getItemStoreUrl(slots.shirtId)), 4);
  push("shirt2", itemLayerUrlIf(getItemStoreUrl(slots.shirtId2)), 5);
  push("badge", itemLayerUrlIf(getItemStoreUrl(slots.badgeId)), 6);
  push("badge2", itemLayerUrlIf(getItemStoreUrl(slots.badgeId2)), 7);
  if (bpUrls) push("head", bpUrls.head, 8);
  const mouthUrl = itemLayerUrlIf(getItemStoreUrl(slots.mouthId));
  if (mouthUrl) push("mouth", mouthUrl, 9);
  else if (bpUrls) push("mouth", bpUrls.mouth, 9);
  push("mouth2", itemLayerUrlIf(getItemStoreUrl(slots.mouthId2)), 10);
  push("eyes", itemLayerUrlIf(getItemStoreUrl(slots.eyesId)), 11);
  push("eyes2", itemLayerUrlIf(getItemStoreUrl(slots.eyesId2)), 12);
  push("hair", itemLayerUrlIf(getItemStoreUrl(slots.hairId)), 13);
  push("hair2", itemLayerUrlIf(getItemStoreUrl(slots.hairId2)), 14);
  push("mask", itemLayerUrlIf(getItemStoreUrl(slots.maskId)), 15);
  push("mask2", itemLayerUrlIf(getItemStoreUrl(slots.maskId2)), 16);
  push("glasses", itemLayerUrlIf(getItemStoreUrl(slots.glassesId)), 17);
  push("glasses2", itemLayerUrlIf(getItemStoreUrl(slots.glassesId2)), 18);
  push("hat", itemLayerUrlIf(getItemStoreUrl(slots.hatId)), 19);
  push("hat2", itemLayerUrlIf(getItemStoreUrl(slots.hatId2)), 20);
  push("front", itemLayerUrlIf(getItemStoreUrl(slots.frontId)), 21);
  push("front2", itemLayerUrlIf(getItemStoreUrl(slots.frontId2)), 22);

  return layers;
}

function itemLayerUrlIf(storeUrl: string | undefined): string | undefined {
  return storeUrl ? itemLayerUrl(storeUrl) : undefined;
}

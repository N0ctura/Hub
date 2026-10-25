// Item personalizzati (non esistono nel catalogo di Wolvesville).
//
// Ogni item e' un PNG con sfondo trasparente in  public/custom/ . Appare nelle liste come
// un item normale (stesso slot e stessi filtri) e viene composto come gli altri layer.
//
// - `layerDensity`: densita' del PNG (2 = come i file @2x del gioco). Larghezza sullo
//   schermo = larghezza PNG / 744 del riquadro avatar; se risulta troppo grande/piccola
//   si regola dal menu DEV (override per id) oppure cambiando layerDensity.
// - `DEFAULT_SHIRT_ID`: maglia con cui parte l'avatar.

import { withBase } from "@/lib/base-path";
import type { WovAvatarItem } from "@/lib/wov-api";

export const CUSTOM_ID_PREFIX = "custom-";

export const CUSTOM_ITEMS: WovAvatarItem[] = [
  {
    id: "custom-rok-shirt",
    type: "SHIRT",
    rarity: "LEGENDARY",
    title: "ROK Rock (maglia)",
    imageUrl: withBase("/custom/maglia-rok.png"),
    layerDensity: 2,
  },
];

/** Maglia di partenza dell'avatar (null = usa la maglia base del catalogo). */
export const DEFAULT_SHIRT_ID: string | null = "custom-rok-shirt";

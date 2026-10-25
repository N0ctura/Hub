// Item personalizzati (non esistono nel catalogo di Wolvesville).
//
// Ogni item e' un PNG con sfondo trasparente in  public/custom/ . Appare nelle liste come
// un item normale (stesso slot e stessi filtri) e viene composto come gli altri layer.
//
// - La scala del PNG sta nel nome file: "nome@2x.png" = grandezza dei file del gioco,
//   "nome@8x.png" = 4 volte piu' grande (stessa dimensione sullo schermo, piu' nitido).
//   Senza suffisso vale @2x. Se l'item risulta troppo grande/piccolo si regola dal
//   menu DEV (override per id) oppure cambiando il numero nel nome del file.
// - `DEFAULT_AVATAR` (in fondo): skin con cui parte l'avatar.

import { withBase } from "@/lib/base-path";
import type { WovAvatarItem } from "@/lib/wov-api";

export const CUSTOM_ID_PREFIX = "custom-";

export const CUSTOM_ITEMS: WovAvatarItem[] = [
  {
    id: "custom-rok-shirt",
    type: "SHIRT",
    rarity: "LEGENDARY",
    title: "ROK Rock (maglia)",
    imageUrl: withBase("/custom/maglia-rok@8x.png"),
  },
];

/**
 * Regolazione di partenza per item personalizzato (stessa unita' del menu DEV):
 *   scale = moltiplicatore (1.5 = 50% piu' grande)
 *   dx    = spostamento orizzontale, % della larghezza dell'avatar (+ = destra)
 *   dy    = spostamento verticale, stessa unita' (+ = verso l'alto)
 * Un override fatto dal menu DEV per lo stesso id ha la precedenza.
 */
export const CUSTOM_DEFAULT_ADJUST: Record<string, { scale: number; dx: number; dy: number }> = {
  "custom-rok-shirt": { scale: 1.5, dx: 0, dy: 0 },
};

/**
 * Skin con cui parte l'avatar (slot -> id). Si possono usare id del catalogo e item
 * personalizzati. Per cambiarla: tocca un item con "Codici item" attivo, oppure usa
 * "Copia gli ID dell'avatar attuale" nelle impostazioni e incolla qui il risultato.
 * Un id che non esiste nel catalogo viene ignorato.
 */
export const DEFAULT_AVATAR: Record<string, string> = {
  bodyPaintId: "37K",
  eyesId: "RV4",
  hairId: "mZ9",
  shirtId: "custom-rok-shirt",
  maskId: "ZFf",
  mouthId: "6TH",
};

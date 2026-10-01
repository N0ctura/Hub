// Client per la Wolvesville Public API (https://api-docs.wolvesville.com)
// L'API key NON viene mai scritta nel codice: l'utente la incolla una volta
// nell'app e resta nel localStorage del suo browser.

export const API_BASE = "https://api.wolvesville.com";

const CACHE_PREFIX = "wov_cache_";
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 ore

export type WovItemType =
  | "SHIRT"
  | "HAIR"
  | "HAT"
  | "GLASSES"
  | "GRAVESTONE"
  | "FRONT"
  | "BACK"
  | "EYES"
  | "BADGE"
  | "MASK"
  | "MOUTH"
  | "LEGS";

export type WovRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHICAL";

export interface WovAvatarItem {
  id: string; // short ID (3 caratteri)
  imageUrl: string;
  type: WovItemType;
  rarity: WovRarity;
  gender?: "MALE" | "FEMALE";
  minLevel?: number;
  costInGold?: number;
  costInRoses?: number;
  costInGems?: number;
  event?: string;
  title?: string;
  [key: string]: unknown;
}

export interface WovBodyPaint {
  id: string;
  imageUrl: string;
  [key: string]: unknown;
}

export interface WovBackground {
  id: string;
  imageUrl: string;
  [key: string]: unknown;
}

/** Slot dell'avatar, es. { hatId: "AbC", eyesId: null } */
export type WovAvatarSlots = Record<string, string | null>;

export interface WovSharedAvatar {
  id: string;
  avatar: { url: string; width: number; height: number };
  items: WovAvatarSlots;
}

export class WovApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/* ------------------------------- API key ------------------------------- */
// La chiave viene iniettata a build time dal secret GitHub WOLVESVILLE_API_KEY
// (nel workflow: NEXT_PUBLIC_WOV_API_KEY=${{ secrets.WOLVESVILLE_API_KEY }}).
// Per lo sviluppo locale basta un file .env.local con la stessa variabile.

export function getApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_WOV_API_KEY;
  return key && key.trim() ? key.trim() : null;
}

/* ------------------------------- fetch --------------------------------- */

async function wovFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const key = getApiKey();
  if (!key) throw new WovApiError(0, "API key non impostata");

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bot ${key}`,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {
      /* ignore */
    }
    if (res.status === 401)
      throw new WovApiError(401, "API key non valida o scaduta");
    if (res.status === 429)
      throw new WovApiError(429, "Rate limit dell'API raggiunto, riprova tra poco");
    throw new WovApiError(res.status, `Errore API (${res.status}) ${detail}`);
  }

  return (await res.json()) as T;
}

/* ------------------------------ cache ---------------------------------- */

function readCache<T>(endpoint: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + endpoint);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; d: T };
    if (Date.now() - parsed.t > CACHE_TTL) return null;
    return parsed.d;
  } catch {
    return null;
  }
}

function writeCache(endpoint: string, data: unknown): void {
  try {
    window.localStorage.setItem(
      CACHE_PREFIX + endpoint,
      JSON.stringify({ t: Date.now(), d: data }),
    );
  } catch {
    // quota localStorage esaurita: ignoriamo, il cache è solo un'ottimizzazione
  }
}

/* ----------------------------- endpoints -------------------------------- */

export async function fetchAvatarItems(force = false): Promise<WovAvatarItem[]> {
  if (!force) {
    const cached = readCache<WovAvatarItem[]>("avatarItems");
    if (cached) return cached;
  }
  const data = await wovFetch<WovAvatarItem[]>("/items/avatarItems");
  writeCache("avatarItems", data);
  return data;
}

/** Tag (colori, origini, ecc.) raggruppati per item id */
export async function fetchItemTags(
  force = false,
): Promise<Record<string, string[]>> {
  if (!force) {
    const cached = readCache<Record<string, string[]>>("tags");
    if (cached) return cached;
  }
  const rows = await wovFetch<{ avatarItemId: string; tags: string[] }[]>(
    "/items/tags",
  );
  const map: Record<string, string[]> = {};
  for (const row of rows) map[row.avatarItemId] = row.tags ?? [];
  writeCache("tags", map);
  return map;
}

export async function fetchBodyPaints(force = false): Promise<WovBodyPaint[]> {
  if (!force) {
    const cached = readCache<WovBodyPaint[]>("bodyPaints");
    if (cached) return cached;
  }
  const data = await wovFetch<WovBodyPaint[]>("/items/bodyPaints");
  writeCache("bodyPaints", data);
  return data;
}

export async function fetchBackgrounds(force = false): Promise<WovBackground[]> {
  if (!force) {
    const cached = readCache<WovBackground[]>("backgrounds");
    if (cached) return cached;
  }
  const data = await wovFetch<WovBackground[]>("/items/backgrounds");
  writeCache("backgrounds", data);
  return data;
}

/**
 * Chiede all'API di renderizzare la skin con il motore grafico ufficiale
 * del gioco: restituisce URL dell'immagine + id condivisibile.
 */
export async function createSharedAvatar(
  slots: WovAvatarSlots,
): Promise<WovSharedAvatar> {
  const body: Record<string, string> = {};
  for (const [k, v] of Object.entries(slots)) {
    if (v) body[k] = v;
  }
  return wovFetch<WovSharedAvatar>("/avatars/sharedAvatar", {
    method: "POST",
    body,
  });
}

/* ----------------------------- costanti --------------------------------- */

export const RARITY_ORDER: WovRarity[] = [
  "COMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
  "MYTHICAL",
];

export const RARITY_META: Record<
  WovRarity,
  { label: string; dot: string; text: string; border: string }
> = {
  COMMON: {
    label: "Comune",
    dot: "bg-slate-400",
    text: "text-slate-300",
    border: "border-slate-500/40",
  },
  RARE: {
    label: "Raro",
    dot: "bg-blue-400",
    text: "text-blue-300",
    border: "border-blue-500/40",
  },
  EPIC: {
    label: "Epico",
    dot: "bg-purple-400",
    text: "text-purple-300",
    border: "border-purple-500/40",
  },
  LEGENDARY: {
    label: "Leggendario",
    dot: "bg-yellow-400",
    text: "text-yellow-300",
    border: "border-yellow-500/40",
  },
  MYTHICAL: {
    label: "Mitic",
    dot: "bg-red-400",
    text: "text-red-300",
    border: "border-red-500/40",
  },
};

export const TYPE_LABELS: Record<WovItemType, string> = {
  SHIRT: "Maglie",
  HAIR: "Capelli",
  HAT: "Cappelli",
  GLASSES: "Occhiali",
  GRAVESTONE: "Lapidi",
  FRONT: "Oggetti davanti",
  BACK: "Oggetti dietro",
  EYES: "Occhi",
  BADGE: "Badge",
  MASK: "Maschere",
  MOUTH: "Bocca",
  LEGS: "Pantaloni",
};

export const EVENT_LABELS: Record<string, string> = {
  XMAS: "Natale",
  EASTER: "Pasqua",
  HALLOWEEN: "Halloween",
  EARLY_BIRD: "Early Bird",
  ST_PATRICK: "St. Patrick",
  BATTLE_PASS: "Battle Pass",
  WHEEL: "Ruota",
  ITEMS_COLLECTION: "Collezione",
  SOCCER: "Calcio",
  CALENDAR: "Calendario",
  ROLE_CARDS: "Carte ruolo",
  LEVEL_UP_CARD: "Level Up",
  EMOJIS_COLLECTION: "Emoji",
  BUNDLE_OFFER: "Bundle",
  HONOR_REWARD: "Onore",
  SUBSCRIPTION: "Moonlight",
  TWITCH: "Twitch",
  BLACK_FRIDAY: "Black Friday",
  FOOTBALL26: "Football '26",
};

export function eventLabel(event?: string): string | null {
  if (!event) return null;
  return EVENT_LABELS[event] ?? event.replaceAll("_", " ");
}

/** Slot modificabili nell'editor, con z-order per l'anteprima a livelli. */
export interface WovSlotDef {
  key: string;
  type: WovItemType | "BODY_PAINT";
  label: string;
  layer: number;
}

export const WOV_SLOTS: WovSlotDef[] = [
  { key: "backId", type: "BACK", label: "Oggetto dietro", layer: 0 },
  { key: "backId2", type: "BACK", label: "Oggetto dietro (2°)", layer: 1 },
  { key: "bodyPaintId", type: "BODY_PAINT", label: "Body paint", layer: 2 },
  { key: "shirtId", type: "SHIRT", label: "Maglia", layer: 3 },
  { key: "shirtId2", type: "SHIRT", label: "Maglia (2° layer)", layer: 4 },
  { key: "eyesId", type: "EYES", label: "Occhi", layer: 5 },
  { key: "eyesId2", type: "EYES", label: "Occhi (2° layer)", layer: 6 },
  { key: "mouthId", type: "MOUTH", label: "Bocca", layer: 7 },
  { key: "mouthId2", type: "MOUTH", label: "Bocca (2° layer)", layer: 8 },
  { key: "hairId", type: "HAIR", label: "Capelli", layer: 9 },
  { key: "hairId2", type: "HAIR", label: "Capelli (2° layer)", layer: 10 },
  { key: "hatId", type: "HAT", label: "Cappello", layer: 11 },
  { key: "hatId2", type: "HAT", label: "Cappello (2° layer)", layer: 12 },
  { key: "glassesId", type: "GLASSES", label: "Occhiali", layer: 13 },
  { key: "glassesId2", type: "GLASSES", label: "Occhiali (2° layer)", layer: 14 },
  { key: "maskId", type: "MASK", label: "Maschera", layer: 15 },
  { key: "maskId2", type: "MASK", label: "Maschera (2° layer)", layer: 16 },
  { key: "badgeId", type: "BADGE", label: "Badge", layer: 17 },
  { key: "badgeId2", type: "BADGE", label: "Badge (2° layer)", layer: 18 },
  { key: "frontId", type: "FRONT", label: "Oggetto davanti", layer: 19 },
  { key: "frontId2", type: "FRONT", label: "Oggetto davanti (2°)", layer: 20 },
  {
    key: "gravestoneId",
    type: "GRAVESTONE",
    label: "Lapide (visualizzatore)",
    layer: 21,
  },
];

/** Slot che l'API richiede per renderizzare una skin condivisa. */
export const REQUIRED_SLOT_KEYS = [
  "shirtId",
  "eyesId",
  "gravestoneId",
  "bodyPaintId",
];

/* --------------------------- skin salvate ------------------------------- */

export interface SavedSkin {
  name: string;
  slots: WovAvatarSlots;
  sharedId?: string;
  savedAt: number;
}

const SKINS_STORAGE = "wov_skins";

export function loadSavedSkins(): SavedSkin[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SKINS_STORAGE);
    return raw ? (JSON.parse(raw) as SavedSkin[]) : [];
  } catch {
    return [];
  }
}

export function persistSavedSkins(skins: SavedSkin[]): void {
  try {
    window.localStorage.setItem(SKINS_STORAGE, JSON.stringify(skins));
  } catch {
    /* ignore */
  }
}

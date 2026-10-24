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
  rarity: WovRarity;
  event?: string;
  title?: string;
  costInGold?: number;
  costInRoses?: number;
  costInGems?: number;
  [key: string]: unknown;
}

/** Slot dell'avatar, es. { hatId: "AbC", eyesId: null } */
export type WovAvatarSlots = Record<string, string | null>;

export interface WovSkinPack {
  id: string;
  title: string;
  /** false = l'API non ha dato un nome: `title` e' solo l'id (spesso un UUID). */
  hasTitle: boolean;
  rarity: WovRarity;
  previewImageUrl?: string;
  source: "SET" | "COLLECTION" | "ROLE_CARD";
  /** Slot trovati con certezza (chiave piatta o oggetto con id + tipo). */
  slots: WovAvatarSlots;
  /** Id di item trovati senza tipo: il tipo si ricava dalla lista item (resolvePackSlots). */
  itemIds: string[];
}

export interface WovCatalogFile {
  version: number;
  generatedAt: string;
  items: WovAvatarItem[];
  bodyPaints: WovBodyPaint[];
  tags: Record<string, string[]>;
  colorIndex: Record<string, string[]>;
  packs: {
    sets: Record<string, unknown>[];
    collections: Record<string, unknown>[];
    roleCards: Record<string, unknown>[];
  };
  assets?: Record<string, WovCatalogAsset>;
}

export interface WovCatalogAsset {
  src: string;
  density: 1 | 2 | 3;
}

export interface WovCatalogData {
  items: WovAvatarItem[];
  bodyPaints: WovBodyPaint[];
  tags: Record<string, string[]>;
  colorIndex: Record<string, string[]>;
  skinPacks: WovSkinPack[];
  assets: Record<string, WovCatalogAsset>;
}

const KNOWN_TYPES = new Set<string>([
  "SHIRT", "HAIR", "HAT", "GLASSES", "GRAVESTONE", "FRONT",
  "BACK", "EYES", "BADGE", "MASK", "MOUTH", "LEGS", "BODY_PAINT",
]);

function normalizeSetSlots(raw: Record<string, unknown>): WovAvatarSlots {
  const out: WovAvatarSlots = {};
  for (const def of WOV_SLOTS) {
    const flat = raw[def.key];
    if (typeof flat === "string") {
      out[def.key] = flat || null;
      continue;
    }
    const nested = raw[def.type.toLowerCase() as string] as
      | { id?: string }
      | undefined;
    // Un oggetto annidato (es. `hat: {id}`) vale per UN solo slot: senza questo controllo
    // finiva anche negli slot "2" (hatId2, hairId2...) duplicando l'item.
    if (nested && typeof nested.id === "string" && !Object.values(out).includes(nested.id)) {
      out[def.key] = nested.id;
    }
  }
  return out;
}

const TITLE_KEYS = ["title", "name", "displayName", "setName", "localizedName", "label"];
const IMAGE_KEYS = [
  "previewImageUrl", "previewUrl", "imageUrl", "image", "iconUrl", "thumbnailUrl", "avatarImageUrl",
];

function pickString(raw: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function putInFirstFreeSlot(out: WovAvatarSlots, type: string, id: string): void {
  if (Object.values(out).includes(id)) return;
  const slot = WOV_SLOTS.find((def) => def.type === type && !out[def.key]);
  if (slot) out[slot.key] = id;
}

/**
 * Estrae gli item di un set/collezione/role card SENZA conoscere lo schema esatto:
 *  1) chiavi piatte (hatId, shirtId...)            -> normalizeSetSlots
 *  2) oggetti annidati { id, type } a qualsiasi livello (anche in array)
 *  3) array di semplici id (tipo ignoto)            -> itemIds, risolti dopo
 */
function collectPackContent(raw: Record<string, unknown>): {
  slots: WovAvatarSlots;
  itemIds: string[];
} {
  const slots = normalizeSetSlots(raw);
  const loose: string[] = [];

  const walk = (node: unknown, depth: number, key: string): void => {
    if (node == null || depth > 5) return;
    if (Array.isArray(node)) {
      for (const el of node) {
        if (typeof el === "string") {
          if (/items?|avatar|ids?$/i.test(key) && el.length <= 40) loose.push(el);
        } else {
          walk(el, depth + 1, key);
        }
      }
      return;
    }
    if (typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    const id = [o.id, o.avatarItemId, o.itemId].find((v) => typeof v === "string") as string | undefined;
    const rawType = [o.type, o.avatarItemType, o.itemType].find((v) => typeof v === "string") as
      | string
      | undefined;
    const type = rawType?.toUpperCase();
    if (id && type && KNOWN_TYPES.has(type)) {
      putInFirstFreeSlot(slots, type, id);
      return;
    }
    for (const [k, v] of Object.entries(o)) walk(v, depth + 1, k);
  };
  walk(raw, 0, "");

  return { slots, itemIds: Array.from(new Set(loose)) };
}

/**
 * Completa gli slot di un pacchetto usando la lista degli item caricati:
 * gli id "sciolti" vengono assegnati allo slot giusto in base al loro tipo.
 */
export function resolvePackSlots(
  pack: Pick<WovSkinPack, "slots" | "itemIds">,
  typeOf: (id: string) => string | undefined,
): WovAvatarSlots {
  const out: WovAvatarSlots = { ...pack.slots };
  for (const id of pack.itemIds) {
    const type = typeOf(id);
    if (type) putInFirstFreeSlot(out, type, id);
  }
  return out;
}

function toPack(
  raw: Record<string, unknown>,
  source: WovSkinPack["source"],
  idKeys: string[],
  defaultRarity: WovRarity,
): WovSkinPack | null {
  const id = String(idKeys.map((k) => raw[k]).find((v) => v != null && v !== "") ?? "");
  if (!id) return null;
  const title = pickString(raw, TITLE_KEYS);
  const { slots, itemIds } = collectPackContent(raw);
  return {
    id,
    title: title ?? id,
    hasTitle: !!title,
    rarity: (raw.rarity as WovRarity) ?? defaultRarity,
    previewImageUrl: pickString(raw, IMAGE_KEYS),
    source,
    slots,
    itemIds: itemIds.filter((x) => x !== id),
  };
}

export function normalizeSkinPacks(
  sets: Record<string, unknown>[],
  collections: Record<string, unknown>[],
  roleCards: Record<string, unknown>[],
): WovSkinPack[] {
  const out: WovSkinPack[] = [];
  for (const set of sets) {
    const pack = toPack(set, "SET", ["id", "setId"], "COMMON");
    if (pack) out.push(pack);
  }
  for (const collection of collections) {
    const pack = toPack(collection, "COLLECTION", ["id", "collectionId"], "COMMON");
    if (pack) out.push(pack);
  }
  for (const roleCard of roleCards) {
    const pack = toPack(roleCard, "ROLE_CARD", ["id", "offerId"], "LEGENDARY");
    if (pack) out.push(pack);
  }
  return out;
}

export async function fetchWovCatalog(
  basePath = "",
  force = false,
): Promise<WovCatalogData> {
  const refresh = force ? `?refresh=${Date.now()}` : "";
  const response = await fetch(`${basePath}/wov-catalog.json${refresh}`, {
    cache: force ? "reload" : "default",
  });
  if (!response.ok) {
    throw new Error(
      `Catalogo Wolvesville non disponibile (${response.status}). Rigeneralo con npm run wov:catalog.`,
    );
  }

  const raw: unknown = await response.json();
  if (!raw || typeof raw !== "object") {
    throw new Error("Il file wov-catalog.json non contiene un oggetto valido.");
  }
  const catalog = raw as Partial<WovCatalogFile>;
  if (
    !Array.isArray(catalog.items) ||
    !Array.isArray(catalog.bodyPaints) ||
    !catalog.tags ||
    !catalog.colorIndex ||
    !catalog.packs ||
    !Array.isArray(catalog.packs.sets) ||
    !Array.isArray(catalog.packs.collections) ||
    !Array.isArray(catalog.packs.roleCards)
  ) {
    throw new Error("Il file wov-catalog.json non ha una struttura valida.");
  }

  return {
    items: catalog.items,
    bodyPaints: catalog.bodyPaints,
    tags: catalog.tags,
    colorIndex: catalog.colorIndex,
    skinPacks: normalizeSkinPacks(
      catalog.packs.sets,
      catalog.packs.collections,
      catalog.packs.roleCards,
    ),
    assets:
      catalog.assets &&
      typeof catalog.assets === "object" &&
      !Array.isArray(catalog.assets)
        ? catalog.assets
        : {},
  };
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
    dot: "bg-[#9e9e9e]",
    text: "text-[#c3c6c8]",
    border: "border-[#7d8083]",
  },
  RARE: {
    label: "Raro",
    dot: "bg-[#4f9be8]",
    text: "text-[#7fbdf0]",
    border: "border-[#4f9be8]",
  },
  EPIC: {
    label: "Epico",
    dot: "bg-[#9475cd]",
    text: "text-[#b295e0]",
    border: "border-[#9475cd]",
  },
  LEGENDARY: {
    label: "Leggendario",
    dot: "bg-[#ffec3b]",
    text: "text-[#ffec3b]",
    border: "border-[#ffec3b]",
  },
  MYTHICAL: {
    label: "Mitic",
    dot: "bg-[#ff4d4d]",
    text: "text-[#ff6b6b]",
    border: "border-[#ff4d4d]",
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
  { key: "legsId", type: "LEGS", label: "Pantaloni", layer: 3 },
  { key: "legsId2", type: "LEGS", label: "Pantaloni (2° layer)", layer: 4 },
  { key: "shirtId", type: "SHIRT", label: "Maglia", layer: 5 },
  { key: "shirtId2", type: "SHIRT", label: "Maglia (2° layer)", layer: 6 },
  { key: "badgeId", type: "BADGE", label: "Badge", layer: 7 },
  { key: "badgeId2", type: "BADGE", label: "Badge (2° layer)", layer: 8 },
  { key: "eyesId", type: "EYES", label: "Occhi", layer: 9 },
  { key: "eyesId2", type: "EYES", label: "Occhi (2° layer)", layer: 10 },
  { key: "mouthId", type: "MOUTH", label: "Bocca", layer: 11 },
  { key: "mouthId2", type: "MOUTH", label: "Bocca (2° layer)", layer: 12 },
  { key: "hairId", type: "HAIR", label: "Capelli", layer: 13 },
  { key: "hairId2", type: "HAIR", label: "Capelli (2° layer)", layer: 14 },
  { key: "hatId", type: "HAT", label: "Cappello", layer: 15 },
  { key: "hatId2", type: "HAT", label: "Cappello (2° layer)", layer: 16 },
  { key: "glassesId", type: "GLASSES", label: "Occhiali", layer: 17 },
  { key: "glassesId2", type: "GLASSES", label: "Occhiali (2° layer)", layer: 18 },
  { key: "maskId", type: "MASK", label: "Maschera", layer: 19 },
  { key: "maskId2", type: "MASK", label: "Maschera (2° layer)", layer: 20 },
  { key: "frontId", type: "FRONT", label: "Oggetto davanti", layer: 21 },
  { key: "frontId2", type: "FRONT", label: "Oggetto davanti (2°)", layer: 22 },
  {
    key: "gravestoneId",
    type: "GRAVESTONE",
    label: "Lapide (visualizzatore)",
    layer: 23,
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

// Filtri "Mostra, filtra e ordina" (stesso meccanismo del pannello di Wolvesville):
// filtro per colore e filtro per origine, piu' l'ordinamento "leggendari per primi".

export const COLOR_FILTERS = [
  { key: "black", label: "Nero", bg: "#1b1b1f", fg: "#ffffff" },
  { key: "blue", label: "Blu", bg: "#3b82f6", fg: "#ffffff" },
  { key: "brown", label: "Marrone", bg: "#a0693f", fg: "#ffffff" },
  { key: "gray", label: "Grigio", bg: "#8a8f98", fg: "#ffffff" },
  { key: "green", label: "Verde", bg: "#43a047", fg: "#ffffff" },
  {
    key: "multicolor",
    label: "Multicolore",
    bg: "linear-gradient(90deg,#ef4444,#f59e0b,#22c55e,#3b82f6,#8b5cf6)",
    fg: "#ffffff",
  },
  { key: "orange", label: "Arancione", bg: "#f97316", fg: "#ffffff" },
  { key: "pink", label: "Rosa", bg: "#ec4899", fg: "#ffffff" },
  { key: "purple", label: "Viola", bg: "#8b5cf6", fg: "#ffffff" },
  { key: "red", label: "Rosso", bg: "#e53935", fg: "#ffffff" },
  { key: "white", label: "Bianco", bg: "#f1f3f5", fg: "#1b1b1f" },
  { key: "yellow", label: "Giallo", bg: "#facc15", fg: "#1b1b1f" },
] as const;

export type FilterTag = "all" | "color" | "origin";

export interface OriginDef {
  key: string;
  label: string;
}

/** Elenco delle origini, nello stesso ordine del menu di Wolvesville. */
export const ORIGINS: OriginDef[] = [
  { key: "battle-pass", label: "Battle Pass" },
  { key: "bundles", label: "Bundle" },
  { key: "calendar", label: "Calendario" },
  { key: "clan-quest", label: "Missione clan" },
  { key: "avatar-collection", label: "Collezione oggetti avatar" },
  { key: "outfits-collection", label: "Collezione outfit" },
  { key: "contributors", label: "Contributori" },
  { key: "daily-rewards", label: "Ricompense giornaliere" },
  { key: "events", label: "Eventi" },
  { key: "lootboxes", label: "Lootbox" },
  { key: "loyalty-tokens", label: "Gettoni fedeltà" },
  { key: "miscellaneous", label: "Varie" },
  { key: "moonlight", label: "Abbonamento Moonlight" },
  { key: "special-offer", label: "Offerta speciale" },
  { key: "role-cards", label: "Carte ruolo" },
  { key: "staff", label: "Oggetti staff" },
];

/** Valore del campo `event` dell'API -> origine. */
const EVENT_TO_ORIGIN: Record<string, string> = {
  BATTLE_PASS: "battle-pass",
  BUNDLE_OFFER: "bundles",
  BUNDLE: "bundles",
  CALENDAR: "calendar",
  CLAN_QUEST: "clan-quest",
  ITEMS_COLLECTION: "avatar-collection",
  EMOJIS_COLLECTION: "avatar-collection",
  OUTFITS_COLLECTION: "outfits-collection",
  CONTRIBUTOR: "contributors",
  CONTRIBUTORS: "contributors",
  HONOR_REWARD: "daily-rewards",
  DAILY_REWARD: "daily-rewards",
  DAILY_REWARDS: "daily-rewards",
  WHEEL: "lootboxes",
  LOOTBOX: "lootboxes",
  LOOTBOXES: "lootboxes",
  LOYALTY_TOKENS: "loyalty-tokens",
  LOYALTY_TOKEN: "loyalty-tokens",
  SUBSCRIPTION: "moonlight",
  MOONLIGHT: "moonlight",
  SPECIAL_OFFER: "special-offer",
  BLACK_FRIDAY: "special-offer",
  LEVEL_UP_CARD: "special-offer",
  ROLE_CARDS: "role-cards",
  ROLE_CARD: "role-cards",
  STAFF: "staff",
  STAFF_ITEMS: "staff",
  // eventi stagionali / a tema
  XMAS: "events",
  EASTER: "events",
  HALLOWEEN: "events",
  EARLY_BIRD: "events",
  ST_PATRICK: "events",
  SOCCER: "events",
  FOOTBALL26: "events",
  TWITCH: "events",
};

/** Segmento dei tag `origin:<segmento>[:dettaglio]` del catalogo -> origine. */
const TAG_TO_ORIGIN: Record<string, string> = {
  battle_pass: "battle-pass",
  bundle: "bundles",
  calendar: "calendar",
  clan_quest: "clan-quest",
  collection_avatar_items: "avatar-collection",
  collection_outfits: "outfits-collection",
  contributors: "contributors",
  daily_rewards: "daily-rewards",
  events: "events",
  lootboxes: "lootboxes",
  loyalty_tokens: "loyalty-tokens",
  miscellaneous: "miscellaneous",
  moonlight_membership: "moonlight",
  offer_avatar_item_set: "special-offer",
  role_cards: "role-cards",
  staff_items: "staff",
};

/**
 * Origini di un item (puo' averne piu' d'una). Si usano i tag `origin:*` del catalogo;
 * se mancano si ricade sul campo `event`, e in ultimo su "Varie".
 */
export function originsOf(item: { event?: string } | undefined, tags?: string[]): string[] {
  const out = new Set<string>();
  for (const tag of tags ?? []) {
    if (!tag.toLowerCase().startsWith("origin:")) continue;
    const key = TAG_TO_ORIGIN[tag.slice(7).split(":")[0].toLowerCase()];
    if (key) out.add(key);
  }
  if (out.size === 0) {
    const event = item?.event?.trim();
    out.add(event ? (EVENT_TO_ORIGIN[event.toUpperCase()] ?? "events") : "miscellaneous");
  }
  return [...out];
}

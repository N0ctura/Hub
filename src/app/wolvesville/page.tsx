"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import {
  Download,
  Eye,
  EyeOff,
  Home,
  ImagePlus,
  RefreshCw,
  Search,
  LayoutGrid,
  Settings,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  RARITY_META,
  RARITY_ORDER,
  TYPE_LABELS,
  WOV_SLOTS,
  createSharedAvatar,
  fetchWovCatalog,
  resolvePackSlots,
  type WovAvatarItem,
  type WovAvatarSlots,
  type WovBodyPaint,
  type WovItemType,
  type WovSkinPack,
} from "@/lib/wov-api";
import { buildAvatarLayers, corsSafeUrl, storeIconUrl, type WovLayerSpec } from "@/lib/wov-avatar";
import {
  DEFAULT_CALIBRATION,
  layerWidthFraction,
  loadCalibration,
  resolveAdjust,
  saveCalibration,
  type AvatarCalibration,
} from "@/lib/avatar-calibration";
import { AvatarRenderError, renderAvatarBlob, type Density } from "@/lib/avatar-render";
import { downloadBlob, downloadRemote } from "@/lib/save-image";
import { CUSTOM_ID_PREFIX, CUSTOM_ITEMS, DEFAULT_AVATAR } from "@/data/custom-items";
import {
  COLOR_FILTERS,
  ORIGINS,
  originsOf,
  type FilterTag,
} from "@/lib/wov-filters";
import {
  DevCalibrationPanel,
  type NaturalSize,
} from "@/components/wolvesville/dev-calibration-panel";

interface Category {
  key: string;
  icon: string;
  slotKey?: string;
  type?: WovItemType;
  isBodyPaint?: boolean;
  isSkinPack?: boolean;
  second?: boolean;
}

const CATEGORIES: Category[] = [
  { key: "pack", icon: "inventory_tab_pack.png", isSkinPack: true },
  { key: "hat", icon: "inventory_tab_hats.png", slotKey: "hatId", type: "HAT" },
  { key: "hat2", icon: "inventory_tab_hats_2.png", slotKey: "hatId2", type: "HAT", second: true },
  { key: "hair", icon: "inventory_tab_hair.png", slotKey: "hairId", type: "HAIR" },
  { key: "hair2", icon: "inventory_tab_hair.png", slotKey: "hairId2", type: "HAIR", second: true },
  { key: "glasses", icon: "inventory_tab_glasses.png", slotKey: "glassesId", type: "GLASSES" },
  { key: "glasses2", icon: "inventory_tab_glasses_2.png", slotKey: "glassesId2", type: "GLASSES", second: true },
  { key: "clothes", icon: "inventory_tab_clothes.png", slotKey: "shirtId", type: "SHIRT" },
  { key: "clothes2", icon: "inventory_tab_clothes.png", slotKey: "shirtId2", type: "SHIRT", second: true },
  { key: "legs", icon: "inventory_tab_legs.png", slotKey: "legsId", type: "LEGS" },
  { key: "legs2", icon: "inventory_tab_legs.png", slotKey: "legsId2", type: "LEGS", second: true },
  { key: "eyes", icon: "inventory_tab_eyes.png", slotKey: "eyesId", type: "EYES" },
  { key: "eyes2", icon: "inventory_tab_eyes.png", slotKey: "eyesId2", type: "EYES", second: true },
  { key: "mouth", icon: "inventory_tab_mouth.png", slotKey: "mouthId", type: "MOUTH" },
  { key: "mouth2", icon: "inventory_tab_mouth.png", slotKey: "mouthId2", type: "MOUTH", second: true },
  { key: "mask", icon: "inventory_tab_mask.png", slotKey: "maskId", type: "MASK" },
  { key: "mask2", icon: "inventory_tab_mask_2.png", slotKey: "maskId2", type: "MASK", second: true },
  { key: "back", icon: "inventory_tab_avatar_background.png", slotKey: "backId", type: "BACK" },
  { key: "back2", icon: "inventory_tab_avatar_background_2.png", slotKey: "backId2", type: "BACK", second: true },
  { key: "front", icon: "inventory_tab_avatar_foreground.png", slotKey: "frontId", type: "FRONT" },
  { key: "front2", icon: "inventory_tab_avatar_foreground_2.png", slotKey: "frontId2", type: "FRONT", second: true },
  { key: "badge", icon: "inventory_tab_badge.png", slotKey: "badgeId", type: "BADGE" },
  { key: "paint", icon: "inventory_tab_body_paints.png", slotKey: "bodyPaintId", isBodyPaint: true },
];

const ITEM_TYPES: WovItemType[] = [
  "SHIRT",
  "HAIR",
  "HAT",
  "GLASSES",
  "EYES",
  "MOUTH",
  "MASK",
  "BADGE",
  "FRONT",
  "BACK",
  "LEGS",
  "GRAVESTONE",
];

function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore
    }
  }, [key]);

  const update = (v: T) => {
    setValue(v);
    try {
      window.localStorage.setItem(key, JSON.stringify(v));
    } catch {
      // ignore
    }
  };

  return [value, update] as const;
}

type AnyItem = WovAvatarItem | WovBodyPaint;

function itemTitle(item: AnyItem) {
  return item.title?.trim() || item.id;
}

function itemRarity(item: AnyItem) {
  return item.rarity ?? "COMMON";
}

export default function WolvesvillePage() {
  const [tab, setTab] = useState<"avatar" | "items">("avatar");
  const [cat, setCat] = useState("hat");
  const [search, setSearch] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<FilterTag>("all");
  const [legendaryFirst, setLegendaryFirst] = usePersisted("wov_legendary_first", false);
  const [itemType, setItemType] = useState<WovItemType>("SHIRT");
  const [rarity, setRarity] = useState<string | null>(null);

  const [items, setItems] = useState<WovAvatarItem[]>([]);
  const [bodyPaints, setBodyPaints] = useState<WovBodyPaint[]>([]);
  const [skinPacks, setSkinPacks] = useState<WovSkinPack[]>([]);
  const [tags, setTags] = useState<Record<string, string[]>>({});
  const [colorIndex, setColorIndex] = useState<Record<string, string[]>>({});
  const [slots, setSlots] = useState<WovAvatarSlots>({});
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [hideUi, setHideUi] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moonlight, setMoonlight] = usePersisted("wov_moonlight_v2", true);
  // Un solo avatar: lo sfondo resta salvato con la stessa chiave di prima ("0")
  const activeAvatar = 0;
  const [backgrounds, setBackgrounds] = usePersisted<Record<string, string>>("wov_backgrounds", {});
  const [avatarScale] = usePersisted("wov_avatar_scale", 100);
  const [gridCols, setGridCols] = usePersisted("wov_grid_cols", 4);

  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const defaultsApplied = useRef(false);

  // --- calibrazione / menu dev -------------------------------------------
  const [calibration, setCalibrationState] = useState<AvatarCalibration>(DEFAULT_CALIBRATION);
  const [devEnabled, setDevEnabled] = useState(process.env.NODE_ENV !== "production");
  const [devOpen, setDevOpen] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [naturals, setNaturals] = useState<Record<string, NaturalSize>>({});
  const [downloading, setDownloading] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_WOV_API_KEY?.trim() ?? "";

  const setCalibration = useCallback((next: AvatarCalibration) => {
    setCalibrationState(next);
    saveCalibration(next);
  }, []);

  useEffect(() => {
    // Calibrazione salvata nel browser (solo chi usa il menu dev ne ha una)
    setCalibrationState(loadCalibration());
    // Menu dev: sempre attivo in locale; online si attiva aprendo la pagina con ?dev
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has("dev")) window.localStorage.setItem("wov_dev", "1");
      if (params.get("dev") === "0") window.localStorage.removeItem("wov_dev");
      if (window.localStorage.getItem("wov_dev") === "1") setDevEnabled(true);
    } catch {
      /* ignore */
    }
  }, []);

  const visibleCats = CATEGORIES.filter((c) => moonlight || !c.second);
  const activeBg = backgrounds[String(activeAvatar)];

  const itemMap = useMemo(() => {
    const map: Record<string, AnyItem> = {};
    for (const item of items) map[item.id] = item;
    for (const paint of bodyPaints) map[paint.id] = paint;
    return map;
  }, [items, bodyPaints]);

  // Funzioni stabili (stessa identita' finche' i dati non cambiano): servono anche alle
  // miniature dei pacchetti, che altrimenti si ricomporrebbero a ogni render.
  const itemUrlOf = useCallback(
    (id: string | null | undefined) => (id ? itemMap[id]?.imageUrl : undefined),
    [itemMap],
  );
  const paintUrlOf = useCallback(
    (id: string | null | undefined) =>
      id ? bodyPaints.find((p) => p.id === id)?.imageUrl : undefined,
    [bodyPaints],
  );

  const layerSets = useMemo(() => {
    const build = (d: Density) => buildAvatarLayers(slots, itemUrlOf, paintUrlOf, d);
    return { 1: build(1), 2: build(2), 3: build(3) } as Record<Density, WovLayerSpec[]>;
  }, [slots, itemUrlOf, paintUrlOf]);

  /** Tipo dell'item (HAT, HAIR...) a partire dall'id: serve a smistare gli id "sciolti" dei pacchetti. */
  const typeOfId = useCallback(
    (id: string) => {
      const item = itemMap[id];
      if (!item) return undefined;
      const t = (item as { type?: unknown }).type;
      return typeof t === "string" ? t : "BODY_PAINT";
    },
    [itemMap],
  );

  /** Pacchetti con gli slot gia' risolti (+ nome leggibile se l'API non ne da' uno). */
  const resolvedPacks = useMemo(
    () =>
      skinPacks.map((pack) => {
        const packSlots = resolvePackSlots(pack, typeOfId);
        let label = pack.title;
        if (!pack.hasTitle) {
          const firstNamed = Object.values(packSlots)
            .map((id) => (id ? itemMap[id]?.title : undefined))
            .find((t): t is string => typeof t === "string" && t.trim().length > 0);
          label = firstNamed ?? `Skin ${pack.id.slice(0, 6)}`;
        }
        return { pack, packSlots, label };
      }),
    [skinPacks, typeOfId, itemMap],
  );
  const selectedColorIds = useMemo(
    () => new Set(selectedColor ? colorIndex[selectedColor] ?? [] : []),
    [colorIndex, selectedColor],
  );

  /** Un id supera i filtri attivi (colore + origine)? */
  const passesFilters = useCallback(
    (id: string) => {
      if (selectedColor && !selectedColorIds.has(id)) return false;
      if (selectedOrigin) {
        const item = itemMap[id];
        if (!item || !originsOf(item, tags[id]).includes(selectedOrigin)) return false;
      }
      return true;
    },
    [selectedColor, selectedColorIds, selectedOrigin, itemMap, tags],
  );
  const filtersActive = !!selectedColor || !!selectedOrigin;

  const rankOf = useCallback(
    (item: AnyItem) =>
      legendaryFirst && (item.rarity === "LEGENDARY" || item.rarity === "MYTHICAL") ? 0 : 1,
    [legendaryFirst],
  );

  const layers = layerSets[2];

  const handleNatural = useCallback((key: string, w: number, h: number, density: number) => {
    setNaturals((prev) => {
      const old = prev[key];
      if (old && old.w === w && old.h === h && old.density === density) return prev;
      return { ...prev, [key]: { w, h, density } };
    });
  }, []);

  const describeItem = useCallback(
    (id?: string) => {
      if (!id) return undefined;
      const item = itemMap[id];
      return item ? (item as unknown as Record<string, unknown>) : undefined;
    },
    [itemMap],
  );

  const loadAll = useCallback(async (force = false) => {
    setLoadingData(true);
    setDataError(null);

    try {
      const catalog = await fetchWovCatalog(
        process.env.NEXT_PUBLIC_BASE_PATH ?? "",
        force,
      );

      setItems([...CUSTOM_ITEMS, ...catalog.items]);
      setBodyPaints(catalog.bodyPaints);
      setTags(catalog.tags);
      setColorIndex(catalog.colorIndex);
      setSkinPacks(catalog.skinPacks);

      // Skin di partenza (DEFAULT_AVATAR): solo al primo caricamento, cosi' un "None"
      // scelto dall'utente non viene riapplicato dopo un aggiornamento del catalogo.
      if (!defaultsApplied.current) {
        defaultsApplied.current = true;
        const known = new Set<string>([
          ...CUSTOM_ITEMS.map((i) => i.id),
          ...catalog.items.map((i) => i.id),
          ...catalog.bodyPaints.map((p) => p.id),
        ]);
        setSlots((prev) => {
          const next = { ...prev };
          for (const [slot, id] of Object.entries(DEFAULT_AVATAR)) {
            if (!next[slot] && known.has(id)) next[slot] = id;
          }
          // Senza body paint scelto l'omino resterebbe invisibile: ripiego sul base
          if (!next.bodyPaintId) {
            const paint =
              catalog.bodyPaints.find((p) => p.imageUrl.includes("skin-1")) ??
              catalog.bodyPaints[0];
            if (paint) next.bodyPaintId = paint.id;
          }
          return next;
        });
      }
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Errore sconosciuto");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const activeCategory = useMemo(
    () => CATEGORIES.find((c) => c.key === cat) ?? CATEGORIES[0],
    [cat],
  );

  const categoryItems = useMemo<AnyItem[]>(() => {
    if (activeCategory.isSkinPack) return [] as AnyItem[];

    let base: AnyItem[] = activeCategory.isBodyPaint
      ? bodyPaints
      : items.filter((item) => item.type === activeCategory.type);

    const q = search.trim().toLowerCase();

    if (q) {
      base = base.filter((item) => {
        const tagMatch = (tags[item.id] ?? []).some((tag) =>
          tag.toLowerCase().includes(q),
        );
        return (
          itemTitle(item).toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          tagMatch
        );
      });
    }

    if (filtersActive) {
      base = base.filter((item) => passesFilters(item.id));
    }

    // L'ordine ufficiale e' quello restituito dall'API (raggruppato per slug: le
    // varianti dello stesso set, es. "eyes-female01/02", restano vicine).
    // Array.sort e' stabile, quindi basta il confronto su rankOf: con "leggendari
    // per primi" attivo i leggendari salgono, altrimenti l'ordine resta intatto.
    return [...base].sort((a, b) => rankOf(a) - rankOf(b));
  }, [activeCategory, bodyPaints, items, search, filtersActive, passesFilters, rankOf, tags]);

  const categorySkinPacks = useMemo(() => {
    if (!activeCategory.isSkinPack) return [];
    const q = search.trim().toLowerCase();
    const base = resolvedPacks.filter(({ pack, packSlots, label }) => {
      if (
        filtersActive &&
        !Object.values(packSlots).some((id) => id && passesFilters(id)) &&
        !pack.itemIds.some((id) => passesFilters(id))
      ) {
        return false;
      }
      if (!q) return true;
      return (
        label.toLowerCase().includes(q) ||
        pack.id.toLowerCase().includes(q) ||
        pack.source.toLowerCase().includes(q)
      );
    });
    return [...base].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
    );
  }, [activeCategory, search, resolvedPacks, filtersActive, passesFilters]);

  const equipSkinPack = (pack: WovSkinPack, packSlots: WovAvatarSlots, label: string) => {
    if (!Object.values(packSlots).some(Boolean)) {
      toast.error(`"${label}": nessun item riconosciuto in questo pacchetto`);
      return;
    }
    // Una skin completa SOSTITUISCE tutto l'abbigliamento (come nel gioco); il body paint
    // attuale resta se il pacchetto non ne porta uno suo.
    setSlots((prev) => {
      const next: WovAvatarSlots = {};
      for (const def of WOV_SLOTS) next[def.key] = null;
      next.bodyPaintId = prev.bodyPaintId ?? null;
      for (const [key, id] of Object.entries(packSlots)) if (id) next[key] = id;
      return next;
    });
    toast.success(`Equipaggiato ${label}`);
  };

  const catalogItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items
      .filter((item) => item.type === itemType)
      .filter((item) => (rarity ? item.rarity === rarity : true))
      .filter((item) => (filtersActive ? passesFilters(item.id) : true))
      .filter((item) => {
        if (!q) return true;

        const tagMatch = (tags[item.id] ?? []).some((tag) =>
          tag.toLowerCase().includes(q),
        );

        return (
          itemTitle(item).toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          tagMatch
        );
      })
      .sort((a, b) => rankOf(a) - rankOf(b));
  }, [items, itemType, rarity, search, filtersActive, passesFilters, rankOf, tags]);

  const equipItem = (item: AnyItem) => {
    if ("type" in item) {
      const slot = WOV_SLOTS.find((s) => s.type === item.type);
      if (slot) {
        setSlots((prev) => ({
          ...prev,
          [slot.key]: prev[slot.key] === item.id ? null : item.id,
        }));
      }
    }
  };

  const equipInCategory = (category: Category, item: AnyItem) => {
    if (!category.slotKey) return;
    setSlots((prev) => ({
      ...prev,
      [category.slotKey!]: prev[category.slotKey!] === item.id ? null : item.id,
    }));
  };

  const clearSlot = (slotKey?: string) => {
    if (!slotKey) return;
    setSlots((prev) => ({ ...prev, [slotKey]: null }));
  };

  const toggleMoonlight = (enabled: boolean) => {
    setMoonlight(enabled);

    if (!enabled) {
      setSlots((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (key.endsWith("2")) next[key] = null;
        }
        return next;
      });
    }
  };

  const pickBackground = (file: File) => {
    const reader = new FileReader();

    reader.onload = () => {
      setBackgrounds({
        ...backgrounds,
        [String(activeAvatar)]: String(reader.result),
      });
      toast.success("Sfondo aggiornato");
    };

    reader.readAsDataURL(file);
  };

  const copyText = async (text: string, okMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(okMessage);
    } catch {
      toast.error("Impossibile copiare: seleziona il testo a mano");
    }
  };

  const copyCurrentIds = () => {
    const ids = Object.fromEntries(Object.entries(slots).filter(([, id]) => !!id));
    void copyText(JSON.stringify(ids, null, 2), "ID dell'avatar copiati");
  };

  const downloadPng = async () => {
    if (downloading) return;
    const density: Density = 3;
    const fileName = `wolvesville-avatar-${density}x-${Date.now()}.png`;

    if (layerSets[density].length === 0) {
      toast.error("Nessun layer da scaricare: scegli almeno un item o un body paint.");
      return;
    }

    setDownloading(true);

    // Il download parte subito, senza anteprima intermedia (anche su iPhone/iPad)
    const deliver = (blob: Blob) => downloadBlob(blob, fileName);

    let canvasFailure = "";
    try {
      const result = await renderAvatarBlob({
        layerSets,
        calibration,
        background: activeBg,
        density,
      });
      // Una skin incompleta o con un livello mancante si scarica comunque: si salta il
      // livello che non si carica e si avvisa (prima l'intero download andava in errore).
      if (result.skipped.length) {
        console.warn("Livelli non caricati:", result.skipped);
        const names = result.skipped
          .map((u) => decodeURIComponent(u.split("?")[0].split("/").pop() ?? u))
          .slice(0, 3)
          .join(", ");
        toast.warning(
          `Scaricata senza ${result.skipped.length} livello/i non caricato/i (${names})`,
        );
      }
      deliver(result.blob);
      setDownloading(false);
      return;
    } catch (renderError) {
      canvasFailure =
        renderError instanceof AvatarRenderError
          ? renderError.message
          : renderError instanceof Error
            ? renderError.message
            : String(renderError);
    }

    if (!apiKey.trim()) {
      toast.error(
        `Composizione locale non riuscita (${canvasFailure}). Il secret WOLVESVILLE_API_KEY non è stato incluso nell'ultima build: verifica il secret GitHub e rilancia il deploy.`,
      );
      setDownloading(false);
      return;
    }

    try {
      // L'API (schema AddSharedAvatarRequest) richiede SEMPRE occhi e lapide: se non li hai
      // scelti, usiamo quelli comuni del catalogo. La lapide non compare nell'immagine.
      const pickDefault = (type: string) =>
        (items.find((i) => i.type === type && i.rarity === "COMMON") ??
          items.find((i) => i.type === type))?.id ?? null;
      // L'API conosce solo gli item di Wolvesville: quelli personalizzati si tolgono
      const apiSlots: WovAvatarSlots = Object.fromEntries(
        Object.entries(slots).map(([k, v]) => [k, v?.startsWith(CUSTOM_ID_PREFIX) ? null : v]),
      );
      if (!apiSlots.eyesId) apiSlots.eyesId = pickDefault("EYES");
      if (!apiSlots.gravestoneId) apiSlots.gravestoneId = pickDefault("GRAVESTONE");
      // Verificato sull'API: servono SEMPRE sia la maglia sia il body paint,
      // altrimenti risponde 400 "Required fields shirt or body paint are missing".
      if (!apiSlots.shirtId) apiSlots.shirtId = pickDefault("SHIRT");
      if (!apiSlots.bodyPaintId) apiSlots.bodyPaintId = bodyPaints[0]?.id ?? null;

      const shared = await createSharedAvatar(apiSlots, apiKey.trim());
      const imageUrl = shared.avatar.url.replace(
        /\.png(?=$|[?#])/i,
        `@${density}x.png`,
      );
      // Il PNG vive su cdn-avatars (nessun header CORS): per scaricarlo come blob
      // va letto tramite il proxy, altrimenti il browser aprirebbe una nuova scheda.
      await downloadRemote(corsSafeUrl(imageUrl), fileName);
    } catch (apiError) {
      const detail =
        apiError instanceof Error ? apiError.message : String(apiError);
      toast.error(`Canvas: ${canvasFailure}. Rendering API non riuscito: ${detail}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--wov-page)] font-sans text-[var(--wov-text)]">
      <div className="mx-auto flex h-full w-full max-w-[1240px] flex-col gap-0 p-0 sm:gap-3 sm:p-4 lg:flex-row lg:gap-3">
        <div className="flex w-full shrink-0 flex-col gap-0 lg:w-[380px]">
          <div
            ref={previewRef}
            className="relative aspect-[380/270] w-full overflow-hidden sm:aspect-[380/343] sm:rounded-md bg-[var(--wov-sky)]"
          >
            {activeBg ? (
              <img
                data-bg
                src={activeBg}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <NightScene />
            )}

            <AvatarPreview
              layers={layers}
              calibration={calibration}
              scale={avatarScale}
              showGuides={devOpen && showGuides}
              onNatural={handleNatural}
            />

            {!hideUi && (
              <div className="absolute left-0 top-0 z-20 flex items-center gap-1 rounded-br-md bg-[var(--wov-toolbar)] px-1.5 py-1 sm:px-2 sm:py-1.5">
                <ToolbarButton label="Torna all'Hub" asLink />
                <ToolbarButton label="Nascondi" onClick={() => setHideUi(true)}>
                  <Eye size={22} />
                </ToolbarButton>
                <ToolbarButton label="Scarica" onClick={() => void downloadPng()}>
                  <Download size={22} className={downloading ? "animate-pulse" : ""} />
                </ToolbarButton>
                <ToolbarButton label="Impostazioni" onClick={() => setSettingsOpen((v) => !v)}>
                  <span className="relative flex">
                    <Settings size={22} />
                    {filtersActive && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--wov-accent)]" />
                    )}
                  </span>
                </ToolbarButton>
                {devEnabled && (
                  <ToolbarButton label="Calibrazione DEV" onClick={() => setDevOpen((v) => !v)}>
                    <SlidersHorizontal size={22} className={devOpen ? "text-[var(--wov-accent)]" : ""} />
                  </ToolbarButton>
                )}
              </div>
            )}

            {hideUi && (
              <button
                aria-label="Mostra"
                onClick={() => setHideUi(false)}
                className="absolute left-2 top-2 z-20 rounded-md bg-[var(--wov-toolbar)]/80 p-1.5 text-[var(--wov-text)]"
              >
                <EyeOff size={18} />
              </button>
            )}

            {settingsOpen && !hideUi && (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3"
                onClick={() => setSettingsOpen(false)}
                role="dialog"
                aria-modal="true"
                aria-label="Impostazioni"
              >
              <div
                onClick={(e) => e.stopPropagation()}
                className="wov-scroll max-h-[calc(100dvh-1.5rem)] w-full max-w-[360px] overflow-y-auto overscroll-contain rounded-lg border border-[var(--wov-panel-2)] bg-[var(--wov-panel)] p-4 shadow-2xl"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Impostazioni
                  </span>
                  <button
                    aria-label="Chiudi"
                    onClick={() => setSettingsOpen(false)}
                    className="text-[var(--wov-muted)]"
                  >
                    <X size={16} />
                  </button>
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                  <span>Moonlight (2° layer)</span>
                  <input
                    type="checkbox"
                    checked={moonlight}
                    onChange={(e) => toggleMoonlight(e.target.checked)}
                    className="h-4 w-4 accent-[var(--wov-accent)]"
                  />
                </label>

                <div className="mt-2 border-t border-[var(--wov-panel-2)] pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Sfondo</span>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex flex-1 items-center justify-center gap-1 rounded-md bg-[var(--wov-tile)] py-1.5 text-xs font-bold text-[var(--wov-text)] hover:brightness-125"
                    >
                      <ImagePlus size={14} />
                      Carica immagine
                    </button>
                    {activeBg && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...backgrounds };
                          delete next[String(activeAvatar)];
                          setBackgrounds(next);
                        }}
                        className="flex items-center justify-center gap-1 rounded-md bg-[var(--wov-tile)] px-2.5 py-1.5 text-xs font-bold text-[var(--wov-accent)] hover:brightness-125"
                        aria-label="Rimuovi sfondo"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) pickBackground(file);
                      e.target.value = "";
                    }}
                  />
                </div>

                <FilterSettings
                  legendaryFirst={legendaryFirst}
                  onLegendaryFirst={setLegendaryFirst}
                  filterTag={filterTag}
                  onFilterTag={(tag) => {
                    setFilterTag(tag);
                    setSelectedColor(null);
                    setSelectedOrigin(null);
                  }}
                  selectedColor={selectedColor}
                  onColor={setSelectedColor}
                  selectedOrigin={selectedOrigin}
                  onOrigin={setSelectedOrigin}
                />

                <div className="mt-2 border-t border-[var(--wov-panel-2)] pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Codici item</span>
                  <button
                    type="button"
                    onClick={copyCurrentIds}
                    className="mt-2 w-full rounded-md bg-[var(--wov-tile)] py-1.5 text-xs font-bold hover:brightness-125"
                  >
                    Copia gli ID dell&apos;avatar attuale
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="mt-4 w-full rounded-md bg-[var(--wov-accent)] py-2 text-sm font-bold text-white"
                >
                  OK
                </button>
              </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden sm:rounded-md bg-[var(--wov-panel)]">
          <div className="grid grid-cols-2 bg-[var(--wov-panel-2)] sm:bg-transparent border-b border-[var(--wov-panel-2)] sm:border-0">
            {(["avatar", "items"] as const).map((currentTab) => (
              <button
                key={currentTab}
                onClick={() => setTab(currentTab)}
                className={`py-1.5 text-[11px] font-bold uppercase tracking-wide sm:py-2.5 ${
                  tab === currentTab
                    ? "text-[var(--wov-text)]"
                    : "text-[var(--wov-muted)]"
                }`}
              >
                {currentTab === "avatar" ? "Avatar" : "Items"}
              </button>
            ))}
          </div>

          {dataError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="max-w-md text-sm text-red-400">{dataError}</p>
              <button
                onClick={() => void loadAll(true)}
                disabled={loadingData}
                className="flex items-center gap-2 rounded-md bg-[var(--wov-tile)] px-3 py-2 text-xs font-bold"
              >
                <RefreshCw size={14} className={loadingData ? "animate-spin" : ""} />
                Riprova
              </button>
            </div>
          ) : tab === "avatar" ? (
            <>
              <div className="wov-scroll flex shrink-0 items-center justify-between gap-1 overflow-x-auto bg-[var(--wov-panel-2)] px-2 py-1 sm:py-1">
                {visibleCats.map((category) => (
                  <button
                    key={category.key}
                    onClick={() => {
                      setCat(category.key);
                      setSearch("");
                    }}
                    aria-label={category.key}
                    className="relative flex h-8 min-w-8 flex-1 items-center justify-center sm:h-9 sm:min-w-9"
                  >
                    <img
                      src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/wov-icons/${category.icon}`}
                      alt=""
                      className={`h-4 w-auto max-w-7 object-contain sm:h-5 transition ${
                        cat === category.key
                          ? "opacity-100 brightness-150"
                          : "opacity-40"
                      }`}
                    />
                    {category.second && (
                      <span className="absolute right-0 top-0 rounded-full bg-[var(--wov-accent)] px-1 text-[7px] font-bold">
                        2°
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="wov-scroll flex-1 overflow-y-auto p-1">
                {activeCategory.isSkinPack ? (
                  <>
                    {loadingData && skinPacks.length === 0 ? (
                      <div className="flex min-h-32 items-center justify-center text-xs text-[var(--wov-muted)]">
                        Caricamento pacchetti skin...
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                        {categorySkinPacks.map(({ pack, packSlots, label }) => {
                          const meta = RARITY_META[pack.rarity];
                          const bgClass = meta.dot;
                          const hasLayers = Object.values(packSlots).some(Boolean);

                          return (
                            <button
                              key={`${pack.source}-${pack.id}`}
                              type="button"
                              onClick={() => equipSkinPack(pack, packSlots, label)}
                              className={`group relative flex aspect-[86/68] flex-col items-center justify-center overflow-hidden rounded-lg border-2 bg-[var(--wov-tile)] transition-all hover:brightness-125 ${meta.border}`}
                              title={`${label} · ${pack.source}`}
                            >
                              {hasLayers ? (
                                <PackThumb
                                  slots={{ bodyPaintId: slots.bodyPaintId ?? null, ...packSlots }}
                                  itemUrl={itemUrlOf}
                                  paintUrl={paintUrlOf}
                                  calibration={calibration}
                                />
                              ) : pack.previewImageUrl ? (
                                <StoreIcon
                                  src={pack.previewImageUrl}
                                  alt={label}
                                  className="h-full w-full object-contain p-1"
                                />
                              ) : (
                                <div
                                  className={`flex h-full w-full flex-col items-center justify-center gap-0.5 rounded ${bgClass} p-1 text-center`}
                                >
                                  <span
                                    className={`line-clamp-2 w-full text-[9px] font-bold leading-tight ${meta.text}`}
                                  >
                                    {label}
                                  </span>
                                  <span className="text-[7px] uppercase tracking-wide opacity-70 text-white/90">
                                    {meta.label} · {pack.source}
                                  </span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {!loadingData && categorySkinPacks.length === 0 && (
                      <p className="p-8 text-center text-xs text-[var(--wov-muted)]">
                        Nessun pacchetto trovato.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {loadingData && items.length === 0 ? (
                      <div className="flex min-h-32 items-center justify-center text-xs text-[var(--wov-muted)]">
                        Caricamento item Wolvesville...
                      </div>
                    ) : (
                      <div className={`grid gap-1 sm:gap-1.5 sm:grid-cols-6 md:grid-cols-7 xl:grid-cols-9 ${gridCols === 3 ? "grid-cols-3" : gridCols === 5 ? "grid-cols-5" : gridCols === 6 ? "grid-cols-6" : "grid-cols-4"}`}>
                        {!activeCategory.isBodyPaint && (
                          <button
                            type="button"
                            onClick={() => clearSlot(activeCategory.slotKey)}
                            className={`flex aspect-[86/68] items-center justify-center rounded-lg border-2 text-xs ${
                              !slots[activeCategory.slotKey ?? ""]
                                ? "border-green-500 bg-[var(--wov-tile)] text-[var(--wov-text)]"
                                : "border-[var(--wov-tile-border)] bg-[var(--wov-tile)] text-[var(--wov-muted)]"
                            }`}
                          >
                            None
                          </button>
                        )}

                        {categoryItems.map((item) => {
                          const selected =
                            !!activeCategory.slotKey &&
                            slots[activeCategory.slotKey] === item.id;

                          const meta = RARITY_META[itemRarity(item)];

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => equipInCategory(activeCategory, item)}
                              className={`relative flex aspect-[86/68] items-center justify-center rounded-lg border-2 bg-[var(--wov-tile)] p-1.5 transition-all ${
                                selected
                                  ? "border-green-500 ring-2 ring-green-500/30"
                                  : `${meta.border} hover:brightness-125`
                              }`}
                              title={itemTitle(item)}
                            >
                              <StoreIcon
                                src={item.imageUrl}
                                alt={itemTitle(item)}
                                className="h-full w-full object-contain"
                              />

                              {selected && (
                                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-green-500" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {!loadingData && categoryItems.length === 0 && (
                      <p className="p-8 text-center text-xs text-[var(--wov-muted)]">
                        Nessun item trovato.
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="wov-scroll flex-1 overflow-y-auto p-2">
              <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
                {ITEM_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setItemType(type)}
                    className={`shrink-0 rounded-md px-2.5 py-1.5 text-[10px] font-bold ${
                      itemType === type
                        ? "bg-[var(--wov-accent)] text-white"
                        : "bg-[var(--wov-tile)] text-[var(--wov-muted)]"
                    }`}
                  >
                    {TYPE_LABELS[type]}
                  </button>
                ))}
              </div>

              <div className="mb-2 flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--wov-muted)]"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cerca per nome, ID o tag..."
                    className="w-full rounded-md border border-[var(--wov-tile-border)] bg-[var(--wov-tile)] py-2 pl-8 pr-2 text-xs outline-none"
                  />
                </div>

                <select
                  value={rarity ?? ""}
                  onChange={(e) => setRarity(e.target.value || null)}
                  className="rounded-md border border-[var(--wov-tile-border)] bg-[var(--wov-tile)] px-2 text-xs"
                >
                  <option value="">Tutte</option>
                  {RARITY_ORDER.map((r) => (
                    <option key={r} value={r}>
                      {RARITY_META[r].label}
                    </option>
                  ))}
                </select>
              </div>

              <p className="mb-2 text-center text-[10px] text-[var(--wov-muted)]">
                {loadingData
                  ? "Caricamento catalogo..."
                  : `${catalogItems.length} oggetti in ${TYPE_LABELS[itemType].toLowerCase()}`}
              </p>

              <div className={`grid gap-1 sm:gap-1.5 sm:grid-cols-6 md:grid-cols-7 xl:grid-cols-9 ${gridCols === 3 ? "grid-cols-3" : gridCols === 5 ? "grid-cols-5" : gridCols === 6 ? "grid-cols-6" : "grid-cols-4"}`}>
                {catalogItems.map((item) => {
                  const meta = RARITY_META[item.rarity];

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => equipItem(item)}
                      title={`${itemTitle(item)} · ${item.id}`}
                      className={`relative flex aspect-[86/68] items-center justify-center rounded-lg border-2 bg-[var(--wov-tile)] p-1.5 hover:brightness-125 ${meta.border}`}
                    >
                      <StoreIcon
                        src={item.imageUrl}
                        alt={itemTitle(item)}
                        className="h-full w-full object-contain"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {devEnabled && devOpen && (
        <DevCalibrationPanel
          calibration={calibration}
          onChange={setCalibration}
          onClose={() => setDevOpen(false)}
          layers={layers}
          naturals={naturals}
          describeItem={describeItem}
          showGuides={showGuides}
          onShowGuides={setShowGuides}
        />
      )}

    </div>
  );
}

/** Sezione "Mostra, filtra e ordina" dentro le impostazioni (come nel pannello di Wolvesville). */
function FilterSettings({
  legendaryFirst,
  onLegendaryFirst,
  filterTag,
  onFilterTag,
  selectedColor,
  onColor,
  selectedOrigin,
  onOrigin,
}: {
  legendaryFirst: boolean;
  onLegendaryFirst: (v: boolean) => void;
  filterTag: FilterTag;
  onFilterTag: (tag: FilterTag) => void;
  selectedColor: string | null;
  onColor: (color: string | null) => void;
  selectedOrigin: string | null;
  onOrigin: (origin: string | null) => void;
}) {
  const selectCls =
    "rounded border border-[var(--wov-tile-border)] bg-[var(--wov-tile)] px-1.5 py-1 text-xs text-[var(--wov-text)] outline-none";

  return (
    <div className="mt-2 border-t border-[var(--wov-panel-2)] pt-2">
      <span className="text-xs font-bold uppercase tracking-wider">Mostra, filtra e ordina</span>

      <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 text-sm">
        <span>Mostra prima i leggendari</span>
        <input
          type="checkbox"
          checked={legendaryFirst}
          onChange={(e) => onLegendaryFirst(e.target.checked)}
          className="h-4 w-4 accent-[var(--wov-accent)]"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-bold text-[var(--wov-muted)]">Filtra per tag:</span>
        <select
          aria-label="Filtra per tag"
          value={filterTag}
          onChange={(e) => onFilterTag(e.target.value as FilterTag)}
          className={selectCls}
        >
          <option value="all">Tutti gli item</option>
          <option value="color">Colore</option>
          <option value="origin">Origine</option>
        </select>

        {filterTag === "origin" && (
          <>
            <span className="text-[var(--wov-muted)]">&gt;</span>
            <select
              aria-label="Filtra per origine"
              value={selectedOrigin ?? ""}
              onChange={(e) => onOrigin(e.target.value || null)}
              className={`${selectCls} min-w-0 max-w-full flex-1`}
            >
              <option value="">Scegli un&apos;origine...</option>
              {ORIGINS.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {filterTag === "color" && (
        <div className="mt-2 grid grid-cols-3 gap-1.5" role="group" aria-label="Filtra per colore">
          {COLOR_FILTERS.map(({ key, label, bg, fg }) => {
            const active = selectedColor === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onColor(active ? null : key)}
                aria-pressed={active}
                style={active ? { background: bg, color: fg, borderColor: "transparent" } : undefined}
                className={`rounded-full border px-2 py-1 text-[11px] font-bold transition ${
                  active
                    ? "shadow-md"
                    : "border-[var(--wov-tile-border)] bg-[var(--wov-tile)] text-[var(--wov-muted)] hover:brightness-125"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** True appena l'elemento entra (quasi) nello schermo: evita di montare migliaia di <img> in anticipo. */
function useInView(ref: RefObject<Element | null>): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "100px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, seen]);
  return seen;
}

/**
 * Icona dello store con rete di sicurezza: prova la versione @2x e, se non esiste
 * (item vecchi), ricade sull'URL originale dell'API. Se anche quello manca, mostra un segnaposto.
 */
function StoreIcon({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const urls = [storeIconUrl(src), src];
  if (stage === 2) {
    return <span className="text-[9px] text-[var(--wov-muted)]">?</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={urls[stage]}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={className}
      onError={() => setStage((s) => (s === 0 && urls[1] !== urls[0] ? 1 : 2))}
    />
  );
}

/** Riduce l'avatar abbastanza da contenerne la silhouette nel riquadro largo del pacchetto. */
const PACK_THUMB_SCALE = 78;

/** Miniatura di un pacchetto skin: l'avatar composto con lo STESSO motore dell'anteprima grande. */
function PackThumb({
  slots,
  itemUrl,
  paintUrl,
  calibration,
}: {
  slots: WovAvatarSlots;
  itemUrl: (id: string | null | undefined) => string | undefined;
  paintUrl: (id: string | null | undefined) => string | undefined;
  calibration: AvatarCalibration;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  const layers = useMemo(
    () => (visible ? buildAvatarLayers(slots, itemUrl, paintUrl, 2, 2) : []),
    // slots e' un oggetto nuovo a ogni render del genitore: si confronta il contenuto
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, JSON.stringify(slots), itemUrl, paintUrl],
  );

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <AvatarPreview
        layers={layers}
        calibration={calibration}
        scale={PACK_THUMB_SCALE}
      />
    </div>
  );
}

function AvatarPreview({
  layers,
  calibration,
  scale = 100,
  showGuides = false,
  onNatural,
}: {
  layers: WovLayerSpec[];
  calibration: AvatarCalibration;
  scale?: number;
  showGuides?: boolean;
  onNatural?: (key: string, w: number, h: number, density: number) => void;
}) {
  const { box } = calibration;
  const widthPct = (box.widthPct * scale) / 100;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <div
        className="absolute -translate-x-1/2"
        style={{
          width: `${widthPct}%`,
          aspectRatio: `${box.ratioW} / ${box.ratioH}`,
          left: `${50 + box.offsetX}%`,
          bottom: `${box.offsetY}%`,
          outline: showGuides ? "1px dashed rgba(255,62,127,0.9)" : undefined,
        }}
      >
        {layers.map((layer) => (
          <WovLayer key={layer.key} spec={layer} calibration={calibration} onNatural={onNatural} />
        ))}

        {showGuides && (
          <>
            {/* asse verticale centrale e linea di base */}
            <div className="absolute inset-y-0 left-1/2 w-px bg-[rgba(255,62,127,0.55)]" style={{ zIndex: 50 }} />
            <div className="absolute inset-x-0 bottom-0 h-px bg-[rgba(255,62,127,0.9)]" style={{ zIndex: 50 }} />
          </>
        )}
      </div>
    </div>
  );
}

function WovLayer({
  spec,
  calibration,
  onNatural,
}: {
  spec: WovLayerSpec;
  calibration: AvatarCalibration;
  onNatural?: (key: string, w: number, h: number, density: number) => void;
}) {
  // Item @2x; le parti del body paint @3x (vedi BODY_PAINT_DENSITY in wov-avatar.ts)
  const density = spec.density ?? 2;
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const adj = resolveAdjust(calibration, spec);
  const frac = natural ? layerWidthFraction(natural.w, density, calibration) * adj.scale : 0.08;
  // dy e' in % della LARGHEZZA del quadrato, ma CSS `bottom` usa l'altezza: si converte.
  const bottomPct = (adj.dy * calibration.box.ratioW) / calibration.box.ratioH;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={spec.url}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onLoad={(event) => {
        const w = event.currentTarget.naturalWidth;
        const h = event.currentTarget.naturalHeight;
        setNatural({ w, h });
        onNatural?.(spec.key, w, h, density);
      }}
      style={{
        position: "absolute",
        bottom: `${bottomPct}%`,
        left: `${50 + adj.dx}%`,
        transform: "translateX(-50%)",
        width: `${frac * 100}%`,
        height: "auto",
        zIndex: spec.z,
        opacity: natural ? 1 : 0,
      }}
    />
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
  asLink,
}: {
  label: string;
  onClick?: () => void;
  children?: ReactNode;
  asLink?: boolean;
}) {
  const cls =
    "flex h-9 w-9 items-center justify-center text-[var(--wov-text)] hover:opacity-80";

  if (asLink) {
    return (
      <Link href="/" aria-label={label} title={label} className={cls}>
        <Home size={20} />
      </Link>
    );
  }

  return (
    <button aria-label={label} title={label} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

function NightScene() {
  return (
    <svg
      viewBox="0 0 380 343"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 h-full w-full"
    >
      <rect width="380" height="343" fill="var(--wov-sky)" />

      {[
          [140, 12],
          [210, 30],
          [300, 18],
          [350, 60],
          [260, 70],
          [120, 50],
        ].map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="1"
            fill="#cfd8e6"
            opacity="0.7"
          />
        ))}

      <g fill="#14161f">
        {[10, 32, 55, 78].map((x, i) => (
          <polygon
            key={i}
            points={`${x},${120 - i * 6} ${x - 16},175 ${x + 16},175`}
          />
        ))}
      </g>

      <path
        d="M0 150 L120 140 L160 155 L200 150 L240 180 L240 343 L0 343 Z"
        fill="#191b26"
      />

      <g fill="#14161f">
        <rect x="280" y="230" width="22" height="80" />
        <polygon points="280,230 291,205 302,230" />
        <rect x="300" y="250" width="30" height="60" />
        <polygon points="300,250 315,232 330,250" />
        <rect x="330" y="215" width="18" height="100" />
        <polygon points="330,215 339,192 348,215" />
        <rect x="348" y="245" width="32" height="70" />
        <polygon points="348,245 364,228 380,245" />
        <rect x="255" y="270" width="28" height="50" />
        <polygon points="255,270 269,255 283,270" />
      </g>

      <g fill="#dfe6f2">
        {[
          [286, 245],
          [294, 262],
          [306, 262],
          [318, 275],
          [336, 230],
          [336, 250],
          [342, 270],
          [355, 262],
          [368, 262],
          [362, 285],
          [262, 285],
          [272, 295],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="4" height="6" />
        ))}
      </g>

      <g fill="#14161f">
        {[230, 250, 372].map((x, i) => (
          <polygon
            key={i}
            points={`${x},${260 - i * 4} ${x - 14},320 ${x + 14},320`}
          />
        ))}
      </g>

      <rect y="315" width="380" height="28" fill="#14161f" />
    </svg>
  );
}

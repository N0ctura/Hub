"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import {
  Download,
  Eye,
  EyeOff,
  Home,
  ImagePlus,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shuffle,
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
  fetchAvatarItems,
  fetchBodyPaints,
  fetchItemTags,
  fetchSkinPacks,
  resolvePackSlots,
  createSharedAvatar,
  getApiKey,
  type WovAvatarItem,
  type WovAvatarSlots,
  type WovBodyPaint,
  type WovItemType,
  type WovSkinPack,
} from "@/lib/wov-api";
import { buildAvatarLayers, storeIconUrl, type WovLayerSpec } from "@/lib/wov-avatar";
import {
  DEFAULT_CALIBRATION,
  layerWidthFraction,
  loadCalibration,
  resolveAdjust,
  saveCalibration,
  type AvatarCalibration,
} from "@/lib/avatar-calibration";
import { AvatarRenderError, renderAvatarBlob, type Density } from "@/lib/avatar-render";
import { downloadBlob, isAppleTouchDevice, shareBlob } from "@/lib/save-image";
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

interface SaveSheetState {
  /** blob locale pronto da salvare (canvas o fetch riuscito) */
  objectUrl?: string;
  blob?: Blob;
  /** immagine remota mostrabile ma non scaricabile (CORS): salvataggio manuale */
  remoteUrl?: string;
  fileName: string;
  note?: string;
}

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
  const apiKey = getApiKey();

  const [tab, setTab] = useState<"avatar" | "items">("avatar");
  const [cat, setCat] = useState("hat");
  const [search, setSearch] = useState("");
  const [itemType, setItemType] = useState<WovItemType>("SHIRT");
  const [rarity, setRarity] = useState<string | null>(null);

  const [items, setItems] = useState<WovAvatarItem[]>([]);
  const [bodyPaints, setBodyPaints] = useState<WovBodyPaint[]>([]);
  const [skinPacks, setSkinPacks] = useState<WovSkinPack[]>([]);
  const [tags, setTags] = useState<Record<string, string[]>>({});
  const [slots, setSlots] = useState<WovAvatarSlots>({});
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [hideUi, setHideUi] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moonlight, setMoonlight] = usePersisted("wov_moonlight_v2", true);
  const [avatars, setAvatars] = usePersisted<number[]>("wov_avatars", [0]);
  const [activeAvatar, setActiveAvatar] = usePersisted("wov_active_avatar", 0);
  const [backgrounds, setBackgrounds] = usePersisted<Record<string, string>>("wov_backgrounds", {});
  const [avatarScale, setAvatarScale] = usePersisted("wov_avatar_scale", 100);

  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // --- calibrazione / menu dev -------------------------------------------
  const [calibration, setCalibrationState] = useState<AvatarCalibration>(DEFAULT_CALIBRATION);
  const [devEnabled, setDevEnabled] = useState(process.env.NODE_ENV !== "production");
  const [devOpen, setDevOpen] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [naturals, setNaturals] = useState<Record<string, NaturalSize>>({});
  const [downloading, setDownloading] = useState(false);
  const [saveSheet, setSaveSheet] = useState<SaveSheetState | null>(null);

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

  useEffect(() => {
    // libera l'URL del blob del pannello "salva" quando si chiude
    return () => {
      if (saveSheet?.objectUrl) URL.revokeObjectURL(saveSheet.objectUrl);
    };
  }, [saveSheet]);

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
      const [itemList, paintList, tagMap, packList] = await Promise.all([
        fetchAvatarItems(force),
        fetchBodyPaints(force),
        fetchItemTags(force),
        fetchSkinPacks(force),
      ]);

      setItems(itemList);
      setBodyPaints(paintList);
      setTags(tagMap);
      setSkinPacks(packList);

      setSlots((prev) => {
        if (prev.bodyPaintId) return prev;
        const defaultPaint =
          paintList.find((p) => p.imageUrl.includes("skin-1")) ?? paintList[0];
        return defaultPaint ? { ...prev, bodyPaintId: defaultPaint.id } : prev;
      });
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Errore sconosciuto");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (apiKey) void loadAll();
  }, [apiKey, loadAll]);

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

    return [...base].sort((a, b) =>
      itemTitle(a).localeCompare(itemTitle(b), undefined, { sensitivity: "base" }),
    );
  }, [activeCategory, bodyPaints, items, search, tags]);

  const categorySkinPacks = useMemo(() => {
    if (!activeCategory.isSkinPack) return [];
    const q = search.trim().toLowerCase();
    const base = resolvedPacks.filter(({ pack, label }) => {
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
  }, [activeCategory, search, resolvedPacks]);

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
      });
  }, [items, itemType, rarity, search, tags]);

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

  const downloadPng = async () => {
    if (downloading) return;
    const density: Density = 3;
    const fileName = `wolvesville-avatar-${density}x-${Date.now()}.png`;

    if (layerSets[density].length === 0) {
      toast.error("Nessun layer da scaricare: scegli almeno un item o un body paint");
      return;
    }

    setDownloading(true);
    const loadingId = toast.loading("Preparo l'immagine 3x...");

    // Consegna del file: su iPhone/iPad serve un gesto utente fresco -> pannello "Salva"
    const deliver = (blob: Blob, w?: number, h?: number) => {
      if (isAppleTouchDevice()) {
        setSaveSheet({
          objectUrl: URL.createObjectURL(blob),
          blob,
          fileName,
          note: w && h ? `${w}×${h}px` : undefined,
        });
        toast.success("Immagine pronta: tocca Salva", { id: loadingId });
      } else {
        downloadBlob(blob, fileName);
        toast.success(`Avatar ${density}x scaricato`, { id: loadingId });
      }
    };

    try {
      // 1) Strada principale: composizione locale sul canvas (nessuna API, stessa calibrazione dell'anteprima)
      const result = await renderAvatarBlob({ layerSets, calibration, density });
      deliver(result.blob, result.width, result.height);
      if (result.skipped.length) {
        toast.warning(`${result.skipped.length} layer non caricati, saltati`);
      }
      return;
    } catch (renderError) {
      const detail =
        renderError instanceof AvatarRenderError
          ? renderError.message
          : renderError instanceof Error
            ? renderError.message
            : String(renderError);
      console.warn("[download] canvas non riuscito, provo l'API ufficiale:", renderError);

      // 2) Fallback: PNG renderizzato da Wolvesville (richiede API key)
      try {
        const shared = await createSharedAvatar(slots);
        const url = shared.avatar.url.replace(/\.png(\?.*)?$/i, `@${density}x.png$1`);
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          deliver(await res.blob());
        } catch {
          // CORS bloccato: l'<img> si puo' comunque mostrare -> salvataggio manuale
          setSaveSheet({ remoteUrl: url, fileName, note: "tieni premuto sull'immagine" });
          toast.message("Download diretto bloccato dal browser: salva dal pannello", {
            id: loadingId,
          });
        }
        return;
      } catch (apiError) {
        const apiDetail = apiError instanceof Error ? apiError.message : String(apiError);
        console.error("[download] fallito anche con l'API:", apiError);
        toast.error(`Download non riuscito. Canvas: ${detail}. API: ${apiDetail}`, {
          id: loadingId,
          duration: 12000,
        });
      }
    } finally {
      setDownloading(false);
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiato");
    } catch {
      toast.error("Impossibile copiare il link");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--wov-page)] font-sans text-[var(--wov-text)]">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-3 p-2 sm:p-4 lg:h-screen lg:flex-row lg:gap-3">
        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[380px]">
          <div
            ref={previewRef}
            className="relative aspect-[380/343] w-full overflow-hidden rounded-md bg-[var(--wov-sky)]"
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
              <div className="absolute left-0 top-0 z-20 flex items-center gap-1 rounded-br-md bg-[var(--wov-toolbar)] px-2 py-1.5">
                <ToolbarButton label="Torna all'Hub" asLink />
                <ToolbarButton label="Nascondi" onClick={() => setHideUi(true)}>
                  <Eye size={22} />
                </ToolbarButton>
                <ToolbarButton label="Condividi" onClick={share}>
                  <span className="text-lg">↗</span>
                </ToolbarButton>
                <ToolbarButton label="Impostazioni" onClick={() => setSettingsOpen((v) => !v)}>
                  <Settings size={22} />
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
              <div className="absolute left-2 top-12 z-30 w-[260px] rounded-md border border-[var(--wov-panel-2)] bg-[var(--wov-panel)] p-3 shadow-xl">
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

                <div className="mt-4 border-t border-[var(--wov-panel-2)] pt-3">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider">
                      Scala avatar
                    </span>
                    <span className="font-mono text-[var(--wov-accent)]">
                      {avatarScale}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={150}
                    value={avatarScale}
                    onChange={(e) => setAvatarScale(Number(e.target.value))}
                    className="w-full accent-[var(--wov-accent)]"
                  />
                  <div className="mt-2 flex gap-1">
                    {[50, 70, 85, 100].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setAvatarScale(preset)}
                        className={`flex-1 rounded-md px-1.5 py-1 text-[10px] font-bold transition ${
                          avatarScale === preset
                            ? "bg-[var(--wov-accent)] text-white"
                            : "bg-[var(--wov-tile)] text-[var(--wov-muted)] hover:brightness-125"
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-md bg-[var(--wov-panel)] p-2">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => void downloadPng()}
                disabled={downloading}
                className="flex items-center gap-1 rounded-md bg-[var(--wov-tile)] px-3 py-1.5 text-xs font-bold text-[var(--wov-text)] hover:brightness-125 disabled:opacity-60"
              >
                <Download size={14} className={downloading ? "animate-pulse" : ""} />
                3x
              </button>

              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 rounded-md bg-[var(--wov-tile)] px-3 py-1.5 text-xs font-bold text-[var(--wov-text)] hover:brightness-125"
              >
                <ImagePlus size={14} />
                Sfondo
              </button>

              {activeBg && (
                <button
                  onClick={() => {
                    const next = { ...backgrounds };
                    delete next[String(activeAvatar)];
                    setBackgrounds(next);
                  }}
                  className="flex items-center gap-1 rounded-md bg-[var(--wov-tile)] px-3 py-1.5 text-xs font-bold text-[var(--wov-accent)] hover:brightness-125"
                  aria-label="Rimuovi sfondo"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <p className="mt-1.5 text-center text-[10px] text-[var(--wov-muted)]">
              3x qualità massima · PNG trasparente composto direttamente nel browser.
            </p>

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

          <div className="relative flex min-h-[200px] flex-col rounded-md bg-[var(--wov-panel)] lg:flex-1 lg:min-h-0">
            <p className="pt-2 text-center text-xs font-bold">Avatars</p>

            <button
              aria-label="Avatar casuale"
              className="absolute right-0 top-0 rounded-bl-md bg-[var(--wov-toolbar)] p-1.5"
              onClick={() =>
                setActiveAvatar(
                  avatars[Math.floor(Math.random() * avatars.length)] ?? 0,
                )
              }
            >
              <Shuffle size={14} />
            </button>

            <div className="wov-scroll grid flex-1 grid-cols-3 content-start gap-x-6 gap-y-3 overflow-y-auto px-6 py-3 lg:px-8">
              {avatars.map((id) => (
                <button
                  key={id}
                  onClick={() => setActiveAvatar(id)}
                  className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-[var(--wov-sky)] ${
                    activeAvatar === id
                      ? "border-[var(--wov-selected)]"
                      : "border-[var(--wov-tile-border)]"
                  }`}
                >
                  {backgrounds[String(id)] ? (
                    <img
                      src={backgrounds[String(id)]}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <NightScene mini />
                  )}
                </button>
              ))}

              <button
                onClick={() => {
                  const next = Math.max(...avatars, -1) + 1;
                  setAvatars([...avatars, next]);
                  setActiveAvatar(next);
                }}
                className="flex aspect-square flex-col items-center justify-center rounded-lg bg-[var(--wov-tile)] text-[var(--wov-muted)]"
                aria-label="Nuovo avatar"
              >
                <Plus size={30} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex min-h-[70vh] min-w-0 flex-1 flex-col overflow-hidden rounded-md bg-[var(--wov-panel)] lg:min-h-0">
          <div className="grid grid-cols-2">
            {(["avatar", "items"] as const).map((currentTab) => (
              <button
                key={currentTab}
                onClick={() => setTab(currentTab)}
                className={`py-2.5 text-[11px] font-bold uppercase tracking-wide ${
                  tab === currentTab
                    ? "text-[var(--wov-text)]"
                    : "text-[var(--wov-muted)]"
                }`}
              >
                {currentTab === "avatar" ? "Avatar" : "Items"}
              </button>
            ))}
          </div>

          {!apiKey ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <div>
                <p className="text-sm font-bold">API key non configurata</p>
                <p className="mt-2 text-xs text-[var(--wov-muted)]">
                  Controlla il secret <code>WOLVESVILLE_API_KEY</code> nel workflow GitHub.
                </p>
              </div>
            </div>
          ) : dataError ? (
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
              <div className="wov-scroll flex shrink-0 items-center justify-between gap-1 overflow-x-auto bg-[var(--wov-panel-2)] px-2 py-1">
                {visibleCats.map((category) => (
                  <button
                    key={category.key}
                    onClick={() => {
                      setCat(category.key);
                      setSearch("");
                    }}
                    aria-label={category.key}
                    className="relative flex h-9 min-w-9 flex-1 items-center justify-center"
                  >
                    <img
                      src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/wov-icons/${category.icon}`}
                      alt=""
                      className={`h-5 w-auto max-w-7 object-contain transition ${
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

              <div className="flex shrink-0 gap-2 border-b border-[var(--wov-panel-2)] p-2">
                <div className="relative min-w-0 flex-1">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--wov-muted)]"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={activeCategory.isSkinPack ? "Cerca pacchetti skin..." : `Cerca in ${activeCategory.key}...`}
                    className="w-full rounded-md border border-[var(--wov-tile-border)] bg-[var(--wov-tile)] py-2 pl-8 pr-2 text-xs outline-none"
                  />
                </div>

                <button
                  onClick={() => void loadAll(true)}
                  disabled={loadingData}
                  className="rounded-md bg-[var(--wov-tile)] px-3 text-[var(--wov-text)]"
                  title="Aggiorna item"
                >
                  <RefreshCw size={14} className={loadingData ? "animate-spin" : ""} />
                </button>
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
                      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-7 xl:grid-cols-9">
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

              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-7 xl:grid-cols-9">
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

      {saveSheet && <SaveSheet sheet={saveSheet} onClose={() => setSaveSheet(null)} />}
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
      { rootMargin: "300px" },
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
      draggable={false}
      className={className}
      onError={() => setStage((s) => (s === 0 && urls[1] !== urls[0] ? 1 : 2))}
    />
  );
}

/** Zoom della miniatura di un pacchetto: mostra testa e spalle come nel gioco. */
const PACK_THUMB_ZOOM = 1.5;

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
    () => (visible ? buildAvatarLayers(slots, itemUrl, paintUrl, 2) : []),
    // slots e' un oggetto nuovo a ogni render del genitore: si confronta il contenuto
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, JSON.stringify(slots), itemUrl, paintUrl],
  );

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ transform: `scale(${PACK_THUMB_ZOOM})`, transformOrigin: "50% 100%" }}
      >
        <AvatarPreview layers={layers} calibration={calibration} />
      </div>
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
  // Le anteprime caricano sempre @2x
  const density = 2;
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

function SaveSheet({ sheet, onClose }: { sheet: SaveSheetState; onClose: () => void }) {
  const src = sheet.objectUrl ?? sheet.remoteUrl ?? "";

  const onSave = async () => {
    if (!sheet.blob) return;
    // Gesto utente fresco: qui il foglio di condivisione di iOS funziona ("Salva immagine")
    const result = await shareBlob(sheet.blob, sheet.fileName);
    if (result === "unsupported") {
      downloadBlob(sheet.blob, sheet.fileName);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Salva immagine"
    >
      <div
        className="flex max-h-full w-full max-w-sm flex-col gap-3 rounded-lg bg-[var(--wov-panel)] p-3 text-[var(--wov-text)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider">Salva immagine</span>
          <button aria-label="Chiudi" onClick={onClose} className="text-[var(--wov-muted)]">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-md bg-[var(--wov-sky)] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Avatar pronto" className="mx-auto max-h-[55vh] w-auto object-contain" />
        </div>

        {sheet.blob ? (
          <button
            onClick={() => void onSave()}
            className="flex items-center justify-center gap-2 rounded-md bg-[var(--wov-accent)] py-2.5 text-sm font-bold text-white"
          >
            <Download size={16} /> Salva / Condividi
          </button>
        ) : (
          <a
            href={sheet.remoteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-md bg-[var(--wov-accent)] py-2.5 text-sm font-bold text-white"
          >
            Apri immagine
          </a>
        )}

        <p className="text-center text-[10px] text-[var(--wov-muted)]">
          {sheet.note ? `${sheet.note} · ` : ""}Su iPhone/iPad puoi anche tenere premuto
          sull&apos;immagine e scegliere «Salva in Foto».
        </p>
      </div>
    </div>
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

function NightScene({ mini }: { mini?: boolean }) {
  return (
    <svg
      viewBox="0 0 380 343"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 h-full w-full"
    >
      <rect width="380" height="343" fill="var(--wov-sky)" />

      {!mini &&
        [
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

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Layers,
  Loader2,
  Moon,
  RefreshCw,
  Save,
  Search,
  PawPrint,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ItemPickerDialog } from "@/components/wolvesville/item-picker-dialog";
import {
  AVATAR_BOX_RATIO,
  buildAvatarLayers,
  itemLayerUrl,
  layerWidthPercent,
  storeIconUrl,
  type WovLayerSpec,
} from "@/lib/wov-avatar";
import {
  RARITY_META,
  RARITY_ORDER,
  REQUIRED_SLOT_KEYS,
  TYPE_LABELS,
  WOV_SLOTS,
  createSharedAvatar,
  eventLabel,
  fetchAvatarItems,
  fetchBodyPaints,
  fetchItemTags,
  getApiKey,
  loadSavedSkins,
  persistSavedSkins,
  type SavedSkin,
  type WovAvatarItem,
  type WovAvatarSlots,
  type WovBodyPaint,
  type WovItemType,
  type WovSharedAvatar,
} from "@/lib/wov-api";

type ItemMap = Record<string, WovAvatarItem>;

const TYPE_ORDER: WovItemType[] = [
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
  "GRAVESTONE",
  "LEGS",
];

export default function WolvesvillePage() {
  /* ------------------------------ stato base ----------------------------- */
  // Chiave API iniettata a build time dal secret GitHub WOLVESVILLE_API_KEY.
  const apiKey = getApiKey();

  const [items, setItems] = useState<WovAvatarItem[]>([]);
  const [bodyPaints, setBodyPaints] = useState<WovBodyPaint[]>([]);
  const [tags, setTags] = useState<Record<string, string[]>>({});
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  /* ------------------------------- creator ------------------------------- */
  const [slots, setSlots] = useState<WovAvatarSlots>({});
  const [pickerSlot, setPickerSlot] = useState<string | null>(null);
  const [shared, setShared] = useState<WovSharedAvatar | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  /* ------------------------------- catalogo ------------------------------ */
  const [catalogType, setCatalogType] = useState<WovItemType>("SHIRT");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogRarity, setCatalogRarity] = useState<string | null>(null);

  /* --------------------------- skin salvate ------------------------------ */
  const [savedSkins, setSavedSkins] = useState<SavedSkin[]>([]);
  const [skinName, setSkinName] = useState("");

  const itemMap = useMemo<ItemMap>(() => {
    const map: ItemMap = {};
    for (const item of items) map[item.id] = item;
    for (const bp of bodyPaints) {
      map[bp.id] = { ...(bp as unknown as WovAvatarItem), type: "SHIRT" };
    }
    return map;
  }, [items, bodyPaints]);

  const renderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------------------------- caricamento ------------------------------ */

  const loadAll = useCallback(async (force = false) => {
    setLoadingData(true);
    setDataError(null);
    try {
      const [itemList, bodyPaintList, tagMap] = await Promise.all([
        fetchAvatarItems(force),
        fetchBodyPaints(force),
        fetchItemTags(force),
      ]);
      setItems(itemList);
      setBodyPaints(bodyPaintList);
      setTags(tagMap);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    setSavedSkins(loadSavedSkins());
    if (apiKey) void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAll]);

  /* --------------------- render ufficiale (debounce) --------------------- */

  const missingRequired = REQUIRED_SLOT_KEYS.filter((key) => !slots[key]);

  useEffect(() => {
    if (!apiKey || loadingData) return;
    if (missingRequired.length > 0) return;
    if (renderTimer.current) clearTimeout(renderTimer.current);
    renderTimer.current = setTimeout(async () => {
      setRendering(true);
      setRenderError(null);
      try {
        const result = await createSharedAvatar(slots);
        setShared(result);
      } catch (err) {
        setRenderError(err instanceof Error ? err.message : "Errore di render");
      } finally {
        setRendering(false);
      }
    }, 1200);
    return () => {
      if (renderTimer.current) clearTimeout(renderTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, apiKey, loadingData]);

  /* ------------------------------ azioni --------------------------------- */

  const equipItem = (item: WovAvatarItem) => {
    const slotDef = WOV_SLOTS.find((s) => s.type === item.type);
    const key = slotDef?.key;
    if (!key) return;
    setSlots((prev) => ({ ...prev, [key]: item.id }));
  };

  const setSlot = (slotKey: string, item: WovAvatarItem) => {
    setSlots((prev) => ({ ...prev, [slotKey]: item.id }));
  };

  const clearSlot = (slotKey: string) => {
    setSlots((prev) => ({ ...prev, [slotKey]: null }));
  };

  const pickerItems = useMemo(() => {
    if (!pickerSlot) return [];
    const slotDef = WOV_SLOTS.find((s) => s.key === pickerSlot);
    if (!slotDef) return [];
    if (slotDef.type === "BODY_PAINT") {
      return bodyPaints.map(
        (bp) => ({ ...(bp as unknown as WovAvatarItem), type: "SHIRT" }) as WovAvatarItem,
      );
    }
    return items.filter((item) => item.type === slotDef.type);
  }, [pickerSlot, items, bodyPaints]);

  const pickerTitle = useMemo(() => {
    if (!pickerSlot) return "";
    const slotDef = WOV_SLOTS.find((s) => s.key === pickerSlot);
    return slotDef ? `Scegli: ${slotDef.label}` : "";
  }, [pickerSlot]);

  const saveSkin = () => {
    const name = skinName.trim() || `Skin ${savedSkins.length + 1}`;
    const skin: SavedSkin = {
      name,
      slots: { ...slots },
      sharedId: shared?.id,
      savedAt: Date.now(),
    };
    const next = [skin, ...savedSkins].slice(0, 30);
    setSavedSkins(next);
    persistSavedSkins(next);
    setSkinName("");
  };

  const deleteSkin = (index: number) => {
    const next = savedSkins.filter((_, i) => i !== index);
    setSavedSkins(next);
    persistSavedSkins(next);
  };

  /* ------------------------------ filtri --------------------------------- */

  const catalogItems = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return items
      .filter((item) => item.type === catalogType)
      .filter((item) => (catalogRarity ? item.rarity === catalogRarity : true))
      .filter((item) => {
        if (!q) return true;
        const inTags = (tags[item.id] ?? []).some((tag) =>
          tag.toLowerCase().includes(q),
        );
        return (
          (item.title ?? "").toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          inTags
        );
      });
  }, [items, catalogType, catalogSearch, catalogRarity, tags]);

  /* ------------------------------ render UI ------------------------------ */

  return (
    <div className="min-h-screen bg-stone-950 font-serif text-stone-100">
      {/* Navbar */}
      <nav className="border-b border-violet-900/50 bg-stone-950/80 p-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-violet-400 transition-colors hover:text-violet-300"
          >
            <ArrowLeft size={20} />
            <span>Torna all&apos;Hub</span>
          </Link>
          <div className="flex items-center gap-2 text-xl font-bold tracking-widest text-violet-400">
            <PawPrint size={24} />
            <span>WOV STUDIO</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void loadAll(true)}
              disabled={!apiKey || loadingData}
              className="text-stone-400 hover:text-violet-300"
            >
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl p-4 sm:p-8">
        <header className="mb-8 text-center">
          <h1 className="mb-2 font-serif text-4xl font-black uppercase tracking-widest text-violet-400 drop-shadow-[0_0_15px_rgba(139,92,246,0.4)] sm:text-5xl">
            Wolvesville Studio
          </h1>
          <p className="text-stone-400 italic">
            Catalogo completo degli oggetti e creatore di skin, con il motore
            grafico ufficiale del gioco.
          </p>
        </header>

        {/* Setup API key */}
        {!apiKey ? (
          <Card className="mx-auto mb-8 max-w-2xl border-violet-500/30 bg-stone-900">
            <CardContent className="p-6 text-center">
              <Moon className="mx-auto mb-4 text-violet-400" size={40} />
              <h2 className="mb-2 text-xl font-bold text-violet-300">
                API key non configurata
              </h2>
              <p className="mx-auto mb-4 max-w-md text-sm text-stone-400">
                Il sito usa la Wolvesville Public API con la chiave del
                proprietario, iniettata automaticamente alla build dai GitHub
                Secrets.
              </p>
              <ol className="mx-auto max-w-md space-y-1 text-left text-sm text-stone-400">
                <li>1. Apri il repository GitHub → <b>Settings</b></li>
                <li>2. <b>Secrets and variables</b> → Actions → <b>New repository secret</b></li>
                <li>
                  3. Nome: <code className="text-violet-300">WOLVESVILLE_API_KEY</code>,
                  valore: la tua API key
                </li>
                <li>4. Fai ripartire il deploy (push o re-run dell&apos;action)</li>
              </ol>
              <p className="mt-3 text-xs text-stone-500">
                Per provare in locale: crea un file .env.local con
                NEXT_PUBLIC_WOV_API_KEY=la-tua-chiave e rifai la build.
              </p>
            </CardContent>
          </Card>
        ) : dataError ? (
          <Card className="mx-auto mb-8 max-w-2xl border-red-500/40 bg-stone-900">
            <CardContent className="p-6 text-center">
              <p className="mb-4 text-sm text-red-400">{dataError}</p>
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => void loadAll(true)}
                  className="border-stone-700 text-stone-300"
                >
                  <RefreshCw size={14} className="mr-1" /> Riprova
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="creator">
            <TabsList className="mx-auto mb-6 flex bg-stone-900">
              <TabsTrigger value="creator" className="data-[state=active]:text-violet-300">
                <Layers size={14} className="mr-1" /> Crea Skin
              </TabsTrigger>
              <TabsTrigger value="catalog" className="data-[state=active]:text-violet-300">
                <Search size={14} className="mr-1" /> Catalogo
              </TabsTrigger>
              {savedSkins.length > 0 && (
                <TabsTrigger value="saved" className="data-[state=active]:text-violet-300">
                  <Save size={14} className="mr-1" /> Salvate ({savedSkins.length})
                </TabsTrigger>
              )}
            </TabsList>

            {/* ------------------------- CREA SKIN ------------------------- */}
            <TabsContent value="creator">
              <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
                {/* Preview */}
                <div className="space-y-4">
                  <Card className="border-violet-500/30 bg-stone-900">
                    <CardContent className="p-4">
                      <h3 className="mb-3 text-center text-sm font-bold uppercase tracking-widest text-violet-300">
                        Render ufficiale
                      </h3>
                      <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-stone-800 bg-stone-950 p-2">
                        {rendering ? (
                          <Loader2 className="animate-spin text-violet-400" size={32} />
                        ) : shared ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={shared.avatar.url}
                            alt="Skin renderizzata"
                            className="max-h-[300px] object-contain"
                          />
                        ) : missingRequired.length > 0 ? (
                          <p className="px-4 text-center text-xs text-stone-500">
                            Scegli almeno{" "}
                            <b className="text-stone-300">
                              {missingRequired
                                .map((k) => WOV_SLOTS.find((s) => s.key === k)?.label)
                                .filter(Boolean)
                                .join(", ")}
                            </b>{" "}
                            per vedere l&apos;anteprima ufficiale.
                          </p>
                        ) : (
                          <p className="text-center text-xs text-stone-500">
                            Render in arrivo...
                          </p>
                        )}
                      </div>
                      {renderError && (
                        <p className="mt-2 text-center text-xs text-red-400">{renderError}</p>
                      )}
                      {shared && (
                        <div className="mt-3 flex items-center justify-center gap-2">
                          <a href={shared.avatar.url} target="_blank" rel="noreferrer">
                            <Button
                              size="sm"
                              className="bg-violet-600 hover:bg-violet-500"
                            >
                              <Download size={14} className="mr-1" /> PNG
                            </Button>
                          </a>
                          <Badge variant="outline" className="border-stone-700 text-[10px] text-stone-400">
                            ID: {shared.id.slice(0, 8)}…
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <GameAvatarPreview slots={slots} itemMap={itemMap} bodyPaints={bodyPaints} />

                  {/* Salva skin */}
                  <div className="flex gap-2">
                    <Input
                      value={skinName}
                      onChange={(e) => setSkinName(e.target.value)}
                      placeholder="Nome della skin..."
                      className="border-stone-700 bg-stone-900 text-stone-200 placeholder:text-stone-600"
                    />
                    <Button
                      onClick={saveSkin}
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-500"
                    >
                      <Save size={14} />
                    </Button>
                  </div>
                </div>

                {/* Slot */}
                <div>
                  <ScrollArea className="h-[70vh] rounded-lg border border-stone-800 bg-stone-900/40 p-3">
                    <div className="grid gap-2 pr-2 sm:grid-cols-2">
                      {WOV_SLOTS.map((slot) => {
                        const itemId = slots[slot.key];
                        const item = itemId ? itemMap[itemId] : null;
                        const required = REQUIRED_SLOT_KEYS.includes(slot.key);
                        return (
                          <div
                            key={slot.key}
                            className={`flex items-center gap-2 rounded-lg border p-2 ${
                              item
                                ? "border-violet-500/40 bg-stone-900"
                                : required
                                  ? "border-red-500/30 bg-stone-900/60"
                                  : "border-stone-800 bg-stone-900/60"
                            }`}
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-stone-800 bg-stone-950">
                              {item ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={storeIconUrl(item.imageUrl)}
                                  alt={item.title ?? item.id}
                                  className="max-h-8 max-w-8 object-contain"
                                />
                              ) : (
                                <span className="text-[10px] text-stone-600">?</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs text-stone-400">
                                {slot.label}
                                {required && <span className="ml-1 text-red-400">*</span>}
                              </p>
                              <p className="truncate text-sm text-stone-200">
                                {item ? item.title ?? item.id : "vuoto"}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPickerSlot(slot.key)}
                              className="border-violet-500/40 px-2 text-violet-300 hover:bg-violet-500/10"
                            >
                              Scegli
                            </Button>
                            {item && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => clearSlot(slot.key)}
                                className="px-1.5 text-stone-500 hover:text-red-400"
                              >
                                <X size={12} />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-3 pr-2 text-[10px] leading-relaxed text-stone-600">
                      * richiesti dal gioco per generare la skin. Gli slot
                      &quot;2° layer&quot; sono disponibili in-game solo per i
                      membri Moonlight.
                    </p>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            {/* -------------------------- CATALOGO -------------------------- */}
            <TabsContent value="catalog">
              <div className="mb-4 flex flex-wrap justify-center gap-1.5">
                {TYPE_ORDER.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCatalogType(type)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      catalogType === type
                        ? "border-violet-500 bg-violet-500/20 text-violet-200"
                        : "border-stone-700 text-stone-400 hover:border-stone-500"
                    }`}
                  >
                    {TYPE_LABELS[type]}
                  </button>
                ))}
              </div>

              <div className="mb-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <div className="relative w-full sm:w-72">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500"
                  />
                  <Input
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Cerca per nome, ID o colore..."
                    className="border-stone-700 bg-stone-900 pl-8 text-stone-200 placeholder:text-stone-600"
                  />
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCatalogRarity(null)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${
                      catalogRarity === null
                        ? "border-violet-500 bg-violet-500/20 text-violet-200"
                        : "border-stone-700 text-stone-400"
                    }`}
                  >
                    Tutte le rarità
                  </button>
                  {RARITY_ORDER.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() =>
                        setCatalogRarity(catalogRarity === r ? null : r)
                      }
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${
                        catalogRarity === r
                          ? "border-violet-500 bg-violet-500/20 text-violet-200"
                          : "border-stone-700 text-stone-400 hover:border-stone-500"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${RARITY_META[r].dot}`} />
                      {RARITY_META[r].label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mb-3 text-center text-xs text-stone-500">
                {loadingData
                  ? "Caricamento catalogo..."
                  : `${catalogItems.length} oggetti in ${TYPE_LABELS[catalogType].toLowerCase()}`}
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {catalogItems.map((item) => (
                  <Card
                    key={item.id}
                    className={`group border bg-stone-900 p-2 transition-all hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] ${RARITY_META[item.rarity].border}`}
                  >
                    <CardContent className="flex flex-col items-center p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={storeIconUrl(item.imageUrl)}
                        alt={item.title ?? item.id}
                        className="h-16 w-full object-contain"
                        loading="lazy"
                      />
                      <p className="mt-1 line-clamp-2 min-h-[2em] text-center text-[11px] text-stone-300">
                        {item.title ?? item.id}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                        <span
                          className={`flex items-center gap-1 text-[9px] uppercase ${RARITY_META[item.rarity].text}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${RARITY_META[item.rarity].dot}`} />
                          {RARITY_META[item.rarity].label}
                        </span>
                        {eventLabel(item.event) && (
                          <span className="text-[9px] text-stone-500">
                            · {eventLabel(item.event)}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => equipItem(item)}
                        className="mt-2 h-6 w-full bg-violet-600/80 px-1 text-[10px] hover:bg-violet-500"
                      >
                        Usa nella skin
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* -------------------------- SALVATE --------------------------- */}
            <TabsContent value="saved">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {savedSkins.map((skin, index) => (
                  <Card key={skin.savedAt} className="border-violet-500/30 bg-stone-900">
                    <CardContent className="flex items-center gap-3 p-3">
                      <p className="flex-1 truncate text-sm text-stone-200">{skin.name}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSlots({ ...skin.slots });
                          setShared(null);
                        }}
                        className="border-violet-500/40 text-violet-300 hover:bg-violet-500/10"
                      >
                        Carica
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteSkin(index)}
                        className="px-2 text-stone-500 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Picker */}
      <ItemPickerDialog
        open={pickerSlot !== null}
        onOpenChange={(open) => !open && setPickerSlot(null)}
        title={pickerTitle}
        items={pickerItems}
        loading={loadingData}
        onSelect={(item) => pickerSlot && setSlot(pickerSlot, item)}
      />

    </div>
  );
}

/* ------------- anteprima con il motore ufficiale del gioco ---------------- */

function WovLayer({ spec, gravestone }: { spec: WovLayerSpec; gravestone?: boolean }) {
  const [widthPct, setWidthPct] = useState<number | null>(null);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={spec.url}
      alt=""
      draggable={false}
      onLoad={(e) => setWidthPct(layerWidthPercent(e.currentTarget.naturalWidth, gravestone))}
      style={{
        position: "absolute",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: widthPct !== null ? `${widthPct}%` : "8%",
        height: "auto",
        zIndex: spec.z,
        opacity: widthPct !== null ? 1 : 0,
        pointerEvents: "none",
      }}
    />
  );
}

function GameAvatarPreview({
  slots,
  itemMap,
  bodyPaints,
}: {
  slots: WovAvatarSlots;
  itemMap: ItemMap;
  bodyPaints: WovBodyPaint[];
}) {
  const layers = useMemo(
    () =>
      buildAvatarLayers(
        slots,
        (id) => (id ? itemMap[id]?.imageUrl : undefined),
        (id) => (id ? bodyPaints.find((b) => b.id === id)?.imageUrl : undefined),
      ),
    [slots, itemMap, bodyPaints],
  );
  const grave = slots.gravestoneId ? itemMap[slots.gravestoneId] : null;

  return (
    <Card className="border-violet-500/30 bg-stone-900">
      <CardContent className="p-4">
        <h3 className="mb-3 text-center text-sm font-bold uppercase tracking-widest text-violet-300">
          Anteprima live · motore del gioco
        </h3>
        <div className="flex items-end justify-center gap-4">
          <div
            className="relative w-[210px] rounded-lg border border-stone-800 bg-stone-950/70"
            style={{ aspectRatio: AVATAR_BOX_RATIO }}
          >
            {layers.length === 0 ? (
              <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-stone-600">
                Equipaggia un oggetto per vedere l&apos;umano
              </p>
            ) : (
              layers.map((l) => <WovLayer key={l.key} spec={l} />)
            )}
          </div>
          {grave && (
            <div
              className="relative w-[96px] rounded-lg border border-stone-800 bg-stone-950/70"
              style={{ aspectRatio: "372 / 500" }}
            >
              <WovLayer
                spec={{ key: "grave", url: itemLayerUrl(grave.imageUrl), z: 1 }}
                gravestone
              />
            </div>
          )}
        </div>
        <p className="mt-2 text-center text-[10px] text-stone-600">
          Posizionamento identico al gioco: ancorato al fondo, centrato,
          scala 186 (ricostruito dal client ufficiale).
        </p>
      </CardContent>
    </Card>
  );
}
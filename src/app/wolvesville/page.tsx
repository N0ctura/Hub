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
  Settings,
  PawPrint,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
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

interface CreatorCategory {
  key: string;
  label: string;
  icon: string;
  iconUrl: string;
  slotKey: string;
  type?: WovItemType;
  isBodyPaint?: boolean;
  second?: boolean;
}

/* Categorie nell'ordine del gioco, con i doppioni Moonlight.
   Le icone sono quelle ufficiali dell'inventario di Wolvesville. */
const CREATOR_CATEGORIES: CreatorCategory[] = [
  { key: "grave", label: "Lapide", icon: "🪦", iconUrl: "inventory_tab_gravestones.png", slotKey: "gravestoneId", type: "GRAVESTONE" },
  { key: "hat", label: "Cappello", icon: "🎩", iconUrl: "inventory_tab_hats.png", slotKey: "hatId", type: "HAT" },
  { key: "hat2", label: "Cappello", icon: "🎩", iconUrl: "inventory_tab_hats_2.png", slotKey: "hatId2", type: "HAT", second: true },
  { key: "hair", label: "Capelli", icon: "💇", iconUrl: "inventory_tab_hair.png", slotKey: "hairId", type: "HAIR" },
  { key: "hair2", label: "Capelli", icon: "💇", iconUrl: "inventory_tab_hair.png", slotKey: "hairId2", type: "HAIR", second: true },
  { key: "eyes", label: "Occhi", icon: "👁️", iconUrl: "inventory_tab_eyes.png", slotKey: "eyesId", type: "EYES" },
  { key: "eyes2", label: "Occhi", icon: "👁️", iconUrl: "inventory_tab_eyes.png", slotKey: "eyesId2", type: "EYES", second: true },
  { key: "glasses", label: "Occhiali", icon: "👓", iconUrl: "inventory_tab_glasses.png", slotKey: "glassesId", type: "GLASSES" },
  { key: "glasses2", label: "Occhiali", icon: "👓", iconUrl: "inventory_tab_glasses_2.png", slotKey: "glassesId2", type: "GLASSES", second: true },
  { key: "shirt", label: "Maglia", icon: "👕", iconUrl: "inventory_tab_clothes.png", slotKey: "shirtId", type: "SHIRT" },
  { key: "shirt2", label: "Maglia", icon: "👕", iconUrl: "inventory_tab_clothes.png", slotKey: "shirtId2", type: "SHIRT", second: true },
  { key: "mouth", label: "Bocca", icon: "👄", iconUrl: "inventory_tab_mouth.png", slotKey: "mouthId", type: "MOUTH" },
  { key: "mouth2", label: "Bocca", icon: "👄", iconUrl: "inventory_tab_mouth.png", slotKey: "mouthId2", type: "MOUTH", second: true },
  { key: "mask", label: "Maschera", icon: "🎭", iconUrl: "inventory_tab_mask.png", slotKey: "maskId", type: "MASK" },
  { key: "mask2", label: "Maschera", icon: "🎭", iconUrl: "inventory_tab_mask_2.png", slotKey: "maskId2", type: "MASK", second: true },
  { key: "back", label: "Dietro", icon: "🎒", iconUrl: "inventory_tab_avatar_background.png", slotKey: "backId", type: "BACK" },
  { key: "back2", label: "Dietro", icon: "🎒", iconUrl: "inventory_tab_avatar_background_2.png", slotKey: "backId2", type: "BACK", second: true },
  { key: "front", label: "Davanti", icon: "🎁", iconUrl: "inventory_tab_avatar_foreground.png", slotKey: "frontId", type: "FRONT" },
  { key: "front2", label: "Davanti", icon: "🎁", iconUrl: "inventory_tab_avatar_foreground_2.png", slotKey: "frontId2", type: "FRONT", second: true },
  { key: "badge", label: "Badge", icon: "🏅", iconUrl: "inventory_tab_badge.png", slotKey: "badgeId", type: "BADGE" },
  { key: "badge2", label: "Badge", icon: "🏅", iconUrl: "inventory_tab_badge.png", slotKey: "badgeId2", type: "BADGE", second: true },
  { key: "paint", label: "Body Paint", icon: "🖌️", iconUrl: "inventory_tab_body_paints.png", slotKey: "bodyPaintId", isBodyPaint: true },
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moonlight, setMoonlight] = useState(true);
  const [exporting, setExporting] = useState<0 | 1 | 2 | 3>(0);

  /* ------------------------------- catalogo ------------------------------ */
  const [catalogType, setCatalogType] = useState<WovItemType>("SHIRT");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogRarity, setCatalogRarity] = useState<string | null>(null);

  /* --------------------------- skin salvate ------------------------------ */
  const [savedSkins, setSavedSkins] = useState<SavedSkin[]>([]);
  const [skinName, setSkinName] = useState("");

  /* -------------------------- editor stile gioco ------------------------- */
  const [creatorCat, setCreatorCat] = useState("hat");
  const [creatorSearch, setCreatorSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(150);

  const itemMap = useMemo<ItemMap>(() => {
    const map: ItemMap = {};
    for (const item of items) map[item.id] = item;
    for (const bp of bodyPaints) {
      map[bp.id] = { ...(bp as unknown as WovAvatarItem), type: "SHIRT" };
    }
    return map;
  }, [items, bodyPaints]);

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
      // Il body paint è obbligatorio (senza, l'umano non esiste):
      // se nessuno è selezionato, applichiamo il default (skin-1).
      setSlots((prev) => {
        if (prev.bodyPaintId) return prev;
        const def =
          bodyPaintList.find((b) => b.imageUrl.includes("skin-1")) ??
          bodyPaintList[0];
        return def ? { ...prev, bodyPaintId: def.id } : prev;
      });
    } catch (err) {
      setDataError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    setSavedSkins(loadSavedSkins());
    setMoonlight(window.localStorage.getItem("wov_moonlight") !== "off");
    if (apiKey) void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAll]);

  /* ---------------------------- impostazioni ------------------------------ */

  const toggleMoonlight = (on: boolean) => {
    setMoonlight(on);
    try {
      window.localStorage.setItem("wov_moonlight", on ? "on" : "off");
    } catch {
      /* ignore */
    }
    if (!on) {
      // svuota tutti gli slot doppi (2° layer)
      setSlots((prev) => {
        const next: WovAvatarSlots = { ...prev };
        for (const k of Object.keys(next)) {
          if (k.endsWith("2")) next[k] = null;
        }
        return next;
      });
    }
  };

  /* ------------------------------ azioni --------------------------------- */

  const equipItem = (item: WovAvatarItem) => {
    const slotDef = WOV_SLOTS.find((s) => s.type === item.type);
    const key = slotDef?.key;
    if (!key) return;
    setSlots((prev) => ({ ...prev, [key]: item.id }));
  };

  const clearSlot = (slotKey: string) => {
    setSlots((prev) => ({ ...prev, [slotKey]: null }));
  };

  /* ------------------------- download della skin -------------------------- */

  // Il CDN di Wolvesville non manda header CORS: per comporre la skin nel
  // canvas (e poterla scaricare, anche su iPhone) le immagini per l'export
  // passano da un proxy che espone CORS. In caso di errore usiamo il render
  // ufficiale dell'API come ultima spiaggia.
  const loadExportImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => {
        const proxied = new Image();
        proxied.crossOrigin = "anonymous";
        proxied.onload = () => resolve(proxied);
        proxied.onerror = () => reject(new Error("Immagine non caricabile"));
        proxied.src = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png`;
      };
      img.src = url;
    });

  const downloadSkin = async (scale: 1 | 2 | 3) => {
    setExporting(scale);
    try {
      const layers = buildAvatarLayers(
        slots,
        (id) => (id ? itemMap[id]?.imageUrl : undefined),
        (id) => (id ? bodyPaints.find((b) => b.id === id)?.imageUrl : undefined),
        scale === 3 ? 3 : 2,
      );
      if (layers.length === 0) throw new Error("Nessun oggetto equipaggiato");
      const canvas = document.createElement("canvas");
      canvas.width = 372 * scale;
      canvas.height = 900 * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas non disponibile");
      const density = scale === 3 ? 3 : 2;
      for (const layer of layers) {
        const img = await loadExportImage(layer.url);
        const drawnW = (img.naturalWidth / density) * scale;
        const drawnH = drawnW * (img.naturalHeight / img.naturalWidth);
        ctx.drawImage(
          img,
          (canvas.width - drawnW) / 2,
          canvas.height - drawnH,
          drawnW,
          drawnH,
        );
      }
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("Export non riuscito");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${skinName.trim() || "wov-skin"}-${scale}x.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch {
      // Fallback: render ufficiale dell'API (server-side, zero problemi CORS)
      try {
        const shared = await createSharedAvatar(slots);
        window.open(shared.avatar.url.replace(".png", "@3x.png"), "_blank");
      } catch {
        alert("Download non riuscito: equipaggia almeno un oggetto e riprova.");
      }
    } finally {
      setExporting(0);
    }
  };

  const saveSkin = () => {
    const name = skinName.trim() || `Skin ${savedSkins.length + 1}`;
    const skin: SavedSkin = {
      name,
      slots: { ...slots },
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

  /* --------------------- griglia categoria (stile gioco) ------------------ */

  const activeCategory =
    CREATOR_CATEGORIES.find((c) => c.key === creatorCat) ?? CREATOR_CATEGORIES[1];

  const categoryItems = useMemo(() => {
    const q = creatorSearch.trim().toLowerCase();
    const base: (WovAvatarItem | WovBodyPaint)[] = activeCategory.isBodyPaint
      ? bodyPaints
      : items.filter((i) => i.type === activeCategory.type);
    if (!q) return base;
    return base.filter(
      (i) =>
        (i.title ?? "").toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q),
    );
  }, [activeCategory, items, bodyPaints, creatorSearch]);

  const visibleItems = categoryItems.slice(0, visibleCount);

  const toggleEquip = (cat: CreatorCategory, id: string) => {
    setSlots((prev) => ({
      ...prev,
      [cat.slotKey]: prev[cat.slotKey] === id ? null : id,
    }));
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
              onClick={() => setSettingsOpen(true)}
              className="text-stone-400 hover:text-violet-300"
            >
              <Settings size={16} />
              <span className="ml-1.5 hidden text-xs sm:inline">Impostazioni</span>
            </Button>
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
              <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
                {/* Preview */}
                <div className="space-y-4">
                  <GameAvatarPreview slots={slots} itemMap={itemMap} bodyPaints={bodyPaints} />

                  <Card className="border-violet-500/30 bg-stone-900">
                    <CardContent className="p-4">
                      <h3 className="mb-3 text-center text-sm font-bold uppercase tracking-widest text-violet-300">
                        Scarica la skin
                      </h3>
                      <div className="flex items-center justify-center gap-2">
                        {([1, 2, 3] as const).map((q) => (
                          <Button
                            key={q}
                            size="sm"
                            disabled={exporting !== 0}
                            onClick={() => void downloadSkin(q)}
                            className="bg-violet-600 hover:bg-violet-500"
                          >
                            {exporting === q ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} className="mr-1" />
                            )}
                            {q}x
                          </Button>
                        ))}
                      </div>
                      <p className="mt-2 text-center text-[10px] text-stone-500">
                        1x piccola · 2x nitida · 3x qualità massima (@3x). PNG
                        con sfondo trasparente, compatibile anche con iPhone.
                      </p>
                    </CardContent>
                  </Card>

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

                {/* Editor stile Wolvesville */}
                <div>
                  <div className="mb-2 flex gap-1.5 overflow-x-auto pb-2">
                    {CREATOR_CATEGORIES.filter((c) => moonlight || !c.second).map((cat) => {
                      const activeCat = creatorCat === cat.key;
                      const filled = !!slots[cat.slotKey];
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => {
                            setCreatorCat(cat.key);
                            setCreatorSearch("");
                            setVisibleCount(150);
                          }}
                          className={`relative flex shrink-0 flex-col items-center rounded-lg border px-2.5 py-1.5 transition-colors ${
                            activeCat
                              ? "border-violet-500 bg-violet-500/20 text-violet-200"
                              : "border-stone-800 bg-stone-900/60 text-stone-400 hover:border-stone-600"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/wov-icons/${cat.iconUrl}`}
                            alt={cat.label}
                            draggable={false}
                            className="h-5 w-8 object-contain"
                          />
                          <span className="mt-1 whitespace-nowrap text-[10px]">{cat.label}</span>
                          {cat.second && (
                            <span className="absolute -right-1.5 -top-1.5 rounded-full bg-violet-600 px-1 text-[8px] font-bold text-white">
                              2°
                            </span>
                          )}
                          {filled && !activeCat && (
                            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-green-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative mb-3">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500"
                    />
                    <Input
                      value={creatorSearch}
                      onChange={(e) => {
                        setCreatorSearch(e.target.value);
                        setVisibleCount(150);
                      }}
                      placeholder={`Cerca in ${activeCategory.label}...`}
                      className="border-stone-700 bg-stone-900 pl-8 text-stone-200 placeholder:text-stone-600"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                    {!activeCategory.isBodyPaint && (
                      <button
                        type="button"
                        onClick={() => clearSlot(activeCategory.slotKey)}
                        className={`flex aspect-square items-center justify-center rounded-lg border-2 text-xs transition-colors ${
                          !slots[activeCategory.slotKey]
                            ? "border-green-500 bg-stone-900 text-stone-300"
                            : "border-stone-800 bg-stone-900/60 text-stone-500 hover:border-stone-600"
                        }`}
                      >
                        None
                      </button>
                    )}
                    {visibleItems.map((item) => {
                      const selected = slots[activeCategory.slotKey] === item.id;
                      const meta = RARITY_META[item.rarity];
                      const cost = item.costInGold
                        ? `🪙${item.costInGold}`
                        : item.costInRoses
                          ? `🌹${item.costInRoses}`
                          : item.costInGems
                            ? `💎${item.costInGems}`
                            : null;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleEquip(activeCategory, item.id)}
                          className={`relative flex aspect-square items-center justify-center rounded-lg border-2 bg-stone-900 p-1.5 transition-all ${
                            selected
                              ? "border-green-500 ring-2 ring-green-500/40"
                              : `${meta.border} hover:border-stone-400`
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={storeIconUrl(item.imageUrl)}
                            alt={item.id}
                            loading="lazy"
                            draggable={false}
                            className="h-full w-full object-contain"
                          />
                          {cost && (
                            <span className="absolute bottom-0.5 right-1 rounded bg-stone-950/80 px-1 text-[9px] text-yellow-300">
                              {cost}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {categoryItems.length > visibleItems.length && (
                    <div className="mt-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVisibleCount((v) => v + 240)}
                        className="border-stone-700 text-stone-300"
                      >
                        Mostra altri ({(categoryItems.length - visibleItems.length).toLocaleString("it-IT")} rimanenti)
                      </Button>
                    </div>
                  )}

                  <p className="mt-3 text-[10px] leading-relaxed text-stone-600">
                    * Maglia, Occhi e Lapide sono richiesti dal gioco per
                    generare la skin. Il body paint è sempre presente (viene
                    selezionato automaticamente: senza, l&apos;umano non
                    esiste). I &quot;2° layer&quot; sono disponibili in-game
                    solo per i membri Moonlight. Clicca di nuovo un oggetto
                    equipaggiato per rimuoverlo.
                  </p>
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

      {/* Impostazioni */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="border-violet-500/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-violet-300">Impostazioni</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-stone-800 bg-stone-900 p-3">
            <div>
              <p className="text-sm text-stone-200">Effetto Moonlight</p>
              <p className="mt-0.5 text-xs text-stone-500">
                Mostra le categorie con doppio layer (2°). Disattivandolo, gli
                slot 2° vengono svuotati.
              </p>
            </div>
            <Switch checked={moonlight} onCheckedChange={toggleMoonlight} />
          </div>
          <p className="text-[10px] text-stone-600">
            Altre impostazioni in arrivo (sfondi, versione mobile...).
          </p>
        </DialogContent>
      </Dialog>
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
            className="relative w-[210px] overflow-hidden rounded-lg border border-stone-800 bg-stone-950/70"
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
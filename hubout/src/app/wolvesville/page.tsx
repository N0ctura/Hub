"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Eye, EyeOff, Home, ImagePlus, Plus, Settings, Share2, Shuffle, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface Category {
  key: string;
  icon: string;
  second?: boolean;
}

/* Ordine e icone come nella barra dell'inventario ufficiale. */
const CATEGORIES: Category[] = [
  { key: "gravestone", icon: "inventory_tab_gravestones.png" },
  { key: "hat", icon: "inventory_tab_hats.png" },
  { key: "hat2", icon: "inventory_tab_hats_2.png", second: true },
  { key: "hair", icon: "inventory_tab_hair.png" },
  { key: "glasses", icon: "inventory_tab_glasses.png" },
  { key: "glasses2", icon: "inventory_tab_glasses_2.png", second: true },
  { key: "clothes", icon: "inventory_tab_clothes.png" },
  { key: "eyes", icon: "inventory_tab_eyes.png" },
  { key: "mouth", icon: "inventory_tab_mouth.png" },
  { key: "mask", icon: "inventory_tab_mask.png" },
  { key: "mask2", icon: "inventory_tab_mask_2.png", second: true },
  { key: "back", icon: "inventory_tab_avatar_background.png" },
  { key: "back2", icon: "inventory_tab_avatar_background_2.png", second: true },
  { key: "front", icon: "inventory_tab_avatar_foreground.png" },
  { key: "front2", icon: "inventory_tab_avatar_foreground_2.png", second: true },
  { key: "legs", icon: "inventory_tab_legs.png" },
  { key: "paint", icon: "inventory_tab_body_paints.png" },
  { key: "badge", icon: "inventory_tab_badge.png" },
];

const PLACEHOLDER_TILES = 44;

function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
  }, [key]);
  const update = (v: T) => {
    setValue(v);
    try {
      window.localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  };
  return [value, update] as const;
}

function WolvesvillePage() {
  const [tab, setTab] = useState<"avatar" | "items">("avatar");
  const [cat, setCat] = useState("hat");
  const [hideUi, setHideUi] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moonlight, setMoonlight] = usePersisted("wov_moonlight_v2", true);
  const [avatars, setAvatars] = usePersisted<number[]>("wov_avatars", [0]);
  const [activeAvatar, setActiveAvatar] = usePersisted("wov_active_avatar", 0);
  const [backgrounds, setBackgrounds] = usePersisted<Record<string, string>>("wov_backgrounds", {});
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const visibleCats = CATEGORIES.filter((c) => moonlight || !c.second);
  const activeBg = backgrounds[String(activeAvatar)];

  const pickBackground = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setBackgrounds({ ...backgrounds, [String(activeAvatar)]: String(reader.result) });
      toast.success("Sfondo aggiornato");
    };
    reader.readAsDataURL(file);
  };

  const downloadPng = async (scale: 1 | 2 | 3) => {
    const node = previewRef.current;
    if (!node) return;
    const w = 380 * scale;
    const h = 343 * scale;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const svg = node.querySelector("svg");
    const img = node.querySelector("img[data-bg]");
    const load = (src: string) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = src;
      });
    try {
      let source: string;
      if (img) {
        source = (img as HTMLImageElement).src;
      } else if (svg) {
        source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
      } else {
        return;
      }
      const image = await load(source);
      ctx.drawImage(image, 0, 0, w, h);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `wov-avatar-${scale}x.png`;
      a.click();
      toast.success(`Immagine ${scale}x scaricata`);
    } catch {
      toast.error("Download non riuscito");
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
        {/* ------------------------- colonna sinistra ------------------------- */}
        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[380px]">
          {/* Anteprima */}
          <div ref={previewRef} className="relative aspect-[380/343] w-full overflow-hidden rounded-md bg-[var(--wov-sky)]">
            {activeBg ? (
              <img data-bg src={activeBg} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <NightScene />
            )}
            {!hideUi && (
              <div className="absolute left-0 top-0 z-20 flex items-center gap-1 rounded-br-md bg-[var(--wov-toolbar)] px-2 py-1.5">
                <ToolbarButton label="Torna all'Hub" asLink />
                <ToolbarButton label="Nascondi" onClick={() => setHideUi(true)}>
                  <Eye size={22} />
                </ToolbarButton>
                <ToolbarButton label="Condividi" onClick={share}>
                  <Share2 size={20} />
                </ToolbarButton>
                <ToolbarButton label="Impostazioni" onClick={() => setSettingsOpen((v) => !v)}>
                  <Settings size={22} />
                </ToolbarButton>
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
              <div className="absolute left-2 top-12 z-30 w-[240px] rounded-md border border-[var(--wov-panel-2)] bg-[var(--wov-panel)] p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">Impostazioni</span>
                  <button aria-label="Chiudi" onClick={() => setSettingsOpen(false)} className="text-[var(--wov-muted)]">
                    <X size={16} />
                  </button>
                </div>
                <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                  <span>Moonlight (2° layer)</span>
                  <input
                    type="checkbox"
                    checked={moonlight}
                    onChange={(e) => setMoonlight(e.target.checked)}
                    className="h-4 w-4 accent-[var(--wov-accent)]"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Download + sfondo */}
          <div className="rounded-md bg-[var(--wov-panel)] p-2">
            <div className="flex items-center justify-center gap-2">
              {([1, 2, 3] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => void downloadPng(s)}
                  className="flex items-center gap-1 rounded-md bg-[var(--wov-tile)] px-3 py-1.5 text-xs font-bold text-[var(--wov-text)] hover:brightness-125"
                >
                  <Download size={14} />
                  {s}x
                </button>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 rounded-md bg-[var(--wov-tile)] px-3 py-1.5 text-xs font-bold text-[var(--wov-text)] hover:brightness-125"
                aria-label="Carica sfondo"
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
              1x piccola · 2x nitida · 3x qualità massima (@3x). PNG dello sfondo dell'avatar.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickBackground(f);
                e.target.value = "";
              }}
            />
          </div>

          {/* Avatars */}
          <div className="relative flex min-h-[200px] flex-col rounded-md bg-[var(--wov-panel)] lg:flex-1 lg:min-h-0">
            <p className="pt-2 text-center text-xs font-bold">Avatars</p>
            <button
              aria-label="Avatar casuale"
              className="absolute right-0 top-0 rounded-bl-md bg-[var(--wov-toolbar)] p-1.5"
              onClick={() => setActiveAvatar(avatars[Math.floor(Math.random() * avatars.length)] ?? 0)}
            >
              <Shuffle size={14} />
            </button>
            <div className="wov-scroll grid flex-1 grid-cols-3 content-start gap-x-6 gap-y-3 overflow-y-auto px-6 py-3 lg:px-8">
              {avatars.map((id) => (
                <button
                  key={id}
                  onClick={() => setActiveAvatar(id)}
                  className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-[var(--wov-sky)] ${
                    activeAvatar === id ? "border-[var(--wov-selected)]" : "border-[var(--wov-tile-border)]"
                  }`}
                >
                  {backgrounds[String(id)] ? (
                    <img src={backgrounds[String(id)]} alt="" className="absolute inset-0 h-full w-full object-cover" />
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

        {/* -------------------------- pannello destro ------------------------- */}
        <div className="flex min-h-[70vh] min-w-0 flex-1 flex-col overflow-hidden rounded-md bg-[var(--wov-panel)] lg:min-h-0">
          <div className="grid grid-cols-2">
            {(["avatar", "items"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-2.5 text-[11px] font-bold uppercase tracking-wide ${
                  tab === t ? "text-[var(--wov-text)]" : "text-[var(--wov-muted)]"
                }`}
              >
                {t === "avatar" ? "Avatar" : "Items"}
              </button>
            ))}
          </div>

          {tab === "avatar" ? (
            <>
              <div className="wov-scroll flex shrink-0 items-center justify-between gap-1 overflow-x-auto bg-[var(--wov-panel-2)] px-2 py-1">
                {visibleCats.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setCat(c.key)}
                    aria-label={c.key}
                    className="flex h-8 min-w-8 flex-1 items-center justify-center"
                  >
                    <img
                      src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/wov-icons/${c.icon}`}
                      alt=""
                      className={`h-5 w-auto max-w-7 object-contain transition ${
                        cat === c.key ? "opacity-100 brightness-150" : "opacity-40"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="wov-scroll flex-1 overflow-y-auto p-1">
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-7 xl:grid-cols-9">
                  <Tile>
                    <span className="text-sm text-[var(--wov-muted)]">None</span>
                  </Tile>
                  {Array.from({ length: PLACEHOLDER_TILES }).map((_, i) => (
                    <Tile key={i} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="wov-scroll flex-1 overflow-y-auto p-1">
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-7 xl:grid-cols-9">
                {Array.from({ length: 27 }).map((_, i) => (
                  <Tile key={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex aspect-[86/68] items-center justify-center rounded-lg border-2 border-[var(--wov-tile-border)] bg-[var(--wov-tile)]">
      {children}
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
  children?: React.ReactNode;
  asLink?: boolean;
}) {
  const cls = "flex h-9 w-9 items-center justify-center text-[var(--wov-text)] hover:opacity-80";
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

/* Paesaggio notturno con alberi, scogliera e villaggio. */
function NightScene({ mini }: { mini?: boolean }) {
  return (
    <svg viewBox="0 0 380 343" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
      <rect width="380" height="343" fill="var(--wov-sky)" />
      {!mini &&
        [
          [140, 12], [210, 30], [300, 18], [350, 60], [260, 70], [120, 50],
        ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1" fill="#cfd8e6" opacity="0.7" />)}
      {/* alberi */}
      <g fill="#14161f">
        {[10, 32, 55, 78].map((x, i) => (
          <polygon key={i} points={`${x},${120 - i * 6} ${x - 16},${175} ${x + 16},${175}`} />
        ))}
      </g>
      {/* scogliera */}
      <path d="M0 150 L120 140 L160 155 L200 150 L240 180 L240 343 L0 343 Z" fill="#191b26" />
      {/* villaggio */}
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
          [286, 245], [294, 262], [306, 262], [318, 275], [336, 230], [336, 250], [342, 270], [355, 262], [368, 262], [362, 285], [262, 285], [272, 295],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="4" height="6" />
        ))}
      </g>
      <g fill="#14161f">
        {[230, 250, 372].map((x, i) => (
          <polygon key={i} points={`${x},${260 - i * 4} ${x - 14},${320} ${x + 14},${320}`} />
        ))}
      </g>
      <rect y="315" width="380" height="28" fill="#14161f" />
    </svg>
  );
}

export default WolvesvillePage;

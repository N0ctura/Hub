"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ClipboardCopy, Download, RotateCcw, Upload, X } from "lucide-react";
import { toast } from "sonner";

import {
  DEFAULT_CALIBRATION,
  NEUTRAL,
  isDefaultAdjust,
  sanitizeCalibration,
  type Adjust,
  type AvatarCalibration,
} from "@/lib/avatar-calibration";
import type { WovLayerSpec } from "@/lib/wov-avatar";

export interface NaturalSize {
  w: number;
  h: number;
  density: number;
}

interface Props {
  calibration: AvatarCalibration;
  onChange: (next: AvatarCalibration) => void;
  onClose: () => void;
  layers: WovLayerSpec[];
  naturals: Record<string, NaturalSize>;
  /** id -> dati grezzi dell'item (titolo, evento, rarita'...) */
  describeItem: (id?: string) => Record<string, unknown> | undefined;
  showGuides: boolean;
  onShowGuides: (v: boolean) => void;
}

type Scope = "item" | "layer";

const STEPS = [0.1, 0.5, 1, 2];

function round(n: number, d = 3) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/* --------------------------- controlli base ------------------------------ */

function NumberSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = "",
  neutral,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
  neutral?: number;
}) {
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex items-center justify-between text-[11px]">
        <span className="text-[var(--wov-muted)]">{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={round(value)}
            step={step}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange(n);
            }}
            className="w-[68px] rounded border border-[var(--wov-tile-border)] bg-[var(--wov-tile)] px-1 py-0.5 text-right font-mono text-[11px] text-[var(--wov-text)]"
          />
          {suffix && <span className="w-3 text-[10px] text-[var(--wov-muted)]">{suffix}</span>}
          {neutral !== undefined && (
            <button
              type="button"
              title="Azzera"
              onClick={() => onChange(neutral)}
              className="rounded px-1 text-[10px] text-[var(--wov-muted)] hover:text-[var(--wov-text)]"
            >
              ⟲
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--wov-accent)]"
      />
    </div>
  );
}

function AdjustControls({
  value,
  onChange,
}: {
  value: Adjust;
  onChange: (v: Adjust) => void;
}) {
  return (
    <>
      <NumberSlider
        label="Scala"
        value={value.scale}
        min={0.5}
        max={1.5}
        step={0.005}
        neutral={1}
        onChange={(scale) => onChange({ ...value, scale })}
      />
      <NumberSlider
        label="Sposta X"
        value={value.dx}
        min={-30}
        max={30}
        step={0.1}
        suffix="%"
        neutral={0}
        onChange={(dx) => onChange({ ...value, dx })}
      />
      <NumberSlider
        label="Sposta Y (su = +7)"
        value={value.dy}
        min={-30}
        max={30}
        step={0.1}
        suffix="%"
        neutral={0}
        onChange={(dy) => onChange({ ...value, dy })}
      />
    </>
  );
}

function Section({
  title,
  children,
  hint,
}: {
  title: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <section className="mb-3 rounded-md bg-[var(--wov-panel-2)] p-2.5">
      <h3 className="text-[11px] font-bold uppercase tracking-wider">{title}</h3>
      {hint && <p className="mb-2 mt-0.5 text-[10px] text-[var(--wov-muted)]">{hint}</p>}
      {!hint && <div className="mb-2" />}
      {children}
    </section>
  );
}

/* ------------------------------- pannello -------------------------------- */

export function DevCalibrationPanel({
  calibration: cal,
  onChange,
  onClose,
  layers,
  naturals,
  describeItem,
  showGuides,
  onShowGuides,
}: Props) {
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [scope, setScope] = useState<Scope>("item");
  const [step, setStep] = useState(0.5);
  const [showRaw, setShowRaw] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  // Mantiene valida la selezione quando cambiano i layer indossati
  useEffect(() => {
    if (!layers.some((l) => l.key === selectedKey)) {
      setSelectedKey(layers.find((l) => l.kind === "item")?.key ?? layers[0]?.key ?? "");
    }
  }, [layers, selectedKey]);

  const selected = layers.find((l) => l.key === selectedKey);
  const selectedMeta = describeItem(selected?.itemId);
  const natural = selected ? naturals[selected.key] : undefined;

  // Un body paint non ha un "item" singolo: per lui vale solo lo scope slot
  const effectiveScope: Scope = selected && selected.itemId ? scope : "layer";

  const current: Adjust = useMemo(() => {
    if (!selected) return NEUTRAL;
    if (effectiveScope === "item" && selected.itemId) {
      return cal.overrides[selected.itemId] ?? NEUTRAL;
    }
    return cal.layers[selected.key] ?? NEUTRAL;
  }, [cal, selected, effectiveScope]);

  const setCurrent = (next: Adjust) => {
    if (!selected) return;
    const clean: Adjust = {
      scale: round(next.scale),
      dx: round(next.dx),
      dy: round(next.dy),
    };
    if (effectiveScope === "item" && selected.itemId) {
      const overrides = { ...cal.overrides };
      if (isDefaultAdjust(clean)) {
        delete overrides[selected.itemId];
      } else {
        overrides[selected.itemId] = {
          ...clean,
          title: typeof selectedMeta?.title === "string" ? selectedMeta.title : undefined,
          type: typeof selectedMeta?.type === "string" ? selectedMeta.type : undefined,
          event: typeof selectedMeta?.event === "string" ? selectedMeta.event : undefined,
          rarity: typeof selectedMeta?.rarity === "string" ? selectedMeta.rarity : undefined,
          natural: natural ? { ...natural } : undefined,
          raw: selectedMeta,
        };
      }
      onChange({ ...cal, overrides });
    } else {
      const layersMap = { ...cal.layers };
      if (isDefaultAdjust(clean)) delete layersMap[selected.key];
      else layersMap[selected.key] = clean;
      onChange({ ...cal, layers: layersMap });
    }
  };

  // Frecce da tastiera = micro-spostamenti (Shift = ×5). Non scatta mentre scrivi in un campo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) {
        if (!(t instanceof HTMLInputElement && t.type === "range")) return;
      }
      const k = e.key;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(k)) return;
      e.preventDefault();
      const m = e.shiftKey ? 5 : 1;
      const d = step * m;
      setCurrent({
        ...current,
        dx: current.dx + (k === "ArrowRight" ? d : k === "ArrowLeft" ? -d : 0),
        dy: current.dy + (k === "ArrowUp" ? d : k === "ArrowDown" ? -d : 0),
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------------------------- azioni file ----------------------------- */

  const exportJson = () => {
    const payload = {
      ...cal,
      _meta: {
        exportedAt: new Date().toISOString(),
        note: "Salva come src/data/avatar-calibration.default.json oppure mandalo a Claude.",
      },
    };
    return JSON.stringify(payload, null, 2);
  };

  const downloadJson = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "avatar-calibration.default.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    toast.success("JSON scaricato");
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportJson());
      toast.success("JSON copiato negli appunti");
    } catch {
      toast.error("Copia non riuscita: usa Scarica JSON");
    }
  };

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      onChange(sanitizeCalibration(parsed, DEFAULT_CALIBRATION));
      toast.success("Calibrazione importata");
    } catch {
      toast.error("File JSON non valido");
    }
  };

  const overrideEntries = Object.entries(cal.overrides);

  return (
    <aside className="fixed inset-y-0 right-0 z-[60] flex w-[340px] max-w-[92vw] flex-col border-l border-[var(--wov-panel-2)] bg-[var(--wov-panel)] text-[var(--wov-text)] shadow-2xl">
      <header className="flex shrink-0 items-center justify-between bg-[var(--wov-toolbar)] px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wider">Calibrazione DEV</span>
        <button aria-label="Chiudi" onClick={onClose} className="text-[var(--wov-muted)] hover:text-[var(--wov-text)]">
          <X size={18} />
        </button>
      </header>

      <div className="wov-scroll flex-1 overflow-y-auto p-2.5">
        <Section title="Guide">
          <label className="flex cursor-pointer items-center justify-between text-xs">
            <span>Mostra quadrato, centro e base</span>
            <input
              type="checkbox"
              checked={showGuides}
              onChange={(e) => onShowGuides(e.target.checked)}
              className="h-4 w-4 accent-[var(--wov-accent)]"
            />
          </label>
          <label className="mt-2 flex cursor-pointer items-center justify-between text-xs">
            <span>PNG: allarga la tela (niente tagli)</span>
            <input
              type="checkbox"
              checked={cal.exportFit}
              onChange={(e) => onChange({ ...cal, exportFit: e.target.checked })}
              className="h-4 w-4 accent-[var(--wov-accent)]"
            />
          </label>
        </Section>

        <Section
          title="Quadrato degli item"
          hint="Dimensione e forma del riquadro in cui vengono messi i layer."
        >
          <NumberSlider
            label="Larghezza nell'anteprima"
            value={cal.box.widthPct}
            min={20}
            max={120}
            step={0.5}
            suffix="%"
            neutral={DEFAULT_CALIBRATION.box.widthPct}
            onChange={(widthPct) => onChange({ ...cal, box: { ...cal.box, widthPct } })}
          />
          <div className="mb-2 flex items-center gap-2 text-[11px]">
            <span className="text-[var(--wov-muted)]">Forma L : A</span>
            <input
              type="number"
              value={cal.box.ratioW}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (n > 0) onChange({ ...cal, box: { ...cal.box, ratioW: n } });
              }}
              className="w-16 rounded border border-[var(--wov-tile-border)] bg-[var(--wov-tile)] px-1 py-0.5 text-right font-mono"
            />
            <span>:</span>
            <input
              type="number"
              value={cal.box.ratioH}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (n > 0) onChange({ ...cal, box: { ...cal.box, ratioH: n } });
              }}
              className="w-16 rounded border border-[var(--wov-tile-border)] bg-[var(--wov-tile)] px-1 py-0.5 text-right font-mono"
            />
          </div>
          <NumberSlider
            label="Posizione X"
            value={cal.box.offsetX}
            min={-40}
            max={40}
            step={0.5}
            suffix="%"
            neutral={0}
            onChange={(offsetX) => onChange({ ...cal, box: { ...cal.box, offsetX } })}
          />
          <NumberSlider
            label="Posizione Y (su = +)"
            value={cal.box.offsetY}
            min={-40}
            max={40}
            step={0.5}
            suffix="%"
            neutral={0}
            onChange={(offsetY) => onChange({ ...cal, box: { ...cal.box, offsetY } })}
          />
        </Section>

        <Section
          title="Omino (body paint)"
          hint="Corpo, testa e bocca del body paint. Gli item non cambiano."
        >
          <AdjustControls value={cal.body} onChange={(body) => onChange({ ...cal, body })} />
        </Section>

        <Section title="Tutti gli item" hint="Cappelli, capelli, maglie... insieme.">
          <AdjustControls value={cal.items} onChange={(items) => onChange({ ...cal, items })} />
        </Section>

        <Section
          title="Fine-tuning layer"
          hint="Scegli un layer indossato e correggilo. Frecce tastiera = sposta (Shift = ×5)."
        >
          {layers.length === 0 ? (
            <p className="text-[11px] text-[var(--wov-muted)]">Nessun layer indossato.</p>
          ) : (
            <>
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="mb-2 w-full rounded border border-[var(--wov-tile-border)] bg-[var(--wov-tile)] px-2 py-1 text-xs"
              >
                {layers.map((l) => {
                  const meta = describeItem(l.itemId);
                  const name = typeof meta?.title === "string" && meta.title ? meta.title : l.itemId ?? "";
                  const n = naturals[l.key];
                  const flagged = (l.itemId && cal.overrides[l.itemId]) || cal.layers[l.key];
                  return (
                    <option key={l.key} value={l.key}>
                      {flagged ? "● " : ""}
                      {l.key} · {name}
                      {n ? ` · ${n.w}×${n.h}` : ""}
                    </option>
                  );
                })}
              </select>

              {selected?.itemId && (
                <div className="mb-2 flex gap-1 text-[10px] font-bold">
                  {(["item", "layer"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScope(s)}
                      className={`flex-1 rounded px-1.5 py-1 ${
                        effectiveScope === s
                          ? "bg-[var(--wov-accent)] text-white"
                          : "bg-[var(--wov-tile)] text-[var(--wov-muted)]"
                      }`}
                    >
                      {s === "item" ? "Solo questo item" : "Tutto lo slot"}
                    </button>
                  ))}
                </div>
              )}

              <div className="mb-2 flex items-center gap-1 text-[10px]">
                <span className="text-[var(--wov-muted)]">Passo frecce</span>
                {STEPS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStep(s)}
                    className={`rounded px-1.5 py-0.5 font-mono ${
                      step === s ? "bg-[var(--wov-accent)] text-white" : "bg-[var(--wov-tile)]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <AdjustControls value={current} onChange={setCurrent} />

              {natural && (
                <p className="text-[10px] text-[var(--wov-muted)]">
                  Immagine caricata: {natural.w}×{natural.h}px @{natural.density}x
                  {selected?.itemId ? ` · id ${selected.itemId}` : ""}
                </p>
              )}

              {selectedMeta && (
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => setShowRaw((v) => !v)}
                    className="text-[10px] text-[var(--wov-muted)] underline"
                  >
                    {showRaw ? "Nascondi" : "Mostra"} dati API dell&apos;item
                  </button>
                  {showRaw && (
                    <pre className="wov-scroll mt-1 max-h-40 overflow-auto rounded bg-[var(--wov-page)] p-1.5 text-[9px] leading-tight">
                      {JSON.stringify(selectedMeta, null, 1)}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}
        </Section>

        <Section
          title={`Correzioni salvate (${overrideEntries.length + Object.keys(cal.layers).length})`}
        >
          {overrideEntries.length === 0 && Object.keys(cal.layers).length === 0 && (
            <p className="text-[11px] text-[var(--wov-muted)]">Nessuna correzione.</p>
          )}
          <ul className="space-y-1">
            {Object.entries(cal.layers).map(([key, a]) => (
              <li key={`l-${key}`} className="flex items-center justify-between rounded bg-[var(--wov-tile)] px-2 py-1 text-[10px]">
                <span>
                  slot <b>{key}</b> · ×{a.scale} · {a.dx}/{a.dy}
                </span>
                <button
                  type="button"
                  aria-label="Elimina"
                  onClick={() => {
                    const layersMap = { ...cal.layers };
                    delete layersMap[key];
                    onChange({ ...cal, layers: layersMap });
                  }}
                >
                  <X size={12} />
                </button>
              </li>
            ))}
            {overrideEntries.map(([id, o]) => (
              <li key={`o-${id}`} className="flex items-center justify-between rounded bg-[var(--wov-tile)] px-2 py-1 text-[10px]">
                <span className="min-w-0 truncate">
                  <b>{o.title || id}</b> · ×{o.scale} · {o.dx}/{o.dy}
                </span>
                <button
                  type="button"
                  aria-label="Elimina"
                  onClick={() => {
                    const overrides = { ...cal.overrides };
                    delete overrides[id];
                    onChange({ ...cal, overrides });
                  }}
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <footer className="shrink-0 space-y-1.5 border-t border-[var(--wov-panel-2)] bg-[var(--wov-toolbar)] p-2.5">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={downloadJson}
            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-[var(--wov-accent)] px-2 py-1.5 text-[11px] font-bold text-white"
          >
            <Download size={13} /> Scarica JSON
          </button>
          <button
            type="button"
            onClick={() => void copyJson()}
            className="flex items-center justify-center gap-1 rounded-md bg-[var(--wov-tile)] px-2.5 py-1.5 text-[11px] font-bold"
            title="Copia JSON"
          >
            <ClipboardCopy size={13} />
          </button>
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="flex items-center justify-center gap-1 rounded-md bg-[var(--wov-tile)] px-2.5 py-1.5 text-[11px] font-bold"
            title="Importa JSON"
          >
            <Upload size={13} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(DEFAULT_CALIBRATION);
            toast.success("Ripristinati i valori predefiniti");
          }}
          className="flex w-full items-center justify-center gap-1 rounded-md bg-[var(--wov-tile)] px-2 py-1.5 text-[11px] font-bold text-[var(--wov-muted)] hover:text-[var(--wov-text)]"
        >
          <RotateCcw size={13} /> Ripristina predefiniti
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importJson(f);
            e.target.value = "";
          }}
        />
      </footer>
    </aside>
  );
}

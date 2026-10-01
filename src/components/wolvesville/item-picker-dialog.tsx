"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RARITY_META,
  RARITY_ORDER,
  eventLabel,
  type WovAvatarItem,
  type WovItemType,
} from "@/lib/wov-api";
import { storeIconUrl } from "@/lib/wov-avatar";

interface ItemPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: WovAvatarItem[];
  loading?: boolean;
  onSelect: (item: WovAvatarItem) => void;
}

export function ItemPickerDialog({
  open,
  onOpenChange,
  title,
  items,
  loading,
  onSelect,
}: ItemPickerDialogProps) {
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((item) => (rarity ? item.rarity === rarity : true))
      .filter((item) =>
        q
          ? (item.title ?? "").toLowerCase().includes(q) ||
            item.id.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => (a.title ?? a.id).localeCompare(b.title ?? b.id));
  }, [items, search, rarity]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] border-violet-500/30 bg-stone-950 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-violet-300">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome o ID..."
              className="border-stone-700 bg-stone-900 pl-8 text-stone-200 placeholder:text-stone-600"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={rarity === null}
            onClick={() => setRarity(null)}
            label="Tutte"
          />
          {RARITY_ORDER.map((r) => (
            <FilterChip
              key={r}
              active={rarity === r}
              onClick={() => setRarity(rarity === r ? null : r)}
              label={RARITY_META[r].label}
              dot={RARITY_META[r].dot}
            />
          ))}
        </div>

        <ScrollArea className="h-[50vh] rounded-md border border-stone-800 bg-stone-900/50">
          {loading ? (
            <p className="p-6 text-center text-sm text-stone-500">
              Caricamento catalogo...
            </p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-stone-500">
              Nessun oggetto trovato.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onOpenChange(false);
                  }}
                  className="group flex flex-col items-center rounded-lg border border-stone-800 bg-stone-900 p-2 text-center transition-all hover:border-violet-500/60 hover:bg-stone-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={storeIconUrl(item.imageUrl)}
                    alt={item.title ?? item.id}
                    className="h-14 w-full object-contain"
                    loading="lazy"
                  />
                  <span className="mt-1 line-clamp-1 text-xs text-stone-300">
                    {item.title ?? item.id}
                  </span>
                  <span
                    className={`mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wide ${RARITY_META[item.rarity].text}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${RARITY_META[item.rarity].dot}`}
                    />
                    {RARITY_META[item.rarity].label}
                  </span>
                  {eventLabel(item.event) && (
                    <span className="mt-0.5 text-[10px] text-stone-500">
                      {eventLabel(item.event)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
        active
          ? "border-violet-500 bg-violet-500/20 text-violet-200"
          : "border-stone-700 text-stone-400 hover:border-stone-500"
      }`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {label}
    </button>
  );
}
"use client";

import { useState } from "react";
import type { GameEvent } from "@/lib/game-types";
import { DEFAULT_DAY_EVENTS, DEFAULT_NIGHT_EVENTS, DEFAULT_FEAST_EVENTS } from "@/lib/game-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Plus, Trash2, Sun, Moon, Utensils, Wand2, Scroll, Info, FileJson, CheckCircle, AlertCircle } from "lucide-react";
import { CopyPromptButton } from "@/components/hunger-games/copy-prompt-button";

interface EventEditorProps {
  events: GameEvent[];
  onEventsChange: (events: GameEvent[]) => void;
}

export function EventEditor({ events, onEventsChange }: EventEditorProps) {
  const [newEventText, setNewEventText] = useState("");
  const [newEventType, setNewEventType] = useState<"day" | "night" | "feast">("day");
  const [newEventFatal, setNewEventFatal] = useState(false);
  const [newEventWeight, setNewEventWeight] = useState(5);
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const addEvent = () => {
    if (!newEventText.trim()) return;

    const newEvent: GameEvent = {
      id: crypto.randomUUID(),
      text: newEventText.trim(),
      type: newEventType,
      isFatal: newEventFatal,
      killCount: newEventFatal ? 1 : 0,
    };

    onEventsChange([...events, newEvent]);
    setNewEventText("");
    setNewEventFatal(false);
  };

  const removeEvent = (id: string) => {
    onEventsChange(events.filter((e) => e.id !== id));
  };

  const loadDefaultEvents = () => {
    const defaults: GameEvent[] = [
      ...DEFAULT_DAY_EVENTS.map((e) => ({ ...e, id: crypto.randomUUID() })),
      ...DEFAULT_NIGHT_EVENTS.map((e) => ({ ...e, id: crypto.randomUUID() })),
      ...DEFAULT_FEAST_EVENTS.map((e) => ({ ...e, id: crypto.randomUUID() })),
    ];
    onEventsChange(defaults);
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const importJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const imported: GameEvent[] = [];

      for (const item of items) {
        if (!item.text || typeof item.text !== "string") continue;

        const validTypes = ["day", "night", "feast", "arena"];
        const type = validTypes.includes(item.type) ? item.type : "day";
        const mappedType = type === "arena" ? "feast" : type;

        const isFatal = typeof item.isFatal === "boolean" ? item.isFatal : false;
        const killer = typeof item.killer === "number" ? item.killer : null;
        const victims = Array.isArray(item.victims) ? item.victims.filter((v: unknown) => typeof v === "number") : [];

        const weight = typeof item.weight === "number" ? Math.max(1, Math.min(10, item.weight)) : 5;
        const killCount = isFatal ? Math.max(victims.length, 1) : 0;

        imported.push({
          id: crypto.randomUUID(),
          text: item.text,
          type: mappedType as "day" | "night" | "feast",
          isFatal,
          killCount,
          killer,
          victims,
          weight,
        });
      }

      if (imported.length === 0) {
        showToast("Nessun evento valido trovato nel JSON.", "error");
        return;
      }

      onEventsChange([...events, ...imported]);
      setJsonText("");
      setShowJsonImport(false);
      showToast(`Importati ${imported.length} eventi. Il sistema di tracking delle kill è attivo.`, "success");
    } catch {
      showToast("JSON non valido. Controlla la sintassi e riprova.", "error");
    }
  };

  const dayEvents = events.filter((e) => e.type === "day");
  const nightEvents = events.filter((e) => e.type === "night");
  const feastEvents = events.filter((e) => e.type === "feast");

  const EventList = ({ items, type }: { items: GameEvent[]; type: string }) => (
    <div className="max-h-[300px] space-y-2 overflow-y-auto pr-2">
      {items.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          Nessun evento {type}. Aggiungine uno!
        </p>
      ) : (
        items.map((event) => (
          <div
            key={event.id}
            className={`event-card flex items-center justify-between gap-2 ${
              event.isFatal ? "border-l-4 border-l-destructive" : ""
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{event.text}</p>
              {event.isFatal && (
                <span className="text-xs font-medium text-destructive">
                  Fatale
                  {event.killer != null && ` (killer: P${event.killer})`}
                  {event.victims && event.victims.length > 0 && ` (vittime: ${event.victims.map(v => `P${v}`).join(", ")})`}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeEvent(event.id)}
              className="shrink-0 hover:text-destructive"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Card className="card-game">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 font-serif">
              <Scroll className="text-primary" />
              <span className="gold-text">Editor Eventi</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={16} className="ml-2 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="mb-1 font-bold">Segnaposto disponibili:</p>
                  <ul className="space-y-1 text-sm">
                    <li><code className="rounded bg-secondary px-1">{"{P1}"}</code> - Protagonista</li>
                    <li><code className="rounded bg-secondary px-1">{"{P2}"}</code> - Secondo partecipante</li>
                    <li><code className="rounded bg-secondary px-1">{"{O}"}</code> - Oggetto casuale</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            
            {/* Bottone AI Generator - ORA VISIBILE! */}
            <CopyPromptButton />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Event Form */}
          <div className="space-y-4 rounded-lg bg-secondary/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="Es: {P1} attacca {P2} con {O}"
                value={newEventText}
                onChange={(e) => setNewEventText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEvent()}
                className="input-game flex-1"
              />
              <Button onClick={addEvent} className="btn-gold">
                <Plus size={18} className="mr-1" />
                Aggiungi
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Tipo:</Label>
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value as "day" | "night" | "feast")}
                  className="rounded-md border border-border bg-input px-3 py-1.5 text-sm"
                >
                  <option value="day">Giorno</option>
                  <option value="night">Notte</option>
                  <option value="feast">Banchetto</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="fatal"
                  checked={newEventFatal}
                  onCheckedChange={setNewEventFatal}
                />
                <Label htmlFor="fatal" className="text-sm">
                  {"Evento Fatale (uccide {P2})"}
                </Label>
              </div>
            </div>
          </div>

          {/* Load Defaults Button */}
          <Button onClick={loadDefaultEvents} variant="outline" className="w-full bg-transparent">
            <Wand2 size={18} className="mr-2" />
            {events.length === 0 ? "Carica Eventi Predefiniti" : "Ricarica/Aggiorna Eventi Default"}
          </Button>

          {/* JSON Import */}
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => setShowJsonImport(!showJsonImport)}
              className="w-full bg-transparent"
            >
              <FileJson size={18} className="mr-2" />
              {showJsonImport ? "Chiudi Importa JSON" : "Importa JSON"}
            </Button>

            {showJsonImport && (
              <div className="space-y-3 rounded-lg border border-primary/20 bg-secondary/30 p-4">
                <p className="text-sm text-muted-foreground">
                  {"Incolla un array JSON con campi: text ({P1}-{P10}), type (day/night/feast/arena), isFatal, killer (indice placeholder), victims (array indici)."}
                </p>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder={`[
  {
    "text": "{P1} elimina {P2} con un colpo mortale",
    "type": "day",
    "isFatal": true,
    "killer": 1,
    "victims": [2]
  }
]`}
                  className="h-40 w-full rounded-md border border-border bg-input p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <Button onClick={importJson} className="btn-gold flex-1">
                    <FileJson size={16} className="mr-2" />
                    Importa Eventi
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setShowJsonImport(false); setJsonText(""); }}
                  >
                    Annulla
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Toast Feedback */}
          {toast && (
            <div
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm animate-fade-in ${
                toast.type === "success"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {toast.message}
            </div>
          )}

          {/* Events Tabs */}
          <Tabs defaultValue="day" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-secondary">
              <TabsTrigger value="day" className="flex items-center gap-1">
                <Sun size={14} />
                Giorno ({dayEvents.length})
              </TabsTrigger>
              <TabsTrigger value="night" className="flex items-center gap-1">
                <Moon size={14} />
                Notte ({nightEvents.length})
              </TabsTrigger>
              <TabsTrigger value="feast" className="flex items-center gap-1">
                <Utensils size={14} />
                Banchetto ({feastEvents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="day" className="mt-4">
              <EventList items={dayEvents} type="diurno" />
            </TabsContent>
            <TabsContent value="night" className="mt-4">
              <EventList items={nightEvents} type="notturno" />
            </TabsContent>
            <TabsContent value="feast" className="mt-4">
              <EventList items={feastEvents} type="banchetto" />
            </TabsContent>
          </Tabs>

          {/* Clear Events */}
          {events.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Totale: {events.length} eventi
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onEventsChange([])}
              >
                <Trash2 size={14} className="mr-1" />
                Elimina Tutti
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
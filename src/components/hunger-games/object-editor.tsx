"use client";

import { useState } from "react";
import { DEFAULT_OBJECTS } from "@/lib/game-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Swords, RotateCcw, FileJson, CheckCircle, AlertCircle } from "lucide-react";

interface ObjectEditorProps {
  objects: string[];
  onObjectsChange: (objects: string[]) => void;
}

export function ObjectEditor({ objects, onObjectsChange }: ObjectEditorProps) {
  const [newObject, setNewObject] = useState("");
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const normalize = (t: string) => t.trim().toLowerCase();

  const addObject = () => {
    const value = newObject.trim();
    if (!value) return;
    if (objects.some((o) => normalize(o) === normalize(value))) {
      showToast("Questo oggetto è già nella lista.", "error");
      return;
    }
    onObjectsChange([...objects, value]);
    setNewObject("");
  };

  const removeObject = (index: number) => {
    onObjectsChange(objects.filter((_, i) => i !== index));
  };

  const resetObjects = () => {
    onObjectsChange([...DEFAULT_OBJECTS]);
    showToast("Lista oggetti ripristinata ai valori predefiniti.", "success");
  };

  const importJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
      const known = new Set(objects.map(normalize));
      const imported: string[] = [];

      for (const item of items) {
        // accetta sia ["una lancia"] sia [{ "name": "una lancia" }]
        const raw =
          typeof item === "string"
            ? item
            : item && typeof item === "object" && typeof (item as { name?: unknown }).name === "string"
              ? (item as { name: string }).name
              : "";
        const value = raw.trim();
        if (!value || known.has(normalize(value))) continue;
        known.add(normalize(value));
        imported.push(value);
      }

      if (imported.length === 0) {
        showToast("Nessun oggetto nuovo trovato nel JSON.", "error");
        return;
      }
      onObjectsChange([...objects, ...imported]);
      setJsonText("");
      setShowJsonImport(false);
      showToast(`Importati ${imported.length} oggetti.`, "success");
    } catch {
      showToast("JSON non valido. Serve un array di testi, ad esempio [\"una lancia\", \"del veleno\"].", "error");
    }
  };

  const sample = objects.length > 0 ? objects[Math.floor(objects.length / 2)] : "una lancia";

  return (
    <Card className="card-game">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif">
          <Swords className="text-primary" />
          <span className="gold-text">Oggetti</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {"Il segnaposto "}
          <code className="rounded bg-secondary px-1">{"{O}"}</code>
          {" negli eventi viene sostituito da uno di questi oggetti, scelto a caso. Scrivili con l'articolo: "}
          <span className="text-foreground">{`"{P1} trova {O}" diventa "{P1} trova ${sample}"`}</span>.
        </p>

        <div className="space-y-4 rounded-lg bg-secondary/30 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Es: una scopa tarlata"
              value={newObject}
              onChange={(e) => setNewObject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addObject()}
              className="input-game flex-1"
            />
            <Button onClick={addObject} className="btn-gold">
              <Plus size={18} className="mr-1" />
              Aggiungi
            </Button>
          </div>
        </div>

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
                Incolla un array JSON di testi. Gli oggetti già presenti vengono saltati.
              </p>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={`[\n  "una lancia",\n  "del veleno",\n  "un'accetta"\n]`}
                className="h-32 w-full rounded-md border border-border bg-input p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-2">
                <Button onClick={importJson} className="btn-gold flex-1">
                  <FileJson size={16} className="mr-2" />
                  Importa Oggetti
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowJsonImport(false);
                    setJsonText("");
                  }}
                >
                  Annulla
                </Button>
              </div>
            </div>
          )}
        </div>

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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Oggetti disponibili ({objects.length})</Label>
            <Button variant="ghost" size="sm" onClick={resetObjects}>
              <RotateCcw size={14} className="mr-2" />
              Ripristina predefiniti
            </Button>
          </div>

          {objects.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nessun oggetto. Aggiungine uno oppure ripristina i predefiniti.
            </p>
          ) : (
            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-2">
              {objects.map((object, index) => (
                <div key={`${object}-${index}`} className="event-card flex items-center justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm">{object}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeObject(index)}
                    className="text-destructive hover:bg-destructive/10"
                    aria-label={`Rimuovi ${object}`}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

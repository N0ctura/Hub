"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Users, Scroll, Settings, Swords, X, ChevronRight, FileJson } from "lucide-react";

const STORAGE_KEY = "ceh-intro-dismissed";

export function useIntroTutorial(): [boolean, () => void] {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  return [show, dismiss];
}

interface IntroTutorialProps {
  onClose: () => void;
}

const steps = [
  {
    icon: Users,
    title: "1. Aggiungi Tributi",
    description: "Nella tab Tributi, aggiungi i partecipanti con nome e foto opzionale.",
  },
  {
    icon: Scroll,
    title: "2. Configura Eventi",
    description: "Crea eventi personalizzati o carica quelli predefiniti nella tab Eventi.",
  },
  {
    icon: FileJson,
    title: "3. Automazione e Scripting",
    description:
      "Puoi caricare interi pacchetti di storie in formato JSON. Il sistema riconoscera automaticamente chi uccide e chi muore, aggiornando le statistiche del Clan in tempo reale!",
  },
  {
    icon: Settings,
    title: "4. Impostazioni",
    description: "Regola la frequenza dei banchetti e la velocita della simulazione.",
  },
  {
    icon: Swords,
    title: "5. Arena!",
    description: "Avvia la simulazione e guarda i tuoi tributi combattere!",
  },
];

export function IntroTutorial({ onClose }: IntroTutorialProps) {
  const [step, setStep] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-xl border border-primary/30 bg-card p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          type="button"
        >
          <X size={20} />
        </button>

        <div className="text-center">
          <h2 className="gold-text mb-6 font-serif text-2xl font-bold">Come Funziona</h2>

          <div className="mb-6">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className={`mb-4 flex items-start gap-3 rounded-lg p-3 text-left transition-all ${
                    i === step ? "border border-primary/30 bg-primary/5" : "opacity-50"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{s.title}</p>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-3">
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} className="btn-gold">
                Avanti
                <ChevronRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button onClick={onClose} className="btn-gold">
                Inizia!
              </Button>
            )}
          </div>

          {/* Dots */}
          <div className="mt-4 flex justify-center gap-2">
            {steps.map((_, i) => (
              <button
                key={`dot-${
                  // biome-ignore lint: index is fine here
                  i
                }`}
                onClick={() => setStep(i)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === step ? "bg-primary" : "bg-muted"
                }`}
                type="button"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

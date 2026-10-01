"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Copy, CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const AI_GENERATOR_PROMPT = `Agisci come un esperto programmatore JSON per Hunger Games. 
Trasforma le frasi che ti fornirò in un array JSON seguendo queste regole:

1. Fasi: 'day' (giorno), 'night' (notte), 'feast' (banchetto).
2. Placeholder: Usa {P1}-{P10} per i tributi.
3. Parametri: text, type, isFatal (boolean), weight (1-10).
4. Logica Morti: Se isFatal è true, specifica killer (indice numerico, es: 1 per {P1}) e victims (array di indici, es: [2]).

Esempi di output:
- {"text": "{P1} e {P2} riposano.", "type": "day", "isFatal": false, "weight": 8}
- {"text": "{P1} uccide {P2} con {O}.", "type": "night", "isFatal": true, "killer": 1, "victims": [2], "weight": 5}
- {"text": "Al banchetto {P1} elimina {P2} e {P3}.", "type": "feast", "isFatal": true, "killer": 1, "victims": [2, 3], "weight": 3}

Rispondi esclusivamente con il codice JSON.`;

export function CopyPromptButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(AI_GENERATOR_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            onClick={handleCopy} 
            variant="outline" 
            className="gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10"
          >
            {copied ? <CheckCircle size={16} className="text-green-500" /> : <Sparkles size={16} className="text-primary" />}
            {copied ? "Prompt Copiato!" : "Copia Prompt AI"}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>Copia un prompt ottimizzato per chiedere a ChatGPT/Gemini di generare nuovi eventi JSON per il gioco.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

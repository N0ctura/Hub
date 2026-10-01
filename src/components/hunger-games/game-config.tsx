"use client";

import type { GameConfig } from "@/lib/game-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Settings, Trash2, Image as ImageIcon, RotateCcw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_CONFIG } from "@/lib/game-types";
import { useRef } from "react";

interface GameConfigPanelProps {
  config: GameConfig;
  onConfigChange: (config: GameConfig) => void;
  onFullReset: () => void;
}

export function GameConfigPanel({ config, onConfigChange, onFullReset }: GameConfigPanelProps) {
  const dayInputRef = useRef<HTMLInputElement>(null);
  const nightInputRef = useRef<HTMLInputElement>(null);
  const feastInputRef = useRef<HTMLInputElement>(null);

  const update = (partial: Partial<GameConfig>) => {
    onConfigChange({ ...config, ...partial });
  };

  const handleImageUpload = (file: File, phase: 'day' | 'night' | 'feast') => {
    if (!file) return;
    
    // 1MB limit to be safe with localStorage
    if (file.size > 1024 * 1024) {
      alert("L'immagine è troppo grande (max 1MB). Per favore comprimila o scegline una più piccola.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const currentImages = config.phaseImages || DEFAULT_CONFIG.phaseImages!;
      update({
        phaseImages: {
          ...currentImages,
          [phase]: base64
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const resetImage = (phase: 'day' | 'night' | 'feast') => {
    const currentImages = config.phaseImages || DEFAULT_CONFIG.phaseImages!;
    update({
      phaseImages: {
        ...currentImages,
        [phase]: DEFAULT_CONFIG.phaseImages![phase]
      }
    });
    // Reset file input value
    if (phase === 'day' && dayInputRef.current) dayInputRef.current.value = "";
    if (phase === 'night' && nightInputRef.current) nightInputRef.current.value = "";
    if (phase === 'feast' && feastInputRef.current) feastInputRef.current.value = "";
  };

  const renderImageUploader = (label: string, phase: 'day' | 'night' | 'feast', inputRef: React.RefObject<HTMLInputElement | null>) => {
    const defaultImage = DEFAULT_CONFIG.phaseImages?.[phase] || "";
    const currentImage = config.phaseImages?.[phase] || defaultImage;
    const isDefault = currentImage === defaultImage;

    return (
      <div className="space-y-2 rounded-lg border border-border/40 bg-secondary/10 p-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{label}</Label>
          {!isDefault && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
              onClick={() => resetImage(phase)}
              title="Ripristina predefinita"
            >
              <X size={14} />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Preview */}
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-black/20">
            {currentImage && (
              <img 
                src={currentImage} 
                alt={`${phase} preview`} 
                className="h-full w-full object-cover"
              />
            )}
          </div>

          {/* Controls */}
          <div className="flex-1">
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              ref={inputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, phase);
              }}
            />
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={12} className="mr-2" />
              Carica Immagine
            </Button>
            <p className="mt-1 text-[10px] text-muted-foreground truncate">
              {isDefault ? "Default" : "Personalizzata"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="card-game">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif">
          <Settings className="text-primary" />
          <span className="gold-text">Configurazione</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">
              Frequenza Banchetto (ogni N fasi): {config.feastFrequency}
            </Label>
            <Slider
              value={[config.feastFrequency]}
              onValueChange={([v]) => update({ feastFrequency: v })}
              min={1}
              max={10}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">
              Tasso di Mortalità (Probabilità Eventi Fatali): {Math.round((config.deathRate ?? 0.15) * 100)}%
            </Label>
            <Slider
              value={[config.deathRate ?? 0.15]}
              onValueChange={([v]) => update({ deathRate: v })}
              min={0}
              max={1}
              step={0.01}
            />
             <p className="text-xs text-muted-foreground">
               Un valore basso renderà i giochi più lunghi e focalizzati sulle alleanze, un valore alto causerà un massacro immediato.
             </p>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
            <div>
              <Label className="text-sm font-medium">Auto-Play</Label>
              <p className="text-xs text-muted-foreground">
                Simula le fasi automaticamente
              </p>
            </div>
            <Switch
              checked={config.autoPlay}
              onCheckedChange={(v) => update({ autoPlay: v })}
            />
          </div>

          {config.autoPlay && (
            <div className="space-y-2">
              <Label className="text-sm">
                Velocita Auto-Play: {config.autoPlaySpeed / 1000}s
              </Label>
              <Slider
                value={[config.autoPlaySpeed]}
                onValueChange={([v]) => update({ autoPlaySpeed: v })}
                min={500}
                max={5000}
                step={250}
              />
            </div>
          )}

          <div className="pt-4 border-t border-border/30 space-y-4">
             <div className="flex items-center justify-between">
               <Label className="text-base font-serif gold-text flex items-center gap-2">
                 <ImageIcon size={18} />
                 Personalizzazione Atmosfera
               </Label>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => update({ phaseImages: DEFAULT_CONFIG.phaseImages, overlayOpacity: DEFAULT_CONFIG.overlayOpacity })}
                 title="Ripristina tutte le immagini predefinite"
               >
                 <RotateCcw size={14} className="mr-2" />
                 Reset Tutto
               </Button>
             </div>

             <div className="space-y-2">
                <Label className="text-sm">
                  Oscuramento Sfondo: {Math.round((config.overlayOpacity ?? 0.7) * 100)}%
                </Label>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">Chiaro</span>
                  <Slider
                    value={[config.overlayOpacity ?? 0.7]}
                    onValueChange={([v]) => update({ overlayOpacity: v })}
                    min={0.1}
                    max={0.9}
                    step={0.05}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground">Scuro</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Regola quanto deve essere scuro lo sfondo per rendere leggibile il testo.
                </p>
             </div>
             
             <div className="grid gap-3">
               {renderImageUploader("Fase Giorno", "day", dayInputRef)}
               {renderImageUploader("Fase Notte", "night", nightInputRef)}
               {renderImageUploader("Fase Banchetto", "feast", feastInputRef)}
             </div>
          </div>

          <div className="pt-4 border-t border-border/30">
             <Button 
               variant="destructive" 
               className="w-full" 
               onClick={onFullReset}
             >
               <Trash2 size={18} className="mr-2" />
               Reset Completo Applicazione
             </Button>
             <p className="mt-2 text-xs text-center text-muted-foreground">
               Cancella tutti i dati salvati e ricarica la pagina.
             </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
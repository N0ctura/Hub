"use client";

import React, { useState, useRef, useEffect } from "react";
import { Settings, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAppearance } from "@/context/appearance-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AppearanceSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    popupColor,
    setPopupColor,
    popupOpacity,
    setPopupOpacity,
    textColor,
    setTextColor,
    resetDefaults,
  } = useAppearance();
  
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`text-muted-foreground hover:text-primary ${isOpen ? "bg-accent text-accent-foreground" : ""}`}
        title="Impostazioni Aspetto"
      >
        <Settings size={20} />
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 z-50 w-80 shadow-2xl animate-in fade-in zoom-in-95 duration-200 border-primary/20 bg-background/95 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings size={16} />
              Aspetto Eventi
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
              <X size={14} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Background Color */}
            <div className="space-y-2">
              <Label htmlFor="popup-color" className="text-xs font-semibold">Colore Sfondo Popup</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-full border border-border shadow-sm" 
                  style={{ backgroundColor: popupColor }}
                />
                <Input
                  id="popup-color"
                  type="color"
                  value={popupColor}
                  onChange={(e) => setPopupColor(e.target.value)}
                  className="h-8 flex-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Opacity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="popup-opacity" className="text-xs font-semibold">Opacità Sfondo</Label>
                <span className="text-xs text-muted-foreground">{Math.round(popupOpacity * 100)}%</span>
              </div>
              <Slider
                id="popup-opacity"
                min={0.1}
                max={1}
                step={0.05}
                value={[popupOpacity]}
                onValueChange={(vals) => setPopupOpacity(vals[0])}
                className="py-2"
              />
            </div>

            {/* Text Color */}
            <div className="space-y-2">
              <Label htmlFor="text-color" className="text-xs font-semibold">Colore Testo</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-full border border-border shadow-sm" 
                  style={{ backgroundColor: textColor }}
                />
                <Input
                  id="text-color"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-8 flex-1 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 border-t mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetDefaults}
                className="w-full text-xs h-8"
              >
                <RotateCcw size={12} className="mr-2" />
                Ripristina Default
              </Button>
            </div>
            
            {/* Preview */}
            <div 
              className="mt-4 p-3 rounded-md border text-center text-sm shadow-sm transition-all"
              style={{ 
                backgroundColor: popupColor,
                opacity: popupOpacity, 
                color: textColor 
              }}
            >
              Anteprima Stile
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

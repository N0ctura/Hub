"use client";

import React from "react"

import { useState, useRef } from "react";
import type { Tribute } from "@/lib/game-types";
import { TributeCard } from "./tribute-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Trash2, RotateCcw, Upload, Users } from "lucide-react";

interface TributeManagerProps {
  tributes: Tribute[];
  onTributesChange: (tributes: Tribute[]) => void;
}

export function TributeManager({ tributes, onTributesChange }: TributeManagerProps) {
  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("L'immagine deve essere inferiore a 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addTribute = () => {
    if (!newName.trim()) return;
    // if (tributes.length >= 48) return;

    // Calculate correct district based on current index
    const districtNum = Math.floor(tributes.length / 2) + 1;

    const newTribute: Tribute = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      image: newImage,
      isAlive: true,
      kills: 0,
      district: districtNum,
      clan: `district-${districtNum}`,
    };

    onTributesChange([...tributes, newTribute]);
    setNewName("");
    setNewImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Auto-reassign districts to ensure consistency
  React.useEffect(() => {
    let needsUpdate = false;
    const updatedTributes = tributes.map((t, idx) => {
      const expectedDistrict = Math.floor(idx / 2) + 1;
      if (t.district !== expectedDistrict) {
        needsUpdate = true;
        return {
          ...t,
          district: expectedDistrict,
          clan: `district-${expectedDistrict}`,
        };
      }
      return t;
    });

    if (needsUpdate) {
      onTributesChange(updatedTributes);
    }
  }, [tributes.length]); // Check when length changes (add/remove)

  const removeTribute = (id: string) => {
    onTributesChange(tributes.filter((t) => t.id !== id));
  };

  const resetTributes = () => {
    onTributesChange([]);
  };

  const aliveTributes = tributes.filter((t) => t.isAlive);

  return (
    <Card className="card-game">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif">
          <Users className="text-primary" />
          <span className="gold-text">Gestione Tributi</span>
          <span className="ml-auto text-sm font-sans text-muted-foreground">
            {aliveTributes.length}/{tributes.length} in vita
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Tribute Form */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 space-y-2">
            <Input
              placeholder="Nome del tributo..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTribute()}
              className="input-game"
              maxLength={30}
            />
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="tribute-image"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="relative"
            >
              <Upload size={18} />
              {newImage && (
                <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary" />
              )}
            </Button>
            <Button onClick={addTribute} className="btn-gold">
              <UserPlus size={18} className="mr-1" />
              Aggiungi
            </Button>
          </div>
        </div>

        {/* Image Preview */}
        {newImage && (
          <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
            <img
              src={newImage || "/placeholder.svg"}
              alt="Anteprima"
              className="h-12 w-12 rounded-full border-2 border-primary object-cover"
            />
            <span className="text-sm text-muted-foreground">Immagine selezionata</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNewImage(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )}

        {/* Tributes Grid */}
        {tributes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(
              tributes.reduce((acc, tribute) => {
                const district = tribute.district || 0;
                if (!acc[district]) acc[district] = [];
                acc[district].push(tribute);
                return acc;
              }, {} as Record<number, Tribute[]>)
            ).sort(([a], [b]) => Number(a) - Number(b)).map(([district, districtTributes]) => (
              <div
                key={district}
                className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4"
              >
                <div className="text-center text-xs font-bold tracking-widest text-primary/80">
                  {Number(district) > 0 ? `DISTRETTO ${district}` : "SCONOSCIUTO"}
                </div>
                <div className="flex items-center justify-around">
                  {districtTributes.map((tribute) => (
                    <TributeCard
                      key={tribute.id}
                      tribute={tribute}
                      size="md"
                      onRemove={() => removeTribute(tribute.id)}
                      showKills
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nessun tributo aggiunto</p>
            <p className="text-sm">Aggiungi i partecipanti per iniziare la simulazione</p>
          </div>
        )}

        {/* Action Buttons */}
        {tributes.length > 0 && (
          <div className="flex justify-end gap-2">
            <Button variant="destructive" onClick={resetTributes}>
              <RotateCcw size={18} className="mr-1" />
              Resetta Tutti
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { Tribute, GameEvent, GameConfig, SimulationLog } from "@/lib/game-types";
import { DEFAULT_CONFIG, DEFAULT_OBJECTS, generateDefaultTributes } from "@/lib/game-types";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { ParticleBackground } from "@/components/particle-background";
import { Navbar } from "@/components/navbar";
import { TributeManager } from "@/components/hunger-games/tribute-manager";
import { EventEditor } from "@/components/hunger-games/event-editor";
import { ObjectEditor } from "@/components/hunger-games/object-editor";
import { GameConfigPanel } from "@/components/hunger-games/game-config";
import { SimulationEngine } from "@/components/hunger-games/simulation-engine";
import { VictoryScreen } from "@/components/hunger-games/victory-screen";
import { IntroTutorial, useIntroTutorial } from "@/components/hunger-games/intro-tutorial";
import { CopyPromptButton } from "@/components/hunger-games/copy-prompt-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Scroll, Swords, Settings, Sparkles, Backpack, Download, FolderUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HungerGamesPage() {
  const searchParams = useSearchParams();
  const [logo, setLogo] = useLocalStorage<string | null>("ceh-logo", null);
  const [tributes, setTributes] = useLocalStorage<Tribute[]>("ceh-tributes", []);
  const [events, setEvents] = useLocalStorage<GameEvent[]>("ceh-events", []);
  const [config, setConfig] = useLocalStorage<GameConfig>("ceh-config", DEFAULT_CONFIG);
  const [objects, setObjects] = useLocalStorage<string[]>("ceh-objects", DEFAULT_OBJECTS);
  const [activeTab, setActiveTab] = useState("tributes");
  const [winner, setWinner] = useState<Tribute | null>(null);
  const [finalLogs, setFinalLogs] = useState<SimulationLog[]>([]);
  const [showVictory, setShowVictory] = useState(false);
  const [showIntro, dismissIntro] = useIntroTutorial();

  // Ensure config has all new properties (migration for existing users)
  useEffect(() => {
    if (config && !config.phaseImages) {
      setConfig((prev) => ({
        ...DEFAULT_CONFIG,
        ...prev,
        phaseImages: DEFAULT_CONFIG.phaseImages,
      }));
    }
  }, [config, setConfig]);

  const defaultsLoaded = useRef(false);
  useEffect(() => {
    if (!defaultsLoaded.current && tributes.length === 0) {
      defaultsLoaded.current = true;
      setTributes(generateDefaultTributes());
    }
  }, [tributes.length, setTributes]);

  useEffect(() => {
    const shareData = searchParams.get("share");
    if (shareData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(shareData)));
        if (decoded.t && Array.isArray(decoded.t)) {
          const importedTributes: Tribute[] = decoded.t.map(
            (t: { n: string; i: string | null }, idx: number) => ({
              id: crypto.randomUUID(),
              name: t.n,
              image: t.i,
              isAlive: true,
              kills: 0,
              district: Math.floor(idx / 2) + 1,
              clan: `district-${Math.floor(idx / 2) + 1}`,
            })
          );
          setTributes(importedTributes);
        }
      } catch {
        // Invalid share data
      }
    }
  }, [searchParams, setTributes]);

  const [storageFull, setStorageFull] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = () => setStorageFull(true);
    window.addEventListener("ceh-storage-full", h);
    return () => window.removeEventListener("ceh-storage-full", h);
  }, []);

  // BACKUP: salva tributi (con foto), eventi, oggetti, config e logo in un unico file .json
  const exportBackup = () => {
    const data = { version: 1, logo, tributes, events, config, objects };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `celestial-hg-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (Array.isArray(d.tributes)) setTributes(d.tributes);
      if (Array.isArray(d.events)) setEvents(d.events);
      if (Array.isArray(d.objects)) setObjects(d.objects);
      if (d.config && typeof d.config === "object") setConfig({ ...DEFAULT_CONFIG, ...d.config });
      if (typeof d.logo === "string" || d.logo === null) setLogo(d.logo ?? null);
      alert("Backup ripristinato!");
    } catch {
      alert("File di backup non valido.");
    }
  };

  const handleWinner = useCallback(
    (w: Tribute | null, logs: SimulationLog[]) => {
      setWinner(w);
      setFinalLogs(logs);
      setShowVictory(true);
    },
    []
  );

  const handleReset = () => {
    setShowVictory(false);
    setWinner(null);
    setFinalLogs([]);
    const resetTributes = tributes.map((t) => ({
      ...t,
      isAlive: true,
      kills: 0,
      district: t.district,
      clan: t.clan,
    }));
    setTributes(resetTributes);
  };

  const handleFullReset = () => {
    if (confirm("Sei sicuro? Questo cancellerà tutti i tributi, gli eventi e la configurazione salvata. La pagina verrà ricaricata.")) {
      localStorage.removeItem("ceh-tributes");
      localStorage.removeItem("ceh-events");
      localStorage.removeItem("ceh-config");
      localStorage.removeItem("ceh-objects");
      localStorage.removeItem("ceh-logo");
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ParticleBackground />
      <Navbar logo={logo} onLogoChange={setLogo} showHome />

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-6">
        <div className="mb-8 text-center">
          <h1 className="gold-text flex items-center justify-center gap-3 font-serif text-3xl font-bold tracking-wide sm:text-4xl">
            <Sparkles className="text-primary" size={28} />
            Hunger Games Simulator
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea la tua arena personalizzata
          </p>
        </div>

        {storageFull && (
          <div className="mx-auto mb-4 max-w-3xl rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center text-sm">
            Memoria del browser piena: le ultime modifiche non sono state salvate. Esporta un backup e usa foto più piccole.
          </div>
        )}
        <div className="mx-auto mb-6 flex max-w-3xl flex-wrap justify-center gap-2">
          <Button variant="outline" size="sm" onClick={exportBackup}>
            <Download size={16} className="mr-2" />
            Esporta backup (con foto)
          </Button>
          <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
            <FolderUp size={16} className="mr-2" />
            Importa backup
          </Button>
          <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={importBackup} />
        </div>

        {showVictory ? (
          <VictoryScreen
            winner={winner}
            tributes={tributes}
            logs={finalLogs}
            onReset={handleReset}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="mx-auto grid w-full max-w-xl grid-cols-5 bg-secondary">
              <TabsTrigger value="tributes" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Users size={16} />
                <span className="hidden sm:inline">Tributi</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Scroll size={16} />
                <span className="hidden sm:inline">Eventi</span>
              </TabsTrigger>
              <TabsTrigger value="objects" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Backpack size={16} />
                <span className="hidden sm:inline">Oggetti</span>
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Settings size={16} />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
              <TabsTrigger value="arena" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Swords size={16} />
                <span className="hidden sm:inline">Arena</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tributes" className="animate-fade-in">
              <TributeManager tributes={tributes} onTributesChange={setTributes} />
            </TabsContent>
            <TabsContent value="events" className="animate-fade-in">
              <EventEditor events={events} onEventsChange={setEvents} />
            </TabsContent>
            <TabsContent value="objects" className="animate-fade-in">
              <ObjectEditor objects={objects} onObjectsChange={setObjects} />
            </TabsContent>
            <TabsContent value="config" className="animate-fade-in">
              <GameConfigPanel 
                config={config} 
                onConfigChange={setConfig} 
                onFullReset={handleFullReset}
              />
            </TabsContent>
            <TabsContent value="arena" className="animate-fade-in">
              <SimulationEngine
                tributes={tributes}
                events={events}
                objects={objects}
                config={config}
                onTributesChange={setTributes}
                onWinner={handleWinner}
              />
            </TabsContent>
          </Tabs>
        )}

        {!showVictory && (
          <div className="mx-auto mt-8 grid max-w-3xl grid-cols-3 gap-4 sm:grid-cols-5">
            <div className="card-game p-4 text-center">
              <p className="text-2xl font-bold text-primary">{tributes.length}</p>
              <p className="text-xs text-muted-foreground">Tributi</p>
            </div>
            <div className="card-game p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {new Set(tributes.map((t) => t.district).filter(Boolean)).size}
              </p>
              <p className="text-xs text-muted-foreground">Distretti</p>
            </div>
            <div className="card-game p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {tributes.filter((t) => t.isAlive).length}
              </p>
              <p className="text-xs text-muted-foreground">In Vita</p>
            </div>
            <div className="card-game p-4 text-center">
              <p className="text-2xl font-bold text-primary">{events.length}</p>
              <p className="text-xs text-muted-foreground">Eventi</p>
            </div>
            <div className="card-game p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {events.filter((e) => e.isFatal).length}
              </p>
              <p className="text-xs text-muted-foreground">Fatali</p>
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 mt-12 border-t border-border/50 py-6">
        <p className="text-center text-sm text-muted-foreground">
          Celestial Elysium Hub - Hunger Games Simulator
        </p>
      </footer>

      {showIntro && <IntroTutorial onClose={dismissIntro} />}
    </div>
  );
}

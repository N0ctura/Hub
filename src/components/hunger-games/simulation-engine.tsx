"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Tribute, GameEvent, GameConfig, GameState, SimulationLog, SimulatedEvent } from "@/lib/game-types";
import { DEFAULT_OBJECTS, DEFAULT_CONFIG } from "@/lib/game-types";
import { TributeCard } from "./tribute-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, SkipForward, RotateCcw, Trophy, Sun, Moon, Utensils, Copy, Skull, ArrowRight, FastForward, Eye } from "lucide-react";
import { useAppearance } from "@/context/appearance-context";
import { withBase } from "@/lib/base-path";
import { playSound } from "@/lib/sounds";

// Helper for color opacity
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface SimulationEngineProps {
  tributes: Tribute[];
  events: GameEvent[];
  objects: string[];
  config: GameConfig;
  onTributesChange: (tributes: Tribute[]) => void;
  onWinner: (winner: Tribute | null, logs: SimulationLog[]) => void;
}

export function SimulationEngine({
  tributes,
  events,
  objects,
  config,
  onTributesChange,
  onWinner,
}: SimulationEngineProps) {
  const { popupColor, popupOpacity, textColor } = useAppearance();

  const [gameState, setGameState] = useState<GameState>({
    tributes,
    events,
    objects: objects.length > 0 ? objects : DEFAULT_OBJECTS,
    isRunning: false,
    currentPhase: "setup",
    currentPhaseNumber: 0,
    logs: [],
    winner: null,
    pendingEvents: [],
    currentStep: 0,
  });

  // Effetti sonori: rispettano interruttore e volume della scheda Config
  const soundOn = config.soundEnabled ?? true;
  const soundVolume = config.soundVolume ?? 0.5;
  const sfx = (name: Parameters<typeof playSound>[0]) => playSound(name, soundOn, soundVolume);

  const eventListRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to bottom of event list when new events are added
  useEffect(() => {
    if (eventListRef.current) {
      eventListRef.current.scrollTop = eventListRef.current.scrollHeight;
    }
  }, [gameState.currentStep, gameState.pendingEvents]);

  const aliveTributes = tributes.filter((t) => t.isAlive);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getWeightedEvent = (
    pool: GameEvent[],
    phaseNumber: number,
    deathRateConfig: number = 0.5,
    aliveCount: number = 24,
    usedThisPhase: Set<string> = new Set(),
    recentIds: Set<string> = new Set()
  ): GameEvent | null => {
    if (pool.length === 0) return null;

    // Non ripetere la stessa frase nello stesso round, se ci sono alternative
    const fresh = pool.filter((e) => !usedThisPhase.has(e.id));
    const candidates = fresh.length > 0 ? fresh : pool;

    // Mortalita' dinamica: i giorni iniziali sono piu' tranquilli (0.5x),
    // poi cresce di 0.25 al giorno fino a 2.5x.
    const dayFactor = Math.min(0.5 + (phaseNumber - 1) * 0.25, 2.5);

    // Slider mortalita' (0-1, default 0.5): 0.5 -> 1x, 1.0 -> 2x, 0 -> nessun evento fatale
    const configFactor = deathRateConfig * 2;

    // Con pochi tributi rimasti le morti diventano piu' probabili,
    // cosi' la fine della partita non si trascina (8 vivi: 1.35x, 4 vivi: 2.75x)
    const lateFactor = aliveCount <= 8 ? 1 + (9 - aliveCount) * 0.35 : 1;

    const weightedPool = candidates.map((event) => {
      let weight = event.weight || 5;
      // Frasi usate negli ultimi round: meno probabili
      if (recentIds.has(event.id)) weight *= 0.25;
      if (event.isFatal) {
        weight *= dayFactor * configFactor * lateFactor;
      }
      return { event, weight };
    });

    const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight <= 0) return candidates[Math.floor(Math.random() * candidates.length)];
    let random = Math.random() * totalWeight;

    for (const item of weightedPool) {
      if (random < item.weight) return item.event;
      random -= item.weight;
    }

    return weightedPool[weightedPool.length - 1].event;
  };

  const processEvent = (
    event: GameEvent,
    availableTributes: Tribute[],
    updatedTributes: Tribute[],
    totalAliveCount: number
  ): SimulatedEvent | null => {
    if (availableTributes.length < 1) return null;

    let maxPlaceholder = 1;
    for (let p = 10; p >= 1; p--) {
      if (event.text.includes(`{P${p}}`)) {
        maxPlaceholder = p;
        break;
      }
    }
    if (availableTributes.length < maxPlaceholder) return null;

    // Narrative Variety: Check if P1 has used this event
    const p1 = availableTributes[0];
    if (p1.usedEvents?.includes(event.id)) return null;

    let participants: Tribute[] = [p1];

    if (maxPlaceholder > 1) {
      const candidates = availableTributes.slice(1);
      // Filter candidates for Loyalty and Narrative Variety
      const validCandidates = candidates.filter(c => {
        // Narrative Variety
        if (c.usedEvents?.includes(event.id)) return false;
        
        // Loyalty Logic: If fatal and not last 2, avoid same district
        if (event.isFatal && totalAliveCount > 2) {
          if (c.district !== undefined && c.district === p1.district) return false;
        }
        return true;
      });

      if (validCandidates.length < maxPlaceholder - 1) return null;
      participants = [...participants, ...validCandidates.slice(0, maxPlaceholder - 1)];
    }

    const objectPool = objects.length > 0 ? objects : DEFAULT_OBJECTS;
    const obj = objectPool[Math.floor(Math.random() * objectPool.length)];

    let text = event.text;
    for (let p = 1; p <= maxPlaceholder; p++) {
      const regex = new RegExp(`\\{P${p}\\}`, "g");
      text = text.replace(regex, participants[p - 1].name);
    }
    text = text.replace(/{O}/g, obj);
    // "a" davanti a una parola che inizia per "a" diventa "ad" ("a ambrogio" -> "ad ambrogio")
    text = text.replace(/\b([Aa]) (?=[Aa])/g, "$1d ");

    const deaths: string[] = [];
    const participantIds = participants.map((t) => t.id);
    let killerId: string | undefined;

    if (event.isFatal) {
      const victimIndices = event.victims && event.victims.length > 0
        ? event.victims
        : maxPlaceholder >= 2 ? [2] : [];

      const killerIndex = event.killer != null ? event.killer : 1;

      for (const vi of victimIndices) {
        if (vi < 1 || vi > maxPlaceholder) continue;
        const victim = participants[vi - 1];
        if (!victim || deaths.includes(victim.id)) continue;

        deaths.push(victim.id);
        const idx = updatedTributes.findIndex((t) => t.id === victim.id);
        if (idx !== -1) updatedTributes[idx] = { ...updatedTributes[idx], isAlive: false };
      }

      if (killerIndex >= 1 && killerIndex <= maxPlaceholder && deaths.length > 0) {
        const killer = participants[killerIndex - 1];
        killerId = killer.id;
        const kIdx = updatedTributes.findIndex((t) => t.id === killer.id);
        if (kIdx !== -1) {
          updatedTributes[kIdx] = {
            ...updatedTributes[kIdx],
            kills: updatedTributes[kIdx].kills + deaths.length,
          };
        }
      }
    }

    // Update usedEvents for all participants in the simulation state
    participants.forEach(p => {
      const idx = updatedTributes.findIndex(ut => ut.id === p.id);
      if (idx !== -1) {
        const currentUsed = updatedTributes[idx].usedEvents || [];
        updatedTributes[idx] = {
          ...updatedTributes[idx],
          usedEvents: [...currentUsed, event.id]
        };
      }
    });

    return {
      id: crypto.randomUUID(),
      text,
      participants: participantIds,
      deaths,
      killerId,
      originalEventId: event.id,
    };
  };

  const preparePhase = useCallback(
    (phaseType: "day" | "night" | "feast") => {
      const phaseEvents = events.filter((e) => e.type === phaseType);
      
      // Fallback Correction: ensure we have something
      const fallbackEvent: GameEvent = {
        id: "fallback-generic",
        text: "{P1} si guarda intorno nervosamente.",
        type: phaseType,
        isFatal: false,
        killCount: 0,
        weight: 1
      };

      if (phaseEvents.length === 0) {
        // If no events at all, use fallback
        phaseEvents.push(fallbackEvent);
      }

      const alive = tributes.filter((t) => t.isAlive);
      if (alive.length <= 1) {
        const winner = alive[0] || null;
        setGameState((prev) => ({ ...prev, currentPhase: "finished", winner, isRunning: false }));
        onWinner(winner, gameState.logs);
        return;
      }

      // Simulate on a copy to generate events
      const simulationTributes = tributes.map(t => ({ ...t, usedEvents: t.usedEvents || [] }));
      const shuffledAlive = shuffleArray(alive);
      const simulatedEvents: SimulatedEvent[] = [];
      const processedIds = new Set<string>();
      const usedThisPhase = new Set<string>();
      const recentIds = new Set<string>(
        gameState.logs
          .slice(-2)
          .flatMap((log) => log.events.map((e) => e.originalEventId))
          .filter((id): id is string => Boolean(id))
      );
      
      let i = 0;
      while (i < shuffledAlive.length) {
        // Get currently available tributes (those still alive in simulation)
        // Note: shuffledAlive are the *original* alive tributes.
        // We must check if they are still alive in simulationTributes AND not processed in this phase
        const currentTributeId = shuffledAlive[i].id;
        const currentTributeSim = simulationTributes.find(t => t.id === currentTributeId);
        
        if (!currentTributeSim || !currentTributeSim.isAlive || processedIds.has(currentTributeId)) {
          i++;
          continue;
        }

        const available = [
          shuffledAlive[i],
          ...shuffledAlive.slice(i + 1).filter(t => 
            !processedIds.has(t.id) && 
            simulationTributes.find(st => st.id === t.id)?.isAlive
          )
        ];

        let result: SimulatedEvent | null = null;
        let attempts = 0;
        const MAX_ATTEMPTS = 10;

        while (!result && attempts < MAX_ATTEMPTS) {
          const randomEvent = getWeightedEvent(
            phaseEvents, 
            gameState.currentPhaseNumber || 1,
            config.deathRate,
            alive.length,
            usedThisPhase,
            recentIds
          );
          
          if (randomEvent) {
            result = processEvent(randomEvent, available, simulationTributes, alive.length);
          }
          attempts++;
        }

        // Fallback Correction: if we couldn't find a valid event after retries
        if (!result) {
          result = processEvent(fallbackEvent, available, simulationTributes, alive.length);
        }

        if (result) {
          if (result.originalEventId) usedThisPhase.add(result.originalEventId);
          simulatedEvents.push(result);
          result.participants.forEach(pid => processedIds.add(pid));
        } else {
          // If fallback also failed (e.g. not enough participants?), mark this tribute as processed to avoid infinite loops
          processedIds.add(currentTributeId);
        }

        i++;
      }

      setGameState((prev) => ({
        ...prev,
        pendingEvents: simulatedEvents,
        currentPhase: phaseType,
        currentPhaseNumber: prev.currentPhaseNumber + (phaseType === "day" ? 1 : 0),
        currentStep: 0,
        isRunning: true,
      }));
    },
    [tributes, events, objects, onWinner, gameState.logs, config.deathRate, gameState.currentPhaseNumber]
  );
  
  // I'll implement the loop properly inside the replacement string.

  const handleNextEvent = () => {
    if (gameState.currentStep >= gameState.pendingEvents.length) return;

    const event = gameState.pendingEvents[gameState.currentStep];
    const updatedTributes = gameState.tributes.map(t => {
      let newT = { ...t };
      if (event.deaths.includes(t.id)) newT.isAlive = false;
      if (event.killerId && t.id === event.killerId) newT.kills += event.deaths.length;
      
      // Update usedEvents persistence
      if (event.originalEventId && event.participants.includes(t.id)) {
        newT.usedEvents = [...(newT.usedEvents || []), event.originalEventId];
      }
      
      return newT;
    });

    sfx(event.deaths.length > 0 ? "death" : "click");
    onTributesChange(updatedTributes);
    setGameState(prev => ({
      ...prev,
      tributes: updatedTributes,
      currentStep: prev.currentStep + 1
    }));
  };

  const handleSkip = () => {
    let updatedTributes = [...gameState.tributes];
    
    // Apply all remaining events
    for (let i = gameState.currentStep; i < gameState.pendingEvents.length; i++) {
      const event = gameState.pendingEvents[i];
      updatedTributes = updatedTributes.map(t => {
        let newT = { ...t };
        if (event.deaths.includes(t.id)) newT.isAlive = false;
        if (event.killerId && t.id === event.killerId) newT.kills += event.deaths.length;
        return newT;
      });
    }

    const anyDeath = gameState.pendingEvents
      .slice(gameState.currentStep)
      .some((e) => e.deaths.length > 0);
    sfx(anyDeath ? "death" : "click");
    onTributesChange(updatedTributes);
    setGameState(prev => ({
      ...prev,
      tributes: updatedTributes,
      currentStep: prev.pendingEvents.length
    }));
  };

  const finalizePhase = () => {
    const deaths: string[] = [];
    gameState.pendingEvents.forEach(e => deaths.push(...e.deaths));

    const newLog: SimulationLog = {
      id: crypto.randomUUID(),
      phase: gameState.currentPhase as "day" | "night" | "feast",
      phaseNumber: gameState.currentPhaseNumber,
      events: gameState.pendingEvents,
      deaths,
    };

    const newPhaseNumber = gameState.currentPhaseNumber;
    const newLogs = [...gameState.logs, newLog];
    
    setGameState(prev => ({
      ...prev,
      logs: newLogs,
      currentPhase: "summary",
      currentPhaseNumber: newPhaseNumber,
      pendingEvents: [],
      currentStep: 0,
    }));
  };

  const startSimulation = () => {
    if (tributes.length < 2 || events.length === 0) return;
    const resetTributes = tributes.map((t) => ({ ...t, isAlive: true, kills: 0 }));
    onTributesChange(resetTributes);
    setGameState({
      tributes: resetTributes,
      events,
      objects: objects.length > 0 ? objects : DEFAULT_OBJECTS,
      isRunning: true,
      currentPhase: "day", // Will be triggered by effect or user
      currentPhaseNumber: 0,
      logs: [],
      winner: null,
      pendingEvents: [],
      currentStep: 0,
    });
    sfx("day");
    // Trigger first phase immediately
    setTimeout(() => preparePhase("day"), 0);
  };

  // Dopo un giorno: banchetto ogni N giorni (config), altrimenti notte.
  // Dopo una notte o un banchetto: sempre un nuovo giorno.
  const getNextPhaseType = (): "day" | "night" | "feast" => {
    const lastPhase = gameState.logs[gameState.logs.length - 1]?.phase;
    if (lastPhase === "day") {
      const frequency = Math.max(1, config.feastFrequency);
      return gameState.currentPhaseNumber % frequency === frequency - 1 ? "feast" : "night";
    }
    return "day";
  };

  const nextPhase = () => {
    const alive = tributes.filter((t) => t.isAlive);
    if (alive.length <= 1) {
      sfx("victory");
      setGameState((prev) => ({ ...prev, currentPhase: "finished", winner: alive[0] || null }));
      onWinner(alive[0] || null, gameState.logs);
      return;
    }

    const nextPhaseType = getNextPhaseType();
    sfx(nextPhaseType);
    preparePhase(nextPhaseType);
  };

  const resetSimulation = () => {
    if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    const resetTributes = tributes.map((t) => ({ ...t, isAlive: true, kills: 0 }));
    onTributesChange(resetTributes);
    setGameState({
      tributes: resetTributes,
      events,
      objects: objects.length > 0 ? objects : DEFAULT_OBJECTS,
      isRunning: false,
      currentPhase: "setup",
      currentPhaseNumber: 0,
      logs: [],
      winner: null,
      pendingEvents: [],
      currentStep: 0,
    });
  };

  const generateSummary = (): string => {
    let summary = "HUNGER GAMES - RIASSUNTO FINALE\n\n";
    summary += `Tributi: ${tributes.length}\n`;
    summary += `Morti: ${tributes.filter((t) => !t.isAlive).length}\n\n`;
    if (gameState.winner) {
      summary += `VINCITORE: ${gameState.winner.name}\nUccisioni: ${gameState.winner.kills}\n\n`;
    }
    summary += "CRONOLOGIA:\n\n";
    for (const log of gameState.logs) {
      const phaseName = log.phase === "day" ? "Giorno" : log.phase === "night" ? "Notte" : "Banchetto";
      summary += `${phaseName} ${log.phaseNumber}\n`;
      for (const event of log.events) {
        summary += `- ${event.text}\n`;
      }
      if (log.deaths.length > 0) {
        const deadNames = log.deaths.map((id) => tributes.find((t) => t.id === id)?.name).filter(Boolean).join(", ");
        summary += `Caduti: ${deadNames}\n`;
      }
      summary += "\n";
    }
    return summary;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateSummary());
  };

  const getPhaseBadgeClass = () => {
    switch (gameState.currentPhase) {
      case "day": return "phase-badge phase-day";
      case "night": return "phase-badge phase-night";
      case "feast": return "phase-badge phase-feast";
      default: return "phase-badge";
    }
  };

  const PhaseIcon = () => {
    switch (gameState.currentPhase) {
      case "day": return <Sun className="text-primary" size={24} />;
      case "night": return <Moon className="text-accent" size={24} />;
      case "feast": return <Utensils className="text-destructive" size={24} />;
      default: return null;
    }
  };

  // Render Helpers
  const renderDistrictGrid = () => {
    const groupedTributes = tributes.reduce((acc, tribute) => {
      const district = tribute.district || 0;
      if (!acc[district]) acc[district] = [];
      acc[district].push(tribute);
      return acc;
    }, {} as Record<number, Tribute[]>);

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in">
        {Object.entries(groupedTributes)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([district, districtTributes]) => (
            <div
              key={district}
              className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4"
            >
              <div className="text-center text-xs font-bold tracking-widest text-primary/80">
                {Number(district) > 0 ? `DISTRETTO ${district}` : "SCONOSCIUTO"}
              </div>
              <div className="flex items-center justify-around">
                {districtTributes.map((tribute) => (
                  <TributeCard key={tribute.id} tribute={tribute} size="md" showKills />
                ))}
              </div>
            </div>
          ))}
      </div>
    );
  };

  const isSimulating = gameState.isRunning && gameState.currentPhase !== "summary" && gameState.currentPhase !== "finished";
  const showSummaryGrid = gameState.currentPhase === "summary" || gameState.currentPhase === "finished" || gameState.currentPhase === "setup";

  const getPhaseBackgroundImage = () => {
    const images = config.phaseImages || DEFAULT_CONFIG.phaseImages;
    if (!images) return null;
    
    // Determine which phase image to show
    let phaseType: "day" | "night" | "feast" | null = null;

    if (gameState.currentPhase === "day") phaseType = "day";
    else if (gameState.currentPhase === "night") phaseType = "night";
    else if (gameState.currentPhase === "feast") phaseType = "feast";
    else if (gameState.currentPhase === "setup") phaseType = "day"; // Show day image during setup
    else if (gameState.currentPhase === "summary" && gameState.logs.length > 0) {
      // Show background of the phase that just finished
      const lastLog = gameState.logs[gameState.logs.length - 1];
      phaseType = lastLog.phase;
    }

    if (!phaseType) return null;
    return images[phaseType];
  };

  const bgImage = getPhaseBackgroundImage();

  return (
    <Card className="card-game relative min-h-[80vh] flex flex-col overflow-hidden isolate">
      {/* Dynamic Background Layer */}
      {bgImage && (
        <>
          <div 
            className="absolute inset-0 z-0 transition-all duration-1000 ease-in-out"
            style={{
              backgroundImage: `url("${withBase(bgImage)}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div 
            className="absolute inset-0 z-[1] bg-black transition-opacity duration-1000"
            style={{ opacity: config.overlayOpacity ?? 0.7 }}
          />
        </>
      )}

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>

      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 font-serif">
          <div className="flex items-center gap-2">
            <Trophy className="text-primary" />
            <span className="gold-text">Arena</span>
          </div>
          {gameState.isRunning && (
            <div className={getPhaseBadgeClass()}>
              <PhaseIcon />
              <span className="ml-2">
                {gameState.currentPhase === "day" && `Giorno ${gameState.currentPhaseNumber}`}
                {gameState.currentPhase === "night" && `Notte ${gameState.currentPhaseNumber}`}
                {gameState.currentPhase === "feast" && "Banchetto"}
                {gameState.currentPhase === "summary" && "Riepilogo"}
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-grow space-y-6 flex flex-col relative z-10">
        
        {/* NARRATIVE AREA (Top Focus) */}
        {isSimulating && (
          <div 
            ref={eventListRef}
            className="flex-grow max-h-[60vh] overflow-y-auto space-y-3 p-2 rounded-lg bg-black/20"
          >
            {gameState.pendingEvents.slice(0, gameState.currentStep).map((event) => (
              <div
                key={event.id}
                className={`animate-fade-in rounded-lg p-4 shadow-md ${
                  event.deaths.length > 0 ? "border-l-4 border-l-destructive animate-shake" : "border-l-4 border-l-primary/20"
                }`}
                style={{
                  backgroundColor: hexToRgba(popupColor, popupOpacity),
                  color: textColor,
                }}
              >
                {/* Tribute Images */}
                <div className="flex flex-wrap justify-center gap-4 mb-3">
                  {event.participants.map((participantId) => {
                    const tribute = tributes.find((t) => t.id === participantId);
                    if (!tribute) return null;

                    return (
                      <div key={participantId} className="flex flex-col items-center gap-1 group relative">
                        {tribute.image ? (
                          <img
                            src={withBase(tribute.image)}
                            alt={tribute.name}
                            className="w-16 h-16 rounded-md border-2 border-primary/50 object-cover shadow-lg transition-transform hover:scale-105"
                            title={tribute.name}
                          />
                        ) : (
                          <div 
                            className="w-16 h-16 rounded-md border-2 border-primary/50 shadow-lg flex items-center justify-center bg-accent text-accent-foreground text-xl font-bold select-none"
                            title={tribute.name}
                          >
                            {tribute.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 whitespace-nowrap bg-black/80 px-1 rounded">
                          {tribute.name}
                        </span>
                        
                        {/* Death Indicator overlay */}
                        {event.deaths.includes(participantId) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-md">
                            <Skull className="text-destructive w-8 h-8" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-lg font-medium leading-relaxed text-center">{event.text}</p>
                {event.deaths.length > 0 && (
                  <p className="mt-2 text-sm text-destructive font-bold uppercase tracking-wider flex items-center gap-2">
                    <Skull size={16} />
                    Fatale per: {event.deaths.map(id => tributes.find(t => t.id === id)?.name).join(", ")}
                  </p>
                )}
              </div>
            ))}
            {gameState.currentStep === 0 && (
              <div className="text-center text-muted-foreground py-10 italic">
                La fase sta per iniziare...
              </div>
            )}
          </div>
        )}

        {/* SUMMARY LOG (Miniaturized for Summary Phase) */}
        {gameState.currentPhase === "summary" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 mb-4">
            <p className="flex items-center gap-2 font-medium text-destructive text-lg mb-2">
              <Skull size={20} />
              Caduti in questa fase
            </p>
            <p className="text-base text-muted-foreground">
              {gameState.logs[gameState.logs.length - 1]?.deaths.length > 0 
                ? gameState.logs[gameState.logs.length - 1].deaths
                    .map((id) => tributes.find((t) => t.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")
                : "Nessun morto in questa fase."}
            </p>
          </div>
        )}

        {/* TRIBUTES GRID (Bottom / Hidden during Focus) */}
        <div className={`transition-all duration-500 ${isSimulating ? "opacity-10 blur-sm pointer-events-none scale-95 grayscale" : "opacity-100"}`}>
          {showSummaryGrid ? (
            renderDistrictGrid()
          ) : (
            /* Flat Grid for Setup/Running (blurred) */
            <div className="grid grid-cols-6 gap-3 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
              {tributes.map((tribute) => (
                <TributeCard key={tribute.id} tribute={tribute} size="sm" showKills />
              ))}
            </div>
          )}
        </div>

      </CardContent>

      {/* STICKY FOOTER CONTROLS */}
      <div className="sticky bottom-0 z-20 border-t bg-background/95 backdrop-blur p-4 mt-auto">
        <div className="flex flex-wrap justify-center gap-3">
          {gameState.currentPhase === "setup" && (
            <Button onClick={startSimulation} className="btn-gold" size="lg">
              <Play size={20} className="mr-2" />
              Inizia Simulazione
            </Button>
          )}

          {isSimulating && (
            <>
              {gameState.currentStep < gameState.pendingEvents.length ? (
                <>
                  <Button onClick={handleNextEvent} className="btn-gold w-48 shadow-lg text-lg" size="lg">
                    <ArrowRight size={24} className="mr-2" />
                    Prossimo Evento
                  </Button>
                  <Button onClick={handleSkip} variant="outline" size="lg" className="shadow-sm">
                    <FastForward size={20} className="mr-2" />
                    Salta
                  </Button>
                </>
              ) : (
                <Button onClick={finalizePhase} className="btn-gold w-full max-w-md animate-pulse shadow-xl" size="lg">
                  <Eye size={24} className="mr-2" />
                  Vedi Riepilogo
                </Button>
              )}
            </>
          )}

          {gameState.currentPhase === "summary" && (
            <Button onClick={nextPhase} className="btn-gold w-full max-w-md shadow-lg" size="lg">
              <SkipForward size={20} className="mr-2" />
              {getNextPhaseType() === "feast" ? "Vai al Banchetto" : "Prossima Fase"}
            </Button>
          )}

          {gameState.currentPhase === "finished" && (
            <>
              <Button onClick={copyToClipboard} variant="outline" size="lg">
                <Copy size={20} className="mr-2" />
                Copia Riassunto
              </Button>
              <Button onClick={resetSimulation} className="btn-gold" size="lg">
                <RotateCcw size={20} className="mr-2" />
                Nuova Partita
              </Button>
            </>
          )}

          {gameState.isRunning && (
             <Button onClick={resetSimulation} variant="ghost" size="sm" className="absolute right-4 top-4 opacity-50 hover:opacity-100">
               <RotateCcw size={16} />
             </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

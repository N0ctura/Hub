"use client";

import type { Tribute, SimulationLog } from "@/lib/game-types";
import { TributeCard } from "./tribute-card";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Copy, Skull, Share2 } from "lucide-react";

interface VictoryScreenProps {
  winner: Tribute | null;
  tributes: Tribute[];
  logs: SimulationLog[];
  onReset: () => void;
}

export function VictoryScreen({ winner, tributes, logs, onReset }: VictoryScreenProps) {
  const generateSummary = (): string => {
    let summary = "HUNGER GAMES - RIASSUNTO FINALE\n\n";
    summary += `Tributi: ${tributes.length}\nMorti: ${tributes.filter((t) => !t.isAlive).length}\n\n`;
    if (winner) {
      summary += `VINCITORE: ${winner.name}\nUccisioni: ${winner.kills}\n\n`;
    }
    summary += "CRONOLOGIA:\n\n";
    for (const log of logs) {
      const phaseName = log.phase === "day" ? "Giorno" : log.phase === "night" ? "Notte" : "Banchetto";
      summary += `${phaseName} ${log.phaseNumber}\n`;
      for (const event of log.events) {
        summary += `- ${event.text}\n`;
      }
      if (log.deaths.length > 0) {
        const deadNames = log.deaths
          .map((id) => tributes.find((t) => t.id === id)?.name)
          .filter(Boolean)
          .join(", ");
        summary += `Caduti: ${deadNames}\n`;
      }
      summary += "\n";
    }
    return summary;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateSummary());
  };

  const shareLink = () => {
    const shareData = {
      t: tributes.map((t) => ({ n: t.name, i: t.image })),
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(shareData)));
    const url = `${window.location.origin}/hunger-games?share=${encoded}`;
    navigator.clipboard.writeText(url);
  };

  const topKillers = [...tributes]
    .filter((t) => t.kills > 0)
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 5);

  return (
    <div className="animate-fade-in space-y-8">
      {/* Winner Card */}
      {winner && (
        <div className="text-center">
          <div className="mx-auto inline-block rounded-xl border border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 p-8">
            <Trophy size={56} className="mx-auto mb-4 animate-pulse-gold text-primary" />
            <h2 className="gold-text mb-4 font-serif text-3xl font-bold">VINCITORE</h2>
            <div className="my-6 flex justify-center">
              <TributeCard tribute={winner} size="lg" showKills />
            </div>
            <p className="text-muted-foreground">
              {winner.kills > 0
                ? `Ha eliminato ${winner.kills} tribut${winner.kills === 1 ? "o" : "i"}`
                : "Ha sopravvissuto senza uccidere"}
            </p>
          </div>
        </div>
      )}

      {/* Top Killers */}
      {topKillers.length > 0 && (
        <div className="card-game p-6">
          <h3 className="mb-4 flex items-center gap-2 font-serif text-lg">
            <Skull className="text-destructive" size={20} />
            Top Assassini
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            {topKillers.map((t) => (
              <TributeCard key={t.id} tribute={t} size="md" showKills />
            ))}
          </div>
        </div>
      )}

      {/* Event Log */}
      <div className="card-game max-h-[400px] overflow-y-auto p-6">
        <h3 className="mb-4 font-serif text-lg">Cronologia Completa</h3>
        <div className="space-y-4">
          {logs.map((log) => {
            const phaseName = log.phase === "day" ? "Giorno" : log.phase === "night" ? "Notte" : "Banchetto";
            return (
              <div key={log.id} className="space-y-2">
                <h4 className="text-sm font-semibold text-primary">
                  {phaseName} {log.phaseNumber}
                </h4>
                {log.events.map((event) => (
                  <div
                    key={event.id}
                    className={`rounded bg-secondary/50 p-2 text-sm ${
                      event.deaths.length > 0 ? "border-l-2 border-l-destructive" : ""
                    }`}
                  >
                    {event.text}
                  </div>
                ))}
                {log.deaths.length > 0 && (
                  <p className="text-xs text-destructive">
                    Caduti:{" "}
                    {log.deaths
                      .map((id) => tributes.find((t) => t.id === id)?.name)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={copyToClipboard} variant="outline" size="lg">
          <Copy size={20} className="mr-2" />
          Copia Riassunto
        </Button>
        <Button onClick={shareLink} variant="outline" size="lg">
          <Share2 size={20} className="mr-2" />
          Condividi Link
        </Button>
        <Button onClick={onReset} className="btn-gold" size="lg">
          <RotateCcw size={20} className="mr-2" />
          Nuova Partita
        </Button>
      </div>
    </div>
  );
}

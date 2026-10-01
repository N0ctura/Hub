"use client";

import { useState } from "react";
import Link from "next/link";
import { Swords, Lock, Sparkles, Gamepad2 } from "lucide-react";
import { ParticleBackground } from "@/components/particle-background";
import { Navbar } from "@/components/navbar";

const games = [
  {
    title: "Hunger Games Simulator",
    description: "Crea la tua arena personalizzata con tributi, eventi e sorprese mortali.",
    icon: Swords,
    href: "/hunger-games",
    available: true,
  },
  {
    title: "Wolvesville",
    description: "Lupi mannari e villici in una battaglia notturna di astuzia.",
    icon: Gamepad2,
    href: "#",
    available: false,
  },
  {
    title: "Battle Royale",
    description: "100 giocatori, una sola zona sicura. Chi sopravvive?",
    icon: Gamepad2,
    href: "#",
    available: false,
  },
  {
    title: "Arena Gladiatori",
    description: "Combattimenti 1v1 in stile romano con gladiatori leggendari.",
    icon: Gamepad2,
    href: "/gladiators",
    available: true,
  },
];

export default function HomePage() {
  const [logo, setLogo] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <ParticleBackground />
      <Navbar logo={logo} onLogoChange={setLogo} />

      <main className="relative z-10">
        {/* Hero */}
        <section className="flex flex-col items-center justify-center px-4 pb-16 pt-20 text-center">
          <div className="animate-float">
            <Sparkles size={48} className="mx-auto mb-4 text-primary" />
          </div>
          <h1 className="gold-text text-balance font-serif text-4xl font-bold tracking-wide sm:text-5xl md:text-6xl">
            Celestial Elysium Hub
          </h1>
          <p className="mt-4 max-w-xl text-balance leading-relaxed text-muted-foreground">
            Il tuo portale gaming definitivo. Scegli il tuo gioco, personalizza tutto
            e condividi le tue avventure con il mondo.
          </p>
        </section>

        {/* Game Selector Grid */}
        <section className="mx-auto max-w-5xl px-4 pb-20">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-foreground">
            Seleziona un Gioco
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {games.map((game) => {
              const Icon = game.icon;
              const content = (
                <div
                  key={game.title}
                  className={`group relative flex flex-col items-center rounded-xl border p-6 text-center transition-all duration-300 ${
                    game.available
                      ? "cursor-pointer border-primary/30 bg-card hover:border-primary hover:shadow-[0_0_30px_hsl(43_90%_55%/0.2)] hover:-translate-y-1"
                      : "cursor-default border-border/50 bg-card/50 opacity-60"
                  }`}
                >
                  <div
                    className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                      game.available
                        ? "bg-primary/10 text-primary group-hover:bg-primary/20"
                        : "bg-muted text-muted-foreground"
                    } transition-colors`}
                  >
                    <Icon size={28} />
                  </div>
                  <h3 className="mb-2 font-serif text-lg font-semibold text-foreground">
                    {game.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {game.description}
                  </p>
                  {!game.available && (
                    <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock size={12} />
                      <span>Coming Soon</span>
                    </div>
                  )}
                  {game.available && (
                    <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      <Sparkles size={12} />
                      Gioca Ora
                    </div>
                  )}
                </div>
              );

              return game.available ? (
                <Link key={game.title} href={game.href}>
                  {content}
                </Link>
              ) : (
                <div key={game.title}>{content}</div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/50 py-6">
        <p className="text-center text-sm text-muted-foreground">
          Celestial Elysium Hub - Il portale gaming celeste
        </p>
      </footer>
    </div>
  );
}

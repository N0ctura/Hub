"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sword, Shield, Skull, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GladiatorsPage() {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const classes = [
    { id: "murmillo", name: "Murmillo", icon: Shield, desc: "Pesantemente armato, scudo grande.", stats: "Difesa ++" },
    { id: "retiarius", name: "Retiarius", icon: Trophy, desc: "Agile, armato di rete e tridente.", stats: "Velocità ++" },
    { id: "thraex", name: "Thraex", icon: Sword, desc: "Scudo piccolo, spada curva.", stats: "Attacco ++" },
  ];

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 font-serif">
      {/* Navbar Rapida */}
      <nav className="border-b border-red-900/50 bg-stone-950/80 p-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors">
            <ArrowLeft size={20} />
            <span>Torna all'Hub</span>
          </Link>
          <div className="flex items-center gap-2 text-xl font-bold tracking-widest text-red-600">
            <Skull size={24} />
            <span>COLOSSEUM</span>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl p-8">
        <header className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-black text-red-600 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            Arena Gladiatori
          </h1>
          <p className="text-xl text-stone-400 italic">
            "Coloro che stanno per morire ti salutano."
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Selezione Classe */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-stone-300 border-b border-stone-700 pb-2">Scegli il tuo Campione</h2>
            <div className="grid gap-4">
              {classes.map((cls) => (
                <Card 
                  key={cls.id}
                  onClick={() => setSelectedClass(cls.id)}
                  className={`cursor-pointer border-2 bg-stone-800 transition-all hover:scale-[1.02] ${
                    selectedClass === cls.id ? "border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)]" : "border-stone-700 hover:border-stone-500"
                  }`}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`rounded-full p-3 ${selectedClass === cls.id ? "bg-red-900/50 text-red-500" : "bg-stone-900 text-stone-500"}`}>
                      <cls.icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-stone-100">{cls.name}</h3>
                      <p className="text-sm text-stone-400">{cls.desc}</p>
                      <span className="text-xs font-mono text-red-400 mt-1 block">{cls.stats}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Preview Arena */}
          <section className="relative overflow-hidden rounded-xl border-4 border-stone-800 bg-black/50 p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
            {selectedClass ? (
              <div className="animate-in fade-in zoom-in duration-500">
                <Sword size={64} className="mx-auto mb-4 text-red-600 animate-pulse" />
                <h3 className="text-2xl font-bold text-white mb-2">Pronto a combattere!</h3>
                <p className="text-stone-400 mb-6">Hai scelto la via del <span className="text-red-500 font-bold">{classes.find(c => c.id === selectedClass)?.name}</span>.</p>
                <Button className="bg-red-700 hover:bg-red-800 text-white font-bold py-6 px-8 text-lg rounded-none border border-red-500">
                  ENTRA NELL'ARENA
                </Button>
              </div>
            ) : (
              <div className="text-stone-600">
                <Shield size={48} className="mx-auto mb-4 opacity-20" />
                <p>Seleziona una classe per iniziare</p>
              </div>
            )}
            
            {/* Background pattern */}
            <div className="absolute inset-0 -z-10 opacity-30"></div>
          </section>
        </div>
      </main>
    </div>
  );
}

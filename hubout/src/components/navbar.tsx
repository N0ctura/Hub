"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { Home, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppearanceSettings } from "@/components/ui/appearance-settings";

interface NavbarProps {
  logo: string | null;
  onLogoChange: (logo: string | null) => void;
  showHome?: boolean;
}

export function Navbar({ logo, onLogoChange, showHome }: NavbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onLogoChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <header className="relative z-20 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {showHome && (
            <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
              <Home size={20} />
              <span className="sr-only">Home</span>
            </Link>
          )}

          {logo ? (
            <div className="relative group">
              <img
                src={logo || "/placeholder.svg"}
                alt="Logo personalizzato"
                className="max-h-10 max-w-[140px] object-contain"
              />
              <button
                onClick={() => onLogoChange(null)}
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                type="button"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <span className="gold-text font-serif text-lg font-bold">CEH</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-muted-foreground hover:text-primary"
          >
            <ImageIcon size={16} />
            <span className="ml-1.5 hidden sm:inline text-xs">Logo</span>
          </Button>
          
          <AppearanceSettings />
        </div>
      </nav>
    </header>
  );
}

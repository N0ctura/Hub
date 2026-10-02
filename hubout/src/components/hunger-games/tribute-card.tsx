"use client";

import type { Tribute } from "@/lib/game-types";
import { Skull, X, User } from "lucide-react";

interface TributeCardProps {
  tribute: Tribute;
  size?: "sm" | "md" | "lg";
  onRemove?: () => void;
  showKills?: boolean;
}

export function TributeCard({ tribute, size = "md", onRemove, showKills = false }: TributeCardProps) {
  const sizeClasses = {
    sm: "w-12 h-12 text-xs",
    md: "w-20 h-20 text-sm",
    lg: "w-24 h-24 text-base",
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  return (
    <div className="flex flex-col items-center gap-1 animate-fade-in">
      <div className="relative group">
        <div
          className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 transition-all duration-300 ${
            tribute.isAlive
              ? "border-primary glow-gold"
              : "border-muted grayscale opacity-60"
          }`}
        >
          {tribute.image ? (
            <img
              src={tribute.image || `${basePath}/placeholder.svg`}
              alt={tribute.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
              <User size={iconSizes[size]} className="text-muted-foreground" />
            </div>
          )}

          {!tribute.isAlive && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Skull className="text-destructive" size={iconSizes[size]} />
            </div>
          )}
        </div>

        {onRemove && tribute.isAlive && (
          <button
            onClick={onRemove}
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive opacity-0 transition-opacity group-hover:opacity-100"
            type="button"
          >
            <X size={12} className="text-destructive-foreground" />
          </button>
        )}

        {showKills && tribute.kills > 0 && (
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-destructive text-xs font-bold text-destructive-foreground">
            {tribute.kills}
          </div>
        )}
      </div>

      <span
        className={`max-w-[80px] truncate text-center font-medium ${
          tribute.isAlive ? "text-foreground" : "text-muted-foreground line-through"
        }`}
      >
        {tribute.name}
      </span>
    </div>
  );
}

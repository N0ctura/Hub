"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface AppearanceState {
  popupColor: string;
  popupOpacity: number;
  textColor: string;
}

interface AppearanceContextType extends AppearanceState {
  setPopupColor: (color: string) => void;
  setPopupOpacity: (opacity: number) => void;
  setTextColor: (color: string) => void;
  resetDefaults: () => void;
}

const DEFAULT_SETTINGS: AppearanceState = {
  popupColor: "#1c1917", // stone-900 equivalent
  popupOpacity: 0.9,
  textColor: "#ffffff",
};

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [popupColor, setPopupColorState] = useState(DEFAULT_SETTINGS.popupColor);
  const [popupOpacity, setPopupOpacityState] = useState(DEFAULT_SETTINGS.popupOpacity);
  const [textColor, setTextColorState] = useState(DEFAULT_SETTINGS.textColor);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load from localStorage on mount
    const savedSettings = localStorage.getItem("appearance-settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.popupColor) setPopupColorState(parsed.popupColor);
        if (parsed.popupOpacity !== undefined) setPopupOpacityState(parsed.popupOpacity);
        if (parsed.textColor) setTextColorState(parsed.textColor);
      } catch (e) {
        console.error("Failed to parse appearance settings", e);
      }
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        "appearance-settings",
        JSON.stringify({ popupColor, popupOpacity, textColor })
      );
    }
  }, [popupColor, popupOpacity, textColor, mounted]);

  const setPopupColor = (color: string) => setPopupColorState(color);
  const setPopupOpacity = (opacity: number) => setPopupOpacityState(opacity);
  const setTextColor = (color: string) => setTextColorState(color);

  const resetDefaults = () => {
    setPopupColorState(DEFAULT_SETTINGS.popupColor);
    setPopupOpacityState(DEFAULT_SETTINGS.popupOpacity);
    setTextColorState(DEFAULT_SETTINGS.textColor);
  };

  return (
    <AppearanceContext.Provider
      value={{
        popupColor,
        popupOpacity,
        textColor,
        setPopupColor,
        setPopupOpacity,
        setTextColor,
        resetDefaults,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (context === undefined) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }
  return context;
}

// Helper to convert hex to rgba
export function hexToRgba(hex: string, alpha: number): string {
  let r = 0, g = 0, b = 0;
  
  // Handle short hex like #fff
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

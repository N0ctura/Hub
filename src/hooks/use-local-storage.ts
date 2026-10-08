"use client";

import { useState, useCallback, useEffect, useRef } from "react";

// Salvataggio sicuro: un errore di quota/parsing NON deve mai far crashare la pagina.
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const latest = useRef<T>(initialValue);
  // true solo DOPO aver letto il localStorage (evita di sovrascrivere i dati salvati con i default)
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item) as T;
        latest.current = parsed;
        setStoredValue(parsed);
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      try { window.localStorage.removeItem(key); } catch {}
    }
    setHydrated(true);
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      const next = value instanceof Function ? value(latest.current) : value;
      latest.current = next;
      setStoredValue(next);
      // setItem FUORI dal render/updater, con try/catch
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("ceh-storage-full", { detail: key }));
        }
      }
    },
    [key]
  );

  return [storedValue, setValue, hydrated];
}

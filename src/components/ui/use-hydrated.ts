"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Ist die Seite im Browser interaktiv? Auf dem Server und vor dem Hydrieren `false`. Felder, deren
 * Wert React steuert, sind bis dahin gesperrt: Eine Eingabe davor ginge sonst beim Hydrieren
 * verloren oder würde mit dem gespeicherten Text vermischt.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

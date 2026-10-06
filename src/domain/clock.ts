/**
 * Uhr-Modul: die einzige Quelle für „jetzt“ in der Fachlogik.
 *
 * Fachregeln rufen nie `new Date()` direkt auf, sondern `now()`. Tests stellen die Uhr
 * mit `setFixedNow()` auf einen festen Zeitpunkt (z. B. Montag 9:00 Uhr) und setzen sie
 * mit `resetClock()` zurück. Für Demo und Browser-Tests lässt sich ein fester Zeitpunkt
 * außerdem per Umgebungsvariable `APP_FIXED_NOW` vorgeben (nicht in Produktion).
 */

export interface Clock {
  now(): Date;
}

/** Echte Uhrzeit des Systems. */
export const systemClock: Clock = {
  now: () => new Date(),
};

/** Uhr, die immer denselben Zeitpunkt liefert. */
export function fixedClock(instant: Date | string): Clock {
  const time = parseInstant(instant).getTime();
  return { now: () => new Date(time) };
}

let current: Clock | undefined;

/** Aktueller Zeitpunkt laut eingestellter Uhr. Liefert immer eine neue Date-Instanz. */
export function now(): Date {
  return (current ?? clockFromEnvironment()).now();
}

/** Stellt eine beliebige Uhr ein (z. B. für Tests). */
export function setClock(clock: Clock): void {
  current = clock;
}

/** Stellt die Uhr fest auf den angegebenen Zeitpunkt. */
export function setFixedNow(instant: Date | string): void {
  current = fixedClock(instant);
}

/** Zurück zur Standarduhr (Systemzeit oder `APP_FIXED_NOW`). */
export function resetClock(): void {
  current = undefined;
}

/**
 * Standarduhr aus der Umgebung: `APP_FIXED_NOW` (ISO-8601) gilt nur außerhalb von
 * `NODE_ENV=production`, sonst die Systemzeit.
 */
export function clockFromEnvironment(env: Record<string, string | undefined> = process.env): Clock {
  const fixed = env.APP_FIXED_NOW?.trim();
  if (fixed && env.NODE_ENV !== "production") {
    return fixedClock(fixed);
  }
  return systemClock;
}

function parseInstant(instant: Date | string): Date {
  const date = typeof instant === "string" ? new Date(instant) : new Date(instant.getTime());
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Ungültiger Zeitpunkt für die Uhr: ${String(instant)}`);
  }
  return date;
}

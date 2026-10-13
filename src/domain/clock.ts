/**
 * Uhr-Modul: die einzige Quelle für „jetzt“ in der Fachlogik.
 *
 * Fachregeln rufen nie `new Date()` direkt auf, sondern `now()`. Tests stellen die Uhr
 * mit `setFixedNow()` auf einen festen Zeitpunkt (z. B. Montag 9:00 Uhr) und setzen sie
 * mit `resetClock()` zurück. Für Demo und Browser-Tests lässt sich ein fester Zeitpunkt
 * außerdem per Umgebungsvariable `APP_FIXED_NOW` vorgeben (nicht in Produktion, AK-1201).
 * `setFixedNow()` und `setClock()` rufen nur Tests und die Testschnittstelle auf (`src/app/api/test/`, nur
 * außerhalb von Produktion mit Test-Login), nie der Anwendungscode.
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

/**
 * Die eingestellte Uhr liegt auf `globalThis`, nicht im Modul: Next.js bündelt Route-Handler, Seiten und
 * Serveraktionen getrennt, jedes Bündel hätte sonst eine eigene Kopie dieses Moduls. So gilt eine über die
 * Testschnittstelle gestellte Uhr in der ganzen App.
 */
const CLOCK_KEY: unique symbol = Symbol.for("berichtsheft.clock");
const slot = globalThis as unknown as { [CLOCK_KEY]?: Clock };

/** Aktueller Zeitpunkt laut eingestellter Uhr. Liefert immer eine neue Date-Instanz. */
export function now(): Date {
  return (slot[CLOCK_KEY] ?? clockFromEnvironment()).now();
}

/** Stellt eine beliebige Uhr ein (z. B. für Tests). */
export function setClock(clock: Clock): void {
  slot[CLOCK_KEY] = clock;
}

/** Stellt die Uhr fest auf den angegebenen Zeitpunkt. */
export function setFixedNow(instant: Date | string): void {
  slot[CLOCK_KEY] = fixedClock(instant);
}

/** Zurück zur Standarduhr (Systemzeit oder `APP_FIXED_NOW`). */
export function resetClock(): void {
  delete slot[CLOCK_KEY];
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

/** Ein Zeitpunkt, der sich nicht lesen lässt. */
export class InvalidInstantError extends Error {
  constructor(instant: Date | string) {
    super(`Ungültiger Zeitpunkt für die Uhr: ${String(instant)}`);
    this.name = "InvalidInstantError";
  }
}

function parseInstant(instant: Date | string): Date {
  const date = typeof instant === "string" ? new Date(instant) : new Date(instant.getTime());
  if (Number.isNaN(date.getTime())) {
    throw new InvalidInstantError(instant);
  }
  return date;
}

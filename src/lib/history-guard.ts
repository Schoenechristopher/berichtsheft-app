/**
 * Unveränderliche Historie (AK-803): Statuswechsel und Kommentare lassen sich auch an der Fachlogik
 * vorbei weder ändern noch löschen, und ein Bericht mit Historie nicht einzeln. Das erzwingen
 * Datenbank-Trigger (Migrationen `20261006130221_init`, `20261007090000_einreichen_pruefen`); sie
 * melden den festen SQLSTATE `BH803` (Migration `20261013090000_historie_fehlercode`).
 */

/** SQLSTATE, mit dem die Datenbank einen Schreibversuch auf die Historie abweist. */
export const HISTORY_IMMUTABLE_SQLSTATE = "BH803";

/** Hat die Datenbank einen Schreibversuch auf die Historie abgewiesen? Erkennt den festen Code, nie den Text. */
export function isHistoryImmutableError(error: unknown): boolean {
  const cause = (error as { meta?: { driverAdapterError?: { cause?: { originalCode?: unknown } } } } | null)?.meta
    ?.driverAdapterError?.cause;
  return cause?.originalCode === HISTORY_IMMUTABLE_SQLSTATE;
}

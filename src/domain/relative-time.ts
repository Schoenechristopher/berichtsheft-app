/**
 * Zeit relativ zu „jetzt“ für Listen (UI-Spezifikation, „Benachrichtigungen“): „vor 2 Std.“,
 * absolut im Tooltip. Reine Funktion; „jetzt“ kommt vom Aufrufer (Uhr-Modul).
 */
export function relativeTime(instant: Date, now: Date): string {
  const seconds = Math.round((now.getTime() - instant.getTime()) / 1000);
  if (seconds < 60) {
    return "gerade eben";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `vor ${minutes} Min.`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `vor ${hours} Std.`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) {
    return "vor 1 Tag";
  }
  if (days < 30) {
    return `vor ${days} Tagen`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? "vor 1 Monat" : `vor ${months} Monaten`;
  }
  const years = Math.floor(days / 365);
  return years <= 1 ? "vor 1 Jahr" : `vor ${years} Jahren`;
}

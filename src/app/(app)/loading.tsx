/** Ladezustand beim Seitenwechsel innerhalb der App (Kopfzeile und Menü bleiben stehen). */
export default function Loading() {
  return (
    <p role="status" aria-live="polite" className="text-sm text-slate-600" data-testid="page-loading">
      Wird geladen …
    </p>
  );
}

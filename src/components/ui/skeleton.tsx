/**
 * Ladezustand (UI-AK-20): Platzhalter-Balken in der Form des Inhalts, kein Ladekreis über der
 * ganzen Seite. Erscheint erst nach 300 ms (`animate-skeleton-in`), damit schnelle Antworten
 * nicht flackern.
 */
export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <span aria-hidden="true" className={`bg-surface-muted block animate-pulse rounded-md ${className}`} />;
}

/** Bereich, der gerade lädt: für Screenreader „Wird geladen …“, sichtbar die Platzhalter. */
export function SkeletonGroup({ label = "Wird geladen …", children }: { label?: string; children: React.ReactNode }) {
  return (
    <div aria-busy="true" data-skeleton="" className="animate-skeleton-in space-y-3">
      <p className="sr-only">{label}</p>
      {children}
    </div>
  );
}

/** Platzhalter für eine Liste mit `rows` Zeilen. */
export function ListSkeleton({ rows = 5, label }: { rows?: number; label?: string }) {
  return (
    <SkeletonGroup label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-card border-border bg-surface flex items-center gap-4 border p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      ))}
    </SkeletonGroup>
  );
}

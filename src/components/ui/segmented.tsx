import Link from "next/link";

/**
 * Segment-Auswahl als Filter mit Links (z. B. „Alle / Offen / Eingereicht / Freigegeben“): Der
 * aktive Eintrag trägt `aria-current`. Ohne JavaScript bedienbar, Browser-Zurück funktioniert.
 */
export function SegmentLinks({
  label,
  items,
}: {
  label: string;
  items: { href: string; label: string; active: boolean }[];
}) {
  return (
    <nav aria-label={label} className="max-w-full">
      <ul className="border-border-strong bg-surface inline-flex max-w-full flex-wrap gap-1 rounded-md border p-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded px-3 text-sm font-medium lg:min-h-8 ${
                item.active ? "bg-accent text-on-accent" : "text-fg hover:bg-surface-muted"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

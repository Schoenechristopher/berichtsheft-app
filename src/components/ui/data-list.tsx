import Link from "next/link";

/**
 * Liste / Tabelle (UI-Spezifikation): ab `md` als Tabelle mit Kopfzeile in --surface-muted und
 * sichtbarer Sortierung am Spaltenkopf, darunter als Kartenliste. Technisch bleibt es eine Liste
 * (`ul` mit Namen), deren Einträge ab `md` in Spalten stehen: So gibt es nur eine Struktur für
 * beide Breiten, und jede Zeile ist mit genau einem Link ganz klickbar.
 */
export interface Column {
  label: string;
  /** Sortierung dieser Spalte, sichtbar am Kopf („neueste zuerst“). */
  sort?: "asc" | "desc";
  className?: string;
}

export function DataList({
  label,
  columns,
  grid,
  children,
}: {
  label: string;
  columns: Column[];
  /** Spalten ab `md`, z. B. `md:grid-cols-[10rem_1fr_auto]`. */
  grid: string;
  children: React.ReactNode;
}) {
  return (
    <div className="md:rounded-card md:border-border md:bg-surface min-w-0 md:overflow-hidden md:border">
      <div
        aria-hidden="true"
        className={`border-border bg-surface-muted text-fg-muted hidden gap-4 border-b px-4 py-2 text-sm font-medium md:grid ${grid}`}
      >
        {columns.map((column) => (
          <span key={column.label} className={column.className}>
            {column.label}
            {column.sort ? <span className="ml-1">{column.sort === "desc" ? "↓" : "↑"}</span> : null}
          </span>
        ))}
      </div>
      <ul aria-label={label} className="md:divide-border space-y-2 md:space-y-0 md:divide-y">
        {children}
      </ul>
    </div>
  );
}

/**
 * Zeile mit genau einem Link, der die ganze Zeile klickbar macht. `highlight` hebt sie mit linker
 * Kante hervor (z. B. offene Woche in der Vergangenheit).
 */
export function DataRow({
  grid,
  highlight,
  selected,
  children,
  ...props
}: {
  grid: string;
  highlight?: "warning" | "danger";
  selected?: boolean;
  children: React.ReactNode;
} & React.LiHTMLAttributes<HTMLLIElement> & { [key: `data-${string}`]: string | undefined }) {
  const edge =
    highlight === "warning"
      ? "border-l-4 border-l-overdue"
      : highlight === "danger"
        ? "border-l-4 border-l-danger"
        : "";
  return (
    <li
      className={`rounded-card border-border hover:bg-surface-muted relative grid min-w-0 grid-cols-1 items-center gap-x-4 gap-y-1 border p-4 md:rounded-none md:border-0 md:border-l-4 md:px-4 md:py-3 ${grid} ${
        selected ? "bg-accent-soft" : "bg-surface"
      } ${edge} ${highlight ? "" : "md:border-l-transparent"}`}
      {...props}
    >
      {children}
    </li>
  );
}

/** Der eine Link einer Zeile; seine Fläche deckt die ganze Zeile ab. */
export function RowLink({
  href,
  children,
  className = "",
  ...props
}: React.ComponentProps<typeof Link> & { className?: string }) {
  return (
    <Link
      href={href}
      className={`text-accent font-medium after:absolute after:inset-0 after:content-[''] hover:underline ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}

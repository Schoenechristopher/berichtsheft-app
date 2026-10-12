/**
 * Karte: Rahmen --border, Radius 10 px, Innenabstand 16/24 px. „Hervorgehoben“ mit linker Kante
 * 4 px in Akzent- oder Warnfarbe. Karten haben Rahmen statt Schatten.
 */
export function Card({
  highlight,
  className = "",
  as: Tag = "div",
  children,
  ...props
}: {
  highlight?: "accent" | "warning" | "danger";
  className?: string;
  as?: "div" | "section" | "article" | "li";
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const edge =
    highlight === "accent"
      ? "border-l-4 border-l-accent"
      : highlight === "warning"
        ? "border-l-4 border-l-overdue"
        : highlight === "danger"
          ? "border-l-4 border-l-danger"
          : "";
  return (
    <Tag className={`rounded-card border-border bg-surface min-w-0 border p-4 md:p-6 ${edge} ${className}`} {...props}>
      {children}
    </Tag>
  );
}

/** Abschnitt als Karte mit Überschrift (18 px), z. B. in den Einstellungen. */
export function SectionCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card as="section" aria-labelledby={id} className="space-y-4">
      <div className="space-y-1">
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        {description ? <div className="text-fg-muted text-sm">{description}</div> : null}
      </div>
      {children}
    </Card>
  );
}

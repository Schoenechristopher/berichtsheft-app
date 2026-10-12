"use client";

/**
 * Segment-Auswahl mit Optionsfeldern (z. B. Darstellung „System / Hell / Dunkel“). Native
 * Radio-Knöpfe: Pfeiltasten wechseln, die Gruppe hat eine sichtbare Beschriftung.
 */
export function SegmentRadio<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  describedBy,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  describedBy?: string;
}) {
  return (
    <fieldset className="min-w-0 space-y-2" aria-describedby={describedBy}>
      <legend className="text-fg text-sm font-medium">{legend}</legend>
      <div className="border-border-strong bg-surface inline-flex max-w-full flex-wrap gap-1 rounded-md border p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={`has-[:focus-visible]:outline-focus relative inline-flex min-h-10 cursor-pointer items-center rounded px-4 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 lg:min-h-9 ${
              value === option.value ? "bg-accent text-on-accent" : "text-fg hover:bg-surface-muted"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

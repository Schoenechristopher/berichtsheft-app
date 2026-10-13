"use client";

import { useEffect, useState } from "react";
import { DAY_TYPES, DAY_TYPE_LABELS } from "@/domain/report-days";
import { inputClass } from "./field";

/** Zwischen `md` und `xl` als Segment-Auswahl, sonst als Ausklappliste (UI-Spezifikation). */
const SEGMENT_QUERY = "(min-width: 768px) and (max-width: 1279.98px)";

function useSegment(): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(SEGMENT_QUERY);
    const update = () => setMatch(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return match;
}

/**
 * Auswahl Tagesart: genau die fünf Werte (AK-402). Am Handy und in der Fünf-Spalten-Ansicht ab
 * 1280 px eine Ausklappliste, dazwischen eine Segment-Auswahl (Optionsgruppe mit Pfeiltasten).
 * Es gibt immer nur eine der beiden Formen; den Wert trägt dann ein verborgenes Feld gleichen
 * Namens. Ein vorbelegter Feiertag trägt den Hinweis „Feiertag (vorbelegt)“.
 */
export function DayTypeInput({
  id,
  name,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
  holidayPreset,
  placeholder,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  holidayPreset?: boolean;
  placeholder: string;
}) {
  const segment = useSegment() && !disabled;
  const labelId = `${id}-label`;
  const labelFor = (type: string) =>
    type === "HOLIDAY" && holidayPreset
      ? "Feiertag (vorbelegt)"
      : DAY_TYPE_LABELS[type as keyof typeof DAY_TYPE_LABELS];

  if (segment) {
    const current = DAY_TYPES.indexOf(value as (typeof DAY_TYPES)[number]);
    const move = (delta: number) => {
      const next = DAY_TYPES[(Math.max(current, 0) + delta + DAY_TYPES.length) % DAY_TYPES.length];
      onChange(next);
      document.getElementById(`${id}-${next}`)?.focus();
    };
    return (
      <>
        <input type="hidden" name={name} value={value} />
        <div
          id={id}
          role="radiogroup"
          data-feld="tagesart"
          aria-labelledby={labelId}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`bg-surface flex flex-wrap gap-1 rounded-md border p-1 ${invalid ? "border-danger border-2" : "border-border-strong"}`}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowDown") {
              event.preventDefault();
              move(1);
            } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
              event.preventDefault();
              move(-1);
            }
          }}
        >
          {DAY_TYPES.map((type, index) => {
            const checked = value === type;
            return (
              <button
                key={type}
                id={`${id}-${type}`}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked || (current === -1 && index === 0) ? 0 : -1}
                onClick={() => onChange(type)}
                className={`min-h-10 rounded px-3 text-sm font-medium ${
                  checked ? "bg-accent text-on-accent" : "text-fg hover:bg-surface-muted"
                }`}
              >
                {labelFor(type)}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <select
      id={id}
      name={name}
      data-feld="tagesart"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={inputClass}
    >
      <option value="">{placeholder}</option>
      {DAY_TYPES.map((type) => (
        <option key={type} value={type}>
          {labelFor(type)}
        </option>
      ))}
    </select>
  );
}

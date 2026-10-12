"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Badge } from "@/components/ui/status-chip";
import { ArrowUpIcon } from "@/components/ui/icons";

export interface QueueItem {
  id: string;
  traineeName: string;
  week: string;
  range: string;
  submittedAt: string;
  resubmitted: boolean;
  substitute: boolean;
  traineeInactive: boolean;
}

/**
 * Einträge der Prüfliste (AK-601, UI-Spezifikation „Prüfansicht“): je Eintrag Azubi, KW,
 * Einreichungsdatum und „Erneut eingereicht“ ab Runde 2. Ab 1024 px wählt ein Eintrag den
 * Bericht rechts (`?bericht=<id>`), die ausgewählte Zeile ist in --accent-soft hinterlegt und die
 * Pfeiltasten wechseln die Auswahl; darunter öffnet ein Eintrag die Berichtsseite (UI-AK-12).
 */
export function ReviewQueueList({
  items,
  selectedId,
  filterQuery,
}: {
  items: QueueItem[];
  selectedId: string | null;
  /** z. B. „filter=alle&“ */
  filterQuery: string;
}) {
  const router = useRouter();
  const listRef = useRef<HTMLUListElement>(null);
  const hrefFor = (id: string) => `/ausbilder/pruefliste?${filterQuery}bericht=${id}`;

  return (
    <ul
      ref={listRef}
      aria-label="Eingereichte Berichte"
      className="lg:divide-border space-y-2 lg:space-y-0 lg:divide-y"
      onKeyDown={(event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
          return;
        }
        const index = items.findIndex((item) => item.id === selectedId);
        const next = items[Math.min(Math.max(index + (event.key === "ArrowDown" ? 1 : -1), 0), items.length - 1)];
        if (!next) {
          return;
        }
        event.preventDefault();
        router.push(hrefFor(next.id));
        listRef.current?.querySelector<HTMLElement>(`[data-select="${next.id}"]`)?.focus();
      }}
    >
      {items.map((item) => {
        const selected = item.id === selectedId;
        const content = (
          <>
            <span className="text-accent block font-medium break-words">{item.traineeName}</span>
            <span className="block text-sm tabular-nums">
              {item.week} · {item.range}
            </span>
            <span className="text-fg-muted block text-sm tabular-nums">eingereicht am {item.submittedAt}</span>
          </>
        );
        return (
          <li
            key={item.id}
            data-testid="review-row"
            data-selected={selected ? "true" : undefined}
            className={`rounded-card border-border relative border p-4 lg:rounded-none lg:border-0 lg:px-4 lg:py-3 ${
              selected ? "lg:bg-accent-soft" : "bg-surface hover:bg-surface-muted"
            }`}
          >
            {/* Unter 1024 px: Berichtsseite. */}
            <Link href={`/berichte/${item.id}`} className="block after:absolute after:inset-0 lg:hidden">
              {content}
            </Link>
            {/* Ab 1024 px: Auswahl für den rechten Bereich. */}
            <Link
              href={hrefFor(item.id)}
              data-select={item.id}
              aria-current={selected ? "true" : undefined}
              className="hidden after:absolute after:inset-0 lg:block"
            >
              {content}
            </Link>
            {item.resubmitted || item.substitute || item.traineeInactive ? (
              <span className="mt-2 flex flex-wrap gap-2">
                {item.resubmitted ? (
                  <Badge tone="accent">
                    <ArrowUpIcon className="mr-1 h-3.5 w-3.5" />
                    Erneut eingereicht
                  </Badge>
                ) : null}
                {item.substitute ? <Badge>Vertretung</Badge> : null}
                {item.traineeInactive ? <Badge>deaktiviert</Badge> : null}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

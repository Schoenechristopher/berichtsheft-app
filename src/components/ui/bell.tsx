"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { BellIcon } from "./icons";
import { Skeleton, SkeletonGroup } from "./skeleton";

/** Adresse, unter der die Glocke den aktuellen Zähler abfragt. */
export const UNREAD_COUNT_URL = "/api/benachrichtigungen/ungelesen";
/** Vorschau der letzten 5 Benachrichtigungen. */
export const PREVIEW_URL = "/api/benachrichtigungen/vorschau";

export interface PreviewItem {
  id: string;
  subject: string;
  link: string | null;
  createdAt: string;
  unread: boolean;
  /** z. B. „vor 2 Std.“ */
  relative: string;
  /** z. B. „12.10.2026, 09:00 Uhr“ */
  absolute: string;
}

/** Zähler wie in der Glocke: ab 100 „99+“. */
export function bellCount(unread: number): string {
  return unread > 99 ? "99+" : String(unread);
}

/** Zugänglicher Name der Glocke, z. B. „Benachrichtigungen, 3 ungelesen“ (UI-AK-03). */
export function bellLabel(unread: number): string {
  return unread > 0 ? `Benachrichtigungen, ${unread} ungelesen` : "Benachrichtigungen";
}

const BELL_CLASS =
  "relative h-11 w-11 items-center justify-center rounded-md text-fg hover:bg-surface-muted aria-expanded:bg-surface-muted";

/**
 * Glocke in der Kopfzeile mit Zähler ungelesener App-Benachrichtigungen (AK-1015, UI-AK-03). Den
 * ersten Wert liefert der Server; bei jedem Seitenwechsel fragt die Glocke neu nach. Ab 1024 px
 * öffnet ein Klick eine Vorschau der letzten 5 mit „Alle anzeigen“; darunter führt die Glocke
 * direkt zur Seite Benachrichtigungen. Die Vorschau markiert nichts als gelesen – das tut erst die
 * Liste (AK-1015). Der Zähler wird nicht bei jeder Änderung vorgelesen (kein aria-live).
 */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PreviewItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Seitenwechsel schließt die Vorschau.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch(UNREAD_COUNT_URL, { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { unread?: number } | null) => {
        if (typeof data?.unread === "number") {
          setUnread(data.unread);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const controller = new AbortController();
    fetch(PREVIEW_URL, { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: { items: PreviewItem[] }) => setItems(data.items))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setFailed(true);
        }
      });
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      controller.abort();
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const label = bellLabel(unread);
  return (
    <div ref={wrapperRef} className="relative">
      {/* Unter 1024 px: Link direkt zur Seite. */}
      <Link
        href="/benachrichtigungen"
        aria-label={label}
        title={label}
        className={`${BELL_CLASS} inline-flex lg:hidden`}
      >
        <BellIcon />
      </Link>
      {/* Ab 1024 px: Vorschau als Ausklappmenü. */}
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setItems(null);
          setFailed(false);
          setOpen((current) => !current);
        }}
        className={`${BELL_CLASS} hidden lg:inline-flex`}
      >
        <BellIcon />
      </button>
      {unread > 0 ? (
        <span
          aria-hidden="true"
          data-testid="notification-count"
          className="bg-danger text-on-danger pointer-events-none absolute top-0.5 right-0.5 min-w-5 rounded-full px-1 text-center text-xs leading-5 font-semibold tabular-nums"
        >
          {bellCount(unread)}
        </span>
      ) : null}
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label="Neueste Benachrichtigungen"
          className="rounded-card border-border bg-surface text-fg absolute top-full right-0 z-40 mt-2 w-96 max-w-[calc(100vw-2rem)] border p-2 shadow-xl"
        >
          {failed ? (
            <p className="text-fg-muted p-3 text-sm">Die Daten konnten nicht geladen werden.</p>
          ) : items === null ? (
            <div className="p-2">
              <SkeletonGroup label="Benachrichtigungen werden geladen">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="space-y-1.5">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </SkeletonGroup>
            </div>
          ) : items.length === 0 ? (
            <p className="text-fg-muted p-3 text-sm">Keine Benachrichtigungen.</p>
          ) : (
            <ul className="divide-border divide-y" aria-label="Letzte Benachrichtigungen">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.link ?? "/benachrichtigungen"}
                    onClick={() => setOpen(false)}
                    className="hover:bg-surface-muted flex gap-2 rounded-md p-2"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.unread ? "bg-accent" : "bg-transparent"}`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium break-words">
                        {item.unread ? <span className="sr-only">Neu: </span> : null}
                        {item.subject}
                      </span>
                      <span className="text-fg-muted block text-xs" title={item.absolute}>
                        {item.relative}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="border-border border-t p-2">
            <Link
              href="/benachrichtigungen"
              onClick={() => setOpen(false)}
              className="text-accent inline-flex min-h-10 items-center text-sm font-medium hover:underline"
            >
              Alle anzeigen
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

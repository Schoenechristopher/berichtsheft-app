"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Adresse, unter der die Glocke den aktuellen Zähler abfragt. */
export const UNREAD_COUNT_URL = "/api/benachrichtigungen/ungelesen";

/**
 * Glocke in der Kopfzeile mit Zähler ungelesener App-Benachrichtigungen (AK-1015). Den ersten Wert
 * liefert der Server; bei jedem Seitenwechsel fragt die Glocke neu nach – das Layout selbst wird
 * beim Navigieren innerhalb der App nicht neu erzeugt.
 */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [fetchedUnread, setUnread] = useState(initialUnread);
  const pathname = usePathname();
  // Die Liste markiert beim Öffnen alles als gelesen (AK-1015). Während sie noch lädt
  // (Ladezustand), stünde in der Datenbank noch der alte Zähler – auf ihr zeigt die Glocke daher 0.
  const onList = pathname.startsWith("/benachrichtigungen");
  const unread = onList ? 0 : fetchedUnread;
  useEffect(() => {
    if (onList) {
      return;
    }
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
  }, [pathname, onList]);
  const label = unread > 0 ? `Benachrichtigungen: ${unread} ungelesen` : "Benachrichtigungen";
  return (
    <Link
      href="/benachrichtigungen"
      aria-label={label}
      title={label}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {unread > 0 ? (
        <span
          data-testid="notification-count"
          className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-red-700 px-1 text-center text-xs leading-5 font-semibold text-white"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

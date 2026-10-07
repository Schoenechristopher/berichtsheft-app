import Link from "next/link";
import { homePathFor, roleLabel } from "@/domain/access";
import { NotificationBell } from "@/components/NotificationBell";
import { logout } from "@/lib/auth/logout";
import { db } from "@/lib/db";
import { devMailboxEnabled } from "@/lib/notifications/config";
import { countUndeliverable, countUnread } from "@/lib/notifications/service";
import { currentPath, requirePerson } from "@/lib/session";

const navLinkClass = "text-blue-700 hover:underline";

/** Rahmen für alle Seiten nach der Anmeldung. Ohne gültige Sitzung geht es zur Anmeldung. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const person = await requirePerson();
  // Die Liste der Benachrichtigungen markiert beim Öffnen alles als gelesen (AK-1015); auf ihr
  // zeigt die Glocke deshalb keinen Zähler – Layout und Seite werden gleichzeitig erzeugt.
  const onNotifications = (await currentPath())?.startsWith("/benachrichtigungen") ?? false;
  const unread = onNotifications ? 0 : await countUnread(db(), person.id);
  const devMailbox = devMailboxEnabled();
  // Nicht zustellbare Nachrichten: Hinweis nur für Ausbilder (bestätigte Auslegung 12).
  const undeliverable = await countUndeliverable(db(), person);

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link href={homePathFor(person.role)} className="font-semibold text-slate-900">
            Berichtsheft
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-slate-600" data-testid="current-person">
              {person.name} · {roleLabel(person.role)}
            </span>
            <NotificationBell initialUnread={unread} />
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-50"
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>
        {/* „Hauptmenü“ nur für Ausbilder (Admin-Funktionen, AK-104); Azubis haben ein eigenes „Menü“. */}
        <nav aria-label={person.role === "TRAINER" ? "Hauptmenü" : "Menü"} className="mx-auto max-w-4xl px-4 pb-2">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {person.role === "TRAINER" ? (
              <>
                <li>
                  <Link href="/ausbilder" className={navLinkClass}>
                    Start
                  </Link>
                </li>
                <li>
                  <Link href="/ausbilder/pruefliste" className={navLinkClass}>
                    Prüfliste
                  </Link>
                </li>
                <li>
                  <Link href="/ausbilder/personen" className={navLinkClass}>
                    Personen
                  </Link>
                </li>
                <li>
                  <Link href="/ausbilder/einstellungen" className={navLinkClass}>
                    Einstellungen
                  </Link>
                </li>
                {undeliverable > 0 ? (
                  <li>
                    <Link
                      href="/ausbilder/nicht-zustellbar"
                      className="font-medium text-red-700 hover:underline"
                      data-testid="undeliverable-count"
                    >
                      Nicht zustellbar ({undeliverable})
                    </Link>
                  </li>
                ) : null}
              </>
            ) : (
              <>
                <li>
                  <Link href="/azubi" className={navLinkClass}>
                    Meine Wochen
                  </Link>
                </li>
                <li>
                  <Link href="/einstellungen" className={navLinkClass}>
                    Einstellungen
                  </Link>
                </li>
              </>
            )}
            {devMailbox ? (
              <li>
                <Link href="/entwickler-postfach" className={navLinkClass}>
                  Teams-Postfach (Demo)
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}

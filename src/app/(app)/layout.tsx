import Link from "next/link";
import { homePathFor, roleLabel } from "@/domain/access";
import { logout } from "@/lib/auth/logout";
import { requirePerson } from "@/lib/session";

/** Rahmen für alle Seiten nach der Anmeldung. Ohne gültige Sitzung geht es zur Anmeldung. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const person = await requirePerson();

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
        {person.role === "TRAINER" ? (
          <nav aria-label="Hauptmenü" className="mx-auto max-w-4xl px-4 pb-2">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <li>
                <Link href="/ausbilder" className="text-blue-700 hover:underline">
                  Start
                </Link>
              </li>
              <li>
                <Link href="/ausbilder/pruefliste" className="text-blue-700 hover:underline">
                  Prüfliste
                </Link>
              </li>
              <li>
                <Link href="/ausbilder/personen" className="text-blue-700 hover:underline">
                  Personen
                </Link>
              </li>
              <li>
                <Link href="/ausbilder/einstellungen" className="text-blue-700 hover:underline">
                  Einstellungen
                </Link>
              </li>
            </ul>
          </nav>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}

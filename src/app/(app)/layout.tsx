import { roleLabel } from "@/domain/access";
import { logout } from "@/lib/auth/logout";
import { requirePerson } from "@/lib/session";

/** Rahmen für alle Seiten nach der Anmeldung. Ohne gültige Sitzung geht es zur Anmeldung. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const person = await requirePerson();

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <span className="font-semibold text-slate-900">Berichtsheft</span>
          <div className="flex items-center gap-3 text-sm">
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
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}

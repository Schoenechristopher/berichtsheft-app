/** Schlichte Karte für Anmelde- und Hinweisseiten, mobil zuerst (375 px). */
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium tracking-wide text-slate-500 uppercase">Berichtsheft</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{title}</h1>
        <div className="mt-4 space-y-4">{children}</div>
      </div>
    </main>
  );
}

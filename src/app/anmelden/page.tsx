import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthCard } from "@/components/AuthCard";
import { homePathFor, safeReturnPath } from "@/domain/access";
import { OIDC_PROVIDER_ID, TEST_PROVIDER_ID, oidcConfig, testLoginEnabled } from "@/lib/auth/config";
import { getCurrentPerson } from "@/lib/session";
import { testAccounts } from "@/lib/seed-data";

/** Anmeldeseite (AK-101): nur über das Firmenkonto, kein eigenes Passwort in der App. */
export default async function LoginPage({ searchParams }: PageProps<"/anmelden">) {
  const params = await searchParams;
  // AK-1003: Rücksprung zum Ziel eines Benachrichtigungs-Links nach der Anmeldung.
  const target = safeReturnPath(params.ziel) ?? "/";
  const person = await getCurrentPerson();
  if (person) {
    redirect(target === "/" ? homePathFor(person.role) : target);
  }

  const oidc = oidcConfig();
  const showTestLogin = testLoginEnabled();

  async function loginWithCompanyAccount() {
    "use server";
    await signIn(OIDC_PROVIDER_ID, { redirectTo: target });
  }

  async function loginWithTestAccount(formData: FormData) {
    "use server";
    if (!testLoginEnabled()) {
      redirect("/anmelden");
    }
    await signIn(TEST_PROVIDER_ID, { accountId: String(formData.get("accountId") ?? ""), redirectTo: target });
  }

  return (
    <AuthCard title="Anmelden">
      {params.abgemeldet ? (
        <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          Sie wurden abgemeldet.
        </p>
      ) : null}
      {params.error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          Die Anmeldung ist fehlgeschlagen. Bitte erneut versuchen.
        </p>
      ) : null}

      {target !== "/" ? (
        <p role="status" className="rounded-md bg-slate-100 p-3 text-sm text-slate-700">
          Bitte melden Sie sich an. Danach geht es direkt zur aufgerufenen Seite.
        </p>
      ) : null}

      <p className="text-sm text-slate-600">Die Anmeldung erfolgt ausschließlich mit Ihrem Firmenkonto.</p>

      {oidc ? (
        <form action={loginWithCompanyAccount}>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-700 px-4 py-2.5 font-medium text-white hover:bg-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          >
            Mit {oidc.name} anmelden
          </button>
        </form>
      ) : (
        <p className="text-sm text-red-700">Keine Anmeldung konfiguriert (AUTH_OIDC_ISSUER fehlt).</p>
      )}

      {showTestLogin ? (
        <section
          aria-labelledby="test-login"
          className="rounded-md border border-dashed border-amber-400 bg-amber-50 p-3"
        >
          <h2 id="test-login" className="text-sm font-semibold text-amber-900">
            Test-Login (nur Entwicklung)
          </h2>
          <p className="mt-1 text-xs text-amber-900">
            Ersetzt den Identity Provider, wenn Keycloak nicht läuft. In Produktion abgeschaltet.
          </p>
          <form action={loginWithTestAccount} className="mt-2 grid grid-cols-2 gap-2">
            {testAccounts.map((account) => (
              <button
                key={account.accountId}
                type="submit"
                name="accountId"
                value={account.accountId}
                className="rounded-md border border-amber-400 bg-white px-2 py-1.5 text-sm text-amber-950 hover:bg-amber-100"
              >
                {account.name.split(" ")[0]}
              </button>
            ))}
          </form>
        </section>
      ) : null}
    </AuthCard>
  );
}

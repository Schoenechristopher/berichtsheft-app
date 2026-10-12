import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthCard } from "@/components/AuthCard";
import { Button, Notice } from "@/components/ui";
import { homePathFor, safeReturnPath } from "@/domain/access";
import { OIDC_PROVIDER_ID, TEST_PROVIDER_ID, oidcConfig, testLoginEnabled } from "@/lib/auth/config";
import { getCurrentPerson } from "@/lib/session";
import { testAccounts } from "@/lib/seed-data";

export const metadata: Metadata = { title: "Anmelden" };

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
      {params.abgemeldet ? <Notice tone="success">Sie wurden abgemeldet.</Notice> : null}
      {params.error ? <Notice tone="error">Die Anmeldung ist fehlgeschlagen. Bitte erneut versuchen.</Notice> : null}

      {target !== "/" ? (
        <Notice tone="info" role="status">
          Bitte melden Sie sich an. Danach geht es direkt zur aufgerufenen Seite.
        </Notice>
      ) : null}

      <p className="text-fg-muted">Die Anmeldung erfolgt ausschließlich mit Ihrem Firmenkonto.</p>

      {oidc ? (
        <form action={loginWithCompanyAccount}>
          <Button type="submit" variant="primary" className="w-full">
            Mit {oidc.name} anmelden
          </Button>
        </form>
      ) : (
        <Notice tone="error">Keine Anmeldung konfiguriert (AUTH_OIDC_ISSUER fehlt).</Notice>
      )}

      {showTestLogin ? (
        <section
          aria-labelledby="test-login"
          className="border-overdue bg-overdue-bg text-overdue rounded-md border border-dashed p-3"
        >
          <h2 id="test-login" className="text-sm font-semibold">
            Test-Login (nur Entwicklung)
          </h2>
          <p className="mt-1 text-sm">
            Ersetzt den Identity Provider, wenn Keycloak nicht läuft. In Produktion abgeschaltet.
          </p>
          <form action={loginWithTestAccount} className="mt-2 grid grid-cols-2 gap-2">
            {testAccounts.map((account) => (
              <Button
                key={account.accountId}
                type="submit"
                name="accountId"
                value={account.accountId}
                variant="secondary"
              >
                {account.name.split(" ")[0]}
              </Button>
            ))}
          </form>
        </section>
      ) : null}
    </AuthCard>
  );
}

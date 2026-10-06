import NextAuth, { customFetch, type NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import { decideAccess, extractAccountId, extractLoginClaims, type LoginClaims } from "@/domain/access";
import {
  OIDC_PROVIDER_ID,
  SESSION_MAX_AGE_SECONDS,
  SESSION_STRATEGY,
  TEST_PROVIDER_ID,
  oidcConfig,
  testLoginEnabled,
  toInternalUrl,
} from "@/lib/auth/config";
import { resolveLoginPerson } from "@/lib/auth/login";
import { db } from "@/lib/db";
import { testAccounts } from "@/lib/seed-data";

declare module "next-auth" {
  interface Session {
    /** ID der angemeldeten Person in der App-Datenbank. */
    personId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    personId?: string;
    provider?: string;
    /** ID-Token des IdP, nur serverseitig für das Abmelden beim IdP (RP-initiated Logout). */
    idToken?: string;
  }
}

/** Seite mit dem Hinweis „Kein Zugang – bitte an den Ausbilder wenden“ (AK-102). */
export const NO_ACCESS_PATH = "/kein-zugang";

function buildProviders(): Provider[] {
  const providers: Provider[] = [];
  const oidc = oidcConfig();
  if (oidc) {
    providers.push({
      id: OIDC_PROVIDER_ID,
      name: oidc.name,
      type: "oidc",
      issuer: oidc.issuer,
      clientId: oidc.clientId,
      clientSecret: oidc.clientSecret,
      checks: ["pkce", "state", "nonce"],
      authorization: { params: { scope: "openid profile email" } },
      profile(profile) {
        return {
          id: extractAccountId(profile, oidc.accountIdClaim) ?? "",
          name: typeof profile.name === "string" ? profile.name : null,
          email: typeof profile.email === "string" ? profile.email : null,
        };
      },
      [customFetch]: (input: RequestInfo | URL, init?: RequestInit) => {
        if (input instanceof Request) {
          return fetch(new Request(toInternalUrl(input.url, oidc), input), init);
        }
        return fetch(toInternalUrl(input.toString(), oidc), init);
      },
    });
  }
  if (testLoginEnabled()) {
    // Nur Entwicklung/Tests ohne Keycloak: meldet ein Konto per Konto-ID an, ohne Passwort.
    providers.push(
      Credentials({
        id: TEST_PROVIDER_ID,
        name: "Test-Login",
        credentials: { accountId: { label: "Konto-ID", type: "text" } },
        authorize(credentials) {
          if (!testLoginEnabled()) {
            return null;
          }
          const accountId = typeof credentials?.accountId === "string" ? credentials.accountId.trim() : "";
          // Wie beim echten Identity Provider: Konto-ID und bestätigte E-Mail des Testkontos.
          const account = testAccounts.find((candidate) => candidate.accountId === accountId);
          return account ? { id: account.accountId, email: account.email } : null;
        },
      }),
    );
  }
  return providers;
}

const NO_CLAIMS: LoginClaims = { accountId: null, email: null, emailVerified: false };

/**
 * Angaben des gerade anmeldenden Kontos: stabile Konto-ID und, nur für die Zuordnung beim
 * ersten Login, die vom Identity Provider bestätigte E-Mail.
 */
function claimsFromSignIn(params: {
  account?: { provider: string; providerAccountId: string } | null;
  profile?: Record<string, unknown>;
  user?: { id?: string; email?: string | null };
}): LoginClaims {
  if (params.account?.provider === OIDC_PROVIDER_ID) {
    return extractLoginClaims(params.profile, oidcConfig() ?? {});
  }
  if (params.account?.provider === TEST_PROVIDER_ID && testLoginEnabled()) {
    return extractLoginClaims({ sub: params.user?.id, email: params.user?.email, email_verified: true });
  }
  return NO_CLAIMS;
}

export const authConfig = {
  providers: buildProviders(),
  // Entscheidung „Sitzungen“: signierte JWT-Cookies, 8 Stunden gültig.
  session: { strategy: SESSION_STRATEGY, maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: "/anmelden", error: "/anmelden" },
  trustHost: true,
  callbacks: {
    async signIn({ account, profile, user }) {
      // Beim ersten Login wird hier die Konto-ID an die angelegte Person gebunden.
      const person = await resolveLoginPerson(db(), claimsFromSignIn({ account, profile, user }));
      // AK-102: ohne Eintrag oder deaktiviert → Hinweis statt Sitzung.
      return decideAccess(person).allowed ? true : NO_ACCESS_PATH;
    },
    async jwt({ token, account, profile, user }) {
      if (account) {
        const { accountId } = claimsFromSignIn({ account, profile, user });
        const person = accountId ? await db().person.findUnique({ where: { accountId } }) : null;
        if (!person) {
          throw new Error("Person zur Anmeldung nicht gefunden");
        }
        token.personId = person.id;
        token.provider = account.provider;
        token.idToken = account.id_token;
        token.name = person.name;
        token.email = person.email;
      }
      return token;
    },
    session({ session, token }) {
      session.personId = token.personId;
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

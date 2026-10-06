"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getToken } from "next-auth/jwt";
import { signOut } from "@/auth";
import { OIDC_PROVIDER_ID, oidcConfig, toInternalUrl } from "@/lib/auth/config";

const AFTER_LOGOUT_PATH = "/anmelden?abgemeldet=1";

/**
 * Abmelden (AK-106): löscht die Sitzung der App und beendet zusätzlich die Sitzung beim
 * Identity Provider (RP-initiated Logout). Danach ist für jeden Zugriff eine erneute
 * Anmeldung mit Passwort beim Firmenkonto nötig.
 */
export async function logout(): Promise<never> {
  const appUrl = process.env.AUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";
  const token = await getToken({
    req: { headers: await headers() },
    secret: process.env.AUTH_SECRET,
    secureCookie: appUrl.startsWith("https://"),
  });

  await signOut({ redirect: false });

  const idpLogout =
    token?.provider === OIDC_PROVIDER_ID ? await idpLogoutUrl(token.idToken, new URL(AFTER_LOGOUT_PATH, appUrl)) : null;
  redirect(idpLogout ?? AFTER_LOGOUT_PATH);
}

let endSessionEndpoint: Promise<string | null> | undefined;

async function idpLogoutUrl(idToken: string | undefined, postLogoutRedirect: URL): Promise<string | null> {
  const config = oidcConfig();
  if (!config) {
    return null;
  }
  endSessionEndpoint ??= discoverEndSessionEndpoint(config).then((endpoint) => {
    if (!endpoint) endSessionEndpoint = undefined;
    return endpoint;
  });
  const endpoint = await endSessionEndpoint;
  if (!endpoint) {
    return null;
  }
  const url = new URL(endpoint);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("post_logout_redirect_uri", postLogoutRedirect.toString());
  if (idToken) {
    url.searchParams.set("id_token_hint", idToken);
  }
  return url.toString();
}

async function discoverEndSessionEndpoint(config: NonNullable<ReturnType<typeof oidcConfig>>): Promise<string | null> {
  try {
    const response = await fetch(toInternalUrl(`${config.issuer}/.well-known/openid-configuration`, config), {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return null;
    }
    const metadata = (await response.json()) as { end_session_endpoint?: unknown };
    return typeof metadata.end_session_endpoint === "string" ? metadata.end_session_endpoint : null;
  } catch (error) {
    console.error("Abmelden beim Identity Provider nicht möglich:", error);
    return null;
  }
}

/**
 * „Mit anderem Konto anmelden“ nach abgewiesener Anmeldung (AK-102): beendet die Sitzung
 * beim Identity Provider, damit dort ein anderes Konto gewählt werden kann.
 */
export async function switchAccount(): Promise<never> {
  const appUrl = process.env.AUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";
  await signOut({ redirect: false });
  const idpLogout = await idpLogoutUrl(undefined, new URL("/anmelden", appUrl));
  redirect(idpLogout ?? "/anmelden");
}

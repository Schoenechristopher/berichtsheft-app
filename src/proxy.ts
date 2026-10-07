import { NextResponse, type NextRequest } from "next/server";
import { PATH_HEADER } from "@/lib/request-path";

/**
 * Gibt den aufgerufenen Pfad an die Seiten weiter: Ohne Sitzung leitet `requirePerson` damit zur
 * Anmeldung mit Rücksprungziel um (AK-1003). Der Header kommt nur von hier, ein mitgeschickter
 * Wert des Browsers wird überschrieben.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(PATH_HEADER, request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico).*)"],
};

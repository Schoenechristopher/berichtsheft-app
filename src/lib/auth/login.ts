import { matchLogin, type LoginClaims } from "@/domain/access";
import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Sucht die Person zu einem Login und bindet beim ersten Login die Konto-ID
 * (Entscheidung „Anlegen über die Firmen-E-Mail“, Regeln in `matchLogin`).
 * Gibt die Person zurück oder null, wenn das Konto keiner Person zugeordnet werden kann.
 */
export async function resolveLoginPerson(prisma: PrismaClient, claims: LoginClaims) {
  if (!claims.accountId) {
    return null;
  }
  const byAccountId = await prisma.person.findUnique({ where: { accountId: claims.accountId } });
  const byEmail =
    !byAccountId && claims.emailVerified && claims.email
      ? await prisma.person.findUnique({ where: { email: claims.email } })
      : null;

  const match = matchLogin(claims, byAccountId, byEmail);
  switch (match.kind) {
    case "known":
      return byAccountId;
    case "none":
      return null;
    case "bind": {
      // Bedingtes Update: bindet nur, wenn die Person noch ungebunden und aktiv ist.
      const { count } = await prisma.person
        .updateMany({
          where: { id: match.personId, accountId: null, active: true },
          data: { accountId: match.accountId },
        })
        .catch(() => ({ count: 0 }));
      if (count === 0) {
        // Gleichzeitiger Login desselben Kontos: dann ist die Person jetzt schon gebunden.
        return prisma.person.findUnique({ where: { accountId: match.accountId } });
      }
      return prisma.person.findUnique({ where: { id: match.personId } });
    }
  }
}

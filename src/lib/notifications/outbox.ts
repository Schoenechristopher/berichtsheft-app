/**
 * Versand der Outbox im Worker (AK-1004): pro Ereignis, Empfänger und Kanal genau eine Nachricht.
 *
 * Jede Zeile wird in einer eigenen Transaktion geholt und gesperrt (`FOR NO KEY UPDATE SKIP LOCKED`):
 * Parallele Worker überspringen gesperrte Zeilen, eine Nachricht geht also nie von zwei Workern
 * gleichzeitig raus. (`NO KEY`: Ein Adapter darf auf die Zeile verweisen, z. B. das
 * Entwickler-Postfach per Fremdschlüssel, ohne auf die eigene Sperre zu warten.) Erst nach erfolgreichem Versand wird sie in derselben Transaktion als
 * gesendet markiert. Scheitert der Versand, zählt der Worker den Versuch, merkt sich den Fehler
 * und versucht es nach einer Wartezeit erneut; nach `maxAttempts` Fehlversuchen gibt er auf.
 *
 * Absturz zwischen Senden und Markieren: Die Transaktion endet ohne Commit, die Sperre fällt weg,
 * die Zeile gilt weiter als offen und wird beim nächsten Lauf erneut versendet („mindestens
 * einmal“). Das Entwickler-Postfach erkennt die Wiederholung (eindeutig pro Benachrichtigung);
 * E-Mails tragen eine feste Message-ID je Benachrichtigung, sodass Mailserver und Postfächer das
 * Duplikat erkennen können. Das Zeitfenster ist kurz: nur der Commit nach dem Senden.
 */
import { retryDelaySeconds } from "@/domain/notifications";
import type { PrismaClient } from "@/generated/prisma/client";
import type { DeliveryAdapters } from "./adapters";

export interface DeliveryOptions {
  /** „Jetzt“ aus dem Uhr-Modul. */
  now: () => Date;
  maxAttempts: number;
  /** Höchstzahl Zeilen pro Durchlauf. */
  limit?: number;
}

export interface DeliveryResult {
  sent: number;
  retried: number;
  failed: number;
}

/** Hinweis an der Zeile, wenn der Empfänger inzwischen deaktiviert ist (AK-1004, Ergänzung Etappe 6). */
export const RECIPIENT_INACTIVE = "Empfänger deaktiviert – nicht versendet.";

type Outcome = "sent" | "retried" | "failed" | null;

/** Versendet alle fälligen E-Mail- und Teams-Benachrichtigungen. */
export async function deliverPendingNotifications(
  prisma: PrismaClient,
  adapters: DeliveryAdapters,
  options: DeliveryOptions,
): Promise<DeliveryResult> {
  const result: DeliveryResult = { sent: 0, retried: 0, failed: 0 };
  const limit = options.limit ?? 100;
  for (let i = 0; i < limit; i++) {
    const outcome = await deliverOne(prisma, adapters, options);
    if (outcome === null) {
      break;
    }
    result[outcome]++;
  }
  return result;
}

async function deliverOne(
  prisma: PrismaClient,
  adapters: DeliveryAdapters,
  options: DeliveryOptions,
): Promise<Outcome> {
  return prisma.$transaction(
    async (tx): Promise<Outcome> => {
      const current = options.now();
      const [row] = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM notification
        WHERE sent_at IS NULL AND failed_at IS NULL AND channel <> 'APP' AND next_attempt_at <= ${current}
        ORDER BY next_attempt_at, created_at
        LIMIT 1
        FOR NO KEY UPDATE SKIP LOCKED`;
      if (!row) {
        return null;
      }
      const notification = await tx.notification.findUniqueOrThrow({
        where: { id: row.id },
        include: { recipient: { select: { id: true, name: true, email: true, active: true } } },
      });
      if (!notification.recipient.active) {
        await tx.notification.update({
          where: { id: notification.id },
          data: { failedAt: current, lastError: RECIPIENT_INACTIVE },
        });
        return "failed";
      }
      const adapter = notification.channel === "EMAIL" ? adapters.EMAIL : adapters.TEAMS;
      const attempts = notification.attempts + 1;
      try {
        await adapter.send({
          notificationId: notification.id,
          recipient: notification.recipient,
          subject: notification.subject,
          body: notification.body,
          link: notification.link,
        });
      } catch (error) {
        const giveUp = attempts >= options.maxAttempts;
        await tx.notification.update({
          where: { id: notification.id },
          data: {
            attempts,
            lastError: error instanceof Error ? error.message : String(error),
            nextAttemptAt: new Date(current.getTime() + retryDelaySeconds(attempts) * 1000),
            failedAt: giveUp ? current : null,
          },
        });
        return giveUp ? "failed" : "retried";
      }
      await tx.notification.update({
        where: { id: notification.id },
        data: { attempts, sentAt: options.now(), lastError: null },
      });
      return "sent";
    },
    { maxWait: 10_000, timeout: 60_000 },
  );
}

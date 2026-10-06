/**
 * Adapter je Kanal (Entscheidung „E-Mail“ und „Teams“ im Plan). Der Worker kennt nur die
 * Schnittstelle `ChannelAdapter`; welcher Adapter dahinter steckt, entscheidet die Konfiguration.
 *
 * - E-Mail: SMTP über Nodemailer (Demo: Mailpit, produktiv: Exchange Online).
 * - Teams: Demo-Variante „Entwickler-Postfach“ (Tabelle `teams_dev_message`, Seite in der App);
 *   bei der Übernahme Microsoft Graph – dann wird nur `TEAMS_MODE` samt Zugangsdaten getauscht.
 * - App: kein Versand, die Zeile in der Outbox ist die Benachrichtigung.
 */
import nodemailer from "nodemailer";
import type { PrismaClient } from "@/generated/prisma/client";
import type { GraphConfig, NotificationConfig, SmtpConfig } from "./config";

/** Eine zu versendende Nachricht, so wie der Worker sie aus der Outbox liest. */
export interface OutgoingMessage {
  notificationId: string;
  recipient: { id: string; name: string; email: string };
  subject: string;
  body: string;
  /** Pfad in der App (z. B. `/berichte/<id>`). */
  link: string | null;
}

export interface ChannelAdapter {
  /** Versendet die Nachricht oder wirft einen Fehler (dann versucht es der Worker später erneut). */
  send(message: OutgoingMessage): Promise<void>;
}

/** Adapter für die Kanäle mit Versand. */
export interface DeliveryAdapters {
  EMAIL: ChannelAdapter;
  TEAMS: ChannelAdapter;
}

/** Domain des Absenders für die Message-ID, z. B. „example.test“. */
function senderDomain(from: string): string {
  const match = /@([^>\s]+)>?\s*$/.exec(from);
  return match?.[1] ?? "berichtsheft.local";
}

/**
 * Feste Message-ID je Benachrichtigung: Wird eine Nachricht nach einem Absturz zwischen Senden und
 * Markieren erneut verschickt, trägt sie dieselbe ID, und Mailserver bzw. Postfächer können sie als
 * Duplikat erkennen (AK-1004).
 */
export function messageIdFor(notificationId: string, from: string): string {
  return `<notification-${notificationId}@${senderDomain(from)}>`;
}

/** E-Mail per SMTP (Nodemailer). Text auf Deutsch, Betreff mit Anlass und Woche. */
export function createEmailAdapter(smtp: SmtpConfig): ChannelAdapter {
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password ?? "" } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return {
    async send(message) {
      await transport.sendMail({
        from: smtp.from,
        to: { name: message.recipient.name, address: message.recipient.email },
        subject: message.subject,
        text: message.body,
        messageId: messageIdFor(message.notificationId, smtp.from),
        headers: { "X-Berichtsheft-Benachrichtigung": message.notificationId },
      });
    },
  };
}

/**
 * Teams in der Demo: Die Nachricht landet im Entwickler-Postfach (Seite `/entwickler-postfach`).
 * Höchstens eine Nachricht pro Benachrichtigung (eindeutig per notification_id) – ein erneuter
 * Versuch nach einem Absturz legt keine zweite an.
 */
export function createDevMailboxAdapter(prisma: PrismaClient): ChannelAdapter {
  return {
    async send(message) {
      await prisma.teamsDevMessage.createMany({
        data: [
          {
            notificationId: message.notificationId,
            recipientId: message.recipient.id,
            subject: message.subject,
            body: message.body,
            link: message.link,
          },
        ],
        skipDuplicates: true,
      });
    },
  };
}

/**
 * Teams über Microsoft Graph (Übernahme). Welcher Weg für Direktnachrichten freigegeben wird
 * (Chat-Nachricht per Graph, Bot, Aktivitäts-Feed), klärt die IT – siehe Plan, „Mit der IT zu
 * klären“. Bis dahin meldet der Adapter einen eindeutigen Fehler, statt still nichts zu tun.
 */
export function createGraphTeamsAdapter(graph: GraphConfig): ChannelAdapter {
  return {
    async send() {
      void graph;
      throw new Error("Teams über Microsoft Graph ist noch nicht angebunden (TEAMS_MODE=graph).");
    },
  };
}

/** Adapter laut Konfiguration. */
export function createDeliveryAdapters(config: NotificationConfig, prisma: PrismaClient): DeliveryAdapters {
  return {
    EMAIL: createEmailAdapter(config.smtp),
    TEAMS:
      config.teamsMode === "graph" && config.graph
        ? createGraphTeamsAdapter(config.graph)
        : createDevMailboxAdapter(prisma),
  };
}

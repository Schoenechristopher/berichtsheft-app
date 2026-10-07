/**
 * Konfiguration der Benachrichtigungen aus Umgebungsvariablen (siehe .env.example).
 * Externe Dienste werden nur hierüber angebunden: Demo Mailpit und Entwickler-Postfach,
 * bei der Übernahme Exchange Online (SMTP) und Microsoft Graph.
 */

/** Wie der Kanal „Teams“ zugestellt wird. */
export type TeamsMode = "entwickler-postfach" | "graph";

export interface SmtpConfig {
  host: string;
  port: number;
  /** TLS von Beginn an (Port 465); sonst STARTTLS, falls der Server es anbietet. */
  secure: boolean;
  user?: string;
  password?: string;
  /** Absender, z. B. „Berichtsheft <berichtsheft@example.test>“. */
  from: string;
}

export interface GraphConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export interface NotificationConfig {
  /** Öffentliche Adresse der App für Links in Nachrichten (AK-1003). */
  baseUrl: string;
  smtp: SmtpConfig;
  teamsMode: TeamsMode;
  graph: GraphConfig | null;
  /** Wie oft der Worker die Outbox prüft (Sekunden). */
  pollSeconds: number;
  /** Nach so vielen Fehlversuchen gibt der Worker eine Nachricht auf. */
  maxAttempts: number;
}

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function appBaseUrl(env: Record<string, string | undefined> = process.env): string {
  return (env.APP_URL?.trim() || env.AUTH_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}

export function teamsMode(env: Record<string, string | undefined> = process.env): TeamsMode {
  const mode = env.TEAMS_MODE?.trim() || "entwickler-postfach";
  if (mode !== "entwickler-postfach" && mode !== "graph") {
    throw new Error(`TEAMS_MODE „${mode}“ ist unbekannt (erlaubt: entwickler-postfach, graph).`);
  }
  return mode;
}

/** Ist das Entwickler-Postfach (simulierter Teams-Kanal der Demo) aktiv? */
export function devMailboxEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return teamsMode(env) === "entwickler-postfach";
}

export function notificationConfig(env: Record<string, string | undefined> = process.env): NotificationConfig {
  const mode = teamsMode(env);
  const port = int(env.SMTP_PORT, 1025);
  return {
    baseUrl: appBaseUrl(env),
    smtp: {
      host: env.SMTP_HOST?.trim() || "localhost",
      port,
      secure: env.SMTP_SECURE ? env.SMTP_SECURE === "true" : port === 465,
      user: env.SMTP_USER?.trim() || undefined,
      password: env.SMTP_PASSWORD || undefined,
      from: env.SMTP_FROM?.trim() || "Berichtsheft <berichtsheft@example.test>",
    },
    teamsMode: mode,
    graph:
      mode === "graph"
        ? {
            tenantId: env.TEAMS_GRAPH_TENANT_ID?.trim() ?? "",
            clientId: env.TEAMS_GRAPH_CLIENT_ID?.trim() ?? "",
            clientSecret: env.TEAMS_GRAPH_CLIENT_SECRET ?? "",
          }
        : null,
    pollSeconds: int(env.NOTIFICATION_POLL_SECONDS, 5),
    maxAttempts: int(env.NOTIFICATION_MAX_ATTEMPTS, 8),
  };
}

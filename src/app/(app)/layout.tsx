import { homePathFor, roleLabel } from "@/domain/access";
import { AppShell, type NavItem } from "@/components/AppShell";
import { testLoginEnabled } from "@/lib/auth/config";
import { logout } from "@/lib/auth/logout";
import { db } from "@/lib/db";
import { devMailboxEnabled } from "@/lib/notifications/config";
import { countUndeliverable, countUnread } from "@/lib/notifications/service";
import { listReviewQueue } from "@/lib/reports";
import { currentPath, requirePerson } from "@/lib/session";

/**
 * Rahmen für alle Seiten nach der Anmeldung. Ohne gültige Sitzung geht es zur Anmeldung.
 * Menüpunkte je Rolle (UI-Spezifikation, „Menüpunkte“, UI-AK-02). Die Navigation heißt für
 * Ausbilder „Hauptmenü“ (mit den Admin-Funktionen, AK-104), für Azubis „Menü“.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const person = await requirePerson();
  // Die Liste der Benachrichtigungen markiert beim Öffnen alles als gelesen (AK-1015); auf ihr
  // zeigt die Glocke deshalb keinen Zähler – Layout und Seite werden gleichzeitig erzeugt.
  const onNotifications = (await currentPath())?.startsWith("/benachrichtigungen") ?? false;
  const unread = onNotifications ? 0 : await countUnread(db(), person.id);
  const devMailbox = devMailboxEnabled();
  const trainer = person.role === "TRAINER";

  const items: NavItem[] = trainer
    ? [
        { href: "/ausbilder", label: "Start", icon: "home" },
        {
          href: "/ausbilder/pruefliste",
          label: "Prüfliste",
          icon: "review",
          count: (await listReviewQueue(db(), person, "mine")).length,
          testId: "nav-review-count",
        },
        { href: "/ausbilder/azubis", label: "Azubis", icon: "trainees", match: ["/ausbilder/azubis"] },
        { href: "/ausbilder/personen", label: "Personen", icon: "people", match: ["/ausbilder/personen"] },
        { href: "/benachrichtigungen", label: "Benachrichtigungen", icon: "notifications" },
        { href: "/einstellungen", label: "Einstellungen", icon: "settings" },
      ]
    : [
        { href: "/azubi", label: "Start", icon: "home" },
        { href: "/azubi/wochen", label: "Meine Wochen", icon: "weeks", match: ["/berichte"] },
        { href: "/benachrichtigungen", label: "Benachrichtigungen", icon: "notifications" },
        { href: "/einstellungen", label: "Einstellungen", icon: "settings" },
      ];
  if (trainer) {
    // Nicht zustellbare Nachrichten: nur für Ausbilder und nur, wenn es welche gibt (bestätigte Auslegung 12).
    const undeliverable = await countUndeliverable(db(), person);
    if (undeliverable > 0) {
      items.push({
        href: "/ausbilder/nicht-zustellbar",
        label: "Nicht zustellbar",
        icon: "undeliverable",
        count: undeliverable,
        countTone: "danger",
        testId: "undeliverable-count",
      });
    }
  }
  if (devMailbox) {
    items.push({ href: "/entwickler-postfach", label: "Teams-Postfach (Demo)", icon: "mailbox", separated: true });
  }

  return (
    <AppShell
      homeHref={homePathFor(person.role)}
      navLabel={trainer ? "Hauptmenü" : "Menü"}
      items={items}
      person={{ name: person.name, role: roleLabel(person.role), settingsHref: "/einstellungen" }}
      unread={unread}
      demo={devMailbox || testLoginEnabled()}
      theme={person.theme}
      logout={logout}
    >
      {children}
    </AppShell>
  );
}

# Auftrag an die Entwickler-Sitzung: Etappe 2 – Nutzerverwaltung

Du bist Entwickler der Berichtsheft-App im Repository `schoenechristopher96-lgtm/berichtsheft-app`. Etappe 1 (Grundgerüst, PR #1) ist gemergt. Lies zuerst `CLAUDE.md`, `docs/01-spezifikation.md`, `docs/02-plan.md`, dann den bestehenden Code (vor allem `prisma/schema.prisma`, `src/auth.ts`, `src/domain/access.ts`, `tests/db/`, `e2e/`). Lege diesen Auftrag (ab der Überschrift) als `AUFTRAG-ETAPPE-2.md` im Repository ab.

## Ziel

Etappe 2 aus dem Plan: Der Ausbilder (Admin) verwaltet Personen vollständig in der App. Die Zugriffsregeln für Azubi und Ausbilder sind serverseitig durchgesetzt und getestet.

## Freigegebene Entscheidungen, die in diesem PR in die Doku gehören

Diese Entscheidungen sind vom Auftraggeber freigegeben. Trage sie in `docs/01-spezifikation.md` und `docs/02-plan.md` ein (kurz, an der passenden Stelle):

1. **Ausbilder mit Historie** (aus PR #1): Eine Person, die in fremder Historie vorkommt (Statuswechsel oder Kommentare an Berichten anderer Azubis), lässt sich nur deaktivieren, nicht endgültig löschen. Ergänzung zu AK-206: Die Oberfläche erklärt das und bietet „Deaktivieren“ an.
2. **Sitzungen** (aus PR #1): signierte JWT-Cookies, 8 Stunden gültig, kein serverseitiger Widerruf; Deaktivierung wirkt durch die Prüfung bei jeder Anfrage sofort. → Plan, Abschnitt Entscheidungen.
3. **Anlegen über die Firmen-E-Mail** (neu): Der Admin legt eine Person mit Firmen-E-Mail, Name und Rolle an. Beim ersten Login wird sie über die vom Identity Provider bestätigte E-Mail zugeordnet; dabei wird die stabile Konto-ID (`sub` bzw. `oid`) dauerhaft gespeichert. Danach zählt nur noch die Konto-ID, eine spätere E-Mail-Änderung im Firmenkonto bricht die Zuordnung nicht. → Plan (Anmeldung/Datenmodell), Präzisierung zu AK-201.

## Umfang

1. **Datenmodell:** `accountId` wird optional (eindeutig, solange gesetzt) und beim ersten Login gebunden. Migration so, dass der Seed weiter funktioniert. E-Mail-Abgleich ohne Groß-/Kleinschreibung; nur verifizierte E-Mail-Claims verwenden (Keycloak: `email_verified`; für Entra ID den passenden Claim per Konfiguration).
2. **Nutzerverwaltung (nur Ausbilder):** Liste aller Personen mit Rolle, Status (aktiv/deaktiviert, „noch nie angemeldet“), zugeordnetem Ausbilder und Ausbildungszeitraum. Anlegen, Bearbeiten (Rolle, Zuordnung, Beginn/Ende), Deaktivieren, endgültiges Löschen mit Namensbestätigung. Bundesland der Firma in einer Einstellungsseite.
3. **Schutzregeln als reine Funktionen in `src/domain/`** mit Unit-Tests, und serverseitig in jeder Aktion durchgesetzt:
   - AK-202: Azubi nur mit Ausbilder und Beginn; Fehlermeldung nennt das Feld.
   - AK-207: letzter aktiver Ausbilder nicht deaktivierbar, löschbar oder herabstufbar.
   - AK-208: Ausbilder mit zugeordneten Azubis erst nach Neuzuordnung deaktivierbar.
   - Entscheidung 1: Person mit Einträgen in fremder Historie nur deaktivierbar; verständliche Meldung statt Datenbankfehler.
   - Rollenwechsel Azubi → Ausbilder und zurück nur, wenn die Regeln oben das erlauben (z. B. kein Ausbilder, dem noch Azubis zugeordnet sind, wird Azubi).
4. **Zugriffsschutz (AK-103, AK-104, AK-105):** Zugriffsfunktionen für Berichte (`canViewReport`, `canEditReport` o. ä.) in `src/domain/` mit Unit-Tests. Eine schlanke, nur lesende Berichtsansicht `/berichte/[id]` (Platzhalter reicht, Daten aus dem Seed), damit die Regeln im Browser testbar sind: Azubi sieht nur eigene, fremde ergeben „Zugriff verweigert“; Ausbilder sehen alle. Admin-Seiten und -Aktionen sind für Azubis gesperrt, auch per direkter URL und direktem Aufruf der Server-Aktion.
5. **AK-204/AK-205:** Deaktivierte Personen können sich nicht anmelden (schon vorhanden), ihre Berichte bleiben für Ausbilder lesbar und sind nicht änderbar (Zugriffsfunktion). Die Teile von AK-205, die Wochenerzeugung und Erinnerung betreffen, kommen in Etappe 3 bzw. 6; lege die dafür nötige Abfrage („aktive Azubis“) jetzt schon an.
6. **Oberfläche:** Deutsch, mobil zuerst (bei 375 px ohne horizontales Scrollen bedienbar), Fehlermeldungen beim jeweiligen Feld.
7. **Seed/Keycloak:** Bei Bedarf weiteres Testkonto für „Anlegen und erster Login“ (z. B. `emil`, existiert in Keycloak, in der App erst nach dem Anlegen).

## Akzeptanzkriterien dieser Etappe

AK-103, AK-104, AK-105, AK-201 bis AK-209 – jeweils mindestens ein Test, Name beginnt mit der AK-ID. Wo ein Kriterium nur teilweise in diese Etappe fällt (AK-205), den Teil testen, der jetzt existiert, und den Rest im PR benennen. Zusätzlich Tests für die drei Entscheidungen oben.

## Arbeitsweise

- Branch `etappe-2-nutzerverwaltung`, Draft-PR gegen `main`. PR-Beschreibung wie bei Etappe 1: Umfang, Tabelle AK → Test → Ebene, Doku-Änderungen, wie lokal starten.
- Vor jedem Push lokal Lint, Prettier, Typecheck und Tests grün. Danach den PR beobachten und CI-Fehler selbst beheben, bis alles grün ist.
- Ergänze in `CLAUDE.md` unter „Cloud-Sitzungen“, was sich in Etappe 1 bewährt hat (Keycloak aus dem Release-Archiv, `E2E_LOGIN_MODE=test`, Container-Start in der Sandbox nicht möglich), damit künftige Sitzungen schneller starten.
- Bei echten Unklarheiten in Spezifikation oder Plan: im PR fragen statt raten.

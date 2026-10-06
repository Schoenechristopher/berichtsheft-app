# Auftrag an die Entwickler-Sitzung: Etappe 6 – Benachrichtigungen und Erinnerung

Du bist Entwickler der Berichtsheft-App im Repository `schoenechristopher96-lgtm/berichtsheft-app`. Etappen 1–5 (PR #1–#5) sind gemergt. Lies zuerst `CLAUDE.md`, `docs/01-spezifikation.md` (vor allem „Benachrichtigungen und Erinnerung“, AK-1001–1025, AK-205 und alle bestätigten Auslegungen zu „offen“ und Wochen außerhalb der Ausbildung), `docs/02-plan.md` (Outbox, Adapter, pg-boss), dann den bestehenden Code (vor allem `src/lib/report-transitions.ts` mit dem Einhängepunkt `recordNotifications`, `prisma/schema.prisma` mit `Notification`, `Channel` und `Person.channels`, `src/domain/report-generation.ts` mit `classifyWeek`, `src/domain/report-status.ts`, `src/worker/`, `tests/`, `e2e/`). Lege diesen Auftrag (ab der Überschrift) als `AUFTRAG-ETAPPE-6.md` im Repository ab.

## Ziel

Etappe 6 aus dem Plan: Statuswechsel und überfällige Wochen erzeugen Benachrichtigungen über die Kanäle, die jede Person selbst gewählt hat. Der Worker versendet sie genau einmal; die App zeigt sie mit Zähler an; montags um 9:00 Uhr laufen Erinnerung und Information an den Ausbilder.

## Umfang

1. **Ereignisse → Outbox (reine Funktion + Einhängepunkt):** In `recordNotifications` werden in derselben Transaktion wie der Statuswechsel die Benachrichtigungen geschrieben:
   - Einreichen → zugeordneter Ausbilder, sonst niemand (AK-1001).
   - Freigabe, Ablehnung, Rücknahme der Freigabe → Azubi (AK-1002).
   - Wer welche Nachricht bekommt und mit welchem Inhalt, entscheidet eine reine Funktion in `src/domain/`.
   - Für jede gewählte Kanal-Einstellung des Empfängers **zum Zeitpunkt des Ereignisses** eine Zeile (AK-1013, AK-1014); ohne Kanal keine Zeile. Deaktivierte Empfänger bekommen nichts.
   - Inhalt: Azubi, Woche, Anlass, Link auf den Bericht (AK-1003). Der Link führt nach der Anmeldung direkt zum Bericht (Rücksprung nach Login). Basis-URL per Umgebungsvariable.
2. **Versand im Worker (AK-1004):** Der Worker holt offene Outbox-Zeilen sicher bei parallelen Workern (z. B. `FOR UPDATE SKIP LOCKED`), versendet je Kanal über einen Adapter und markiert sie als gesendet. Fehlversuche werden mit Wartezeit wiederholt, ohne Duplikate zu erzeugen; beschreibe im PR, was bei einem Absturz zwischen Senden und Markieren passiert und wie du Duplikate minimierst (z. B. feste Message-ID).
   - **E-Mail:** Nodemailer über SMTP, in der Demo an Mailpit. Text auf Deutsch, Betreff mit Anlass und Woche.
   - **Teams:** Adapter mit Demo-Variante laut Plan: Nachrichten landen im „Entwickler-Postfach“, einer Seite in der App (nur in Nicht-Produktiv-Modus oder für Ausbilder sichtbar – schlage vor). Die echte Anbindung (Microsoft Graph) kommt bei der Übernahme; lege die Schnittstelle so an, dass nur Konfiguration getauscht wird.
   - **App:** Kein Versand, die Zeile ist die Benachrichtigung.
3. **Glocke und Liste (AK-1015):** In der Kopfzeile eine Glocke mit Zähler ungelesener App-Benachrichtigungen; Liste der eigenen Benachrichtigungen mit Link zum Bericht. Öffnen markiert als gelesen. Mobil bedienbar.
4. **Kanal-Einstellungen (AK-1011, AK-1012):** Jede Person kann unter „Einstellungen“ E-Mail, Teams und App beliebig kombinieren, auch alle abwählen. Voreinstellung für neue Personen bleibt E-Mail + App. Bei „keiner“ ein deutlicher Hinweis, dass dann auch keine Erinnerungen kommen.
5. **Erinnerung (AK-1021–1025, Rest von AK-205):**
   - pg-boss-Zeitplan montags 9:00 Uhr Europe/Berlin; die Logik ist eine reine Funktion (Eingabe: Stichtag, aktive Azubis, ihre Wochen) und nutzt die zentrale Definition „offen“ inkl. `classifyWeek`.
   - Azubi: Erinnerung, wenn mindestens eine Woche vor der aktuellen offen ist; **eine** Nachricht nennt alle offenen Wochen (AK-1025).
   - Zugeordneter Ausbilder: zusätzlich informiert, sobald eine dieser Wochen bereits am vorherigen Montag offen war (AK-1022); danach jeden Montag erneut, bis eingereicht (AK-1024).
   - Keine Erinnerung für eingereichte/freigegebene Wochen, die laufende Woche, ausgeblendete oder außerhalb liegende Wochen, deaktivierte Azubis (AK-1023, AK-205).
   - Ereignisschlüssel so, dass ein doppelter Job-Lauf am selben Montag keine zweite Nachricht erzeugt.
6. **Konfiguration:** Neue Variablen in `.env.example` und `docker-compose.yml` (Basis-URL, Teams-Modus, SMTP-Absender …); keine Geheimnisse im Repository.

## Fälle, zu denen du im PR einen Vorschlag zur Bestätigung machst

- Benachrichtigung beim Zurückziehen durch den Azubi (an den Ausbilder) – ja oder nein?
- Ausbilder-Information bei mehreren überfälligen Azubis: eine Nachricht pro Azubi oder eine gesammelte?
- Wer sieht das Entwickler-Postfach für Teams?
- Was passiert mit noch nicht versendeten Nachrichten, wenn der Empfänger seine Kanäle ändert oder deaktiviert wird?
- Alles Weitere, das Spezifikation und Plan nicht eindeutig regeln.

## Akzeptanzkriterien dieser Etappe

AK-1001 bis AK-1004, AK-1011 bis AK-1015, AK-1021 bis AK-1025 und der Rest von AK-205 – jeweils mindestens ein Test, Name beginnt mit der AK-ID. Zusätzlich:

- Das Beispielszenario „Erinnerung und Information an den Ausbilder“ (KW 41/2026, Montage 12.10. und 19.10.2026) als Test mit fest gestellter Uhr.
- Das Szenario „Vertretung nimmt Freigabe zurück“ jetzt vollständig inklusive Benachrichtigung an Anna.
- E-Mail-Inhalt und Empfänger in CI über die Mailpit-API geprüft; lokal ohne Mailpit mit einem SMTP-Mock oder Test-Transport.
- Genau-einmal-Versand als DB-Test mit zwei parallelen Worker-Durchläufen.

## Arbeitsweise

- Branch `etappe-6-benachrichtigungen`, Draft-PR gegen `main`. PR-Beschreibung wie bisher: Umfang, Tabelle AK → Test → Ebene, Doku-Änderungen, „Bitte bestätigen“, wie lokal starten (inkl. wo man Mailpit und das Entwickler-Postfach sieht).
- Vor jedem Push lokal Lint, Prettier, Typecheck und Tests grün. Danach den PR beobachten und CI-Fehler selbst beheben, bis alles grün ist.
- Bestätigte Auslegungen nach Bestätigung in `docs/01-spezifikation.md` bzw. `docs/02-plan.md` eintragen.
- Bei echten Unklarheiten: im PR fragen statt raten.

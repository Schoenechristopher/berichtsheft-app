# P08 Benachrichtigungen und Erinnerung (M08)

Reihe `playbooks/typescript/` · Plattform TypeScript/Next.js · Profil `profile/typescript-nextjs.md` · Stand: 15.10.2026
(Etappe G4, Paket D) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Statuswechsel und die Montags-Erinnerung lösen Benachrichtigungen aus: je gewähltem Kanal (E-Mail, Teams, App) genau eine Nachricht,
mit Glocke in der App, Wartezeiten und „nicht zustellbar“, dazu der Erinnerungslauf Montag 9:00 Uhr (Berliner Zeit) mit Nachholen.
Fertig, wenn alle Prüffälle in `specs/pruefung/M08.json` grün sind (14 AK-IDs; 58 Fachlogik- und 22 Daten-Fälle), die
zurückgestellten Fälle AK-205-01 und AK-205-02 aus `specs/pruefung/M02.json` laufen, die Datenbanktests
(`tests/db/notifications.test.ts`, `tests/db/reminders.test.ts`) grün sind und die Browser-Tests
`e2e/ak-1001-1025-benachrichtigungen.spec.ts` laufen.

## 2. Voraussetzungen

- P00 bis P07 abgenommen (Statuswechsel aus P05 mit dem Einhängepunkt `TransitionEvent`, Wochen aus P03, Rücksprung aus P02).
- Profil: Abschnitte 3 (Hintergrundjobs, E-Mail, Teams, Benachrichtigung in der App), 5 (SMTP, Teams-Modus) und 7 („Genau einmal“,
  UTC, Uhr). Mailpit gibt es nur im Compose-Stack (CI); lokal ein SMTP-Mock (`tests/smtp-mock.ts`).

## 3. Eingaben

- Fach-Spec: `specs/M08-benachrichtigungen-und-erinnerung.md` (Regeln M08-R01 bis M08-R22, Abschnitt 5, Abschnitt 8 Teams, Abschnitt 9).
- Prüffälle: `specs/pruefung/M08.json` und AK-205-01, AK-205-02 in `specs/pruefung/M02.json`; Daten-Aktionen
  (`nachrichten_versenden`, `nachrichten_lesen`, `nicht_zustellbar_lesen`, `erneut_versuchen`, `kanaele_einstellen`,
  `kanaele_lesen`, `ungelesen_zaehlen`, `benachrichtigungen_oeffnen`, `erinnerung_ausloesen`, `wochen_lesen`):
  `specs/pruefung/format.md`.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M08 Benachrichtigungen und Erinnerung“.
- Konfiguration: `.env.example` (`APP_URL`, `SMTP_*`, `TEAMS_MODE`, `NOTIFICATION_*`).

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Lesereihenfolge: `src/domain/notifications.ts` von oben nach unten (Kanäle, `fanOut()`, Statuswechsel,
Erinnerung, Zeitplan), `src/lib/notifications/service.ts`, `src/lib/notifications/outbox.ts`, `src/lib/notifications/adapters.ts`,
`src/lib/notifications/config.ts`, `src/worker/index.ts`, `src/worker/run-reminders.ts`. Belege: `src/domain/notifications.test.ts`,
`src/lib/notifications/config.test.ts`, `tests/db/notifications.test.ts`, `tests/db/reminders.test.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Fachregeln (Kanäle, Empfänger, Erinnerung, Zeitplan, Wartezeit), (2) Datenmodell Ausgangskorb, (3) Anlegen in der
Transaktion des Statuswechsels, (4) Versandlauf mit Kanälen, (5) Erinnerungslauf, (6) Glocke und Seiten, (7) Zeitplan im Worker,
(8) Adapter. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-1001 | Beim Einreichen wird der zugeordnete Ausbilder benachrichtigt, andere Ausbilder nicht. | 4 (3 fachlogik, 1 daten) | `specs/pruefung/M08.json` |
| AK-1002 | Bei Freigabe, Ablehnung und Rücknahme wird der Azubi benachrichtigt; erneutes Einreichen benachrichtigt den Ausbilder wie das erste, Zurückziehen niemanden. | 7 (5 fachlogik, 2 daten) | `specs/pruefung/M08.json` |
| AK-1003 | Jede Nachricht nennt Azubi, Woche und Anlass und verlinkt den Bericht; ohne Kommentartexte; mehrere Wochen je mit Link; Rücksprung nach der Anmeldung, fremde Adressen ignoriert. | 8 (8 fachlogik) | `specs/pruefung/M08.json` |
| AK-1004 | Pro Ereignis und Kanal genau eine Nachricht; Wiederholung mit Wartezeit; Aufgeben nach Fehlversuchen oder bei deaktiviertem Empfänger; „Nicht zustellbare Nachrichten“ mit „Erneut versuchen“. | 12 (7 fachlogik, 5 daten) | `specs/pruefung/M08.json` |
| AK-1011 | Jede Person kann E-Mail, Teams und App beliebig kombinieren, auch alle abwählen. | 5 (4 fachlogik, 1 daten) | `specs/pruefung/M08.json` |
| AK-1012 | Neue Personen haben die Voreinstellung E-Mail + App. | 2 (1 fachlogik, 1 daten) | `specs/pruefung/M08.json` |
| AK-1013 | Nur über die gewählten Kanäle; ohne Kanal keine Nachricht, der Status bleibt in der App sichtbar. | 5 (4 fachlogik, 1 daten) | `specs/pruefung/M08.json` |
| AK-1014 | Geänderte Kanäle gelten ab dem nächsten Ereignis; angelegte, noch nicht versendete Nachrichten über den ursprünglichen Kanal. | 2 (2 daten) | `specs/pruefung/M08.json` |
| AK-1015 | Der Kanal App zeigt ungelesene Nachrichten mit Zähler; das Öffnen der Liste markiert alle als gelesen, die ungelesenen sind dabei „Neu“. | 1 (1 daten) | `specs/pruefung/M08.json` |
| AK-1021 | Ist die Vorwoche am Montag um 9:00 Uhr noch offen, erhält der Azubi eine Erinnerung; einmal nachgeholt bis Dienstag 23:59 Uhr, Stichtag bleibt Montag. | 17 (12 fachlogik, 5 daten) | `specs/pruefung/M08.json` |
| AK-1022 | Ist dieselbe Woche am folgenden Montag noch offen, wird zusätzlich der zugeordnete Ausbilder informiert; jede offene Woche vor der Vorwoche, auch abgelehnte; eine Nachricht pro Azubi; Azubi ohne Kanal: Ausbilder trotzdem. | 7 (5 fachlogik, 1 daten, 1 ablauf) | `specs/pruefung/M08.json`, `specs/pruefung/szenarien.json` |
| AK-1023 | Für eingereichte oder freigegebene Wochen und für die laufende Woche kommt keine Erinnerung. | 5 (4 fachlogik, 1 daten) | `specs/pruefung/M08.json` |
| AK-1024 | Erinnerung und Information gehen jeden Montag erneut raus, bis die Woche eingereicht ist. | 4 (3 fachlogik, 1 daten) | `specs/pruefung/M08.json` |
| AK-1025 | Sind mehrere Wochen offen, nennt die Erinnerung alle in einer Nachricht. | 2 (2 fachlogik) | `specs/pruefung/M08.json` |

AK-205 (Erinnerung für neu angelegte oder deaktivierte Personen) gehört zu M02; seine zwei Prüffälle in `specs/pruefung/M02.json` laufen
mit diesem Playbook an.

## 6. Empfehlung

**Weg B.** Die Regeln sind als reine Funktionen in der Spec beschrieben; Versand und Zeitplan sind Plattformarbeit nach Profil. Weg A nur
auf ausdrücklichen Auftrag. Das Paket ist groß; die Steuerung darf es nach Stufe teilen (Regeln `playbooks/00-steuerung.md`,
Abschnitt 3): zuerst Ausgangskorb und Versand (Schritte 3 bis 5, neuartig), danach Erinnerung und Oberfläche „nach dem Muster“.

## 7. Schritte

1. **Branch** `claude/p08-benachrichtigungen-und-erinnerung`; Spec und Prüffälle lesen. Prüfschritt: AK-Tabelle im PR-Entwurf.
2. **Datenmodell.** `Person` bekommt die Kanäle (E-Mail, Teams, App; Voreinstellung E-Mail und App, AK-1012). Neu: `Notification`
   (`eventKey`, `recipientId` Kaskade, `channel`, `reportId` optional mit Kaskade, `subject`, `body`, `link`, `createdAt`, `sentAt`,
   `readAt`, `attempts`, `nextAttemptAt`, `lastError`, `failedAt`; **eindeutig** je (`eventKey`, `recipientId`, `channel`)),
   `TeamsDevMessage` (höchstens eine je Benachrichtigung), `ReminderRun` (Schlüssel Jahr und Woche des Stichtags, `ranAt`, `created`).
   Migration von Hand ergänzen: Versuche nie negativ, Kanal App gilt beim Anlegen als zugestellt (`sent_at` gesetzt), Wochennummer
   des Erinnerungslaufs 1 bis 53, Index offener Versandaufträge (`next_attempt_at`, `sent_at IS NULL AND failed_at IS NULL`).
   Prüfschritt: Dasselbe Ereignis für denselben Empfänger und Kanal lässt sich nicht doppelt anlegen.
3. **Fachregeln `src/domain/notifications.ts`**: `Channel`, `CHANNELS`, `CHANNEL_LABELS`, `DEFAULT_CHANNELS`, `parseChannels()`,
   `NO_CHANNEL_WARNING` (AK-1011, AK-1012); `fanOut()` mit `Recipient`, `NotificationDraft`, `NotificationAbout` (eine Nachricht je
   gewähltem Kanal, nichts an deaktivierte Empfänger, AK-1013, AK-1014); `noticeFor()`, `planTransitionNotifications()`,
   `TransitionNotice` (Empfänger und Inhalt je Statuswechsel, Ereignisschlüssel `status-change:<Historieneintrag>`; Kommentartexte
   gelangen nie in eine Nachricht, AK-1001 bis AK-1004); `reportPath()`, `traineeOverviewPath()`, `absoluteUrl()`, `shortWeek()`,
   `longWeek()` (Links, AK-1003); `reminderWeeks()`, `planReminders()` (offene und überfällige Wochen zum Stichtag, Erinnerung und
   Information, eine pro Azubi, Schlüssel `reminder:` und `trainer-info:` mit der Woche des Stichtags, AK-1021 bis AK-1025,
   AK-205); `reminderSchedule()` (Stichtag Montag 9:00 Uhr Berliner Zeit, Nachholen bis Dienstag 23:59 Uhr, mit
   `Intl.DateTimeFormat` in Europe/Berlin); `retryDelaySeconds()` (Wartezeit nach Fehlversuchen, AK-1004). Prüfschritt:
   `src/domain/notifications.test.ts` (Namen mit AK-ID).
4. **Anlegen `src/lib/notifications/service.ts`**: `insertNotifications()` mit `skipDuplicates` (Doppelte überspringt die Datenbank),
   `recordTransitionNotifications()` wird **in der Transaktion** von `transitionReport()` aufgerufen (Einhängepunkt aus P05); eine
   Benachrichtigung entsteht nur mit dem Statuswechsel. `NotificationDraft.about` wird nicht gespeichert. Prüfschritt:
   `tests/db/notifications.test.ts`: Wechsel erzeugt je Kanal genau eine Zeile; Rollback des Wechsels erzeugt keine.
5. **Versand `src/lib/notifications/outbox.ts`, `adapters.ts`, `config.ts`**: `deliverPendingNotifications()` (je Zeile eine
   eigene Transaktion mit `FOR NO KEY UPDATE SKIP LOCKED`, Übergabe an den Kanal, dann als zugestellt markieren; Fehlversuch mit
   Wartezeit, nach `NOTIFICATION_MAX_ATTEMPTS` Aufgeben; deaktivierter Empfänger: Aufgeben mit `RECIPIENT_INACTIVE`);
   `ChannelAdapter` je Kanal, `createDeliveryAdapters()` nach Konfiguration; `createEmailAdapter()` mit Nodemailer und fester
   Message-ID je Nachricht (`messageIdFor()`), `createDevMailboxAdapter()` (Teams-Postfach der Demo; höchstens eine Nachricht je
   Benachrichtigung), `createGraphTeamsAdapter()` (Microsoft Graph, noch nicht angebunden); `notificationConfig()`, `appBaseUrl()`,
   `teamsMode()`, `devMailboxEnabled()` aus Umgebungsvariablen; das Postfach im Produktivbetrieb nur ausdrücklich. Genau einmal
   hängt an **zwei** Stellen: Unique-Index mit `skipDuplicates` und `SKIP LOCKED` (AK-1004). Prüfschritt: Test mit zwei parallelen
   Versandläufen versendet jede Nachricht genau einmal (SMTP-Mock `tests/smtp-mock.ts`); `src/lib/notifications/config.test.ts`.
6. **Erinnerungslauf**: `loadReminderTrainees()`, `runWeeklyReminders()`, `runDueReminders()`, `DueRemindersResult`: fällige Wochen
   anlegen (P03), höchstens einmal je Woche (Vermerk in `ReminderRun` **in derselben Transaktion**), Stichtag Montag, Nachholen
   bis Dienstag 23:59 Uhr; die Nachrichten tragen den tatsächlichen Zeitpunkt, geplant wird mit `schedule.dueAt` (AK-1021 bis
   AK-1025). Prüfschritt: `tests/db/reminders.test.ts` (Beispielszenario, Nachholen, gleichzeitige Läufe).
7. **Glocke, Kanäle, Nicht zustellbar**: `countUnread()`, `previewNotifications()`, `openNotifications()`, `notificationKind()` (Art und
   Woche je Nachricht als Merker `data-art` und `data-woche`; Öffnen der Seite markiert als gelesen, die Vorschau nicht, AK-1015),
   `updateOwnChannels()` (AK-1011), `countUndeliverable()`, `listUndeliverable()`, `retryUndeliverable()` (nur Ausbilder, AK-1004),
   `listDevMailbox()`. Routen `src/app/api/benachrichtigungen/ungelesen/route.ts` und `src/app/api/benachrichtigungen/vorschau/route.ts`;
   Seiten `src/app/(app)/benachrichtigungen/page.tsx`, `src/app/(app)/einstellungen/page.tsx` mit `src/components/ChannelSettingsForm.tsx`
   und `updateChannelsAction()` in `src/app/(app)/einstellungen/actions.ts`, `src/app/(app)/ausbilder/nicht-zustellbar/page.tsx` mit
   `retryAction()`, `src/app/(app)/entwickler-postfach/page.tsx`, `src/components/MessageText.tsx`. Jede Serveraktion prüft Rolle und
   Besitz selbst. Prüfschritt: Browser-Test `e2e/ak-1001-1025-benachrichtigungen.spec.ts` (Glocke, Kanäle, Rücksprung nach Anmeldung
   aus dem Link der Nachricht, AK-1003).
8. **Zeitplan im Worker** `src/worker/index.ts` (pg-boss): Montag 9:00 Uhr Europe/Berlin (`reminderSchedule()`), Nachholen beim Start und
   alle 10 Minuten, Versandlauf alle `NOTIFICATION_POLL_SECONDS`, das tägliche Anlegen aus P03 bleibt; `src/worker/run-reminders.ts`
   (`npm run erinnerung`, Lauf von Hand mit `APP_FIXED_NOW`). Prüfschritt: `npm run worker` startet, `npm run erinnerung` mit fester
   Uhr legt Nachrichten an.
9. **Adapter und Ablauf.** Fachlogik: `benachrichtigungenPlanen`, `erinnerungFaellig`, `erinnerungenPlanen`, `kanaeleWaehlen`,
   `ruecksprungZiel`, `voreinstellungKanaele`, `wartezeitNachFehlversuch`. Daten-Adapter: die Aktionen aus Abschnitt 3 mit einem
   **Test-Kanal** je Fall statt E-Mail und Teams (nie echter Versand). Ablauf: Aktion `erinnerung_ausloesen` (ohne `als`) über die
   Testschnittstelle, Seite `benachrichtigungen` mit `nachrichten`. Prüfschritt: `-t "M08.json"` und `-t "AK-205"` grün.
10. **Bau-Stand.** M08 eintragen und AK-205-01 und AK-205-02 freigeben. Prüfung nach Abschnitt 8.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `npx vitest run --project unit tests/pruefung/fachlogik.test.ts -t "M08.json"` | 58 Fälle grün |
| `npx vitest run --project db tests/pruefung/daten.test.ts -t "M08.json"` | 22 Fälle grün |
| `npx vitest run --project unit tests/pruefung/fachlogik.test.ts -t "AK-205-01"` und `npx vitest run --project db tests/pruefung/daten.test.ts -t "AK-205-02"` | grün |
| `npx vitest run --project unit src/domain/notifications.test.ts src/lib/notifications/config.test.ts` | grün |
| `npx vitest run --project db tests/db/notifications.test.ts tests/db/reminders.test.ts` | grün, auch zwei parallele Versandläufe |
| `E2E_LOGIN_MODE=test npm run test:e2e -- --project=chromium --project=smartphone-375 e2e/ak-1001-1025-benachrichtigungen.spec.ts` | Tests zu AK-1001 bis AK-1004, AK-1011 bis AK-1015, AK-1021 bis AK-1025 grün |
| `npm run lint && npm run format:check && npm run typecheck` | keine Fehler |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: E-Mail an Mailpit im Compose-Stack (`http://localhost:8025`), Firefox und Edge.

## 9. Abschluss

- Commit, z. B. „P08: Benachrichtigungen und Erinnerung (Ausgangskorb, Glocke, Montags-Lauf)“; vor dem Push alles lokal grün.
- Draft-PR mit der AK-Tabelle (alle AK-IDs aus Abschnitt 5 mit Test und Prüffällen, dazu AK-205), Hinweis auf nur in CI geprüfte
  Teile (Mailpit) und „Bitte bestätigen“ (insbesondere Teams-Postfach der Demo und Graph).
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Nachricht doppelt versendet | beide Sicherungen bauen: Unique-Index mit `skipDuplicates` und `SKIP LOCKED` (AK-1004) |
| Stichtag um eine Stunde verschoben | Montag 9:00 Uhr in Europe/Berlin rechnen, nie in UTC oder in der Serverzeit |
| Zeiten der Wartezeit stimmen nicht | Verbindung nur über `createPrismaClient` (UTC) |
| Zweite Erinnerung für dieselbe Woche | Vermerk in `ReminderRun` in derselben Transaktion; Schlüssel enthält die Woche des Stichtags |
| Kommentartext in der Nachricht | `planTransitionNotifications()` bekommt die Kommentare gar nicht |
| Öffnen der Vorschau markiert als gelesen | nur die Seite markiert (AK-1015); Zähler und Vorschau lesen nur |
| Echte Mail oder Teams in einem Test | SMTP-Mock bzw. Test-Kanal je Fall |
| Link der Nachricht führt nach dem Login auf die Startseite | Rücksprungziel aus P02 (`safeReturnPath()`, `src/proxy.ts`) prüfen, nur Pfade innerhalb der App |

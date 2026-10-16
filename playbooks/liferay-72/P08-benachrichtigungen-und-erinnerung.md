# P08 Benachrichtigungen und Erinnerung (M08)

Reihe `playbooks/liferay-72/` · Plattform Liferay Portal 7.2 CE · Profil `profile/liferay-72.md` (baut auf
`profile/liferay-gemeinsam.md` auf) · Stand: 16.10.2026 (Etappe G4, Paket K) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Statuswechsel und die Montags-Erinnerung lösen Benachrichtigungen aus: je gewähltem Kanal (E-Mail, Teams, App) genau eine Nachricht,
mit Ausgangskorb, Wiederholung mit Wartezeit, „nicht zustellbar“, Zähler und Liste in der App und dem Erinnerungslauf Montag 9:00 Uhr
Berliner Zeit mit Nachholen. Fachregeln liegen als reine Java-Klassen in `bh-domain`; Anlegen, Versandlauf und Erinnerungslauf in
`bh-notification` und `bh/bh-service`; E-Mail geht **synchron** über die `javax.mail.Session` des Portals, nicht über den asynchronen
`MailService` (gemeinsames Profil, Abschnitt 3.2). Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M08.json` über die Prüf-Adapter grün sind (14 AK-IDs; 58 Fachlogik- und 22 Daten-Fälle, keine
   Ablauf-Fälle in der Datei; das Ablauf-Szenario AK-1022-07 liegt in `specs/pruefung/szenarien.json` und ist hier nur vorbereitet,
   verbindlich erst in P10);
2. die zurückgestellten Fälle AK-205-01 und AK-205-02 aus `specs/pruefung/M02.json` freigegeben und grün sind (P02 hat sie bis hierher
   zurückgestellt);
3. die plattformeigenen Tests grün sind, die zeigen, was kein neutraler Fall zeigt (Gleichzeitigkeit, Rollback, Kanäle des Portals,
   Liferay-Glocke, Scheduler, Rücksprung nach der Anmeldung): `NotificationInsertTest`, `NotificationContentTest`, `OutboxTest`,
   `EmailChannelTest`, `TeamsChannelTest`, `ReminderRunTest`, `ReminderJobTest`, `BellTest` und `LoginRedirectTest`;
4. jede Gegenprobe aus Schritt 12 die dort benannten Prüffälle bzw. Tests rot gemacht hat und zurückgenommen ist.

Schemaänderung: die Entities `Notification`, `TeamsDevMessage` und `ReminderRun` (gemeinsames Profil, Abschnitt 2.3) und im Skript „Schutz in der
Datenhaltung“ (gemeinsames Profil, Abschnitt 2.6) Fremdschlüssel, CHECK-Constraints und die partiellen Indizes dieser Tabellen; Migration über den
Upgrade-Schritt aus P00. Die Kanal-Spalten von `BH_Person` gibt es seit P02. Keine Abweichung gegenüber der TypeScript-App; für die
Glocke gilt Profil 7.2, Abschnitt 3.5.

## 2. Voraussetzungen

- L72-P00 bis L72-P06 abgenommen und gemergt; M08 hängt von M02 (Rollen, Zuordnung, Rücksprung), M03 (offene Wochen, Anlegen) und M05
  (Statuswechsel mit `TransitionEvent`) ab, nicht von M07. P03 hat den Scheduler-Rahmen in `bh-notification` angelegt, P05 den
  Einhängepunkt in `transition` und `submit` (P05, Schritt 7).
- Profil 7.2, Abschnitte 3 (Hintergrundjobs, Zeitplan 3.3, Benachrichtigung in der App 3.5, E-Mail, Teams), 4 (Daten-Adapter), 5
  (SMTP-Mock, Mailpit nur in CI) und 7 („`PortalException` und Rollback“, „Mail asynchron“, „Scheduler in UTC“); gemeinsames Profil, Abschnitt 2.3, 2.5 und 3.2.
- P00 hat bestätigt (Profil 7.2, „In P00 zu bestätigen“): der synchrone Mailversand über die Mail-Sitzung des Portals, die Scheduler-Aufrufe
  (`SchedulerEngineHelper`, `StorageType.MEMORY_CLUSTERED`, Takt) und dass das Gelesen-Markieren der Liferay-Glocke einen
  `ModelListener<UserNotificationEvent>` erreicht. Ohne diese Nachweise bleibt der betroffene Schritt stehen und wird gemeldet; der
  Ausweg für die Glocke steht in Profil 7.2, Abschnitt 3.5.
- Konfiguration nur über OSGi-Konfiguration und `portal-ext.properties` (`configs/<umgebung>/`), ohne Geheimnisse: SMTP-Host und -Port
  (Demo: Mailpit, Port 1025, ohne Anmeldung; Sitzung: SMTP-Mock), Basisadresse der Links, `bh.teams.modus`.

## 3. Eingaben

- Fach-Spec: `specs/M08-benachrichtigungen-und-erinnerung.md` (Regeln M08-R01 bis M08-R22, Abschnitt 5 Datenmodell, Abschnitt 6
  Schnittstellen, Abschnitt 8 Anforderungen an die Plattform, Abschnitt 9 Teams-Postfach).
- Prüffälle: `specs/pruefung/M08.json`, dazu AK-205-01 und AK-205-02 in `specs/pruefung/M02.json` und das Szenario AK-1022-07 in
  `specs/pruefung/szenarien.json`; Schnittstellen, Daten-Aktionen (`nachrichten_versenden`, `nachrichten_lesen`,
  `nicht_zustellbar_lesen`, `erneut_versuchen`, `kanaele_einstellen`, `kanaele_lesen`, `ungelesen_zaehlen`,
  `benachrichtigungen_oeffnen`, `erinnerung_ausloesen`, `wochen_lesen`) und Fehlercodes: `specs/pruefung/format.md`, „Schnittstellen
  und Aktionen von M08“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M08 Benachrichtigungen und Erinnerung“ (Spalte „Plattformgebunden“, „Fallen“).
- Gegenstück der Referenz-Umsetzung: `playbooks/typescript/P08-benachrichtigungen-und-erinnerung.md` (nur zum Abgleich).

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag und nur für die Fachregeln: `src/domain/notifications.ts` (Kanäle, `fanOut()`,
`planTransitionNotifications()`, `planReminders()`, `reminderSchedule()`, `retryDelaySeconds()`) lässt sich von oben nach unten nach
Java übersetzen, `reminderSchedule()` mit `java.time` und `ZoneId.of("Europe/Berlin")` statt `Intl.DateTimeFormat`. Nicht
übertragbar sind `src/lib/notifications/service.ts`, `src/lib/notifications/outbox.ts`, `src/lib/notifications/adapters.ts` und
`src/lib/notifications/config.ts` (Prisma, Nodemailer, Umgebungsvariablen), `src/worker/index.ts` (pg-boss) und die Next.js-Seiten:
Auf 7.2 ersetzen sie Service Builder mit Custom SQL, die Mail-Sitzung des Portals, den Scheduler und Portlets (Schritte 3 bis 9).
Belege der Referenz: `src/domain/notifications.test.ts`, `tests/db/notifications.test.ts`, `tests/db/reminders.test.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Fachregeln, (2) Entities und Schutz in der Datenhaltung, (3) Anlegen in der Transaktion des Statuswechsels, (4)
Kanäle und Versandlauf, (5) Erinnerungslauf, (6) Scheduler, (7) Glocke, Kanäle und Seiten, (8) Rücksprung nach der Anmeldung, (9)
Adapter, (10) plattformeigene Tests und Gegenproben. Zu jedem AK die Prüffälle (alle in `specs/pruefung/M08.json`; Zählweise:
Prüffälle **ohne** Ablauf-Szenario, das Szenario steht in der Spalte „Bewertung auf 7.2“):

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Bewertung auf 7.2 |
| --- | --- | --- | --- |
| AK-1001 | Beim Einreichen wird der zugeordnete Ausbilder benachrichtigt, andere Ausbilder nicht. | 4 (3 fachlogik, 1 daten) | gleichwertig; Anlegen in der Transaktion von P05 |
| AK-1002 | Bei Freigabe, Ablehnung und Rücknahme wird der Azubi benachrichtigt; erneutes Einreichen benachrichtigt den Ausbilder wie das erste, Zurückziehen niemanden. | 7 (5 fachlogik, 2 daten) | gleichwertig |
| AK-1003 | Jede Nachricht nennt Azubi, Woche und Anlass und verlinkt den Bericht; ohne Kommentartexte; mehrere Wochen je mit Link; Rücksprung nach der Anmeldung, fremde Adressen ignoriert. | 8 (8 fachlogik) | gleichwertig; Rücksprung über `BhLoginPostAction` und `safeReturnPath()` aus P02, Nachweis `LoginRedirectTest.AK1003_…` |
| AK-1004 | Pro Ereignis und Kanal genau eine Nachricht; Wiederholung mit Wartezeit; Aufgeben nach Fehlversuchen oder bei deaktiviertem Empfänger; „Nicht zustellbare Nachrichten“ mit „Erneut versuchen“. | 12 (7 fachlogik, 5 daten) | gleichwertig; synchroner Versand über die Mail-Sitzung des Portals (Profil 7.2, Abschnitt 3), Nachweis Gleichzeitigkeit durch `OutboxTest.AK1004_…` |
| AK-1011 | Jede Person kann E-Mail, Teams und App beliebig kombinieren, auch alle abwählen. | 5 (4 fachlogik, 1 daten) | gleichwertig; drei Spalten statt Liste (gemeinsames Profil, Abschnitt 2.3) |
| AK-1012 | Neue Personen haben die Voreinstellung E-Mail + App. | 2 (1 fachlogik, 1 daten) | gleichwertig |
| AK-1013 | Nur über die gewählten Kanäle; ohne Kanal keine Nachricht, der Status bleibt in der App sichtbar. | 5 (4 fachlogik, 1 daten) | gleichwertig |
| AK-1014 | Geänderte Kanäle gelten ab dem nächsten Ereignis; angelegte, noch nicht versendete Nachrichten über den ursprünglichen Kanal. | 2 (2 daten) | gleichwertig; Kanal steht in der Zeile `BH_Notification` |
| AK-1015 | Der Kanal App zeigt ungelesene Nachrichten mit Zähler; das Öffnen der Liste markiert alle als gelesen, die ungelesenen sind dabei „Neu“. | 1 (1 daten) | gleichwertig für die eigene Glocke; die Liferay-Glocke ist Abbild, `readAt` folgt beiden Wegen (Profil 7.2, Abschnitt 3.5), Nachweis `BellTest.AK1015_…` |
| AK-1021 | Ist die Vorwoche am Montag um 9:00 Uhr noch offen, erhält der Azubi eine Erinnerung; einmal nachgeholt bis Dienstag 23:59 Uhr, Stichtag bleibt Montag. | 17 (12 fachlogik, 5 daten) | gleichwertig; Takt statt Berliner Cron (Profil 7.2, Abschnitt 3.3), Entscheidung in der Fachlogik, Nachweis `ReminderRunTest.AK1021_…` |
| AK-1022 | Ist dieselbe Woche am folgenden Montag noch offen, wird zusätzlich der zugeordnete Ausbilder informiert; jede offene Woche vor der Vorwoche, auch abgelehnte; eine Nachricht pro Azubi; Azubi ohne Kanal: Ausbilder trotzdem. | 6 (5 fachlogik, 1 daten) | gleichwertig; AK-1022-07 ist Szenario (P10) |
| AK-1023 | Für eingereichte oder freigegebene Wochen und für die laufende Woche kommt keine Erinnerung. | 5 (4 fachlogik, 1 daten) | gleichwertig |
| AK-1024 | Erinnerung und Information gehen jeden Montag erneut raus, bis die Woche eingereicht ist. | 4 (3 fachlogik, 1 daten) | gleichwertig |
| AK-1025 | Sind mehrere Wochen offen, nennt die Erinnerung alle in einer Nachricht. | 2 (2 fachlogik) | gleichwertig |

Summe: 14 AK-IDs, 80 Prüffälle (58 fachlogik, 22 daten, 0 ablauf), dazu 1 Szenario (AK-1022-07, P10) und die 2 Fälle AK-205-01
(fachlogik) und AK-205-02 (daten) aus M02. AK-205 gehört zu M02 (deaktivierte Azubis erhalten keine Erinnerungen); sein Nachweis liegt hier.

## 6. Empfehlung

**Weg B.** Die Regeln sind als reine Funktionen in der Spec beschrieben; Anlegen, Versand und Zeitplan sind Plattformarbeit nach Profil.
Das Paket ist groß; die Steuerung darf es nach `playbooks/00-steuerung.md`, Abschnitt 3, teilen: zuerst Anlegen, Ausgangskorb und Versand
(Schritte 3 bis 5, neuartig und riskant), danach Erinnerung, Glocke und Seiten (Schritte 6 bis 9, nach dem Muster). Wichtigster Fallstrick
von 7.2: Eine `PortalException` rollt die ganze Transaktion zurück. Nachrichten werden deshalb in der Transaktion des Statuswechsels
angelegt und gehen mit ihm zurück; eine bereits vorhandene Nachricht (Eindeutigkeit) ist dagegen **kein** Fehler und bricht die
PostgreSQL-Transaktion nicht ab (`ON CONFLICT DO NOTHING`).

## 7. Schritte

1. **Branch** `claude/l72-p08-benachrichtigungen-und-erinnerung`; Spec (insbesondere M08-R07, M08-R11, M08-R13, M08-R17 und Abschnitt 8) und
   Prüffälle lesen. Prüfschritt: AK-Tabelle (Abschnitt 5) im PR-Entwurf; Liste der Fehlercodes (`kanal_unbekannt`,
   `nicht_wiederholbar`, `zugriff_verweigert`) notiert.
2. **Entities und Datenhaltung** in `modules/bh/bh-service/service.xml` nach dem gemeinsamen Profil, Abschnitt 2.3: `Notification` (`BH_Notification`: `eventKey`,
   `recipientId`, `channel`, `weeklyReportId` leer erlaubt, `subject`, `body` als `TEXT`, `link`, `createdAt`, `sentAt`, `readAt`,
   `attempts`, `nextAttemptAt`, `lastError`, `failedAt`, `userNotificationEventId`), `TeamsDevMessage` (`BH_TeamsDevMessage`, eindeutig je
   `notificationId`) und `ReminderRun` (`BH_ReminderRun`: eigener Schlüssel, `isoYear`, `isoWeek` eindeutig, `ranAt`, `createdCount`); alle mit
   `mvcc-enabled="false"` und `remote-service="false"`. Eindeutigkeit (`eventKey`, `recipientId`, `channel`) als eindeutiger Finder. Das
   Skript „Schutz in der Datenhaltung“ bekommt die Fremdschlüssel (`recipientId`, `weeklyReportId`, `notificationId` je `ON DELETE
   CASCADE`), die CHECK-Constraints `notification_app_delivered` (Kanal App gilt beim Anlegen als zugestellt: `sentAt` gesetzt),
   `notification_attempts_not_negative` und `reminder_run_iso_week_range` und den partiellen Index `notification_pending_idx` auf
   `nextAttemptAt` (`WHERE sentAt IS NULL AND failedAt IS NULL`). `buildService`, Datenbank `berichtsheft_l72` neu anlegen, Bundle neu
   starten. Prüfschritt: erzeugte `tables.sql` gegen dem gemeinsamen Profil, Abschnitt 2.3; ein zweites `INSERT` mit demselben (`eventKey`, `recipientId`, `channel`)
   scheitert in PostgreSQL.
3. **Fachregeln** `de.berichtsheft.domain.notifications` in `bh-domain` (M08-R01 bis M08-R10, M08-R13, M08-R17 bis M08-R22; Java 8, „jetzt“ als
   Parameter):
   - `Channel` (`EMAIL`, `TEAMS`, `APP` in dieser Reihenfolge), `Channels.parse(List<String>)` (doppelte zusammenfassen, feste Reihenfolge,
     leer erlaubt, jeder unbekannte Wert wirft `UnknownChannelException`, Fehlercode `kanal_unbekannt`; AK-1011), `Channels.DEFAULT`
     (E-Mail und App; AK-1012);
   - `FanOut` (eine Nachricht je gewähltem Kanal, nichts an deaktivierte Empfänger; AK-1013, AK-1014), `TransitionNotices.plan(aktion, woche,
     azubi, ausbilder)` (Empfänger nach der Tabelle in M08-R01, Anlass, Ziel `bericht`; Zurückziehen niemand; Vertretung nie; AK-1001,
     AK-1002, AK-1004-01) und `Links` (Pfade der App, Wochentexte, Basisadresse; AK-1003). Kommentar- und Begründungstexte gelangen nie in
     eine Nachricht: Die Funktion bekommt sie gar nicht;
   - `Reminders.weeks()` und `Reminders.plan(azubis)` (offene Wochen nach `classifyWeek()` aus P03, laufende Woche und Wochen ganz
     außerhalb zählen nie, überfällig = offen und vor der Vorwoche, auch abgelehnt; eine Erinnerung je Azubi mit allen Wochen aufsteigend,
     eine Information je Azubi an den zugeordneten aktiven Ausbilder, auch wenn der Azubi keinen Kanal hat; Ziel `uebersicht` bei mehreren
     Wochen; Ereignisschlüssel `reminder:<Woche des Stichtags>:<Azubi>` und `trainer-info:<Woche des Stichtags>:<Azubi>`; AK-1021 bis AK-1025,
     AK-205);
   - `ReminderSchedule.of(Instant)` (Stichtag Montag 9:00 Uhr in `Europe/Berlin` der Woche des Zeitpunkts, fällig bis Dienstag 23:59 Uhr,
     Sommer- und Winterzeit durch `java.time`; AK-1021-03 bis AK-1021-12) und `RetryDelay.seconds(n)` (30 Sekunden × 2^(n−1), höchstens
     3.600; AK-1004-02 bis AK-1004-07). `MAX_ATTEMPTS` ist 8.
   `safeReturnPath()` für den Rücksprung (M08-R10) liegt seit P02 in `de.berichtsheft.domain.access`; der Adapter `ruecksprungZiel` nutzt sie.
   Prüfschritt: JUnit-Tests `AK1001_…` bis `AK1025_…` in `bh-domain`.
4. **Fachlogik-Adapter** für `benachrichtigungenPlanen`, `erinnerungenPlanen`, `erinnerungFaellig`, `wartezeitNachFehlversuch`,
   `kanaeleWaehlen`, `voreinstellungKanaele` und `ruecksprungZiel` (Formate nach `specs/pruefung/format.md`; Fälle mit `uhr` stellen die Uhr des
   Adapters). Ein unbekannter Kanal in `kanaeleWaehlen` geht unverändert an `Channels.parse`. Prüfschritt:
   `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M08` meldet 58 grüne Fälle; `-Pbh.pruefung.modul=M02` zeigt AK-205-01 jetzt grün.
5. **Anlegen in der Transaktion des Statuswechsels** (M08-R03, M08-R06, M08-R11, M08-R12; AK-1001 bis AK-1004, AK-1013, AK-1014):
   `NotificationLocalServiceImpl.addTransitionNotifications(TransitionEvent)` wird von `transition` und `submit` (P05) **in derselben Transaktion**
   aufgerufen, nie aus der Oberfläche. Je Entwurf aus `TransitionNotices.plan()` und `FanOut`:
   - Ereignisschlüssel `status-change:<statusChangeId>` (der soeben geschriebene Historieneintrag);
   - die Kanäle werden **zum Zeitpunkt des Ereignisses** aus `BH_Person` gelesen und stehen in der Zeile (M08-R07);
   - das Einfügen läuft als `INSERT … ON CONFLICT (eventKey, recipientId, channel) DO NOTHING` über `SQLQuery.executeUpdate()` (Kennungen aus
     `CounterLocalService`; eine Unique-Verletzung würde die PostgreSQL-Transaktion abbrechen und den Statuswechsel mitreißen), danach Cache
     leeren; nur wenn eine Zeile entstand, geht es weiter;
   - Kanal App: `sentAt` = `createdAt` (zugestellt beim Anlegen, CHECK `notification_app_delivered`), dazu ein `UserNotificationEvent` als Abbild
     für die Liferay-Glocke über `UserNotificationEventLocalService` (Profil 7.2, Abschnitt 3.5) und `userNotificationEventId` in der Zeile — erst **nach** dem
     erfolgreichen Einfügen, damit eine Dublette kein verwaistes Ereignis hinterlässt;
   - E-Mail und Teams: `attempts` 0, `nextAttemptAt` = `createdAt`; versendet wird nie in dieser Transaktion (Schritt 6).
   Betreff und Text nennen Anlass, Azubi, Woche mit Zeitraum und den Link, nie Kommentartexte. Scheitert der Statuswechsel, rollt alles
   zurück (`PortalException`). Prüfschritt: `NotificationInsertTest.AK1004_dasselbeEreignisErzeugtKeineDublette`,
   `NotificationInsertTest.AK1004_rollbackDesStatuswechselsErzeugtKeineNachricht` (ein absichtlich nach dem Anlegen geworfener Fehler lässt weder
   Zeile noch `UserNotificationEvent` zurück), `NotificationContentTest.AK1003_nachrichtEnthaeltKeineKommentartexte`,
   `NotificationContentTest.AK1003_mehrereWochenNennenJedeMitLinkAufsteigend`.
6. **Kanäle und Versandlauf** (M08-R11 bis M08-R15; AK-1004) in `bh-notification`:
   - Schnittstelle `NotificationChannel` (`deliver(OutgoingMessage)`) mit den Umsetzungen `EmailChannel`, `TeamsChannel` und (nur Anlegen,
     kein Versand) `AppChannel`; die Auswahl geschieht über die OSGi-Konfiguration (Paket `…configuration`, `@Meta.OCD`): Teams-Modus
     `bh.teams.modus` (Demo: Postfach der App in `BH_TeamsDevMessage`, höchstens eine Nachricht je Benachrichtigung; ein echter Teams-Versand ist
     nicht Teil von L72 und scheitert mit klarer Meldung), das Teams-Postfach im Produktivbetrieb nur, wenn es ausdrücklich eingeschaltet ist.
   - `EmailChannel` sendet **synchron** über die `javax.mail.Session` des Portals (`MailService#getSession()`, SMTP-Host und -Port in
     `portal-ext.properties`; Demo Mailpit, Sitzung SMTP-Mock), nie über `MailService#sendEmail` (asynchron über den Message Bus, Fehler gehen
     verloren; Profil 7.2, Abschnitt 7). Jede Nachricht trägt eine feste `Message-ID` aus `notificationId`: eine `MimeMessage`-Unterklasse überschreibt
     `updateMessageID()`, weil `Transport.send` die Kennung sonst neu vergibt und der Empfänger eine Wiederholung nicht erkennt.
   - `NotificationDeliveryLocalServiceImpl.deliverNext()` ist **je Zeile eine eigene Transaktion** und wird über den OSGi-Dienst aufgerufen
     (ein Aufruf innerhalb derselben Klasse öffnet keine neue Transaktion): die nächste fällige Zeile mit Custom SQL `… WHERE sentAt IS NULL AND
     failedAt IS NULL AND nextAttemptAt <= ? ORDER BY nextAttemptAt, notificationId FOR UPDATE SKIP LOCKED` (zwei gleichzeitige Läufe überspringen
     die gesperrte Zeile), Empfänger aktiv? Wenn nein: ohne Versuch aufgeben (`failedAt` gesetzt, `lastError` mit festem Grund `RECIPIENT_INACTIVE`;
     M08-R14); sonst Übergabe an den Kanal; bei Erfolg `sentAt` und `attempts` + 1; bei Fehler `attempts` + 1, `lastError` aus der Meldung des
     Kanals, `nextAttemptAt` = jetzt + `RetryDelay.seconds(attempts)`, nach dem 8. Fehlversuch `failedAt` (aufgegeben). Zeiten kommen aus `Clock`,
     nie aus der Datenbank. Eine Übergabe, deren Markierung wegen eines Abbruchs fehlt, darf wiederholt werden (feste Kennung).
   - `deliverPending()` ruft `deliverNext()`, bis keine fällige Zeile bleibt (höchstens ein Stapel je Lauf).
   - Nicht zustellbar (M08-R15): `countUndeliverable()`, `listUndeliverable()` (neueste zuerst) und `retryUndeliverable(actorUserId, notificationId)`
     nur für aktive Ausbilder (auch die Vertretung; sonst `zugriff_verweigert`); „Erneut versuchen“ setzt per bedingtem Update
     (`… WHERE notificationId = ? AND failedAt IS NOT NULL`) `attempts` auf 0, `failedAt` leer und `nextAttemptAt` auf jetzt, an einen deaktivierten
     Empfänger nicht (`nicht_wiederholbar`).
   Prüfschritt: `OutboxTest.AK1004_zweiParalleleVersandlaeufeUebergebenJedeNachrichtEinmal` (zwei Threads, `CountDownLatch`, Test-Kanal zählt eine
   Übergabe je Nachricht), `EmailChannelTest.AK1004_wiederholungTraegtDieselbeMessageId`, `EmailChannelTest.AK1004_versandMeldetFehlerSofort`
   (SMTP-Mock aus: Fehler kommt synchron zurück), `TeamsChannelTest.AK1004_hoechstensEineNachrichtJeBenachrichtigung`,
   `TeamsChannelTest.AK1004_postfachNurWennAusdruecklichEingeschaltet` (bei `bh.betrieb=produktion` ohne Einschalten kein Postfach).
7. **Erinnerungslauf** (M08-R17 bis M08-R22; AK-1021 bis AK-1025, AK-205) in `ReminderLocalServiceImpl.runDueReminders(Instant now)`, **eine**
   Transaktion: (a) `ReminderSchedule.of(now)`; ist die Zeit nicht fällig, Ergebnis `nicht_faellig`. (b) Vermerk mit `INSERT INTO BH_ReminderRun … ON
   CONFLICT (isoYear, isoWeek) DO NOTHING`; entsteht keine Zeile, Ergebnis `schon_erledigt` (der eindeutige Schlüssel lässt von zwei gleichzeitigen
   Läufen genau einen gelingen, der zweite wartet auf die Transaktion des ersten). (c) Vor der Prüfung die fälligen Wochen aller **aktiven** Azubis
   anlegen (`ensureReportsForAllTrainees()` aus P03; M08-R18, M03-R06). (d) Azubis mit Kanälen, Ausbilder, Wochen mit Status, Inhalt und Historie
   laden (`loadReminderTrainees`, nur aktive Azubis; M08-R22), mit dem **Stichtag** als „jetzt“ planen (`Reminders.plan`), die Nachrichten aber mit dem
   tatsächlichen Zeitpunkt anlegen (Nachholen); Einfügen wie in Schritt 5 (`ON CONFLICT DO NOTHING`). (e) `createdCount` im Vermerk setzen. Wirft
   ein Schritt, rollt der Vermerk mit zurück, und der nächste Takt holt nach. Ergebnis `ausgefuehrt` mit der Zahl der angelegten Nachrichten.
   Prüfschritt: `ReminderRunTest.AK1021_zweiGleichzeitigeLaeufeLegenGenauEineWocheAn` (zwei Threads: ein `ausgefuehrt`, ein `schon_erledigt`, keine
   doppelte Nachricht), `ReminderRunTest.AK1021_abbruchNachDemVermerkRolltAllesZurueck`.
8. **Scheduler** in `bh-notification` (Profil 7.2, Abschnitt 3.3, Rahmen aus P03): `DeliveryMessageListener` (Ausgangskorb, jede Minute) und
   `ReminderMessageListener` (Erinnerung, alle 15 Minuten; ruft `runDueReminders(Clock.now())`), registriert über `SchedulerEngineHelper` und
   `TriggerFactory`, `StorageType.MEMORY_CLUSTERED`. Die Cron-Ausdrücke laufen in UTC und sind **nie** „Montag 9:00“; ob der Lauf fällig ist,
   entscheidet `ReminderSchedule` mit der Uhr und Europe/Berlin. Ein Neustart verliert nichts, weil der nächste Takt nachholt (M08-R17).
   Prüfschritt: `ReminderJobTest.AK1021_schedulerEintraegeSindRegistriert` (beide Einträge, Takt 1 bzw. 15 Minuten) und von Hand: Uhr auf Montag 9:00 Uhr
   stellen, den Takt abwarten, Nachrichten prüfen.
9. **Glocke, Kanäle, Seiten** in `bh-web` und `bh-theme` (Gestaltung folgt in P09):
   - Dienstmethoden `countUnread(actorUserId)`, `previewNotifications(actorUserId)` (liest nur) und `openNotifications(actorUserId)` (die eigenen
     App-Nachrichten, neueste zuerst, `neu` aus `readAt IS NULL` **vor** dem Markieren, danach alle mit `readAt` aus `Clock` markiert und die
     zugehörigen `UserNotificationEvent` archiviert, in einer Transaktion; M08-R16); Art (`statuswechsel`, `erinnerung`, `ueberfaellig`) und Woche je
     Nachricht als Merker `data-art` und `data-woche`.
   - `ModelListener<UserNotificationEvent>` in `bh-notification` (Profil 7.2, Abschnitt 3.5): Wird ein Ereignis über die Liferay-Glocke archiviert und ist `readAt` der
     Nachricht mit dieser `userNotificationEventId` noch leer, setzt er `readAt` aus der Uhr. Archiviert die App selbst, ist `readAt` schon gesetzt, der
     Listener tut nichts (keine Schleife). Ein `UserNotificationHandler` führt den Link der Liferay-Glocke zur App. Funktioniert der Listener nicht, gilt
     der Ausweg aus Profil 7.2, Abschnitt 3.5 (Link über die App setzt `readAt`).
   - Resource-Befehle für Zähler und Vorschau (nur lesend) für die eigene Glocke im Theme; die Vorschau markiert **nichts** (AK-1015, UI-AK-03).
   - Portlets: Benachrichtigungen (Liste, „Neu“), Einstellungen der Kanäle (`updateOwnChannels(actorUserId, werte)`: nur die eigenen Kanäle, deaktivierte Person
     `zugriff_verweigert`, unbekannter Wert `kanal_unbekannt` und nichts wird geändert), Nicht zustellbar (nur Ausbilder, mit „Erneut versuchen“), Teams-Postfach
     der Demo (Azubis eigene, Ausbilder alle; nur wenn eingeschaltet). Jeder `MVCActionCommand` übergibt nur die `userId`; die Prüfung macht der Service (M02-R13).
   Prüfschritt: `BellTest.AK1015_vorschauMarkiertNichtAlsGelesen`, `BellTest.AK1015_lesenUeberLiferayGlockeSetztReadAt`; von Hand als Anna und Bernd in Chromium.
10. **Rücksprung nach der Anmeldung** (M08-R10, AK-1003): Der Link einer Nachricht ist die absolute Adresse der Seite. Ruft jemand ohne Anmeldung eine geschützte
    Seite auf, führt Liferay zur Anmeldung und danach zum aufgerufenen Pfad; `BhLoginPostAction` (P02) prüft das Ziel mit `safeReturnPath()` und ersetzt jedes
    abgelehnte durch die Startseite (`homePathFor()`). Ob 7.2 dieses Ziel (Parameter `redirect` bzw. letzter Pfad der Sitzung) in `login.events.post` lesbar
    macht, bestätigt dieses Paket mit dem Test unten; sonst Ausweg: die Prüfung im Modul `bh-access` an der Stelle, an der Liferay das Ziel auswertet
    (siehe Bericht, „Bitte bestätigen“). Prüfschritt: `LoginRedirectTest.AK1003_linkDerNachrichtFuehrtNachDerAnmeldungZumBericht` und
    `LoginRedirectTest.AK1003_fremdeAdresseFuehrtZurStartseite` (Playwright, `liferay-72/pruefung/`, plattformeigen).
11. **Daten-Adapter und Ablauf-Aktionen.** Zustand setzt der Runner nur über die Testschnittstelle `/o/bh-pruefung/zustand` (Uhr, Bestand, Daten-Aktionen; nur bei `bh.betrieb=test`, P00). Konto-IDs sind an dieser Grenze immer `String` (`String.valueOf(userId)`; Profil 7.2, Abschnitt 6.1: Konto-ID = `userId`); die Dienste arbeiten mit `long actorUserId`, der Adapter wandelt um und ändert sonst nichts. Die Aktionen aus Abschnitt 3 über **dieselben** Dienst-Methoden wie die Portlets und der Scheduler:
    `kanaele_einstellen`, `kanaele_lesen`, `erinnerung_ausloesen` (ohne `als`, Ergebnis `ausgefuehrt` mit `angelegt`, `nicht_faellig`, `schon_erledigt`),
    `nachrichten_versenden` (mit `stoerung`), `nachrichten_lesen` (Reihenfolge Anlegen, Empfänger, Kanal; `zustand`, `versuche`, `naechsterVersuch`,
    `uebergaben`), `ungelesen_zaehlen`, `benachrichtigungen_oeffnen`, `nicht_zustellbar_lesen`, `erneut_versuchen` (der Adapter benennt die eine aufgegebene
    Nachricht über Empfänger und Kanal), `wochen_lesen`. E-Mail und Teams gehen in Daten-Fällen über einen **Test-Kanal** im Modul `bh-pruefung`
    (registriert nur bei `bh.betrieb=test`), der die Übergaben je Nachricht zählt und sich je Lauf stören lässt; nie ein echter Dienst. Fehler werden über den
    Grund der Ausnahme bzw. des Ergebnisses gemeldet, nie über den Text. Ablauf: die Aktion `erinnerung_ausloesen` und die Seite `benachrichtigungen` mit
    `nachrichten` (`art`, `woche`, `neu`) werden für das Szenario AK-1022-07 vorbereitet; verbindlich erst in P10. Prüfschritt:
    `./gradlew :modules:bh-test-integration:testIntegration --tests '*DatenPrueffaelleTest*' -Pbh.pruefung.modul=M08` (22 Fälle) und `-Pbh.pruefung.modul=M02`
    (AK-205-02) grün.
12. **Gegenproben** (je ein benannter Fehler, je ein roter Lauf, danach zurücknehmen und grün zeigen):

    | Name | Absichtlich eingebauter Fehler | Wird rot | Bleibt grün (und warum) |
    | --- | --- | --- | --- |
    | F-P08-1 „Alle Ausbilder“ (AK-1001) | `addTransitionNotifications` legt beim Einreichen für jeden aktiven Ausbilder an | AK-1001-04, AK-1002-07 | AK-1001-01 bis AK-1001-03 (Fachlogik), AK-1002-06 (dort kommt die Nachricht beim Azubi an) |
    | F-P08-2 „Zurückziehen benachrichtigt“ (AK-1002) | `TransitionNotices.plan` benachrichtigt auch beim Zurückziehen den Ausbilder | AK-1002-05, AK-1002-07 | AK-1002-04 |
    | F-P08-3 „Kommentartext in der Nachricht“ (AK-1003) | der Gesamtkommentar wird in `body` kopiert | `NotificationContentTest.AK1003_nachrichtEnthaeltKeineKommentartexte` | AK-1003-01: kein neutraler Fall sieht den Text der Nachricht |
    | F-P08-4 „Fremde Adresse als Rücksprungziel“ (AK-1003) | `safeReturnPath()` lässt jede Adresse zu | AK-1003-04, AK-1003-05, AK-1003-07 und `LoginRedirectTest.AK1003_fremdeAdresseFuehrtZurStartseite` | AK-1003-02, AK-1003-03, AK-1003-08 |
    | F-P08-5 „Wartezeit ohne Obergrenze“ (AK-1004) | `RetryDelay.seconds` ohne `min(…, 3600)` | AK-1004-06, AK-1004-07 | AK-1004-02 bis AK-1004-05 (unter einer Stunde) |
    | F-P08-6 „Aufgeben erst nach 9 Versuchen“ (AK-1004) | `MAX_ATTEMPTS` 9 | AK-1004-11 | AK-1004-10 (ein Fehlversuch) |
    | F-P08-7 „Ohne Zeilensperre“ (AK-1004) | `SKIP LOCKED` und `FOR UPDATE` aus der Abfrage von `deliverNext()` entfernen | `OutboxTest.AK1004_zweiParalleleVersandlaeufeUebergebenJedeNachrichtEinmal` (Nachricht doppelt übergeben) | AK-1004-08 (nacheinander) |
    | F-P08-8 „Anlegen ohne Eindeutigkeit“ (AK-1004) | eindeutigen Finder in der Testdatenbank entfernen | `NotificationInsertTest.AK1004_dasselbeEreignisErzeugtKeineDublette` | AK-1004-08 |
    | F-P08-9 „Nachricht in eigener Transaktion“ (AK-1004) | `addTransitionNotifications` mit `REQUIRES_NEW` | `NotificationInsertTest.AK1004_rollbackDesStatuswechselsErzeugtKeineNachricht` | AK-1004-09: dort wird abgewiesen, bevor etwas geschrieben ist |
    | F-P08-10 „Deaktivierter Empfänger wird bedient“ (AK-1004) | `deliverNext()` prüft `active` nicht | AK-1004-12 | AK-1004-08 |
    | F-P08-11 „Azubi sieht nicht zustellbare“ (AK-1004) | `listUndeliverable()` prüft die Rolle nicht | AK-1004-11 (Azubi erhält `zugriff_verweigert`) | AK-1004-12 |
    | F-P08-12 „Message-ID wechselt“ (AK-1004) | `updateMessageID()` nicht überschrieben | `EmailChannelTest.AK1004_wiederholungTraegtDieselbeMessageId` | alle Prüffälle: der Test-Kanal kennt keine Message-ID |
    | F-P08-13 „Kanal beim Versand gelesen“ (AK-1014) | `deliverNext()` liest den Kanal aus `BH_Person` statt aus der Zeile | AK-1014-01, AK-1014-02 | AK-1013-05 |
    | F-P08-14 „Unbekannter Kanal gespeichert“ (AK-1011) | `Channels.parse` ignoriert unbekannte Werte | AK-1011-04, AK-1011-05 | AK-1011-01 bis AK-1011-03 |
    | F-P08-15 „Deaktivierte Person ändert Kanäle“ (AK-1011) | `updateOwnChannels` prüft `active` nicht | AK-1011-05 | AK-1011-04 |
    | F-P08-16 „Voreinstellung nur E-Mail“ (AK-1012) | `Channels.DEFAULT` ohne App | AK-1012-01, AK-1012-02 | AK-1011-02 |
    | F-P08-17 „Vorschau markiert gelesen“ (AK-1015) | `previewNotifications` setzt `readAt` | `BellTest.AK1015_vorschauMarkiertNichtAlsGelesen` | AK-1015-01 |
    | F-P08-18 „Neu nach dem Markieren“ (AK-1015) | `openNotifications` berechnet `neu` nach dem Markieren | AK-1015-01 | `BellTest.AK1015_vorschauMarkiertNichtAlsGelesen` |
    | F-P08-19 „Liferay-Glocke ohne readAt“ (AK-1015) | den `ModelListener<UserNotificationEvent>` per Gogo-Shell `scr:disable` abschalten | `BellTest.AK1015_lesenUeberLiferayGlockeSetztReadAt` | AK-1015-01 (liest über die App) |
    | F-P08-20 „Stichtag in UTC“ (AK-1021) | `ReminderSchedule` rechnet Montag 9:00 Uhr in UTC | AK-1021-03, AK-1021-05, AK-1021-11, AK-1021-13 | AK-1021-04, AK-1021-08 |
    | F-P08-21 „Nachholen ohne Ende“ (AK-1021) | das Fenster endet nie | AK-1021-08, AK-1021-12, AK-1021-16 | AK-1021-07 (Dienstag 23:59 Uhr ist noch drin) |
    | F-P08-22 „Zweiter Lauf derselben Woche“ (AK-1021) | der Vermerk `BH_ReminderRun` wird nicht geprüft | AK-1021-14 und `ReminderRunTest.AK1021_zweiGleichzeitigeLaeufeLegenGenauEineWocheAn` | AK-1021-13 (erster Lauf) |
    | F-P08-23 „Vorwoche ist überfällig“ (AK-1021) | überfällig = vor der laufenden Woche statt vor der Vorwoche | AK-1021-01 (Bernd bekommt nichts) | AK-1022-01 (KW 41 ist am 19.10. in beiden Lesarten überfällig) |
    | F-P08-24 „Abgelehnt gilt nicht als offen“ (AK-1021) | `Reminders.weeks()` zählt nur den Status Entwurf | AK-1021-02, AK-1022-02, AK-1024-03 | AK-1021-01 |
    | F-P08-25 „Eine Nachricht je Woche“ (AK-1025) | `Reminders.plan` legt je Woche eine Erinnerung an | AK-1025-01, AK-1025-02, AK-1022-06 | AK-1021-01 (nur eine offene Woche) |
    | F-P08-26 „Information nur mit Azubi-Kanal“ (AK-1022) | der Ausbilder wird nur informiert, wenn der Azubi einen Kanal hat | AK-1022-03 | AK-1022-04 |
    | F-P08-27 „Erinnerung vor dem Anlegen der Wochen“ (AK-1022) | Schritt (c) in `runDueReminders` hinter Schritt (d) | AK-1022-06 | AK-1021-13 |
    | F-P08-28 „Deaktivierte Azubis erinnert“ (AK-205) | `Reminders.plan` ignoriert `aktiv` | AK-205-01 | AK-1022-01 |
    | F-P08-29 „Deaktivierte Azubis im Lauf“ (AK-205) | `loadReminderTrainees` und das Anlegen nehmen alle statt nur aktive Azubis | AK-205-02 | AK-205-01 |
    | F-P08-30 „Cron in Berliner Zeit“ (AK-1021) | der Erinnerungseintrag als wöchentlicher Cron „Montag 9:00“ statt Takt | `ReminderJobTest.AK1021_schedulerEintraegeSindRegistriert` | AK-1021-03 bis AK-1021-12 |
    | F-P08-31 „Teams-Postfach in Produktion“ (AK-1004) | `TeamsChannel` schreibt auch bei `produktion` ohne Einschalten | `TeamsChannelTest.AK1004_postfachNurWennAusdruecklichEingeschaltet` | AK-1004-08 |
    | F-P08-32 „Zweite Teams-Nachricht“ (AK-1004) | den eindeutigen Schlüssel `notificationId` in `BH_TeamsDevMessage` entfernen | `TeamsChannelTest.AK1004_hoechstensEineNachrichtJeBenachrichtigung` | AK-1004-10 |
    | F-P08-33 „Rücksprung ungeprüft“ (AK-1003) | `BhLoginPostAction` übergibt das Ziel ohne `safeReturnPath()` | `LoginRedirectTest.AK1003_fremdeAdresseFuehrtZurStartseite` | AK-1003-04 (die Funktion selbst bleibt richtig) |

    Prüfschritt: dreiunddreißig rote Läufe mit den benannten Fällen im PR notiert, danach alles grün.
13. **Bau-Stand.** M08 in die Bau-Liste eintragen und AK-205-01 und AK-205-02 freigeben. Prüfung nach Abschnitt 8.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M08` | 58 Fachlogik-Fälle grün, keiner „noch nicht gebaut“ |
| `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M02` | AK-205-01 grün (alle zurückgestellten Fälle von M02 freigegeben) |
| `./gradlew :modules:bh-test-integration:testIntegration --tests '*DatenPrueffaelleTest*' -Pbh.pruefung.modul=M08` | 22 Daten-Fälle grün; AK-205-02 über `-Pbh.pruefung.modul=M02` grün |
| `./gradlew :modules:bh-domain:test` | JUnit-Tests `AK1001_…` bis `AK1025_…` grün; Systemzeit-Prüfung grün |
| `./gradlew :modules:bh-test-integration:testIntegration --tests '*NotificationInsertTest*' --tests '*NotificationContentTest*' --tests '*OutboxTest*' --tests '*EmailChannelTest*' --tests '*TeamsChannelTest*' --tests '*ReminderRunTest*' --tests '*ReminderJobTest*' --tests '*BellTest*'` | grün (Rollback, Gleichzeitigkeit, Kanäle, Scheduler, Glocke) |
| `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium --project=smartphone-375` | Ablauf-Fälle der gebauten Module und `LoginRedirectTest` grün; das Szenario AK-1022-07 ist vorbereitet |
| `./gradlew build formatSource` | grün, keine Änderungen |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: E-Mail an Mailpit (`http://localhost:8025`) mit sichtbarer Message-ID, Firefox und Edge. Im PR vermerken.

## 9. Abschluss

- Commit, z. B. „L72-P08: Benachrichtigungen und Erinnerung (Ausgangskorb, Mail-Sitzung, Erinnerungslauf, Glocke)“; vor dem Push `./gradlew build`, die
  Prüf-Adapter von M08 und M02 und die plattformeigenen Tests lokal grün.
- Draft-PR mit der AK-Tabelle (AK-1001, AK-1002, AK-1003, AK-1004, AK-1011, AK-1012, AK-1013, AK-1014, AK-1015, AK-1021, AK-1022, AK-1023, AK-1024, AK-1025 mit
  Test und Prüffällen, dazu AK-205), dem vorbereiteten Szenario AK-1022-07, den Gegenproben mit den roten Fällen und „Bitte bestätigen“ (Rücksprung nach
  der Anmeldung, Glocke, neue Konfigurationseigenschaften). Geschützte Pfade: `service.xml`, `**/sql/**`, `**/custom-sql/**`,
  `**/service/persistence/impl/**`, `**/service/impl/**`, `**/model/listener/**`, `**/upgrade/**`, `bh-access` (Rücksprung), `bh-pruefung` (Test-Kanal),
  `**/configuration/**` und `liferay-72/configs/**` (gemeinsames Profil, Abschnitt 5); Chris mergt.
- Bericht an die Steuerung per `send_message`; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Statuswechsel bricht ab, weil die Nachricht schon existiert | `INSERT … ON CONFLICT DO NOTHING`, nie `addNotification` mit Ausnahme (eine Unique-Verletzung bricht die PostgreSQL-Transaktion ab) |
| Nachricht bleibt nach einem Rollback stehen | Anlegen in derselben Transaktion wie der Statuswechsel, kein `REQUIRES_NEW` (Profil 7.2, Abschnitt 7) |
| Nachricht doppelt versendet | beide Sicherungen bauen: Eindeutigkeit beim Anlegen und `SKIP LOCKED` beim Versand (AK-1004) |
| Versand blockiert oder verliert Fehler | `MailService` versendet asynchron; die Mail-Sitzung des Portals nutzen und nie in der Transaktion des Statuswechsels senden |
| Empfänger erkennt die Wiederholung nicht | feste Message-ID; `updateMessageID()` der `MimeMessage` überschreiben |
| Zweite Zeile wird in derselben Transaktion nicht gesperrt | `deliverNext()` über den OSGi-Dienst aufrufen; ein Aufruf in derselben Klasse öffnet keine neue Transaktion |
| Stichtag um eine Stunde verschoben | Montag 9:00 Uhr in `Europe/Berlin` rechnen, nie als Cron in UTC; der Scheduler läuft nur im Takt |
| Zweite Erinnerung für dieselbe Woche | Vermerk `BH_ReminderRun` in derselben Transaktion wie die Nachrichten; Schlüssel enthält die Woche des Stichtags |
| Wartezeiten stimmen nicht | `nextAttemptAt` aus `Clock`, `TIMESTAMP` in UTC; nie `now()` der Datenbank |
| Kommentartext in der Nachricht | `TransitionNotices.plan` bekommt die Kommentare gar nicht |
| Öffnen der Vorschau markiert als gelesen | nur die Liste markiert (AK-1015); Zähler und Vorschau lesen nur |
| Gelesen in der Liferay-Glocke bleibt in der App ungelesen | `ModelListener<UserNotificationEvent>` setzt `readAt`; Ausweg Link über die App (Profil 7.2, Abschnitt 3.5) |
| Echte Mail oder Teams in einem Test | SMTP-Mock bzw. Test-Kanal je Fall |
| Link der Nachricht führt nach dem Login auf die Startseite | Ziel prüfen, nicht verwerfen: `safeReturnPath()` lässt Pfade der App zu |

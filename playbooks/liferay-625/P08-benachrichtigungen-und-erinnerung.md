# P08 Benachrichtigungen und Erinnerung (M08)

Reihe `playbooks/liferay-625/` · Plattform Liferay Portal 6.2.5 CE GA6 · Profil `profile/liferay-625.md` (auf Grundlage
von `profile/liferay-gemeinsam.md`) · Stand: 16.10.2026 (Etappe G4, Paket J) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Statuswechsel und Erinnerungen erzeugen Benachrichtigungen im Ausgangskorb (`BH_Notification`) über die Kanäle E-Mail,
Teams und App, genau eine je Ereignis, Empfänger und Kanal; ein Versandlauf übergibt E-Mail und Teams mit Wiederholung und
Aufgeben; der Kanal App zeigt den Zähler und die Liste; der Erinnerungslauf läuft montags um 9:00 Uhr Berliner Zeit mit
Nachholen bis Dienstag 23:59 Uhr. Fachlogik in `de.berichtsheft.domain.notifications`, Anlegen in der Transaktion des
Statuswechsels, Versand und Erinnerung in `NotificationLocalServiceImpl`, Scheduler-Einträge in `liferay-portlet.xml`.
Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M08.json` grün sind (14 AK-IDs; 58 Fachlogik- und 22 Daten-Fälle) und die zwei in P02
   zurückgestellten Fälle AK-205-01 und AK-205-02 (M02) freigegeben und grün sind;
2. die eigenen Tests grün sind: `AK1004_EindeutigJeEreignisEmpfaengerKanalTest` und `AK1021_ErinnerungslaufDatenhaltungTest`
   in `test/db/`, `AK1004_ZweiGleichzeitigeVersandlaeufeTest`, `AK1021_ZweiGleichzeitigeErinnerungslaeufeTest`,
   `AK1004_NachrichtenUndStatuswechselInEinerTransaktionTest`, `AK1004_FehlversuchBleibtGespeichertTest`,
   `AK1004_ListenerTutImTestbetriebNichtsTest`, `AK1021_ErinnerungLegtFehlendeWochenAnTest` und
   `AK1015_VorschauMarkiertNichtsTest` in `test/integration/` sowie der Playwright-Test
   `ak-1001-1025-benachrichtigungen.spec.ts` (Schritt 11; die Prüffälle prüfen weder echte Gleichzeitigkeit noch echten Versand
   noch den Rücksprung nach der Anmeldung);
3. die **Gegenprobe** aus Schritt 12 durchgeführt ist: jeder benannte Fehler macht genau die benannten Prüffälle bzw. Tests rot
   und ist danach zurückgenommen;
4. das Beispielszenario „Erinnerung und Information an den Ausbilder“ (AK-1022-07) in `specs/pruefung/szenarien.json`
   vorbereitet ist (Ablauf-Aktion `erinnerung_ausloesen`, Seite `benachrichtigungen`); verbindlich verlangt wird es erst in
   P10, weil es die Seiten von P09 braucht;
5. die Prüffälle von M01 bis M07 weiterhin grün sind.

Schemaänderung: ja. Neue Entities `Notification`, `TeamsDevMessage` und `ReminderRun` (`service.xml`), Teile im Skript
„Schutz in der Datenhaltung“ (gemeinsames Profil, Abschnitte 2.3 und 2.6): Fremdschlüssel, eindeutige Indizes, CHECK-Constraints und der partielle
Index `notification_pending_idx`. Bis `1.0.0` wird die Demo-Datenbank neu angelegt (P02, „Bitte bestätigen“). Neue Schlüssel in
`portal-ext.beispiel.properties` (Abschnitt „Bitte bestätigen“).

## 2. Voraussetzungen

- P00 bis P07 der Reihe abgenommen: Uhr, Wochen und Zeit (P01), Personen, Kanalspalten, Zuordnung, `safeReturnPath()`,
  Anmeldung und Rücksprung (P02), Berichte und „offen“ (P03), Statuswechsel mit dem Einhängepunkt `TransitionEvent`, Sperre und
  Historie (P05, P06), Prüf-Runner mit Bau-Stand (P00). P08 ist das größte Paket; die Steuerung darf es nach Stufe teilen
  (zuerst Schritte 3 bis 6: Ausgangskorb und Versand, neuartig; danach Erinnerung und Oberfläche nach dem Muster).
- Profil 6.2.5, Abschnitte 3 („Transaktion“, „Sperre und bedingtes Update“, „Hintergrundjobs“, „Benachrichtigung in der App“,
  „E-Mail“, „Teams“), 3.1 (Glocke), 4.1, 4.2 (Testschnittstelle), 4.3 und 7 („Lesende Transaktionen“, „Zurückrollen“, „Cache nach
  Custom SQL“, „Scheduler in GMT“, „Mail“). Gemeinsames Profil, Abschnitte 2.2, 2.3 (Tabellen), 2.4 (Cache), 2.5 (Glocke, `BH_ReminderRun`),
  2.6 und 3.2 (Teams-Adapter, E-Mail, Ausgangskorb und Zeitplan).

## 3. Eingaben

- Fach-Spec: `specs/M08-benachrichtigungen-und-erinnerung.md` (Regeln M08-R01 bis M08-R22, Abschnitt 5 Datenmodell, Abschnitt 6
  Schnittstellen, Abschnitt 8 Anforderungen an die Plattform, Abschnitt 10 offene Punkte).
- Prüffälle: `specs/pruefung/M08.json`, dazu `specs/pruefung/M02.json` (AK-205-01, AK-205-02) und das Szenario in
  `specs/pruefung/szenarien.json`; Formate, Aktionen und Fehlercodes: `specs/pruefung/format.md`, „Schnittstellen und Aktionen
  von M08“ (Test-Kanal, Gespeicherte Nachricht) und „Regeln für Adapter“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M08 Benachrichtigungen und Erinnerung“ (Fallen: genau einmal an zwei
  Stellen, Ereignisschlüssel mit Art und Woche des Stichtags, Datenbankverbindung in UTC, Kommentartexte nie in der Nachricht).
- Profil: `profile/liferay-625.md`, Abschnitte 3, 4.2, 4.3 und 7; `profile/liferay-gemeinsam.md`, Abschnitte 2.3, 2.4, 2.5 und 3.2.

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Übertragbar 1:1 sind die Regeln in `src/domain/notifications.ts` (Kanäle, `fanOut()`,
`planTransitionNotifications()`, Links, `planReminders()`, `retryDelaySeconds()`) und `safeReturnPath()` in `src/domain/access.ts`.
Nach Profil neu zu bauen sind `reminderSchedule()` (`Intl.DateTimeFormat` wird `java.time` mit `Europe/Berlin`), der Ausgangskorb
in `src/lib/notifications/service.ts` und `src/lib/notifications/outbox.ts` (Prisma wird Service Builder und Custom SQL;
`FOR NO KEY UPDATE SKIP LOCKED` wird `FOR UPDATE SKIP LOCKED`), die Kanäle in `src/lib/notifications/adapters.ts` (Nodemailer wird
`MailEngine.send`, das Teams-Postfach der Demo bleibt eine Tabelle), `src/lib/notifications/config.ts` (Umgebungsvariablen werden
Eigenschaften in `portal-ext.properties`), der Zeitplan in `src/worker/index.ts` (pg-boss wird `scheduler-entry`) und die Routen
der Glocke. `src/lib/notifications/service.ts` zeigt außerdem, wie der Erinnerungslauf den Vermerk in derselben Transaktion
schreibt. Belege zum Abgleich: `src/domain/notifications.test.ts`, `tests/db/notifications.test.ts`, `tests/db/reminders.test.ts`,
`e2e/ak-1001-1025-benachrichtigungen.spec.ts`, `tests/smtp-mock.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Schema und Skript, (2) Fachregeln, (3) Anlegen in der Transaktion des Statuswechsels, (4) Kanäle und
Versand, (5) Erinnerungslauf, (6) Scheduler, (7) Glocke, Kanäle und „Nicht zustellbar“ im Portal, (8) Adapter und
Testschnittstelle, (9) eigene Tests, (10) Gegenprobe. Zählweise der Prüffälle: alle Fälle der Prüffall-Datei je AK-ID, **ohne** das
Ablauf-Szenario aus `specs/pruefung/szenarien.json`; das Szenario steht in der Spalte „Prüffälle“ gesondert (AK-1022-07 ist
Szenario (P10)). Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-1001 | Beim Einreichen wird der zugeordnete Ausbilder benachrichtigt, andere Ausbilder nicht. | 4 (3 fachlogik, 1 daten): AK-1001-01 bis AK-1001-04 | `specs/pruefung/M08.json` |
| AK-1002 | Bei Freigabe, Ablehnung und Rücknahme wird der Azubi benachrichtigt; erneutes Einreichen benachrichtigt den Ausbilder wie das erste, Zurückziehen niemanden. | 7 (5 fachlogik, 2 daten): AK-1002-01 bis AK-1002-07 | `specs/pruefung/M08.json` |
| AK-1003 | Jede Nachricht nennt Azubi, Woche und Anlass und verlinkt den Bericht; ohne Kommentartexte; mehrere Wochen je mit Link; Rücksprung nach der Anmeldung, fremde Adressen ignoriert. | 8 (8 fachlogik): AK-1003-01 bis AK-1003-08 | `specs/pruefung/M08.json` |
| AK-1004 | Pro Ereignis und Kanal genau eine Nachricht; Wiederholung mit Wartezeit; Aufgeben nach Fehlversuchen oder bei deaktiviertem Empfänger; „Nicht zustellbare Nachrichten“ mit „Erneut versuchen“. | 12 (7 fachlogik, 5 daten): AK-1004-01 bis AK-1004-12 | `specs/pruefung/M08.json` |
| AK-1011 | Jede Person kann E-Mail, Teams und App beliebig kombinieren, auch alle abwählen. | 5 (4 fachlogik, 1 daten): AK-1011-01 bis AK-1011-05 | `specs/pruefung/M08.json` |
| AK-1012 | Neue Personen haben die Voreinstellung E-Mail + App. | 2 (1 fachlogik, 1 daten): AK-1012-01, AK-1012-02 | `specs/pruefung/M08.json` |
| AK-1013 | Nur über die gewählten Kanäle; ohne Kanal keine Nachricht, der Status bleibt in der App sichtbar. | 5 (4 fachlogik, 1 daten): AK-1013-01 bis AK-1013-05 | `specs/pruefung/M08.json` |
| AK-1014 | Geänderte Kanäle gelten ab dem nächsten Ereignis; angelegte, noch nicht versendete Nachrichten über den ursprünglichen Kanal. | 2 (2 daten): AK-1014-01, AK-1014-02 | `specs/pruefung/M08.json` |
| AK-1015 | Der Kanal App zeigt ungelesene Nachrichten mit Zähler; das Öffnen der Liste markiert alle als gelesen, die ungelesenen sind dabei „Neu“. | 1 (1 daten): AK-1015-01 | `specs/pruefung/M08.json` |
| AK-1021 | Ist die Vorwoche am Montag um 9:00 Uhr noch offen, erhält der Azubi eine Erinnerung; einmal nachgeholt bis Dienstag 23:59 Uhr, Stichtag bleibt Montag. | 17 (12 fachlogik, 5 daten): AK-1021-01 bis AK-1021-17 | `specs/pruefung/M08.json` |
| AK-1022 | Ist dieselbe Woche am folgenden Montag noch offen, wird zusätzlich der zugeordnete Ausbilder informiert; jede offene Woche vor der Vorwoche, auch abgelehnte; eine Nachricht pro Azubi; Azubi ohne Kanal: Ausbilder trotzdem. | 6 (5 fachlogik, 1 daten): AK-1022-01 bis AK-1022-06; AK-1022-07 ist Szenario (P10) | `specs/pruefung/M08.json`, `specs/pruefung/szenarien.json` |
| AK-1023 | Für eingereichte oder freigegebene Wochen und für die laufende Woche kommt keine Erinnerung. | 5 (4 fachlogik, 1 daten): AK-1023-01 bis AK-1023-05 | `specs/pruefung/M08.json` |
| AK-1024 | Erinnerung und Information gehen jeden Montag erneut raus, bis die Woche eingereicht ist. | 4 (3 fachlogik, 1 daten): AK-1024-01 bis AK-1024-04 | `specs/pruefung/M08.json` |
| AK-1025 | Sind mehrere Wochen offen, nennt die Erinnerung alle in einer Nachricht. | 2 (2 fachlogik): AK-1025-01, AK-1025-02 | `specs/pruefung/M08.json` |

Summe: 14 AK-IDs, 80 Prüffälle in `M08.json` (58 `fachlogik`, 22 `daten`), dazu das Szenario AK-1022-07 (P10, getrennt gezählt)
und die M02-Fälle AK-205-01 (fachlogik) und AK-205-02 (daten), die mit P08 anlaufen. Kein Prüffall prüft die Anzeige, echten
Versand, echte Gleichzeitigkeit zweier Läufe oder den tatsächlichen Rücksprung (Fach-Spec, Abschnitt 4 und 10); dafür sind die eigenen
Tests aus Schritt 11 da.

## 6. Empfehlung

**Weg B.** Die Regeln sind als reine Funktionen in der Spec beschrieben; Versand und Zeitplan sind Plattformarbeit nach Profil.
Auf 6.2.5 sitzen die Gefahren in der Transaktion: Eine `PortalException` rollt alles zurück, auch das Buchführen des Fehlversuchs
und den Vermerk des Erinnerungslaufs; ein lesender Methodenname (`get…`) schreibt nichts; E-Mail geht synchron über
`MailEngine.send`, weil `MailServiceUtil` Fehler verschluckt (Profil 6.2.5, Abschnitte 3 „E-Mail“ und 7 „Mail“); Quartz rechnet in GMT, die Fälligkeit
entscheidet deshalb die Fachlogik (Profil 6.2.5, Abschnitt 3 „Hintergrundjobs“). Die Schritte 4, 5 und 12 sind deshalb Pflicht. Weg A nur auf
ausdrücklichen Auftrag.

## 7. Schritte

Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh`, Playwright im Wurzelordner.

1. **Branch** `claude/l62-p08-benachrichtigungen-und-erinnerung`; Spec (M08-R01 bis M08-R22), Profil 6.2.5, Abschnitte 3 und 7 und Prüffälle lesen.
   Prüfschritt: AK-Tabelle aus Abschnitt 5 im PR-Entwurf.
2. **Schema und Skript** (gemeinsames Profil, Abschnitte 2.3 und 2.6; Profil 6.2.5, Abschnitt 3 „Schema-Schritte“). `service.xml`: Entity `Notification`
   (`notificationId`, `companyId`, `eventKey`, `recipientId`, `channel`, `weeklyReportId` optional, `subject`, `body`, `link`,
   `createdAt`, `sentAt`, `readAt`, `attempts`, `nextAttemptAt`, `lastError`, `failedAt`, `userNotificationEventId` optional),
   `TeamsDevMessage` (`notificationId` eindeutig, `recipientId`, `subject`, `body`, `link`, `createdAt`) und `ReminderRun`
   (`reminderRunId`, `isoYear`, `isoWeek`, `ranAt`, `createdCount`; `remote-service="false"` wie in P03). Die Kanalspalten
   `channelEmail`, `channelTeams`, `channelApp` an `Person` gibt es seit P02; die Voreinstellung E-Mail + App (AK-1012) beim Anlegen einer Person
   prüft und setzt P08 in `PersonLocalServiceImpl.addPerson` (P02), falls sie fehlt. Das Skript wächst um: Fremdschlüssel
   (`recipientId` und `weeklyReportId` `ON DELETE CASCADE`, `TeamsDevMessage.notificationId` und `recipientId` `ON DELETE CASCADE`),
   eindeutige Indizes (`eventKey`, `recipientId`, `channel`), (`notificationId`) in `BH_TeamsDevMessage` und (`isoYear`, `isoWeek`) in
   `BH_ReminderRun`, die CHECK-Constraints `notification_app_delivered` (Kanal App hat `sentAt`), `notification_attempts_not_negative`,
   `reminder_run_iso_week_range` (1 bis 53) und der Wertebereich von `channel`, dazu der partielle Index `notification_pending_idx`
   auf `nextAttemptAt` `WHERE sentAt IS NULL AND failedAt IS NULL`. Prüfschritt: `ant build-service deploy`; dasselbe Ereignis für
   denselben Empfänger und Kanal lässt sich per `psql` nicht doppelt anlegen.
3. **Fachregeln `de.berichtsheft.domain.notifications`** (Gegenstück zu `src/domain/notifications.ts`; Java 8, kein Import aus
   `com.liferay.*`): `Channel` (`email`, `teams`, `app`, Reihenfolge fest), `Channels.parse()` (Doppelte zusammengefasst, feste
   Reihenfolge, leer erlaubt, ein unbekannter Kanal wirft `UnknownChannelException` mit `kanal_unbekannt`; AK-1011), `DEFAULT_CHANNELS`
   (E-Mail + App; AK-1012), `FanOut.fanOut()` mit `Recipient`, `NotificationDraft`, `NotificationAbout` (eine Nachricht je gewähltem
   Kanal, nichts an einen deaktivierten Empfänger; AK-1013, AK-1014), `TransitionNotifications.plan()` und `TransitionNotice`
   (Empfänger und Inhalt je Statuswechsel nach M08-R01; Anlass `eingereicht`, `erneut_eingereicht`, `freigegeben`, `abgelehnt`,
   `freigabe_zurueckgenommen`; Zurückziehen niemanden; Kommentar- und Begründungstexte erhält die Funktion gar nicht,
   M08-R08; AK-1001, AK-1002), `NotificationLinks` (`reportPath()`, `traineeOverviewPath()`, `absoluteUrl()`, Wochentexte; Pfade aus
   der Adresstabelle `liferay-625/e2e/seiten.ts`, P00, Basis der Adresse aus der Eigenschaft `bh.app.url`, siehe „Bitte
   bestätigen“; AK-1003), `Reminders.reminderWeeks()` und `Reminders.planReminders()` mit `ReminderTrainee`, `ReminderWeek` (offene
   und überfällige Wochen zum Stichtag nach M03-R14, Erinnerung und Information, eine Nachricht pro Azubi, mehrere Wochen in
   einer Nachricht mit Ziel Übersicht; AK-1021 bis AK-1025, AK-205), `ReminderSchedule.reminderSchedule(now)` (Stichtag Montag 9:00
   Uhr in `Europe/Berlin` mit `java.time`, Nachholen bis Dienstag 23:59 Uhr, gleiche Woche, danach nicht mehr; Sommer- und
   Winterzeit) und `RetryPolicy.retryDelaySeconds(n)` (30 s × 2^(n−1), höchstens 3.600 s; nach dem 8. Fehlversuch aufgeben, M08-R13).
   Der Ereignisschlüssel trägt die Art und für Erinnerungen die Woche des Stichtags: `status-change:<statusChangeId>`,
   `reminder:<Jahr>-W<Woche>:<traineeId>`, `trainer-info:<Jahr>-W<Woche>:<traineeId>` (gemeinsames Profil, Abschnitt 2.3; ein Lauf mit anderer Woche
   erzeugt neue Nachrichten, derselbe nicht). `safeReturnPath()` (M08-R10) gibt es seit P02; P08 verdrahtet es im Adapter
   `ruecksprungZiel`. „Jetzt“ nur als Parameter aus der Uhr (P01). Prüfschritt: Unit-Tests in `test/unit/` mit Namen ab der
   AK-ID.
4. **Anlegen in der Transaktion des Statuswechsels** (M08-R03, M08-R07, M08-R11, M08-R12; AK-1001 bis AK-1004, AK-1014).
   `NotificationLocalServiceImpl.recordTransitionNotifications(event)` ist der Einhängepunkt aus P05 (Schritt 7, Nr. 6): Es
   läuft **in derselben Service-Transaktion** wie der Statuswechsel, nach der Historie, nie in einer eigenen Transaktion
   (`REQUIRES_NEW`), und wird aus `WeeklyReportLocalServiceImpl` intern aufgerufen, nicht als öffentlicher Service. Es legt je
   Entwurf aus `plan()` eine Zeile an, über Custom SQL in `NotificationFinderImpl` (`insertNotification`: `INSERT … ON CONFLICT
   (eventKey, recipientId, channel) DO NOTHING`, Schlüssel aus `CounterLocalServiceUtil`): ein zweites Anlegen desselben Ereignisses
   erzeugt keine Dublette und bricht die Transaktion nicht ab (PostgreSQL bricht sie nach einem Schlüsselfehler ab, Profil 6.2.5, Abschnitt 7
   „Zurückrollen“). App-Nachrichten bekommen `sentAt = createdAt` (M08-R12), E-Mail und Teams `nextAttemptAt = createdAt` und
   `attempts = 0`. Die Kanäle gelten wie beim Ereignis eingestellt (M08-R07). Ein gescheiterter Statuswechsel legt nichts an: Die
   Ablehnung rollt als `PortalException` zurück, und die Nachrichten sind mit zurückgerollt. Nach dem Custom SQL den Entity- und
   Finder-Cache von `Notification` leeren (Profil 6.2.5, Abschnitt 7). Prüfschritt: Test in Schritt 11.
5. **Kanäle und Versand** (M08-R11 bis M08-R15, Abschnitt 8 der Spec; gemeinsames Profil, Abschnitt 3.2). Kanäle als Schnittstelle
   `DeliveryChannel` mit den Umsetzungen `EmailChannel` (synchron über `MailEngine.send`, Absender und SMTP aus
   `portal-ext.properties`, Mailpit Port 1025, feste `Message-ID` aus der Kennung der Benachrichtigung, damit eine Wiederholung
   erkennbar ist), `TeamsDevChannel` (schreibt in `BH_TeamsDevMessage`, höchstens eine Zeile je Benachrichtigung über den
   eindeutigen Schlüssel; gewählt über `bh.teams.modus`, im Produktivbetrieb nur ausdrücklich eingeschaltet) und `AppChannel`
   (kein Versand). Der Versand ist **ein Lauf aus vielen kleinen Transaktionen**: `deliverNextNotification(now, channels)`
   (Name ohne `get…`) sperrt in **einer** Service-Transaktion die nächste fällige Zeile mit Custom SQL `SELECT … WHERE sentAt
   IS NULL AND failedAt IS NULL AND nextAttemptAt <= ? AND channel IN ('EMAIL','TEAMS') ORDER BY nextAttemptAt, notificationId
   LIMIT 1 FOR UPDATE SKIP LOCKED` (Profil 6.2.5, Abschnitt 3, „In P00 zu bestätigen“ 10), übergibt sie dem Kanal und schreibt das Ergebnis; der
   Dispatcher ruft die Methode, bis sie `NONE` meldet. Zwei gleichzeitige Läufe bekommen so nie dieselbe Zeile. **Genau einmal**
   hängt an zwei Stellen: dem eindeutigen Schlüssel beim Anlegen (Schritt 4) und `SKIP LOCKED` beim Versand; wer nur eine baut,
   verliert AK-1004. **Zurückrollen:** Der Fehlschlag eines Kanals, das Aufgeben und der deaktivierte Empfänger sind
   **Ergebnisse** (`DELIVERED`, `RETRY`, `GAVE_UP`, `NONE`), keine Ausnahmen: Die Transaktion endet normal, und die Buchführung
   (`attempts + 1`, `lastError`, `nextAttemptAt` nach `retryDelaySeconds(attempts)`, bei acht Fehlversuchen `failedAt`) bleibt
   erhalten. Würde die Methode für einen Fehlversuch eine `PortalException` werfen, rollte Liferay die Buchführung mit zurück, die
   Nachricht bliebe auf `attempts = 0` und würde in jedem Lauf sofort wiederholt (Profil 6.2.5, Abschnitt 7 „Zurückrollen“). Ein Empfänger, der
   beim Versand deaktiviert ist, wird ohne Versuch aufgegeben (M08-R14, `failedAt`, Fehlertext `RECIPIENT_INACTIVE`). Erst nach
   erfolgreicher Übergabe wird `sentAt` gesetzt; bricht die Plattform dazwischen ab, wird erneut übergeben und der Kanal erkennt die
   Wiederholung an der `Message-ID`. Die Transaktion hält die Zeilensperre während der Übergabe; bei dieser Größe vertretbar
   (Messwert im PR). Prüfschritt: `AK1004_ZweiGleichzeitigeVersandlaeufeTest` und `AK1004_FehlversuchBleibtGespeichertTest`.
6. **Erinnerungslauf und Zeitplan** (M08-R17 bis M08-R22; AK-1021 bis AK-1025, AK-205). `NotificationLocalServiceImpl.runDueReminders(now)`
   (Name ohne `get…`) prüft zuerst mit `reminderSchedule()`, ob der Lauf fällig ist (sonst Ergebnis `nicht_faellig`), und
   läuft dann in **einer** Transaktion: (1) fehlende Wochen für alle aktiven Azubis anlegen (P03 `ensureReportsForAllTrainees`,
   M08-R18), (2) den Vermerk der Woche des Stichtags mit `INSERT INTO BH_ReminderRun … ON CONFLICT (isoYear, isoWeek) DO NOTHING`
   beanspruchen; ändert das 0 Zeilen, ist der Lauf `schon_erledigt` (Ergebnis, keine Ausnahme), (3) `loadReminderTrainees` lädt
   die aktiven Azubis mit Kanälen, Zuordnung und den Wochen mit `inhalt` und `historie`, `planReminders()` plant, die Nachrichten
   werden mit dem tatsächlichen Zeitpunkt angelegt (geplant wird mit dem Stichtag), (4) `createdCount` im Vermerk setzen. Der
   Vermerk und die Nachrichten stehen so in derselben Transaktion: Scheitert etwas, rollt alles zurück (auch der Vermerk), und der
   nächste Takt versucht es noch einmal; zwei gleichzeitige Läufe: genau einer gelingt. Ergebnis `{ lauf: "ausgefuehrt", angelegt: n }`,
   `nicht_faellig` oder `schon_erledigt`. **Scheduler** (Profil 6.2.5, Abschnitt 3 „Hintergrundjobs“, „Scheduler in GMT“): `scheduler-entry` in
   `liferay-portlet.xml` mit Speicherart `MEMORY_CLUSTERED`, zwei `MessageListener` im Takt von 15 Minuten (`0 0/15 * * * ?`):
   `de.berichtsheft.scheduler.AusgangskorbMessageListener` (Versandlauf) und `de.berichtsheft.scheduler.ErinnerungMessageListener`
   (`runDueReminders` mit der Uhr). Kein Cron-Ausdruck für „9:00 Uhr“: Quartz rechnet in GMT, die Fälligkeit entscheidet die
   Fachlogik; das Nachholen ergibt sich aus dem Takt und gilt auch nach einem Neustart. **Bei `bh.betrieb=test` tun beide
   Listener nichts** (sie melden es im Log): Läufe geschehen dort nur über die Testschnittstelle, sonst änderte ein Takt den
   Bestand eines Daten-Falls zwischen zwei Schritten. Prüfschritt: Tomcat-Log zeigt beide Einträge beim Deployment;
   `AK1021_ZweiGleichzeitigeErinnerungslaeufeTest`.
7. **Portlets** (Profil 6.2.5, Abschnitte 3 „Oberfläche“, 3.1 und 4.3). Dienste für die Anzeige, lesend (Präfix `get`): `getUnreadCount(viewer)`,
   `getPreview(viewer, n)` (markiert nichts, M08-R16), `getUndeliverable(viewer)` und `getTeamsMailbox(viewer)`; schreibend:
   `openNotifications(viewer)` (liefert die eigenen App-Nachrichten, neueste zuerst, mit dem Merker „Neu“ für die bis dahin
   ungelesenen, und markiert alle als gelesen; ein Lesen mit Schreiben, deshalb ohne `get…`), `updateOwnChannels(actor, werte)`
   (nur die eigene Person, eine deaktivierte nichts, ein unbekannter Kanal ändert nichts: `kanal_unbekannt`, `zugriff_verweigert`)
   und `retryUndeliverable(actor, recipient, channel)` (nur Ausbilder, auch die Vertretung; setzt `attempts = 0`, `failedAt`
   leer, `nextAttemptAt` jetzt; an einen deaktivierten Empfänger oder eine nicht aufgegebene Nachricht `nicht_wiederholbar`).
   Fachliche Ablehnungen vor dem Schreiben sind `DomainRuleException` (rollen zurück, es steht nichts im Weg). Portlets
   `BenachrichtigungenPortlet` (Seite `benachrichtigungen`: Liste mit den Merkern `data-art`, `data-woche`, `data-neu`; Aufruf der Seite
   markiert alles als gelesen), `KanaelePortlet` (Seite `einstellungen`: Auswahl E-Mail/Teams/App mit dem Hinweis bei keinem Kanal;
   die Darstellung ergänzt P09), `NichtZustellbarPortlet` (Seite `nicht_zustellbar`, Zähler, „Erneut versuchen“; Azubis sehen die
   Seite nicht) und das Teams-Postfach der Demo (Azubis eigene, Ausbilder alle; nur wenn eingeschaltet). Jede `processAction` ruft den
   Service, und der Service prüft Rolle und Besitz selbst. Die Glocke im Theme baut P09 aus `getUnreadCount` und `getPreview`; P08
   schreibt kein `UserNotificationEvent` (`userNotificationEventId` bleibt leer, Wahl in P09 und U00, Profil 6.2.5, Abschnitt 3.1). Gestaltung folgt
   in P09. Prüfschritt: Browser-Test aus Schritt 11.
8. **Adapter und Testschnittstelle** (Profil 6.2.5, Abschnitt 4.2). Fachlogik (`FachlogikAdapter`): `kanaeleWaehlen`, `voreinstellungKanaele`,
   `benachrichtigungenPlanen`, `erinnerungenPlanen` (Uhr = Stichtag), `erinnerungFaellig`, `wartezeitNachFehlversuch`,
   `ruecksprungZiel`, dazu die M02-Schnittstelle `erinnerungenPlanen` für AK-205-01. Daten-Aktionen der Testschnittstelle:
   `kanaele_einstellen`, `kanaele_lesen`, `erinnerung_ausloesen`, `nachrichten_versenden`, `nachrichten_lesen`, `ungelesen_zaehlen`,
   `benachrichtigungen_oeffnen`, `nicht_zustellbar_lesen`, `erneut_versuchen`, `wochen_lesen`, alle über **dieselben Service-Methoden**
   wie die Portlets und der Scheduler. Personen als Schlüssel, Konten-IDs nur als Text. Fehler als `{ "fehler": "<code>" }` aus dem
   `Fehlercode`, nie aus dem Meldungstext. **Test-Kanal:** `nachrichten_versenden` übergibt E-Mail und Teams an einen Test-Kanal, der die
   Übergaben je Nachricht zählt (`uebergaben`) und für `stoerung` (Liste `email`, `teams`) in diesem Lauf jede Übergabe scheitern
   lässt; der Test-Kanal ist ein Argument von `deliverNextNotification`, nicht eine Konfiguration, damit der Scheduler im Test keinen
   Versand auslöst (Schritt 6). `uhr` setzt die Uhr vor dem Schritt wie bei allen Aktionen. Gespeicherte Nachricht (`nachrichten_lesen`)
   mit `zustand` (`offen`, `zugestellt`, `aufgegeben`), `versuche`, `naechsterVersuch`, `uebergaben` nach `specs/pruefung/format.md`,
   Reihenfolge nach Anlegen, Empfänger, Kanal. **Ablauf** (für das Szenario, verbindlich in P10): Aktion `erinnerung_ausloesen` (ohne
   `als`) und Seite `benachrichtigungen` mit `nachrichten` (`art`, `woche`, `neu`). Prüfschritt: `ant pruefung-fachlogik
   -Dbh.pruefung.filter=M08.json` (58 Fälle) und `ant pruefung-daten -Dbh.pruefung.filter=M08.json` (22 Fälle) grün,
   `-Dbh.pruefung.filter=AK-205` grün (AK-205-01 und AK-205-02).
9. **Bau-Stand.** M08 in `BauStand.java` eintragen und AK-205-01 und AK-205-02 freigeben; damit sind beide Listen des Bau-Stands leer
   bis auf das, was P04 zurückgestellt hat (AK-408-07, P06). Prüfschritt: kein roter Fall.
10. **Konfiguration.** `liferay-625/config/portal-ext.beispiel.properties` um `bh.app.url` (Basis der Links in Nachrichten),
    die Absenderadresse der E-Mail und, falls nötig, `bh.teams.modus` ergänzen (nur Platzhalter); der Schlüssel `index.on.startup=false`
    und die SMTP-Einstellungen aus P00 bleiben (Einstellungen im Control Panel überschreiben sie, Profil 6.2.5, Abschnitt 7 „Mail“). Prüfschritt:
    `grep` findet die neuen Schlüssel; keine Zugangsdaten im Repository.
11. **Eigene Tests** (Namen beginnen mit der AK-ID, JUnit ohne Bindestrich, Profil 6.2.5, Abschnitt 4.1):
    - `AK1004_EindeutigJeEreignisEmpfaengerKanalTest` (`test/db/`): zweiter `INSERT` mit demselben Schlüssel scheitert mit `23505`;
      A legt in einer offenen Transaktion an, B führt `insertNotification` (aus `custom-sql/default.xml` gelesen) aus und wartet, ändert
      danach 0 Zeilen; Kanal App ohne `sentAt` scheitert am CHECK `notification_app_delivered`; negative Versuche am CHECK.
    - `AK1021_ErinnerungslaufDatenhaltungTest` (`test/db/`): zweiter Vermerk für dieselbe Woche scheitert (`ON CONFLICT` ändert 0
      Zeilen), KW 0 und KW 54 scheitern am CHECK `reminder_run_iso_week_range`, KW 53 gelingt.
    - `AK1004_ZweiGleichzeitigeVersandlaeufeTest` (`test/integration/`): 20 offene E-Mail-Nachrichten, zwei Threads mit Startschranke
      rufen `nachrichten_versenden`; der Test-Kanal zählt je Nachricht genau eine Übergabe, keine bleibt offen.
    - `AK1021_ZweiGleichzeitigeErinnerungslaeufeTest` (`test/integration/`): Uhr auf den Stichtag, zwei Threads mit Startschranke rufen
      `erinnerung_ausloesen`; genau einer meldet `ausgefuehrt`, der andere `schon_erledigt`, und es gibt genau einen Satz Nachrichten.
      Zweiter Teil: Mit der Störung `nach_vermerk` wirft der Lauf nach dem Anlegen von Vermerk und Nachrichten; danach gibt es weder
      Vermerk noch Nachricht, und der nächste Lauf meldet `ausgefuehrt` (Vermerk und Nachrichten in einer Transaktion).
    - `AK1021_ErinnerungLegtFehlendeWochenAnTest` (`test/integration/`): Anna ohne Berichte (`berichte_anlegen` nicht aufgerufen), Uhr
      Montag 12.10.2026, 9:00 Uhr; `erinnerung_ausloesen` legt zuerst ihre Wochen an (M08-R18) und die Erinnerung nennt KW 36 bis
      KW 41 (leere Entwürfe sind offen) in einer Nachricht.
    - `AK1004_ListenerTutImTestbetriebNichtsTest` (`test/integration/`): Die Testaktion `listener_ausloesen` ruft beide
      `MessageListener` wie der Scheduler auf; bei `bh.betrieb=test` ändert sich nichts (offene Nachrichten bleiben `offen` mit
      `uebergaben` 0, kein Erinnerungslauf).
    - `AK1004_NachrichtenUndStatuswechselInEinerTransaktionTest` (`test/integration/`): eine nur bei `bh.betrieb=test` wirksame Störung
      der Testschnittstelle (`nach_nachrichten`) lässt `WeeklyReportLocalServiceImpl` nach dem Anlegen der Nachrichten eine
      `PortalException` werfen; danach gibt es weder Statuswechsel noch Historie noch Nachricht, der Status ist unverändert
      (M08-R03; die Störung ist ein Hilfsmittel der Testschnittstelle, siehe „Bitte bestätigen“).
    - `AK1004_FehlversuchBleibtGespeichertTest` (`test/integration/`): ein gestörter Versandlauf lässt die Nachricht auf `versuche = 1`
      und `naechsterVersuch` in 30 Sekunden stehen (nicht auf 0); acht Fehlversuche geben sie auf (`aufgegeben`).
    - `AK1015_VorschauMarkiertNichtsTest` (`test/integration/`): `vorschau_lesen` (Testaktion über `getPreview`) lässt den Zähler
      unverändert, `benachrichtigungen_oeffnen` setzt ihn auf 0 (M08-R16).
    - Playwright `liferay-625/e2e/ak-1001-1025-benachrichtigungen.spec.ts` (SMTP-Mock `tests/smtp-mock.ts` in der Sitzung, Mailpit in
      CI): Anna stellt auf `einstellungen` Kanäle ein (nur Teams, keiner, dann wieder E-Mail + App); `benachrichtigungen` zeigt „Neu“
      und markiert beim Aufruf; Bernd sieht auf `nicht_zustellbar` eine aufgegebene Nachricht und versucht erneut, Anna ruft die Seite
      per Adresse auf und bekommt keinen Zugang (AK-1004); eine E-Mail zu einer Einreichung (Versand mit
      `kanal: "konfiguriert"`) trägt Anlass, Azubi, Woche und Link ohne Kommentartext, der Link führt nach der Anmeldung direkt zum
      Bericht (AK-1003, `auth.forward.by.last.path` aus P02).
    Prüfschritt: `ant test-db test-integration` und der Playwright-Lauf grün.
12. **Gegenprobe** (Gemeinsame Regeln, „Gegenprobe“; Profil 6.2.5, Abschnitt 7 „Zurückrollen“). Jeden Fehler einzeln einbauen, die genannten
    Befehle laufen lassen, Ergebnis im PR festhalten, Fehler zurücknehmen. Eine Gegenprobe zählt nur, wenn die benannten Fälle rot
    werden. Die Nummern folgen der Paketnummer (`G8-n`; die Gegenproben zu AK-508 stehen als `G5-4` bis `G5-7` in P05):

    | Nr. | Absichtlich eingebauter Fehler | Wird rot | Befehl |
    | --- | --- | --- | --- |
    | G8-1 (AK-1001) | `plan()` benachrichtigt beim Einreichen auch den Azubi | AK-1001-01 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1001` |
    | G8-2 (AK-1001) | `recordTransitionNotifications` schickt beim Einreichen an alle aktiven Ausbilder (Vertretung) | AK-1001-04 (daten) | `ant pruefung-daten -Dbh.pruefung.filter=AK-1001` |
    | G8-3 (AK-1001) | `fanOut` nimmt deaktivierte Empfänger nicht aus | AK-1001-03 und AK-1013-04 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1001`, `-Dbh.pruefung.filter=AK-1013` |
    | G8-4 (AK-1002) | Zurückziehen erzeugt eine Nachricht an den Ausbilder | AK-1002-05 und AK-1002-07 (daten) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1002`, `ant pruefung-daten -Dbh.pruefung.filter=AK-1002` |
    | G8-5 (AK-1002) | erneutes Einreichen trägt den Anlass `eingereicht` statt `erneut_eingereicht` | AK-1002-04 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1002` |
    | G8-6 (AK-1003) | `safeReturnPath` akzeptiert jede Adresse | AK-1003-04, AK-1003-05, AK-1003-06, AK-1003-07; AK-1003-02, AK-1003-03 und AK-1003-08 bleiben grün | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1003` |
    | G8-7 (AK-1003) | eine Nachricht mit mehreren Wochen verlinkt einen Bericht statt der Übersicht | AK-1025-01 und AK-1025-02 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1025` |
    | G8-8 (AK-1004) | die Wartezeit hat keine Obergrenze | AK-1004-06 und AK-1004-07 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1004` |
    | G8-9 (AK-1004) | die Wartezeit wächst linear (30 s × n) | AK-1004-04, AK-1004-05, AK-1004-06 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1004` |
    | G8-10 (AK-1004) | `insertNotification` ohne `ON CONFLICT DO NOTHING` | `AK1004_EindeutigJeEreignisEmpfaengerKanalTest` (B scheitert mit `23505`) | `ant test-db -Dtest.class=AK1004_EindeutigJeEreignisEmpfaengerKanalTest` |
    | G8-11 (AK-1004) | eindeutiger Index (`eventKey`, `recipientId`, `channel`) im Skript ausgelassen | `AK1004_EindeutigJeEreignisEmpfaengerKanalTest` | wie G8-10 |
    | G8-12 (AK-1004) | der Versand sperrt die Zeile ohne `SKIP LOCKED` und ohne Sperre (reines `SELECT`) | `AK1004_ZweiGleichzeitigeVersandlaeufeTest` (Übergabe zweimal); die neutralen Fälle bleiben grün, weil sie nacheinander laufen | `ant test-integration -Dtest.class=AK1004_ZweiGleichzeitigeVersandlaeufeTest` |
    | G8-13 (AK-1004) | `deliverNextNotification` wirft bei einem Fehlschlag des Kanals eine `PortalException` statt das Ergebnis `RETRY` zu liefern | `AK1004_FehlversuchBleibtGespeichertTest` (`versuche` bleibt 0) und AK-1004-10, AK-1004-11 (daten) | `ant test-integration -Dtest.class=AK1004_FehlversuchBleibtGespeichertTest`, `ant pruefung-daten -Dbh.pruefung.filter=AK-1004` |
    | G8-14 (AK-1004) | der Empfänger wird beim Versand nicht auf „aktiv“ geprüft | AK-1004-12 (daten) | `ant pruefung-daten -Dbh.pruefung.filter=AK-1004` |
    | G8-15 (AK-1004) | `recordTransitionNotifications` läuft in einer eigenen Transaktion (`@Transactional(propagation = Propagation.REQUIRES_NEW)`) | `AK1004_NachrichtenUndStatuswechselInEinerTransaktionTest` (Nachricht bleibt trotz zurückgerolltem Wechsel); AK-1004-09 bleibt grün | `ant test-integration -Dtest.class=AK1004_NachrichtenUndStatuswechselInEinerTransaktionTest` |
    | G8-16 (AK-1011) | `Channels.parse` fasst Doppelte nicht zusammen und sortiert nicht | AK-1011-02 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1011` |
    | G8-17 (AK-1011) | ein unbekannter Kanal wird angenommen und gespeichert | AK-1011-04 und AK-1011-05 (daten) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1011`, `ant pruefung-daten -Dbh.pruefung.filter=AK-1011` |
    | G8-18 (AK-1012) | Voreinstellung nur E-Mail | AK-1012-01 und AK-1012-02 (daten) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1012`, `ant pruefung-daten -Dbh.pruefung.filter=AK-1012` |
    | G8-19 (AK-1013) | ohne gewählten Kanal geht die Nachricht ersatzweise über die App | AK-1013-02, AK-1013-03 und AK-1013-05 (daten) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1013`, `ant pruefung-daten -Dbh.pruefung.filter=AK-1013` |
    | G8-20 (AK-1014) | beim Versand gilt der heutige Kanal der Person statt des Kanals der Zeile | AK-1014-01 und AK-1014-02 (daten) | `ant pruefung-daten -Dbh.pruefung.filter=AK-1014` |
    | G8-21 (AK-1015) | `getPreview` markiert die Nachrichten als gelesen | `AK1015_VorschauMarkiertNichtsTest` (kein neutraler Fall zeigt das) | `ant test-integration -Dtest.class=AK1015_VorschauMarkiertNichtsTest` |
    | G8-22 (AK-1015) | `openNotifications` markiert nicht als gelesen oder markiert vor dem Lesen von „Neu“ | AK-1015-01 (daten) | `ant pruefung-daten -Dbh.pruefung.filter=AK-1015` |
    | G8-23 (AK-1021) | `reminderSchedule` rechnet 9:00 Uhr in der Zeitzone der JVM (GMT) statt Europe/Berlin | AK-1021-03, AK-1021-05, AK-1021-08, AK-1021-10, AK-1021-11 und AK-1021-17 (daten); AK-1021-04, AK-1021-06, AK-1021-07, AK-1021-09 und AK-1021-12 bleiben grün | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1021`, `ant pruefung-daten -Dbh.pruefung.filter=AK-1021` (Test-JVM in GMT, P01) |
    | G8-24 (AK-1021) | der Vermerk des Erinnerungslaufs wird nicht beansprucht (`ON CONFLICT` ausgelassen) | AK-1021-14 (daten, der zweite Lauf meldet `ausgefuehrt` statt `schon_erledigt`) und `AK1021_ZweiGleichzeitigeErinnerungslaeufeTest` | `ant pruefung-daten -Dbh.pruefung.filter=AK-1021`, `ant test-integration -Dtest.class=AK1021_ZweiGleichzeitigeErinnerungslaeufeTest` |
    | G8-25 (AK-1021) | der Vermerk wird in einer eigenen Transaktion (`REQUIRES_NEW`) vor den Nachrichten geschrieben und bleibt nach einem Fehler stehen | `AK1021_ZweiGleichzeitigeErinnerungslaeufeTest`, zweiter Teil (nach der Störung steht ein Vermerk ohne Nachricht, der nächste Lauf meldet `schon_erledigt`) | `ant test-integration -Dtest.class=AK1021_ZweiGleichzeitigeErinnerungslaeufeTest` |
    | G8-26 (AK-1021) | der Erinnerungslauf legt die fälligen Wochen vorher nicht an (`ensureReportsForAllTrainees` fehlt) | `AK1021_ErinnerungLegtFehlendeWochenAnTest` (keine Erinnerung für Anna) | `ant test-integration -Dtest.class=AK1021_ErinnerungLegtFehlendeWochenAnTest` |
    | G8-27 (AK-1022) | die Information fasst alle Azubis in einer Nachricht zusammen | AK-1022-05 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1022` |
    | G8-28 (AK-1022) | überfällig gilt nur für den Status „Entwurf“, nicht für „Abgelehnt“ | AK-1022-02 und AK-1021-02 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1022`, `-Dbh.pruefung.filter=AK-1021` |
    | G8-29 (AK-1022) | der Ausbilder wird nur informiert, wenn der Azubi einen Kanal hat | AK-1022-03 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1022` |
    | G8-30 (AK-1023) | die laufende Woche oder eine eingereichte Woche zählt als offen | AK-1023-01, AK-1023-02, AK-1023-05 (daten) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1023`, `ant pruefung-daten -Dbh.pruefung.filter=AK-1023` |
    | G8-31 (AK-1023) | eine Woche ganz außerhalb der Ausbildung zählt als offen | AK-1023-04 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1023` |
    | G8-32 (AK-1024) | der Ereignisschlüssel der Erinnerung trägt die Woche des Stichtags nicht | AK-1024-04 (daten): der Montag danach legt wegen des alten Schlüssels nichts an; die Fachlogik-Fälle AK-1024-01 bis AK-1024-03 bleiben grün, weil sie den Schlüssel nicht sehen | `ant pruefung-daten -Dbh.pruefung.filter=AK-1024` |
    | G8-33 (AK-1025) | die Erinnerung nennt nur die älteste Woche | AK-1025-01 und AK-1025-02 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-1025` |
    | G8-34 (AK-205) | deaktivierte Azubis bekommen eine Erinnerung | AK-205-01 und AK-205-02 (daten) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-205-01`, `ant pruefung-daten -Dbh.pruefung.filter=AK-205-02` |
    | G8-35 (AK-1004) | die Listener prüfen `bh.betrieb` nicht und laufen auch im Testbetrieb | `AK1004_ListenerTutImTestbetriebNichtsTest` (offene Nachrichten werden übergeben) | `ant test-integration -Dtest.class=AK1004_ListenerTutImTestbetriebNichtsTest` |
    | G8-36 (AK-1021) | `reminder_run_iso_week_range` im Skript ausgelassen (oder nur 1 bis 52) | `AK1021_ErinnerungslaufDatenhaltungTest` (KW 0 und KW 54 gelingen, KW 53 scheitert) | `ant test-db -Dtest.class=AK1021_ErinnerungslaufDatenhaltungTest` |
    | G8-37 (AK-1021) | eindeutiger Index (`isoYear`, `isoWeek`) in `BH_ReminderRun` ausgelassen | `AK1021_ErinnerungslaufDatenhaltungTest` (zweiter Vermerk gelingt; `ON CONFLICT` ohne Index scheitert mit einem Fehler) | wie G8-36 |

    Prüfschritt: Tabelle mit dem tatsächlichen Ergebnis je Zeile im PR; nach dem Zurücknehmen alles grün. Wird ein benannter Fall
    nicht rot, ist die Prüfung ohne Wirkung: anhalten und der Steuerung melden.
13. **Prüfung** nach Abschnitt 8.

## 8. Prüfung

Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh`, Playwright im Wurzelordner.

| Befehl | Erwartet |
| --- | --- |
| `ant pruefung-fachlogik -Dbh.pruefung.filter=M08.json` | 58 Fälle grün |
| `ant pruefung-daten -Dbh.pruefung.filter=M08.json` | 22 Fälle grün |
| `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-205-01` und `ant pruefung-daten -Dbh.pruefung.filter=AK-205-02` | grün (aus M02, bis P08 zurückgestellt) |
| `ant test-unit` | grün, auch Fachregeln von M08 und `DomainOhneLiferayTest` |
| `ant test-db` | grün, auch `AK1004_EindeutigJeEreignisEmpfaengerKanalTest` und `AK1021_ErinnerungslaufDatenhaltungTest` |
| `ant test-integration` | grün, auch die Tests zu gleichzeitigen Läufen, Transaktion, Fehlversuch, Listener im Testbetrieb, fehlenden Wochen und `AK1015_VorschauMarkiertNichtsTest` |
| `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=chromium --project=smartphone-375 -g "ak-1001"` | grün (Kanäle, Liste „Neu“, Nicht zustellbar, Mail mit Link und Rücksprung) |
| Prüffälle M01 bis M07 | weiterhin grün; im Bau-Stand bleibt nur AK-408-07 zurückgestellt (P06) |
| Gegenprobe aus Schritt 12 | jede Zeile rot wie benannt, danach zurückgenommen und grün |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: der volle Liferay-6.2.5-Job mit Mailpit als Dienst-Container; im PR vermerken.

## 9. Abschluss

- Commit, z. B. „L62 P08: Benachrichtigungen und Erinnerung (Ausgangskorb, Versand, Erinnerungslauf)“; vor dem Push alle Befehle
  aus Abschnitt 8 lokal grün.
- Draft-PR mit der AK-Tabelle (AK-1001, AK-1002, AK-1003, AK-1004, AK-1011, AK-1012, AK-1013, AK-1014, AK-1015, AK-1021, AK-1022,
  AK-1023, AK-1024, AK-1025 mit Test und Prüffällen), den freigegebenen Fällen AK-205-01 und AK-205-02, dem vorbereiteten Szenario
  AK-1022-07, der Gegenprobe-Tabelle mit Ergebnis und „Bitte bestätigen“. `service.xml`, `sql/**`, `upgrade/**`, `custom-sql/**`,
  `service/impl/**`, `portal-ext.beispiel.properties` und `pruefung/**` sind sicherheitsrelevant (gemeinsames Profil, Abschnitt 5); Chris gibt frei.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Ein Fehlversuch wird nicht gezählt, die Nachricht wird in jedem Lauf sofort wiederholt | der Fehlschlag eines Kanals ist ein Ergebnis, keine `PortalException`: Sie rollte die Buchführung zurück (Schritt 5, G8-13) |
| Erinnerungslauf legt Nachrichten doppelt an oder ein zweiter Lauf läuft mit | Vermerk der Woche mit `ON CONFLICT DO NOTHING` in derselben Transaktion beanspruchen (G8-24) |
| Nach einem Fehler im Erinnerungslauf kommt nie wieder eine Erinnerung | Vermerk und Nachrichten in **einer** Transaktion; ein Fehler rollt beide zurück (G8-25) |
| Nachricht entsteht, obwohl der Statuswechsel scheiterte | Anlegen in der Transaktion des Wechsels, kein `REQUIRES_NEW` (G8-15) |
| Zweites Anlegen bricht mit „current transaction is aborted“ ab | `INSERT … ON CONFLICT DO NOTHING`, keinen Schlüsselfehler provozieren (G8-10) |
| Zwei Versandläufe übergeben dieselbe Nachricht | `FOR UPDATE SKIP LOCKED` und je Zeile eine Transaktion (G8-12); eindeutiger Schlüssel allein genügt nicht |
| Fehler der E-Mail kommen nie an | `MailEngine.send` synchron, nicht `MailServiceUtil` (Profil 6.2.5, Abschnitte 3, 7) |
| Mails erscheinen nicht in Mailpit oder dem Mock | Einstellungen im Control Panel überschreiben `portal-ext.properties` (Profil 6.2.5, Abschnitt 7); Port prüfen |
| Erinnerung kommt um 10:00 oder 11:00 Uhr | die Fachlogik rechnet in GMT; Stichtag in `Europe/Berlin` bestimmen, nicht per Cron (G8-23) |
| Der Takt ändert den Bestand eines Daten-Falls | Listener sind bei `bh.betrieb=test` ohne Wirkung; Läufe nur über die Testschnittstelle (Schritt 6) |
| Zeiten der Wartezeit stimmen nicht | Datenbankverbindung nicht in UTC oder JVM nicht in GMT (gemeinsames Profil, Abschnitt 2.2) |
| Der Zähler der Glocke sinkt beim Anzeigen der Vorschau | `getPreview` markiert nichts; nur `openNotifications` markiert (G8-21) |
| Kommentartext steht in der Nachricht | `plan()` bekommt Kommentare gar nicht (Schritt 3) |
| Rücksprung führt auf eine fremde Adresse | `safeReturnPath` anwenden, nicht den rohen Parameter (G8-6) |
| Methode `getX` schreibt nichts | Methodenname mit `get`, `is`, `has` läuft nur lesend; `openNotifications` und `runDueReminders` heißen deshalb nicht so (Profil 6.2.5, Abschnitt 7) |
| Nachricht an einen Empfänger, der inzwischen deaktiviert ist | beim Versand erneut prüfen und ohne Versuch aufgeben (G8-14) |
| Teams-Nachricht doppelt im Postfach | eindeutiger Schlüssel `notificationId` und `ON CONFLICT DO NOTHING` |

## Bitte bestätigen

- [ ] Schlüssel in `portal-ext.beispiel.properties` (stehen jetzt in P00, Schritt 5, und Profil 6.2.5, Abschnitt 5.1 Schritt 4): `bh.app.url` (Basis der Links in Nachrichten; im Scheduler gibt es keine
      Anfrage, aus der sich die Adresse ergäbe) und die Absenderadresse der E-Mail; sie wurden dort nachgetragen.
- [ ] Test-Kanal als Argument des Versandlaufs (nicht als Konfiguration) und Listener bei `bh.betrieb=test` ohne Wirkung; die Testaktion
      `nachrichten_versenden` bekommt außerhalb des neutralen Formats den Wert `kanal: "konfiguriert"` (echter Versand an den Mock bzw.
      Mailpit für den Playwright-Test).
- [ ] Hilfsmittel der Testschnittstelle (nur bei `bh.betrieb=test`, kein neutraler Fall, keine Änderung an `specs/pruefung/format.md`):
      die Störungen `nach_nachrichten` (eine Prüfstelle im Statuswechsel) und `nach_vermerk` (im Erinnerungslauf), beide in Produktion
      ohne Wirkung, sowie die Aktionen `vorschau_lesen` und `listener_ausloesen`. Sie berühren `service/impl/**` bzw. `pruefung/**`
      (sicherheitsrelevant).
- [ ] Versand und Erinnerung im Takt von 15 Minuten (Profil 6.2.5, Abschnitt 3 und „Bitte bestätigen“ dort); die Wartezeiten von 30 Sekunden bis 1 Stunde
      sind damit nur so fein wie der Takt. Die Daten-Fälle prüfen die Wartezeit über die gestellte Uhr und die Testaktion.
- [ ] Die Transaktion des Versands hält die Zeilensperre während der Übergabe an den Kanal (kein Zwischenzustand „in Arbeit“); Alternative:
      Sperre in einer Transaktion, Übergabe außerhalb, Markieren in einer zweiten. Gewählt ist die erste, weil Abschnitt 8 der Spec die
      Wiederholung nach Abbruch zulässt.
- [ ] Seite `entwickler-postfach` (Teams-Postfach der Demo, Azubis eigene, Ausbilder alle) steht nicht in der Adressliste von Profil 6.2.5, Abschnitt 4.3; P00 (Schritt 12) führt sie jetzt in der Adresstabelle.
- [ ] `userNotificationEventId` bleibt auf 6.2.5 leer (kein Abbild in der Glocke der Plattform, Profil 6.2.5, Abschnitt 3.1); die Wahl gehört zu P09 und U00.
- [ ] Nummerierung der Gegenproben `G<Paket>-n` in beiden Reihen gleich (hier `G8-n`; P05 zählt die Gegenproben zu AK-508 als `G5-4`
      bis `G5-7`). Zählweise: Szenario getrennt ausgewiesen, AK-1022-07 ist Szenario (P10), wie jetzt auch in P05.
- [ ] Das Playbook folgt dem Aufbau aus P05 der Reihe und „Aufbau der Reihe (gilt für P01 bis P10)“ aus
      `playbooks/liferay-72/P00-grundgeruest.md`; die P00 der Reihe 6.2.5 trägt ihn jetzt ebenfalls.

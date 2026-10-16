# Gemeinsame Grundlage der Liferay-Umsetzungen

Stand: 16.10.2026 (Etappe G4, Paket C; Nachtrag G4-N) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Zweck und Geltung

Diese Datei gilt für beide Liferay-Umsetzungen, `liferay-625/` (Liferay Portal 6.2.5 CE GA6, Plugins SDK) und
`liferay-72/` (Liferay Portal 7.2 CE, Liferay Workspace, OSGi). Sie legt fest, was auf beiden Plattformen gleich sein
muss, damit L62 und L72 parallel laufen können und das Upgrade in U03 nur Liferay-eigene Unterschiede ausgleicht
(Entscheidung 12.10.2026, `docs/06-spec-architektur.md`, „Etappen“).

- Die Profile `profile/liferay-625.md` und `profile/liferay-72.md` verweisen hierher und wiederholen nichts. Sie
  beschreiben nur, was sich zwischen 6.2.5 und 7.2 unterscheidet.
- Änderungen an dieser Datei gelten immer für beide Plattformen und werden gemeinsam freigegeben. Eine Umsetzung, die
  von hier abweichen muss, meldet das an die Steuerung; die Abweichung wird hier eingetragen, nicht im einzelnen Profil.
- Wie jedes Profil ändert diese Datei keine Regel. Maßgeblich sind die Fach-Specs unter `specs/`; hier stehen nur
  Verweise auf Regel- und AK-IDs. Wo Liferay eine Anforderung nicht 1:1 erfüllt, steht die Ersatzlösung mit dem
  Prüffall, der sie zeigt. Was keine gleichwertige Erfüllung ist, heißt „abweichend, begründet“ und steht unter
  „Bitte bestätigen“ (Abschnitt 8).
- Alle Angaben zu Versionen, Bezugsquellen und Liferay-Verhalten gelten als „in P00 zu bestätigen“, bis P00 der
  jeweiligen Plattform sie im laufenden System nachgewiesen hat.

## 2. Schema der App-Tabellen

### 2.1 Grundlage und Grundsätze

Grundlage ist das Datenmodell der Referenz-Umsetzung in `prisma/schema.prisma`. Trigger, CHECK-Constraints,
Fremdschlüssel-Aktionen und der partielle Index stehen nur in den Migrationen unter `prisma/migrations/` (vor allem
`prisma/migrations/20261006130221_init/`, `prisma/migrations/20261006150000_account_binding/`,
`prisma/migrations/20261007090000_einreichen_pruefen/`, `prisma/migrations/20261008090000_benachrichtigungen/`,
`prisma/migrations/20261012100000_kw53_nur_in_langen_jahren/`, `prisma/migrations/20261013090000_historie_fehlercode/`
und `prisma/migrations/20261013100000_erinnerungslauf_wochennummer/`). Die logischen Datenmodelle stehen in Abschnitt 5 der
Fach-Specs M02, M03, M04, M05, M06 und M08.

**Grundsätze für beide Plattformen:**

- **Service Builder** erzeugt Entities, Persistenz und `tables.sql`. Beide Umsetzungen verwenden denselben
  `namespace` **`BH`**; Service Builder bildet daraus den Tabellennamen `BH_<Entity>` (Vorschlag, siehe „Bitte
  bestätigen“).
- **Paketwurzel `de.berichtsheft`** auf beiden Plattformen: Java-Pakete beginnen mit `de.berichtsheft` (z. B.
  `de.berichtsheft.domain.access`, `de.berichtsheft.model`), und das `package-path` von Service Builder in jeder
  `service.xml` ist `de.berichtsheft`. Damit sind Klassennamen, `value.object.listener.de.berichtsheft.model.…` und die
  Spring- bzw. OSGi-Konfiguration auf 6.2.5 und 7.2 gleich, und U02 muss keine Pakete umbenennen (siehe „Bitte
  bestätigen“).
- **Gleiche Namen auf beiden Plattformen:** Entity-, Spalten-, Constraint-, Index- und Triggernamen sind in 6.2.5 und
  7.2 identisch. U03 muss an den App-Tabellen dann nichts umbenennen.
- **Schlüssel:** Primärschlüssel sind `long` (SQL `BIGINT`) aus dem Liferay-Zähler (`CounterLocalService`), wie bei
  Liferay üblich. Die UUIDs der TypeScript-App werden nicht übernommen; die Prüffälle nennen Personen über die Testdaten
  (`specs/pruefung/testdaten.json`), der Prüf-Adapter übersetzt (Regeln für Adapter in `specs/pruefung/format.md`).
- **Was Service Builder nicht erzeugt, legt ein eigenes SQL-Skript an:** Service Builder legt weder Fremdschlüssel noch
  CHECK-Constraints noch Trigger an. Ein gemeinsames, auf beiden Plattformen wortgleiches PostgreSQL-Skript
  „Schutz in der Datenhaltung“ (Abschnitt 2.6) legt sie an. Es läuft als Upgrade-Schritt der App beim ersten
  Deployment (6.2.5: `UpgradeProcess` des Portlets; 7.2: `UpgradeStepRegistrator` des Service-Moduls).
- **Reservierte Spaltennamen:** Service Builder hängt bei Namen, die in einer Datenbank reserviert sind, ein `_` an
  (bekannt: `active` → `active_`, `uuid` → `uuid_`, `date` → `date_`, `text` → `text_`). Die Felder unten sind so
  gewählt, dass das nur `active` trifft. P00 vergleicht die erzeugte `tables.sql` beider Plattformen mit dieser Tabelle.
- **Texte:** Service Builder legt `String` als `VARCHAR(75)` an, wenn `portlet-model-hints.xml` nichts anderes sagt.
  Jede Spalte unten hat deshalb ihre Länge als Model-Hint (`max-length`); über 4.000 Zeichen wird auf PostgreSQL `TEXT`
  erzeugt. P00 prüft, dass beide Plattformen denselben SQL-Typ erzeugen.
- **Aufzählungen** (Rolle, Status, Tagesart, Kanal, Darstellung) sind `String` mit den festen Werten der
  TypeScript-App (`TRAINEE`, `DRAFT`, `WORK` usw.) und einem CHECK-Constraint auf genau diese Werte.

### 2.2 Datum und Zeit (M01)

- **Zeitpunkte** (`createdAt`, `ranAt`, `sentAt` usw.) sind Service-Builder-Typ `Date`, SQL `TIMESTAMP` (ohne
  Zeitzone; Service Builder erzeugt für `Date` keinen Typ mit Zeitzone, anders als `timestamptz` in der TypeScript-App),
  und werden **in UTC** gespeichert (M01-R01, M05 und M06 Abschnitt 8 „unabhängig von der Zeitzone des
  Servers“). Voraussetzung: Die JVM läuft mit `-Duser.timezone=GMT`, wie es die Liferay-Bundles in `setenv.sh`
  vorgeben; die JDBC-Sitzung bleibt in UTC (Entsprechung zu `createPrismaClient` in `src/lib/db.ts`). Angezeigt wird in
  Europe/Berlin (M06-R03). P00 weist das mit einem Test nach, der Liferay mit `TZ=Europe/Berlin` startet (Gegenstück zu
  `tests/db/timezone.test.ts`).
- **Kalendertage** (Ausbildungsbeginn und -ende, Tag eines Berichts) haben in Service Builder keinen eigenen Typ. Sie
  werden als `String` im Format `JJJJ-MM-TT` gespeichert, SQL `VARCHAR(10)` mit CHECK auf das Format (M01-R06,
  M01 Abschnitt 8 „Kalendertage ohne Zeitzone“). Die Zeichenkette sortiert und vergleicht wie das Datum und kann von
  keiner Zeitzone verschoben werden (siehe „Bitte bestätigen“).
- **Jetzt** kommt nur aus dem Uhr-Service (Abschnitt 3.2), nie aus `new Date()` oder `System.currentTimeMillis()` in
  Fachlogik (M01-R01); auch `createDate`/`modifiedDate`, die Service Builder sonst selbst setzt, füllt die App mit der
  Uhr.

### 2.3 Tabellen

Spalten-Schreibweise: `Feld` (Service-Builder-Typ / SQL-Typ). PK = Primärschlüssel, FK = Fremdschlüssel (vom Skript
in 2.6 angelegt), Pflicht = `NOT NULL`.

#### BH_Person (Entity `Person`, Prisma `Person`, Tabelle `person`)

| Spalte | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `personId` | long / BIGINT | PK | |
| `companyId` | long / BIGINT | ja | Liferay-Instanz (genau eine, siehe 2.5 „Ein Mandant“) |
| `userId` | long / BIGINT | nein | Liferay-Benutzer (`User_.userId`); leer bis zum ersten Login; eindeutig, sobald gesetzt (ersetzt `account_id`, siehe 2.5) |
| `email` | String(320) / VARCHAR(320) | ja | klein geschrieben; eindeutig; CHECK `person_email_normalized` |
| `name` | String(200) / VARCHAR(200) | ja | |
| `role` | String(16) / VARCHAR(16) | ja | `TRAINEE` oder `TRAINER` |
| `active` → Spalte `active_` | boolean / BOOLEAN | ja | Voreinstellung `true` |
| `trainerId` | long / BIGINT | nein | FK auf `BH_Person`, `ON DELETE NO ACTION` |
| `trainingStart` | String(10) / VARCHAR(10) | nein | Kalendertag |
| `trainingEnd` | String(10) / VARCHAR(10) | nein | Kalendertag |
| `channelEmail`, `channelTeams`, `channelApp` | boolean / BOOLEAN | ja | ersetzen die Liste `channels`; Voreinstellung E-Mail und App (AK-1012) |
| `theme` | String(8) / VARCHAR(8) | ja | `SYSTEM`, `LIGHT`, `DARK`; Voreinstellung `SYSTEM` (UI-AK-14) |
| `createdAt`, `updatedAt` | Date / TIMESTAMP | ja | UTC, aus der Uhr |

Eindeutig: `email` (global, weil es genau eine Instanz gibt); `userId` (partieller eindeutiger Index `WHERE userId IS NOT NULL`, SQL-Skript). Index: `trainerId`.
CHECK wie in der Migration `init` bzw. `account_binding`: `person_trainee_requires_trainer_and_start`,
`person_training_end_after_start`, `person_trainer_not_self`, `person_email_normalized`. Die Kanalliste wird zu drei
Spalten, weil Service Builder keine Listen-Spalten kennt; der Wertebereich bleibt „Teilmenge, leer erlaubt“ (M08,
Abschnitt 5).

#### BH_Setting (Entity `Setting`, Prisma `Setting`)

| Spalte | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `settingId` | long / BIGINT | PK | immer `1`; CHECK `setting_single_row` (eine Zeile, weil es genau eine Instanz gibt) |
| `companyId` | long / BIGINT | ja | |
| `federalState` | String(2) / VARCHAR(2) | ja | Kürzel nach M01-R13, Voreinstellung `NW`; CHECK auf die 16 Kürzel |
| `updatedAt` | Date / TIMESTAMP | ja | |

#### BH_WeeklyReport (Entity `WeeklyReport`, Prisma `WeeklyReport`)

| Spalte | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `weeklyReportId` | long / BIGINT | PK | |
| `companyId` | long / BIGINT | ja | |
| `traineeId` | long / BIGINT | ja | FK auf `BH_Person`, `ON DELETE CASCADE` |
| `isoYear` | int / INTEGER | ja | |
| `isoWeek` | int / INTEGER | ja | CHECK `weekly_report_iso_week_range` wie in `kw53_nur_in_langen_jahren` |
| `status` | String(16) / VARCHAR(16) | ja | `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`; Anfang `DRAFT` |
| `version` | int / INTEGER | ja | **Versionsstand** nach M05 Abschnitt 5, Anfang `0`, siehe 2.4 |
| `createdAt`, `updatedAt` | Date / TIMESTAMP | ja | |

Eindeutig: (`traineeId`, `isoYear`, `isoWeek`) (AK-304). Index: `status` (Prüfliste).

#### BH_ReportDay (Entity `ReportDay`, Prisma `ReportDay`)

| Spalte | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `reportDayId` | long / BIGINT | PK | |
| `weeklyReportId` | long / BIGINT | ja | FK auf `BH_WeeklyReport`, `ON DELETE CASCADE` |
| `dayDate` | String(10) / VARCHAR(10) | ja | Kalendertag Mo–Fr (Prisma `date`; umbenannt, weil `date` reserviert ist) |
| `dayType` | String(8) / VARCHAR(8) | nein | `WORK`, `SCHOOL`, `VACATION`, `SICK`, `HOLIDAY` (AK-402); leer = noch nicht gewählt |
| `activities` | String(5000) / TEXT | ja | Voreinstellung leer; bis 5.000 Zeichen (M04) |
| `outsideTraining` | boolean / BOOLEAN | ja | AK-305 |
| `holidayPreset` | boolean / BOOLEAN | ja | AK-404 |

Eindeutig: (`weeklyReportId`, `dayDate`). Trigger `report_day_locked` (2.6).

#### BH_StatusChange (Entity `StatusChange`, Prisma `StatusChange`) – unveränderliche Historie (M06)

| Spalte | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `statusChangeId` | long / BIGINT | PK | |
| `weeklyReportId` | long / BIGINT | ja | FK auf `BH_WeeklyReport`, `ON DELETE CASCADE` |
| `fromStatus` | String(16) / VARCHAR(16) | nein | |
| `toStatus` | String(16) / VARCHAR(16) | ja | |
| `actorId` | long / BIGINT | ja | FK auf `BH_Person`, `ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED` |
| `reason` | String(5000) / TEXT | nein | nur bei Rücknahme (M05-R19) |
| `reviewRound` | int / INTEGER | ja | Voreinstellung `0`; CHECK `status_change_review_round_not_negative` |
| `seq` | long / BIGINT | ja | Reihenfolge (M06-R02), siehe unten |
| `createdAt` | Date / TIMESTAMP | ja | Zeitpunkt aus der Uhr (M06-R03) |

Eindeutig: (`weeklyReportId`, `seq`). Index: `weeklyReportId`. Trigger `status_change_no_update`,
`status_change_no_delete` (2.6).

`seq`: Die TypeScript-App zählt über eine Datenbank-Sequenz für alle Berichte. Service Builder schreibt jede Spalte
selbst, ein Spaltenstandard der Datenbank greift dort nicht. Vorschlag: `seq` ist fortlaufend **je Bericht** (größte
bisherige plus 1), vergeben unter der Zeilensperre des Berichts aus 2.4. Das erfüllt M06-R02 und das logische Datenmodell
von M06 („fortlaufend je Bericht“) ohne Zähler außerhalb der Transaktion (siehe „Bitte bestätigen“).

#### BH_Comment (Entity `Comment`, Prisma `Comment`) – unveränderliche Historie (M06)

| Spalte | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `commentId` | long / BIGINT | PK | |
| `weeklyReportId` | long / BIGINT | ja | FK auf `BH_WeeklyReport`, `ON DELETE CASCADE` |
| `reviewRound` | int / INTEGER | ja | CHECK `comment_review_round_positive` |
| `reportDayId` | long / BIGINT | nein | FK auf `BH_ReportDay`, `ON DELETE CASCADE`; leer = Gesamtkommentar |
| `authorId` | long / BIGINT | ja | FK auf `BH_Person`, `ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED` |
| `commentText` | String(5000) / TEXT | ja | Prisma `text`; umbenannt (`text` reserviert); CHECK `comment_text_not_blank` |
| `createdAt` | Date / TIMESTAMP | ja | |

Index: `weeklyReportId`. Trigger `comment_no_update`, `comment_no_delete` (2.6).

#### BH_Notification (Entity `Notification`, Prisma `Notification`) – Ausgangskorb (M08)

| Spalte | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `notificationId` | long / BIGINT | PK | |
| `companyId` | long / BIGINT | ja | |
| `eventKey` | String(200) / VARCHAR(200) | ja | fachlicher Schlüssel (M08-R03), z. B. `status-change:<statusChangeId>` |
| `recipientId` | long / BIGINT | ja | FK auf `BH_Person`, `ON DELETE CASCADE` |
| `channel` | String(8) / VARCHAR(8) | ja | `EMAIL`, `TEAMS`, `APP` |
| `weeklyReportId` | long / BIGINT | nein | FK auf `BH_WeeklyReport`, `ON DELETE CASCADE` |
| `subject` | String(500) / VARCHAR(500) | ja | |
| `body` | String(10000) / TEXT | ja | |
| `link` | String(500) / VARCHAR(500) | nein | Pfad in der App (M08-R09) |
| `createdAt` | Date / TIMESTAMP | ja | |
| `sentAt` | Date / TIMESTAMP | nein | CHECK `notification_app_delivered` |
| `readAt` | Date / TIMESTAMP | nein | nur App (M08-R16) |
| `attempts` | int / INTEGER | ja | CHECK `notification_attempts_not_negative` |
| `nextAttemptAt` | Date / TIMESTAMP | ja | |
| `lastError` | String(4000) / VARCHAR(4000) | nein | |
| `failedAt` | Date / TIMESTAMP | nein | |
| `userNotificationEventId` | long / BIGINT | nein | nur Kanal App: Eintrag in der Liferay-Glocke (2.5) |

Eindeutig: (`eventKey`, `recipientId`, `channel`) (M08-R11, AK-1004). Indizes: (`recipientId`, `readAt`) und der
partielle Index `notification_pending_idx` auf `nextAttemptAt` `WHERE sentAt IS NULL AND failedAt IS NULL` (SQL-Skript).

#### BH_TeamsDevMessage (Entity `TeamsDevMessage`, Prisma `TeamsDevMessage`) – Teams-Postfach der Demo

| Spalte | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `teamsDevMessageId` | long / BIGINT | PK | |
| `notificationId` | long / BIGINT | ja | FK auf `BH_Notification`, `ON DELETE CASCADE`; eindeutig |
| `recipientId` | long / BIGINT | ja | FK auf `BH_Person`, `ON DELETE CASCADE` |
| `subject`, `body`, `link` | String / wie `BH_Notification` | `link` nein | |
| `createdAt` | Date / TIMESTAMP | ja | |

Index: (`recipientId`, `createdAt`).

#### BH_ReminderRun (Entity `ReminderRun`, Prisma `ReminderRun`) – erledigte Erinnerungsläufe (M08-R17)

| Spalte | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `reminderRunId` | long / BIGINT | PK | Service Builder braucht für zusammengesetzte Schlüssel eine eigene PK-Klasse; einfacher ist ein eigener Schlüssel |
| `isoYear`, `isoWeek` | int / INTEGER | ja | eindeutig zusammen (ersetzt den zusammengesetzten Primärschlüssel); CHECK `reminder_run_iso_week_range` |
| `ranAt` | Date / TIMESTAMP | ja | |
| `created` → Spalte `createdCount` | int / INTEGER | ja | Voreinstellung `0`; Anzahl angelegter Benachrichtigungen |

Der Vermerk entsteht in derselben Transaktion wie die Nachrichten; der eindeutige Schlüssel (`isoYear`, `isoWeek`) lässt
von zwei gleichzeitigen Läufen genau einen gelingen (M08 Abschnitt 8, AK-1023).

### 2.4 Versionsspalte und bedingtes Update (M05, AK-508)

Gilt für beide Plattformen gleich und ist die Grundlage für den Abschnitt „Nachweis AK-505 und AK-508“ der Profile.

- **Versionsspalte:** `BH_WeeklyReport.version` (int, Anfang `0`) ist der Versionsstand aus M05 Abschnitt 5. Jeder
  gelungene Statuswechsel erhöht sie um 1 (M05-R20); Speichern von Tageseingaben ändert sie nicht (wie in der
  TypeScript-App).
- **Nicht Liferays MVCC:** Die Entity `WeeklyReport` setzt `mvcc-enabled="false"`; die Spalte heißt fachlich `version`
  und wird von Hand geführt, damit 6.2.5 und 7.2 dieselbe Spalte und dieselbe Logik haben (`docs/06-spec-architektur.md`, Tabelle
  „Abbildung der Bausteine“: „Versionsspalte von Hand“). P00 prüft, ob die DTD von 6.2.5 das Attribut kennt; sonst
  entfällt es dort.
- **Ablauf eines Statuswechsels**, in einer Service-Transaktion (`@Transactional` bzw. die Transaktion der
  `*LocalServiceImpl`-Methode):
  1. Zeile des Berichts mit `SELECT … FOR UPDATE` sperren (eigener Finder mit Custom SQL). Das erfüllt die „Sperre“ aus
     M05 Abschnitt 8: Speichern (M04) und andere Statuswechsel desselben Berichts warten. Das gilt nur, weil **auch
     Speichern (M04) dieselbe Zeile zuerst mit `FOR UPDATE` sperrt** und erst danach Status und Tage liest und schreibt,
     wie es die TypeScript-App beim Speichern tut (`src/lib/reports.ts`). **Bewusst strengere Liferay-Regel:** Jede
     Methode, die Tage eines bestehenden Berichts schreibt, beginnt mit dieser Sperre; die TypeScript-App sperrt beim
     Anlegen fehlender Wochen (M03, `ensureReportsForTrainee`) nicht, das bleibt auf Liferay für neu angelegte Berichte
     ebenso zulässig.
  2. Rolle, Besitz, Status und gesehenen Stand (Status und `version` aus dem Formular) prüfen, in der Reihenfolge nach
     M05-R21; Fehlercodes nach M05-R20.
  3. Bedingtes Update `UPDATE BH_WeeklyReport SET status = ?, version = version + 1, updatedAt = ? WHERE
     weeklyReportId = ? AND status = ? AND version = ?` und genau eine geänderte Zeile verlangen; sonst Abbruch mit dem
     Konfliktcode. Das Update bleibt bedingt, auch wenn Schritt 1 schon sperrt (zweite Sicherung gegen Fehler in der
     Fachlogik).
  4. Historieneintrag (`BH_StatusChange`, `seq` je Bericht), Kommentare und Benachrichtigungen in derselben Transaktion
     (M05-R22, M08 Abschnitt 8).
- **Cache:** Nach dem Update per Custom SQL wird der Entity-Cache des Berichts geleert (`clearCache`), sonst liest
  Service Builder den alten Stand.
- **Endgültiges Löschen eines Azubis (M06-R10, AK-206, AK-803-05):** Die App löscht nur die Zeile in `BH_Person`
  (`DELETE FROM BH_Person WHERE personId = ?` bzw. `deletePerson` ohne vorheriges Löschen der Kinder). Berichte, Tage,
  Statuswechsel, Kommentare, Benachrichtigungen und Teams-Nachrichten entfernt **ausschließlich die Kaskade der
  Datenbank** (2.6), nie Service Builder, kein `removeBy…` und kein eigener Löschaufruf je Kind. Grund: Die Trigger der
  Historie lassen ein Löschen nur innerhalb der Kaskade zu (`pg_trigger_depth() > 1` und Bericht nicht mehr vorhanden);
  ein Löschen über Service Builder träfe sie als einzelnes `DELETE` und scheiterte mit `BH803`. Danach leert die App den
  Entity- und Finder-Cache aller betroffenen Entities (`Person`, `WeeklyReport`, `ReportDay`, `StatusChange`,
  `Comment`, `Notification`, `TeamsDevMessage`), weil Service Builder vom Löschen der Kinder nichts erfährt. Eine
  Person in fremder Historie erkennt zuerst die Fachlogik (`loeschenPruefen` → `fremde_historie`, Deaktivieren wird
  angeboten; M02-R22, `specs/pruefung/format.md`); die Fremdschlüssel `actorId`/`authorId` sind nur das Netz dahinter
  und weisen das Löschen auch an der Fachlogik vorbei ab.
- **Nachweis:** die Fälle AK-508-01, AK-508-02, AK-508-03, AK-508-04 und AK-508-05 (Ebene Daten) und AK-508-06,
  AK-508-07, AK-508-08, AK-508-09, AK-508-10 und AK-508-11 (Ebene Fachlogik) über den Prüf-Adapter; zusätzlich ein plattformeigener Test
  „AK-508 von zwei gleichzeitigen Aktionen gelingt genau eine“ mit zwei parallelen Transaktionen (M05 Abschnitt 10:
  echte Gleichzeitigkeit prüft kein neutraler Fall).

### 2.5 Was nicht als App-Tabelle übernommen wird

| Prisma bzw. TypeScript | Ersatz auf Liferay | Begründung | Regeln, die erfüllt bleiben müssen |
| --- | --- | --- | --- |
| `Person.accountId` (Konto-ID des Firmenkontos) und die Auth.js-Sitzung (JWT, kein eigenes Modell) | Liferay-Konto (`User_`) und Liferay-Sitzung; `BH_Person.userId` verweist auf den Liferay-Benutzer | Anmeldung mit Liferay-eigenen Konten ist bereits entschieden (`docs/06-spec-architektur.md`, „Bewusste Abweichung“); die App speichert keine Passwörter, das tut Liferay | M02-R03 bis M02-R05, M02-R07, M02-R08 (Binden beim ersten Login über die E-Mail, nur wenn ungebunden und aktiv), AK-101 (abweichend, begründet), AK-102, AK-106, AK-201 |
| Rolle `Person.role` als einzige Quelle | bleibt in `BH_Person.role`; zusätzlich zwei reguläre Liferay-Rollen „BH Azubi“ und „BH Ausbilder“, die die App beim Anlegen und beim Rollenwechsel setzt | M02 Abschnitt 8: Rollen pflegt der Admin in der App. Die Liferay-Rolle steuert nur Sichtbarkeit von Seiten und Portlets; geschützt wird im Service gegen `BH_Person` | M02-R01, M02-R12, M02-R13, M02-R18, AK-104, AK-203, AK-207, AK-208 |
| Zuordnung Azubi → Ausbilder | bleibt `BH_Person.trainerId`; keine eigene Zuordnungstabelle nötig | Liferay-Rollen kennen keine Zuordnung zu einer Person | M02-R09 bis M02-R11, AK-103, AK-105 |
| In-App-Anzeige der Benachrichtigungen (Glocke) | **eigene Glocke im Theme** aus `BH_Notification` mit der Fachlogik von UI-AK-03 und AK-1015 (Zähler „99+“, Vorschau ohne Gelesen-Markierung); dazu `UserNotificationEvent` über einen `UserNotificationHandler` als Abbild | Die Glocke der Plattform (Dockbar in 6.2.5, Control Menu in 7.2) erfüllt M09-R03 und AK-1015 nicht sicher; Einzelheiten `profile/liferay-625.md` 3.1, `profile/liferay-72.md` 3.5. Weicht vom Bordmittel-Grundsatz in `docs/06-spec-architektur.md` ab (siehe „Bitte bestätigen“) | M08-R16, M09-R03, UI-AK-03, AK-1001 bis AK-1003, AK-1015 |
| — dabei **bleibt** `BH_Notification` auch für den Kanal App | Eintrag in `BH_Notification` ist die Quelle, die Liferay-Glocke ein Abbild (`userNotificationEventId`; auf 6.2.5 wird es nur für U03 weitergeführt und nicht angezeigt, Wahl in U00) | Nur die eigene Tabelle sichert „genau eine je Ereignis, Empfänger und Kanal“ (M08-R11) und den Ausgangskorb für E-Mail und Teams; `UserNotificationEvent` hat keinen fachlichen Schlüssel | M08-R03, M08-R11, M08-R13, M08-R14, AK-1004 |
| pg-boss (eigenes Datenbankschema, kein Prisma-Modell) | Liferay-Scheduler: 6.2.5 `scheduler-entry` in `liferay-portlet.xml`, 7.2 `SchedulerEntry` mit `MessageListener` | Bordmittel nach `docs/06-spec-architektur.md` | M03 (tägliches Anlegen), M08-R17, AK-1021 bis AK-1025; Zeitplan in Europe/Berlin, nie in der Zeitzone des Servers (M08 Abschnitt 8) |
| — dabei **bleibt** `BH_ReminderRun` | | Der Scheduler sichert nicht „höchstens ein Lauf je Woche“, auch nicht bei mehreren Knoten oder Nachholen | M08-R17, AK-1023 |

**Verbindung zum Liferay-Benutzer:**

- `BH_Person.userId` → `User_.userId`, `BH_Person.companyId` → `Company.companyId`. Die App liest die Person bei jeder
  Anfrage über `PortalUtil.getUserId(request)` → `BH_Person` mit diesem `userId` und `companyId`; deaktiviert oder
  unbekannt heißt „kein Zugang“ (M02-R03, M02-R04, Gegenstück zu `src/lib/session.ts`).
- **Binden beim ersten Login:** Der Admin legt in der App die Person an; die App legt dabei den Liferay-Benutzer mit
  derselben E-Mail an (ohne die App ein Passwort speichern zu lassen; Liferay verschickt den Link zum Setzen). Ein
  Login-Post-Action (`login.events.post`) bindet beim ersten Login bedingt `userId` (`WHERE userId IS NULL AND active_`),
  analog zu `resolveLoginPerson()`. P00 entscheidet, ob das Anlegen des Liferay-Benutzers aus der App heraus nötig ist
  oder der Admin ihn in der Liferay-Verwaltung anlegt (siehe „Bitte bestätigen“).
- **Ein Mandant:** Die App läuft in genau einer Liferay-Instanz (`companyId`) mit einem Mandanten. Deshalb ist
  `BH_Person.email` global eindeutig und `BH_Setting` hat genau eine Zeile; `companyId` steht in den Tabellen nur, weil
  Liferay-APIs (Benutzer, Rechte, Benachrichtigungen) sie verlangen. Mehrere Instanzen wären eine eigene Entscheidung
  mit Schlüsseln (`companyId`, `email`) bzw. `BH_Setting` je `companyId` (siehe „Bitte bestätigen“).
- **Keine Site-Bindung:** Die App-Daten hängen an der Instanz (`companyId`), nicht an einer Site; deshalb keine
  `groupId`-Spalten. Die Portlets liegen auf einer Site „Berichtsheft“; deren `groupId` braucht nur die Oberfläche.
- **Sitzung höchstens 8 Stunden (M02-R05):** Liferays `session.timeout` misst Untätigkeit. Die App vermerkt den
  Anmeldezeitpunkt in der Sitzung und beendet sie nach 8 Stunden selbst (in P00 zu klären, ob Bordmittel reichen).

### 2.6 Schutz in der Datenhaltung (Skript „Schutz in der Datenhaltung“)

Ein PostgreSQL-Skript, wortgleich in beiden Umsetzungen, angelegt als Upgrade-Schritt der App (Version `1.0.0` des
Service-Moduls). Es übernimmt aus den Migrationen der TypeScript-App:

- alle Fremdschlüssel mit ihren `ON DELETE`-Aktionen aus 2.3, `actorId` und `authorId` `DEFERRABLE INITIALLY DEFERRED`,
  damit das endgültige Löschen eines Azubis seine eigenen Einträge per Kaskade mitnimmt (M06-R10; Löschablauf in 2.4:
  nur die Zeile in `BH_Person`, die Kinder nur per Kaskade);
- alle CHECK-Constraints aus 2.3 mit denselben Namen;
- die Trigger mit denselben Namen und demselben festen Fehlercode `SQLSTATE 'BH803'`:
  - `status_change_no_update`, `status_change_no_delete` und `comment_no_update`, `comment_no_delete`: Ändern immer
    abweisen; Löschen nur als Kaskade erlauben (Bericht existiert nicht mehr) (M06-R08, M06-R10);
  - `weekly_report_delete_guard`: Bericht mit Historie nicht einzeln löschen, solange der Azubi besteht (M06-R09);
  - `report_day_locked`: Tage eingereichter und freigegebener Berichte nicht ändern (M05 Abschnitt 8
    „Schreibschutz in der Datenhaltung“, AK-505, AK-704);
- den partiellen Index `notification_pending_idx` und den partiellen eindeutigen Index auf `BH_Person.userId`.

**Warum nicht nur ModelListener:** `docs/06-spec-architektur.md` sieht für die Historie einen `ModelListener` vor, der Ändern und Löschen
sperrt. Ein `ModelListener` greift nur bei Schreibzugriffen über die Liferay-Persistenz; ein direkter Schreibversuch an
der Fachlogik vorbei (Werkzeug, Custom SQL, fehlerhafter Programmteil) ginge durch. M06-R08 und M06 Abschnitt 8
verlangen ausdrücklich den Schutz auch dann. Deshalb gilt auf beiden Plattformen: **Trigger in PostgreSQL wie in der
TypeScript-App** (gleichwertige Erfüllung) **plus** `ModelListener` als frühe, verständliche Abweisung in der App.
Damit ändert sich die Zeile „Historie unveränderlich“ der Tabelle in `docs/06-spec-architektur.md` (siehe „Bitte bestätigen“); die Folge ist,
dass die Liferay-Umsetzungen nur PostgreSQL unterstützen.

**Fehlergrund:** Der Prüf-Adapter erkennt die Abweisung am SQLSTATE `BH803` in der Ursache der Ausnahme (Hibernate bzw.
`SystemException`) und meldet `historie_unveraenderlich`, nie am Meldungstext (Regeln für Adapter in
`specs/pruefung/format.md`). `report_day_locked` meldet wie in der TypeScript-App den allgemeinen Code `P0001`.

**Nachweis:** AK-803-01 bis AK-803-05 (Daten-Fälle `historie_aendern`, `historie_loeschen`, `bericht_loeschen`,
`person_loeschen`), AK-206-01 bis AK-206-07 (fremde Historie), dazu je Plattform ein Integrationstest „AK-505
Datenhaltung weist Ändern eines eingereichten Tags ab“ per direktem SQL (Gegenstück zu `tests/db/status-change.test.ts`,
kein neutraler Prüffall zeigt das). AK-505-01, AK-505-02, AK-505-03 und AK-505-04 sind Fälle der Ebene Daten und laufen
über den Prüf-Adapter; AK-505-05, AK-505-06 und AK-505-07 prüfen die Fachlogik. Beim Einreichen rollt eine
`PortalException` die in derselben Transaktion gespeicherten Tage zurück; `pflichtangaben_fehlen` ist deshalb ein Ergebnis
und keine Ausnahme, damit die Tage Entwurf bleiben (M05-R08, AK-505-03; Profile, „Fallstricke und Grenzen“).

## 3. Abbildung der Bausteine

### 3.1 Tabelle mit Status

Grundlage ist die Tabelle in `docs/06-spec-architektur.md`, „Plattform-Profile“. „Bestätigt“ heißt hier nur: durch eine
Quelle belegt, nicht im laufenden System; das bleibt P00.

| Baustein | Liferay 6.2.5 CE GA6 | Liferay 7.2 CE | Status |
| --- | --- | --- | --- |
| Laufzeit | Java 7/8, Tomcat 7, Plugins SDK | Java 8/11, Tomcat 9, Liferay Workspace (Gradle), OSGi | 7.2: bestätigt (Release-Hinweise 7.2 CE GA2: Tomcat 9.0, JDK 8 und 11). 6.2.5: Tomcat-Bundle bestätigt (Dateiname auf SourceForge), Java 8 nur aus Forenbeitrag; in P00 zu klären |
| Anmeldung | Liferay-eigene Konten | Liferay-eigene Konten; OIDC optional | Liferay-Konten: bestätigt (Entscheidung `docs/06-spec-architektur.md`). OIDC 7.2: Modul `com.liferay.portal.security.sso.openid.connect.impl` 4.0.17 steht in `release.portal.bom` 7.2.1 (Maven Central); ob es in CE aktiv und nutzbar ist, in P00 zu klären |
| Rollen und Besitz | Liferay-Rollen plus eigene Prüfung im Service | wie 6.2.5 | gemeinsam beschrieben in 2.5 und 5; in P00 zu klären: Permission-Checker je Plattform |
| Persistenz | Service Builder | Service Builder | Schema gemeinsam in Abschnitt 2; erzeugte `tables.sql` in P00 zu vergleichen |
| Transaktion und Gleichzeitigkeit | Service-Transaktion, Versionsspalte von Hand | Service-Transaktion, Versionsspalte | gemeinsam in 2.4 (beide von Hand, `mvcc-enabled="false"`); in P00 zu klären |
| Historie unveränderlich | ModelListener sperrt Ändern und Löschen | wie 6.2.5 | **geändert:** PostgreSQL-Trigger plus ModelListener (2.6); Bitte bestätigen |
| Uhr | eigener Uhr-Service, für Tests stellbar | eigener OSGi-Uhr-Service | gemeinsame Schnittstelle in 3.2; in P00 zu klären |
| Hintergrundjobs | Scheduler-Eintrag im Portlet | Scheduler mit MessageListener | gemeinsame Regeln in 3.2; Zeitplan in Europe/Berlin in P00 zu klären |
| Benachrichtigung in der App | eigene Glocke im Theme aus `BH_Notification`; `UserNotification` nur als Abbild | eigene Glocke im Theme; `UserNotification` als Abbild, `readAt` folgt beiden Wegen | **geändert:** gemeinsam in 2.5 (eigene Tabelle bleibt Quelle); Bitte bestätigen; in P00 zu klären |
| E-Mail | synchroner Versand (`MailEngine.send`) → Mailpit | synchroner Versand über die `javax.mail.Session` des Portals → Mailpit | **geändert:** nicht der asynchrone `MailService`; gemeinsam in 3.2; Bitte bestätigen; in P00 zu klären |
| Teams | Adapter mit Demo-Postfach | Adapter mit Demo-Postfach | gemeinsam in 3.2 (`BH_TeamsDevMessage`) |
| PDF | Java-PDF-Bibliothek, Noto Sans eingebettet | wie 6.2.5 | Vorschlag Apache PDFBox 2.0.x für beide (Abschnitt 7); in P00 zu klären |
| Oberfläche | Portlets, AlloyUI/Bootstrap 2, eigenes Theme | Portlets, Clay/Bootstrap 4, eigenes Theme | Plattform-Unterschied, nur im Profil |
| Dunkelmodus | nur über Theme, Umfang in P00 | Theme mit CSS-Variablen, Umschalter | Plattform-Unterschied, nur im Profil; Spalte `theme` gemeinsam |
| Prüf-Adapter | JUnit und Playwright | JUnit/Integrationstests und Playwright | gemeinsame Schnittstelle in 3.2; in P00 zu klären |
| Suchdienst | keiner nötig (Lucene im Portal) | Elasticsearch, für Tests eingebettet | 7.2: eingebettet nur für Entwicklung (Liferay Learn); Abschnitt 4 |

### 3.2 Gemeinsame Bausteine

**Uhr-Service (M01-R01 bis M01-R04, AK-1201):**

- Schnittstelle `Clock` mit `now()`; Umsetzung „System“ und „fest gestellt“. Gegenstück zu `src/domain/clock.ts`.
- Stellbar nur außerhalb des Produktivbetriebs. Ein `NODE_ENV` gibt es auf Liferay nicht; beide Plattformen nutzen die
  Eigenschaft `bh.betrieb` mit den Werten `produktion` und `test` (Voreinstellung `produktion`), in `portal-ext.properties`
  (6.2.5) bzw. als OSGi-Konfiguration (7.2). Bei `produktion` wirkt eine Vorgabe der Uhr nicht (M01-R03).
- Alle Fachlogik bekommt die Uhr übergeben; keine Klasse liest die Systemzeit selbst.

**Fachlogik als reine Java-Klassen:** Die reinen Funktionen aus `src/domain/` werden in Java ohne Abhängigkeit zu
Liferay übersetzt, auf Sprachstand Java 8 (auf beiden Plattformen lauffähig, falls 6.2.5 Java 8 nutzt).
**Ausweichregel, falls 6.2.5 doch Java 7 braucht:** Die Fachlogik wird auf Sprachstand Java 7 geschrieben (ohne
Lambdas, Streams und `java.time`; Datum über `java.util.Calendar` in UTC bzw. eigene Klasse für Kalendertage), damit
dieselben Quellen auf beiden Plattformen laufen; PDFBox bleibt 2.0.x (läuft ab Java 6), JDBC wird 42.2.29.jre7
(Abschnitt 7); 7.2 bleibt bei Java 11. Ob beide Umsetzungen dieselben Quelldateien kopieren, legt P00 fest.

**Prüf-Adapter zu `specs/pruefung/format.md`:**

- Ebene `fachlogik`: JUnit-Runner liest die Prüffälle aus `specs/pruefung/` und ruft die Java-Fachlogik; Formate und
  Fehlercodes nach „Regeln für Adapter“ (übersetzen ja, umdeuten nein; Fehlercode über die Fehlerart).
- Ebenen `daten` und `ablauf`: Eine **Testschnittstelle** der App (Gegenstück zu `src/app/api/test/zustand/route.ts`)
  stellt Uhr, Testdaten und Ausgangsbestand her und führt die Daten-Aktionen aus; sie ist nur bei `bh.betrieb=test`
  erreichbar und sonst nicht registriert. Den Ablauf-Runner übernehmen beide Umsetzungen aus der TypeScript-App
  (Playwright für Node, `e2e/pruefung/ablauf-adapter.ts`), mit plattformeigenen Selektoren über die festen Merker.
- Kein stilles Überspringen; „abweichend, begründet“ wie in `specs/pruefung/format.md`, Abschnitt „Abweichend, begründet“.

**Teams-Adapter (M08):** Schnittstelle „Kanal“ mit den Umsetzungen E-Mail, Teams und App. Teams schreibt in der Demo in
`BH_TeamsDevMessage` (höchstens eine Nachricht je Benachrichtigung, eindeutiger Schlüssel `notificationId`); gewählt
über die Eigenschaft `bh.teams.modus` (Gegenstück zu `TEAMS_MODE`), ein echter Teams-Versand ist nicht Teil von L62/L72.

**E-Mail an Mailpit (M08):** **synchroner** Versand: Der Ausgangskorb braucht Erfolg oder Fehler je Nachricht (Versuche,
`lastError`, `failedAt`), der `MailService` von Liferay versendet aber asynchron über den Message Bus und meldet Fehler
nicht zurück. 6.2.5 sendet deshalb über `MailEngine.send`, 7.2 über die `javax.mail.Session` des Portals. SMTP-Host und -Port in `portal-ext.properties`
(Demo: Mailpit, Port 1025, ohne Anmeldung). In der Cloud-Sitzung ein SMTP-Mock, wie bei der TypeScript-App. Jede Nachricht
trägt eine feste Kennung (`Message-ID` aus `notificationId`), damit eine Wiederholung erkennbar ist (M08 Abschnitt 8).

**Ausgangskorb und Zeitplan:** Ein Scheduler-Eintrag je Plattform verarbeitet den Ausgangskorb (Gegenstück zu
`src/lib/notifications/outbox.ts`), einer startet die Montags-Erinnerung (9:00 Uhr Europe/Berlin, Nachholen bis
Dienstag 23:59 Uhr), einer legt fehlende Wochen an (M03). Mehrere gleichzeitige Läufe übergeben eine Nachricht nie
doppelt (Zeilensperre `FOR UPDATE SKIP LOCKED` über Custom SQL).

**Nur Plattform-Unterschiede (stehen in den Profilen):** Oberfläche und Theme, Dunkelmodus, Registrierung der
Scheduler, Upgrade-Mechanik, Konfiguration (Properties gegenüber OSGi), Build, Suchdienst.

## 4. Bezugsquellen und Versionen

Lesend geprüft am 15.10.2026 aus der Cloud-Sitzung (ausgehender Verkehr über den Proxy der Sitzung). Prüfweg
`curl -sSI` (bei Weiterleitung `-L`), für Verzeichnisse und Metadaten ein `GET` der Übersichtsseite bzw. von
`maven-metadata.xml`; **kein Download eines Bundles, keine Installation**. „Proxy 403“ heißt: Der Proxy lässt die
Verbindung zum Host nicht zu (`CONNECT tunnel failed, response 403`). Alles gilt als „in P00 zu bestätigen“.

### 4.1 Liferay-Bundles

| Quelle | URL | Prüfweg | Status | Größe | Erreichbar |
| --- | --- | --- | --- | --- | --- |
| 6.2.5 CE GA6, Tomcat-Bundle | `https://downloads.sourceforge.net/project/lportal/Liferay%20Portal/6.2.5%20GA6/liferay-portal-tomcat-6.2-ce-ga6-20160112152609836.zip` | `curl -sSI -L` | 200 (über `master.dl.sourceforge.net`) | 300.963.516 Byte | ja |
| 6.2.5 CE GA6, Plugins SDK | `https://downloads.sourceforge.net/project/lportal/Liferay%20Portal/6.2.5%20GA6/liferay-plugins-sdk-6.2-ce-ga6-20171101150212422.zip` | `curl -sSI -L` | 200 | 3.676.136 Byte | ja |
| 6.2.5 CE GA6, Verzeichnis | `https://sourceforge.net/projects/lportal/files/Liferay%20Portal/6.2.5%20GA6/` | `GET` der Übersicht | 200; enthält auch `…-sql-…`, `…-dependencies-…`, `…-src-…` | – | ja |
| 7.2.1 CE GA2, Tomcat-Bundle (aktuelle GA von 7.2) | `https://downloads.sourceforge.net/project/lportal/Liferay%20Portal/7.2.1%20GA2/liferay-ce-portal-tomcat-7.2.1-ga2-20191111141448326.tar.gz` | `curl -sSI -L` | 200 | 653.414.508 Byte | ja |
| 7.2.1 CE GA2, Verzeichnis | `https://sourceforge.net/projects/lportal/files/Liferay%20Portal/7.2.1%20GA2/` | `GET` der Übersicht | 200; enthält auch `…-tools-…` (Upgrade-Werkzeug), `…-sql-…`, `…-osgi-…` | – | ja |
| Liferay-CDN | `https://releases-cdn.liferay.com/portal/7.2.1-ga2/`, `…/6.2.5-ga6/` | `curl -sSI` | Proxy 403 | – | nein; Ausweichquelle SourceForge |
| GitHub-Releases | `https://github.com/liferay/liferay-portal/releases/tag/7.2.1-ga2` | `curl -sSI` | 403 (GitHub außerhalb des freigegebenen Repositorys) | – | nein; Ausweichquelle SourceForge |
| Docker-Image 6.2.5 (für CI) | Docker Hub `liferay/portal:6.2.5-ga6` | `GET` `hub.docker.com/v2/repositories/liferay/portal/tags/6.2.5-ga6` | 200 | amd64 894.945.363 Byte | Metadaten ja; Container starten in der Sitzung nicht (`CLAUDE.md`) |
| Docker-Image 7.2 (für CI) | Docker Hub `liferay/portal:7.2.1-ga2` | wie oben | 200 | amd64 1.253.984.955 Byte | wie oben |

Version 7.2: Laut SourceForge ist 7.2.1 GA2 die letzte GA von 7.2 (danach folgt 7.3.0 GA1). Die Release-Hinweise
7.2 CE GA2 nennen Tomcat 9.0, Oracle JDK 8 und 11, IBM J9 JDK 8 und PostgreSQL 10 als getestet
([Liferay Portal 7.2 CE GA2 Release](https://liferay.dev/b/liferay-portal-7-2-ce-ga2-release), per Websuche; direkter
Abruf von `liferay.dev` scheiterte an der Namensauflösung).

### 4.2 JDKs

| Quelle | URL | Prüfweg | Status | Größe | Erreichbar |
| --- | --- | --- | --- | --- | --- |
| OpenJDK 8 (Ubuntu 24.04, universe) | `http://archive.ubuntu.com/ubuntu/pool/universe/o/openjdk-8/` (`openjdk-8-jdk-headless_8u504-ga-1ubuntu1~24.04.3_amd64.deb`) | `GET` der Verzeichnisseite | 200 | nicht gemeldet | ja; Paketquellen `noble`, `noble-security` sind eingetragen |
| OpenJDK 11 (Ubuntu 24.04, universe) | `http://archive.ubuntu.com/ubuntu/pool/universe/o/openjdk-lts/` (`openjdk-11-jdk-headless_11.0.32.1+1-1ubuntu1~24.04_amd64.deb`) | `GET` der Verzeichnisseite | 200 | nicht gemeldet | ja; `apt-cache policy` kennt das Paket ohne `apt-get update` noch nicht |
| Eclipse Temurin (Adoptium) | `https://api.adoptium.net/v3/info/available_releases`, `https://packages.adoptium.net/` | `curl -sSI` | Proxy 403 | – | nein; Ausweichquelle Ubuntu-Pakete |
| Temurin über GitHub | `https://api.github.com/repos/adoptium/temurin8-binaries/releases/latest` | `curl -sSI` | 403 | – | nein |
| Azul Zulu (für Java 7) | `https://cdn.azul.com/zulu/bin/` | `curl -sSI` | Proxy 403 | – | nein; Docker Hub `azul/zulu-openjdk:7` hat Metadaten (200), nur für CI |
| Docker-Images für CI | Docker Hub `eclipse-temurin:8-jdk`, `eclipse-temurin:11-jdk` | `GET` `hub.docker.com/v2/repositories/library/eclipse-temurin/tags/<tag>` | 200 | nicht ausgewertet | Metadaten ja |

Vorinstalliert ist nur Java 21; es passt zu keiner der beiden Liferay-Versionen. Vorschlag: 6.2.5 mit Java 8 (Java 7
ist in der Sitzung nicht beziehbar; Java 8 für 6.2 belegt nur ein Forenbeitrag mit Zitat des Liferay-Supports,
[liferay.dev Ask](https://liferay.dev/ask/-/message_boards/message/93499920)), 7.2 mit Java 11 (Release-Hinweise).

### 4.3 Maven, Plugins SDK und Workspace

| Quelle | URL | Prüfweg | Status | Größe | Erreichbar |
| --- | --- | --- | --- | --- | --- |
| Liferay-Nexus | `https://repository.liferay.com/nexus/content/groups/public/` | `curl -sSI` | Proxy 403 | – | nein |
| Liferay-Nexus-CDN | `https://repository-cdn.liferay.com/nexus/content/groups/public/` | `curl -sSI` | Proxy 403 | – | nein |
| Maven Central: 6.2.5-API | `https://repo1.maven.org/maven2/com/liferay/portal/portal-service/6.2.5/portal-service-6.2.5.pom` | `curl -sSI` | 200 | 701 Byte (POM) | ja |
| Maven Central: 7.2-BOM | `https://repo1.maven.org/maven2/com/liferay/portal/release.portal.bom/7.2.1/release.portal.bom-7.2.1.pom` | `curl -sSI`, dann `GET` des POM | 200 (nennt `com.liferay.portal.kernel` 4.35.2, `…search.elasticsearch6.impl` 3.0.39) | 156.906 Byte | ja |
| Maven Central: Workspace-Plugin | `https://repo1.maven.org/maven2/com/liferay/com.liferay.gradle.plugins.workspace/maven-metadata.xml` | `GET` | 200 (neueste 13.1.2) | 13.481 Byte | ja |
| Maven Central: Blade | `https://repo1.maven.org/maven2/com/liferay/blade/com.liferay.blade.cli/maven-metadata.xml` | `GET` | 200 (neueste 7.0.5) | 1.527 Byte | ja |

Maven Central antwortete einmal mit 429 (Rate Limit) und beim nächsten Versuch mit 200; Abrufe deshalb gebündelt und mit
Pause. Offen für P00: ob der Workspace für 7.2 alle Artefakte aus Maven Central bekommt (sonst braucht er den
gesperrten Liferay-Nexus), welche Workspace-Plugin-Version zu 7.2 passt, und ob das Plugins SDK 6.2 seine Ivy-Abhängigkeiten
ohne Liferay-Nexus auflöst.

### 4.4 Suchdienst (7.2)

| Quelle | URL | Prüfweg | Status | Größe | Erreichbar |
| --- | --- | --- | --- | --- | --- |
| Elasticsearch 6.8 (Archiv) | `https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-6.8.23.tar.gz` | `curl -sSI` | Proxy 403 | – | nein |
| Elasticsearch 6.8 (Image) | Docker Hub `elasticsearch:6.8.23` | `GET` `hub.docker.com/v2/repositories/library/elasticsearch/tags/6.8.23` | 200 (Metadaten) | nicht ausgewertet | nur für CI |

7.2 bringt einen **eingebetteten** Elasticsearch-Knoten im Liferay-Prozess mit (Port 9200); er ist nur für Entwicklung
und Tests gedacht, nicht für den Produktivbetrieb
([Using the Sidecar or Embedded Elasticsearch](https://learn.liferay.com/w/dxp/search/installing-and-upgrading-a-search-engine/elasticsearch/using-the-sidecar-or-embedded-elasticsearch),
per Websuche; `learn.liferay.com` ist über den Proxy gesperrt). Vorschlag: eingebettet in Sitzung und CI, da die App
die Suche nicht braucht. Welche Elasticsearch-Version eingebettet ist, klärt P00.

### 4.5 Datenbank

| Punkt | Stand | Prüfweg bzw. Quelle | Größe |
| --- | --- | --- | --- |
| PostgreSQL in der Sitzung | 16.15 vorinstalliert | `psql --version` | – |
| 7.2 getestet mit | PostgreSQL 10 | Release-Hinweise 7.2 CE GA2 (Websuche) | – |
| 6.2.5 getestet mit | nicht gefunden; Kompatibilitätsmatrix 6.2 per Websuche nicht auffindbar | in P00 zu klären | – |
| JDBC-Treiber 42.7.14 | `https://repo1.maven.org/maven2/org/postgresql/postgresql/42.7.14/postgresql-42.7.14.jar`, 200 | `curl -sSI` | 1.221.004 Byte |
| JDBC-Treiber 42.2.29.jre7 | `https://repo1.maven.org/maven2/org/postgresql/postgresql/42.2.29.jre7/postgresql-42.2.29.jre7.jar`, 200 | `curl -sSI` | 985.754 Byte |
| Download-Seite des Treibers | `https://jdbc.postgresql.org/download/` | `curl -sSI`: Proxy 403 | – |

Risiko: PostgreSQL 16 ist neuer als jede getestete Version; die alten Bundles bringen womöglich einen alten JDBC-Treiber
ohne SCRAM-Anmeldung mit (Voreinstellung ab PostgreSQL 14). P00 tauscht den Treiber gegen die Version aus Abschnitt 7 und
prüft, ob Liferay auf PostgreSQL 16 startet; sonst Ausweichen auf eine ältere PostgreSQL-Version in CI.

### 4.6 Kurzliste

- **Erreichbar:** SourceForge (Bundles 6.2.5 und 7.2.1, Plugins SDK, Upgrade-Werkzeug), Maven Central (Liferay-APIs,
  BOM, Workspace-Plugin, Blade, JDBC, PDFBox, JUnit, Jollyday, Playwright für Java), Ubuntu-Archiv (OpenJDK 8 und 11),
  Docker Hub (nur Metadaten; Images nur in CI nutzbar), `raw.githubusercontent.com` (Noto-Projekt).
- **Nicht erreichbar:** `releases-cdn.liferay.com`, `repository.liferay.com`, `repository-cdn.liferay.com`,
  `learn.liferay.com`, `help.liferay.com`, `api.adoptium.net`, `packages.adoptium.net`, `cdn.azul.com`,
  `artifacts.elastic.co`, `jdbc.postgresql.org`, `github.com` außerhalb des Repositorys, `registry.hub.docker.com`.

## 5. Sicherheitsrelevante Dateien (Eingabe für AM-R04)

Vorschlag für die Ergänzung von AM-R04 in `docs/07-spec-automatisches-mergen.md` (umgesetzt in G4-L). Die Pfadmuster
sind vorläufig: Die Profile haben sie gegen ihre Projektstruktur abgeglichen (`profile/liferay-625.md` 2.3,
`profile/liferay-72.md` Abschnitt 2); P00 bestätigt sie am laufenden Projekt, und G4-L übernimmt den bestätigten Stand.
Angenommen ist diese Struktur: 6.2.5
`liferay-625/portlets/<portlet>/docroot/…`, 7.2 `liferay-72/modules/<modul>/…` und `liferay-72/configs/…`.

| Entsprechung zu | 6.2.5 (`liferay-625/`) | 7.2 (`liferay-72/`) | Begründung |
| --- | --- | --- | --- |
| `src/auth.ts`, `src/lib/auth/**` (Anmeldung, Binden) | `liferay-625/**/hook/**`, `liferay-625/**/liferay-hook.xml`, `liferay-625/**/portal.properties` des Hooks (`login.events.post`), `liferay-625/**/html/hooks/login/**` | `liferay-72/modules/bh-access/**`, `liferay-72/modules/**/*LoginPostAction*.java` | Binden der Person an den Liferay-Benutzer und Zugang (M02-R03, M02-R07, M02-R08) |
| `src/proxy.ts`, `src/lib/session.ts` (jede Anfrage prüft die Person) | `liferay-625/**/servlet/filter/**`, `liferay-625/**/*Filter.java` | `liferay-72/modules/**/servlet/filter/**`, `liferay-72/modules/**/*Filter.java` | Zugang bei jedem Zugriff, Sitzungsdauer, Rücksprungziel (M02-R04, M02-R05, AK-1003) |
| `src/domain/access.ts`, `src/domain/report-access.ts` | `liferay-625/**/domain/access/**` | `liferay-72/modules/**/domain/access/**` | Fachregeln Zugang und Sichtbarkeit (M02-R03, M02-R09 bis M02-R12) |
| Rollen- und Besitzprüfung in Serveraktionen | `liferay-625/**/service/impl/**`, `liferay-625/**/service/permission/**` | `liferay-72/modules/**/service/impl/**`, `liferay-72/modules/**/security/permission/**` | jede Aktion prüft selbst (M02-R13, M05 Abschnitt 8) |
| Rechte der Portlets | `liferay-625/**/portlet.xml`, `liferay-625/**/liferay-portlet.xml`, `liferay-625/**/resource-actions/**` | `liferay-72/modules/**/portlet/**/*Portlet.java` (Komponenten-Eigenschaften `javax.portlet.security-role-ref`), `liferay-72/modules/**/resource-actions/**` | Rollen, Rechte und Sichtbarkeit der Portlets |
| Konfiguration der Anmeldung, Betriebsart, Testschnittstelle | `liferay-625/**/portal-ext*.properties`, `liferay-625/**/web.xml`, `liferay-625/**/pruefung/**` | `liferay-72/configs/**`, `liferay-72/modules/bh-pruefung/**`, `liferay-72/modules/bh-clock/**`, `liferay-72/modules/**/configuration/**`, `liferay-72/pruefung/**` | `bh.betrieb`, Test-Zugang und Testschnittstelle dürfen in Produktion nie wirken (M01-R03, M02 Abschnitt 8) |
| Schema und Schutz in der Datenhaltung | `liferay-625/**/service.xml`, `liferay-625/**/sql/**`, `liferay-625/**/model/listener/**`, `liferay-625/**/custom-sql/**`, `liferay-625/**/portlet.properties`, `liferay-625/**/service*.properties`, `liferay-625/**/portlet-model-hints.xml` | `liferay-72/modules/**/service.xml`, `liferay-72/modules/**/sql/**`, `liferay-72/modules/**/model/listener/**`, `liferay-72/modules/**/custom-sql/**`, `liferay-72/modules/**/service/persistence/impl/**` | Schema nach Abschnitt 2, Trigger und Constraints (AK-505, AK-803, MW-R05); Sperre und bedingtes Update (AK-508); `service*.properties` meldet auf 6.2.5 den `ModelListener` an und setzt `build.auto.upgrade` |
| Eigene Upgrade-Schritte (Skript „Schutz in der Datenhaltung“ als `UpgradeProcess` bzw. `UpgradeStepRegistrator`) | `liferay-625/**/upgrade/**` | `liferay-72/modules/**/upgrade/**` | Das Skript aus 2.6 legt Trigger, Fremdschlüssel und CHECK-Constraints an (AK-505 Schreibschutz der Tage, AK-803 Historie); ein geänderter Schritt hebelt den Schutz aus |
| Bibliotheken und Bezugsquellen, Build | `liferay-625/**/ivy.xml`, `liferay-625/**/ivy-settings.xml`, `liferay-625/**/build*.xml`, `liferay-625/**/build*.properties` | `liferay-72/**/build.gradle`, `liferay-72/settings.gradle`, `liferay-72/gradle.properties`, `liferay-72/modules/**/bnd.bnd`, `liferay-72/themes/**/package.json` | Externe Bibliotheken (Abschnitt 7) und Bezugsquellen werden hier festgelegt; auf 7.2 steht auch `Liferay-Require-SchemaVersion` in `bnd.bnd` |

## 6. Pfad der Upgrade-Schritte der Reihe U

Vorschlag, in U00 zu bestätigen:

- **App-Daten 6.2.5 → 7.2:** ein eigenes Modul `liferay-72/modules/bh-upgrade-625/` mit den `UpgradeStep`-Klassen unter
  `liferay-72/modules/bh-upgrade-625/src/main/java/**/upgrade/**`, registriert über einen `UpgradeStepRegistrator` mit
  dem Schema-Versionsschritt von „6.2.5-Stand“ auf `1.0.0`. Da das Schema auf beiden Plattformen gleich ist, gleicht es
  nur Liferay-eigene Unterschiede aus (z. B. Einträge in `UserNotificationEvent`, Rollen, Ressourcen-Rechte).
- **Portal-Datenbank:** Einstellungen für das Upgrade-Werkzeug von Liferay (`portal-tools-db-upgrade-client` aus dem
  Tools-Archiv, Abschnitt 4.1) unter `liferay-72/upgrade-625/`.
- **Geschützt (AM-R04):** `liferay-72/modules/bh-upgrade-625/**` und `liferay-72/upgrade-625/**`. Die Upgrade-Schritte
  innerhalb einer Plattform (Schema-Versionen des eigenen Service-Moduls, inklusive Skript aus 2.6) fallen unter
  `**/upgrade/**` derselben Module und sind durch die Zeile „Eigene Upgrade-Schritte“ in Abschnitt 5 erfasst.

## 7. Freigegebene externe Bibliotheken je Plattform

Alles „Vorschlag, in P00 zu bestätigen“. Eine Bibliothek, die hier nicht steht, schließt automatisches Mergen aus
(AM-R04). Liferay selbst, seine APIs und die mitgelieferten Module zählen nicht als externe Bibliothek.

| Zweck | 6.2.5 | 7.2 | Lizenz | Bezugsquelle |
| --- | --- | --- | --- | --- |
| PDF (M07) | Apache PDFBox 2.0.37 | Apache PDFBox 2.0.37 | Apache-2.0 | Maven Central `org.apache.pdfbox:pdfbox` (Liste bis 2.0.37 und 3.0.8; 2.0.x läuft auch auf älteren JDKs, 3.x braucht Java 8) |
| Schrift (M07) | Noto Sans Regular und Bold, eingebettet | wie 6.2.5 | SIL OFL 1.1 | dieselben Dateien wie die TypeScript-App (`assets/fonts/NotoSans-Regular.ttf`, `assets/fonts/NotoSans-Bold.ttf`, `assets/fonts/OFL.txt`) |
| Feiertage (M01) | eigene Umsetzung ohne Bibliothek (Osterformel, feste Regeln je Bundesland, Referenzdaten aus M01 Abschnitt 5) | wie 6.2.5 | – | – |
| Feiertage, Ausweiche | Jollyday 0.5.10 | Jollyday 0.5.10 | Apache-2.0 | Maven Central `de.jollyday:jollyday`; einmalige Feiertage nach M01-R16 müssten ergänzt werden |
| Komponententests | JUnit 4.13.2 | JUnit 4.13.2 | EPL-1.0 | Maven Central `junit:junit` |
| Integrationstests | – | Liferay-Arquillian, `com.liferay:com.liferay.arquillian.extension.junit.bridge` 1.0.20 (neueste auf Maven Central am 15.10.2026; ob sie zu 7.2 passt, in P00 zu klären) | LGPL-2.1 (Liferay) | Maven Central |
| JSON in Tests (Prüf-Adapter liest `specs/pruefung/*.json`) | Jackson Databind 2.12.7.2, nur Test-Klassenpfad | Jackson Databind 2.12.7.2, nur Test-Klassenpfad | Apache-2.0 | Maven Central `com.fasterxml.jackson.core:jackson-databind` (2.12.x; ab 2.13 braucht Jackson Java 8, 2.12.x läuft deshalb auch bei der Ausweichregel Java 7); Quelle der Version siehe unten |
| Ablauf-Fälle | Playwright für Node, Version wie in der TypeScript-App (`@playwright/test` 1.56.1) | wie 6.2.5 | Apache-2.0 | npm, bereits Abhängigkeit des Repositorys |
| JDBC | PostgreSQL-Treiber 42.7.14 bei Java 8; 42.2.29.jre7, falls Java 7 | PostgreSQL-Treiber 42.7.14 | BSD-2-Clause | Maven Central `org.postgresql:postgresql` (42.7.14: 1.221.004 Byte, 42.2.29.jre7: 985.754 Byte) |

Jackson Databind ist die **einzige** JSON-Bibliothek beider Plattformen; eine zweite JSON-Bibliothek ist nicht vorgesehen. Die Version 2.12.7.2
(2. Mai 2024, Apache-2.0) stammt aus dem Wiki [Jackson Release 2.12](https://github.com/FasterXML/jackson/wiki/Jackson-Release-2.12)
und der Seite [mvnrepository.com](https://mvnrepository.com/artifact/com.fasterxml.jackson.core/jackson-databind/2.12.7.2),
beide per Websuche gefunden; der direkte Abruf von Maven Central scheiterte am 16.10.2026 an einer Sperre (HTTP 429 mit
`retry-after` von rund 18 Stunden), `maven-metadata.xml` konnte nicht gelesen werden. **P00 prüft, dass 2.12.7.2 die letzte
2.12.x auf Maven Central ist und sich mit Java 7 und 8 sowie Java 11 laden lässt.**

Begründung Feiertage: Die eigene Umsetzung ist eine reine Funktion wie in `src/domain/`, hat keine Abhängigkeit und
bildet die Regeln M01-R15 bis M01-R19 einschließlich der einmaligen Feiertage genau ab; geprüft durch AK-1206-01 bis
AK-1206-11.

## 8. Offene Punkte für P00 und die Profile

### Bitte bestätigen

- [ ] Präfix `BH_` (Service-Builder-`namespace` `BH`) und die Entity- und Spaltennamen aus Abschnitt 2.3, einschließlich
      der Umbenennungen `date` → `dayDate`, `text` → `commentText`, `created` → `createdCount` und der Spalte `active_`.
- [ ] Kalendertage als `VARCHAR(10)` im Format `JJJJ-MM-TT` statt eines Datumstyps (2.2).
- [ ] Primärschlüssel `long` aus dem Liferay-Zähler statt UUID; `BH_ReminderRun` mit eigenem Schlüssel und eindeutigem
      (`isoYear`, `isoWeek`) (2.3).
- [ ] Kanäle als drei Ja/Nein-Spalten statt einer Liste (2.3).
- [ ] `seq` der Statuswechsel fortlaufend je Bericht statt global (2.3); erfüllt M06-R02, weicht aber von der
      TypeScript-App ab.
- [ ] Versionsspalte `version` von Hand, `mvcc-enabled="false"`, Zeilensperre plus bedingtes Update (2.4).
- [ ] **Historie und Schreibschutz über PostgreSQL-Trigger plus ModelListener** statt nur ModelListener (2.6). Das ist
      die gleichwertige Erfüllung von M06-R08 und M05 Abschnitt 8; die Zeile „Historie unveränderlich“ in `docs/06-spec-architektur.md`
      sollte angepasst werden. Folge: Die Liferay-Umsetzungen laufen nur auf PostgreSQL.
- [ ] `BH_Notification` bleibt für alle Kanäle die Quelle; die Liferay-Glocke ist ein Abbild (2.5).
- [ ] `BH_Person.role` bleibt die Quelle der Rolle; Liferay-Rollen nur für Sichtbarkeit (2.5).
- [ ] Ob die App beim Anlegen einer Person auch den Liferay-Benutzer anlegt oder der Admin das in der Liferay-Verwaltung
      tut (2.5); beides behält das Binden nach M02-R07.
- [ ] Eigenschaft `bh.betrieb` (`produktion`/`test`) als Ersatz für `NODE_ENV` (3.2).
- [ ] Feiertage als eigene Umsetzung ohne Bibliothek (Abschnitt 7).
- [ ] Java 8 für 6.2.5 und Java 11 für 7.2 (Abschnitt 4.2); Ausweichregel für Java 7 in 3.2.
- [ ] Zeitpunkte als `TIMESTAMP` ohne Zeitzone, in UTC gespeichert, statt `timestamptz` wie in der TypeScript-App (2.2).
      Begründung: Service Builder erzeugt für `Date` auf beiden Plattformen `TIMESTAMP`; ein abweichender Spaltentyp
      bräuchte eigenes SQL und ein eigenes Mapping. Gleichwertig, solange JVM und JDBC-Sitzung fest in UTC laufen; P00 weist
      das mit gestellter Server-Zeitzone nach.
- [ ] **Eigene Glocke im Theme** aus `BH_Notification` auf 6.2.5 (und 7.2, siehe `profile/liferay-72.md` 3.5) statt der
      Glocke der Plattform; `UserNotificationEvent` bleibt Abbild (2.5, 3.1). Weicht von der Zeile „Benachrichtigung in der
      App“ in `docs/06-spec-architektur.md` ab, die dann angepasst werden sollte. Ob 6.2.5 das Abbild nur für U03
      weiterführt oder ganz weglässt, entscheidet U00.
- [ ] **Synchroner Mailversand** (6.2.5 `MailEngine.send`, 7.2 `javax.mail.Session` des Portals) statt des asynchronen
      `MailService`, damit der Ausgangskorb Erfolg und Fehler je Nachricht erfährt (3.2).
- [ ] Paketwurzel `de.berichtsheft` für Java-Pakete und `package-path` von Service Builder auf beiden Plattformen (2.1).
- [ ] Jackson Databind 2.12.7.2 als einzige JSON-Testbibliothek beider Plattformen (Abschnitt 7).
- [ ] Pfadmuster für AM-R04 in Abschnitt 5 einschließlich `**/upgrade/**`, `custom-sql`, `service*.properties` und der
      ivy- und build-Dateien von 6.2.5, zur Übernahme durch G4-L; die Muster bleiben vorläufig, bis P00 sie am Projekt bestätigt.
- [ ] Genau eine Liferay-Instanz und ein Mandant: `email` global eindeutig, `BH_Setting` mit einer Zeile (2.5). Alternative
      wären Schlüssel mit `companyId`.

### Für P00 (beide Plattformen)

- [ ] Bundles aus SourceForge laden und starten; Speicher und Startzeit messen (`docs/06-spec-architektur.md`, „Risiken“).
- [ ] Erzeugte `tables.sql` beider Plattformen gegen Abschnitt 2.3 vergleichen (Namen, Typen, `active_`, `TEXT` ab
      4.000 Zeichen).
- [ ] Skript aus 2.6 als Upgrade-Schritt ausführen; Gegenprobe: direkter SQL-Schreibversuch auf `BH_StatusChange` scheitert
      mit `BH803`.
- [ ] `-Duser.timezone=GMT` und UTC in der JDBC-Sitzung nachweisen, auch mit `TZ=Europe/Berlin` (2.2).
- [ ] Liferay 6.2.5 und 7.2 mit PostgreSQL 16 und neuem JDBC-Treiber (4.5).
- [ ] Maven-Auflösung ohne Liferay-Nexus (Plugins SDK/Ivy, Workspace/Gradle) (4.3).
- [ ] Zeitplan des Schedulers in Europe/Berlin, Nachholen nach Neustart (3.2).
- [ ] Sitzung höchstens 8 Stunden mit Bordmitteln oder eigener Prüfung (2.5).
- [ ] Testschnittstelle nur bei `bh.betrieb=test` (3.2, Abschnitt 5).

### Aus `docs/06-spec-architektur.md` („Offene Punkte“, „Risiken“) mit Stand nach dieser Prüfung

| Punkt | Stand 15.10.2026 |
| --- | --- |
| Bezugsquelle 6.2.5 CE GA6 und passende Java-Version | Bezugsquelle SourceForge, erreichbar (4.1); Java 8 aus Ubuntu-Paketen beziehbar, Java 7 nicht; offizielle Matrix für 6.2 nicht gefunden → P00 |
| Bundles, Java 8/11 und Bezugsquellen in der Cloud-Sitzung erreichbar | SourceForge, Maven Central und Ubuntu-Archiv ja; Liferay-CDN, Liferay-Nexus, Adoptium, Azul, Elastic nein (4.6) |
| OIDC auf 7.2 CE optional | Modul steht in `release.portal.bom` 7.2.1; Nutzbarkeit in CE → Profil 7.2, P00 |
| Umfang des Dunkelmodus auf 6.2.5 | unverändert offen → Profil 6.2.5 |
| Laufzeit von 6.2.5 (Java, Tomcat 7, Docker-Image) | Tomcat-Bundle bestätigt; Docker-Image `liferay/portal:6.2.5-ga6` existiert (nur CI) |
| Suchdienst von 7.2 | eingebettet nur für Entwicklung und Tests zulässig (4.4) |
| Speicher und Laufzeit auf dem Standard-Runner | ungeprüft → P00 misst |
| Kein Herstellersupport für 6.2 und 7.2 | unverändert: nur Demo und Übung, kein Produktivbetrieb; gilt für beide Plattformen und steht je Profil in „7. Fallstricke und Grenzen“ |
| Öffentliches Repository | unverändert: nur Testdaten, Demo-Zugänge nur als Platzhalter, keine Geheimnisse in `portal-ext.properties` → P00 und `docs/ci-richtlinie.md` |
| Oberfläche auf 6.2 (AlloyUI, Bootstrap 2) | unverändert offen → Profil 6.2.5, UI-AK einzeln bewerten |
| Umfang einer kompletten Liferay-App | diese Datei verkleinert die Profile (Schema und Bausteine gemeinsam); Aufteilung in Arbeitspakete → Playbooks |
| Abweichende Plattformmittel verändern Verhalten unbemerkt | gleiche Prüffälle, Abweichungen nur unter „Bitte bestätigen“; neu erkannt: ModelListener allein und Löschen über Service Builder (2.4, 2.6) → Profile |
| Upgrade-Pfad 6.2 → 7.2 | Upgrade-Werkzeug liegt im Tools-Archiv von 7.2.1 (4.1); ob 6.2 direkt auf 7.2 geht, nicht belegt → U00 |
| Liferay-spezifische Teile von AM-R04 (`docs/07-spec-automatisches-mergen.md`) | Vorschlag in Abschnitt 5, 6 und 7 → G4-L |

### Hinweis für KE-S01

JDK und Liferay-Bundle kommen erst in P00 ins Startskript `.claude/hooks/session-start.sh`, nicht in G4. G4 lädt und
installiert nichts.

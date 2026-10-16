# Optional: Datenübernahme aus der TypeScript-App nach Liferay

Zusatz-Playbook, gilt für `liferay-625/` und `liferay-72/` · Profile `profile/liferay-gemeinsam.md` (Abschnitt 2,
Schema), `profile/liferay-625.md`, `profile/liferay-72.md` · Stand: 16.10.2026 (Etappe G4, Paket L) · Status:
**Entwurf zur Freigabe** · @Chris

Übernimmt Personen, Berichte und Historie aus einer laufenden TypeScript-App in eine fertige Liferay-Umsetzung (nach P10
der Plattform). Optional heißt: Die Steuerung vergibt es nur auf ausdrücklichen Auftrag von Chris; keine Reihe hängt
davon ab. In diesem Repository gibt es **nur Testdaten** (Anna, Bernd, Clara, Dora, Emil aus
`specs/pruefung/testdaten.json` und dem Seed); echte Personendaten werden nie übernommen, nie committet und nie in Logs
oder Artefakte geschrieben.

## 1. Ziel und Fertig-Kriterium

Fertig, wenn auf der Zielplattform (6.2.5 oder 7.2):

1. Alle Personen der TypeScript-App in `BH_Person` stehen (E-Mail, Name, Rolle, aktiv, Ausbilder, Ausbildungszeitraum,
   Kanäle, Darstellung), alle noch **ohne** `userId`; die Bindung an das Liferay-Konto entsteht beim ersten Login über die
   bestätigte E-Mail (M02-R07, M02-R08, Schritt 9).
2. Alle Berichte mit ihren Tagen in `BH_WeeklyReport` und `BH_ReportDay` stehen, mit Status und Versionsstand wie in der
   Quelle; `BH_Setting` trägt das Bundesland der Quelle.
3. Alle Statuswechsel und Kommentare in `BH_StatusChange` und `BH_Comment` stehen, mit unveränderten Zeitpunkten, Akteuren,
   Prüfrunden und Texten und in derselben Reihenfolge (M06-R02, M06-R03). Die Übernahme **fügt nur ein**; sie ändert oder
   löscht nie einen Historieneintrag (AK-803) und nie einen Tag eines eingereichten oder freigegebenen Berichts (AK-505).
4. Der Abgleich aus Schritt 10 meldet keinen Unterschied, die Prüfungen aus Schritt 11 (Schreibschutz, Zeitzone,
   Anmeldung) sind grün, und jede Gegenprobe aus Schritt 12 war einmal rot.
5. Keine Schemaänderung: Die Übernahme nutzt nur die Tabellen aus dem gemeinsamen Profil, Abschnitt 2.3, und das Skript
   „Schutz in der Datenhaltung“ (Abschnitt 2.6) unverändert.

Fach-AK, die gelten bleiben (nur zitiert, kein neues Kriterium): AK-505, AK-803, AK-102, AK-201. Nachweis der Historie über
die Daten-Fälle AK-803-01 bis AK-803-05 auf der Zielplattform (nach der Übernahme unverändert grün).

## 2. Voraussetzungen

- Die Reihe der Zielplattform ist bis P10 abgenommen; P02, P05 und P06 sind die fachlichen Grundlagen (Personen und
  Zugang, Status, Historie).
- Freigabe von Chris für die Übernahme und für die Punkte unter „Bitte bestätigen“ dieses Playbooks.
- Quelle: die TypeScript-App mit PostgreSQL (Datenbank `berichtsheft`), Zugriff nur lesend.
- Ziel: eine frisch eingerichtete Liferay-Instanz mit leeren App-Tabellen, Skript „Schutz in der Datenhaltung“ ausgeführt
  (Trigger vorhanden, Prüfung im Katalog `pg_trigger`), Uhr nicht gestellt.
- Sicherung der Zieldatenbank vor der Übernahme (`pg_dump`), Rücksprung durch Einspielen dieser Sicherung (Schritt 3).
  Einzelnes Löschen übernommener Berichte ist kein Rücksprung: Die Trigger `weekly_report_delete_guard` und die
  Historien-Trigger weisen es ab, und das ist gewollt.

## 3. Eingaben

- `profile/liferay-gemeinsam.md`, Abschnitt 2 (2.1 Grundsätze, 2.2 Datum und Zeit, 2.3 Tabellen, 2.4 Versionsspalte,
  2.5 Was nicht übernommen wird, 2.6 Schutz in der Datenhaltung) und Abschnitt 3.2 (Uhr, `bh.betrieb`).
- Profil 6.2.5, Abschnitte 2.1 und 3; Profil 7.2, Abschnitte 2 und 3 (Ort der Services, Transaktionen).
- Quelle des Schemas: `prisma/schema.prisma` und die Migrationen unter `prisma/migrations/`.
- Fach-Specs: `specs/M02-personen-und-zugang.md` (M02-R07, M02-R08), `specs/M05-status-und-pruefung.md` (AK-505, AK-508),
  `specs/M06-historie.md` (M06-R02, M06-R03, AK-803).
- `specs/pruefung/testdaten.json` (Personen mit Konto-ID als Zeichenkette, `angelegt` ja oder nein).
- Verbindung zur Datenbank der Quelle nur über `createPrismaClient` (`src/lib/db.ts`), damit Zeitpunkte in UTC gelesen
  werden (`CLAUDE.md`).

## 4. Weg A: aus dem Quellcode

Nicht anwendbar als Übersetzung: Die TypeScript-App hat keine Übernahme. Aus ihr stammen nur die Abbildung der Felder
(`prisma/schema.prisma` → gemeinsames Profil, Abschnitt 2.3) und die Lesewege über Prisma. Das ist Teil von Weg B.

## 5. Weg B: aus der Spec

Zwei getrennte Teile mit einer Datei dazwischen:

1. **Ausfuhr** (TypeScript-Seite, nur lesend): ein Skript in einem neuen Ordner scripts/uebernahme schreibt alle
   übernommenen Daten in eine JSON-Datei außerhalb des Repositorys. Natürliche Schlüssel statt UUIDs: Person über `email`,
   Bericht über (`email` des Azubis, `isoYear`, `isoWeek`), Tag über `dayDate`, Statuswechsel über die Reihenfolge, Kommentar
   über Bericht, Prüfrunde, Tag und Zeitpunkt.
2. **Einfuhr** (Liferay-Seite): ein Service `UebernahmeLocalService` im Service-Modul der Plattform
   (6.2.5 `bh-portlet`, Paket `de.berichtsheft.uebernahme`; 7.2 `bh/bh-service` bzw. eigenes Modul `bh-uebernahme`), der die
   Datei liest und je Person bzw. je Bericht eine **eigene Transaktion** öffnet. Aufruf nur durch den Liferay-Admin: auf 7.2
   ein Gogo-Befehl `bh:uebernahme <datei>`, auf 6.2.5 ein Aufruf aus der Skript-Konsole der Server-Verwaltung. Kein Aufruf aus
   der Oberfläche, keine Freigabe als Webdienst (`remote-service="false"`).
3. **Abgleich**: dieselbe Ausfuhr-Form aus der Liferay-Datenbank und ein Vergleich beider Dateien (Schritt 10).

Abbildung der Felder (gemeinsames Profil, Abschnitt 2.3):

| Quelle (Prisma) | Ziel | Regel |
| --- | --- | --- |
| `Person.id` (UUID) | `personId` (long aus dem Liferay-Zähler) | neu vergeben; Zuordnung nur im Speicher und im Protokoll, keine Spalte (keine Schemaänderung) |
| `Person.accountId` (Konto-ID, Zeichenkette) | – (`userId` bleibt leer) | **als String** ausführen und im Protokoll führen, nie in eine Zahl wandeln; nicht als `userId` übernehmen (gemeinsames Profil, 2.5) |
| `Person.email`, `name`, `role`, `active`, `theme` | gleichnamig, `active` → Spalte `active_` | E-Mail klein (CHECK `person_email_normalized`) |
| `Person.trainerId` | `trainerId` | über die E-Mail des Ausbilders aufgelöst; Ausbilder vor Azubis anlegen |
| `Person.trainingStart`, `trainingEnd` (`@db.Date`) | `String(10)` `JJJJ-MM-TT` | aus der UTC-Darstellung (`toISOString().slice(0, 10)`), nie über die Ortszeit |
| `Person.channels` (Liste) | `channelEmail`, `channelTeams`, `channelApp` | je Kanal ja oder nein; leere Liste erlaubt |
| `Setting.federalState` | `BH_Setting.federalState` | die eine Zeile (`settingId` = 1) |
| `WeeklyReport` | `BH_WeeklyReport` | `status` und `version` unverändert (AK-508); `traineeId` über die E-Mail |
| `ReportDay.date` | `dayDate` | wie Kalendertage oben |
| `ReportDay.dayType`, `activities`, `outsideTraining`, `holidayPreset` | gleichnamig | unverändert |
| `StatusChange` | `BH_StatusChange` | `seq` je Bericht neu von 1 an, in der Reihenfolge des globalen `seq` der Quelle (gemeinsames Profil, 2.3); `createdAt` unverändert |
| `Comment.text`, `dayId` | `commentText`, `reportDayId` | Tag über `dayDate` desselben Berichts |
| `createdAt`, `updatedAt` | gleichnamig, `TIMESTAMP` in UTC | **aus der Quelle**, nicht aus der Uhr: Die Zeitpunkte der Historie sind Teil der Historie (M06-R03) |
| `Notification`, `TeamsDevMessage`, `ReminderRun` | – | nicht übernommen, siehe „Bitte bestätigen“ |

## 6. Empfehlung

**Weg B**, mit Ausfuhr und Einfuhr als getrennte Schritte. Die Datei dazwischen ist der Prüfgegenstand: Sie lässt sich
lesen, abgleichen und für die Gegenproben gezielt verändern. Direktes SQL von Datenbank zu Datenbank scheidet aus, weil es
am Liferay-Zähler (`CounterLocalService`) und an den Caches der Persistenz vorbeigeht.

## 7. Schritte

1. **Bestand der Quelle zählen.** Über `createPrismaClient` je Tabelle zählen: `person`, `weekly_report`, `report_day`,
   `status_change`, `comment`. Prüfschritt: Zahlen notiert; mit dem Seed sind es Anna, Bernd und Clara (Dora und Emil haben
   `angelegt: false` und stehen nicht in der Quelle).
2. **Ziel prüfen.** App-Tabellen leer, Trigger aus 2.6 vorhanden (`status_change_no_update`, `status_change_no_delete`,
   `comment_no_update`, `comment_no_delete`, `weekly_report_delete_guard`, `report_day_locked`), JVM mit
   `-Duser.timezone=GMT`, `bh.betrieb` wie für den Zielbetrieb. Prüfschritt: Abfrage auf `pg_trigger` listet alle sechs.
3. **Sicherung.** `pg_dump` der Zieldatenbank vor der ersten Einfuhr; Rücksprung einmal in einer Wegwerf-Datenbank
   einspielen. Prüfschritt: eingespielte Sicherung startet, App-Tabellen leer.
4. **Ausfuhr bauen** (TypeScript, nur lesend). Liest über `createPrismaClient`, schreibt eine Datei mit `format`
   („berichtsheft-uebernahme“), `version` (1), `bundesland`, `personen`, `berichte` (je Bericht `tage`, `statuswechsel` nach
   `seq` sortiert, `kommentare` nach `createdAt` sortiert). Zeitpunkte als ISO 8601 mit `Z`, Kalendertage als `JJJJ-MM-TT`,
   die Konto-ID als JSON-Zeichenkette. Ein Unit-Test mit den Testdaten beginnt mit „Übernahme“ und prüft genau diese
   Formen. Prüfschritt: Ausfuhr mit `TZ=Europe/Berlin` und mit `TZ=UTC` ergibt dieselbe Datei.
5. **Einfuhr bauen** (Liferay). `UebernahmeLocalService.uebernehmePerson(…)` und `uebernehmeBericht(…)` je mit eigener
   Transaktion; jede fachliche Ablehnung ist ein **Ergebnis** mit festem Grund, keine Ausnahme:
   `schon-vorhanden`, `ausbilder-fehlt`, `kalendertag-ungueltig`, `tagesart-unbekannt`, `status-unbekannt`,
   `person-unbekannt`. Grund: Eine `PortalException` rollt die ganze Transaktion zurück; bei einer Sammel-Transaktion gingen
   übernommene Tage und Historie anderer Berichte mit verloren (Profil 7.2, Abschnitt 3, „Transaktion und
   Gleichzeitigkeit“). Ausnahmen bleiben technischen Fehlern vorbehalten (Datenbank weg); sie brechen nur den einen Bericht
   ab. Prüfschritt: JUnit-Test mit einem Bericht mit unbekannter Tagesart liefert `tagesart-unbekannt`, die übrigen
   Berichte der Datei stehen in der Datenbank.
6. **Reihenfolge im Bericht.** Erst `BH_WeeklyReport` mit dem Status der Quelle, dann die Tage (Einfügen ist erlaubt;
   `report_day_locked` weist nur das Ändern ab), dann die Statuswechsel in Quell-Reihenfolge mit `seq` 1, 2, …, dann die
   Kommentare. Kein späteres Ändern eines Tags oder des Status: Wer erst als Entwurf anlegt und danach den Status setzt,
   ändert einen Bericht ohne passende Historie. Prüfschritt: Der Service ruft für Tage, Statuswechsel und Kommentare nur
   `add…`, nie `update…`; ein Test sucht im Quelltext des Pakets nach `update` und findet nichts außer `BH_Setting`.
7. **Wiederaufnahme ohne Doppel.** Vor jedem Bericht prüft die Einfuhr den natürlichen Schlüssel (Azubi, `isoYear`,
   `isoWeek`; eindeutig nach gemeinsamem Profil, 2.3); vorhanden heißt `schon-vorhanden`, der Bericht wird übersprungen.
   Weil jeder Bericht in einer Transaktion steht, ist ein vorhandener Bericht vollständig. Personen ebenso über die E-Mail.
   Prüfschritt: zweite Einfuhr derselben Datei meldet für alles `schon-vorhanden` und ändert keine Zeile (Zählung wie
   Schritt 1).
8. **Einfuhr ausführen.** Zuerst Ausbilder, dann Azubis, dann `BH_Setting`, dann die Berichte. Protokoll als Datei außerhalb
   des Repositorys: je Eintrag natürlicher Schlüssel, Ergebnis und Grund, dazu die Konto-ID der Quelle als Zeichenkette.
   Prüfschritt: Protokoll ohne Ablehnung; Zählung im Ziel gleich Schritt 1.
9. **Konten zuordnen.** Je übernommener Person entsteht der Liferay-Benutzer mit derselben E-Mail nach der Entscheidung aus
   P00 bzw. P02 (App legt an oder Admin legt an; gemeinsames Profil, 2.5), mit den Platzhalter-Zugangsdaten der Testperson.
   `BH_Person.userId` bleibt leer, bis die Person sich zum ersten Mal anmeldet; dann bindet die Login-Aktion bedingt
   (`WHERE userId IS NULL AND active_`). Die Fachlogik vergleicht Konto-IDs als Zeichenkette (`String.valueOf(userId)`,
   P02 der Plattform); die Konto-ID der TypeScript-App wird nie als Liferay-Konto ausgelegt.
   **Hinweis, nicht hier zu lösen:** Die Code-Landkarte (`specs/code-landkarte.md`, Abschnitt M02) nennt `matchLogin()` auf
   Liferay „ersetzt durch Bordmittel“, die Profile (Profil 7.2, Abschnitt 3, Zeile „Binden beim ersten Login“; Profil
   6.2.5, Abschnitt 3, Zeile „Anmeldung“) und P02 beider Plattformen rufen die Fachlogik der Zuordnung in der Login-Aktion
   weiter auf. Für die Übernahme gilt das Profil; die Abweichung meldet
   die Steuerung an Chris. Prüfschritt: nach der Einfuhr `SELECT count(*) FROM BH_Person WHERE userId IS NOT NULL` ergibt 0.
10. **Abgleich.** Ausfuhr aus dem Ziel in dieselbe Form wie Schritt 4 (natürliche Schlüssel, `seq` je Bericht in Reihenfolge
    statt globaler Zahl, Zeitpunkte in UTC) und Vergleich mit der Ausfuhr der Quelle, Feld für Feld. Prüfschritt: kein
    Unterschied; die Konto-ID steht nur im Protokoll, nicht im Vergleich.
11. **Prüfungen auf dem Ziel.**
    - **Historie unveränderlich (AK-803):** direktes SQL `UPDATE` auf einen übernommenen Eintrag in `BH_StatusChange` und
      `DELETE` auf einen in `BH_Comment` scheitern mit SQLSTATE `BH803`.
    - **Schreibschutz (AK-505):** direktes SQL `UPDATE` auf einen Tag eines übernommenen eingereichten Berichts scheitert
      (`report_day_locked`, SQLSTATE `P0001`).
    - **Zeitzone:** Portal mit `TZ=Europe/Berlin` neu starten, Abgleich aus Schritt 10 wiederholen, kein Unterschied; die
      Historie zeigt dieselben Uhrzeiten in Berliner Zeit wie die TypeScript-App.
    - **Anmeldung:** Anna meldet sich an und sieht ihre Berichte mit Historie (danach ist ihr `userId` gesetzt); Bernd sieht
      die Prüfliste; Dora hat kein Konto in der App und bekommt „Kein Zugang“ (AK-102); Emil ist nicht übernommen und
      entsteht erst, wenn der Admin ihn anlegt (AK-201).
    - **Daten-Fälle:** AK-803-01 bis AK-803-05 laufen auf der Zielplattform weiter grün (Prüf-Adapter in seiner eigenen
      Testdatenbank).
    Prüfschritt: alle Punkte mit Befehl und Ergebnis im PR.
12. **Gegenproben** (je einmal rot, danach zurücknehmen):
    - **Fehlender Statuswechsel:** einen Statuswechsel aus der Ausfuhrdatei entfernen → der Abgleich aus Schritt 10 meldet
      genau diesen Bericht und diese Stelle.
    - **Ablehnung als Ausnahme:** im Service `tagesart-unbekannt` testweise als `PortalException` werfen und alle Berichte in
      einer Transaktion einführen → die übrigen Berichte fehlen im Ziel, der Test aus Schritt 5 wird rot.
    - **Zeitzone:** Portal ohne `-Duser.timezone=GMT` mit `TZ=Europe/Berlin` → der Abgleich meldet verschobene Zeitpunkte.
    - **Schutz wirkt:** Trigger `status_change_no_update` in der Wegwerf-Datenbank entfernen → der `UPDATE` aus Schritt 11
      gelingt; Trigger wieder anlegen (Skript aus 2.6), `UPDATE` scheitert wieder.
    Prüfschritt: vier rote Läufe im PR notiert, danach alles grün.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| Unit-Test der Ausfuhr (Vitest, Name beginnt mit „Übernahme“) | grün, mit `TZ=Europe/Berlin` und `TZ=UTC` gleiche Datei |
| JUnit-Tests des Übernahme-Service der Plattform | grün; Ablehnungen als Ergebnis mit festem Grund |
| Einfuhr zweimal mit derselben Datei | zweiter Lauf nur `schon-vorhanden`, Zählung unverändert |
| Abgleich Quelle ↔ Ziel (Schritt 10) | kein Unterschied |
| direktes SQL auf `BH_StatusChange` und `BH_Comment` | SQLSTATE `BH803` |
| direktes SQL auf einen Tag eines eingereichten Berichts | SQLSTATE `P0001` |
| Daten-Fälle AK-803-01 bis AK-803-05 über den Prüf-Adapter | grün |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

## 9. Abschluss

- Ein Branch je Zielplattform, z. B. `claude/l72-uebernahme`; Commit-Beschreibung auf Deutsch, z. B. „L72: Datenübernahme aus
  der TypeScript-App“. Ausfuhr- und Protokolldateien nie committen, auch nicht mit Testdaten.
- PR-Beschreibung: Zählungen vorher und nachher, Abgleich, Prüfungen aus Schritt 11, Gegenproben aus Schritt 12, „Bitte
  bestätigen“. Änderungsklassen L (Ausfuhr unter `scripts/`) und L62 bzw. L72; der Service liegt unter `service/impl/**`
  bzw. im Service-Modul und ist geschützt (AM-R04, gemeinsames Profil, Abschnitt 5), Chris mergt.
- Bericht an die Steuerung per `send_message`; den Eintrag in `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Übernommene Tage eines Berichts fehlen nach einer Ablehnung | Ablehnung als Ergebnis zurückgeben, nicht als `PortalException`; eine Transaktion je Bericht (Schritt 5) |
| `report_day_locked` weist die Einfuhr ab | Tage nach dem Bericht einfügen, nie ändern; nicht erst Entwurf anlegen und dann den Status setzen (Schritt 6) |
| `BH803` bei der Einfuhr | die Einfuhr ändert einen Historieneintrag (z. B. `seq` nachträglich gesetzt); `seq` vor dem Einfügen vergeben |
| Kalendertag um einen Tag verschoben | Kalendertag aus der UTC-Darstellung bilden, Quelle über `createPrismaClient` lesen |
| Zeitpunkte um eine oder zwei Stunden verschoben | JVM mit `-Duser.timezone=GMT`, JDBC-Sitzung in UTC (gemeinsames Profil, 2.2) |
| Konto-ID als Zahl gelesen oder als `userId` gesetzt | Konto-ID bleibt Zeichenkette und nur im Protokoll; `userId` entsteht beim ersten Login (Schritt 9) |
| Doppelte Berichte nach Abbruch und Neustart | natürlichen Schlüssel prüfen, `schon-vorhanden` (Schritt 7) |
| Primärschlüssel-Konflikt nach der Einfuhr | Schlüssel nur aus `CounterLocalService`, nie per SQL vergeben |
| Rücksprung durch Löschen der Berichte scheitert | gewollt (`weekly_report_delete_guard`, Historien-Trigger); Sicherung aus Schritt 3 einspielen |

## Bitte bestätigen

- [ ] Benachrichtigungen (`Notification`, `TeamsDevMessage`) und Erinnerungsläufe (`ReminderRun`) werden nicht übernommen:
      Der Ausgangskorb würde offene Nachrichten erneut senden, und die Glocke beginnt auf Liferay leer. Alternative: nur
      gelesene App-Nachrichten übernehmen.
- [ ] Zeitpunkte `createdAt` und `updatedAt` kommen aus der Quelle, nicht aus der Uhr (M06-R03: Die Zeitpunkte der Historie
      sind Teil der Historie); die Uhr der Zielplattform bleibt nur für „jetzt“ zuständig.
- [ ] `seq` der Statuswechsel wird je Bericht neu von 1 an vergeben (gemeinsames Profil, 2.3); die globale Zahl der Quelle
      entfällt, die Reihenfolge bleibt.
- [ ] Die Konto-ID der TypeScript-App wird nicht übernommen; jede Person bindet beim ersten Liferay-Login neu über die
      bestätigte E-Mail (M02-R07, M02-R08).
- [ ] Aufruf der Einfuhr nur durch den Liferay-Admin (Gogo-Befehl auf 7.2, Skript-Konsole auf 6.2.5), nicht aus der
      Oberfläche.
- [ ] Hinweis an die Steuerung: Code-Landkarte M02 (`matchLogin()` „ersetzt durch Bordmittel“) passt nicht zu den Profilen,
      die die Zuordnung als Fachlogik in der Login-Aktion aufrufen (Schritt 9); nicht in diesem Playbook zu ändern.

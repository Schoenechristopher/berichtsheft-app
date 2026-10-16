# P06 Historie (M06)

Reihe `playbooks/liferay-72/` · Plattform Liferay Portal 7.2 CE · Profil `profile/liferay-72.md` (baut auf
`profile/liferay-gemeinsam.md` auf) · Stand: 16.10.2026 (Etappe G4, Paket H) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Statuswechsel und Kommentare eines Berichts erscheinen als Historie nach Prüfrunde (neueste zuerst) und sind technisch
unveränderlich: PostgreSQL-Trigger mit dem festen Code `BH803` weisen Ändern und Löschen auch an der Fachlogik vorbei ab,
`StatusChangeModelListener` und `CommentModelListener` weisen es in der App früh ab; nur das endgültige Löschen der Person
entfernt die Einträge per Kaskade. Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M06.json` über die Prüf-Adapter grün sind (3 AK-IDs; 5 Fachlogik- und 8 Daten-Fälle);
2. die plattformeigenen Tests `HistoryProtectionTest` und der Zeitzonen-Test auf `BH_StatusChange` grün sind;
3. die Prüffälle von M05 und M02 weiter grün sind (die Historien-Listener und das erweiterte Skript dürfen Einreichen,
   Statuswechsel und Löschen nicht brechen);
4. jede Gegenprobe aus Schritt 10 die dort benannten Prüffälle bzw. Tests rot gemacht hat, darunter je eine wirksame
   Gegenprobe zu AK-505 (Schreibschutz der Tage) und AK-508, und zurückgenommen ist.

Nachweis AK-803: `profile/liferay-72.md`, Abschnitt „Nachweis AK-505 und AK-508“, und gemeinsam 2.6. Keine Schemaänderung
außer den Triggern und Fremdschlüsseln der Historie im Skript „Schutz in der Datenhaltung“.

## 2. Voraussetzungen

- L72-P00 bis L72-P05 abgenommen (`BH_StatusChange` und `BH_Comment` werden seit P05 geschrieben, `report_day_locked` steht).
- Profil 7.2, Abschnitte 3 (Historie und Schreibschutz), 4 (Daten-Adapter, plattformeigene Tests, Zeitzone), 7 (`ModelListener`)
  und „Nachweis AK-505 und AK-508“; gemeinsam 2.2 (UTC), 2.4 (Löschen eines Azubis, Cache) und 2.6.
- P00 hat die Signatur von `BaseModelListener.onBeforeUpdate`/`onBeforeRemove` in 7.2 bestätigt.

## 3. Eingaben

- Fach-Spec: `specs/M06-historie.md` (Regeln M06-R01 bis M06-R11, Abschnitt 5, Abschnitt 8).
- Prüffälle: `specs/pruefung/M06.json`; Aktionen der Daten-Fälle (`historie_lesen`, `historie_aendern`, `historie_loeschen`,
  `bericht_loeschen`, `person_loeschen`): `specs/pruefung/format.md`.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M06 Historie“.
- Gegenstücke der Referenz: `tests/db/status-change.test.ts` (Abweisung mit festem Code), `tests/db/timezone.test.ts`.

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag und nur für Fachlogik und Trigger: `src/domain/report-history.ts` (`groupHistory()`,
`changeLabel()`) lässt sich 1:1 nach Java übersetzen; die Trigger der Referenz (Suche nach `status_change_immutable`,
`comment_immutable`, `weekly_report_delete_guard` in `prisma/migrations/`) gehen wortgleich ins Skript, nur mit den Tabellen-
und Spaltennamen aus gemeinsam 2.3. Die Fehlererkennung (`src/lib/history-guard.ts`) ist Prisma-eigen und wird nach Profil neu
gebaut.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Trigger mit festem Code und Kaskaden-Ausnahme, (2) `ModelListener` der Historie, (3) Erkennen der Abweisung
am SQLSTATE, (4) Gruppierung und Bezeichnungen als reine Funktionen, (5) Laden der Historie, (6) Anzeige, (7) Löschen der Person
und fremde Historie, (8) Daten-Adapter für Lesen und Schreibversuche, (9) Tests und Gegenproben. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Bewertung auf 7.2 |
| --- | --- | --- | --- |
| AK-801 | Jeder Bericht hat eine Historie aller Statuswechsel (Einreichen, Zurückziehen, Freigabe, Ablehnung, Rücknahme) mit Datum, Uhrzeit, Person und neuem Status. | 4 (3 fachlogik, 1 daten) | gleichwertig; Zeitpunkte als `TIMESTAMP` in UTC, Anzeige in Europe/Berlin |
| AK-802 | Kommentare und Begründungen früherer Runden bleiben erhalten und sind ihrer Runde zugeordnet. | 4 (2 fachlogik, 2 daten) | gleichwertig |
| AK-803 | Historieneinträge kann niemand bearbeiten oder löschen; nur das endgültige Löschen der Person entfernt sie. Gilt für Statuswechsel und Kommentare; die Datenhaltung weist ihr Ändern und Löschen ab. | 5 (5 daten) | gleichwertig; Trigger plus `ModelListener` (gemeinsam 2.6) |

## 6. Empfehlung

**Weg B.** Die Anforderungen (Abschnitt 8 der Spec) sind eindeutig, das Skript ist kurz und für beide Liferay-Plattformen
wortgleich. Die Liferay-eigene Arbeit liegt in den Listenern (welcher Hook) und im Löschen der Person (nur Kaskade, danach
Caches); dafür gibt es keine Vorlage im Quellcode.

## 7. Schritte

1. **Branch** `claude/l72-p06-historie`; Spec und Prüffälle lesen. Prüfschritt: AK-Tabelle im PR-Entwurf.
2. **Trigger** im Skript „Schutz in der Datenhaltung“ (gemeinsam 2.6; M06-R08 bis M06-R10, AK-803), wortgleich mit 6.2.5:
   - `status_change_no_update` und `status_change_no_delete` auf `BH_StatusChange`, `comment_no_update` und `comment_no_delete`
     auf `BH_Comment`: Ändern immer abweisen; Löschen nur als **Kaskade** erlauben (`pg_trigger_depth() > 1` und der Bericht
     existiert nicht mehr);
   - `weekly_report_delete_guard` (`BEFORE DELETE` auf `BH_WeeklyReport`): Bericht mit Historie nicht einzeln löschen, solange
     der Azubi besteht (M06-R09);
   - jede Abweisung `RAISE EXCEPTION … USING ERRCODE = 'BH803'`.
   Danach Datenbank `berichtsheft_l72` neu anlegen und Bundle neu starten. Prüfschritt: direktes `UPDATE` und `DELETE` auf
   `BH_StatusChange` und `BH_Comment` scheitern mit `BH803`; `report_day_locked` aus P05 steht weiter in `pg_trigger`.
3. **`ModelListener` der Historie** (Profil 7.2, Nachweis AK-505, Punkt 3): `StatusChangeModelListener` und `CommentModelListener`
   (`extends BaseModelListener<…>`, `@Component(service = ModelListener.class)`, Paket `…model.listener`) weisen **nur** in
   `onBeforeUpdate` und `onBeforeRemove` ab, mit `ModelListenerException` und Ursache `HistoryImmutableException` (Grund
   `historie_unveraenderlich`). `onBeforeCreate` bleibt unberührt: P05 legt Einträge an. Prüfschritt:
   `HistoryProtectionTest.AK803_modelListenerWeistAendernUeberDiePersistenzAb` (`statusChangeLocalService.updateStatusChange(…)`
   scheitert, Daten unverändert).
4. **Abweisung erkennen.** `HistoryGuard.isHistoryImmutable(Throwable)` in `bh-service` durchsucht die Ursachenkette (Hibernate,
   `SystemException`, `PSQLException.getSQLState()`) nach `BH803` bzw. `HistoryImmutableException`; nie am Meldungstext
   (`specs/pruefung/format.md`, „Regeln für Adapter“). `report_day_locked` meldet weiter den allgemeinen Code `P0001` und wird
   nicht als `historie_unveraenderlich` gemeldet. Prüfschritt:
   `HistoryProtectionTest.AK803_datenhaltungWeistAendernUndLoeschenAb` (direktes `UPDATE` und `DELETE` per JDBC, SQLState
   `BH803`, erkannt als `historie_unveraenderlich`).
5. **Fachlogik** `de.berichtsheft.domain.history` in `bh-domain` (M06-R01 bis M06-R07; AK-801, AK-802): `HistoryChange`,
   `HistoryComment`, `HistoryRound`, `HistoryRules.group()` (nach Prüfrunde, neueste zuerst; Statuswechsel nach `seq`,
   Tageskommentare Mo–Fr), `changeLabel()` („Erneut eingereicht“, „Freigabe zurückgenommen“ …), `formatDateTime()` (Europe/Berlin,
   „07.10.2026, 14:05 Uhr“), `currentFeedback()` (Rückmeldung der letzten Ablehnung bzw. Rücknahme; AK-606, AK-703),
   `currentApproval()` (aktuell gültige Freigabe für Berichtsseite und PDF in P07). Prüfschritt: JUnit-Tests `AK801_…`, `AK802_…`.
6. **Laden** `WeeklyReportLocalServiceImpl.getHistory(long actorUserId, long weeklyReportId)`: prüft `canViewReport()`,
   liest Statuswechsel nach `seq`, Kommentare nach Runde und Zeitpunkt, mit Namen statt Personen-IDs; `getRejectionTexts()` aus
   P05 nutzt jetzt `currentFeedback()`. Prüfschritt: Daten-Fälle AK-801-04, AK-802-03, AK-802-04 grün.
7. **Löschen der Person und fremde Historie** (M06-R10, M02-R22; AK-206, AK-803): `PersonLocalServiceImpl.deletePerson` löscht nur
   die Zeile `BH_Person` (`DELETE FROM BH_Person WHERE personId = ?`), Berichte, Tage, Statuswechsel, Kommentare und Nachrichten
   entfernt **ausschließlich die Kaskade** der Datenbank; danach Entity- und Finder-Cache aller betroffenen Entities leeren
   (gemeinsam 2.4). `hasForeignHistory()` fragt jetzt `BH_StatusChange` und `BH_Comment` an fremden Berichten ab (Platzhalter aus
   P02 scharfstellen). Prüfschritt: Daten-Fall AK-803-05 grün; Fachlogik-Fälle AK-206-01 bis AK-206-07 weiter grün.
8. **Anzeige** in `bh-web`: Historie im Portlet der Berichtsseite, je Prüfrunde Statuswechsel und Kommentare, mit den festen
   Merkern `data-von`, `data-nach`, `data-person`, `data-zeitpunkt`. Gestaltung folgt in P09. Prüfschritt: Bericht mit drei Runden
   von Hand in Chromium; neueste Runde oben.
9. **Daten-Adapter und Zeitzone.** Testschnittstelle: `historie_lesen` über `getHistory`; die Schreibversuche `historie_aendern`,
   `historie_loeschen` und `bericht_loeschen` gehen **direkt per JDBC** an der Fachlogik und an Service Builder vorbei (damit die
   Trigger geprüft werden, nicht die Listener); `person_loeschen` über `deletePerson`. Eine Abweisung wird als
   `{ "fehler": "historie_unveraenderlich" }` gemeldet, erkannt mit `HistoryGuard`. Fachlogik-Adapter: `historieGruppieren`.
   Zeitzonen-Test aus P00 auf `BH_StatusChange` erweitern (`TZ=Europe/Berlin`, `-Duser.timezone=GMT`, Gegenstück zu
   `tests/db/timezone.test.ts`). Prüfschritt: Fälle von M06 in beiden Runnern grün; Zeitzonen-Test grün.
10. **Gegenproben** (je ein benannter Fehler, je ein roter Lauf, danach zurücknehmen und grün zeigen). F-P06-4 und F-P06-5 sind
    die Gegenproben zu AK-505 und AK-508: P06 ändert Listener und Skript, die beide im Weg von Speichern, Einreichen und
    Statuswechsel liegen.

    | Name | Absichtlich eingebauter Fehler | Wird rot | Bleibt grün (und warum) |
    | --- | --- | --- | --- |
    | F-P06-1 „Änderungsschutz der Historie fehlt“ (AK-803) | Trigger `status_change_no_update` in der Testdatenbank entfernen | AK-803-01 (der direkte Schreibversuch gelingt) und `HistoryProtectionTest.AK803_datenhaltungWeistAendernUndLoeschenAb` | `AK803_modelListener…` (der Listener hält über die Persistenz) |
    | F-P06-2 „Kaskade gesperrt“ (AK-803) | in `status_change_no_delete` die Ausnahme für die Kaskade (`pg_trigger_depth() > 1`) entfernen | AK-803-05 (das Löschen der Person scheitert mit `BH803`) | AK-803-02 |
    | F-P06-3 „Bericht einzeln löschbar“ (AK-803) | Trigger `weekly_report_delete_guard` entfernen | AK-803-04 (der Bericht ist weg, das erneute Einreichen scheitert) | AK-803-01, AK-803-02, AK-803-03 |
    | F-P06-4 „Schreibschutz der Tage überdreht“ (AK-505) | `ReportDayModelListener` weist wie die Historien-Listener ab, ohne den Status des Berichts zu prüfen | AK-505-02 (das Mitspeichern beim Einreichen scheitert) und AK-505-03 (die Tage bleiben nicht als Entwurf) | AK-505-05, AK-505-06, AK-505-07 (Fachlogik ohne Persistenz) |
    | F-P06-5 „Historien-Listener am falschen Hook“ (AK-508) | `StatusChangeModelListener` weist zusätzlich in `onBeforeCreate` ab | AK-508-01, AK-508-02, AK-508-03, AK-508-04, AK-508-05 (schon der erste Statuswechsel scheitert und wird zurückgerollt), dazu `ConcurrentTransitionTest.AK508_vonZweiGleichzeitigenAktionenGelingtGenauEine` (kein Erfolg statt genau einem) | AK-508-06 bis AK-508-11 (Fachlogik) |

    Prüfschritt: fünf rote Läufe mit den benannten Fällen im PR notiert, danach M02, M05 und M06 grün.
11. **Bau-Stand.** M06 eintragen und AK-408-07 freischalten (von P04 bis hierher zurückgestellt: Einreichen aus P05, Historie auf der
    Berichtsseite aus diesem Paket). Prüfschritt: AK-408-07 läuft grün, zurückgestellt bleiben nur AK-205-01 und AK-205-02 (P08). Prüfung nach Abschnitt 8.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M06` | 5 Fachlogik-Fälle grün |
| `./gradlew :modules:bh-test-integration:testIntegration --tests '*DatenPrueffaelleTest*' -Pbh.pruefung.modul=M06` | 8 Daten-Fälle grün |
| `./gradlew :modules:bh-test-integration:testIntegration --tests '*DatenPrueffaelleTest*' -Pbh.pruefung.modul=M05` | 36 Daten-Fälle weiter grün |
| `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M02` | Fälle zu AK-206 weiter grün |
| `./gradlew :modules:bh-test-integration:testIntegration --tests '*HistoryProtectionTest*' --tests '*ZeitzoneTest*' --tests '*ConcurrentTransitionTest*' --tests '*ReportDayProtectionTest*'` | grün |
| `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium --project=smartphone-375` | Ablauf-Fälle der gebauten Module grün |
| `./gradlew build formatSource` | grün, keine Änderungen |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

## 9. Abschluss

- Commit, z. B. „L72-P06: Historie (Trigger, ModelListener, nach Prüfrunde)“; vor dem Push `./gradlew build` und alle
  Prüf-Adapter von M02, M05 und M06 lokal grün.
- Draft-PR mit der AK-Tabelle (AK-801, AK-802, AK-803 mit Test und Prüffällen), dem Nachweis AK-803 (Verweis auf das Profil),
  der Tabelle der Gegenproben mit den roten Fällen und „Bitte bestätigen“. Geschützte Pfade: `**/sql/**`, `**/model/listener/**`,
  `**/upgrade/**`, `**/service/impl/**` (gemeinsam 5); Chris mergt.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Einreichen oder jeder Statuswechsel scheitert nach P06 | Historien-Listener weist in `onBeforeCreate` ab; nur `onBeforeUpdate` und `onBeforeRemove` |
| Löschen einer Person scheitert mit `BH803` | Kinder nie über Service Builder (`removeBy…`, `deleteStatusChange`) löschen; nur `BH_Person`, Kaskade der Datenbank |
| Nach dem Löschen der Person zeigt die App noch Berichte | Entity- und Finder-Cache aller betroffenen Entities leeren; Service Builder erfährt von der Kaskade nichts |
| Testschnittstelle kann den Bestand nicht leeren | erwartet: Trigger; nur über das Löschen der Personen zurücksetzen |
| Abweisung am Meldungstext erkannt | SQLState `BH803` bzw. `HistoryImmutableException` in der Ursachenkette lesen |
| Schreibversuch des Daten-Adapters wird vom Listener abgewiesen statt vom Trigger | `historie_aendern` und `historie_loeschen` per JDBC, nicht über die Persistenz; sonst prüft der Fall den Trigger nicht |
| Zeiten in der Historie verschoben | JVM mit `-Duser.timezone=GMT`, JDBC-Sitzung in UTC; Anzeige mit Europe/Berlin (gemeinsam 2.2) |
| Reihenfolge bei gleichem Zeitpunkt falsch | Statuswechsel nach `seq` je Bericht; Kommentare nach Runde und Zeitpunkt |
| Prüfrunde nachträglich berechnet | sie wird beim Schreiben bestimmt (`reviewRoundFor()`, P05), nie beim Lesen |

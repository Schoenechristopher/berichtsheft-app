# P06 Historie (M06)

Reihe `playbooks/liferay-625/` · Plattform Liferay Portal 6.2.5 CE GA6 · Profil `profile/liferay-625.md` (auf Grundlage
von `profile/liferay-gemeinsam.md`) · Stand: 16.10.2026 (Etappe G4, Paket G) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Statuswechsel und Kommentare eines Berichts erscheinen als Historie nach Prüfrunde (neueste zuerst) und sind technisch
unveränderlich: PostgreSQL-Trigger weisen Ändern und Löschen ab, auch an der Fachlogik vorbei; ein `ModelListener` weist
Schreibversuche über die Persistenz von Service Builder früh ab; nur das endgültige Löschen der Person entfernt die
Historie per Kaskade. Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M06.json` grün sind (3 AK-IDs; 5 Fachlogik- und 8 Daten-Fälle);
2. die eigenen Tests `AK803_TriggerDerHistorieTest` und `AK801_ZeitpunktUnabhaengigVonServerzeitTest` (`test/db/`),
   `AK803_ModelListenerTest` (`test/unit/`) und `AK803_ModelListenerAngemeldetTest` (`test/integration/`) grün sind
   (Profil 6.2.5, „Nachweis AK-505 und AK-508“, Zeilen „Datenhaltung: Historie“ und „App: Historie“);
3. die **Gegenprobe** aus Schritt 10 durchgeführt ist: jeder benannte Fehler macht die benannten Fälle bzw. Tests rot,
   darunter der Schutz der Historie aus dem Nachweis AK-505 und die Historie im selben Lauf wie der Statuswechsel aus
   dem Nachweis AK-508;
4. die Prüffälle von M05 weiterhin grün sind (die Trigger dürfen keinen Statuswechsel abweisen).

Schemaänderung: ja, nur im Skript „Schutz in der Datenhaltung“ (Trigger der Historie, gemeinsam 2.6), keine neue Spalte;
`StatusChange` und `Comment` legt P05 an.

## 2. Voraussetzungen

- P00 bis P05 der Reihe abgenommen; `BH_StatusChange` und `BH_Comment` werden seit P05 geschrieben (mit `seq` je
  Bericht und `reviewRound`).
- P00 hat Profil 6.2.5, „In P00 zu bestätigen“ Punkt 6 (`ModelListener` über `value.object.listener.*` in `service-ext.properties`) als „offen bis P06“
  vermerkt; P06 bestätigt ihn in Schritt 4.
- Profil 6.2.5, Abschnitte 3 („Historie unveränderlich“), 4.2 (Aktionen „an der Fachlogik vorbei“ mit direktem SQL), 7
  und „Nachweis AK-505 und AK-508“; gemeinsames Profil: 2.2 (UTC), 2.4 (Löschen nur per Kaskade), 2.6 (Trigger,
  `BH803`).

## 3. Eingaben

- Fach-Spec: `specs/M06-historie.md` (Regeln M06-R01 bis M06-R11, Abschnitt 5, Abschnitt 8 Anforderungen an die
  Plattform).
- Prüffälle: `specs/pruefung/M06.json`; Aktionen der Daten-Fälle (`historie_lesen`, `historie_aendern`,
  `historie_loeschen`, `bericht_loeschen`, `person_loeschen`): `specs/pruefung/format.md`.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M06 Historie“.
- Profil: `profile/liferay-625.md`, „Nachweis AK-505 und AK-508“; `profile/liferay-gemeinsam.md` 2.6 („Warum nicht nur
  ModelListener“).

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Übertragbar sind `src/domain/report-history.ts` (`groupHistory()`, `changeLabel()`,
`formatDateTime()`, `currentFeedback()`, `currentApproval()`) und die Trigger der TypeScript-Migrationen (per Suche nach
`status_change_immutable`, `comment_immutable`, `weekly_report_delete_guard` in den Migrationen); Namen und SQLSTATE
übernimmt das Skript wortgleich (gemeinsam 2.6). `src/lib/history-guard.ts` zeigt die Erkennung am SQLSTATE; auf 6.2.5
liegt der Code in der Ursachenkette einer `SystemException` bzw. `ORMException`. Belege zum Abgleich:
`src/domain/report-history.test.ts`, `tests/db/status-change.test.ts`, `tests/db/timezone.test.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Trigger mit festem Fehlercode, (2) Erkennung des Fehlergrunds, (3) `ModelListener`, (4)
Gruppierung und Bezeichnungen als reine Java-Klassen, (5) Laden der Historie, (6) Anzeige, (7) Zeitpunkte unabhängig von
der Serverzeit, (8) Daten-Adapter mit direktem SQL, (9) eigene Tests, (10) Gegenprobe. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-801 | Jeder Bericht hat eine Historie aller Statuswechsel (Einreichen, Zurückziehen, Freigabe, Ablehnung, Rücknahme) mit Datum, Uhrzeit, Person und neuem Status. | 4 (3 fachlogik, 1 daten): AK-801-01, AK-801-02, AK-801-03, AK-801-04 | `specs/pruefung/M06.json` |
| AK-802 | Kommentare und Begründungen früherer Runden bleiben erhalten und sind ihrer Runde zugeordnet. | 4 (2 fachlogik, 2 daten): AK-802-01, AK-802-02, AK-802-03, AK-802-04 | `specs/pruefung/M06.json` |
| AK-803 | Historieneinträge kann niemand bearbeiten oder löschen; nur das endgültige Löschen der Person entfernt sie. Gilt für Statuswechsel und Kommentare; die Datenhaltung weist ihr Ändern und Löschen ab. | 5 (5 daten): AK-803-01, AK-803-02, AK-803-03, AK-803-04, AK-803-05 | `specs/pruefung/M06.json` |

**Nachweis** (Profil 6.2.5, „Nachweis AK-505 und AK-508“): Die Zeile „Datenhaltung: Historie“ belegen AK-803-01 bis
AK-803-05 über die Testschnittstelle mit direktem SQL und `AK803_TriggerDerHistorieTest`; die Zeile „App: Historie“
belegen `AK803_ModelListenerTest` und `AK803_ModelListenerAngemeldetTest`. Die Historie entsteht in derselben
Transaktion wie der Statuswechsel (M06 Abschnitt 8, Nachweis AK-508); das prüfen die Daten-Fälle von AK-508 über ihre
erwartete `historie` und `kommentare`. Fremde Historie beim Löschen einer Person (AK-206) stellt Schritt 5 scharf.

## 6. Empfehlung

**Weg B.** Die Anforderungen (Abschnitt 8 der Spec) sind eindeutig, das Skript übernimmt die Trigger wortgleich. Die
Gefahr liegt in den Wegen um die Trigger herum: Löschen über Service Builder, ein Daten-Adapter über die Persistenz (dann
prüft er den `ModelListener` statt des Triggers) und ein abgemeldeter `ModelListener`. Die Gegenprobe in Schritt 10
deckt genau diese Wege ab. Weg A nur auf ausdrücklichen Auftrag.

## 7. Schritte

1. **Branch** `claude/l62-p06-historie`; Spec, Profil 6.2.5, Abschnitt 4.2 und Prüffälle lesen. Prüfschritt: AK-Tabelle im PR-Entwurf.
2. **Trigger** im Skript „Schutz in der Datenhaltung“ (gemeinsam 2.6; AK-803, M06-R08 bis M06-R10), Namen wie in der
   TypeScript-App:
   - `status_change_no_update` und `status_change_no_delete` auf `BH_StatusChange`, `comment_no_update` und
     `comment_no_delete` auf `BH_Comment`: Ändern immer abweisen; Löschen nur als **Kaskade** erlauben
     (`pg_trigger_depth() > 1` und der Bericht existiert nicht mehr);
   - `weekly_report_delete_guard` (`BEFORE DELETE` auf `BH_WeeklyReport`): Bericht mit Historie nicht einzeln löschen,
     solange der Azubi besteht (M06-R09);
   - jede Abweisung `RAISE EXCEPTION … USING ERRCODE = 'BH803'`.
   Das Skript läuft als `UpgradeSchutzDerDatenhaltung` nach dem Anlegen der Tabellen; `build.auto.upgrade=false` bleibt,
   sonst kopiert ein automatisches Upgrade die Tabellen und verliert die Trigger (Profil 6.2.5, Abschnitt 7). Prüfschritt:
   `AK803_TriggerDerHistorieTest` (Schritt 9) grün; die Daten-Fälle von M05 bleiben grün.
3. **Fehlergrund `de.berichtsheft.service.HistoryGuard`**: `isHistoryImmutable(Throwable)` geht die Ursachenkette durch
   und erkennt `java.sql.SQLException` mit SQLSTATE `BH803` oder eine `ModelListenerException` mit dem Grund
   `historie_unveraenderlich`; nie den Meldungstext (gemeinsam 2.6, „Fehlergrund“). Prüfschritt: Unit-Test mit einer
   verschachtelten Ausnahme, deren Meldungstext leer ist.
4. **`ModelListener`** (Profil 6.2.5, Abschnitt 3 „Historie unveränderlich“, „In P00 zu bestätigen“ 6). `StatusChangeListener` und
   `CommentListener` unter `de.berichtsheft.model.listener` (`BaseModelListener`): `onBeforeUpdate` und `onBeforeRemove`
   werfen `ModelListenerException` mit dem Grund `historie_unveraenderlich`; Anlegen geht durch. Angemeldet in
   `service-ext.properties` mit `value.object.listener.de.berichtsheft.model.StatusChange` und
   `value.object.listener.de.berichtsheft.model.Comment`. Die Kaskade beim Löschen einer Person läuft nur in der
   Datenbank; der Listener greift dort nicht (Profil 6.2.5, „Nachweis AK-505“). Prüfschritt: `AK803_ModelListenerTest` und
   `AK803_ModelListenerAngemeldetTest` (Schritt 9) grün; damit ist Profil 6.2.5, „In P00 zu bestätigen“ Punkt 6 bestätigt.
5. **Fachfunktionen `de.berichtsheft.domain.history.ReportHistory`** (Gegenstück zu `src/domain/report-history.ts`;
   M06-R01 bis M06-R07, AK-801, AK-802): `groupHistory()` (nach Prüfrunde, neueste zuerst; Statuswechsel nach `seq`,
   Kommentare Gesamtkommentar vor den Tagen Mo bis Fr), `changeLabel()` („Erneut eingereicht“, „Freigabe
   zurückgenommen“ …), `formatDateTime()` (Europe/Berlin über `java.time`, „07.10.2026, 14:05 Uhr“), `currentFeedback()`
   (AK-606, AK-703), `currentApproval()` (für P07). `getFeedback()` aus P05 nutzt jetzt `currentFeedback()`;
   `hasForeignHistory()` aus P02 fragt die Historie wirklich ab (`actorId` bzw. `authorId` in fremden Berichten, AK-206).
   Prüfschritt: Unit-Tests; `ant pruefung-fachlogik -Dbh.pruefung.filter=M06.json` grün (5 Fälle).
6. **Laden und Anzeige.** `WeeklyReportLocalServiceImpl.getReportHistory()` (lesend): Statuswechsel nach `seq`,
   Kommentare nach Runde und Zeitpunkt, mit Namen statt Personen-IDs. Die Berichtsseite zeigt je Prüfrunde
   Statuswechsel und Kommentare (JSP-Fragment im `BerichtPortlet`), mit den festen Merkern `data-von`, `data-nach`,
   `data-person`, `data-zeitpunkt`. Gestaltung folgt in P09. Prüfschritt: Seite eines Berichts mit drei Runden zeigt die
   Runden in der Reihenfolge der Spec.
7. **Zeitpunkte unabhängig von der Serverzeit** (gemeinsam 2.2). `createdAt` als `TIMESTAMP` in UTC aus der Uhr; JVM in
   GMT, JDBC-Sitzung in UTC. Prüfschritt: `AK801_ZeitpunktUnabhaengigVonServerzeitTest` (Schritt 9) und AK-801-04
   (Zeitpunkt über die Zeitumstellung) mit einem Portal, das einmal mit `TZ=Europe/Berlin` gestartet ist.
8. **Daten-Adapter erweitern** (Profil 6.2.5, Abschnitt 4.2). `historie_lesen` über `getReportHistory()`. Die Schreibversuche
   `historie_aendern`, `historie_loeschen` und `bericht_loeschen` gehen **mit direktem SQL über
   `DataAccess.getConnection()`** an der Persistenz vorbei, damit die Trigger geprüft werden und nicht der
   `ModelListener`; danach Entity-, Finder- und Hibernate-Sitzungs-Cache der betroffenen Entities leeren.
   `person_loeschen` über `deletePerson` (nur die Zeile `BH_Person`, Kinder per Kaskade, gemeinsam 2.4). Eine Abweisung
   wird über `HistoryGuard` als `{ "fehler": "historie_unveraenderlich" }` gemeldet. Prüfschritt:
   `ant pruefung-daten -Dbh.pruefung.filter=M06.json` grün (8 Fälle); `bestand_leeren` setzt die Datenbank weiterhin nur
   über das Löschen der Personen zurück.
9. **Eigene Tests** (Profil 6.2.5, „Nachweis AK-505 und AK-508“):
   - `AK803_TriggerDerHistorieTest` (`test/db/`): `UPDATE` und `DELETE` auf `BH_StatusChange` und `BH_Comment` per JDBC
     → SQLSTATE `BH803`; `DELETE` eines Berichts mit Historie → `BH803`; Löschen der Person per Kaskade gelingt und
     entfernt Berichte, Tage, Statuswechsel und Kommentare; Löschen einer Person in fremder Historie scheitert am
     Fremdschlüssel.
   - `AK803_ModelListenerTest` (`test/unit/`): Listener weist `onBeforeUpdate` und `onBeforeRemove` ab, `onBeforeCreate`
     geht durch.
   - `AK803_ModelListenerAngemeldetTest` (`test/integration/`): eine Aktion der Testschnittstelle, die es nur bei
     `bh.betrieb=test` gibt (`historie_aendern_persistenz`), ändert einen Statuswechsel über `StatusChangeLocalServiceUtil`;
     erwartet `historie_unveraenderlich` aus der `ModelListenerException`, bevor ein SQL-Befehl die Datenbank erreicht.
   - `AK801_ZeitpunktUnabhaengigVonServerzeitTest` (`test/db/`): läuft mit `-Duser.timezone=Europe/Berlin`, schreibt
     einen Zeitpunkt über die Persistenz-Abbildung und per SQL und liest beide als denselben UTC-Zeitpunkt.
   Prüfschritt: `ant test-unit test-db test-integration` grün.
10. **Gegenprobe** (Gemeinsame Regeln, „Gegenprobe“). Jeden Fehler einzeln einbauen, die genannten Befehle laufen lassen,
    Ergebnis im PR festhalten, Fehler zurücknehmen. Eine Gegenprobe zählt nur, wenn die benannten Fälle rot werden:

    | Nr. | Absichtlich eingebauter Fehler | Wird rot | Befehl |
    | --- | --- | --- | --- |
    | G6-1 (AK-505, Historie in der Datenhaltung) | Trigger `status_change_no_update` im Skript auskommentiert | AK-803-01 und `AK803_TriggerDerHistorieTest` | `ant pruefung-daten -Dbh.pruefung.filter=AK-803`, `ant test-db -Dtest.class=AK803_TriggerDerHistorieTest` |
    | G6-2 (AK-505) | Trigger `comment_no_delete` auskommentiert | AK-803-03 | `ant pruefung-daten -Dbh.pruefung.filter=AK-803` |
    | G6-3 (AK-505) | Trigger `weekly_report_delete_guard` auskommentiert | AK-803-04 | `ant pruefung-daten -Dbh.pruefung.filter=AK-803` |
    | G6-4 (AK-505, Kaskade) | `deletePerson` löscht vorher die Statuswechsel über Service Builder (`statusChangePersistence.removeByWeeklyReportId`) | AK-803-05 (Abweisung `BH803` bzw. `historie_unveraenderlich` statt `geloescht`) | `ant pruefung-daten -Dbh.pruefung.filter=AK-803` |
    | G6-5 (AK-505, App) | Eintrag `value.object.listener.de.berichtsheft.model.StatusChange` aus `service-ext.properties` entfernt | `AK803_ModelListenerAngemeldetTest` (die Änderung erreicht erst den Trigger); die neutralen Fälle bleiben grün, weil sie an der Persistenz vorbeigehen | `ant test-integration -Dtest.class=AK803_ModelListenerAngemeldetTest` |
    | G6-6 (AK-508, Historie im selben Lauf) | `rejectReport` schreibt Gesamt- und Tageskommentare vor `decideTransition()` über eine Methode mit eigener Transaktion (`@Transactional(propagation = Propagation.REQUIRES_NEW)`) | AK-508-01 (nach dem gescheiterten Ablehnen bleiben „Bitte genauer“ und „Was genau?“ in `kommentare`) | `ant pruefung-daten -Dbh.pruefung.filter=AK-508` |
    | G6-7 (Gegenprobe des Adapters) | Testschnittstelle führt `historie_aendern` über `StatusChangeLocalServiceUtil` statt mit direktem SQL aus, zusammen mit G6-1 | AK-803-01 bleibt grün: Der Adapter prüft dann den `ModelListener`, nicht den Trigger. Erwartet ist genau dieses Ergebnis; es zeigt, warum der Adapter direktes SQL nutzen muss | `ant pruefung-daten -Dbh.pruefung.filter=AK-803` |

    Prüfschritt: Tabelle mit dem tatsächlichen Ergebnis je Zeile im PR; nach dem Zurücknehmen alles grün. Wird ein
    benannter Fall von G6-1 bis G6-6 nicht rot, ist die Prüfung ohne Wirkung: anhalten und der Steuerung melden.
11. **Bau-Stand.** M06 in `BauStand.java` eintragen und AK-408-07 freischalten (von P04 bis hierher zurückgestellt: Einreichen aus P05,
    Historie auf der Berichtsseite aus diesem Paket). Prüfschritt: AK-408-07 läuft grün, kein Fall mehr „noch nicht gebaut“ außer AK-205-01 und
    AK-205-02 (P08). Prüfung nach Abschnitt 8.

## 8. Prüfung

Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh`.

| Befehl | Erwartet |
| --- | --- |
| `ant pruefung-fachlogik -Dbh.pruefung.filter=M06.json` | 5 Fälle grün |
| `ant pruefung-daten -Dbh.pruefung.filter=M06.json` | 8 Fälle grün |
| `ant pruefung-daten -Dbh.pruefung.filter=M05.json` | 36 Fälle weiterhin grün |
| `ant test-unit` | grün, auch `AK803_ModelListenerTest` und der Test zu `HistoryGuard` |
| `ant test-db` | grün, auch `AK803_TriggerDerHistorieTest` und `AK801_ZeitpunktUnabhaengigVonServerzeitTest` |
| `ant test-integration` | grün, auch `AK803_ModelListenerAngemeldetTest` |
| Gegenprobe aus Schritt 10 | jede Zeile wie benannt, danach zurückgenommen und grün |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: der volle Liferay-6.2.5-Job; im PR vermerken.

## 9. Abschluss

- Commit, z. B. „L62 P06: Historie (Trigger, ModelListener, nach Prüfrunde)“; vor dem Push alle Befehle aus Abschnitt 8
  lokal grün.
- Draft-PR mit der AK-Tabelle (AK-801, AK-802, AK-803 mit Test und Prüffällen), dem Nachweis (Verweis auf das Profil,
  Namen der eigenen Tests), der Gegenprobe-Tabelle mit Ergebnis und „Bitte bestätigen“. `upgrade/**`, `sql/**`,
  `model/listener/**`, `service*.properties` und `pruefung/**` sind sicherheitsrelevant (gemeinsam 5); Chris gibt frei.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Testdaten lassen sich nicht löschen | erwartet: Trigger; nur über das Löschen der Personen zurücksetzen (`bestand_leeren`) |
| Löschen einer Person scheitert mit `BH803` | Kinder über Service Builder gelöscht; nur die Zeile `BH_Person`, Kinder per Kaskade (gemeinsam 2.4) |
| Löschen einer Person scheitert am Fremdschlüssel, obwohl sie nur eigene Historie hat | `actorId`/`authorId` nicht `DEFERRABLE INITIALLY DEFERRED` (gemeinsam 2.6) |
| AK-803-Fälle grün, obwohl ein Trigger fehlt | Daten-Adapter schreibt über die Persistenz; direktes SQL über `DataAccess.getConnection()` (Schritt 8, G6-7) |
| Fehler wird am Meldungstext erkannt | SQLSTATE `BH803` in der Ursachenkette bzw. Grund der `ModelListenerException` (`HistoryGuard`) |
| Trigger nach einer Schemaänderung verschwunden | `build.auto.upgrade` stand auf `true`; nur `false`, Schemaänderungen als eigener `UpgradeProcess` (Profil 6.2.5, Abschnitt 7) |
| Nach direktem SQL zeigt die App den alten Stand | Entity-, Finder- und Hibernate-Sitzungs-Cache leeren |
| Reihenfolge bei gleichem Zeitpunkt falsch | nach `seq` je Bericht sortieren, nicht nach `createdAt` |
| Zeiten in der Historie verschoben | JVM nicht in GMT oder JDBC-Sitzung nicht in UTC; Anzeige mit Europe/Berlin (gemeinsam 2.2) |
| Kommentare eines gescheiterten Ablehnens bleiben | Historie und Kommentare nur in der Transaktion des Statuswechsels, nach der Entscheidung (G6-6) |
| Prüfrunde nachträglich berechnet | sie wird beim Schreiben bestimmt (`reviewRoundFor()`), nie beim Lesen |

## Bitte bestätigen

- [ ] Testaktion `historie_aendern_persistenz` der Testschnittstelle (nur bei `bh.betrieb=test`), damit die Anmeldung des
      `ModelListener` geprüft ist; kein neutraler Fall, keine Änderung an `specs/pruefung/format.md`.
- [ ] G6-7 ist eine Gegenprobe des Adapters mit erwartetem Grün; sie belegt die Wahl des direkten SQL nach Profil 6.2.5, Abschnitt 4.2.

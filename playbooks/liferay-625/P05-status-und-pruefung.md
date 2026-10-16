# P05 Status und Prüfung (M05)

Reihe `playbooks/liferay-625/` · Plattform Liferay Portal 6.2.5 CE GA6 · Profil `profile/liferay-625.md` (auf Grundlage
von `profile/liferay-gemeinsam.md`) · Stand: 16.10.2026 (Etappe G4, Paket G) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Das Statusmodell (Entwurf, Eingereicht, Freigegeben, Abgelehnt) mit Einreichen und Pflichtprüfung, Zurückziehen,
Prüfliste, Freigeben, Ablehnen, Rücknahme der Freigabe, Schreibschutz der Tage und der Absicherung gegen gleichzeitige
Änderungen ist auf 6.2.5 umgesetzt: Fachlogik in `de.berichtsheft.domain.status`, Statuswechsel in
`WeeklyReportLocalServiceImpl` mit Zeilensperre und bedingtem Update über `WeeklyReportFinderImpl`, Trigger
`report_day_locked` im Skript „Schutz in der Datenhaltung“. Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M05.json` grün sind (19 AK-IDs; 59 Fachlogik- und 36 Daten-Fälle);
2. die eigenen Tests des Nachweises AK-505 und AK-508 grün sind: `AK505_DatenhaltungWeistAendernEinesEingereichtenTagsAbTest`
   und `AK508_SperreUndBedingtesUpdateTest` in `test/db/`, `AK508_ZweiGleichzeitigeAktionenTest` in `test/integration/`
   (Profil, „Nachweis AK-505 und AK-508“);
3. die **Gegenprobe** aus Schritt 13 durchgeführt ist: jeder benannte Fehler macht genau die benannten Prüffälle bzw.
   Tests rot und ist danach zurückgenommen;
4. die Beispielszenarien „Einreichen scheitert an fehlendem Text“ (AK-502-04) und „Vertretung nimmt Freigabe zurück“
   (AK-703-06) in `specs/pruefung/szenarien.json` vorbereitet sind (Schritt 12); verbindlich verlangt werden sie erst
   in P10, weil sie Historie (P06) und die Seiten von P09 brauchen.

Schemaänderung: ja. Neue Entities `StatusChange` und `Comment` (`service.xml`), Spalte `version` an `WeeklyReport` (falls
P03 sie noch nicht angelegt hat), Teile `report_day_locked`, CHECK-Constraints und Fremdschlüssel der Historie im
Skript (gemeinsam 2.3, 2.6); bis `1.0.0` mit Neuanlage der Demo-Datenbank (P02, „Bitte bestätigen“).

## 2. Voraussetzungen

- P00 bis P04 der Reihe abgenommen: Berichte und Tage (`WeeklyReport`, `ReportDay`), Speichern (`saveDays`) und
  Berichtsseite; M02 liefert Rollen und `canViewReport()`.
- P00 hat „offen bis P05“ für Profil-Punkte 9 und 10 vermerkt (lesende Transaktionen nach Methodenpräfix, Zurückrollen
  bei `PortalException`, `SQLQuery.executeUpdate()` mit Zeilenzahl, `FOR UPDATE` in Custom SQL, Cache leeren); P05
  bestätigt sie in Schritt 2.
- Profil 6.2.5: Abschnitte 3 (Transaktion, Sperre und bedingtes Update), 4.1 (Fehlercodes), 4.2 (Testschnittstelle), 7
  („Lesende Transaktionen“, „Zurückrollen“, „Cache nach Custom SQL“) und „Nachweis AK-505 und AK-508“.
- Gemeinsames Profil: 2.4 (Versionsspalte und bedingtes Update), 2.6 (`report_day_locked`, Fehlergrund `P0001`).
- Die Historie wird hier geschrieben; ihre Unveränderlichkeit und Anzeige folgen in P06, die Nachrichten in P08
  (Einhängepunkt in Schritt 7).

## 3. Eingaben

- Fach-Spec: `specs/M05-status-und-pruefung.md` (Regeln M05-R01 bis M05-R22, Abschnitt 5 Datenmodell, Abschnitt 6
  Schnittstellen, Abschnitt 8 Anforderungen an die Plattform, Abschnitt 9 Auslegungen).
- Prüffälle: `specs/pruefung/M05.json` und die Szenarien in `specs/pruefung/szenarien.json`; Aktionen, Formate und
  Fehlercodes: `specs/pruefung/format.md`, „Aufbau eines Daten-Falls“ und „Schnittstellen und Aktionen von M05“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M05 Status und Prüfung“ (Fallen: Transaktion und Version,
  Speichern beim Einreichen, Prüfrunde aus der Historie).
- Profil: `profile/liferay-625.md`, „Nachweis AK-505 und AK-508“; `profile/liferay-gemeinsam.md` 2.4.

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Übertragbar sind `src/domain/report-status.ts` (`TRANSITIONS`, dann `decideTransition()`
von oben nach unten: die Reihenfolge der Prüfungen ist M05-R21), `src/domain/report-submission.ts` und `canEditReport()`
in `src/domain/report-access.ts`. `src/lib/report-transitions.ts` zeigt die Reihenfolge der Transaktion, ist aber nicht
übertragbar: Prisma rollt bei jeder Ausnahme zurück, 6.2.5 nur bei `PortalException` und `SystemException`, und
Hibernate schreibt verzögert (Schritt 7). Belege zum Abgleich: `src/domain/report-status.test.ts`,
`src/domain/report-submission.test.ts`, `tests/db/transitions.test.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Schema und Schreibschutz-Trigger, (2) Statusmodell und Entscheidung als reine Java-Klassen, (3)
Pflichtprüfung, (4) Bearbeitbarkeit, (5) Sperre und bedingtes Update im Finder, (6) Statuswechsel im Service, (7)
Prüfliste, (8) Portlets, (9) Daten-Adapter, (10) Fachlogik-Adapter, (11) eigene Tests des Nachweises, (12) Ablauf-Aktionen,
(13) Gegenprobe. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-501 | Ein offener Bericht lässt sich nur mit vollständigen Pflichtangaben einreichen (nur Leerzeichen gelten als leer); nicht bei Wochen ganz außerhalb; die laufende Woche schon vor ihrem Ende. | 11 (9 fachlogik, 2 daten) | `specs/pruefung/M05.json` |
| AK-502 | Fehlt eine Pflichtangabe, wird nicht eingereicht; die Tage werden mit „Tagesart fehlt“ bzw. „Tätigkeiten fehlen“ benannt und markiert. | 4 (2 fachlogik, 1 daten, 1 ablauf) | `specs/pruefung/M05.json`, `specs/pruefung/szenarien.json` |
| AK-503 | Bei Urlaub, Krank und Feiertag ist kein Text nötig; ein eingetragener Text bleibt. | 2 (1 fachlogik, 1 daten) | `specs/pruefung/M05.json` |
| AK-504 | Auch eine Woche nur aus Urlaub und Feiertagen muss eingereicht werden und zählt bis dahin als offen. | 2 (1 fachlogik, 1 daten) | `specs/pruefung/M05.json` |
| AK-505 | Nach dem Einreichen „Eingereicht“ und schreibgeschützt; Einreichen speichert Eingaben mit, beim Scheitern bleiben sie als Entwurf; zusätzlich Schutz in der Datenhaltung. | 7 (4 daten, 3 fachlogik): AK-505-01, AK-505-02, AK-505-03, AK-505-04, AK-505-05, AK-505-06, AK-505-07 | `specs/pruefung/M05.json` |
| AK-506 | Der Azubi kann einen eingereichten Bericht zurückziehen: wieder Entwurf, bearbeitbar, nicht mehr in der Prüfliste. | 3 (1 daten, 2 fachlogik) | `specs/pruefung/M05.json` |
| AK-507 | Ein freigegebener oder abgelehnter Bericht kann nicht zurückgezogen werden; die Schaltfläche fehlt. | 6 (5 fachlogik, 1 daten) | `specs/pruefung/M05.json` |
| AK-508 | Zieht der Azubi zurück, während ein Ausbilder prüft, scheitert dessen Prüfung mit „Bericht wurde zurückgezogen“; umgekehrt scheitert das Zurückziehen nach der Prüfung. | 11 (5 daten, 6 fachlogik): AK-508-01, AK-508-02, AK-508-03, AK-508-04, AK-508-05, AK-508-06, AK-508-07, AK-508-08, AK-508-09, AK-508-10, AK-508-11 | `specs/pruefung/M05.json` |
| AK-601 | Die Prüfliste zeigt eingereichte Berichte mit Azubi, Woche und Einreichungsdatum; standardmäßig eigene Azubis, per Filter alle. | 2 (2 daten) | `specs/pruefung/M05.json` |
| AK-602 | Jeder Ausbilder darf jeden eingereichten Bericht freigeben oder ablehnen, auch ohne Zuordnung (Vertretung). | 7 (3 daten, 4 fachlogik) | `specs/pruefung/M05.json` |
| AK-603 | Bei der Freigabe wird der Status „Freigegeben“; Ausbilder sowie Datum und Uhrzeit werden gespeichert. | 2 (2 daten) | `specs/pruefung/M05.json` |
| AK-604 | Ablehnen geht nur mit nicht leerem Gesamtkommentar; Kommentare und Begründung je bis 5.000 Zeichen. | 8 (6 fachlogik, 2 daten) | `specs/pruefung/M05.json` |
| AK-605 | Optionale Tageskommentare zu jedem Tag, auch außerhalb der Ausbildung; beim Freigeben werden eingetippte Kommentare nicht gespeichert. | 3 (3 daten) | `specs/pruefung/M05.json` |
| AK-606 | Nach einer Ablehnung sieht der Azubi Gesamt- und Tageskommentare, nach einer Rücknahme die Begründung; nach dem erneuten Einreichen nur noch in der Historie. | 3 (3 daten) | `specs/pruefung/M05.json` |
| AK-607 | Berichte im Status „Entwurf“ kann der Ausbilder weder freigeben noch ablehnen. | 5 (4 fachlogik, 1 daten) | `specs/pruefung/M05.json` |
| AK-701 | Ein abgelehnter Bericht ist bearbeitbar und erneut einreichbar; danach „Eingereicht“ und wieder in der Prüfliste. | 3 (1 daten, 2 fachlogik) | `specs/pruefung/M05.json` |
| AK-702 | Der Zyklus aus Ablehnen und erneutem Einreichen funktioniert beliebig oft (dreimal ablehnen, dann freigeben). | 6 (1 daten, 5 fachlogik) | `specs/pruefung/M05.json` |
| AK-703 | Eine Freigabe lässt sich nur mit nicht leerer Begründung zurücknehmen; danach „Abgelehnt“ und bearbeitbar. | 6 (4 fachlogik, 1 daten, 1 ablauf) | `specs/pruefung/M05.json`, `specs/pruefung/szenarien.json` |
| AK-704 | Außer durch die Rücknahme kann niemand einen freigegebenen Bericht ändern, auch kein Ausbilder. | 6 (5 fachlogik, 1 daten) | `specs/pruefung/M05.json` |

**Nachweis AK-505 und AK-508** (Profil, gleichnamiger Abschnitt): Fachlogik über `PruefungFachlogikTest`, Service über
`PruefungDatenTest`, Datenhaltung und echte Gleichzeitigkeit über die eigenen Tests aus Schritt 11. Den Teil
„Datenhaltung: Historie“ (AK-803) und den `ModelListener` baut P06.

## 6. Empfehlung

**Weg B.** Das Statusmodell ist als Tabelle (4 Status × 6 Aktionen × Rollen) mit festen Fehlercodes vollständig
spezifiziert, die Daten-Fälle zeigen Gleichzeitigkeit deterministisch (`gesehen`). Die Gefahr liegt nicht in den Regeln,
sondern in der Transaktion von 6.2.5 (Zurückrollen, verzögertes Schreiben, Cache); die Schritte 5 bis 7 und die
Gegenprobe in Schritt 13 sind deshalb Pflicht. Weg A nur auf ausdrücklichen Auftrag.

## 7. Schritte

1. **Branch** `claude/l62-p05-status-und-pruefung`; Spec (M05-R08, M05-R20, M05-R21), Profil 7 und Prüffälle lesen.
   Prüfschritt: AK-Tabelle und Liste der Fehlercodes aus `specs/pruefung/format.md` im PR-Entwurf.
2. **Transaktionsverhalten bestätigen** (Profil „In P00 zu bestätigen“ 9, 10). Ein Wegwerf-Test in `test/integration/`
   zeigt über die Testschnittstelle: (a) eine `PortalException` aus einer `*LocalServiceImpl`-Methode rollt zurück, eine
   normale Rückgabe nicht; (b) eine Methode mit Präfix `get` schreibt nicht; (c) `SQLQuery.executeUpdate()` liefert die
   Zahl geänderter Zeilen; (d) `SELECT … FOR UPDATE` in Custom SQL hält die Sperre bis zum Ende der Service-Transaktion.
   Prüfschritt: vier Ergebnisse im PR; ein abweichendes Ergebnis hält das Paket an (Rückfrage an die Steuerung).
3. **Schema und Schreibschutz** (gemeinsam 2.3, 2.6). `service.xml`: `StatusChange` (`weeklyReportId`, `fromStatus`,
   `toStatus`, `actorId`, `reason`, `reviewRound`, `seq`, `createdAt`) und `Comment` (`weeklyReportId`, `reviewRound`,
   `reportDayId`, `authorId`, `commentText`, `createdAt`); `WeeklyReport.version` (int, Anfang 0), `mvcc-enabled` nach
   dem Ergebnis von P00 (gemeinsam 2.4). Skript: Fremdschlüssel mit `ON DELETE`-Aktionen, `actorId` und `authorId`
   `DEFERRABLE INITIALLY DEFERRED`, CHECK `status_change_review_round_not_negative`, `comment_review_round_positive`,
   `comment_text_not_blank` und der Trigger **`report_day_locked`** (`BEFORE UPDATE ON BH_ReportDay`, weist ab, wenn der
   Bericht `SUBMITTED` oder `APPROVED` ist; SQLSTATE `P0001`; AK-505, AK-704). Die Trigger der Historie folgen in P06.
   Prüfschritt: `AK505_DatenhaltungWeistAendernEinesEingereichtenTagsAbTest` (Schritt 11) grün.
4. **Statusmodell `de.berichtsheft.domain.status.ReportStatusRules`** (Gegenstück zu `src/domain/report-status.ts`;
   M05-R01 bis M05-R04, M05-R12, M05-R14, M05-R15, M05-R18 bis M05-R21; AK-507, AK-508, AK-604, AK-607, AK-703, AK-704):
   `ReportStatus`, `ReportAction`, `TRANSITIONS`, `decideTransition()` mit `TransitionDecision` und `SeenState` (Status
   und `version`, die die Person gesehen hat). Reihenfolge der Prüfungen nach M05-R21: Person und Rolle, Besitz,
   deaktivierter Azubi, gesehener Stand gegen aktuellen (zurückgezogen, bereits geprüft, bereits eingereicht, inzwischen
   geändert – **Status und `version`**), erlaubter Übergang, Pflichttext. Dazu `availableActions()`, `isBlank()`,
   `normalizeComment()`, `commentTooLong()` (5.000 Zeichen), `reviewRoundFor()` (jede Einreichung beginnt eine neue
   Runde, AK-702), `isOpenStatus()`. Jede Ablehnung trägt einen `Fehlercode` (`bericht_zurueckgezogen`,
   `bereits_geprueft`, `bereits_eingereicht`, `bereits_zurueckgezogen`, `bereits_zurueckgenommen`,
   `inzwischen_geaendert`, `uebergang_unzulaessig`, `azubi_deaktiviert`, `kommentar_fehlt`, `begruendung_fehlt`,
   `text_zu_lang`, `zugriff_verweigert`). Prüfschritt: `test/unit/` als Tabelle 4 Status × 6 Aktionen × Rollen und
   Block „AK508_Gleichzeitigkeit“.
5. **Pflichtangaben `de.berichtsheft.domain.status.SubmissionRules`** (Gegenstück zu `src/domain/report-submission.ts`;
   M05-R05 bis M05-R07, AK-501, AK-502, AK-503, AK-504): `validateSubmission()` mit den betroffenen Tagen in
   Kalenderreihenfolge (`tagesart_fehlt`, `taetigkeiten_fehlen`); Urlaub, Krank, Feiertag ohne Text, ein eingetragener
   Text bleibt; Tage außerhalb zählen nicht; Woche ganz außerhalb → `woche_ausserhalb`; laufende Woche schon vor ihrem
   Ende. **Bearbeitbarkeit** `ReportAccess.canEditReport()` (Status Entwurf oder Abgelehnt, nur eigener aktiver Azubi;
   AK-505, AK-506, AK-701, AK-703, AK-704). Prüfschritt: Unit-Tests.
6. **Sperre und bedingtes Update `WeeklyReportFinderImpl`** (Profil 3 „Sperre und bedingtes Update“, gemeinsam 2.4).
   Custom SQL in `custom-sql/default.xml`: `lockForUpdate` (`SELECT … FROM BH_WeeklyReport WHERE weeklyReportId = ? FOR
   UPDATE`) und `updateStatusConditional` (`UPDATE BH_WeeklyReport SET status = ?, version = version + 1, updatedAt = ?
   WHERE weeklyReportId = ? AND status = ? AND version = ?`). Beide laufen über `openSession()` in der Hibernate-Sitzung
   der Service-Transaktion. **Vor** dem bedingten Update ruft der Finder `session.flush()`: Hibernate schreibt geänderte
   Tage sonst erst beim Abschluss, also nach dem Wechsel auf `SUBMITTED`, und `report_day_locked` wiese das eigene
   Einreichen ab. Nach dem Update Entity- und Finder-Cache des Berichts leeren und das Objekt aus der Sitzung lösen
   (`session.evict`). **Auch `saveDays` (M04) beginnt mit `lockForUpdate`** und prüft erst danach Status und Person
   (gemeinsam 2.4, Schritt 1). Prüfschritt: `AK508_SperreUndBedingtesUpdateTest` (Schritt 11) grün.
7. **Statuswechsel `WeeklyReportLocalServiceImpl`** (M05-R05 bis M05-R08, M05-R13, M05-R14, M05-R20 bis M05-R22).
   Öffentliche Methoden `submitReport`, `resubmitReport`, `withdrawReport`, `approveReport`, `rejectReport`,
   `revokeApproval` (nie `get…`, Profil 7), jede mit handelnder Person, Bericht und gesehenem Stand (Status und `version`
   aus dem Formular). Ablauf **in einer Transaktion**:
   1. `lockForUpdate`; Sicht-Recht mit `canViewReport()`; `decideTransition()` gegen den gesperrten Stand und den
      gesehenen Stand. Jede Ablehnung wirft `DomainRuleException` (Unterklasse von `PortalException`) mit `Fehlercode`
      und rollt zurück.
   2. Nur beim (erneuten) Einreichen: `woche_ausserhalb` vor dem Speichern prüfen (M05-R21, Ausnahme, rollt zurück);
      mitgeschickte Eingaben prüfen (`tage_ungueltig` als Ausnahme, nichts wird gespeichert, AK-505-04); Eingaben
      speichern wie `saveDays`; `validateSubmission()`.
   3. **Zurückrollen:** Eine `PortalException` rollt die ganze Transaktion zurück, auch die mitgespeicherten Tage.
      Fehlende Pflichtangaben sind deshalb ein **Ergebnis** (`pflichtangaben_fehlen` mit den Tagen), keine Ausnahme; der
      Service gibt `TransitionResult` mit dem Code zurück, die Transaktion endet normal und die Tage bleiben als Entwurf
      (AK-505-03; Profil 6.2.5, Abschnitt 7 „Zurückrollen“).
   4. `updateStatusConditional` mit Status und `version` des gesperrten Stands; genau eine geänderte Zeile verlangen,
      sonst `DomainRuleException(inzwischen_geaendert)` (zweite Sicherung, gemeinsam 2.4; ein Konflikt muss
      zurückrollen, damit kein Historieneintrag entsteht).
   5. `StatusChange` mit `seq` = größte bisherige des Berichts plus 1 (unter der Sperre), `reviewRound` aus der Zahl der
      bisherigen Einreichungen (`reviewRoundFor()`), `createdAt` aus der Uhr, nie `new Date()`; beim Ablehnen
      Gesamtkommentar und Tageskommentare als `Comment` (Tageskommentare nur beim Ablehnen, beim Freigeben ignoriert),
      bei der Rücknahme die Begründung als `reason` – alles über die Persistenz derselben Transaktion.
   6. Einhängepunkt für P08: das Ergebnis trägt ein `TransitionEvent` (Bericht, Statuswechsel, handelnde Person); P08
      schreibt in derselben Transaktion in den Ausgangskorb.
   Prüfschritt: `ant pruefung-daten -Dbh.pruefung.filter=AK-505` grün, insbesondere AK-505-03.
8. **Prüfliste** `getReviewQueue(viewer, scope)` (lesend; eingereichte Berichte, standardmäßig eigene Azubis, per Filter
   alle, letzte Einreichung, älteste zuerst; deaktivierter Azubi mit Hinweis; AK-601, AK-602) und `getFeedback()`
   (Gesamtkommentar bzw. Begründung der aktuellen Ablehnung, AK-606; einfacher Zugriff, den P06 durch `currentFeedback()`
   ersetzt). Prüfschritt: Daten-Fälle zu AK-601, AK-602 und AK-606 grün.
9. **Portlets.** Berichtsseite (`BerichtPortlet`, aus P04) bekommt die Aktionen Einreichen und Zurückziehen, die
   Prüfansicht (`PrueflistePortlet`) Freigeben, Ablehnen (Gesamt- und Tageskommentare) und Freigabe zurücknehmen. Status
   und `version` des gesehenen Stands stehen als versteckte Felder im Formular; „Einreichen“ schickt die ungespeicherten
   Eingaben mit. Jede `processAction` ruft den Service; Fehlercodes werden zu Meldungen des Portlets, Merker
   `data-status`, `data-fehler`, `data-feld`. Gestaltung folgt in P09. Prüfschritt: Einreichen mit fehlendem Text zeigt
   die Fehlerleiste, die Eingaben bleiben gespeichert.
10. **Daten-Adapter** (Testschnittstelle, Profil 4.2). Vor jedem Fall `bestand_leeren`, Testdaten und Ausgangsbestand nach
    `specs/pruefung/format.md` herstellen (Personen, Berichte mit `tage` und `verlauf`, Uhr), Schritte über **dieselben
    Service-Methoden** wie die Portlets ausführen: `einreichen`, `erneut_einreichen`, `zurueckziehen`, `freigeben`,
    `ablehnen`, `freigabe_zuruecknehmen`, `tage_speichern`, `pruefliste_lesen`, `rueckmeldung_lesen`,
    `person_deaktivieren`, `ausbildungszeitraum_aendern`. `gesehen: n` stellt Status und `version` nach Schritt `n` nach;
    Fehler kommen als `{ "fehler": "<code>" }` aus dem `Fehlercode` der Ausnahme bzw. des Ergebnisses, nie aus dem
    Meldungstext. Rückgabe des Bestands mit Tagen, Historie und Kommentaren, Namen auf Schlüssel zurückgeführt,
    `version` nie ausgeben. Prüfschritt: `ant pruefung-daten -Dbh.pruefung.filter=M05.json` grün (36 Fälle).
11. **Eigene Tests des Nachweises** (Profil, „Nachweis AK-505 und AK-508“):
    - `AK505_DatenhaltungWeistAendernEinesEingereichtenTagsAbTest` (`test/db/`): Bericht per SQL auf `SUBMITTED`, dann
      `UPDATE BH_ReportDay` per JDBC → SQLSTATE `P0001`; ebenso bei `APPROVED`; im Entwurf gelingt dasselbe Update.
    - `AK508_SperreUndBedingtesUpdateTest` (`test/db/`): (1) zwei JDBC-Verbindungen, A sperrt und wechselt den Status,
      B wartet auf die Sperre und ändert danach mit dem alten Status 0 Zeilen; (2) Folge A-B-A: gesehen „Eingereicht“ mit
      `version` n, inzwischen zurückgezogen und erneut eingereicht (n+2); das bedingte Update mit `version = n` ändert 0
      Zeilen; ohne die Bedingung auf `version` ändert es 1 Zeile.
    - `AK508_ZweiGleichzeitigeAktionenTest` (`test/integration/`): „AK-508 von zwei gleichzeitigen Aktionen gelingt genau
      eine“; zwei Threads mit Startschranke rufen Freigeben und Zurückziehen auf demselben Stand über die
      Testschnittstelle; genau eine gelingt, die andere liefert `bericht_zurueckgezogen` bzw. `bereits_geprueft`; genau
      ein neuer Eintrag in `BH_StatusChange`, `version` um 1 erhöht.
    Prüfschritt: `ant test-db test-integration` grün.
12. **Fachlogik-Adapter und Ablauf-Aktionen.** Fachlogik: Schnittstellen `einreichenPruefen`, `uebergangPruefen`
    (übersetzt, nicht umgedeutet: der Bericht bekommt `version` 1, der gesehene Stand `version` 0 bei `veraltet: true`,
    sonst 1),
    `moeglicheAktionen`, `pruefrunde`, `darfBearbeiten`; Prüfschritt: `ant pruefung-fachlogik
    -Dbh.pruefung.filter=M05.json` grün (59 Fälle). Ablauf (für die Szenarien, verbindlich in P10): Aktionen
    `einreichen`, `freigeben`, `ablehnen`, `freigabe_zuruecknehmen` mit bestätigter Rückfrage, Seite `pruefliste` mit
    `eintraege` und `ausgewaehlt`; fertig, wenn die Seite nach der Weiterleitung den Merker `data-status` zeigt.
13. **Gegenprobe** (Gemeinsame Regeln, „Gegenprobe“; Profil 7 „Zurückrollen“). Jeden Fehler einzeln einbauen, die
    genannten Befehle laufen lassen, Ergebnis im PR festhalten, Fehler zurücknehmen. Eine Gegenprobe zählt nur, wenn die
    benannten Fälle rot werden:

    | Nr. | Absichtlich eingebauter Fehler | Wird rot | Befehl |
    | --- | --- | --- | --- |
    | G5-1 (AK-505) | `submitReport` wirft bei fehlenden Pflichtangaben `DomainRuleException(pflichtangaben_fehlen)` statt das Ergebnis zurückzugeben | AK-505-03 (Tage zurückgerollt, Montag zeigt wieder „Netzwerk geplant“) | `ant pruefung-daten -Dbh.pruefung.filter=AK-505` |
    | G5-2 (AK-505) | `saveDays` ruft `canEditReport()` nicht auf (Speichern ohne Statusprüfung) | AK-505-01 und AK-704-06 (statt `nicht_bearbeitbar` scheitert das Speichern erst am Trigger mit `P0001`) | `ant pruefung-daten -Dbh.pruefung.filter=AK-505`, `-Dbh.pruefung.filter=AK-704` |
    | G5-3 (AK-505) | Trigger `report_day_locked` im Skript auskommentiert | `AK505_DatenhaltungWeistAendernEinesEingereichtenTagsAbTest` (kein neutraler Fall zeigt das) | `ant test-db -Dtest.class=AK505_DatenhaltungWeistAendernEinesEingereichtenTagsAbTest` |
    | G8-1 (AK-508) | Service übergibt `decideTransition()` den gesperrten Stand als gesehenen Stand (Formularwerte ignoriert) | AK-508-01, AK-508-02, AK-508-03, AK-508-04, AK-508-05 | `ant pruefung-daten -Dbh.pruefung.filter=AK-508` |
    | G8-2 (AK-508) | `decideTransition()` vergleicht nur den Status, nicht `version` (`veraltet` wirkungslos) | AK-508-09 (Fachlogik) und AK-508-04 (Daten) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-508`, `ant pruefung-daten -Dbh.pruefung.filter=AK-508` |
    | G8-3 (AK-508) | `AND version = ?` aus `updateStatusConditional` entfernt | `AK508_SperreUndBedingtesUpdateTest`, Teil (2); die neutralen Fälle bleiben grün, weil die Prüfung unter der Sperre greift | `ant test-db -Dtest.class=AK508_SperreUndBedingtesUpdateTest` |
    | G8-4 (AK-508) | `lockForUpdate` übersprungen und das Update ohne Bedingung auf Status und `version` | `AK508_ZweiGleichzeitigeAktionenTest` (beide Aktionen gelingen, zwei neue Einträge) | `ant test-integration -Dtest.class=AK508_ZweiGleichzeitigeAktionenTest` |

    Kein Teil der Gegenprobe, aber im PR festzuhalten: Ohne `session.flush()` vor `updateStatusConditional` wird
    AK-505-02 nur dann rot, wenn Hibernate vor Custom SQL nicht von selbst schreibt (Profil-Punkt 10). Bleibt der Fall
    grün, ist `session.flush()` eine Absicherung, und der PR vermerkt „Hibernate schreibt vor Custom SQL selbst“.

    Prüfschritt: Tabelle mit dem tatsächlichen Ergebnis je Zeile im PR; nach dem Zurücknehmen alles grün. Wird ein
    benannter Fall nicht rot, ist die Prüfung ohne Wirkung: anhalten und der Steuerung melden.
14. **Bau-Stand.** M05 in `BauStand.java` eintragen. Prüfung nach Abschnitt 8.

## 8. Prüfung

Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh`, Playwright im Wurzelordner.

| Befehl | Erwartet |
| --- | --- |
| `ant test-unit` | grün (Statusmodell als Tabelle, Pflichtangaben, Bearbeitbarkeit, `DomainOhneLiferayTest`) |
| `ant pruefung-fachlogik -Dbh.pruefung.filter=M05.json` | 59 Fälle grün |
| `ant pruefung-daten -Dbh.pruefung.filter=M05.json` | 36 Fälle grün |
| `ant test-db` | grün, auch `AK505_DatenhaltungWeistAendernEinesEingereichtenTagsAbTest` und `AK508_SperreUndBedingtesUpdateTest` |
| `ant test-integration` | grün, auch `AK508_ZweiGleichzeitigeAktionenTest` |
| Gegenprobe aus Schritt 13 | jede Zeile rot wie benannt, danach zurückgenommen und grün |
| `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=chromium --project=smartphone-375 -g "M02.json"` | weiterhin grün bzw. „abweichend, begründet“ (kein Rückschritt durch den Filter) |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: der volle Liferay-6.2.5-Job; die Szenarien AK-502-04 und AK-703-06 verbindlich erst in P10.

## 9. Abschluss

- Commit, z. B. „L62 P05: Status und Prüfung (Statusmodell, Sperre, bedingtes Update, Schreibschutz)“; vor dem Push alle
  Befehle aus Abschnitt 8 lokal grün.
- Draft-PR mit der AK-Tabelle (AK-501, AK-502, AK-503, AK-504, AK-505, AK-506, AK-507, AK-508, AK-601, AK-602, AK-603,
  AK-604, AK-605, AK-606, AK-607, AK-701, AK-702, AK-703, AK-704 mit Test und Prüffällen), dem Nachweis AK-505 und AK-508
  (Verweis auf das Profil, Namen der eigenen Tests), der Gegenprobe-Tabelle mit Ergebnis und „Bitte bestätigen“.
  `service.xml`, `sql/**`, `upgrade/**`, `custom-sql/**`, `service*.properties` und `service/impl/**` sind
  sicherheitsrelevant (gemeinsam 5); Chris gibt frei.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Eingaben gehen verloren, wenn nur die Pflichtprüfung scheitert | `pflichtangaben_fehlen` ist ein Ergebnis, keine `PortalException`; die Transaktion endet normal (AK-505-03) |
| Ungültige Eingabe wird trotzdem teilweise gespeichert | `tage_ungueltig` und `woche_ausserhalb` vor dem Speichern prüfen und als `PortalException` werfen |
| Einreichen scheitert mit `P0001` am eigenen Bericht | Hibernate hat die Tage nach dem Statuswechsel geschrieben; `session.flush()` vor dem bedingten Update (Schritt 6) |
| Beide gleichzeitigen Aktionen gelingen | `lockForUpdate` am Anfang jeder schreibenden Methode, auch `saveDays`; bedingtes Update mit Status und `version` |
| Fachlicher Fehler hinterlässt einen Historieneintrag | Fehler als `RuntimeException` oder Rückgabe statt `PortalException`; nur `PortalException` und `SystemException` rollen sicher zurück |
| Nach dem Wechsel zeigt die App den alten Status | Entity- und Finder-Cache nach dem Custom SQL leeren, Objekt aus der Hibernate-Sitzung lösen |
| Statuswechsel speichert nichts | Methodenname mit `get`, `is`, `has` läuft nur lesend (Profil 7) |
| `*LocalServiceImpl` lässt sich nicht erzeugen | Java-8-Syntax (Lambda, Methodenreferenz) in einer Klasse, die Service Builder liest; nur in `domain/` erlaubt |
| Meldung falsch nach gleichzeitiger Aktion | Entscheidung gegen den gesperrten Stand mit dem gesehenen Stand aus dem Formular (M05-R20) |
| Zeitpunkt der Historie stimmt nicht mit der Uhr des Falls | „jetzt“ nur aus `ClockHolder`; kein Datenbank-Standardwert, kein `new Date()` |
| Prüfrunde falsch | Einreichungen aus der Historie zählen (`reviewRoundFor()`), nicht am Bericht speichern |
| Ausbilder kann Tage ändern | `report_day_locked` prüft auch `APPROVED` (AK-704) |
| Kommentare an freigegebenem Bericht gespeichert | Tageskommentare nur in `rejectReport` lesen |

## Bitte bestätigen

- [ ] `session.flush()` vor dem bedingten Update als feste Regel für alle Statuswechsel mit Speichern (nicht im Profil;
      folgt aus dem Schreibschutz-Trigger und dem verzögerten Schreiben von Hibernate 3).
- [ ] Ergebnis `TransitionResult` nur für `pflichtangaben_fehlen`; alle anderen Ablehnungen als `DomainRuleException`
      (Profil 4.1, 7).
- [ ] Gegenprobe G8-3 zeigt nur ein eigener Test, kein neutraler Prüffall; das ist nach M05 Abschnitt 10 erwartet
      (die zweite Sicherung greift nur bei einem Fehler der Fachlogik).

# P05 Status und Prüfung (M05)

Reihe `playbooks/liferay-72/` · Plattform Liferay Portal 7.2 CE · Profil `profile/liferay-72.md` (baut auf
`profile/liferay-gemeinsam.md` auf) · Stand: 16.10.2026 (Etappe G4, Paket H) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Das Statusmodell (Entwurf, Eingereicht, Freigegeben, Abgelehnt) mit Einreichen und Pflichtprüfung, Zurückziehen, Prüfliste,
Freigeben, Ablehnen, Rücknahme der Freigabe und der Absicherung gegen gleichzeitige Änderungen ist auf 7.2 umgesetzt:
Fachlogik in `bh-domain`, Statuswechsel in `WeeklyReportLocalServiceImpl` mit Sperre und bedingtem Update, Schreibschutz der
Tage über `ReportDayModelListener` und Trigger. Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M05.json` über die Prüf-Adapter grün sind (19 AK-IDs; 59 Fachlogik- und 36 Daten-Fälle);
2. der Nachweis AK-505 und AK-508 nach `profile/liferay-72.md`, Abschnitt „Nachweis AK-505 und AK-508“, steht: die
   plattformeigenen Tests `ReportDayProtectionTest` und `ConcurrentTransitionTest` sind grün;
3. jede Gegenprobe aus Schritt 13 hat die dort benannten Prüffälle bzw. Tests rot gemacht und ist zurückgenommen;
4. die Ablauf-Aktionen für die Szenarien AK-502-04 und AK-703-06 (`specs/pruefung/szenarien.json`) vorbereitet sind; verbindlich
   verlangt werden sie erst in P10 (sie brauchen Historie aus P06 und die Seiten aus P09).

Keine Schemaänderung außer den Entities `StatusChange` und `Comment` (gemeinsam 2.3) und dem Trigger `report_day_locked` im
Skript „Schutz in der Datenhaltung“ (gemeinsam 2.6); Migration über den Upgrade-Schritt aus P00.

## 2. Voraussetzungen

- L72-P00 bis L72-P04 abgenommen (Berichte, Tage, Speichern mit Sperre, Berichtsseite); M02 liefert Rollen und Besitz, M04 das
  Speichern. Speichern (M04) sperrt die Zeile des Berichts bereits mit `SELECT … FOR UPDATE`, bevor es Status und Tage liest
  (gemeinsam 2.4, Schritt 1); sonst gilt die Sperre dieses Playbooks nicht.
- Profil: Abschnitte 3 (Transaktion und Gleichzeitigkeit, Historie und Schreibschutz), 4 (Daten-Adapter, plattformeigene
  Tests), 7 („`PortalException` und Rollback“, „Service Builder schreibt am Cache vorbei“) und „Nachweis AK-505 und AK-508“;
  gemeinsam 2.4 und 2.6.
- Die Historie wird hier geschrieben; ihre Unveränderlichkeit und Anzeige folgen in P06, die Nachrichten in P08
  (Einhängepunkt in Schritt 7).

## 3. Eingaben

- Fach-Spec: `specs/M05-status-und-pruefung.md` (Regeln M05-R01 bis M05-R22, Abschnitt 5 Datenmodell, Abschnitt 6 Schnittstellen
  und Aktionen, Abschnitt 8 Anforderungen an die Plattform, Abschnitt 9 Auslegungen).
- Prüffälle: `specs/pruefung/M05.json` und `specs/pruefung/szenarien.json`; Daten-Fälle, Aktionen und Fehlercodes:
  `specs/pruefung/format.md`, „Aufbau eines Daten-Falls“ und „Schnittstellen und Aktionen von M05“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M05 Status und Prüfung“ (Reihenfolge der Prüfungen, Fallen).
- Gegenstücke der Referenz für die plattformeigenen Tests: `tests/db/transitions.test.ts` (AK-508 gleichzeitig),
  `tests/db/status-change.test.ts` (Datenhaltung).

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag und nur für die Fachlogik: `src/domain/report-status.ts` (`TRANSITIONS`, dann
`decideTransition()` von oben nach unten; die Reihenfolge der Prüfungen ist M05-R21), `src/domain/report-submission.ts`,
`canEditReport()` in `src/domain/report-access.ts` lassen sich 1:1 nach Java übersetzen. Die Transaktion
(`src/lib/report-transitions.ts`) ist **nicht** übertragbar: Prisma beendet die Transaktion bei fehlenden Pflichtangaben
regulär, auf 7.2 entscheidet darüber die Art der Rückgabe (Schritt 6).

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Entities und Schreibschutz-Trigger, (2) Statusmodell und Entscheidung als reine Funktionen, (3)
Pflichtprüfung, (4) Bearbeitbarkeit und `ReportDayModelListener`, (5) Statuswechsel in einer Service-Transaktion mit Sperre und
bedingtem Update, (6) Einreichen mit Speichern als Ergebnis statt Ausnahme, (7) Prüfliste, (8) Portlets, (9) Adapter, (10)
plattformeigene Tests und Gegenproben. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Bewertung auf 7.2 |
| --- | --- | --- | --- |
| AK-501 | Ein offener Bericht lässt sich nur mit vollständigen Pflichtangaben einreichen (nur Leerzeichen gelten als leer); nicht bei Wochen ganz außerhalb; die laufende Woche schon vor ihrem Ende. | 11 (9 fachlogik, 2 daten) | gleichwertig |
| AK-502 | Fehlt eine Pflichtangabe, wird nicht eingereicht; die Tage werden mit „Tagesart fehlt“ bzw. „Tätigkeiten fehlen“ benannt und markiert. | 4 (2 fachlogik, 1 daten, 1 ablauf) | gleichwertig; AK-502-04 ist Szenario (P10) |
| AK-503 | Bei Urlaub, Krank und Feiertag ist kein Text nötig; ein eingetragener Text bleibt. | 2 (1 fachlogik, 1 daten) | gleichwertig |
| AK-504 | Auch eine Woche nur aus Urlaub und Feiertagen muss eingereicht werden und zählt bis dahin als offen. | 2 (1 fachlogik, 1 daten) | gleichwertig |
| AK-505 | Nach dem Einreichen „Eingereicht“ und schreibgeschützt; Einreichen speichert Eingaben mit, beim Scheitern bleiben sie als Entwurf; zusätzlich Schutz in der Datenhaltung. | 7 (4 daten, 3 fachlogik) | gleichwertig; Nachweis nach Profil (Trigger plus `ModelListener`, Ergebnis statt Ausnahme) |
| AK-506 | Der Azubi kann einen eingereichten Bericht zurückziehen: wieder Entwurf, bearbeitbar, nicht mehr in der Prüfliste. | 3 (1 daten, 2 fachlogik) | gleichwertig |
| AK-507 | Ein freigegebener oder abgelehnter Bericht kann nicht zurückgezogen werden; die Schaltfläche fehlt. | 6 (5 fachlogik, 1 daten) | gleichwertig |
| AK-508 | Zieht der Azubi zurück, während ein Ausbilder prüft, scheitert dessen Prüfung mit „Bericht wurde zurückgezogen“; umgekehrt scheitert das Zurückziehen nach der Prüfung. | 11 (5 daten, 6 fachlogik) | gleichwertig; Nachweis nach Profil (Sperre, bedingtes Update, `ConcurrentTransitionTest`) |
| AK-601 | Die Prüfliste zeigt eingereichte Berichte mit Azubi, Woche und Einreichungsdatum; standardmäßig eigene Azubis, per Filter alle. | 2 (2 daten) | gleichwertig |
| AK-602 | Jeder Ausbilder darf jeden eingereichten Bericht freigeben oder ablehnen, auch ohne Zuordnung (Vertretung). | 7 (3 daten, 4 fachlogik) | gleichwertig |
| AK-603 | Bei der Freigabe wird der Status „Freigegeben“; Ausbilder sowie Datum und Uhrzeit werden gespeichert. | 2 (2 daten) | gleichwertig; Zeitpunkt aus der Uhr, UTC |
| AK-604 | Ablehnen geht nur mit nicht leerem Gesamtkommentar; Kommentare und Begründung je bis 5.000 Zeichen. | 8 (6 fachlogik, 2 daten) | gleichwertig; `commentText` als `TEXT` (gemeinsam 2.3) |
| AK-605 | Optionale Tageskommentare zu jedem Tag, auch außerhalb der Ausbildung; beim Freigeben werden eingetippte Kommentare nicht gespeichert. | 3 (3 daten) | gleichwertig |
| AK-606 | Nach einer Ablehnung sieht der Azubi Gesamt- und Tageskommentare, nach einer Rücknahme die Begründung; nach dem erneuten Einreichen nur noch in der Historie. | 3 (3 daten) | gleichwertig |
| AK-607 | Berichte im Status „Entwurf“ kann der Ausbilder weder freigeben noch ablehnen. | 5 (4 fachlogik, 1 daten) | gleichwertig |
| AK-701 | Ein abgelehnter Bericht ist bearbeitbar und erneut einreichbar; danach „Eingereicht“ und wieder in der Prüfliste. | 3 (1 daten, 2 fachlogik) | gleichwertig |
| AK-702 | Der Zyklus aus Ablehnen und erneutem Einreichen funktioniert beliebig oft (dreimal ablehnen, dann freigeben). | 6 (1 daten, 5 fachlogik) | gleichwertig |
| AK-703 | Eine Freigabe lässt sich nur mit nicht leerer Begründung zurücknehmen; danach „Abgelehnt“ und bearbeitbar. | 6 (4 fachlogik, 1 daten, 1 ablauf) | gleichwertig; AK-703-06 ist Szenario (P10) |
| AK-704 | Außer durch die Rücknahme kann niemand einen freigegebenen Bericht ändern, auch kein Ausbilder. | 6 (5 fachlogik, 1 daten) | gleichwertig; Trigger sperrt auch `APPROVED` |

## 6. Empfehlung

**Weg B.** Das Statusmodell ist als Tabelle (4 Status × 6 Aktionen × Rollen) mit festen Fehlercodes vollständig spezifiziert,
und die Daten-Fälle zeigen Gleichzeitigkeit deterministisch (`gesehen`). Die eigentliche Arbeit auf 7.2 ist die Transaktion:
wann eine Abweisung wirft (Rollback) und wann sie ein Ergebnis ist (Tage bleiben). Dafür gibt es keine Vorlage im Quellcode.

## 7. Schritte

1. **Branch** `claude/l72-p05-status-und-pruefung`; Spec (insbesondere M05-R08, M05-R20 und M05-R21) und Prüffälle lesen.
   Prüfschritt: AK-Tabelle im PR-Entwurf, Liste der Fehlercodes aus Abschnitt 6 der Spec notiert.
2. **Entities und Trigger.** `service.xml`: `StatusChange` (`BH_StatusChange`: Bericht, `fromStatus` leer erlaubt, `toStatus`,
   `actorId`, `reason`, `reviewRound` ab 0, `seq` fortlaufend **je Bericht**, `createdAt`) und `Comment` (`BH_Comment`: Bericht,
   `reviewRound`, Tag leer = Gesamtkommentar, `authorId`, `commentText`, `createdAt`) nach gemeinsam 2.3, beide mit
   `mvcc-enabled="false"` und `remote-service="false"`. `BH_WeeklyReport.version` (int, Anfang 0) nach gemeinsam 2.4, falls P03
   sie noch nicht angelegt hat. Das Skript „Schutz in der Datenhaltung“ bekommt die Fremdschlüssel (`actorId`, `authorId`
   `DEFERRABLE INITIALLY DEFERRED`), die CHECK-Constraints aus gemeinsam 2.3 und den Trigger **`report_day_locked`** (`BEFORE
   UPDATE` auf `BH_ReportDay`, weist ab, wenn der Bericht `SUBMITTED` oder `APPROVED` ist; allgemeiner Code `P0001`). Danach
   `buildService`, Datenbank `berichtsheft_l72` neu anlegen, Bundle neu starten. Prüfschritt: ein direktes
   `UPDATE BH_ReportDay` auf einen eingereichten Bericht scheitert mit SQLState `P0001`, der Trigger steht in `pg_trigger`.
3. **Statusmodell** `de.berichtsheft.domain.status` in `bh-domain` (M05-R01 bis M05-R04, M05-R12, M05-R14, M05-R15, M05-R18 bis
   M05-R21; AK-507, AK-508, AK-604, AK-607, AK-703, AK-704): `ReportStatus`, `ReportAction`, `Transitions` (die sechs erlaubten
   Übergänge mit Rolle), `TransitionRules.decide()` mit `SeenState` (Status und Version, die die Person gesehen hat) und festen
   Gründen. Reihenfolge nach M05-R21: `zugriff_verweigert` (Person, Rolle, Besitz); `uebergang_unzulaessig` bzw. die Gründe des
   gesehenen Stands (`bericht_zurueckgezogen`, `bereits_geprueft`, `bereits_eingereicht`, `bereits_zurueckgezogen`,
   `bereits_zurueckgenommen`, `inzwischen_geaendert`); `azubi_deaktiviert`; `kommentar_fehlt`, `begruendung_fehlt`,
   `text_zu_lang` (mit `field` und `days`). Dazu `availableActions()`, `MAX_COMMENT_LENGTH` 5.000, `reviewRoundFor()` (jede
   Einreichung beginnt eine neue Prüfrunde, AK-702), `isOpenStatus()`. Prüfschritt: JUnit-Tests als Tabelle 4 Status × 6 Aktionen
   × Rollen und ein Block `AK508_…` mit den vier Fällen des gesehenen Stands.
4. **Pflichtangaben** `de.berichtsheft.domain.submission` (M05-R05 bis M05-R07; AK-501, AK-502, AK-503, AK-504):
   `SubmissionRules.validate()` mit den Tagesfehlern `tagesart_fehlt` und `taetigkeiten_fehlen` in Kalenderreihenfolge; bei
   Urlaub, Krank und Feiertag kein Text nötig, ein eingetragener bleibt; Tage außerhalb zählen nicht; Woche ganz außerhalb nicht
   einreichbar; laufende Woche schon vor ihrem Ende. Prüfschritt: JUnit-Tests `AK501_…` bis `AK504_…`.
5. **Bearbeitbarkeit und `ModelListener`.** `ReportAccess.canEditReport()` vollständig (Entwurf oder Abgelehnt, nur eigener
   aktiver Azubi, kein Ausbilder in keinem Status; AK-505, AK-506, AK-701, AK-703, AK-704). `ReportDayModelListener extends
   BaseModelListener<ReportDay>` (`@Component(service = ModelListener.class)`) weist in `onBeforeUpdate` und `onBeforeRemove`
   mit `ModelListenerException` ab, wenn der Bericht eingereicht oder freigegeben ist (Profil, Nachweis AK-505, Punkt 3). Die
   Abweisung des Listeners ist ein **technischer** Fehler: Weder Service noch Testschnittstelle deuten sie in den Fachgrund
   `nicht_bearbeitbar` um; diesen liefert nur die Fachlogik. Prüfschritt: JUnit-Tests `AK505_…` und `AK704_…` in `bh-domain`.
6. **Statuswechsel und Einreichen** in `WeeklyReportLocalServiceImpl` (M05-R05 bis M05-R08, M05-R13, M05-R14, M05-R20 bis
   M05-R22), je **eine** Service-Transaktion (`@Transactional(rollbackFor = {PortalException.class, SystemException.class})`,
   Voreinstellung):
   - `transition(long actorUserId, long weeklyReportId, String action, String seenStatus, int seenVersion, String text,
     Map<String, String> dayComments)` nach Profil, Nachweis AK-508: (a) Zeile mit `SELECT … FOR UPDATE` sperren
     (`WeeklyReportFinderImpl`, Custom SQL in `META-INF/custom-sql/default.xml`); (b) `canViewReport()` und
     `TransitionRules.decide()` mit dem gesehenen Stand; jede Abweisung als `ReportTransitionException extends PortalException`
     mit dem Grund aus der Fachlogik, der Service erfindet keinen; (c) **bedingtes Update**
     `UPDATE BH_WeeklyReport SET status = ?, version = version + 1, updatedAt = ? WHERE weeklyReportId = ? AND status = ? AND
     version = ?` mit dem gesehenen Stand über `SQLQuery.executeUpdate()`, genau eine Zeile verlangen, sonst
     `inzwischen_geaendert` (zweite Sicherung); danach `clearCache` des Berichts und das Objekt aus der Hibernate-Sitzung
     entfernen; (d) `BH_StatusChange` mit `seq` je Bericht und `reviewRound` aus der Zahl der bisherigen Einreichungen, Zeitpunkt
     aus `Clock.now()`; (e) beim Ablehnen Gesamtkommentar und Tageskommentare als `BH_Comment` (Tageskommentare nur beim Ablehnen,
     beim Freigeben ignoriert), bei der Rücknahme die Begründung als `reason`.
   - **Zurückrollen:** Eine `PortalException` rollt die ganze Transaktion zurück, auch die mitgespeicherten Tage. Fehlende
     Pflichtangaben sind deshalb ein Ergebnis (`pflichtangaben_fehlen`), keine Ausnahme; die Tage bleiben als Entwurf
     (AK-505-03; Profil 7.2, Abschnitt 3 „Transaktion und Gleichzeitigkeit“).
   - `submit(long actorUserId, long weeklyReportId, String seenStatus, int seenVersion, Map<String, DayInput> days)` gibt ein
     `SubmitResult` zurück: Sperre wie (a), Rechte und Übergang wie (b) – Abweisung wirft vor dem Speichern; ungültige Eingaben
     (`tage_ungueltig`) und nicht bearbeitbarer Bericht (`ReportNotEditableException extends PortalException`, Grund
     `nicht_bearbeitbar`) werfen und rollen alles zurück (AK-505-04); sonst die Tage speichern, dann `SubmissionRules.validate()`
     auf dem gespeicherten Stand. Fehlt eine Pflichtangabe, endet die Methode **normal** mit `SubmitResult.pflichtangabenFehlen(tage)`:
     Status, Version und Historie bleiben unverändert, die Tage als Entwurf gespeichert. Sonst weiter mit (c) bis (e). Kein
     `noRollbackFor`, weil es auch Fehler nach dem Speichern festschreiben würde (Profil, Abschnitt 7).
   Prüfschritt: Daten-Fälle AK-505-02, AK-505-03, AK-505-04 grün.
7. **Einhängepunkt für Benachrichtigungen.** `transition` und `submit` liefern im Ergebnis ein `TransitionEvent` (Bericht,
   Statuswechsel, handelnde Person). P08 schreibt daraus in **derselben** Transaktion in `BH_Notification` und legt den
   `UserNotificationEvent` als Abbild für die Liferay-Glocke an (Profil 3.5); versendet wird nie in der Transaktion, sondern im
   Ausgangskorb-Lauf, synchron über die `javax.mail.Session` des Portals, nicht über den asynchronen `MailService`
   (gemeinsam 3.2). Prüfschritt: Ergebnis trägt das Ereignis; noch kein Versand.
8. **Prüfliste.** `getReviewQueue(long actorUserId, ReviewScope scope)` (eingereichte Berichte, standardmäßig eigene Azubis, per
   Filter alle, letzte Einreichung, älteste zuerst; AK-601, AK-602) und `getRejectionTexts()` (Gesamtkommentar bzw. Begründung
   der aktuellen Ablehnung; AK-606; P06 ersetzt den Zugriff durch `currentFeedback()`). Prüfschritt: Daten-Fälle AK-601-01,
   AK-601-02, AK-606-01 grün.
9. **Portlets** in `bh-web`: MVC-Action-Commands für Einreichen, Zurückziehen, Freigeben, Ablehnen und Freigabe zurücknehmen;
   jeder übergibt nur `userId`, Bericht, Aktion und **gesehenen Stand** (Status und Version als versteckte Felder) an den Service.
   „Einreichen“ ruft `submit` (speichert und reicht ein, UI-AK-09); bei `pflichtangaben_fehlen` Fehlerleiste mit Sprunglinks.
   Prüfformulare mit Rückfrage, Pflichttext, Zeichenzähler; Meldungstext über den Grund. Prüfliste als Portlet (Liste links,
   Bericht rechts, nach der Entscheidung der nächste Bericht per Weiterleitung). Gestaltung folgt in P09. Prüfschritt: Einreichen,
   Prüfen und Zurückziehen von Hand als Anna, Bernd und Clara in Chromium.
10. **Daten-Adapter** in der Testschnittstelle und `DatenPrueffaelleTest`: Bestand leeren, Testdaten und Ausgangsbestand nach
    `specs/pruefung/format.md` herstellen (Berichte mit `tage` und `verlauf`, Uhr), Schritte über **dieselben** Service-Methoden
    wie die Portlets (`einreichen`, `erneut_einreichen`, `zurueckziehen`, `freigeben`, `ablehnen`, `freigabe_zuruecknehmen`,
    `tage_speichern`, `pruefliste_lesen`, `rueckmeldung_lesen`, `person_deaktivieren`, `ausbildungszeitraum_aendern`); `gesehen`
    stellt den Stand nach Schritt `n` nach. Fehler werden über den Grund der Ausnahme bzw. des Ergebnisses gemeldet, nie über den
    Text; eine andere Ausnahme lässt den Fall scheitern. Bestand der genannten Berichte mit Tagen, Historie und Kommentaren
    zurückgeben, Versionsstand nie ausgeben. Prüfschritt:
    `./gradlew :modules:bh-test-integration:testIntegration --tests '*DatenPrueffaelleTest*' -Pbh.pruefung.modul=M05` grün (36 Fälle).
11. **Fachlogik-Adapter.** Schnittstellen `einreichenPruefen`, `uebergangPruefen`, `moeglicheAktionen`, `pruefrunde`,
    `darfBearbeiten`. Prüfschritt: `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M05` grün (59 Fälle).
12. **Plattformeigene Tests** (Arquillian, `bh-test-integration`, Profil „Nachweis AK-505 und AK-508“):
    - `ReportDayProtectionTest.AK505_datenhaltungWeistAendernEinesEingereichtenTagsAb`: direktes JDBC-`UPDATE BH_ReportDay` auf
      einen eingereichten Bericht scheitert mit `P0001`.
    - `ReportDayProtectionTest.AK505_modelListenerWeistAendernUeberDiePersistenzAb`: `reportDayLocalService.updateReportDay(…)` auf
      einen eingereichten Bericht scheitert mit `ModelListenerException`, Daten unverändert.
    - `ConcurrentTransitionTest.AK508_vonZweiGleichzeitigenAktionenGelingtGenauEine`: zwei Threads über einen `CountDownLatch`,
      Anna zieht zurück und Bernd gibt frei, je eigene Transaktion, derselbe gesehene Stand; genau ein Erfolg, der andere
      `ReportTransitionException` mit einem Grund aus M05-R20, `version` genau um 1 gestiegen, genau ein neuer Eintrag in
      `BH_StatusChange`.
    Prüfschritt: `./gradlew :modules:bh-test-integration:testIntegration --tests '*ReportDayProtectionTest*' --tests '*ConcurrentTransitionTest*'` grün.
13. **Gegenproben** (je ein benannter Fehler, je ein roter Lauf, danach zurücknehmen und grün zeigen):

    | Name | Absichtlich eingebauter Fehler | Wird rot | Bleibt grün (und warum) |
    | --- | --- | --- | --- |
    | F-P05-1 „Eingereicht gilt als bearbeitbar“ (AK-505) | `canEditReport()` lässt den Status Eingereicht zu | AK-505-05 (Fachlogik); AK-505-01 (Daten: der zweite Schritt meldet nicht `nicht_bearbeitbar`, weil die Abweisung erst als `ModelListenerException` aus `ReportDayModelListener` kommt) | die Tage bleiben unverändert: Listener und Trigger halten als zweites Netz |
    | F-P05-2 „Pflichtangaben als Ausnahme“ (AK-505) | `submit` wirft bei fehlenden Pflichtangaben eine `PortalException` statt `SubmitResult.pflichtangabenFehlen` | AK-505-03 (die mitgeschickten Tage sind zurückgerollt; Montag zeigt wieder den alten Text) | AK-505-04 (wirft ohnehin) |
    | F-P05-3 „Schutz-Trigger fehlt“ (AK-505) | Trigger `report_day_locked` in der Testdatenbank entfernen | `ReportDayProtectionTest.AK505_datenhaltungWeistAendernEinesEingereichtenTagsAb` | alle Prüffälle: die Daten-Fälle gehen durch die Fachlogik (kein neutraler Fall prüft den Weg an ihr vorbei) |
    | F-P05-4 „Listener aus“ (AK-505) | `ReportDayModelListener` per Gogo-Shell `scr:disable` abschalten | `ReportDayProtectionTest.AK505_modelListenerWeistAendernUeberDiePersistenzAb` (Abweisung kommt erst als `P0001` aus dem Trigger) | `AK505_datenhaltung…` |
    | F-P05-5 „Falscher Grund bei zurückgezogenem Bericht“ (AK-508) | `TransitionRules.decide()` meldet für gesehen Eingereicht, aktuell Entwurf `inzwischen_geaendert` statt `bericht_zurueckgezogen` | AK-508-06, AK-508-07 (Fachlogik), AK-508-01 (Daten) | AK-508-09 |
    | F-P05-6 „Version nicht verglichen“ (AK-508) | `TransitionRules.decide()` vergleicht nur den Status des gesehenen Stands, nicht die Version | AK-508-09 (Fachlogik) | AK-508-04: das bedingte Update mit `version = ?` trifft keine Zeile, der Service meldet `inzwischen_geaendert` (zweite Sicherung wirkt) |
    | F-P05-7 „Ohne Sperre und Bedingung“ (AK-508) | `FOR UPDATE` entfernen und das Update nur mit `WHERE weeklyReportId = ?` schreiben (weder `status` noch `version`) | `ConcurrentTransitionTest.AK508_vonZweiGleichzeitigenAktionenGelingtGenauEine` (zwei Erfolge, zwei Historieneinträge); zusammen mit F-P05-6 auch AK-508-04 (Bernds Freigabe auf veraltetem Stand gelingt) | bleibt `AND status = ?` stehen, wertet PostgreSQL die Bedingung nach dem Warten neu aus, und der Test bliebe grün: deshalb beide Bedingungen entfernen |

    Prüfschritt: sieben rote Läufe mit den benannten Fällen im PR notiert, danach alles grün.
14. **Ablauf-Aktionen** für die Szenarien: `einreichen`, `freigeben`, `ablehnen`, `freigabe_zuruecknehmen` (Rückfrage bestätigt,
    ungespeicherte Eingaben werden mitgespeichert), Seite `pruefliste` mit `eintraege` und `ausgewaehlt`; fertig, wenn die App es
    über den festen Merker meldet. Prüfschritt: AK-502-04 und AK-703-06 laufen in Chromium bis zum ersten Schritt, der P06 oder
    P09 braucht; verbindlich erst in P10.
15. **Bau-Stand.** M05 eintragen. Prüfung nach Abschnitt 8.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M05` | 59 Fachlogik-Fälle grün |
| `./gradlew :modules:bh-test-integration:testIntegration --tests '*DatenPrueffaelleTest*' -Pbh.pruefung.modul=M05` | 36 Daten-Fälle grün |
| `./gradlew :modules:bh-domain:test` | JUnit-Tests des Statusmodells, der Pflichtprüfung und der Bearbeitbarkeit grün |
| `./gradlew :modules:bh-test-integration:testIntegration --tests '*ReportDayProtectionTest*' --tests '*ConcurrentTransitionTest*'` | grün (Nachweis AK-505 und AK-508) |
| `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium --project=smartphone-375` | Ablauf-Fälle der gebauten Module grün; AK-502-04 und AK-703-06 vorbereitet |
| `./gradlew build formatSource` | grün, keine Änderungen |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

## 9. Abschluss

- Commit, z. B. „L72-P05: Status und Prüfung (Statusmodell, Einreichen, Prüfliste, Nachweis AK-505 und AK-508)“; vor dem Push
  `./gradlew build` und alle Prüf-Adapter von M05 lokal grün.
- Draft-PR mit der AK-Tabelle (AK-501, AK-502, AK-503, AK-504, AK-505, AK-506, AK-507, AK-508, AK-601, AK-602, AK-603, AK-604,
  AK-605, AK-606, AK-607, AK-701, AK-702, AK-703, AK-704 mit Test und Prüffällen), dem Nachweis AK-505 und AK-508 (Verweis auf das
  Profil, Testnamen), der Tabelle der Gegenproben mit den roten Fällen und „Bitte bestätigen“. Geschützte Pfade: `service.xml`,
  `**/sql/**`, `**/model/listener/**`, `**/custom-sql/**`, `**/service/persistence/impl/**`, `**/service/impl/**`,
  `**/upgrade/**` (gemeinsam 5); Chris mergt.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Eingaben sind weg, wenn nur die Pflichtprüfung scheitert | `pflichtangaben_fehlen` ist ein Ergebnis, keine `PortalException`; die Transaktion endet normal (AK-505-03) |
| Halber Statuswechsel festgeschrieben | eine Abweisung ohne `PortalException` als Oberklasse rollt nicht zurück; jede Abweisung außer `pflichtangaben_fehlen` wirft eine Unterklasse von `PortalException` |
| `noRollbackFor` soll die Tage retten | nicht verwenden: es schreibt auch Fehler nach dem Speichern fest (Profil, Abschnitt 7) |
| Beide gleichzeitigen Aktionen gelingen | Sperre `FOR UPDATE` und bedingtes Update mit Status **und** Version; Version bei jedem Wechsel erhöhen (AK-508) |
| Service liest nach dem Update den alten Status | `clearCache` des Berichts und Objekt aus der Hibernate-Sitzung entfernen (gemeinsam 2.4, Profil, Abschnitt 7) |
| Daten-Fall meldet `nicht_bearbeitbar`, obwohl die Fachlogik falsch ist | die `ModelListenerException` nie in einen Fachgrund umdeuten; den Grund liefert nur `canEditReport()` |
| Ausbilder kann Tage eines freigegebenen Berichts ändern | Trigger und Listener prüfen nur `SUBMITTED`; auch `APPROVED` sperren (AK-704) |
| Meldung falsch nach gleichzeitiger Aktion | Gründe nur aus `TransitionRules.decide()`; trifft das bedingte Update keine Zeile, `inzwischen_geaendert` |
| Zeitpunkt der Historie weicht von der Prüffall-Uhr ab | „jetzt“ nur aus `Clock.now()`, nie Datenbank-Default oder `new Date()` |
| Prüfrunde falsch | Einreichungen aus der Historie zählen (`reviewRoundFor()`), nicht am Bericht speichern |
| Tageskommentare an freigegebenem Bericht gespeichert | `dayComments` nur beim Ablehnen auswerten |
| Mail-Versand blockiert oder verliert Fehler | nie in der Statuswechsel-Transaktion senden; Ausgangskorb (P08) sendet synchron über die `javax.mail.Session`, nicht über `MailService` |

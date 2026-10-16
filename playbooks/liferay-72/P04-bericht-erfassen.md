# P04 Bericht erfassen (M04)

Reihe `playbooks/liferay-72/` · Plattform Liferay Portal 7.2 CE · Profil `profile/liferay-72.md` (baut auf
`profile/liferay-gemeinsam.md` auf) · Stand: 16.10.2026 (Etappe G4, Paket K) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Ein Azubi erfasst seine Woche: Tagesart und Tätigkeiten je Tag (Mo–Fr), Speichern als Entwurf mit Prüfung auf dem Server,
Zeichenzähler, Hinweis „Feiertag (vorbelegt)“ und Warnung beim Verlassen mit ungespeicherten Änderungen. Fachregeln liegen als
reine Java-Klassen in `bh-domain`, das Speichern in `WeeklyReportLocalServiceImpl` (Sperre des Berichts, alles oder nichts), der
Editor in einem Portlet von `bh-web`. Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M04.json` über die Prüf-Adapter grün sind (7 AK-IDs; 19 Fachlogik- und 9 Ablauf-Fälle, keine
   Daten- und keine Szenario-Fälle), außer AK-408-07: Er braucht `einreichen` (P05) und die Historie (P06) und bleibt bis dahin
   sichtbar „noch nicht gebaut“; die Ablauf-Fälle sind damit 8 grün und 1 zurückgestellt;
2. AK-305-09 aus `specs/pruefung/M03.json` (Tage außerhalb der Ausbildung lassen sich nicht ändern, Schnittstelle `tageSpeichern`)
   freigegeben und grün ist;
3. die plattformeigenen Tests grün sind: `ReportDaySaveTest` (Alles oder nichts, Sperre gegen gleichzeitigen Statuswechsel, Rechte
   und Besitz, Zeichen unverändert) und `DayViewTest` (Merker „vorbelegt“);
4. jede Gegenprobe aus Schritt 11 die dort benannten Prüffälle bzw. Tests rot gemacht hat und zurückgenommen ist.

Keine Schemaänderung: M04 ändert nur Inhalte der Tabelle `BH_ReportDay` aus P03. Keine Abweichung gegenüber der TypeScript-App.

## 2. Voraussetzungen

- L72-P00 bis L72-P03 abgenommen und gemergt (Berichte und Tage existieren, Bundesland, Zugriff, Merker „vorbelegt“).
- Profil 7.2: Abschnitte 3 (Transaktion und Gleichzeitigkeit, Oberfläche), 4 (Ablauf-Adapter, plattformeigene Tests) und 7
  („`PortalException` und Rollback“, Senna, „Service Builder schreibt am Cache vorbei“); gemeinsam 2.3 (`BH_ReportDay`), 2.4 (Sperre
  und Cache).
- **Senna ist für die Site „Berichtsheft“ abgeschaltet** (P00, Profil 7.2, Abschnitt 7): Jede Navigation lädt die Seite neu; die
  Warnung stützt sich auf `beforeunload` und auf die Links der App, nicht auf die SPA-Navigation von Liferay.

## 3. Eingaben

- Fach-Spec: `specs/M04-bericht-erfassen.md` (Regeln M04-R01 bis M04-R13, Abschnitt 5 Datenmodell, Abschnitt 6 Schnittstellen,
  Abschnitt 8 Anforderungen an die Plattform).
- Prüffälle: `specs/pruefung/M04.json` und `specs/pruefung/M03.json` (nur AK-305-09); Schnittstellen, Formate und
  Ablauf-Aktionen: `specs/pruefung/format.md`, „Schnittstellen von M04“ und „Aufbau eines Ablauf-Falls“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M04 Bericht erfassen“ (Spalte „Plattformgebunden“, „Fallen“).
- UI-Vorgaben (Referenz): `docs/05-ui-spezifikation.md`; Gegenstück der Referenz-Umsetzung: `playbooks/typescript/P04-bericht-erfassen.md`.
- Testgrenze der Referenz: `e2e/pruefung/testgrenzen.ts` (AK-408-03 in Firefox, Q-R06); für 7.2 entscheidet P10.

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. `src/domain/report-days.ts` (`DAY_TYPES`, `normalizeActivities()`, `activitiesLength()`,
`validateDayInputs()`, `hasContent()`) lässt sich 1:1 nach Java übersetzen; dabei zählt die Länge Unicode-Zeichen
(`String.codePointCount`), nicht UTF-16-Einheiten. Nicht übertragbar sind `saveReportDays()` in `src/lib/reports.ts` (Prisma,
Formularfelder) und die Next.js-Dateien unter `src/app/(app)/berichte/[id]/` (`actions.ts`, `ReportEditor.tsx`, `ReportView.tsx`):
Auf 7.2 ersetzen sie Service Builder mit Custom SQL, MVC-Commands und JSP (Schritte 5 bis 7). Belege der Referenz:
`src/domain/report-days.test.ts`, `tests/db/reports.test.ts`, `e2e/ak-301-408-berichte-erfassen.spec.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Regeln für Tagesarten und Texte, (2) Bearbeitbarkeit, (3) Speichern mit Sperre, (4) Editor und Merker, (5)
Warnung beim Verlassen, (6) Adapter, (7) plattformeigene Tests und Gegenproben. Zu jedem AK die Prüffälle (alle in
`specs/pruefung/M04.json`; Zählweise: Prüffälle **ohne** Ablauf-Szenario, M04 hat keines):

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Bewertung auf 7.2 |
| --- | --- | --- | --- |
| AK-401 | Jeder Bericht zeigt Mo–Fr mit Datum, pro Tag eine Auswahl der Tagesart und ein Freitextfeld „Tätigkeiten“. | 2 (2 fachlogik) | gleichwertig; die Anzeige belegt zusätzlich AK-403-01 |
| AK-402 | Zur Auswahl stehen genau: Betrieb, Berufsschule, Urlaub, Krank, Feiertag. | 4 (4 fachlogik) | gleichwertig; Anzeigewerte deutsch, gespeicherte Werte `WORK`, `SCHOOL`, `VACATION`, `SICK`, `HOLIDAY` (gemeinsam 2.1) |
| AK-403 | Felder für Stunden, Abteilung oder Lernfeld gibt es nicht. | 2 (2 ablauf) | gleichwertig; das JSP bietet je Tag genau zwei Felder, der Adapter meldet jedes weitere als `ohne_merker` |
| AK-405 | Der Azubi kann eine vorbelegte Tagesart ändern, z. B. von „Feiertag“ auf „Berufsschule“. | 2 (2 fachlogik) | gleichwertig; Hinweis nach dem gespeicherten Merker, Test `DayViewTest.AK405_…` |
| AK-406 | Ein Entwurf lässt sich ausdrücklich speichern, auch unvollständig, und später unverändert weiterbearbeiten, auch nach Ab- und erneuter Anmeldung. | 3 (3 fachlogik) | gleichwertig; Sperre und Prüfung im Service, Test `ReportDaySaveTest.AK406_…` |
| AK-407 | Umlaute, Zeilenumbrüche und lange Texte (mindestens 2.000 Zeichen) unverändert; höchstens 5.000 Zeichen je Tag mit Meldung am Feld; Zeilenumbrüche einheitlich. | 8 (8 fachlogik) | gleichwertig; `activities` als `TEXT` (gemeinsam 2.3), Länge in Unicode-Zeichen |
| AK-408 | Wer die Seite mit ungespeicherten Änderungen verlässt, wird gewarnt (Links, Formulare, Schließen, Neuladen, Zurück und Vor). | 7 (7 ablauf) | gleichwertig bei abgeschaltetem Senna; AK-408-07 zurückgestellt bis P06; AK-408-03 in Firefox nur in CI (P10, Schritt 8) |

Summe: 7 AK-IDs, 28 Prüffälle (19 fachlogik, 0 daten, 9 ablauf, 0 Szenario), davon AK-408-07 zurückgestellt; dazu AK-305-09 aus M03.

## 6. Empfehlung

**Weg B.** Die Regeln und Prüffälle sind eng, und der Plattformteil (Sperre, Alles oder nichts, Warnung ohne SPA) hat in der
Referenz kein übertragbares Gegenstück. Weg A nur für `report-days.ts` und nur auf ausdrücklichen Auftrag.

## 7. Schritte

1. **Branch** `claude/l72-p04-bericht-erfassen`; Spec (insbesondere M04-R05, M04-R07, M04-R09 bis M04-R13) und Prüffälle lesen.
   Prüfschritt: AK-Tabelle (Abschnitt 5) im PR-Entwurf; Liste der Fehlercodes (`tage_ungueltig` mit `tagesart_unbekannt` und
   `text_zu_lang`) notiert.
2. **Regeln** `de.berichtsheft.domain.days` in `bh-domain` (M04-R02, M04-R04, M04-R06 bis M04-R11; AK-402, AK-405, AK-406, AK-407,
   AK-305): `DayType` (genau fünf Werte in fester Reihenfolge, Anzeigename und gespeicherter Wert), `Activities.normalize()`
   (`\r\n` und `\r` zu `\n`, sonst unverändert, nichts gekürzt), `Activities.length()` über `codePointCount` **nach** der
   Normalisierung, `MAX_LENGTH` 5.000, `Activities.error()` („um n kürzen“, Fehlercode `text_zu_lang`), `hasContent()` (mindestens
   ein Tag mit Tagesart oder Text; P03 und P07 nutzen es) und `DayInputs.validate(days, inputs)` mit `EditableDay`, `DayInput`,
   `DayUpdate`, `DayErrors`: nicht mitgeschickt (`null`) bleibt, leer (`""`) leert die Tagesart, unveränderte Tage fehlen im
   Ergebnis, Tage außerhalb der Ausbildung bleiben unverändert und ohne Fehler, alle Fehler je Tag auf einmal in der Reihenfolge
   `tagesart_unbekannt`, `text_zu_lang`; bei einem Fehler wird nichts übernommen. Prüfschritt: JUnit-Tests `AK402_…`, `AK405_…`,
   `AK406_…` und `AK407_…` in `bh-domain`.
3. **Bearbeitbarkeit** `ReportAccess.canEditReport()` (Paket `de.berichtsheft.domain.access`, aus P02): nur der eigene, aktive Azubi
   und nur bei offenem Status (Entwurf oder Abgelehnt; AK-204); jeder Ausbilder und jede andere Person nein. P05 vervollständigt die
   Fälle zu AK-505 und AK-704; hier genügen die vier Status als Tabelle. Prüfschritt: JUnit-Test mit 4 Status × Rolle × aktiv.
4. **Fachlogik-Adapter** für `tagesarten` und `tageSpeichern` (Formate nach `specs/pruefung/format.md`: Tagesart `Betrieb` … `Feiertag`,
   `null` = keine, `""` = geleert; Fehler `tage_ungueltig` mit `"tage": [{ "tag", "fehler": [<Code>, …] }]`) und für
   `berichtstageAnlegen` aus P03 (AK-401-01, AK-401-02). Eine Tagesart außerhalb der fünf gibt der Adapter unverändert weiter.
   Prüfschritt: `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M04` meldet 19 grüne Fachlogik-Fälle; AK-305-09 aus M03 ist
   freigegeben und grün (`-Pbh.pruefung.modul=M03` zeigt jetzt 39 grüne Fälle).
5. **Speichern** in `WeeklyReportLocalServiceImpl` (M04-R06, M04-R12; AK-406, AK-204, AK-407): `saveDays(long actorUserId, long
   weeklyReportId, List<DayInput> inputs)` in **einer** Transaktion (Voreinstellung `@Transactional(rollbackFor =
   {PortalException.class, SystemException.class})`):
   - (a) Zeile des Berichts mit `SELECT … FOR UPDATE` sperren (`WeeklyReportFinderImpl`, Custom SQL in
     `META-INF/custom-sql/default.xml`, gemeinsam 2.4, Schritt 1); der Finder liefert Status, Version und Besitzer **aus dieser
     Abfrage**, nicht aus dem Entity-Cache: Nur so gilt der Status, der beim Speichern tatsächlich gilt (Spec, Abschnitt 8). P05
     nutzt denselben Finder für die Statuswechsel; jede Methode, die Tage eines bestehenden Berichts schreibt, beginnt mit dieser
     Sperre.
   - (b) Rolle, Besitz und Bearbeitbarkeit prüfen (`canEditReport()` gegen `BH_Person` des Handelnden): Abweisung als
     `ReportNotEditableException extends PortalException` mit festem Grund (`zugriff_verweigert` bzw. `nicht_bearbeitbar`); der
     Service erfindet keinen Grund, die Oberfläche wählt den Text über den Grund.
   - (c) `DayInputs.validate()` auf dem gelesenen Stand; Ergebnis mit Fehlern → `ReportDaysInvalidException extends PortalException`
     (Grund `tage_ungueltig`, Fehlercodes je Tag). Die Ausnahme rollt zurück; es wurde noch nichts geschrieben, und die Eingaben
     der Person bleiben im Formular (Schritt 6).
   - (d) Nur die geänderten Tage über `ReportDayLocalService.updateReportDay(…)` schreiben (Service Builder; ein später in P05
     angelegter `ReportDayModelListener` weist dann Tage eingereichter Berichte ab). `version` und `status` bleiben unverändert
     (gemeinsam 2.4); keine Historie, keine Nachricht (M04 Abschnitt 7).
   - Die Schreib- und Prüflogik steckt in einer Hilfsklasse im Paket der Service-Implementierung (ohne eigene Sperre; der Aufrufer
     sperrt); P05 ruft sie in `submit` nach seiner eigenen Sperre, damit Speichern und Einreichen dieselbe Regel nutzen.
   Prüfschritt: `ReportDaySaveTest.AK407_ungueltigeEingabeSpeichertNichts` (Montag gültig, Dienstag 5.001 Zeichen: nach der
   `ReportDaysInvalidException` ist Montag unverändert), `ReportDaySaveTest.AK406_entwurfOhneTagesartLaesstSichSpeichern`.
6. **Editor und Merker** in `bh-web`, Gestaltung folgt in P09: ein Portlet „Bericht“ (JSP, `MVCPortlet`) mit Kopf (Woche, Status,
   `data-woche`, `data-status`), je Tag Wochentag und Datum, Auswahl der Tagesart (genau die fünf Werte; bei vorbelegtem Tag heißt
   „Feiertag“ „Feiertag (vorbelegt)“) und ein Textfeld „Tätigkeiten“ mit Zeichenzähler (Zeichen wie der Server: Unicode-Zeichen),
   Fußleiste mit „Gespeichert“ bzw. „Ungespeicherte Änderungen“ (`data-ungespeichert`), Fehlermeldungen am Feld (`data-fehler`,
   Sprunglink). Tage außerhalb der Ausbildung sind ausgegraut und nicht bearbeitbar. **Genau diese zwei Felder pro Tag** (AK-403);
   `data-feld="tagesart"` und `data-feld="taetigkeiten"` sind die einzigen Merker für Eingabefelder. Ein `MVCActionCommand`
   „Speichern“ übergibt nur `userId`, Bericht und die Formularwerte (`null` für nicht mitgeschickte Felder, `""` für geleert) an
   `saveDays`; er fängt `ReportDaysInvalidException` und `ReportNotEditableException` und zeigt das Formular mit den
   eingegebenen Werten und den Meldungen am Feld wieder an. Der Hinweis „vorbelegt“ kommt aus `DayView` (Service-Methode
   `getReportForEdit(actorUserId, weeklyReportId)`), das den **gespeicherten** Merker `holidayPreset` liest, nicht
   `Holidays.isHoliday()` mit dem aktuellen Bundesland (M04-R05; AK-404 bleibt in M01). Zugriff über `canViewReport()`, ein
   Ausbilder sieht den Bericht ohne Eingabefelder (`tage` ist dann `null`). Prüfschritt: Als Anna einen Entwurf speichern, abmelden,
   anmelden: Inhalt unverändert (AK-406); `DayViewTest.AK405_hinweisVorbelegtFolgtDemGespeichertenMerker` (Bundesland nach dem Anlegen
   gewechselt: der Hinweis bleibt; Tagesart geändert: der Hinweis bleibt; Tag, der erst nach dem Wechsel Feiertag wäre: kein
   Hinweis).
7. **Warnung beim Verlassen** (M04-R13, AK-408) als Skript des Portlets, bei abgeschaltetem Senna:
   - ungespeicherte Änderung = Formularwert weicht von `defaultValue` bzw. dem Ausgangswert ab; so ist die Erkennung unabhängig davon,
     wann das Skript geladen wird;
   - `beforeunload` für Neuladen, Schließen, Zurück und Vor (Dialog des Browsers);
   - ein Klick-Handler in der Fangphase auf `document` für alle Links und Formulare der App, auch die des Themes (Navigation,
     „Abmelden“): bei ungespeicherten Änderungen erst die Rückfrage der App als eigener `<dialog>` (UI-AK-18, kein
     `Liferay.Util.openModal`), „Bleiben“ bricht ab, „Verlassen“ setzt die Navigation fort, ohne dass zusätzlich der Dialog des
     Browsers erscheint;
   - nach „Speichern“ lädt die Seite neu (Weiterleitung nach dem Absenden), der Ausgangswert ist der gespeicherte Stand, keine Warnung
     mehr;
   - Merker `data-ungespeichert`, `data-warnung-verlassen` und die übrigen Merker der Referenz (Liste in `specs/code-landkarte.md`,
     Abschnitt „M09 Oberfläche“).
   Prüfschritt: von Hand in Chromium: Eingabe, dann Link, „Abmelden“, Neuladen, Zurück: jeweils Warnung; nach dem Speichern nicht.
8. **Ablauf-Adapter.** Aktionen `tag_erfassen` (Tagesart wählen und Text füllen, ohne zu speichern), `speichern`
   (`{ "gespeichert": true }`), `seite_verlassen` (alle fünf Wege `link`, `neu_laden`, `zurueck`, `vor`, `schliessen`, Dialog
   `abbrechen` oder `bestaetigen`), `seite_aufrufen` und `seite_lesen` auf der Seite `bericht` mit `woche`, `status`,
   `ungespeichert`, `tage` (je Tag die Felder `tagesart` und `taetigkeiten`), `weitere_felder` (jedes andere Eingabefeld als
   `ohne_merker`) und `historie` (bis P06 immer die leere Liste). Das Seiten-Ergebnis meldet `warnung` mit dem Code
   `ungespeicherte_aenderungen`, wenn die App oder der Browser gewarnt hat. Die Aktion `einreichen` kommt mit P05, die Historie mit
   P06; AK-408-07 bleibt bis dahin sichtbar „noch nicht gebaut“ (Annotation mit Grund im Bericht von Playwright, nie still).
   Prüfschritt: `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium --project=smartphone-375`
   zeigt AK-403-01, AK-403-02 und AK-408-01 bis AK-408-06 grün, AK-408-07 als zurückgestellt.
9. **Plattformeigene Tests** (Arquillian, `bh-test-integration`) in `ReportDaySaveTest`:
   - `AK407_umlauteUndEmojiBleibenNachDemSpeichernUnveraendert`: Text aus AK-407-01 und ein Emoji speichern, neu lesen
     (Datenbank, nicht Cache): zeichengleich bis auf einheitliche `\n`.
   - `AK406_speichernWartetAufGleichzeitigenStatuswechsel`: Thread A sperrt den Bericht, setzt den Status per SQL auf `SUBMITTED` und
     wartet; Thread B ruft `saveDays` und blockiert; nach dem Freigeben von A scheitert B mit `ReportNotEditableException` (Grund
     `nicht_bearbeitbar`), die Tage sind unverändert (M04-R12).
   - `AK204_deaktivierterAzubiKannNichtSpeichern` und `AK406_nurDerEigeneAzubiDarfSpeichern`: Anna deaktiviert bzw. Bernd als
     Ausbilder ruft `saveDays` auf Annas Bericht: `ReportNotEditableException`, Tage unverändert.
   Prüfschritt: `./gradlew :modules:bh-test-integration:testIntegration --tests '*ReportDaySaveTest*' --tests '*DayViewTest*'` grün.
10. **Bau-Stand.** M04 in die Bau-Liste eintragen und AK-305-09 freigeben; AK-408-07 bleibt zurückgestellt bis P06 (vorher
    `einreichen` aus P05). Prüfung nach Abschnitt 8.
11. **Gegenproben** (je ein benannter Fehler, je ein roter Lauf, danach zurücknehmen und grün zeigen):

    | Name | Absichtlich eingebauter Fehler | Wird rot | Bleibt grün (und warum) |
    | --- | --- | --- | --- |
    | F-P04-1 „Jede Tagesart gilt“ (AK-402) | `DayType.isValid()` nimmt jeden nicht leeren Text an | AK-402-02, AK-402-03, AK-407-08 | AK-402-01, AK-402-04 (die fünf gültigen Werte) |
    | F-P04-2 „Länge in UTF-16-Einheiten“ (AK-407) | `Activities.length()` nimmt `String.length()` statt `codePointCount` | AK-407-07 | AK-407-04, AK-407-05 (nur Zeichen der Grundebene) |
    | F-P04-3 „Zählen vor dem Vereinheitlichen“ (AK-407) | `Activities.length()` zählt den Rohtext vor `normalize()` | AK-407-06 | AK-407-02 (kurzer Text), AK-407-07 |
    | F-P04-4 „Zeilenumbrüche bleiben roh“ (AK-407) | `normalize()` macht nichts | AK-407-02, AK-407-06 | AK-407-01 (nur `\n`) |
    | F-P04-5 „Text wird gekürzt“ (AK-407) | beim Speichern `trim()` auf den Text | AK-407-01, AK-407-06 (Leerzeichen bzw. Zeilenumbruch am Ende) | AK-407-03, AK-407-04, AK-407-07 (kein Rand aus Leerzeichen) |
    | F-P04-6 „Nicht mitgeschickt wird geleert“ (AK-406) | `validate()` behandelt `null` wie `""` | AK-406-02, AK-406-03 | AK-406-01 (die Tagesart wird ausdrücklich geleert) |
    | F-P04-7 „Tage außerhalb änderbar“ (AK-305) | `validate()` ignoriert `ausserhalb` | AK-305-09 (M03.json) | AK-402-04, AK-405-01 (alle Tage innerhalb) |
    | F-P04-8 „Teilweise gespeichert“ (AK-407) | `saveDays` schreibt Tag für Tag und prüft den nächsten erst danach (Ergebnis statt Ausnahme) | `ReportDaySaveTest.AK407_ungueltigeEingabeSpeichertNichts` | alle Fachlogik-Fälle: `tage_ungueltig` meldet der Adapter ohne Datenbank |
    | F-P04-9 „Ohne Sperre“ (M04-R12) | `FOR UPDATE` entfernen und den Status aus dem Entity-Cache lesen | `ReportDaySaveTest.AK406_speichernWartetAufGleichzeitigenStatuswechsel` (B schreibt in den eingereichten Bericht) | alle Prüffälle: kein neutraler Fall zeigt Gleichzeitigkeit |
    | F-P04-10 „Besitz nicht geprüft“ (AK-406) | `canEditReport()` ignoriert Besitz und `active` | `ReportDaySaveTest.AK204_deaktivierterAzubiKannNichtSpeichern`, `ReportDaySaveTest.AK406_nurDerEigeneAzubiDarfSpeichern` | AK-406-01 bis AK-406-03 |
    | F-P04-11 „Hinweis aus dem Bundesland“ (AK-405) | `DayView` berechnet „vorbelegt“ mit `Holidays.isHoliday()` aus dem aktuellen Bundesland | `DayViewTest.AK405_hinweisVorbelegtFolgtDemGespeichertenMerker` | AK-405-01, AK-405-02 (Fachlogik der Auswahl) |
    | F-P04-12 „Weiteres Feld im Editor“ (AK-403) | ein Eingabefeld `data-feld="stunden"` je Tag ins JSP | AK-403-01, AK-403-02 (`weitere_felder` bzw. `felder` nicht leer) | AK-408-01 bis AK-408-06 |
    | F-P04-13 „Kein beforeunload“ (AK-408) | den `beforeunload`-Handler entfernen | AK-408-03, AK-408-04, AK-408-05 | AK-408-01, AK-408-02, AK-408-06 (Rückfrage der App bzw. keine Änderung) |
    | F-P04-14 „Abmelden nicht abgefangen“ (AK-408) | der Klick-Handler ignoriert Links des Themes | AK-408-02 | AK-408-01 (Link innerhalb des Portlets) |

    Prüfschritt: vierzehn rote Läufe mit den benannten Fällen im PR notiert, danach alles grün.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M04` | 19 Fachlogik-Fälle grün, keiner rot |
| `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M03` | 39 Fälle grün (AK-305-09 jetzt freigegeben) |
| `./gradlew :modules:bh-domain:test` | JUnit-Tests `AK402_…` bis `AK407_…` grün; Systemzeit-Prüfung grün |
| `./gradlew :modules:bh-test-integration:testIntegration --tests '*ReportDaySaveTest*' --tests '*DayViewTest*'` | grün (Alles oder nichts, Sperre, Rechte, Zeichen, Merker) |
| `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium --project=smartphone-375` | AK-403-01, AK-403-02 und AK-408-01 bis AK-408-06 grün; AK-408-07 sichtbar zurückgestellt |
| `./gradlew build formatSource` | grün, keine Änderungen |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: Firefox und Edge. AK-408-03 in Firefox übernimmt die Testgrenze der Referenz nicht automatisch; ob 7.2 sie braucht,
entscheidet P10 (Schritt 8). Im PR vermerken.

## 9. Abschluss

- Commit, z. B. „L72-P04: Bericht erfassen (Editor, Speichern mit Sperre, Warnung beim Verlassen)“; vor dem Push `./gradlew build`,
  die Prüf-Adapter von M04 und die plattformeigenen Tests lokal grün.
- Draft-PR mit der AK-Tabelle (AK-401, AK-402, AK-403, AK-405, AK-406, AK-407, AK-408 mit Test und Prüffällen), dem freigegebenen
  Fall AK-305-09, dem zurückgestellten Fall AK-408-07, den Gegenproben mit den roten Fällen und „Bitte bestätigen“. Geschützte
  Pfade: `**/service/impl/**`, `**/custom-sql/**`, `**/service/persistence/impl/**` und `**/domain/access/**` (gemeinsam 5); Chris
  mergt.
- Bericht an die Steuerung per `send_message`; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Zeichenzähler und Server weichen bei Emojis ab | Länge in Unicode-Zeichen (`codePointCount`, im Browser `Array.from`), nie `String.length` |
| `\r\n` in der Datenbank | Browser senden CRLF; vor dem Zählen und Speichern `normalize()` |
| Leeres Feld wird übersehen | nicht mitgeschickt (`null`) bleibt, leer (`""`) leert die Tagesart |
| Ungültige Eingabe verliert die Eingaben der Person | `ReportDaysInvalidException` im `MVCActionCommand` fangen und das Formular mit den Eingaben wieder anzeigen; die Ausnahme rollt nur die (noch leere) Transaktion zurück |
| Speichern überfährt ein gleichzeitiges Einreichen | Sperre `FOR UPDATE` und Status aus der Sperr-Abfrage, nicht aus dem Entity-Cache (Profil, Abschnitt 7) |
| Hinweis „Feiertag (vorbelegt)“ stimmt nach Bundeslandwechsel nicht | den gespeicherten Merker `holidayPreset` lesen |
| Warnung fehlt bei Links des Themes (Abmelden) | Klick-Handler in der Fangphase auf `document`, nicht nur im Portlet |
| Doppelte Rückfrage beim Verlassen | nach „Verlassen“ im eigenen Dialog den `beforeunload`-Handler für diese Navigation abschalten |
| Warnung und Seitentitel verloren nach Seitenwechsel | Senna (SPA) ist für die Site nicht abgeschaltet; P00, Profil 7.2, Abschnitt 7 |
| Umlaute kommen falsch an | Anfragen und Antworten als UTF-8; Test `AK407_umlauteUndEmojiBleibenNachDemSpeichernUnveraendert` zeigt es |
| Ablauf-Fall findet ein Feld nicht | feste Merker (`data-feld`, `data-woche`) nicht umbenennen; der Adapter liest nie Meldungstexte |

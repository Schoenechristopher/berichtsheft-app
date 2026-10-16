# P07 PDF-Export (M07)

Reihe `playbooks/liferay-625/` · Plattform Liferay Portal 6.2.5 CE GA6 · Profil `profile/liferay-625.md` (auf Grundlage
von `profile/liferay-gemeinsam.md`) · Stand: 16.10.2026 (Etappe G4, Paket J) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Eine Woche und ein frei wählbarer Zeitraum lassen sich als PDF exportieren: Name, Kalenderwoche, Zeitraum, Tage mit
Datum, Tagesart und Tätigkeiten, Status, Freigabevermerk der aktuell gültigen Freigabe bzw. Kennzeichnung „Nicht freigegeben“,
jede Woche auf einer neuen Seite, Umlaute und lange Texte vollständig. Der Inhalt entsteht in reinen Java-Klassen unter
`de.berichtsheft.domain.pdf`, das Layout mit Apache PDFBox 2.0.37 und der eingebetteten Schrift Noto Sans unter
`de.berichtsheft.pdf`, geliefert über die Ressource-URL (`serveResource`) eines Portlets. Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M07.json` grün sind (7 AK-IDs; 24 Fachlogik- und 5 Daten-Fälle);
2. die eigenen Tests grün sind: die Unit-Tests am erzeugten PDF `AK902_JedeWocheBeginntAufNeuerSeiteTest`,
   `AK904_KopfUndFussProSeiteTest`, `AK907_PdfEnthaeltVollstaendigenTextTest`,
   `AK907_ZeichenOhneGlyphBrichtDenExportNichtAbTest`, `AK902_SammelPdfOhneWochenZeigtHinweisTest` und
   `AK902_SammelPdfMit150WochenTest` in `test/unit/`, `AK906_ExportPrueftZugriffJeAbrufTest` und `AK902_SammelPdfLegtFehlendeWochenAnTest` in
   `test/integration/` und der Playwright-Test `ak-901-907-pdf-export.spec.ts` (Schritt 9; die Prüffälle prüfen den **Inhalt** eines PDF, nicht das
   gedruckte Dokument, den Download und den Zwischenspeicher);
3. die **Gegenprobe** aus Schritt 10 durchgeführt ist: jeder benannte Fehler macht genau die benannten Prüffälle bzw.
   Tests rot und ist danach zurückgenommen;
4. die Prüffälle von M01 bis M06 weiterhin grün sind.

Schemaänderung: nein. M07 speichert nichts (Fach-Spec M07, Abschnitt 5). Neue Bibliothek: PDFBox 2.0.37 und die Schrift Noto Sans
(gemeinsames Profil, Abschnitt 7) in `ivy.xml`.

## 2. Voraussetzungen

- P00 bis P06 der Reihe abgenommen: Berichte, Tage, Wochen und Übersicht (P03, P04), Statuswechsel mit Freigabe und
  Rücknahme (P05) und die Historie mit `currentApproval()` (P06, `de.berichtsheft.domain.history.ReportHistory`); Personen und
  Sichtbarkeit `canViewReport()` (P02); Uhr, Wochen und Zeitzone (P01). P07 hat keinen Vorgänger in M07, aber alle Daten-Fälle
  brauchen `freigeben` und `freigabe_zuruecknehmen` aus P05.
- Profil 6.2.5, Abschnitte 3 (PDF, Transaktion, Oberfläche), 4.1, 4.2 und 7 („Lesende Transaktionen“, „Zurückrollen“,
  „Mehrere Klassenlader“, JSP mit Jasper von Tomcat 7, `build.auto.upgrade`). Gemeinsames Profil, Abschnitte 2.2 (Uhr, Zeit in UTC), 3.2 und 7
  (PDFBox, Noto Sans).

## 3. Eingaben

- Fach-Spec: `specs/M07-pdf-export.md` (Regeln M07-R01 bis M07-R14, Abschnitt 5, Abschnitt 6 Schnittstellen, Abschnitt 8
  Anforderungen an die Plattform).
- Prüffälle: `specs/pruefung/M07.json`; Formate, Schnittstellen `pdfWoche` und `pdfZeitraum`, Aktionen
  `pdf_woche_exportieren` und `pdf_zeitraum_exportieren`, Fehlercodes: `specs/pruefung/format.md`, „Schnittstellen und Aktionen
  von M07“ („PDF-Inhalt“) und „Regeln für Adapter“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M07 PDF-Export“ (Fallen: Inhalt gegen Layout, jede Woche eine Seite,
  „jetzt“ nur aus der Uhr, Vermerk nur bei Status „Freigegeben“, Zeitraum vor dem Anlegen prüfen).
- Profil: `profile/liferay-625.md`, Abschnitte 3 und 7; `profile/liferay-gemeinsam.md`, Abschnitte 2.2, 3.2 und 7.
- Schrift: `assets/fonts/NotoSans-Regular.ttf`, `assets/fonts/NotoSans-Bold.ttf`, `assets/fonts/OFL.txt` (dieselben Dateien wie
  die TypeScript-App; nur Testdaten und freie Schrift im öffentlichen Repository).

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Übertragbar 1:1 ist der Inhalt in `src/domain/report-pdf.ts` (`pdfMarking()`, `toPdfWeek()`,
`pdfDayTypeLabel()`, `isWeekInRange()`, `selectExportWeeks()`, `withExportFlags()`, `exportRange()`, `parseExportRange()`,
`defaultExportRange()`, `parseDateInput()`, `weekExport()`, `rangeExport()`, `weekPdfDocument()`, `rangePdfDocument()`,
`fileNamePart()`, `weekPdfFileName()`, `rangePdfFileName()`). Nach Profil neu zu bauen sind das Laden mit Zugriffsprüfung in
`src/lib/report-export.ts` (Prisma wird zu Service und Finder), das Layout in `src/pdf/ReportPdf.tsx`, `src/pdf/fonts.ts`,
`src/pdf/render.tsx` und `src/pdf/response.ts` (`@react-pdf/renderer` hat keine Entsprechung, PDFBox hat keine Layoutmaschine)
und die Routen unter `src/app/(app)/berichte/[id]/pdf/` und `src/app/(app)/azubis/[id]/pdf/` (Ressource-URL des Portlets).
Belege zum Abgleich: `src/domain/report-pdf.test.ts`, `src/pdf/report-pdf.test.ts`, `tests/db/pdf-export.test.ts`,
`e2e/ak-901-907-pdf-export.spec.ts`, Hilfe zum Lesen des PDF-Texts: `tests/pdf-text.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Bibliothek und Schrift, (2) Inhalt als reine Funktionen, (3) Laden mit Zugriff, (4) Layout mit PDFBox,
(5) Ressource-URL und Bedienelemente, (6) Adapter, (7) eigene Tests, (8) Gegenprobe. Zählweise der Prüffälle: alle Fälle der
Prüffall-Datei je AK-ID; M07 hat kein Ablauf-Szenario in `specs/pruefung/szenarien.json`. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-901 | Eine Woche lässt sich als PDF exportieren, mit Name, Kalenderwoche, Zeitraum, allen Tagen mit Datum, Tagesart und Tätigkeiten sowie dem Status; exportiert wird der zuletzt gespeicherte Stand. | 2 (2 fachlogik): AK-901-01, AK-901-02 | `specs/pruefung/M07.json` |
| AK-902 | Für einen Zeitraum entsteht ein Sammel-PDF aller Wochen in zeitlicher Reihenfolge; jede Woche beginnt auf einer neuen Seite. | 13 (12 fachlogik, 1 daten): AK-902-01 bis AK-902-13, davon AK-902-13 daten | `specs/pruefung/M07.json` |
| AK-903 | Freigegebene Wochen tragen einen Freigabevermerk mit Name des Ausbilders, Datum und Uhrzeit der aktuell gültigen Freigabe. | 4 (3 fachlogik, 1 daten): AK-903-01, AK-903-02, AK-903-03, AK-903-04 (daten) | `specs/pruefung/M07.json` |
| AK-904 | Nicht freigegebene Wochen sind deutlich gekennzeichnet, z. B. „Nicht freigegeben – Status: Entwurf“. | 2 (2 fachlogik): AK-904-01, AK-904-02 | `specs/pruefung/M07.json` |
| AK-905 | Nach einer Rücknahme enthält ein neu erzeugtes PDF keinen Freigabevermerk mehr. | 2 (1 fachlogik, 1 daten): AK-905-01, AK-905-02 (daten) | `specs/pruefung/M07.json` |
| AK-906 | Der Azubi exportiert nur eigene Berichte, ein Ausbilder die aller Azubis, auch deaktivierter; fremd „Zugriff verweigert“, unbekannt „Seite nicht gefunden“. | 2 (2 daten): AK-906-01, AK-906-02 | `specs/pruefung/M07.json` |
| AK-907 | Umlaute und lange Texte erscheinen im PDF vollständig, nichts wird abgeschnitten; keine Silbentrennung, nur Wörter über 24 Zeichen werden umbrochen. | 4 (4 fachlogik): AK-907-01, AK-907-02, AK-907-03, AK-907-04 | `specs/pruefung/M07.json` |

Summe: 7 AK-IDs, 29 Prüffälle (24 `fachlogik`, 5 `daten`), kein Szenario. Die Fälle prüfen den Inhalt (`PdfDocument`), nicht das
Layout (Fach-Spec, Abschnitt 4): „jede Woche auf einer neuen Seite“, Kopf- und Fußzeile, „Seite x von y“, der Hinweis im PDF
ohne Wochen, der Umbruch überlanger Wörter, die Schrift und das Verhalten bei Zeichen ohne Glyph prüfen die eigenen Tests aus
Schritt 9 am erzeugten PDF.

## 6. Empfehlung

**Weg B.** Der Inhalt ist in Spec und Prüffällen genau festgelegt; das Layout ist frei, solange die Inhalte stimmen. Auf 6.2.5
gibt es dafür drei Stolpersteine: PDFBox hat keine Layoutmaschine (Zeilenumbruch, Seitenumbruch und „Seite x von y“ sind
eigener Code), die Schrift stellt nicht jedes Zeichen dar (M04 lässt zum Beispiel Emoji zu), und eine lesende Service-Methode
darf keine Wochen anlegen (Profil 6.2.5, Abschnitt 7 „Lesende Transaktionen“). Weg A nur auf ausdrücklichen Auftrag.

## 7. Schritte

Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh`, Playwright im Wurzelordner.

1. **Branch** `claude/l62-p07-pdf-export`; Spec (M07-R01 bis M07-R14), Profil 6.2.5, Abschnitt 3 (PDF) und Prüffälle lesen. Prüfschritt:
   AK-Tabelle aus Abschnitt 5 im PR-Entwurf.
2. **Bibliothek und Schrift** (gemeinsames Profil, Abschnitt 7). `ivy.xml`: `org.apache.pdfbox:pdfbox` 2.0.37 in der Konfiguration `default`
   (im WAR, die Konfiguration `test` erbt sie); keine Abhängigkeit vom Portal-Klassenpfad (Profil 6.2.5, Abschnitt 7 „Mehrere Klassenlader“:
   PDFBox liegt im WAR des Plugins). Die Schrift als Ressource im Plugin, Noto Sans Regular und Bold aus `assets/fonts/` samt
   `OFL.txt` nach `docroot/WEB-INF/src/de/berichtsheft/pdf/fonts/`, kein Abruf aus dem Internet. Prüfschritt:
   `ant compile war`; das WAR enthält PDFBox und die Schrift, weiterhin kein Jackson und kein JUnit.
3. **Inhalt `de.berichtsheft.domain.pdf.ReportPdfContent`** (Gegenstück zu `src/domain/report-pdf.ts`; M07-R01 bis M07-R13;
   AK-901 bis AK-905, AK-907; Java 8, kein Import aus `com.liferay.*` und nicht aus PDFBox): `pdfMarking()` (Freigabevermerk
   „Freigegeben von <Name> am <Datum>, <Uhrzeit> Uhr“ der **aktuell gültigen** Freigabe aus `ReportHistory.currentApproval()` (P06),
   **nur** bei Status „Freigegeben“, sonst die Kennzeichnung „Nicht freigegeben – Status: <Status>“ und die Kurzform für die
   Kopfzeile `Freigegeben` bzw. `Nicht freigegeben (<Status>)`), `toPdfWeek()` und `pdfDayTypeLabel()` (Tagesart, „Tagesart
   noch offen“, „außerhalb der Ausbildung“ mit gespeicherter Tagesart in Klammern; M07-R02), `isWeekInRange()` (Montag bis Freitag
   berührt den Zeitraum, beide Grenzen eingeschlossen), `selectExportWeeks()` und `withExportFlags()` (ohne ausgeblendete Wochen
   nach `classifyWeek()` aus P03, nach Jahr und Woche sortiert), `exportRange()`, `parseExportRange()`, `defaultExportRange()`,
   `parseDateInput()` mit dem festen Grund `RangeReason` (`von_ungueltig`, `bis_ungueltig`, `bis_vor_von`), `weekExport()`,
   `rangeExport()`, `weekPdfDocument()`, `rangePdfDocument()` (Titel, Erstellungszeitpunkt, Wochen), `fileNamePart()`,
   `weekPdfFileName()`, `rangePdfFileName()`. Regeln für Java 8: Kalendertage mit `ResolverStyle.STRICT` einlesen (der
   Standardmodus `SMART` rechnet den 31.02. auf den 28.02. zurück und nähme ihn an, M07-R11); Wochentage, Monatsangaben und
   Texte wie „Montag, 28.09.2026“ aus **festen Listen** bilden, nicht aus `Locale`-Daten der JVM; Datum und Uhrzeit des Vermerks
   und der Erstellung in `Europe/Berlin` (Zeitpunkte liegen als UTC vor, gemeinsames Profil, Abschnitt 2.2); der Dateiname schreibt zuerst ä,
   ö, ü, Ä, Ö, Ü, ß um (ae, oe, ue, Ae, Oe, Ue, ss), entfernt erst danach Akzente (`Normalizer.Form.NFD`, Kategorie `\p{M}`), ersetzt
   jede Folge anderer Zeichen als Buchstaben und Ziffern durch „-“, schneidet „-“ an den Rändern ab, höchstens 60 Zeichen, sonst
   „Azubi“. Der Erstellungszeitpunkt und „heute“ kommen als Parameter aus der Uhr (P01), nie aus `new Date()`. Prüfschritt:
   Unit-Tests `AK901_…`, `AK902_…`, `AK903_…`, `AK907_…` in `test/unit/`.
4. **Laden und Zugriff in `WeeklyReportLocalServiceImpl`** (M07-R03, M07-R14; AK-901, AK-902, AK-905, AK-906). Zwei Methoden:
   `getWeekExport(viewer, weeklyReportId)` (lesend, Präfix `get`; Zugriff wie die Berichtsseite über `canViewReport()`: Azubi nur
   eigene, jeder aktive Ausbilder alle, auch deaktivierter Azubis, eine deaktivierte Person nichts → `zugriff_verweigert`;
   unbekannter Bericht oder Person ohne Berichtsheft → `nicht_gefunden`) und `buildRangeExport(viewer, traineeId, von, bis)`.
   **Namen:** Das Sammel-PDF legt fehlende Wochen an (P03 `ensureReportsForTrainee`); eine Methode mit Präfix `get` läuft nur
   lesend (Profil 6.2.5, Abschnitt 7 „Lesende Transaktionen“), das Anlegen ginge verloren oder scheiterte. Deshalb heißt sie nicht `get…`. Ablauf
   in einer Transaktion: Zugriff prüfen, **den Zeitraum prüfen, bevor** Wochen angelegt werden (ein abgewiesener Zeitraum darf
   nichts anlegen), dann `ensureReportsForTrainee`, dann lesen und `rangeExport()`. Ablehnungen liegen **vor** dem ersten Schreiben
   und sind `DomainRuleException` (Unterklasse von `PortalException`, mit `Fehlercode`); sie rollen zurück, und es steht nichts
   Geschriebenes im Weg (Profil 6.2.5, Abschnitt 7 „Zurückrollen“). Es gibt keinen Zwischenspeicher: Der Inhalt entsteht bei jedem Abruf neu aus
   dem gespeicherten Bestand (M07-R03). Prüfschritt: `AK906_ExportPrueftZugriffJeAbrufTest` (Schritt 9).
5. **Layout `de.berichtsheft.pdf.PdfRenderer`** (M07-R07, M07-R12; AK-902, AK-904, AK-907; nur dieses Paket importiert PDFBox).
   PDFBox liefert keine Layoutmaschine; der Renderer baut selbst: Seitengröße A4, Zeilenumbruch nach gemessener Breite
   (`PDFont.getStringWidth`), Seitenumbruch bei langen Wochen, **jede Woche beginnt auf einer neuen Seite**, Kopfzeile jeder Seite
   (Name, Kalenderwoche, Kopfzeile „Freigegeben“ bzw. „Nicht freigegeben (<Status>)“), Fußzeile (Erstellungszeitpunkt „Erstellt am …“,
   „Seite x von y“ über das ganze Dokument): Die Fußzeilen werden **nach** dem Aufbau aller Seiten gesetzt, weil erst dann die
   Seitenzahl feststeht; ein Sammel-PDF ohne Wochen enthält den Hinweis „Im Zeitraum … gibt es keine Wochenberichte.“; kein Ort
   für Kommentare, Historie, Begründung, Unterschriftszeilen oder einen Hinweis „deaktiviert“ (M07-R04). **Umbruch:** keine
   Silbentrennung; ein Wort ohne Leerzeichen mit höchstens 24 Zeichen wird nie getrennt (es kommt in die nächste Zeile), nur ein
   längeres wird am Zeilenende mit Trennstrich umbrochen. **Schrift:** Noto Sans wird je Dokument geladen und eingebettet
   (`PDType0Font.load` mit dem Dokument; eine geladene Schrift gehört zu genau einem Dokument). **Zeichen ohne Glyph:** PDFBox
   wirft bei einem Zeichen, das die Schrift nicht darstellt (z. B. Emoji), eine Ausnahme und bricht den ganzen Export ab; der
   Renderer ersetzt solche Zeichen vorher durch ein Ersatzzeichen, der Inhalt (`PdfDocument`) bleibt unverändert (AK-907-02). Der
   Text der Tätigkeiten kommt mit `\n` als Zeilenumbruch an und wird als solcher gesetzt. Prüfschritt: die Unit-Tests am erzeugten PDF
   (Schritt 9), Text mit `PDFTextStripper` je Seite gelesen.
6. **Ressource-URL und Bedienelemente** (Profil 6.2.5, Abschnitt 3 „PDF“). Im `BerichtPortlet` (P04) und im `AzubisPortlet` (P03) je eine
   `serveResource`-Methode (`pdf-woche`, `pdf-zeitraum`): Sie ruft die Service-Methode **mit der Person der Sitzung** (nie mit
   einer Person aus dem Parameter), erzeugt das PDF und schreibt es in die Antwort mit `Content-Type: application/pdf`,
   `Content-Disposition: attachment` mit dem Dateinamen aus dem Inhalt und `Cache-Control: no-store` (welche Klasse 6.2.5 für
   Datei und Kopfzeilen bietet, ist in diesem Schritt zu bestätigen); Fehler als Status 403 (`zugriff_verweigert`), 404
   (`nicht_gefunden`) und 400 (Zeitraum), ohne PDF. Bedienelemente: Link „PDF“ je Woche in „Meine Wochen“ und im Bericht;
   Formular für das Sammel-PDF mit Vorbelegung von Von und Bis (M07-R10) auf der Seite „Azubis“ (Ausbilder) und „Meine Wochen“
   (Azubi); vor dem Download warnt die Berichtsseite bei ungespeicherten Änderungen mit dem Hinweis „Es wird der zuletzt
   gespeicherte Stand exportiert.“ (AK-901, P04 Schritt 6). Der Hinweis ist ein Text des Portlets; den Rahmen gestaltet P09.
   Prüfschritt: Download als Anna im Browser, Dateiname `Berichtsheft_Anna-Azubi_KW38-2026.pdf` (Uhr 16.09.2026).
7. **Adapter.** Fachlogik (`FachlogikAdapter`): `pdfWoche`, `pdfZeitraum` nach `specs/pruefung/format.md`; Personen stehen hier
   mit Namen (Text); der Fall nennt `uhr`; Fehler `von_ungueltig`, `bis_ungueltig`, `bis_vor_von` aus der Art der Ausnahme, nie
   aus dem Meldungstext. Daten-Aktionen der Testschnittstelle: `pdf_woche_exportieren` und `pdf_zeitraum_exportieren` rufen
   **dieselben Service-Methoden** wie die Ressource-URL und liefern den Inhalt `{ "pdf": <PDF-Inhalt> }`, nicht die Bytes;
   Fehler `zugriff_verweigert`, `nicht_gefunden` und die Zeitraumfehler als `{ "fehler": "<code>" }`. Die Aktionen laufen als
   die Person des Falls (`als`), die Rechteprüfung geschieht im Service, nicht im Adapter. Personen stehen an der Grenze zum Prüf-Adapter als Schlüssel (`anna`); Kennungen wie die Konto-ID (`userId`) und die `weeklyReportId` gehen immer als Text (String), nie als JSON-Zahl (Profil 6.2.5, Abschnitt 4.2). Prüfschritt: `ant pruefung-fachlogik
   -Dbh.pruefung.filter=M07.json` (24 Fälle) und `ant pruefung-daten -Dbh.pruefung.filter=M07.json` (5 Fälle) grün.
8. **Bau-Stand.** M07 in `BauStand.java` eintragen. Prüfschritt: kein roter Fall, die Fälle von M08 bleiben „noch nicht gebaut“.
9. **Eigene Tests** (Namen beginnen mit der AK-ID, JUnit ohne Bindestrich, Profil 6.2.5, Abschnitt 4.1). Die Unit-Tests rendern echte PDF mit dem
   Renderer und lesen den Text mit PDFBox (`PDFTextStripper`, je Seite):
   - `AK902_JedeWocheBeginntAufNeuerSeiteTest`: drei Wochen ergeben mindestens drei Seiten; auf Seite 1 steht nur die erste Woche;
     eine sehr lange Woche läuft über mehrere Seiten, die nächste beginnt auf einer neuen.
   - `AK904_KopfUndFussProSeiteTest`: auf jeder Seite stehen Name, Kalenderwoche und „Freigegeben“ bzw. „Nicht freigegeben
     (<Status>)“ oben, „Erstellt am …“ und „Seite x von y“ unten, y ist die Seitenzahl des ganzen Dokuments (M07-R07).
   - `AK907_PdfEnthaeltVollstaendigenTextTest`: Umlaute, ß, Akzente und 5.000 Zeichen je Tag kommen vollständig im PDF-Text vor;
     ein Wort mit 25 Zeichen wird mit Trennstrich umbrochen, ein Wort mit 24 Zeichen nicht getrennt.
   - `AK907_ZeichenOhneGlyphBrichtDenExportNichtAbTest`: ein Text mit Emoji erzeugt ein PDF (kein Abbruch), der übrige Text ist
     vollständig.
   - `AK902_SammelPdfOhneWochenZeigtHinweisTest`: Zeitraum nur aus Samstag und Sonntag ergibt ein PDF mit dem Hinweis statt eines
     Fehlers.
   - `AK902_SammelPdfMit150WochenTest`: 150 Wochen mit langen Texten entstehen in wenigen Sekunden (Grenze und Messwert im PR,
     Richtwert 10 Sekunden auf dem Standard-Runner nach der Messung aus P00).
   - `AK906_ExportPrueftZugriffJeAbrufTest` (`test/integration/`): über die Testschnittstelle zweimal derselbe Export als Anna
     für ihren Bericht (gelingt) und für den von Clara (`zugriff_verweigert`); nach `person_deaktivieren` gelingt Annas
     Export nicht mehr, der von Bernd für Annas Bericht weiterhin (M07-R14, jede Abfrage prüft selbst).
   - `AK902_SammelPdfLegtFehlendeWochenAnTest` (`test/integration/`): Anna ohne Berichte (`berichte_anlegen` nicht aufgerufen), Uhr
     06.10.2026; `pdf_zeitraum_exportieren` als Bernd ohne Von und Bis liefert die Wochen KW 36 bis 41 und danach gibt es sechs
     Berichte; auf frischem Bestand legt ein Aufruf mit Bis vor Von (`bis_vor_von`) keinen Bericht an (M07-R10, M07-R11,
     Code-Landkarte: Zeitraum vor dem Anlegen prüfen).
   - Playwright `liferay-625/e2e/ak-901-907-pdf-export.spec.ts` (Hilfe `tests/pdf-text.ts` liest den Text): Anna lädt das PDF ihrer
     Woche (Status 200, `application/pdf`, Dateiname, `Cache-Control` mit `no-store`, Inhalt); Bernd gibt frei (Testschnittstelle),
     Anna lädt neu: Vermerk mit Name und Uhrzeit; Bernd nimmt die Freigabe zurück, Anna lädt **erneut**: kein Vermerk, „Nicht
     freigegeben – Status: Abgelehnt“ (AK-905, kein Zwischenspeicher); Anna ruft die Ressource-URL des Berichts von Clara per
     Adresse auf: 403, kein PDF; unbekannte Kennung: 404.
   Prüfschritt: `ant test-unit test-integration` und der Playwright-Lauf grün.
10. **Gegenprobe** (Gemeinsame Regeln, „Gegenprobe“; Profil 6.2.5, Abschnitt 7 „Lesende Transaktionen“, „Zurückrollen“). Jeden Fehler einzeln
    einbauen, die genannten Befehle laufen lassen, Ergebnis im PR festhalten, Fehler zurücknehmen. Eine Gegenprobe zählt nur,
    wenn die benannten Fälle rot werden:

    | Nr. | Absichtlich eingebauter Fehler | Wird rot | Befehl |
    | --- | --- | --- | --- |
    | G7-1 (AK-903) | `pdfMarking` nimmt die **erste** statt der letzten Freigabe | AK-903-02 (Rücknahme und erneute Freigabe) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-903` |
    | G7-2 (AK-903) | Datum und Uhrzeit des Vermerks in UTC statt Europe/Berlin | AK-903-03 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-903` |
    | G7-3 (AK-905) | der vermerk steht bei jedem Status, solange die Historie eine Freigabe enthält (nicht nur bei „Freigegeben“) | AK-905-01 und AK-905-02 (daten) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-905`, `ant pruefung-daten -Dbh.pruefung.filter=AK-905` |
    | G7-4 (AK-904) | keine Kennzeichnung bei Status „Eingereicht“ | AK-904-02 (und AK-904-01) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-904` |
    | G7-5 (AK-902) | eine Woche gehört nur zum Zeitraum, wenn ihr Montag darin liegt | AK-902-01 (Fr 02.10. bis Mo 05.10.: KW 40 fehlt) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-902` |
    | G7-6 (AK-902) | Sortierung nach Wochennummer statt nach Jahr und Woche | AK-902-02 (KW 53/2026 nach KW 1/2027) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-902` |
    | G7-7 (AK-902) | ausgeblendete Wochen werden nicht ausgeschlossen | AK-902-03 und AK-902-13 (daten); AK-902-04 bleibt grün | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-902`, `ant pruefung-daten -Dbh.pruefung.filter=AK-902` |
    | G7-8 (AK-902) | „Bis“ ist ausschließlich | AK-902-12 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-902` |
    | G7-9 (AK-902) | Vorbelegung: „Bis“ ist immer heute, auch nach dem Ausbildungsende | AK-902-06 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-902` |
    | G7-10 (AK-902) | ein Datum wird im Modus `SMART` eingelesen (31.02. wird 28.02.) | AK-902-08 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-902` |
    | G7-11 (AK-902) | „Bis vor Von“ wird nicht geprüft | AK-902-10 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-902` |
    | G7-12 (AK-902) | ein Zeitraum ohne Wochen wirft einen Fehler statt ein PDF ohne Wochen zu liefern | AK-902-11 und `AK902_SammelPdfOhneWochenZeigtHinweisTest` | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-902`, `ant test-unit -Dtest.class=AK902_SammelPdfOhneWochenZeigtHinweisTest` |
    | G7-13 (AK-901) | ein Tag ohne Tagesart zeigt einen leeren Text statt „Tagesart noch offen“ | AK-901-01 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-901` |
    | G7-14 (AK-901) | ein Tag außerhalb der Ausbildung zeigt die gespeicherte Tagesart nicht in Klammern | AK-901-02 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-901` |
    | G7-15 (AK-907) | der Dateiname entfernt zuerst die Akzente und schreibt danach um | AK-907-01 (Joerg wird Jorg) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-907` |
    | G7-16 (AK-907) | der Dateiname löscht Sonderzeichen, statt sie zu „-“ zu machen (René O'Neil wird `Rene-ONeil`) | AK-907-03 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-907` |
    | G7-16a (AK-907) | ein Name ohne Buchstaben und Ziffern ergibt einen leeren Namensteil statt „Azubi“ | AK-907-04 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-907` |
    | G7-17 (AK-907) | der Text einer Tätigkeit wird auf 4.000 Zeichen gekürzt | AK-907-02 und `AK907_PdfEnthaeltVollstaendigenTextTest` | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-907`, `ant test-unit -Dtest.class=AK907_PdfEnthaeltVollstaendigenTextTest` |
    | G7-18 (AK-907) | der Renderer trennt jedes Wort ab 15 Zeichen und lässt eines mit 25 Zeichen ungetrennt über den Rand laufen | `AK907_PdfEnthaeltVollstaendigenTextTest` | `ant test-unit -Dtest.class=AK907_PdfEnthaeltVollstaendigenTextTest` |
    | G7-19 (AK-907) | der Renderer ersetzt Zeichen ohne Glyph nicht | `AK907_ZeichenOhneGlyphBrichtDenExportNichtAbTest` (Ausnahme aus PDFBox) | `ant test-unit -Dtest.class=AK907_ZeichenOhneGlyphBrichtDenExportNichtAbTest` |
    | G7-20 (AK-902) | der Renderer beginnt eine neue Woche auf derselben Seite, wenn Platz ist | `AK902_JedeWocheBeginntAufNeuerSeiteTest` | `ant test-unit -Dtest.class=AK902_JedeWocheBeginntAufNeuerSeiteTest` |
    | G7-21 (AK-904) | „Seite x von y“ zählt je Woche statt über das ganze Dokument | `AK904_KopfUndFussProSeiteTest` | `ant test-unit -Dtest.class=AK904_KopfUndFussProSeiteTest` |
    | G7-22 (AK-906) | `getWeekExport` prüft nur die Rolle, nicht den Besitz | `AK906_ExportPrueftZugriffJeAbrufTest` (Clara lädt Annas Bericht) und AK-906-01 | `ant test-integration -Dtest.class=AK906_ExportPrueftZugriffJeAbrufTest`, `ant pruefung-daten -Dbh.pruefung.filter=AK-906` |
    | G7-23 (AK-906) | die Prüfung geschieht nur beim ersten Abruf einer Sitzung (Ergebnis zwischengespeichert) | `AK906_ExportPrueftZugriffJeAbrufTest` (Zugriff nach `person_deaktivieren`) und AK-906-02 | wie G7-22 |
    | G7-24 (AK-905) | der Renderer merkt sich die Bytes je Bericht und liefert sie beim zweiten Abruf wieder | `ak-901-907-pdf-export.spec.ts` (nach der Rücknahme steht der Vermerk noch im PDF); AK-905-02 bleibt grün, weil der Inhalt neu entsteht | Playwright mit `-g "ak-901"` |
    | G7-25 (AK-902) | `buildRangeExport` heißt `getRangeExport` und legt Wochen an | `AK902_SammelPdfLegtFehlendeWochenAnTest` (lesende Transaktion: nichts angelegt, das PDF ist leer bzw. der Aufruf scheitert) | `ant test-integration -Dtest.class=AK902_SammelPdfLegtFehlendeWochenAnTest` |
    | G7-26 (AK-902) | der Zeitraum wird erst nach `ensureReportsForTrainee` geprüft | `AK902_SammelPdfLegtFehlendeWochenAnTest`, Teil „Bis vor Von legt nichts an“ (Zahl der Berichte nach dem Aufruf ist nicht 0) | `ant test-integration -Dtest.class=AK902_SammelPdfLegtFehlendeWochenAnTest` |
    | G7-27 (AK-902) | der Renderer lädt und bettet die Schrift für jede Woche neu ein (statt einmal je Dokument) | `AK902_SammelPdfMit150WochenTest` (Laufzeit über der Grenze; Messwert vor und nach dem Fehler im PR, bleibt der Test grün, ist die Grenze zu großzügig und wird enger gesetzt) | `ant test-unit -Dtest.class=AK902_SammelPdfMit150WochenTest` |

    Prüfschritt: Tabelle mit dem tatsächlichen Ergebnis je Zeile im PR; nach dem Zurücknehmen alles grün. Wird ein
    benannter Fall nicht rot, ist die Prüfung ohne Wirkung: anhalten und der Steuerung melden.
11. **Prüfung** nach Abschnitt 8.

## 8. Prüfung

Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh`, Playwright im Wurzelordner.

| Befehl | Erwartet |
| --- | --- |
| `ant pruefung-fachlogik -Dbh.pruefung.filter=M07.json` | 24 Fälle grün |
| `ant pruefung-daten -Dbh.pruefung.filter=M07.json` | 5 Fälle grün |
| `ant test-unit` | grün, auch die Tests am erzeugten PDF und `DomainOhneLiferayTest` (die Fachlogik unter `domain/pdf/` importiert weder Liferay noch PDFBox) |
| `ant test-integration` | grün, auch `AK906_ExportPrueftZugriffJeAbrufTest` und `AK902_SammelPdfLegtFehlendeWochenAnTest` |
| `ant compile war` | Build ohne Fehler; WAR mit PDFBox und Schrift, ohne Jackson und JUnit |
| `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=chromium --project=smartphone-375 -g "ak-901"` | grün (Download, Zugriff, kein Zwischenspeicher) |
| Prüffälle M01 bis M06 (`ant pruefung-fachlogik`, `ant pruefung-daten`) | weiterhin grün, M08 „noch nicht gebaut“ |
| Gegenprobe aus Schritt 10 | jede Zeile rot wie benannt, danach zurückgenommen und grün |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: der volle Liferay-6.2.5-Job; im PR vermerken.

## 9. Abschluss

- Commit, z. B. „L62 P07: PDF-Export (Inhalt, PDFBox-Layout, Ressource-URL, Zugriff)“; vor dem Push alle Befehle aus Abschnitt 8
  lokal grün.
- Draft-PR mit der AK-Tabelle (AK-901, AK-902, AK-903, AK-904, AK-905, AK-906, AK-907 mit Test und Prüffällen), der Gegenprobe-Tabelle
  mit Ergebnis, der Messung für 150 Wochen und „Bitte bestätigen“. Neue Bibliothek PDFBox: `ivy.xml` ist nach
  `profile/liferay-625.md`, Abschnitt 2.3, nicht von den Pfadmustern erfasst; die Bibliothek steht in der freigegebenen Liste
  (gemeinsames Profil, Abschnitt 7). `service/impl/**` ist sicherheitsrelevant (gemeinsames Profil, Abschnitt 5); Chris gibt frei.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Der Export bricht bei einem Emoji ab | Zeichen ohne Glyph vor dem Setzen ersetzen (G7-19); Inhalt bleibt unverändert |
| Umlaute fehlen oder Kästchen | Noto Sans einbetten, die Standardschriften des PDF-Formats genügen nicht; Schrift je Dokument laden |
| „Seite x von y“ stimmt nicht | Fußzeilen erst nach dem Aufbau aller Seiten setzen (G7-21) |
| Eine lange Woche wird abgeschnitten | Seitenumbruch im Renderer; Test mit 5.000 Zeichen je Tag (G7-17) |
| Sammel-PDF legt keine Wochen an | Methode mit Präfix `get` läuft nur lesend; `buildRangeExport` (G7-25) |
| Abgewiesener Zeitraum legt trotzdem Wochen an | Zeitraum zuerst prüfen, dann `ensureReportsForTrainee` (G7-26) |
| 31.02. wird als Datum angenommen | `ResolverStyle.STRICT` (G7-10) |
| Wochentage oder Monate erscheinen englisch oder anders | feste Listen statt `Locale` der JVM |
| Datum im Vermerk um 1 oder 2 Stunden verschoben | Anzeige in `Europe/Berlin`, Zeitpunkte liegen als UTC vor (G7-2) |
| Freigabevermerk nach der Rücknahme | Vermerk nur bei Status „Freigegeben“ aus `currentApproval()`; kein Zwischenspeicher (G7-3, G7-24) |
| Dateiname enthält „ö“ oder „..“ | erst umschreiben, dann Akzente entfernen, dann Sonderzeichen zu „-“ (G7-15, G7-16) |
| Der Browser zeigt das PDF statt eines Downloads, oder lädt eine alte Fassung | `Content-Disposition: attachment` und `Cache-Control: no-store` prüfen (Schritt 6, G7-24) |
| Ressource-URL liefert dem Fremden das PDF | Person aus der Sitzung, Prüfung im Service bei jedem Abruf (G7-22, G7-23) |
| Schrift findet das Plugin nicht | Ressource im Klassenpfad des Plugins, nicht im Portal (Profil 6.2.5, Abschnitt 7 „Mehrere Klassenlader“) |

## Bitte bestätigen

- [ ] Methodenname `buildRangeExport` (ohne Präfix `get`) für das Sammel-PDF, weil es fehlende Wochen anlegt; `getWeekExport`
      liest nur. Alternative: Portlet ruft zuerst `ensureReportsForTrainee`, dann `getRangeExport`; dann prüft das Portlet den
      Zeitraum vor dem Anlegen selbst.
- [ ] Zeichen ohne Glyph (z. B. Emoji aus M04, das 5.000 Zeichen und Unicode zulässt) werden im gedruckten PDF durch ein Ersatzzeichen
      ersetzt; der Inhalt (`PdfDocument`) und die Prüffälle bleiben unverändert. Die TypeScript-Umsetzung zeigt das Ersatzzeichen der
      Schrift. Die Fach-Spec (M07-R12) verlangt Vollständigkeit nur für Umlaute, ß und Akzente.
- [ ] Ressource-URL für das Ausliefern (`serveResource`) und Kopfzeilen (`Content-Disposition`, `Cache-Control: no-store`): die
      Klasse von 6.2.5, die Datei und Kopfzeilen setzt, ist in Schritt 6 zu bestätigen (das Profil sagt nur „Ressource-URL des
      Portlets“).
- [ ] Grenze für `AK902_SammelPdfMit150WochenTest`: Richtwert 10 Sekunden; die Spec verlangt „wenige Sekunden“ (M07 Abschnitt 8).
- [ ] Das Playbook folgt dem Aufbau aus P05 der Reihe und „Aufbau der Reihe (gilt für P01 bis P10)“ aus
      `playbooks/liferay-72/P00-grundgeruest.md`; die P00 der Reihe 6.2.5 trägt diesen Abschnitt nicht.

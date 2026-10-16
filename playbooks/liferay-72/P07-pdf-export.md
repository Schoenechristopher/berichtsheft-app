# P07 PDF-Export (M07)

Reihe `playbooks/liferay-72/` · Plattform Liferay Portal 7.2 CE · Profil `profile/liferay-72.md` (baut auf
`profile/liferay-gemeinsam.md` auf) · Stand: 16.10.2026 (Etappe G4, Paket K) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Wochenberichte lassen sich als PDF exportieren: eine Woche oder ein Zeitraum (Sammel-PDF), jede Woche ab einer neuen Seite, mit
Freigabevermerk bei freigegebenen Wochen und der Kennzeichnung „Nicht freigegeben – Status: …“ sonst; Zugriff wie bei der
Berichtsseite. Der **Inhalt** eines PDF entsteht als reine Java-Klassen in `bh-domain`, das Laden mit Zugriffsprüfung in einem
Dienst von `bh-pdf`, das Layout mit Apache PDFBox 2.0.37 (eingebettet per `compileInclude`) und der Noto Sans der App, der Abruf über
einen `MVCResourceCommand` in `bh-web`. Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M07.json` über die Prüf-Adapter grün sind (7 AK-IDs; 24 Fachlogik- und 5 Daten-Fälle, keine
   Ablauf- und keine Szenario-Fälle);
2. die plattformeigenen Tests grün sind, die das gedruckte Dokument prüfen, was kein neutraler Fall zeigt: `PdfLayoutTest` (Seiten,
   Kopf- und Fußzeile, Umbruch, eingebettete Schrift, Laufzeit bei 150 Wochen) und `PdfAntwortTest` (HTTP-Antwort ohne
   Zwischenspeicher, Dateiname, Zugriff);
3. jede Gegenprobe aus Schritt 10 die dort benannten Prüffälle bzw. Tests rot gemacht hat und zurückgenommen ist.

Keine Schemaänderung: M07 speichert nichts (Spec, Abschnitt 5). Keine Abweichung gegenüber der TypeScript-App.

## 2. Voraussetzungen

- L72-P00 bis L72-P06 abgenommen und gemergt (Zugriff aus M02, Wochen und Ausblendung aus M03, Status und Freigabe aus M05, Historie mit
  `currentApproval()` und `getHistory()` aus M06, Uhr und Zeitzone aus M01).
- Profil 7.2: Abschnitte 1 und 3 (PDF), 4 (Daten-Adapter, Zeitzone) und 7 (Zeit, OSGi-Abhängigkeiten); gemeinsam 2.2 (Zeit in UTC, Anzeige
  in Europe/Berlin) und 7 (PDFBox 2.0.37, Noto Sans).
- P00 hat bestätigt, dass PDFBox per `compileInclude` als OSGi-Modul läuft (Profil, „In P00 zu bestätigen“); ohne diesen Nachweis
  bleibt Schritt 4 stehen und wird gemeldet.
- Die Schrift liegt als Datei im Repository (`assets/fonts/NotoSans-Regular.ttf`, `assets/fonts/NotoSans-Bold.ttf`, Lizenz
  `assets/fonts/OFL.txt`) und wird als Ressource in `bh-pdf` kopiert, nicht aus dem Internet geladen.

## 3. Eingaben

- Fach-Spec: `specs/M07-pdf-export.md` (Regeln M07-R01 bis M07-R14, Abschnitt 5, Abschnitt 6 Schnittstellen, Abschnitt 8 Anforderungen
  an die Plattform).
- Prüffälle: `specs/pruefung/M07.json`; Schnittstellen `pdfWoche` und `pdfZeitraum`, Daten-Aktionen `pdf_woche_exportieren` und
  `pdf_zeitraum_exportieren`, Format „PDF-Inhalt“ und Fehlercodes: `specs/pruefung/format.md`, „Schnittstellen und Aktionen von M07“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M07 PDF-Export“ (Spalte „Plattformgebunden“, Rendering, „Fallen“).
- Gegenstück der Referenz-Umsetzung: `playbooks/typescript/P07-pdf-export.md` (nur zum Abgleich).

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag und nur für den Inhalt: `src/domain/report-pdf.ts` (`pdfMarking()`, `toPdfWeek()`,
`selectExportWeeks()`, `exportRange()`, `weekExport()`, `rangeExport()`, `fileNamePart()`) lässt sich von oben nach unten nach Java
übersetzen. Nicht übertragbar sind `src/lib/report-export.ts` (Prisma), die Routen unter `src/app/(app)/berichte/[id]/pdf/` und
`src/app/(app)/azubis/[id]/pdf/` (Next.js) und das Layout `src/pdf/ReportPdf.tsx`, `src/pdf/fonts.ts`, `src/pdf/render.tsx` und
`src/pdf/response.ts` (`@react-pdf/renderer`): Auf 7.2 ersetzen sie Service Builder mit Custom SQL, einen `MVCResourceCommand` und
PDFBox (Schritte 3 bis 6). Belege der Referenz: `src/domain/report-pdf.test.ts`, `src/pdf/report-pdf.test.ts`,
`tests/db/pdf-export.test.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Inhalt eines PDF als reine Funktionen, (2) Dateiname, (3) Laden und Zugriff, (4) Layout mit PDFBox, (5) Abruf und
Bedienelemente, (6) Adapter, (7) plattformeigene Tests und Gegenproben. Zu jedem AK die Prüffälle (alle in
`specs/pruefung/M07.json`; Zählweise: Prüffälle **ohne** Ablauf-Szenario, M07 hat keines):

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Bewertung auf 7.2 |
| --- | --- | --- | --- |
| AK-901 | Eine Woche lässt sich als PDF exportieren, mit Name, Kalenderwoche, Zeitraum, allen Tagen mit Datum, Tagesart und Tätigkeiten sowie dem Status; exportiert wird der zuletzt gespeicherte Stand. | 2 (2 fachlogik) | gleichwertig; Layout mit PDFBox, geprüft durch `PdfLayoutTest.AK901_…` |
| AK-902 | Für einen Zeitraum entsteht ein Sammel-PDF aller Wochen in zeitlicher Reihenfolge; jede Woche beginnt auf einer neuen Seite. | 13 (12 fachlogik, 1 daten) | gleichwertig; „neue Seite je Woche“ im Layout, `PdfLayoutTest.AK902_…` |
| AK-903 | Freigegebene Wochen tragen einen Freigabevermerk mit Name des Ausbilders, Datum und Uhrzeit der aktuell gültigen Freigabe. | 4 (3 fachlogik, 1 daten) | gleichwertig; Zeitpunkt aus `TIMESTAMP` in UTC, Anzeige in Europe/Berlin |
| AK-904 | Nicht freigegebene Wochen sind deutlich gekennzeichnet, z. B. „Nicht freigegeben – Status: Entwurf“. | 2 (2 fachlogik) | gleichwertig; Kopfzeile jeder Seite, `PdfLayoutTest.AK904_…` |
| AK-905 | Nach einer Rücknahme enthält ein neu erzeugtes PDF keinen Freigabevermerk mehr. | 2 (1 fachlogik, 1 daten) | gleichwertig; kein Zwischenspeicher, `PdfAntwortTest.AK905_…` |
| AK-906 | Der Azubi exportiert nur eigene Berichte, ein Ausbilder die aller Azubis, auch deaktivierter; fremd „Zugriff verweigert“, unbekannt „Seite nicht gefunden“. | 2 (2 daten) | gleichwertig; Prüfung im Dienst bei jedem Abruf |
| AK-907 | Umlaute und lange Texte erscheinen im PDF vollständig, nichts wird abgeschnitten; keine Silbentrennung, nur Wörter über 24 Zeichen werden umbrochen. | 4 (4 fachlogik) | gleichwertig; eigener Zeilenumbruch, `PdfLayoutTest.AK907_…` |

Summe: 7 AK-IDs, 29 Prüffälle (24 fachlogik, 5 daten, 0 ablauf, 0 Szenario).

## 6. Empfehlung

**Weg B.** Der Inhalt ist in der Spec und den Prüffällen genau festgelegt; das Layout ist frei, solange die Inhalte stimmen. PDFBox
hat keinen Textumbruch und keine Seitenzahl „x von y“: Beides baut dieses Playbook selbst (Schritt 4) und prüft es am erzeugten
Dokument. Weg A nur für die Übersetzung von `report-pdf.ts` und nur auf ausdrücklichen Auftrag.

## 7. Schritte

1. **Branch** `claude/l72-p07-pdf-export`; Spec und Prüffälle lesen. Prüfschritt: AK-Tabelle (Abschnitt 5) im PR-Entwurf; Liste der Fehlercodes
   (`von_ungueltig`, `bis_ungueltig`, `bis_vor_von`, `zugriff_verweigert`, `nicht_gefunden`) notiert.
2. **Inhalt** `de.berichtsheft.domain.pdf` in `bh-domain` (M07-R01 bis M07-R13; AK-901 bis AK-905, AK-907; Java 8, „jetzt“ als Parameter):
   `PdfMarking` (Freigabevermerk der **aktuell gültigen** Freigabe aus `currentApproval()` (P06) „Freigegeben von <Name> am <Datum>,
   <Uhrzeit> Uhr“, nur bei Status Freigegeben; sonst die Kennzeichnung „Nicht freigegeben – Status: <Status>“ und keine Zeile
   „Vermerk“; Kurzform für die Kopfzeile „Freigegeben“ bzw. „Nicht freigegeben (<Status>)“), `PdfWeek.of(…)` (Name, KW, Zeitraum
   Mo–Fr, Tage mit Wochentag und Datum, Tagesart, Tätigkeiten unverändert, Status, „ganz außerhalb“; ohne Kommentare, Historie und
   Begründung), `PdfDayLabels` (Tagesart; ohne Tagesart „Tagesart noch offen“; außerhalb „außerhalb der Ausbildung“, mit
   gespeicherter Tagesart in Klammern), `ExportRange` (Vorbelegung Ausbildungsbeginn bis heute bzw. Ausbildungsende; leere oder nur
   aus Leerraum bestehende Angabe gilt als nicht angegeben; `von_ungueltig`, `bis_ungueltig`, `bis_vor_von` über die strenge
   Datumsprüfung aus P01), `WeekSelection` (Woche gehört dazu, wenn mindestens ein Tag von Mo–Fr im Zeitraum liegt; ausgeblendete
   Wochen nach `classifyWeek()` aus P03 fehlen; zeitlich sortiert, auch über den Jahreswechsel) und `PdfDocuments.week()` /
   `PdfDocuments.range()` (Titel „Berichtsheft <Name> – KW <Woche>/<Jahr>“ bzw. „Berichtsheft <Name> – <Von> – <Bis>“, Erstellungszeitpunkt
   „TT.MM.JJJJ, HH:mm Uhr“ in Europe/Berlin, Dateiname). Wochentage und Monatsnamen aus **festen deutschen Tabellen**, nie aus
   `Locale` des Servers. Prüfschritt: JUnit-Tests `AK901_…` bis `AK905_…` und `AK907_…` in `bh-domain`.
3. **Dateiname** (M07-R13, AK-901, AK-902, AK-907) in `PdfFileNames.part(name)`: zuerst ä, ö, ü, Ä, Ö, Ü und ß umschreiben (ae, oe, ue,
   Ae, Oe, Ue, ss), **dann** Akzente entfernen (`Normalizer.NFD`, Kategorie `\p{M}` streichen; in dieser Reihenfolge, sonst wird aus
   „ä“ ein „a“), jede Folge anderer Zeichen als Buchstaben und Ziffern wird zu „-“, ohne „-“ am Anfang und Ende, höchstens 60
   Zeichen; bleibt nichts übrig, steht „Azubi“. Der Name enthält danach nur ASCII und taugt für `Content-Disposition`. Prüfschritt:
   JUnit-Tests mit den Namen aus AK-907-01 (`Jörg Müßig-Äpfel`), AK-907-03 (`René O'Neil`) und AK-907-04 (`../..`).
4. **Laden und Zugriff** in `bh-pdf` (OSGi-Dienst `ReportExportService`; M07-R03, M07-R14; AK-901, AK-902, AK-905, AK-906):
   `loadWeekExport(long actorUserId, long weeklyReportId)` und `loadRangeExport(long actorUserId, long traineeId, String von, String
   bis)`. Die Handelnden sind immer die `userId` der Anfrage (`PortalUtil.getUserId`), nie ein Parameter. Der Dienst liest `BH_Person`
   des Handelnden und prüft `canViewReport()` (Azubi nur eigene, aktiver Ausbilder alle, auch deaktivierte Azubis; deaktivierte Person
   nichts); abgewiesen wird mit `ExportDeniedException extends PortalException` und festem Grund `zugriff_verweigert` bzw.
   `nicht_gefunden` (unbekannter Bericht, Person ohne Berichtsheft), ungültige Angaben mit `ExportRangeException` und dem Grund aus
   Schritt 2. Beim Sammel-PDF zuerst den Zeitraum prüfen, **dann** `ensureReportsForTrainee()` aus P03 aufrufen (ein abgewiesener Zeitraum
   legt nichts an; die Ausnahme rollt zusätzlich die Transaktion zurück), danach Bericht, Tage, Statuswechsel und Namen **in einer kurzen
   Lese-Transaktion** laden; das Rendern geschieht außerhalb der Transaktion. Es gibt keine aufbewahrte Fassung: jeder Abruf liest neu aus
   der Datenbank (M07-R03). Prüfschritt: Arquillian-Test `PdfExportServiceTest.AK906_fremderBerichtUndUnbekannterBericht`.
5. **Layout mit PDFBox** in `bh-pdf` (Profil, Abschnitt 3; `compileInclude` von `org.apache.pdfbox:pdfbox:2.0.37` samt Abhängigkeiten, Lizenz
   Apache-2.0, gemeinsam 7): `PdfRenderer.render(PdfDocument)` liefert `byte[]` und läuft auch ohne OSGi (reines Java), damit
   `PdfLayoutTest` als normaler JUnit-Test läuft. Der Inhalt aus Schritt 2 wird in zwei Durchgängen gesetzt: erst der **Umbruch** in
   Zeilen und Seiten (eigene Klasse `LineBreaker`), dann das Zeichnen, weil „Seite x von y“ die Seitenzahl des ganzen Dokuments braucht.
   - **Schrift:** `PDType0Font.load(document, InputStream)` aus den Ressourcen (Noto Sans Regular und Bold, eingebettet); die Standardschriften
     des PDF-Formats reichen nicht für Umlaute und Akzente. Die Schrift wird einmal je Dokument geladen, nicht je Zeile.
   - **Seiten:** jede Woche beginnt auf einer neuen Seite (M07-R09), lange Wochen laufen über mehrere Seiten; **Kopfzeile** auf jeder
     Seite (Name, Kalenderwoche, „Freigegeben“ bzw. „Nicht freigegeben (<Status>)“), **Fußzeile** auf jeder Seite („Erstellt am
     <Erstellungszeitpunkt>“ und „Seite x von y“ über das ganze Dokument, M07-R07). Ein Sammel-PDF ohne Wochen enthält den Hinweis „Im
     Zeitraum <Von> – <Bis> gibt es keine Wochenberichte.“ Das Dokument trägt den Titel aus Schritt 2 in den Dokumenteigenschaften.
   - **Umbruch (M07-R12):** Zeilenumbrüche der Tätigkeiten bleiben erhalten, Leerzeilen und Einrückung ebenso; Zeilen werden nach der
     Breite gemessen (`PDFont.getStringWidth`). Es gibt **keine** Silbentrennung; nur ein Wort ohne Leerzeichen mit mehr als 24
     Zeichen, das nicht in die Zeile passt, wird am Zeilenende mit Trennstrich umbrochen. Ein Wort bis 24 Zeichen rutscht ganz in die
     nächste Zeile; die Zeilenbreite muss 24 der breitesten Zeichen fassen (Test). Nichts wird abgeschnitten, auch nicht 5.000 Zeichen je
     Tag.
   - **Zeichen ohne Glyph** in Noto Sans (z. B. ein Emoji, das M04 speichert) dürfen den Export nicht abbrechen: Der Umbruch ersetzt sie
     durch das Ersatzzeichen „?“ (Vorschlag, siehe PR „Bitte bestätigen“); Umlaute, ß und Akzente sind alle enthalten.
   - Texte, die nur im Layout stehen (Überschrift „Freigabevermerk“, „Keine Tätigkeiten eingetragen.“, der Hinweis ohne Wochen), erfassen
     die Prüffälle nicht; sie sind Sache von `PdfLayoutTest`.
   Prüfschritt: `PdfLayoutTest` (Schritt 8) grün; ein Beispiel-PDF aus den Testdaten (Anna) von Hand geöffnet.
6. **Abruf und Bedienelemente** in `bh-web`: ein `MVCResourceCommand` (`mvc.command.name=/pdf/woche` und `/pdf/zeitraum`) ruft den Dienst mit
   `PortalUtil.getUserId(resourceRequest)` und schickt die Bytes mit `Content-Type: application/pdf`, `Content-Disposition: attachment;
   filename="<Dateiname>"` und `Cache-Control: no-store, no-cache` (kein Zwischenspeicher bei Server, Proxy oder Browser, damit nach einer
   Rücknahme kein Vermerk bleibt; AK-905). Hilfen von Liferay, die selbst Kopfzeilen setzen (`PortletResponseUtil.sendFile`), setzen sie
   danach noch einmal und der Test prüft die Antwort. Fehlerantworten: `nicht_gefunden` mit 404 (Seite „nicht gefunden“),
   `zugriff_verweigert` mit 403 (Meldungen wie in AK-103), ungültiger Zeitraum zurück ins Formular mit dem Grund am Feld
   (`data-fehler`). Bedienelemente (Gestaltung folgt in P09): der Link „PDF“ je Woche in „Meine Wochen“ und auf der Berichtsseite, das
   Formular „Berichtsheft als PDF“ (Von und Bis, vorbelegt nach M07-R10) auf der Seite des Azubis bzw. der Liste der Ausbilder. Hat die
   Berichtsseite ungespeicherte Änderungen (`data-ungespeichert`, P04), erscheint vor dem Download der Hinweis „Es wird der zuletzt
   gespeicherte Stand exportiert.“ als eigener `<dialog>`; der Link ist als Download markiert und löst die Warnung beim Verlassen aus P04
   nicht aus, weil die Seite nicht verlassen wird. Prüfschritt: von Hand als Anna (eigene Woche, Sammel-PDF), als Bernd (Annas Woche) und als
   Anna auf einem fremden Bericht (403).
7. **Adapter.** Fachlogik: `pdfWoche` und `pdfZeitraum` (Formate nach `specs/pruefung/format.md`; Fälle mit `uhr` stellen die Uhr des
   Adapters; Fehler `von_ungueltig`, `bis_ungueltig`, `bis_vor_von` über die Fehlerart). Daten: `pdf_woche_exportieren` und
   `pdf_zeitraum_exportieren` über **dieselben** Dienst-Methoden wie der Abruf, mit dem Inhalt (`PdfDocument`), nicht den Bytes; Fehler
   `zugriff_verweigert` und `nicht_gefunden` über den Grund der Ausnahme, nie über den Text. Die Schritte der Fälle nutzen die
   Aktionen der früheren Module (`freigeben`, `freigabe_zuruecknehmen`, `person_deaktivieren`, `ausbildungszeitraum_aendern`).
   Prüfschritt: `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M07` (24 Fälle) und
   `./gradlew :modules:bh-test-integration:testIntegration --tests '*DatenPrueffaelleTest*' -Pbh.pruefung.modul=M07` (5 Fälle) grün.
8. **Plattformeigene Tests.**
   - `PdfLayoutTest` (JUnit in `bh-pdf`, PDFBox liest das erzeugte Dokument mit `PDFTextStripper` seitenweise):
     `AK901_kopfUndFussZeileMitSeitenzahlStehenAufJederSeite` (Seitenzahl zählt über das ganze Dokument),
     `AK902_jedeWocheBeginntAufEinerNeuenSeite` (die Seite mit KW n+1 beginnt mit deren Kopfzeile; eine lange Woche belegt mehrere Seiten),
     `AK902_zeitraumOhneWochenEnthaeltDenHinweis`, `AK904_kennzeichnungStehtInKopfzeileUndText` (Entwurf, Eingereicht, Abgelehnt: „Nicht
     freigegeben“, nie ein Vermerk), `AK907_langerTextErscheintVollstaendig` (5.000 Zeichen mit Umlauten, `\n` und Leerzeilen: der
     ausgelesene Text enthält jedes Wort in Reihenfolge), `AK907_wortUeber24ZeichenWirdMitTrennstrichUmbrochen`,
     `AK907_kurzesWortWirdNichtGetrennt`, `AK907_umlauteSindMitEingebetteterSchriftDargestellt` (alle verwendeten Schriften
     `isEmbedded()`, kein Abruf aus dem Netz), `AK902_hundertfuenfzigWochenInWenigenSekunden` (Zeitlimit im Test 10 Sekunden; das Limit ist ein
     Vorschlag und wird in diesem Paket gemessen und festgelegt).
   - `PdfAntwortTest` (Playwright aus `liferay-72/pruefung/`, plattformeigen; Anmeldung wie der Ablauf-Adapter):
     `AK905_antwortIstNichtZwischenspeicherbar` (Antwortkopf enthält `no-store`), `AK901_dateinameStehtImAntwortkopf`, und
     `AK906_fremderBerichtErgibt403` (Anna ruft den Abruf mit der Kennung eines fremden Berichts auf).
   Prüfschritt: `./gradlew :modules:bh-pdf:test` und `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium
   --grep PdfAntwortTest` grün.
9. **Bau-Stand.** M07 in die Bau-Liste eintragen. Prüfung nach Abschnitt 8.
10. **Gegenproben** (je ein benannter Fehler, je ein roter Lauf, danach zurücknehmen und grün zeigen):

    | Name | Absichtlich eingebauter Fehler | Wird rot | Bleibt grün (und warum) |
    | --- | --- | --- | --- |
    | F-P07-1 „Nur der Montag zählt“ (AK-902) | `WeekSelection` prüft nur, ob der Montag im Zeitraum liegt | AK-902-01, AK-902-12 | AK-902-02, AK-902-11 (dort liegt der Montag im Zeitraum bzw. es gibt keine Woche) |
    | F-P07-2 „Wochenende zählt“ (AK-902) | `WeekSelection` rechnet Montag bis Sonntag statt Montag bis Freitag | AK-902-11 | AK-902-01 |
    | F-P07-3 „Eingabereihenfolge“ (AK-902) | `WeekSelection` sortiert nicht | AK-902-02 | AK-902-11 (keine Wochen) |
    | F-P07-4 „Ausgeblendete Wochen gedruckt“ (AK-902) | `WeekSelection` übergeht `classifyWeek()` | AK-902-03, AK-902-13 (Daten) | AK-902-12 (alle Wochen innerhalb der Ausbildung) |
    | F-P07-5 „Erste statt letzter Freigabe“ (AK-903) | `PdfMarking` nimmt die älteste Freigabe | AK-903-02 | AK-903-01 (nur eine Freigabe) |
    | F-P07-6 „Vermerk in UTC“ (AK-903) | der Freigabezeitpunkt des Vermerks wird ohne Umrechnung nach Europe/Berlin gedruckt | AK-903-01, AK-903-03, AK-903-04 (Daten) | AK-901-01 (kein vermerkter Zeitpunkt) |
    | F-P07-7 „Vermerk aus der Historie“ (AK-905) | `PdfMarking` druckt den Vermerk, sobald die Historie eine Freigabe enthält, auch bei Status Abgelehnt | AK-905-01, AK-905-02 (Daten) | AK-903-01 |
    | F-P07-8 „Namen nur ohne Akzent“ (AK-907) | `PdfFileNames` entfernt nur Akzente und schreibt Umlaute nicht um | AK-907-01 | AK-907-03 (Akzent), AK-907-04 |
    | F-P07-9 „Leerer Name bleibt leer“ (AK-907) | `PdfFileNames` liefert für einen Namen ohne Buchstaben den leeren Text | AK-907-04 | AK-907-01, AK-907-03 |
    | F-P07-10 „Bis vor Von zugelassen“ (AK-902) | `ExportRange` übergeht den Vergleich | AK-902-10 | AK-902-12 (Bis gleich Von) |
    | F-P07-11 „Leere Angabe ist ungültig“ (AK-902) | `ExportRange` behandelt `""` und Leerraum als ungültiges Datum | AK-902-06 | AK-902-05, AK-902-07 (`null`) |
    | F-P07-12 „Datum nur nach Muster“ (AK-902) | `ExportRange` prüft `JJJJ-MM-TT` nur mit einem Muster, nicht mit dem Kalender | AK-902-08 (31.02.) | AK-902-09 (`morgen` entspricht dem Muster nicht) |
    | F-P07-13 „Kein Besitz geprüft“ (AK-906) | `ReportExportService` übergeht `canViewReport()` | AK-906-01, AK-906-02 (Daten) | alle Fachlogik-Fälle: sie laufen ohne Dienst |
    | F-P07-14 „Unbekannt wird verweigert“ (AK-906) | ein unbekannter Bericht ergibt `zugriff_verweigert` statt `nicht_gefunden` | AK-906-01 | AK-906-02 |
    | F-P07-15 „Alle Wochen auf einer Seite“ (AK-902) | `LineBreaker` setzt keinen Seitenumbruch zwischen Wochen | `PdfLayoutTest.AK902_jedeWocheBeginntAufEinerNeuenSeite` | alle Prüffälle: sie prüfen den Inhalt, nicht die Seiten |
    | F-P07-16 „Seitenzahl je Woche“ (AK-901) | „Seite x von y“ zählt je Woche neu | `PdfLayoutTest.AK901_kopfUndFussZeileMitSeitenzahlStehenAufJederSeite` | `PdfLayoutTest.AK902_…` |
    | F-P07-17 „Kopfzeile nur auf Seite 1“ (AK-904) | Kopfzeile wird nur auf der ersten Seite einer Woche gezeichnet | `PdfLayoutTest.AK901_kopfUndFussZeileMitSeitenzahlStehenAufJederSeite`, `PdfLayoutTest.AK904_…` | AK-904-01, AK-904-02 (Inhalt) |
    | F-P07-18 „Text abgeschnitten“ (AK-907) | `LineBreaker` verwirft Zeilen unterhalb der Seite | `PdfLayoutTest.AK907_langerTextErscheintVollstaendig` | AK-907-02 (Inhalt der Fachlogik) |
    | F-P07-19 „Langes Wort läuft aus der Zeile“ (AK-907) | `LineBreaker` bricht Wörter über 24 Zeichen nicht um | `PdfLayoutTest.AK907_wortUeber24ZeichenWirdMitTrennstrichUmbrochen` | `PdfLayoutTest.AK907_kurzesWortWirdNichtGetrennt` |
    | F-P07-20 „Silbentrennung“ (AK-907) | `LineBreaker` trennt auch kurze Wörter am Zeilenende | `PdfLayoutTest.AK907_kurzesWortWirdNichtGetrennt` | `PdfLayoutTest.AK907_wortUeber24ZeichenWirdMitTrennstrichUmbrochen` |
    | F-P07-21 „Standardschrift statt Noto Sans“ (AK-907) | `PDType1Font.HELVETICA` statt der eingebetteten Schrift | `PdfLayoutTest.AK907_umlauteSindMitEingebetteterSchriftDargestellt` | AK-907-01 (Inhalt) |
    | F-P07-22 „Zwischenspeicher erlaubt“ (AK-905) | `Cache-Control` wird nicht gesetzt (oder von `sendFile` überschrieben) | `PdfAntwortTest.AK905_antwortIstNichtZwischenspeicherbar` | `PdfAntwortTest.AK901_dateinameStehtImAntwortkopf` |
    | F-P07-23 „Schrift je Zeile geladen“ (AK-902) | `PDType0Font.load` bei jeder Zeile statt einmal je Dokument | `PdfLayoutTest.AK902_hundertfuenfzigWochenInWenigenSekunden` (Zeitlimit) | alle anderen `PdfLayoutTest`-Tests |

    Prüfschritt: dreiundzwanzig rote Läufe mit den benannten Fällen im PR notiert, danach alles grün. Reißt F-P07-23 das Zeitlimit nicht,
    wird der Fehler verschärft (mehr Wochen) und die Messung im PR festgehalten.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M07` | 24 Fachlogik-Fälle grün, keiner „noch nicht gebaut“ |
| `./gradlew :modules:bh-test-integration:testIntegration --tests '*DatenPrueffaelleTest*' -Pbh.pruefung.modul=M07` | 5 Daten-Fälle grün |
| `./gradlew :modules:bh-domain:test :modules:bh-pdf:test` | JUnit-Tests `AK901_…` bis `AK907_…` und `PdfLayoutTest` grün; Systemzeit-Prüfung grün |
| `./gradlew :modules:bh-test-integration:testIntegration --tests '*PdfExportServiceTest*'` | grün (Zugriff, Zeitraum vor dem Anlegen) |
| `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium --project=smartphone-375` | Ablauf-Fälle der gebauten Module und `PdfAntwortTest` grün |
| `./gradlew build formatSource` | grün, keine Änderungen |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: Firefox und Edge. Im PR vermerken.

## 9. Abschluss

- Commit, z. B. „L72-P07: PDF-Export (Einzel- und Sammel-PDF, Freigabevermerk, Layout mit PDFBox)“; vor dem Push `./gradlew build`, die Prüf-Adapter
  von M07 und die plattformeigenen Tests lokal grün.
- Draft-PR mit der AK-Tabelle (AK-901, AK-902, AK-903, AK-904, AK-905, AK-906, AK-907 mit Test und Prüffällen), den Gegenproben mit den
  roten Fällen, der Messung zu 150 Wochen und „Bitte bestätigen“ (Ersatzzeichen für Zeichen ohne Glyph). Geschützte Pfade: `**/service/impl/**`,
  `**/security/permission/**` und die Build-Dateien (`build.gradle`, `bnd.bnd` des Moduls mit der neuen Bibliothek; gemeinsam 5 und 7); eine
  Bibliothek außerhalb der freigegebenen Liste schließt automatisches Mergen aus. Chris mergt.
- Bericht an die Steuerung per `send_message`; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Umlaute fehlen, Kästchen oder Ausnahme „No glyph“ | Noto Sans einbetten (`PDType0Font.load`); Zeichen ohne Glyph vorher ersetzen |
| „ä“ im Dateinamen wird zu „a“ | zuerst umschreiben, danach Akzente entfernen (Schritt 3) |
| Freigabevermerk bei zurückgenommener Freigabe | `currentApproval()` gilt nur bei Status Freigegeben; sonst Kennzeichnung |
| Vermerk zeigt UTC statt Berliner Zeit | `TIMESTAMP` ist UTC (gemeinsam 2.2); Formatierung mit `Europe/Berlin` aus P01, nie die Zeitzone des Servers |
| Wochentag oder Monat in falscher Sprache | feste deutsche Tabellen statt `Locale` des Servers |
| `new Date()` oder `Instant.now()` im Export | Erstellungszeitpunkt und „heute“ aus `Clock` hineinreichen |
| Abgewiesener Zeitraum legt Wochen an | Zeitraum zuerst prüfen, dann `ensureReportsForTrainee()` |
| PDF wird zwischengespeichert | `Cache-Control: no-store`; Hilfen wie `sendFile` setzen eigene Kopfzeilen, deshalb den Antwortkopf im Test prüfen |
| „Seite x von y“ stimmt nicht | erst umbrechen, dann zeichnen; die Gesamtzahl steht erst nach dem Umbruch fest |
| Überlanges Wort sprengt die Seite | Wörter über 24 Zeichen am Zeilenende mit Trennstrich umbrechen |
| Bundle bleibt `INSTALLED` nach dem Einbetten von PDFBox | ungelöster Import: Abhängigkeiten per `compileInclude`, `diag <id>` in der Gogo-Shell (Profil, Abschnitt 7) |
| Export dauert bei 150 Wochen zu lange | Schrift einmal je Dokument laden, nicht je Zeile; Messung im PR |

# P04 Bericht erfassen (M04)

Reihe `playbooks/liferay-625/` · Plattform Liferay Portal 6.2.5 CE GA6 · Profil `profile/liferay-625.md` (auf Grundlage
von `profile/liferay-gemeinsam.md`) · Stand: 16.10.2026 (Etappe G4, Paket J) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Ein Azubi erfasst seine Woche: Tagesart und Tätigkeiten je Tag (Mo–Fr), Speichern als Entwurf, Zeichenzähler,
Hinweis „Feiertag (vorbelegt)“, Warnung beim Verlassen mit ungespeicherten Änderungen. Fachlogik in
`de.berichtsheft.domain.days`, Speichern in `WeeklyReportLocalServiceImpl.saveDays` mit Zeilensperre, Seite „Bericht“ als
Portlet. Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M04.json` grün sind (7 AK-IDs; 19 Fachlogik- und 9 Ablauf-Fälle), davon der Ablauf-Fall
   AK-408-07 „noch nicht gebaut“ bis P06 (Einreichen kommt in P05, die Historie auf der Seite in P06), also 8 Ablauf-Fälle
   grün; der in P03 zurückgestellte Fall AK-305-09 (M03) ist freigegeben und grün;
2. die eigenen Tests grün sind: `AK407_TextspalteFuenftausendZeichenTest` in `test/db/`, `AK406_SpeichernPrueftRechteAufDemServerTest`,
   `AK406_SpeichernWartetAufSperreDesBerichtsTest` und `AK402_UngueltigeEingabeSpeichertNichtsTest` in `test/integration/` und
   die Unit-Tests der Regeln in `test/unit/` (Schritt 9; kein neutraler Fall prüft Rechte, Sperre und Datenhaltung des
   Speicherns);
3. die **Gegenprobe** aus Schritt 10 durchgeführt ist: jeder benannte Fehler macht genau die benannten Prüffälle bzw.
   Tests rot und ist danach zurückgenommen;
4. die Playwright-Tests `ak-401-405-bericht-anzeigen.spec.ts` und `ak-406-407-entwurf-speichern.spec.ts` in Chromium und
   bei 375 px grün sind.

Schemaänderung: nein. `ReportDay` und `WeeklyReport` kommen aus P03; P04 prüft nur, dass die Spalte `activities` 5.000 Zeichen
fasst (Schritt 9). AK-404 (Feiertag vorbelegt) gehört zu M01; der Hinweis in der Oberfläche liest den gespeicherten Merker aus P03.

## 2. Voraussetzungen

- P00 bis P03 der Reihe abgenommen: Berichte und Tage (`WeeklyReport`, `ReportDay`, `holidayPreset`, `outsideTraining`), Seite
  „Meine Wochen“, Zugriff `canViewReport()` und `DomainRuleException` (P02), Uhr und Wochen (P01).
- P04 blockiert P05 (Einreichen speichert über denselben Baustein).
- Profil 6.2.5, Abschnitte 3 (Transaktion, Sperre und bedingtes Update, Oberfläche), 4.2, 4.3 (Ablauf-Adapter, Merker) und 7
  („Lesende Transaktionen“, „Zurückrollen“, „Cache nach Custom SQL“, „Portal-Bausteine mit festen Farben“, JSP mit Jasper von
  Tomcat 7). Gemeinsames Profil, Abschnitte 2.3 (`BH_ReportDay`), 2.4 (Sperre, Cache) und 2.6.

## 3. Eingaben

- Fach-Spec: `specs/M04-bericht-erfassen.md` (Regeln M04-R01 bis M04-R13, Abschnitt 5 Datenmodell, Abschnitt 6 Schnittstellen,
  Abschnitt 8 Anforderungen an die Plattform).
- Prüffälle: `specs/pruefung/M04.json`; Formate und Aktionen: `specs/pruefung/format.md`, „Schnittstellen von M04
  (Fachlogik)“, „Aufbau eines Ablauf-Falls“ (Aktionen `tag_erfassen`, `speichern`, `seite_verlassen`, Seiteninhalt `bericht`)
  und „Schnittstellen und Aktionen von M05“ (Aktion `tage_speichern`).
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M04 Bericht erfassen“ (Fallen: `\r\n`, Länge in Unicode-Zeichen,
  nicht mitgeschickt gegen leer, Tage außerhalb still übergangen, Sperre des Berichts).
- Profil: `profile/liferay-625.md`, Abschnitte 3, 4.3 und 7; `profile/liferay-gemeinsam.md`, Abschnitte 2.3 und 2.4.
- UI-Vorgaben (Referenz): `docs/05-ui-spezifikation.md`; Gestaltung folgt in P09.

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Übertragbar 1:1 sind die Regeln in `src/domain/report-days.ts` (`DAY_TYPES`, `isDayType()`,
`normalizeActivities()`, `activitiesLength()`, `activitiesError()`, `hasContent()`, `validateDayInputs()`). Nach Profil neu zu
bauen sind `saveReportDays()` in `src/lib/reports.ts` (Prisma-Transaktion und `FOR UPDATE` werden zu Service-Transaktion und
Custom SQL) und `src/app/(app)/berichte/[id]/actions.ts`; `ReportEditor.tsx`, `ReportView.tsx` und
`src/components/ui/day-type.tsx` zeigen Inhalt und Merker, die Umsetzung sind JSP und eigenes Skript (6.2.5 hat keine
einseitige Navigation, die Warnung beim Verlassen ist das `beforeunload`-Ereignis des Browsers). Belege zum Abgleich:
`src/domain/report-days.test.ts`, `tests/db/reports.test.ts`, `e2e/ak-301-408-berichte-erfassen.spec.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Regeln für Tagesarten und Texte, (2) Bearbeitbarkeit, (3) Speichern mit Sperre, (4) Berichtsseite und
Editor, (5) Warnung beim Verlassen, (6) Adapter und Testschnittstelle, (7) eigene Tests, (8) Gegenprobe. Zählweise der
Prüffälle: alle Fälle der Prüffall-Datei je AK-ID, einschließlich der Ablauf-Fälle in `specs/pruefung/M04.json`; M04 hat
kein Ablauf-Szenario in `specs/pruefung/szenarien.json`. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-401 | Jeder Bericht zeigt Mo–Fr mit Datum, pro Tag eine Auswahl der Tagesart und ein Freitextfeld „Tätigkeiten“. | 2 (2 fachlogik): AK-401-01, AK-401-02 | `specs/pruefung/M04.json` |
| AK-402 | Zur Auswahl stehen genau: Betrieb, Berufsschule, Urlaub, Krank, Feiertag. | 4 (4 fachlogik): AK-402-01, AK-402-02, AK-402-03, AK-402-04 | `specs/pruefung/M04.json` |
| AK-403 | Felder für Stunden, Abteilung oder Lernfeld gibt es nicht. | 2 (2 ablauf): AK-403-01, AK-403-02 | `specs/pruefung/M04.json` |
| AK-405 | Der Azubi kann eine vorbelegte Tagesart ändern, z. B. von „Feiertag“ auf „Berufsschule“. | 2 (2 fachlogik): AK-405-01, AK-405-02 | `specs/pruefung/M04.json` |
| AK-406 | Ein Entwurf lässt sich ausdrücklich speichern, auch unvollständig, und später unverändert weiterbearbeiten, auch nach Ab- und erneuter Anmeldung. | 3 (3 fachlogik): AK-406-01, AK-406-02, AK-406-03 | `specs/pruefung/M04.json` |
| AK-407 | Umlaute, Zeilenumbrüche und lange Texte (mindestens 2.000 Zeichen) unverändert; höchstens 5.000 Zeichen je Tag mit Meldung am Feld; Zeilenumbrüche einheitlich. | 8 (8 fachlogik): AK-407-01 bis AK-407-08 | `specs/pruefung/M04.json` |
| AK-408 | Wer die Seite mit ungespeicherten Änderungen verlässt, wird gewarnt (Links, Formulare, Schließen, Neuladen, Zurück und Vor). | 7 (7 ablauf): AK-408-01 bis AK-408-07, davon AK-408-07 bis P06 zurückgestellt | `specs/pruefung/M04.json` |

Summe: 7 AK-IDs, 28 Prüffälle (19 `fachlogik`, 9 `ablauf`), kein Szenario. Der Fall AK-305-09 (`tageSpeichern`, M03) kommt
dazu. AK-401 ist als Fachlogik nur im fachlichen Kern geprüft (Tage Mo–Fr mit Datum); dass Auswahl und Freitextfeld erscheinen,
zeigt der Playwright-Test aus Schritt 9. AK-404 (Hinweis „vorbelegt“) belegt derselbe Test.

## 6. Empfehlung

**Weg B.** Regeln und Prüffälle sind eng, der Editor ist in der Spec beschrieben. Die Gefahr liegt auf 6.2.5 an vier Stellen:
dem Lesen der Formularfelder (nicht mitgeschickt gegen leer, Leerzeichen und Zeilenumbrüche), dem Zurückrollen (Schritt 4),
der Sperre des Berichts und der Warnung ohne einseitige Navigation. Weg A nur auf ausdrücklichen Auftrag.

## 7. Schritte

Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh`, Playwright im Wurzelordner.

1. **Branch** `claude/l62-p04-bericht-erfassen`; Spec (M04-R01 bis M04-R13), Profil 6.2.5, Abschnitte 3 und 7 und Prüffälle lesen. Prüfschritt:
   AK-Tabelle aus Abschnitt 5 im PR-Entwurf.
2. **Regeln `de.berichtsheft.domain.days.ReportDays`** (Gegenstück zu `src/domain/report-days.ts`; M04-R02, M04-R04, M04-R06 bis
   M04-R11; AK-402, AK-405, AK-406, AK-407, AK-305; Java 8, kein Import aus `com.liferay.*`): `DayType` aus P03 mit genau
   fünf Werten in fester Reihenfolge (Betrieb, Berufsschule, Urlaub, Krank, Feiertag) und `dayTypes()`, `isDayType()` (Groß-
   und Kleinschreibung zählt: `betrieb` ist keine Tagesart), `MAX_ACTIVITIES_LENGTH` 5.000, `normalizeActivities()` (jede Form
   des Zeilenumbruchs als `\n`, sonst unverändert, **nie** `trim()`), `activitiesLength()` mit `String.codePointCount` (ein Emoji
   ist ein Zeichen; `String.length()` zählt UTF-16-Einheiten und ist falsch), gezählt **nach** dem Vereinheitlichen,
   `activitiesError()` („um n Zeichen kürzen“), `hasContent()` (mindestens ein Tag mit Tagesart oder Text, einmal berechnet für
   Ausblendung, Erinnerung und PDF) und `validateDayInputs(tage, eingaben)` mit `EditableDay`, `DayInput` (`null` = nicht
   mitgeschickt, bleibt; Tagesart `""` = geleert; Text `null` = bleibt), `DayUpdate` und `DayErrors`: nur Tage, deren Werte sich
   ändern, Tage außerhalb der Ausbildung still unverändert (M04-R08), alle Fehler je Tag auf einmal in der Reihenfolge
   `tagesart_unbekannt`, `text_zu_lang`; bei einem Fehler wird nichts übernommen (M04-R11). Prüfschritt: Unit-Tests in
   `test/unit/` mit Namen ab der AK-ID (`AK402_…`, `AK406_…`, `AK407_…`, `AK305_…`).
3. **Bearbeitbarkeit** `de.berichtsheft.domain.access.ReportAccess.canEditReport()` (M04-R12; nur der eigene, aktive Azubi, nur bei
   offenem Status: Entwurf oder Abgelehnt, `isOpenStatus()` aus P03). P02 und P05 nennen `canEditReport()` als Teil von P05; weil
   Speichern es braucht, legt P04 es an, P05 ergänzt nur die Fälle zu AK-505 und AK-704 (siehe „Bitte bestätigen“). Prüfschritt:
   Unit-Test für die vier Status und die Rollen.
4. **Speichern `saveDays`** in `WeeklyReportLocalServiceImpl` (M04-R06, M04-R12; AK-406, AK-204). Der Name beginnt nicht mit `get`,
   `is`, `has` (Profil 6.2.5, Abschnitt 7 „Lesende Transaktionen“). Ablauf in **einer** Transaktion:
   1. `lockForUpdate` (Custom SQL `SELECT … FROM BH_WeeklyReport WHERE weeklyReportId = ? FOR UPDATE` in
      `WeeklyReportFinderImpl`, Profil 6.2.5, Abschnitt 3 „Sperre und bedingtes Update“): Erst danach werden Status und Person geprüft, damit ein
      gleichzeitiger Statuswechsel aus P05 das Speichern nicht übergeht und umgekehrt (gemeinsames Profil, Abschnitt 2.4). P05 verwendet dieselbe
      Methode und ergänzt `updateStatusConditional`.
   2. Handelnde Person aus `BH_Person` (nicht aus Liferay-Rollen), `canViewReport()` und `canEditReport()` auf dem gesperrten
      Stand; sonst `zugriff_verweigert` (fremder Bericht, falsche Rolle, deaktivierte Person) bzw. `nicht_bearbeitbar` (Status
      nicht offen). Jede Serveraktion prüft Rolle und Besitz selbst.
   3. `validateDayInputs()`. **Zurückrollen:** Eine fachliche Ablehnung **vor dem ersten Schreiben** (`tage_ungueltig`,
      `zugriff_verweigert`, `nicht_bearbeitbar`) ist eine `DomainRuleException` (Unterklasse von `PortalException`): Sie rollt
      zurück und hinterlässt nichts, das ist hier gewollt (alles oder nichts, M04-R11). Eine fachliche Ablehnung **nach** dem
      Schreiben, bei der das Geschriebene bleiben soll, darf **nicht** werfen, weil `PortalException` die ganze Transaktion
      zurückrollt, auch die Tage: Das ist `pflichtangaben_fehlen` beim Einreichen in P05, das als Ergebnis zurückkommt und die
      Tage als Entwurf erhält (Profil 6.2.5, Abschnitt 7 „Zurückrollen“). Deshalb liegt das Schreiben in einer eigenen Methode
      `applyDayUpdates(report, updates)`, die `saveDays` und später `submitReport` (P05) aufrufen; sie prüft nichts mehr.
   4. Nur die geänderten Tage schreiben (`updatedAt` aus der Uhr, nie `new Date()`); `version` und Status ändert Speichern
      nicht (gemeinsames Profil, Abschnitt 2.4). Nach dem Schreiben Entity- und Finder-Cache von `ReportDay` leeren, wenn über Custom SQL
      geschrieben wurde (Profil 6.2.5, Abschnitt 7). Rückgabe: Zahl der geänderten Tage.
   Prüfschritt: `AK406_SpeichernPrueftRechteAufDemServerTest` und `AK402_UngueltigeEingabeSpeichertNichtsTest` (Schritt 9).
5. **Berichtsseite und Editor.** `BerichtPortlet` (`MVCPortlet`) mit JSP unter `docroot/html/bericht/`; Adresse mit der
   `weeklyReportId` über `friendly-url-routes.xml` (Profil 6.2.5, Abschnitt 4.3, „Bitte bestätigen“ dort). `render` liest über `getReportForEdit`
   (`get…`, lesend; prüft `canViewReport()`; ein Bericht, den es nicht gibt oder den die Person nicht sehen darf, ergibt
   dieselbe Antwort wie `zugriff_verweigert`), `processAction` „speichern“ ruft `saveDays`. Je Tag genau zwei Eingaben: Tagesart
   (fünf Werte plus „keine Tagesart“, Beschriftung „Feiertag (vorbelegt)“ nach dem **gespeicherten** Merker `holidayPreset`,
   nicht nach dem heutigen Bundesland und nicht nach der heute gewählten Tagesart; M04-R05) und Tätigkeiten als `<textarea>`;
   keine weiteren Felder (M04-R03, AK-403). Tage außerhalb der Ausbildung sind ausgegraut und gesperrt. Ausbilder und
   Berichte ohne Bearbeitbarkeit sehen den Bericht ohne Eingabefelder (`tage: null` im Seiteninhalt). **Formularfelder lesen:**
   `actionRequest.getParameter(...)` des Portlet-Containers liefert `null` für ein nicht mitgeschicktes Feld (bleibt) und `""`
   für ein leeres (leert die Tagesart); `ParamUtil.getString` liefert für beides `""` und kürzt nach meinem Wissen den Wert
   (Leerzeichen am Anfang und Ende), was M04-R09 und AK-407-01 verletzt, **in diesem Schritt mit einem Wegwerf-Test zu
   bestätigen**. Ausgabe der Tätigkeiten mit `<c:out>` (Maskierung); nach dem öffnenden `<textarea>` steht ein zusätzlicher
   Zeilenumbruch, weil Browser einen ersten Umbruch im Element verschlucken. Nach erfolgreichem Speichern Weiterleitung auf
   die Seite (Erfolgsmeldung des Portlets); bei `tage_ungueltig` bleiben die Eingaben im Formular, die Meldung steht am Tag
   und am Feld (Fehlerleiste mit Sprunglink, Merker `data-fehler`, `data-feld`, `data-datum`). Zeichenzähler im Browser zählt
   Unicode-Zeichen (`codePointAt`-Schleife oder Regex für Ersatzpaare, kein `length`); maßgeblich bleibt der Server. Gestaltung
   (UI-AK-07, UI-AK-08) folgt in P09. Prüfschritt: Anna speichert Montag mit Umlauten, Leerzeichen am Ende und einem
   Zeilenumbruch; die Seite zeigt den Text unverändert.
6. **Warnung beim Verlassen** (M04-R13, AK-408). 6.2.5 hat keine einseitige Navigation (Profil 6.2.5, Abschnitt 1): Jeder Link, jedes Formular,
   Neuladen, Zurück, Vor und Schließen lädt die Seite neu oder verlässt sie; die Warnung ist deshalb das `beforeunload`-Ereignis
   des Browsers (Dialog des Browsers, kein Text der App). Ein eigenes Skript im Portlet (ES5, ohne AlloyUI) prüft beim Verlassen,
   ob ein Feld von seinem Ausgangswert (`defaultValue`) abweicht, statt auf Eingabeereignisse zu bauen: Eingaben vor dem Laden
   des Skripts gehen so nicht verloren. Das Skript steht direkt unter dem Formular. Es setzt die Merker `data-ungespeichert`
   und `data-warnung-verlassen="ungespeicherte_aenderungen"` am Berichtsformular, solange Änderungen vorliegen; „Speichern“
   (und später „Einreichen“, P05) schalten die Warnung vor dem Absenden ab, nach dem Speichern lädt die Seite mit den
   gespeicherten Werten neu und warnt nicht mehr. Dieselben Merker wie in der TypeScript-App (Liste in
   `specs/code-landkarte.md`, Abschnitt M09): `data-ungespeichert`, `data-warnung-verlassen`, `data-ausstehend`,
   `data-speicherstand`. Prüfschritt: Browser-Test AK-408 in Chromium und bei 375 px.
7. **Ablauf-Adapter** (Profil 6.2.5, Abschnitt 4.3) unter `liferay-625/e2e/`: Aktionen `tag_erfassen` (Eingabe mit echten Tastenanschlägen,
   `keyboard.type`, nicht `fill`: Chromium zeigt den `beforeunload`-Dialog nur nach einer Nutzerinteraktion), `speichern`,
   `seite_verlassen` mit allen Wegen (`link`, `neu_laden`, `zurueck`, `vor`, `schliessen`) und `dialog` (`abbrechen`,
   `bestaetigen`); der Adapter hört auf `page.on("dialog")`, nimmt den Code der Warnung aus `data-warnung-verlassen` und
   meldet einen Dialog bei nicht gesetztem Merker als Fehler des Adapters (wie `e2e/pruefung/ablauf-adapter.ts`, ohne diese
   Datei zu ändern). Seiteninhalt der Seite `bericht`: `woche`, `status`, `ungespeichert`, `tage` mit den Eingabefeldern
   `tagesart` und `taetigkeiten` (oder `null`), `weitere_felder`, `historie` (bis P06 leer); ein Feld, das keines von beiden ist,
   liefert der Adapter als `ohne_merker`, damit AK-403 scheitert, wenn eines dazukommt. Die Seite `bericht` löst `azubi` und
   `woche` über die Testschnittstelle in die `weeklyReportId` auf (Aktion `bericht_adresse`, nur bei `bh.betrieb=test`, die
   Kennung als Text, nie als Zahl). Die Testgrenze für AK-408-03 in Firefox (Q-R06) gilt unverändert. **Fachlogik-Adapter**
   (`FachlogikAdapter`): `tagesarten`, `tageSpeichern`, `berichtstageAnlegen` (aus P03). **Daten-Aktion** `tage_speichern`
   (`als`, `azubi`, `woche`, `tage` mit `alle` und `Mo` bis `Fr`) in der Testschnittstelle, ruft **denselben Service** wie das
   Portlet (`saveDays`); Fehler als `{ "fehler": "<code>" }` aus dem `Fehlercode`, nie aus dem Meldungstext; Personen stehen an der Grenze zum Prüf-Adapter als Schlüssel (`anna`); Kennungen wie die Konto-ID (`userId`) und die `weeklyReportId` gehen immer als Text (String), nie als JSON-Zahl (Profil 6.2.5, Abschnitt 4.2). Den Ausgangsbestand
   `tage` stellt sie für alle Module her. Prüfschritt: `ant pruefung-fachlogik -Dbh.pruefung.filter=M04.json` (19 Fälle) und
   `-Dbh.pruefung.filter=AK-305-09` grün; Playwright mit `-g "M04.json"` in Chromium und bei 375 px.
8. **Bau-Stand.** M04 in `BauStand.java` eintragen, AK-305-09 freigeben, AK-408-07 als zurückgestellt (bis P06) eintragen.
   Prüfschritt: kein roter Fall, AK-408-07 „noch nicht gebaut“.
9. **Eigene Tests** (Namen beginnen mit der AK-ID, JUnit ohne Bindestrich, Profil 6.2.5, Abschnitt 4.1):
   - `AK407_TextspalteFuenftausendZeichenTest` (`test/db/`): Ein `INSERT` in `BH_ReportDay` mit 5.000 Zeichen einschließlich eines
     Emojis und `\n` liest dieselben Zeichen zurück (die Spalte ist `TEXT`, die Verbindung UTF-8; Service Builder legt Texte über
     4.000 Zeichen so an, gemeinsames Profil, Abschnitt 2.1).
   - `AK406_SpeichernPrueftRechteAufDemServerTest` (`test/integration/`): über `tage_speichern` der Testschnittstelle:
     Anna speichert ihren Entwurf (gelingt); Clara speichert Annas Bericht, Bernd (Ausbilder) ebenso und die deaktivierte Anna
     ihren eigenen: jeweils `zugriff_verweigert` (die Oberfläche ist dabei nie beteiligt, M04-R12).
   - `AK406_SpeichernWartetAufSperreDesBerichtsTest` (`test/integration/`): Der Test hält über eine eigene JDBC-Verbindung
     `SELECT … FOR UPDATE` auf Annas Berichtszeile; `tage_speichern` in einem zweiten Thread kehrt nicht innerhalb von zwei
     Sekunden zurück und gelingt nach dem Freigeben der Sperre (M04-R12, M04 Abschnitt 8: „Statuswechsel und Speichern schließen
     sich aus“; den Statuswechsel selbst prüft P05).
   - `AK402_UngueltigeEingabeSpeichertNichtsTest` (`test/integration/`): Montag gültig, Dienstag mit Tagesart „Homeoffice“:
     `tage_ungueltig`, Montag danach unverändert (alles oder nichts, M04-R11); ebenso mit einem zu langen Text.
   - Playwright `liferay-625/e2e/ak-401-405-bericht-anzeigen.spec.ts`: Bericht zeigt Mo–Fr mit Datum, je Tag Tagesart und
     Tätigkeiten; Fronleichnam 2027 ist bei Bundesland `NW` „Feiertag (vorbelegt)“; nach dem Wechsel auf `NI` und nach dem Ändern der
     Tagesart bleibt der Hinweis (M04-R05, AK-404 in der Oberfläche); Tagesart von „Feiertag“ auf „Berufsschule“ ändern (AK-405).
   - Playwright `liferay-625/e2e/ak-406-407-entwurf-speichern.spec.ts`: Anna speichert einen unvollständigen Entwurf, meldet sich
     ab und wieder an, der Inhalt ist unverändert (AK-406); 2.000 und 5.000 Zeichen werden angenommen, 5.001 mit Meldung am Feld,
     die nennt, um wie viele Zeichen zu kürzen ist (AK-407).
   - Unit-Tests der Regeln (Schritt 2) und `canEditReport()` (Schritt 3).
   Prüfschritt: `ant test-unit test-db test-integration` und der Playwright-Lauf grün.
10. **Gegenprobe** (Gemeinsame Regeln, „Gegenprobe“; Profil 6.2.5, Abschnitt 7 „Zurückrollen“). Jeden Fehler einzeln einbauen, die genannten
    Befehle laufen lassen, Ergebnis im PR festhalten, Fehler zurücknehmen. Eine Gegenprobe zählt nur, wenn die benannten
    Fälle rot werden:

    | Nr. | Absichtlich eingebauter Fehler | Wird rot | Befehl |
    | --- | --- | --- | --- |
    | G4-1 (AK-402) | `dayTypes()` liefert eine sechste Tagesart „Homeoffice“ und `isDayType()` nimmt sie an | AK-402-01 und AK-402-02 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-402` |
    | G4-2 (AK-402) | `isDayType()` vergleicht ohne Beachtung der Schreibweise | AK-402-03 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-402` |
    | G4-3 (AK-407) | `activitiesLength()` zählt mit `String.length()` statt Unicode-Zeichen | AK-407-07 (Emoji an der Grenze von 5.000 Zeichen) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-407` |
    | G4-4 (AK-407) | die Länge wird vor dem Vereinheitlichen der Zeilenumbrüche gezählt | AK-407-06 (`\r\n` zählt zwei) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-407` |
    | G4-5 (AK-407) | `normalizeActivities()` ruft `trim()` auf | AK-407-01 (Leerzeichen am Ende gehen verloren) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-407` |
    | G4-6 (AK-407) | `normalizeActivities()` vereinheitlicht die Zeilenumbrüche nicht | AK-407-02 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-407` |
    | G4-7 (AK-407) | Obergrenze ausschließlich (`>=` 5.000 wird abgewiesen) | AK-407-04; AK-407-05 bleibt grün | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-407` |
    | G4-8 (AK-407) | nur der erste Fehler je Tag wird gemeldet | AK-407-08 (beide Meldungen am selben Tag) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-407` |
    | G4-9 (AK-406) | ein nicht mitgeschicktes Feld (`null`) leert den gespeicherten Wert | AK-406-02 und AK-406-03 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-406` |
    | G4-10 (AK-406) | unveränderte Tage stehen in `aenderungen` | AK-406-02 (Dienstag) | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-406` |
    | G4-11 (AK-305) | Tage außerhalb der Ausbildung werden geändert | AK-305-09 | `ant pruefung-fachlogik -Dbh.pruefung.filter=AK-305-09` |
    | G4-12 (AK-402) | `saveDays` schreibt die gültigen Tage zuerst und gibt `tage_ungueltig` als Rückgabewert zurück (keine Ausnahme, keine Rückrollung) | `AK402_UngueltigeEingabeSpeichertNichtsTest` (Montag bleibt geändert) | `ant test-integration -Dtest.class=AK402_UngueltigeEingabeSpeichertNichtsTest` |
    | G4-13 (AK-406) | `saveDays` prüft den Besitz nicht (nur die Rolle Azubi) | `AK406_SpeichernPrueftRechteAufDemServerTest` (Clara speichert Annas Bericht) | `ant test-integration -Dtest.class=AK406_SpeichernPrueftRechteAufDemServerTest` |
    | G4-14 (AK-406) | `saveDays` ruft `lockForUpdate` nicht auf | `AK406_SpeichernWartetAufSperreDesBerichtsTest` (kehrt sofort zurück) | `ant test-integration -Dtest.class=AK406_SpeichernWartetAufSperreDesBerichtsTest` |
    | G4-15 (AK-407) | `activities` mit höchstens 4.000 Zeichen in `portlet-model-hints.xml` (Spalte `VARCHAR(4000)`) | `AK407_TextspalteFuenftausendZeichenTest` | `ant test-db -Dtest.class=AK407_TextspalteFuenftausendZeichenTest` |
    | G4-16 (AK-408) | das Skript setzt `onbeforeunload` nicht | AK-408-01 bis AK-408-05; AK-408-06 bleibt grün | `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=chromium -g "AK-408"` |
    | G4-17 (AK-408) | die Warnung bleibt nach dem Speichern bestehen (Ausgangswerte nicht aktualisiert) | AK-408-06 | wie G4-16 |
    | G4-18 (AK-403) | ein zusätzliches Eingabefeld „Stunden“ je Tag in der JSP | AK-403-01 und AK-403-02 (Feld als `ohne_merker`) | `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=chromium -g "AK-403"` |
    | G4-19 (AK-404) | der Hinweis „vorbelegt“ wird aus dem heutigen Bundesland berechnet statt aus dem Merker | `ak-401-405-bericht-anzeigen.spec.ts` (Hinweis fehlt nach dem Wechsel auf `NI`) | Playwright mit `-g "ak-401"` |

    Prüfschritt: Tabelle mit dem tatsächlichen Ergebnis je Zeile im PR; nach dem Zurücknehmen alles grün. Wird ein
    benannter Fall nicht rot, ist die Prüfung ohne Wirkung: anhalten und der Steuerung melden.
11. **Prüfung** nach Abschnitt 8.

## 8. Prüfung

Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh`, Playwright im Wurzelordner.

| Befehl | Erwartet |
| --- | --- |
| `ant pruefung-fachlogik -Dbh.pruefung.filter=M04.json` | 19 Fälle grün |
| `ant pruefung-fachlogik -Dbh.pruefung.filter=M03.json` | 39 Fälle grün, AK-305-09 jetzt mit |
| `ant test-unit` | grün, auch Regeln des Speicherns, `canEditReport()` und `DomainOhneLiferayTest` |
| `ant test-db` | grün, auch `AK407_TextspalteFuenftausendZeichenTest` |
| `ant test-integration` | grün, auch `AK406_SpeichernPrueftRechteAufDemServerTest`, `AK406_SpeichernWartetAufSperreDesBerichtsTest` und `AK402_UngueltigeEingabeSpeichertNichtsTest` |
| `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=chromium --project=smartphone-375 -g "M04.json"` | 8 Ablauf-Fälle grün (AK-403-01, AK-403-02, AK-408-01 bis AK-408-06), AK-408-07 „noch nicht gebaut“ (bis P06) |
| `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=chromium --project=smartphone-375 -g "ak-401"` und `-g "ak-406"` | die zwei eigenen Tests grün |
| Gegenprobe aus Schritt 10 | jede Zeile rot wie benannt, danach zurückgenommen und grün |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: der volle Liferay-6.2.5-Job; Firefox und Edge (AK-408-03 in Firefox ist die freigegebene Testgrenze); im PR vermerken.

## 9. Abschluss

- Commit, z. B. „L62 P04: Bericht erfassen (Editor, Speichern mit Sperre, Warnung beim Verlassen)“; vor dem Push alle Befehle
  aus Abschnitt 8 lokal grün.
- Draft-PR mit der AK-Tabelle (AK-401, AK-402, AK-403, AK-405, AK-406, AK-407, AK-408 mit Test und Prüffällen), den
  zurückgestellten Fällen (AK-408-07 bis P06), der Gegenprobe-Tabelle mit Ergebnis und „Bitte bestätigen“. `custom-sql/**` und
  `service/impl/**` sind sicherheitsrelevant (gemeinsames Profil, Abschnitt 5); Chris gibt frei.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Zeichenzähler weicht bei Emojis ab | Unicode-Zeichen zählen (`codePointCount`), nicht `length()` (G4-3) |
| `\r\n` in der Datenbank oder doppelt gezählt | `normalizeActivities()` vor dem Zählen und Speichern (G4-4, G4-6) |
| Leerzeichen am Ende verschwinden | nirgends `trim()`; Formularfelder mit `actionRequest.getParameter` lesen, `ParamUtil.getString` prüfen (Schritt 5) (G4-5) |
| Leeres Feld und nicht mitgeschicktes Feld verwechselt | `null` bleibt, `""` leert die Tagesart (G4-9) |
| Ein erster Zeilenumbruch im Text fehlt nach dem Neuladen | zusätzlicher Umbruch nach dem öffnenden `<textarea>`; der Browser verschluckt den ersten |
| Ungültige Eingabe speichert trotzdem einen Teil | Ablehnung vor dem Schreiben als `PortalException`, nie als Rückgabewert nach dem Schreiben (G4-12) |
| Einreichen verliert die Tage, wenn Pflichtangaben fehlen | nicht werfen: `pflichtangaben_fehlen` ist ein Ergebnis (P05); `applyDayUpdates` ist der gemeinsame Baustein |
| Speichern überfährt ein gleichzeitiges Einreichen | `lockForUpdate` zuerst, Status danach prüfen (G4-14) |
| Speichern speichert nichts | Methodenname mit `get`, `is`, `has` läuft nur lesend (Profil 6.2.5, Abschnitt 7) |
| Die Warnung erscheint nicht, obwohl Änderungen vorliegen | Chromium zeigt `beforeunload` nur nach Nutzerinteraktion; im Adapter mit `keyboard.type` eingeben, nicht mit `fill` |
| Die Warnung erscheint nach dem Speichern | Ausgangswerte (`defaultValue`) aus dem gespeicherten Stand neu rendern; Weiterleitung nach dem Speichern (G4-17) |
| Hinweis „Feiertag (vorbelegt)“ stimmt nach Bundeslandwechsel nicht | `holidayPreset` aus der Datenhaltung lesen (G4-19) |
| Der Ablauf-Fall findet ein Feld nicht | feste Merker (`data-feld`, `data-woche`, `data-datum`) nicht umbenennen; der Adapter liest nie Meldungstexte |
| Eingaben gehen vor dem Laden des Skripts verloren | Ausgangswerte vergleichen statt Eingabeereignisse zählen (Schritt 6) |

## Bitte bestätigen

- [ ] `canEditReport()` und `lockForUpdate` entstehen schon in P04, obwohl P02 (Schritt 5) und P05 (Schritte 5 und 6) sie als
      Teil von P05 nennen; Speichern braucht beide (M04-R12). P05 ergänzt die Fälle zu AK-505 und AK-704 und
      `updateStatusConditional`.
- [ ] AK-408-07 bis P06 zurückgestellt: Der Fall verlangt Einreichen (P05) und die Historie auf der Berichtsseite (P06). P00
      führt im Bau-Stand nur AK-305-09 und AK-205-01/02 als zurückgestellt; in der TypeScript-Reihe läuft der Fall schon in P04,
      weil Einreichen und Historie dort im Code stehen. P00 und der Bau-Stand sind um diese Zeile zu ergänzen.
- [ ] Formularfelder über `actionRequest.getParameter` statt `ParamUtil`; ob `ParamUtil.getString` Werte kürzt, ist in Schritt 5
      zu bestätigen (das Profil sagt dazu nichts).
- [ ] Testaktion `bericht_adresse` (Kennung als Text) der Testschnittstelle, damit der Ablauf-Adapter `azubi` und `woche` in die
      Adresse der Seite übersetzt; die Adressform über `friendly-url-routes.xml` legt P00 fest (Profil 6.2.5, Abschnitt 4.3).
- [ ] Warnung beim Verlassen als `beforeunload`-Dialog des Browsers für alle Wege (Links, Formulare, Neuladen, Zurück, Vor,
      Schließen); die TypeScript-App fängt Links mit einer Rückfrage der App ab. Der Merker `data-warnung-verlassen` bleibt gleich.
- [ ] Das Playbook folgt dem Aufbau aus P05 der Reihe und „Aufbau der Reihe (gilt für P01 bis P10)“ aus
      `playbooks/liferay-72/P00-grundgeruest.md`; die P00 der Reihe 6.2.5 trägt diesen Abschnitt nicht.

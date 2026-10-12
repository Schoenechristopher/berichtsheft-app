# UI-Spezifikation Berichtsheft-App

Stand: 11.10.2026 · freigegeben am 12.10.2026 · Entwurf: [UI-Entwurf Berichtsheft-App](https://claude.ai/artifact/6w5J64847JtG9CRZ3uVsTp) (sieben klickbare Ansichten, Hell/Dunkel je Ansicht über die Tweaks)

## Ziel und Geltungsbereich

Die Oberfläche der Berichtsheft-App wird neu gestaltet: ruhig, sachlich, mit Akzentfarbe Petrol, Dunkelmodus und WCAG 2.2 AA. Das fachliche Verhalten ändert sich nicht. Maßgeblich bleiben `docs/01-spezifikation.md` (AK-101 bis AK-1102) und `docs/02-plan.md`. Alle bestehenden Tests müssen nach dem Umbau grün bleiben.

- **Gilt für:** alle Seiten der App, inklusive Anmeldung und „Kein Zugang“.
- **Gilt nicht für:** das PDF (bleibt wie in Etappe 5), E-Mail-Texte und die Keycloak-Anmeldeseite.
- **Zusätzlich:** Ein klickbarer HTML-Entwurf zeigt die Seiten Start Azubi, Woche erfassen, Prüfansicht und Einstellungen am Desktop und am Handy, hell und dunkel. Bei Widersprüchen zwischen Entwurf und Text gilt dieser Text.
- **Rollen:** Azubi und Ausbilder. Ausbilder haben zugleich die Admin-Funktionen (Personen, Nicht zustellbar), wie in AK-104.

## Gestaltungsgrundsätze

Die App soll wirken wie gute Bürosoftware: unaufgeregt, gut lesbar, eindeutig. Wer sie zum ersten Mal öffnet, findet die nächste Aufgabe ohne Erklärung.

1. **Die nächste Aufgabe zuerst.** Jede Startseite zeigt oben, was jetzt zu tun ist (Azubi: aktuelle und offene Wochen; Ausbilder: Berichte zur Prüfung).
2. **Farbe hat Bedeutung.** Flächen sind neutral. Petrol markiert Hauptaktionen und Links, Statusfarben nur den Status. Keine dekorativen Farbverläufe oder Illustrationen.
3. **Eine Hauptaktion pro Bereich.** Pro Seite oder Panel genau ein gefüllter Knopf (z. B. „Einreichen“); alles andere als zweitrangige Knöpfe oder Links.
4. **Status nie nur über Farbe.** Jeder Status hat Text und Symbol, jede Fehlermeldung steht als Text am Feld.
5. **Weißraum statt Rahmen.** Gruppen entstehen durch Abstand und Überschriften, Rahmen nur für Karten und Eingabefelder.
6. **Sprache wie im Betrieb.** Kurze deutsche Texte, Begriffe aus der Spezifikation (Woche, Tagesart, Einreichen, Freigeben, Ablehnen, Zurücknehmen), keine Fachbegriffe aus der Technik.
7. **Mobil gleichwertig.** Jede Funktion ist bei 375 px vollständig bedienbar; Berührflächen mindestens 44 × 44 px.

## Design-Tokens

Alle Farben, Schriften und Abstände stehen als CSS-Variablen in `src/app/globals.css` und sind über Tailwind (`@theme`) nutzbar. Komponenten verwenden nur diese Tokens, nie feste Farbwerte. So lässt sich Petrol später mit einer Zeile gegen eine Firmenfarbe tauschen.

### Farben

| Token | Verwendung | Hell | Dunkel |
| --- | --- | --- | --- |
| `--bg` | Seitenhintergrund | #F7F8F8 | #0F1415 |
| `--surface` | Karten, Seitenleiste, Panels | #FFFFFF | #171D1F |
| `--surface-muted` | Tage außerhalb der Ausbildung, Tabellenkopf | #EEF1F1 | #1F2729 |
| `--border` | Rahmen von Karten und Feldern | #D9DFDF | #2E3A3C |
| `--text` | Fließtext, Überschriften | #1A2224 | #E6ECEC |
| `--text-muted` | Hilfetexte, Datumsangaben | #5A6668 | #9AA8AA |
| `--accent` | Hauptknopf, Links, aktiver Menüpunkt | #0F6B6F | #5CC0C2 |
| `--accent-hover` | Hover/gedrückt | #0B5558 | #7DD0D2 |
| `--accent-soft` | Hinterlegung aktiver Menüpunkt, ausgewählte Zeile | #E3F1F1 | #183436 |
| `--on-accent` | Text auf `--accent` | #FFFFFF | #0B1F20 |
| `--focus` | Fokusring (2 px, 2 px Abstand) | #0F6B6F | #7DD0D2 |
| `--danger` | Fehlermeldungen, Ablehnen, Löschen | #B42318 | #F97066 |

### Statusfarben

Jeder Status erscheint als Status-Chip mit Symbol und Text. Die Kontraste von Text zu Hintergrund liegen über 4,5 : 1.

| Status | Symbol | Text hell / Grund hell | Text dunkel / Grund dunkel |
| --- | --- | --- | --- |
| Entwurf | Stift | #475467 / #F2F4F7 | #CDD5DF / #263033 |
| Eingereicht | Pfeil nach oben | #1849A9 / #EAF2FF | #9EC5FF / #172A45 |
| Freigegeben | Haken | #067647 / #E8F7EE | #75E0A7 / #12321F |
| Abgelehnt | Kreuz im Kreis | #B42318 / #FEF0EE | #FDA29B / #3D1A17 |
| Überfällig (Hinweis, kein Status) | Uhr | #93370D / #FEF6E7 | #FEC84B / #3A2A0E |

### Schrift

- **Schriftart:** IBM Plex Sans (Lizenz OFL), über `next/font` lokal gebündelt (kein Abruf aus dem Internet zur Laufzeit); Ersatz: Systemschrift.
- **Größen (px / Zeilenhöhe):** 12/16 Kleintext · 14/20 Tabellen, Hilfetext · 16/24 Fließtext und Eingaben · 18/28 Abschnittsüberschrift · 24/32 Seitentitel · 30/36 nur Startkarte.
- **Gewichte:** 400 normal, 500 Beschriftungen und Knöpfe, 600 Überschriften. Eingabefelder mindestens 16 px, damit iOS nicht zoomt.
- **Zahlen:** tabellarische Ziffern (`font-variant-numeric: tabular-nums`) für KW, Datum und Zähler.

### Abstände, Radien, Schatten

- **Raster:** 4 px; üblich 8, 12, 16, 24, 32, 48.
- **Radien:** 6 px Knöpfe und Felder, 10 px Karten und Dialoge, rund für Chips und Zähler.
- **Schatten:** nur Dialoge, Ausklappmenü und Toast; Karten haben Rahmen statt Schatten.

### Breakpoints

| Name | ab Breite | Änderung |
| --- | --- | --- |
| Handy | 0 px | Burger-Menü, Tage untereinander, Prüfliste und Bericht nacheinander |
| `md` | 768 px | Tabellen statt Kartenlisten, zweispaltige Formulare |
| `lg` | 1024 px | feste Seitenleiste, geteilte Prüfansicht |
| `xl` | 1280 px | Woche erfassen mit fünf Spalten nebeneinander |

## Layout und Navigation

Ab 1024 px steht links eine feste Seitenleiste (240 px), darunter am Handy ein Burger-Menü. Die Kopfzeile mit Glocke und Konto ist immer sichtbar.

### Rahmen

- **Kopfzeile (56 px, fest oben):** links Burger-Knopf (nur unter 1024 px) und Schriftzug „Berichtsheft“, rechts Glocke mit Zähler und Kontomenü (Name, Rolle, „Einstellungen“, „Abmelden“).
- **Seitenleiste (ab 1024 px):** Menüpunkte mit Symbol und Text; aktiver Punkt mit `--accent-soft` hinterlegt, Text in `--accent`, `aria-current="page"`. Unten klein: „Demo“-Hinweis, solange Test-Login oder Teams-Postfach aktiv ist.
- **Burger-Menü (unter 1024 px):** öffnet die Seitenleiste als Schublade von links (max. 320 px, Rest abgedunkelt). Schließt per „Schließen“-Knopf, Escape, Tippen auf den abgedunkelten Bereich und nach Auswahl eines Menüpunkts. Fokus bleibt in der Schublade gefangen und kehrt danach zum Burger-Knopf zurück.
- **Inhalt:** Seitentitel (24 px) mit optionaler Aktion rechts, darunter der Inhalt. Maximale Breite 1120 px, außer Woche erfassen und Prüfansicht (volle Breite neben der Seitenleiste). Seitenrand 16 px am Handy, 32 px ab `lg`.
- **Browser-Titel:** „&lt;Seite&gt; – Berichtsheft“, z. B. „KW 41/2026 – Berichtsheft“.

### Menüpunkte

| Rolle | Menüpunkte (Reihenfolge) |
| --- | --- |
| Azubi | Start · Meine Wochen · Benachrichtigungen · Einstellungen |
| Ausbilder | Start · Prüfliste (mit Zähler offener Prüfungen) · Azubis · Personen · Benachrichtigungen · Einstellungen · Nicht zustellbar (nur wenn > 0, mit rotem Zähler) |
| beide, nur Demo | Teams-Postfach (Demo), abgesetzt unter einer Trennlinie |

- **Start Azubi** und **Meine Wochen** sind getrennt: Start zeigt Aufgaben, Meine Wochen die vollständige Liste mit Filter und Sammel-PDF.
- **Azubis** (Ausbilder) ist die Liste aller Azubis mit Fortschritt; die Personenverwaltung bleibt unter **Personen**.
- **Glocke:** Zähler der ungelesenen App-Benachrichtigungen (ab 100 „99+“), `aria-label` „Benachrichtigungen, 3 ungelesen“. Ein Klick öffnet eine Vorschau der letzten 5 mit Link „Alle anzeigen“; am Handy direkt die Seite Benachrichtigungen.

### Zurück-Navigation

Unterseiten (ein Bericht, eine Person, ein Azubi) zeigen über dem Titel einen Link „← Zurück zu &lt;Liste&gt;“. Die Warnung bei ungespeicherten Änderungen (AK-408) gilt für alle Wege: Menü, Zurück-Link, Browser-Zurück und Schließen des Tabs.

## Komponenten

Alle Seiten bauen auf denselben Komponenten in `src/components/ui/` auf; eine Seite definiert keine eigenen Knöpfe, Felder oder Dialoge.

| Komponente | Varianten | Regeln |
| --- | --- | --- |
| Knopf | Haupt (gefüllt Petrol), Zweitrangig (Rahmen), Text, Gefahr (gefüllt `--danger`) | Höhe 40 px, mobil 44 px; Text als Verb („Einreichen“, nicht „OK“); während einer Aktion deaktiviert mit Ladekreis und Text „Wird eingereicht …“ |
| Textfeld / Textbereich | einzeilig, mehrzeilig mit Zeichenzähler | Beschriftung immer sichtbar über dem Feld, nie nur Platzhalter; Fehler unter dem Feld in `--danger` mit Symbol, Feld mit rotem Rahmen und `aria-invalid`; Zähler „1.234 / 5.000“ ab 80 % sichtbar |
| Auswahl Tagesart | Segment-Auswahl (ab `md`), Ausklappliste (Handy) | genau die fünf Werte Betrieb, Berufsschule, Urlaub, Krank, Feiertag; vorbelegter Feiertag mit Hinweis „Feiertag (vorbelegt)“ |
| Status-Chip | Entwurf, Eingereicht, Freigegeben, Abgelehnt | Symbol + Text, Farben laut Tokens; daneben optional Hinweis-Chip „Überfällig“ |
| Karte | Standard, hervorgehoben (linke Kante 4 px Akzent oder Warnfarbe) | Rahmen `--border`, Radius 10 px, Innenabstand 16/24 px |
| Liste / Tabelle | Tabelle ab `md`, darunter Kartenliste | ganze Zeile klickbar mit einem Link; Kopfzeile `--surface-muted`; Sortierung sichtbar am Spaltenkopf |
| Dialog | Bestätigen, Bestätigen mit Pflichtgrund | modal, Titel als Frage („Woche einreichen?“), Folge in einem Satz, Knopf mit Verb; Fokus auf erstes Feld bzw. auf „Abbrechen“ bei Gefahr; Escape bricht ab |
| Toast | Erfolg, Fehler | unten rechts, mobil unten mittig; Erfolg verschwindet nach 5 s, Fehler bleibt bis geschlossen; `role="status"` bzw. `role="alert"` |
| Hinweisleiste | Info, Warnung, Fehler | oben im Inhalt, z. B. Ablehnungskommentar, „Schreibgeschützt“, „Keine Kanäle gewählt“ |
| Glocke | mit/ohne Zähler | siehe Navigation |
| Wochen-Kachel | aktuelle Woche, offene Woche | KW, Zeitraum, Status-Chip, Fortschritt „3 von 5 Tagen ausgefüllt“, ein Knopf |

### Zustände jeder Liste und Seite

- **Laden:** Platzhalter-Balken in der Form des Inhalts (Skeleton), kein Ladekreis über der ganzen Seite. Erscheint erst nach 300 ms.
- **Leer:** ein Satz, was hier erscheinen wird, und wenn sinnvoll ein Knopf. Beispiele: „Keine Berichte zur Prüfung. Neue Einreichungen erscheinen hier.“ · „Keine Benachrichtigungen.“
- **Fehler:** „Die Daten konnten nicht geladen werden.“ mit Knopf „Erneut versuchen“; Serverfehler bei Aktionen als Fehler-Toast mit der Meldung aus der Fachlogik (z. B. AK-508 „Der Bericht wurde inzwischen geändert …“).
- **Kein Zugriff / nicht gefunden:** eine gemeinsame Seite „Bericht nicht gefunden“, wie bisher für fremde und unbekannte IDs gleich.

## Seiten im Detail

Vier Seiten tragen die Neugestaltung und sind im Entwurf gezeigt: Start Azubi, Woche erfassen, Prüfansicht und Einstellungen. Die übrigen Seiten übernehmen Rahmen und Komponenten ohne eigenen Entwurf.

### Start Azubi (`/azubi`)

1. **Begrüßung:** „Hallo Anna“, darunter Ausbildungsberuf und Zeitraum in `--text-muted`.
2. **Aktuelle Woche (große Karte):** „Diese Woche · KW 41/2026 · 05.10.–09.10.“, Status-Chip, fünf kleine Tagesmarken Mo–Fr (ausgefüllt / leer / außerhalb), Fortschritt „3 von 5 Tagen ausgefüllt“, Hauptknopf „Weiter erfassen“ (bei „Eingereicht“: „Ansehen“).
3. **Zu erledigen:** alle offenen Wochen vor der aktuellen (Definition „offen“ aus der Spezifikation), älteste zuerst. Abgelehnte Wochen oben mit Chip „Abgelehnt“ und erster Zeile des Gesamtkommentars, überfällige Entwürfe mit Chip „Überfällig“. Leer: „Alles erledigt – keine offenen Wochen.“ mit Haken.
4. **Zuletzt:** die nächsten 5 Wochen (eingereicht oder freigegeben) mit Link „Alle Wochen anzeigen“ zu Meine Wochen.

### Meine Wochen (`/azubi/wochen`, neu) und Wochen eines Azubis (Ausbilder)

Vollständige Liste wie bisher (AK-306): KW, Zeitraum, Status, neueste zuerst, offene Wochen in der Vergangenheit hervorgehoben. Neu: Filter „Alle / Offen / Eingereicht / Freigegeben“ als Segment-Auswahl und der Sammel-PDF-Export rechts im Seitentitel (Dialog mit Von/Bis). Ab `md` Tabelle, darunter Kartenliste.

### Woche erfassen (`/berichte/[id]`)

- **Kopf:** „← Zurück“, Titel „KW 41/2026“, Zeitraum, Status-Chip; rechts zweitrangig „Als PDF herunterladen“, bei Ausbildern zusätzlich der Azubi-Name.
- **Hinweisleiste je nach Status:** Abgelehnt → Gesamtkommentar mit Name und Datum (Warnung); Eingereicht → „Eingereicht am … – schreibgeschützt“ mit Knopf „Zurückziehen“; Freigegeben → „Freigegeben von Bernd Beispiel am …“ (Erfolg).
- **Tage ab 1280 px:** fünf gleich breite Spalten Mo–Fr. Jede Spalte: Wochentag und Datum, Tagesart (Ausklappliste), Textbereich „Tätigkeiten“, der mit dem Inhalt mitwächst (min. 12 Zeilen, Spalten bleiben gleich hoch), Zeichenzähler. Tageskommentar des Ausbilders als Hinweisbox über dem Textbereich.
- **Tage unter 1280 px:** dieselben Karten untereinander, Tagesart ab `md` als Segment-Auswahl.
- **Außerhalb der Ausbildung:** Spalte in `--surface-muted`, Text „Außerhalb der Ausbildung“, keine Eingabe.
- **Fußleiste (fest am unteren Rand, nur bearbeitbar):** links Zustand „Ungespeicherte Änderungen“ (Punkt in Warnfarbe) oder „Gespeichert“, rechts zweitrangig „Speichern“ und Haupt „Einreichen …“. Einreichen mit ungespeicherten Änderungen speichert vorher. Nach dem Speichern Toast „Entwurf gespeichert“.
- **Pflichtfelder beim Einreichen (AK-501 bis 505):** Fehler stehen am Tag („Tätigkeiten fehlen“, „Tagesart fehlt“); zusätzlich eine Fehlerleiste oben „2 Tage sind unvollständig: Mi, Fr“ mit Sprunglinks, Fokus auf die Leiste.
- **Verlauf:** unter den Tagen ausklappbar „Verlauf (4 Einträge)“, nach Runden gruppiert (AK-801 bis 803).

### Prüfansicht (Ausbilder, `/ausbilder/pruefliste`)

- **Ab 1024 px geteilt:** links die Prüfliste (360 px, eigener Bildlauf), rechts der ausgewählte Bericht. Der ausgewählte Bericht steht in der Adresse (`?bericht=<id>`), damit Links aus Benachrichtigungen direkt dorthin führen und Browser-Zurück funktioniert.
- **Liste:** Filter „Meine Azubis / Alle“ (AK-601), je Eintrag Azubi, KW, Einreichungsdatum, Kennzeichen „Erneut eingereicht“ ab Runde 2; ausgewählte Zeile in `--accent-soft`; Pfeiltasten wechseln die Auswahl. Leer: „Keine Berichte zur Prüfung.“
- **Bericht rechts:** nur lesend, die Tage als Zeilen untereinander (links Tag, Datum und Tagesart, rechts der Text), weil der rechte Bereich für fünf Spalten zu schmal ist. Je Tag Textlink „Kommentar zu diesem Tag“, der ein Feld öffnet.
- **Entscheidungsleiste (fest unten im rechten Bereich):** Gefahr-zweitrangig „Ablehnen …“ (Dialog mit Pflicht-Gesamtkommentar, zeigt Anzahl der Tageskommentare) und Haupt „Freigeben“ (Bestätigungsdialog). Nach der Entscheidung Toast und automatisch der nächste Bericht der Liste; ist die Liste leer, der Leerzustand.
- **Unter 1024 px:** erst die Liste; Tippen öffnet `/berichte/[id]` mit derselben Entscheidungsleiste und „← Prüfliste“.
- **Freigegebene Berichte:** auf der Berichtsseite Knopf „Freigabe zurücknehmen …“ (Dialog mit Pflichtbegründung, AK-703).

### Einstellungen (`/einstellungen`, für beide Rollen)

Eine Seite mit Abschnitten als Karten; Ausbilder sehen zusätzliche Abschnitte. Bisher getrennte Seite `/ausbilder/einstellungen` wird dort zusammengeführt (alte Adresse leitet um).

1. **Benachrichtigungen:** drei Schalter E-Mail, Teams, App mit je einem Satz Erklärung; sind alle aus, Warnleiste „Du bekommst keine Benachrichtigungen und keine Erinnerungen.“ (AK-1011, AK-1012). Speichern-Knopf je Abschnitt.
2. **Darstellung:** „System / Hell / Dunkel“ als Segment-Auswahl; wirkt sofort und wird am Konto gespeichert (Geräteübergreifend), vor dem Laden aus einem Cookie, damit nichts aufblitzt.
3. **Konto (nur lesend):** Name, Firmen-E-Mail, Rolle, zugeordneter Ausbilder bzw. Vertretung.
4. **Nur Ausbilder – Zustellung:** bisherige Inhalte von `/ausbilder/einstellungen` unverändert.

### Übrige Seiten (nur Rahmen und Komponenten)

| Seite | Hinweise |
| --- | --- |
| Anmelden, Kein Zugang | zentrierte Karte auf `--bg`, Schriftzug, ein Knopf „Mit Firmenkonto anmelden“ |
| Start Ausbilder | Kacheln „Zu prüfen (n)“ und „Azubis mit überfälligen Wochen (n)“, darunter die Azubi-Liste mit Fortschritt |
| Azubis, Azubi-Detail | Tabelle Azubi, Ausbildungszeitraum, offene Wochen, letzte Einreichung; Detail = Meine Wochen aus Ausbildersicht |
| Personen, Person neu/bearbeiten | Tabelle mit Rolle und Status (aktiv/deaktiviert); Formular zweispaltig ab `md` |
| Benachrichtigungen | Liste mit ungelesen-Punkt, Anlass, Woche, Zeit relativ („vor 2 Std.“, absolut im Tooltip) |
| Nicht zustellbar, Teams-Postfach (Demo) | Tabellen wie bisher im neuen Stil |

## Barrierefreiheit und Dunkelmodus

Ziel ist WCAG 2.2 Stufe AA auf allen Seiten, hell und dunkel. Geprüft wird automatisch mit axe in Playwright und einmal von Hand mit Tastatur und Screenreader (NVDA unter Windows).

### Barrierefreiheit

- **Kontrast:** Text mindestens 4,5 : 1, großer Text und Bedienelemente/Rahmen von Feldern mindestens 3 : 1, in beiden Modi.
- **Tastatur:** alles ohne Maus bedienbar, Reihenfolge wie die Leserichtung; „Zum Inhalt springen“ als erster Link; kein Element fängt den Fokus außer offenen Dialogen und der Schublade.
- **Fokus:** immer sichtbar (Ring `--focus`, 2 px), nie von der festen Kopf- oder Fußleiste verdeckt (WCAG 2.4.11), dazu `scroll-padding` in Höhe der Leisten.
- **Struktur:** je Seite genau eine `h1`; Bereiche als `header`, `nav`, `main`; Prüfliste und Bericht als benannte Bereiche („Prüfliste“, „Ausgewählter Bericht“).
- **Formulare:** jedes Feld mit sichtbarer Beschriftung; Fehler per `aria-describedby` verknüpft; Fehlerleiste nach dem Einreichen bekommt den Fokus.
- **Live-Meldungen:** Toasts und „Gespeichert“ über `aria-live`; der Zähler der Glocke wird nicht bei jeder Änderung vorgelesen.
- **Berührflächen:** mindestens 24 × 24 px (WCAG 2.5.8), in der App 44 × 44 px für alle Hauptbedienelemente am Handy.
- **Bewegung:** Animationen höchstens 200 ms; bei `prefers-reduced-motion` keine.
- **Vergrößerung:** bis 200 % Zoom und bei 320 px Breite ohne Verlust von Inhalt oder Funktion.

### Dunkelmodus

- **Standard:** „System“ folgt `prefers-color-scheme`; „Hell“ und „Dunkel“ überschreiben das.
- **Umsetzung:** Attribut `data-theme` am `html`-Element, gesetzt vom Server aus Cookie bzw. Konto, damit beim Laden nichts aufblitzt; alle Farben nur über Tokens.
- **Ausnahmen:** PDF und Druckansicht bleiben hell; `color-scheme` wird gesetzt, damit Bildlaufleisten und Datumsfelder passen.
- **Prüfung:** jede Seite wird in beiden Modi mit axe geprüft.

## UI-Akzeptanzkriterien

Die 20 neuen Kriterien ergänzen AK-101 bis AK-1102 und werden genauso nachgewiesen: Testname beginnt mit der ID, `npm run ak:abdeckung` zählt sie mit.

| ID | Kriterium | Ebene |
| --- | --- | --- |
| UI-AK-01 | Ab 1024 px ist die Seitenleiste sichtbar, darunter nicht; der Burger-Knopf öffnet sie als Schublade, Escape schließt sie, der Fokus kehrt zum Burger-Knopf zurück. | Browser |
| UI-AK-02 | Der aktive Menüpunkt trägt `aria-current="page"`; Azubi und Ausbilder sehen genau die Menüpunkte ihrer Rolle. | Browser |
| UI-AK-03 | Die Glocke zeigt die Zahl ungelesener App-Benachrichtigungen, ab 100 „99+“, und nennt sie im `aria-label`. | Browser |
| UI-AK-04 | Start Azubi zeigt die aktuelle Woche mit Fortschritt und Knopf; offene Wochen davor stehen unter „Zu erledigen“, älteste zuerst, abgelehnte oben. | Browser |
| UI-AK-05 | Ohne offene Wochen zeigt „Zu erledigen“ den Leerzustand „Alles erledigt – keine offenen Wochen.“ | Browser |
| UI-AK-06 | Ab 1280 px stehen die fünf Tage nebeneinander, darunter untereinander; bei 1280 und 375 px gibt es kein horizontales Scrollen. | Browser |
| UI-AK-07 | Nach einer Eingabe zeigt die Fußleiste „Ungespeicherte Änderungen“, nach dem Speichern „Gespeichert“ und einen Toast. | Browser |
| UI-AK-08 | Scheitert das Einreichen an Pflichtfeldern, erscheint oben eine Fehlerleiste mit den betroffenen Tagen und Sprunglinks, und sie erhält den Fokus. | Browser |
| UI-AK-09 | Einreichen mit ungespeicherten Änderungen speichert zuerst und reicht dann ein. | Browser |
| UI-AK-10 | Ab 1024 px zeigt die Prüfliste links und den Bericht rechts; der ausgewählte Bericht steht in der Adresse und ist per Link direkt aufrufbar. | Browser |
| UI-AK-11 | Nach Freigeben oder Ablehnen wird automatisch der nächste Bericht der Liste geöffnet; nach dem letzten erscheint „Keine Berichte zur Prüfung.“ | Browser |
| UI-AK-12 | Unter 1024 px öffnet ein Eintrag der Prüfliste die Berichtsseite mit derselben Entscheidungsleiste und dem Link „← Prüfliste“. | Browser |
| UI-AK-13 | Jeder Status-Chip zeigt Symbol und Text; kein Status ist allein an der Farbe zu erkennen. | Unit |
| UI-AK-14 | Die Darstellung lässt sich auf System, Hell und Dunkel stellen; die Wahl gilt sofort, bleibt nach Abmelden und Anmelden erhalten und gilt auf einem zweiten Gerät. | Browser + DB |
| UI-AK-15 | Bei „System“ folgt die App `prefers-color-scheme`; beim Laden blitzt das falsche Farbschema nicht auf. | Browser |
| UI-AK-16 | axe meldet auf allen Seiten keine Verstöße der Stufen A und AA, hell und dunkel, bei 1280 und 375 px. | Browser |
| UI-AK-17 | Alle Abläufe der Beispielszenarien lassen sich nur mit der Tastatur durchführen; der Fokus ist jederzeit sichtbar und nie verdeckt. | Browser |
| UI-AK-18 | Jeder Dialog fängt den Fokus, schließt mit Escape und gibt den Fokus an den auslösenden Knopf zurück. | Browser |
| UI-AK-19 | Jede Seite hat einen eigenen Browser-Titel „&lt;Seite&gt; – Berichtsheft“ und genau eine `h1`. | Browser |
| UI-AK-20 | Ladezustände zeigen Platzhalter in der Form des Inhalts; Listen ohne Einträge zeigen einen erklärenden Leerzustand. | Browser |

## Umsetzung

Die Neugestaltung wird Etappe 8 in einer eigenen Entwickler-Sitzung, mit Branch `etappe-8-ui`, Draft-PR und denselben Regeln wie bisher.

1. Diese Spezifikation als `docs/05-ui-spezifikation.md` ins Repository; UI-AK-01 bis UI-AK-20 werden von `npm run ak:abdeckung` mitgezählt.
2. Tokens und Komponenten in `src/components/ui/`, dann Rahmen und Navigation, dann die vier Hauptseiten, zuletzt die übrigen Seiten.
3. Neue Adressen: `/azubi/wochen`, `/ausbilder/azubis` (Liste), `/ausbilder/pruefliste?bericht=<id>`; `/ausbilder/einstellungen` leitet auf `/einstellungen` um.
4. Datenmodell: ein Feld für die Darstellung an der Person (`theme`: System, Hell, Dunkel), mit Migration.
5. Alle bestehenden Tests bleiben grün; geänderte Texte oder Selektoren werden in den Tests nachgezogen, nicht die Tests abgeschwächt.
6. axe (`@axe-core/playwright`) als Prüfschritt in CI für alle Seiten, hell und dunkel, Chromium und 375 px.
7. Screenshots der vier Hauptseiten (Desktop/Handy, hell/dunkel) hängen als CI-Artefakt am PR.

### Offene Punkte

- [ ] Firmenfarbe und Logo, falls die App übernommen wird (Tausch nur in den Tokens).
- [ ] Ob ein Schriftzug mit Firmenname gewünscht ist.

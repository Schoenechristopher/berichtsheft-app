# P09 Oberfläche (M09)

Reihe `playbooks/liferay-72/` · Plattform Liferay Portal 7.2 CE · Profil `profile/liferay-72.md` (baut auf
`profile/liferay-gemeinsam.md` auf) · Stand: 16.10.2026 (Etappe G4, Paket K) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Die Oberfläche der App folgt der UI-Spezifikation mit den Mitteln von 7.2: eigenes Theme `bh-theme` (FreeMarker, Gulp) mit Tokens als CSS-Variablen
für Hell und Dunkel, Seitenleiste und Schublade, **eigene Glocke im Theme** aus `BH_Notification` (Profil 7.2, Abschnitt 3 und 3.5), Portlets ohne eigene
Überschrift, Status-Chips mit Symbol, Darstellung System/Hell/Dunkel vom Server ohne Aufblitzen, eigene Dialoge mit Fokusfalle, Seitentitel, Lade-
und Leerzustände und WCAG 2.2 AA. Die Fachfunktionen der Oberfläche sind reine Java-Klassen in `bh-domain`; das Theme erhält seine Daten über
einen `TemplateContextContributor` (Typ THEME) aus `bh-web`; Senna (SPA) ist für die Site abgeschaltet. Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M09.json` über die Prüf-Adapter grün sind (20 UI-AK-IDs; 22 Fachlogik- und 33 Ablauf-Fälle, keine Daten- und
   keine Szenario-Fälle; die Ablauf-Fälle in Chromium und bei 375 px);
2. die plattformeigenen Tests grün sind: die JUnit-Tests der Fachfunktionen mit UI-AK-ID im Namen, `ThemeSettingTest` (Darstellung am Konto),
   `FrameTest` (Senna aus, Control Menu aus), `ErrorPagesTest` (feste Texte von AK-103) und der axe-Lauf `pruefung/barrierefreiheit.spec.ts` auf allen Seiten
   der App einschließlich der Anmeldeseite, hell und dunkel, bei 1280 und 375 px ohne Verstoß;
3. jede UI-AK eine Bewertung nach Profil 7.2, Abschnitt 3.4, hat; „abweichend, begründet“ gilt nur für die Verwaltung von Liferay (Control Panel,
   Admin-Theme; UI-AK-16, Profil 6.3) und steht unter „Bitte bestätigen“;
4. jede Gegenprobe aus Schritt 13 die dort benannten Prüffälle bzw. Tests rot gemacht hat und zurückgenommen ist.

Keine Schemaänderung: `BH_Person.theme` (`SYSTEM`, `LIGHT`, `DARK`, Voreinstellung `SYSTEM`) gibt es seit P02 (gemeinsam 2.3). Keine Abweichung
gegenüber der TypeScript-App außer der genannten Verwaltung von Liferay.

## 2. Voraussetzungen

- L72-P00 bis L72-P08 abgenommen und gemergt. Die Portlets der Module existieren funktional (Anmelden, Kein Zugang, Start, Meine Wochen, Bericht,
  Prüfliste, Azubis, Personen, Benachrichtigungen, Nicht zustellbar, Einstellungen, Teams-Postfach der Demo); P09 gibt ihnen Rahmen, Gestaltung und
  Zugänglichkeit. Die Ablauf-Aktionen der Module (P02 bis P08) laufen; P09 ergänzt die Prüfaktionen und die Selektoren der Elemente.
- Profil 7.2: Abschnitte 1 (Theme-Werkzeug, Browser), 3 (Oberfläche, Dunkelmodus 3.4, Glocke 3.5), 4 (Ablauf-Adapter), 6.3 (Oberfläche und Dunkelmodus) und 7
  („Senna“, „Clay ist Sass“, „OSGi-Abhängigkeiten“); gemeinsam 2.5 (Glocke).
- P00 hat bestätigt (Profil, „In P00 zu bestätigen“): `liferay-theme-tasks` und Node ohne Download durch Gradle, `TemplateContextContributor` vom Typ THEME
  und `data-theme` vor dem ersten Darstellen, Senna für die Site aus, Clay-Version und die Liste der Komponenten mit Token-Überschreibung, das Clay-Iconset für
  UI-AK-13 und `<dialog>` in allen CI-Browsern. Was dort offen blieb, klärt Schritt 2 und wird gemeldet.
- Chromium und 375 px lokal; Firefox und Edge nur in CI.

## 3. Eingaben

- Fach-Spec: `specs/M09-oberflaeche.md` (Regeln M09-R01 bis M09-R23, feste Texte in Abschnitt 5, Abschnitt 8).
- Prüffälle: `specs/pruefung/M09.json`; Ablauf-Aktionen, Prüfaktionen und die Tabelle der Elemente: `specs/pruefung/format.md`, „Aufbau eines Ablauf-Falls“ und
  „Schnittstellen von M09“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M09 Oberfläche“ (Liste der festen Merker).
- Gestaltung (Referenz): `docs/05-ui-spezifikation.md` (Tokens, Komponenten, Seiten).
- Vorbild der Prüfaktionen (lesen, nicht ändern): `e2e/pruefung/ablauf-adapter.ts`, `e2e/pruefung/ablauf-pruefungen.ts`.
- Muster der Nachbar-Reihe: `playbooks/liferay-625/P09-oberflaeche.md` (Aufbau und Schritte; Plattformteile gelten dort für 6.2.5); Gegenstück der Referenz-Umsetzung:
  `playbooks/typescript/P09-oberflaeche.md`.

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Übertragbar sind die reinen Funktionen `src/domain/week-progress.ts`, `src/domain/theme.ts`, `src/domain/relative-time.ts`,
`bellCount()` und `bellLabel()` aus `src/components/ui/bell.tsx` und `STATUS_STYLES` aus `src/components/ui/status-chip.tsx` (Texte und Symbole). Die
React-Komponenten und `src/app/layout.tsx` sind nicht übertragbar: Markup, Tokens und Verhalten entstehen in FreeMarker, JSP und eigenem Skript (Schritte 5
bis 10). Belege zum Abgleich: `e2e/ui-ak.spec.ts`, `e2e/barrierefreiheit.spec.ts`, `src/domain/theme.test.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Theme-Gerüst und Tokens, (2) reine Fachfunktionen der Oberfläche, (3) Template-Kontext für das Theme, (4) Rahmen, Menü und Glocke, (5)
Bausteine (Chip, Dialog, Fehlerleiste, Fußleiste, Platzhalter), (6) Seiten, (7) Darstellung, (8) Barrierefreiheit und Fokus, (9) Prüfaktionen des
Ablauf-Adapters. Zu jedem UI-AK die Prüffälle und die Umsetzung nach Profil 7.2, Abschnitt 3.4 (alle Prüffälle in `specs/pruefung/M09.json`; Zählweise:
Prüffälle **ohne** Ablauf-Szenario, M09 hat keines):

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Bewertung auf 7.2 |
| --- | --- | --- | --- |
| UI-AK-01 | Seitenleiste ab 1024 px, darunter Menüknopf und Schublade mit Escape und Fokusrückgabe. | 4 (4 ablauf) | gleichwertig; Seitenleiste und Schublade im Theme (`portal_normal.ftl`, eigenes Skript), nicht die Navigation von Liferay |
| UI-AK-02 | Aktiver Menüpunkt gekennzeichnet; jede Rolle sieht genau ihre Menüpunkte. | 2 (2 ablauf) | gleichwertig; Menü im Theme aus der Rolle in `BH_Person`, Seiten zusätzlich über Liferay-Rollen gesperrt |
| UI-AK-03 | Glocke mit Zähler, ab 100 „99+“, genaue Zahl im Namen. | 4 (4 fachlogik) | gleichwertig, wenn die eigene Glocke freigegeben wird (Profil 3.4); die Liferay-Glocke ist Abbild (3.5) |
| UI-AK-04 | Start Azubi: aktuelle Woche mit Fortschritt; „Zu erledigen“ älteste zuerst, abgelehnte oben. | 4 (4 fachlogik) | gleichwertig; Portlet Start Azubi, Fortschritt aus der Fachlogik |
| UI-AK-05 | Leerzustand „Alles erledigt – keine offenen Wochen.“ | 2 (2 ablauf) | gleichwertig; Leerzustand mit festem Merker |
| UI-AK-06 | Fünf Tage nebeneinander ab 1280 px, kein waagerechtes Scrollen bei 1280 und 375 px. | 3 (3 ablauf) | gleichwertig; Raster im Theme, Control Menu für Azubis und Ausbilder ausgeblendet |
| UI-AK-07 | Fußleiste „Ungespeicherte Änderungen“ / „Gespeichert“ und Meldung. | 1 (1 ablauf) | gleichwertig; Fußleiste im Portlet „Woche erfassen“ |
| UI-AK-08 | Fehlerleiste mit betroffenen Tagen und Sprunglinks, erhält den Fokus. | 1 (1 ablauf) | gleichwertig; Fehlerleiste, Fokus per Skript des Portlets |
| UI-AK-09 | Einreichen speichert zuerst, dann wird eingereicht. | 1 (1 ablauf) | gleichwertig; eine Service-Methode speichert und reicht ein (`submit`, P05; M05-R08) |
| UI-AK-10 | Prüfliste links, Bericht rechts ab 1024 px; Bericht in der Adresse. | 1 (1 ablauf) | gleichwertig; Render-Parameter, lesbare Adresse über `FriendlyURLMapper` |
| UI-AK-11 | Nach Entscheidung nächster Bericht; danach „Keine Berichte zur Prüfung.“ | 1 (1 ablauf) | gleichwertig; Weiterleitung nach dem `MVCActionCommand` |
| UI-AK-12 | Unter 1024 px Berichtsseite mit Entscheidungsleiste und „← Prüfliste“. | 2 (2 ablauf) | gleichwertig |
| UI-AK-13 | Jeder Status-Chip zeigt Symbol und Text. | 4 (4 fachlogik) | gleichwertig; Symbole aus dem Clay-Iconset plus Text, Farben über Status-Tokens |
| UI-AK-14 | Darstellung System, Hell, Dunkel; gilt sofort, bleibt erhalten, gilt auf zweitem Gerät. | 10 (10 fachlogik) | gleichwertig; `BH_Person.theme`, Prüfung im Service, Cookie für den Zustand ohne Anmeldung |
| UI-AK-15 | Bei System folgt die App dem Gerät; kein Aufblitzen des falschen Schemas. | 3 (3 ablauf) | gleichwertig; `data-theme` vom Server, Senna aus |
| UI-AK-16 | Keine Verstöße WCAG A und AA, hell und dunkel, 1280 und 375 px. | 4 (4 ablauf) | gleichwertig für alle Seiten der App; **abweichend, begründet** für die Verwaltung von Liferay (Profil 3.4 und 6.3), kein Fall berührt sie |
| UI-AK-17 | Alle Abläufe nur mit der Tastatur; Fokus sichtbar und nie verdeckt. | 2 (2 ablauf) | gleichwertig; `scroll-padding` für feste Leisten, Control Menu aus |
| UI-AK-18 | Dialog fängt Fokus, Escape schließt, Fokus kehrt zurück. | 2 (2 ablauf) | gleichwertig; eigener `<dialog>` statt `Liferay.Util.openModal` |
| UI-AK-19 | Eigener Seitentitel „<Seite> – Berichtsheft“ und genau eine Hauptüberschrift. | 2 (2 ablauf) | gleichwertig; Titel im Theme, Portlet-Dekorator `barebone` |
| UI-AK-20 | Platzhalter als Ladezustand; erklärender Leerzustand. | 2 (2 ablauf) | gleichwertig; der Ladekreis von Liferay entfällt mit abgeschaltetem Senna |

Zitiert in M09, ohne eigene Zählung hier (die Prüffälle gehören den genannten Modulen und laufen mit deren Playbooks):

| AK-ID | Bezug in M09 | Prüffälle | Bewertung auf 7.2 |
| --- | --- | --- | --- |
| AK-103 | „Zugriff verweigert“ und „Seite nicht gefunden“ bleiben die Meldungen der Fehlerseiten (M09 Abschnitt 9, Abschnitt 5 feste Texte) | 3 (3 fachlogik, M02) | gleichwertig; die Seiten der App zeigen die festen Texte statt der Fehlerseite von Liferay, Nachweis `ErrorPagesTest.AK103_…` |
| AK-401 | Maßstab für „Fachlogik, soweit es einen fachlichen Kern gibt“ (M09 Abschnitt 4) | 2 (2 fachlogik, M04) | gleichwertig; Anzeige der fünf Tage mit Feldern und Fünf-Spalten-Raster belegen UI-AK-06 und AK-403-01 (P04) |
| AK-1015 | Die Vorschau der Glocke markiert nichts als gelesen (M09-R03); Zähler kommt aus M08 | 1 (1 daten, M08) | gleichwertig für die eigene Glocke; `BellTest.AK1015_…` aus P08 bleibt grün |

Summe: 20 UI-AK-IDs, 55 Prüffälle (22 fachlogik, 0 daten, 33 ablauf, 0 Szenario).

## 6. Empfehlung

**Weg B**, mit den Prüffällen als Maßstab (sie prüfen Layout, Fokus und Titel über feste Merker, nicht Pixel). Das Paket ist groß: Die Steuerung darf es nach
Modulgrenzen teilen (`playbooks/00-steuerung.md`, Abschnitt 3), z. B. (a) Schritte 2 bis 8 (Theme, Kontext, Rahmen, Glocke, Seiten, Darstellung) und
(b) Schritte 9 bis 12 (Fokus, Barrierefreiheit, Prüfaktionen, Gegenproben). Wichtigster Fallstrick von 7.2: Clay färbt über Sass-Variablen, die zur
Build-Zeit feste Farben werden; ohne Überschreibung bleibt jede Clay-Komponente im Dunkelmodus hell (Profil 3.4 und 7). Weg A nur auf ausdrücklichen Auftrag.

## 7. Schritte

1. **Branch** `claude/l72-p09-oberflaeche`; Spec, `docs/05-ui-spezifikation.md`, Profil 7.2 (3.4, 3.5, 6.3, 7) und Prüffälle lesen. Prüfschritt: Liste der festen Texte
   (Abschnitt 5 der Spec) und der Elemente (`specs/pruefung/format.md`, Tabelle „Elemente“) im PR-Entwurf.
2. **Theme `bh-theme` und Probe** (`themes/bh-theme`, Profil 1 und 2): Gulp-Aufgaben von `liferay-theme-tasks` mit dem Node der Sitzung (`node.download=false`),
   Basistheme `styled` (Vorschlag; Clay-CSS ohne Gestaltung des Classic-Themes). Probe in `_custom.scss`: CSS-Variablen mit `var(--…)`, ein `:root`-Block, ein
   `[data-theme="dark"]`-Block und ein `@media (prefers-color-scheme: dark)`-Block für `[data-theme="system"]` überstehen den Sass-Lauf unverändert, und
   Funktionen wie `darken()` werden **nicht** auf `var(--…)` angewandt (Profil 3.4). Prüfschritt: `./gradlew :themes:bh-theme:build deploy`, das erzeugte CSS im
   Bundle enthält die Blöcke; Ergebnis im PR. Schlägt die Probe fehl, kommen die Tokens als `<style>`-Block in `portal_normal.ftl`.
3. **Tokens** (`docs/05-ui-spezifikation.md`, „Design-Tokens“; M09 Abschnitt 8): alle Farben, Abstände und Statusfarben als CSS-Variablen, einmal für Hell,
   einmal für Dunkel (Werte wie in `src/app/globals.css`), dazu `color-scheme`. Eigene Breakpoints 1024 px und 1280 px, Berührflächen mindestens 44 × 44 px
   bei 375 px, Animationen höchstens 200 ms und bei `prefers-reduced-motion` keine. Das Theme überschreibt die genutzten Clay-Komponenten (Knöpfe, Felder,
   Karten, Labels, Alerts, Navigation, Tabellen, Modale) in `_custom.scss` mit `var(--…)`; Clay-Komponenten außerhalb dieser Liste nutzt die App nicht (jede
   neu genutzte braucht eine Überschreibung, Profil 7). Schrift: IBM Plex Sans (OFL, `docs/05-ui-spezifikation.md`) als Datei im Theme, **kein** Abruf aus dem Internet; Ersatz
   Systemschrift (Quelle der Dateien siehe „Bitte bestätigen“). Prüfschritt: keine feste Farbe in JSP, FreeMarker oder `_custom.scss` außerhalb des Token-Blocks
   (Suche nach `#` und `rgb(`).
4. **Fachfunktionen** `de.berichtsheft.domain.ui` in `bh-domain` (Java 8, M09-R03, M09-R05, M09-R06, M09-R15 bis M09-R17; Gegenstücke zur TypeScript-App):
   `WeekProgress` (`progress()` je Tag `ausgefuellt`/`leer`/`ausserhalb` nach den Pflichtangaben aus P05, `label()` „<n> von <m> Tagen ausgefüllt“, bei einem Tag
   „1 von 1 Tag ausgefüllt“, `firstLine()` mit Standardlänge 120 und Auslassungszeichen „…“; UI-AK-04), `Bell` (`display()` ab 100 „99+“, `label()` mit
   genauer Zahl; UI-AK-03), `StatusChip` (Text und Symbol: Entwurf Stift, Eingereicht Pfeil nach oben, Freigegeben Haken, Abgelehnt Kreuz im Kreis; die
   Symbole sind paarweise verschieden; UI-AK-13), `Appearance` (`check(String)` mit den drei Werten `System`, `Hell`, `Dunkel` in dieser Schreibweise, jeder andere
   Wert wirft `UnknownAppearanceException`, Fehlercode `darstellung_unbekannt`; `resolve(konto, gemerkt)`: Konto vor Gerät, ohne beides und bei unbekanntem
   gemerktem Wert `System`; Abbildung auf die Spaltenwerte `SYSTEM`, `LIGHT`, `DARK`; UI-AK-14), `MenuItems.forRole(rolle, hatNichtZustellbare)` (Reihenfolge nach M09-R02,
   „Teams-Postfach (Demo)“ nur mit Einschaltung; UI-AK-02) und `RelativeTime` (Anzeige, kein UI-AK). Prüfschritt: JUnit-Tests mit der UI-AK-ID ohne Bindestrich im Namen
   (`UIAK03_…`, `UIAK04_…`, `UIAK13_…`, `UIAK14_…`).
5. **Template-Kontext** (Profil 3.4, 7): `BhThemeContextContributor` (`TemplateContextContributor`, `type=THEME`) in `bh-web` legt in den Kontext des Themes: `bhTheme` (die
   Darstellung nach `Appearance.resolve()`: Wahl an `BH_Person.theme` des angemeldeten Benutzers, ohne Anmeldung das Cookie `bh_theme`, sonst `System`), `bhPerson` (Name,
   Rolle), `bhMenu` (Menüpunkte je Rolle mit Zählern für Prüfliste und Nicht zustellbar aus P05 und P08), `bhBell` (Zähler und Name aus `Bell`) und `bhDemo`. Das Theme
   bekommt nur einfache Werte; Dienste sucht `portal_normal.ftl` nie selbst. Der Beitragende prüft zuerst, ob die Anfrage zur Site „Berichtsheft“ gehört; für Control Panel
   und Anmeldung ohne Person gelten Voreinstellungen. Prüfschritt: Seite ohne Anmeldung zeigt das Theme ohne Fehler im Log; angemeldet stehen die Werte im Rahmen.
6. **Rahmen, Menü und Glocke** (M09-R01 bis M09-R04; UI-AK-01, UI-AK-02, UI-AK-03, UI-AK-17) in `portal_normal.ftl` und dem Skript des Themes:
   `<html data-theme="${bhTheme}" …>` und `color-scheme` (Schema steht ohne Skript fest), Seitentitel „<Seite> – Berichtsheft“, „Zum Inhalt springen“, Kopf mit Burger-Knopf (nur unter
   1024 px), Schriftzug „Berichtsheft“, Glocke und Kontomenü (Name, Rolle, „Einstellungen“, „Abmelden“ über `/c/portal/logout`), ab 1024 px Seitenleiste, darunter Schublade
   (Fokusfalle, Escape, „Schließen“, Klick daneben, Wahl eines Punktes; danach Fokus zurück zum Knopf), Menüpunkte je Rolle mit `aria-current` an der aktuellen Seite, Demo-Hinweis.
   **Eigene Glocke** (Profil 3.4, 3.5): Zähler und Vorschau der letzten 5 aus `BH_Notification` über die lesenden Resource-Befehle aus P08; die Vorschau markiert nichts.
   Control Menu, Produktmenü und Dockbar von Liferay sind für Azubis und Ausbilder aus (keine Verwaltungsrechte); die Warnung vor dem Ablauf der Sitzung von Liferay wird
   abgeschaltet. Senna (SPA) ist für die Site aus (P00, Profil 7); `FrameTest.UIAK15_sennaIstFuerDieSiteAus` prüft den Schalter, den P00 festgelegt hat. Merker `data-menue`,
   `data-menue-knopf`, `data-drawer-close`, `data-glocke`, `data-glocke-vorschau`. Prüfschritt: Ablauf-Fälle zu UI-AK-01 und UI-AK-02 bei 1280, 1024, 1023 und 375 px.
7. **Bausteine** (M09-R04, M09-R09 bis M09-R11, M09-R15, M09-R21, M09-R23; UI-AK-07, UI-AK-08, UI-AK-13, UI-AK-18, UI-AK-20) als JSP-Fragmente in `bh-web`
   (`META-INF/resources/common/`): Status-Chip (Symbole aus dem Clay-Iconset plus Text; fehlt ein Symbol im Iconset von 7.2, ein eigenes SVG im Theme; „Überfällig“ mit Uhr), Seitenkopf
   mit Link „← Zurück zu <Liste>“, Fehlerleiste mit Sprunglinks und Fokus, Fußleiste („Ungespeicherte Änderungen“, „Gespeichert“, Meldung „Entwurf gespeichert“, Merker
   `data-speicherstand`), Dialog auf Basis von `<dialog>` (Fokus in den Dialog, Fokusfalle, Escape schließt, Fokus zurück zum auslösenden Knopf, Merker `data-oeffnet-dialog`;
   kein `Liferay.Util.openModal`), Leerzustand mit festem Merker, Platzhalter erst nach kurzer Verzögerung und nur bei nachgeladenen Inhalten (Resource-Aufruf), Wochen-Kachel. Portlet-
   Dekorator `barebone` ohne eigene Überschrift. Prüfschritt: Ablauf-Fälle zu UI-AK-07, UI-AK-08, UI-AK-18 und UI-AK-20.
8. **Seiten** (M09-R05 bis M09-R14, M09-R22; UI-AK-04, UI-AK-05, UI-AK-06, UI-AK-09 bis UI-AK-12, UI-AK-19): Start Azubi (aktuelle Woche mit Status-Chip, Tagesmarken, Fortschritt, Hauptknopf „Weiter
   erfassen“ bzw. „Ansehen“; „Zu erledigen“ abgelehnte zuerst, sonst die älteste zuerst, erste Zeile des Gesamtkommentars; Leerzustand „Alles erledigt – keine offenen Wochen.“), Meine Wochen, Woche
   erfassen (ab 1280 px fünf Tage nebeneinander, darunter untereinander, kein waagerechtes Scrollen bei 1280 und 375 px; Einreichen speichert zuerst und reicht dann ein, scheitert das Speichern, wird nicht
   eingereicht; bei fehlenden Pflichtangaben Fehlerleiste mit Fokus), Prüfansicht (ab 1024 px Liste links, Bericht rechts; der gewählte Bericht steht als Render-Parameter in der Adresse, lesbar über
   `FriendlyURLMapper`, und ein Link öffnet ihn direkt; nach Freigeben oder Ablehnen der nächste Bericht per Weiterleitung, nach dem letzten „Keine Berichte zur Prüfung.“), Berichtsseite unter 1024 px mit
   Entscheidungsleiste und „← Prüfliste“, Azubis, Personen, Benachrichtigungen („Keine Benachrichtigungen.“), Nicht zustellbar, Einstellungen, Teams-Postfach der Demo. **Anmelden** ist das Login-Portlet
   von Liferay im eigenen Theme, „Passwort vergessen“ und „Passwort setzen“ die zugehörigen Portlets, alle in der zentrierten Karte (Profil 6.1); „Kein Zugang“ ist eine Seite der App. „Zugriff verweigert“ und
   „Seite nicht gefunden“ zeigen die festen Texte der Spec (AK-103), nicht die Fehlerseite von Liferay. Seitentitel „<Seite> – Berichtsheft“ (Wochenbericht „KW <nn>/<jjjj> – Berichtsheft“) über den Titel
   des Portlets bzw. `PortalUtil.setPageTitle`, genau ein `h1` je Seite. Texte aus der Spec wörtlich, Merker aus der Landkarte (Liste dort). Jeder `MVCActionCommand` übergibt nur die `userId`; Rolle und Besitz prüft
   der Service (M02-R13). Prüfschritt: Ablauf- und Fachlogik-Fälle dieser UI-AK und `ErrorPagesTest.AK103_zugriffVerweigertUndNichtGefundenZeigenDieFestenTexte` grün.
9. **Darstellung** (M09-R16 bis M09-R18; UI-AK-14, UI-AK-15): `PersonLocalServiceImpl.updateOwnTheme(long actorUserId, String wert)` (nur die eigene Darstellung, nur eine aktive Person, `Appearance.check`;
   Abweisung als `PortalException` mit festem Grund `darstellung_unbekannt` bzw. `zugriff_verweigert`). Das Portlet „Einstellungen“ zeigt die Auswahl System/Hell/Dunkel als Segment-Auswahl; die Wahl setzt
   das Attribut am `html`-Element sofort (Skript), geht an den Service, setzt das Cookie `bh_theme` und leitet auf dieselbe Seite weiter (Merker `data-speicherstand`). Weil der Server `data-theme` aus Konto
   und Cookie ausgibt, ist das Schema schon beim ersten Darstellen richtig; eine Lösung nur im Browser bricht UI-AK-15. PDF und Druckansicht bleiben hell (Profil 3.4). Prüfschritt:
   `ThemeSettingTest.UIAK14_darstellungWirdAmKontoGespeichert`, `ThemeSettingTest.UIAK14_nurEigeneUndNurAktivePerson`, `ThemeSettingTest.UIAK14_zweitesGeraetNutztDieWahlAmKonto` und `erstes_bild_lesen` im Browser.
10. **Barrierefreiheit und Fokus** (M09-R19, M09-R20; UI-AK-16, UI-AK-17): sichtbarer Fokus, `scroll-padding` bzw. `scroll-margin` für feste Leisten (Kopf, Fußleiste), Kontrast hell und dunkel,
    beschriftete Felder, Fehler per `aria-describedby`, `aria`-Namen (Glocke mit genauer Zahl), Berührflächen. Ob das Control Menu bei Administratoren den Fokus verdeckt, prüft dieses Paket (Profil 3.4, UI-AK-17);
    es betrifft die Verwaltung und keinen Fall. `pruefung/barrierefreiheit.spec.ts` (Playwright mit `@axe-core/playwright`, WCAG 2.0 bis 2.2 A und AA) läuft auf allen Seiten der Site „Berichtsheft“ einschließlich
    Anmeldeseite, „Passwort vergessen“ und „Passwort setzen“ und in den offenen Zuständen (Fehlerleiste, Vorschau der Glocke, Dialog, Schublade), hell und dunkel, bei 1280 und 375 px; Control Panel und
    Admin-Theme gehören nicht dazu (Profil 6.3). Prüfschritt: ohne Verstoß; Gegenproben F-P09-12 und F-P09-27.
11. **Prüfaktionen des Ablauf-Adapters** (`pruefung/`): `ansicht_lesen`, `elemente_lesen`, `anordnung_lesen`, `fokus_lesen`, `bedienen`, `taste_druecken`, `tastatur_bis`, `tippen`, `warten`,
    `erstes_bild_lesen`, `barrierefreiheit_pruefen` und `darstellung_waehlen` kommen aus `e2e/pruefung/ablauf-pruefungen.ts` unverändert (P00); P09 liefert nur die **Selektoren der Elemente**
    (Tabelle „Elemente“ in `specs/pruefung/format.md`) über die festen Merker der Seiten. Das Gerät (`geraet`: Breite, Höhe, Farbschema, langsames Netz) stellt der Runner ein; `netz: langsam` verzögert nur
    Datenabrufe (Resource-Aufrufe), nie Seitenaufrufe, Formulare und Anmeldung. Der Adapter liest nur Merker, nie Meldungstexte (Ausnahme: Seitentitel). Fachlogik-Adapter: `statusChip`, `glockenZaehler`,
    `wochenFortschritt`, `ersteZeile`, `darstellungPruefen`, `darstellungErmitteln`. Prüfschritt: `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M09` (22 Fälle) und
    `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium --project=smartphone-375 --grep M09.json` (33 Fälle) grün.
12. **Plattformeigene Tests.** `FrameTest.UIAK06_controlMenuIstFuerAzubisUndAusbilderAus`, `FrameTest.UIAK15_sennaIstFuerDieSiteAus` und `ErrorPagesTest.AK103_…` (Playwright, `pruefung/`, plattformeigen);
    `ThemeSettingTest` (Arquillian, `bh-test-integration`) und der axe-Lauf aus Schritt 10. Prüfschritt: alle grün.
13. **Gegenproben** (je ein benannter Fehler, je ein roter Lauf, danach zurücknehmen und grün zeigen):

    | Name | Absichtlich eingebauter Fehler | Wird rot | Bleibt grün (und warum) |
    | --- | --- | --- | --- |
    | F-P09-1 „99+ schon bei 99“ (UI-AK-03) | `Bell.display()` kürzt ab 99 | UI-AK-03-03 | UI-AK-03-04 |
    | F-P09-2 „Name ohne genaue Zahl“ (UI-AK-03) | `Bell.label()` nennt ab 100 „99+“ statt der Zahl | UI-AK-03-04 | UI-AK-03-02 |
    | F-P09-3 „Zwei Status mit demselben Symbol“ (UI-AK-13) | `StatusChip` gibt Abgelehnt das Symbol Stift | UI-AK-13-04 | UI-AK-13-01 bis UI-AK-13-03 |
    | F-P09-4 „Außerhalb zählt mit“ (UI-AK-04) | `WeekProgress` zählt Tage außerhalb der Ausbildung | UI-AK-04-02 | UI-AK-04-01 |
    | F-P09-5 „Urlaub ohne Text zählt nicht“ (UI-AK-04) | `WeekProgress` verlangt immer einen Text | UI-AK-04-01 | UI-AK-04-02 (nur Betrieb mit Text) |
    | F-P09-6 „Erste Zeile nicht getrimmt“ (UI-AK-04) | `firstLine()` lässt führenden Leerraum stehen | UI-AK-04-03 | UI-AK-04-04 |
    | F-P09-7 „Zeile nicht gekürzt“ (UI-AK-04) | `firstLine()` ignoriert `maxLaenge` | UI-AK-04-04 | UI-AK-04-03 |
    | F-P09-8 „Groß- und Kleinschreibung egal“ (UI-AK-14) | `Appearance.check` vergleicht ohne Beachtung der Schreibweise | UI-AK-14-05 | UI-AK-14-04 („Lila“) |
    | F-P09-9 „Gerät vor Konto“ (UI-AK-14) | `Appearance.resolve` nimmt die gemerkte Wahl zuerst | UI-AK-14-06, UI-AK-14-07 | UI-AK-14-08, UI-AK-14-09 |
    | F-P09-10 „Unbekannter Wert gilt“ (UI-AK-14) | `Appearance.resolve` gibt den gemerkten Wert ungeprüft zurück | UI-AK-14-10 | UI-AK-14-08 |
    | F-P09-11 „Schema per Skript“ (UI-AK-15) | `data-theme` fehlt im Server-Markup und wird erst vom Skript gesetzt | UI-AK-15-01, UI-AK-15-03 | UI-AK-15-02 (der Standard ist hell) |
    | F-P09-12 „Text im Dunkelmodus dunkel“ (UI-AK-16) | im Token-Block für Dunkel `--text` auf den Wert von Hell setzen | UI-AK-16-02, UI-AK-16-04 (axe: Kontrast) | UI-AK-16-01, UI-AK-16-03 |
    | F-P09-13 „Seitenleiste erst ab 1280 px“ (UI-AK-01) | Breakpoint der Seitenleiste 1280 statt 1024 px | UI-AK-01-02 | UI-AK-01-01 |
    | F-P09-14 „Schublade ohne Escape“ (UI-AK-01) | Escape und Fokusrückgabe aus dem Skript entfernen | UI-AK-01-03, UI-AK-01-04 | UI-AK-01-01, UI-AK-01-02 |
    | F-P09-15 „Menü der falschen Rolle“ (UI-AK-02) | `MenuItems.forRole` liefert Azubis den Punkt „Personen“ | UI-AK-02-01 | UI-AK-02-02 |
    | F-P09-16 „Leerzustand immer“ (UI-AK-05) | „Zu erledigen“ zeigt den Leerzustand auch bei offenen Wochen | UI-AK-05-02 | UI-AK-05-01 |
    | F-P09-17 „Fünf Spalten schon ab 1024 px“ (UI-AK-06) | Breakpoint des Rasters 1024 statt 1280 px | UI-AK-06-02, UI-AK-06-03 | UI-AK-06-01 |
    | F-P09-18 „Gespeichert zu früh“ (UI-AK-07) | die Fußleiste zeigt „Gespeichert“ schon bei der Eingabe | UI-AK-07-01 | UI-AK-08-01 |
    | F-P09-19 „Fehlerleiste ohne Fokus“ (UI-AK-08) | der Fokus wird nicht in die Fehlerleiste gesetzt | UI-AK-08-01 | UI-AK-07-01 |
    | F-P09-20 „Einreichen speichert nicht zuerst“ (UI-AK-09) | der Knopf „Einreichen“ ruft `transition` statt `submit` | UI-AK-09-01 | UI-AK-10-01 |
    | F-P09-21 „Bericht nicht in der Adresse“ (UI-AK-10) | die Auswahl wird nur im Zustand der Seite gehalten | UI-AK-10-01 | UI-AK-12-01 |
    | F-P09-22 „Nach der Entscheidung zurück zur Liste“ (UI-AK-11) | die Weiterleitung öffnet keinen nächsten Bericht | UI-AK-11-01 | UI-AK-10-01 |
    | F-P09-23 „Kein Zurück-Link unter 1024 px“ (UI-AK-12) | „← Prüfliste“ fehlt auf der Berichtsseite | UI-AK-12-01, UI-AK-12-02 | UI-AK-10-01 |
    | F-P09-24 „Dialog ohne Fokusfalle“ (UI-AK-18) | Tab verlässt den Dialog | UI-AK-18-01 | UI-AK-18-02 (kein Tabulator-Schritt) |
    | F-P09-25 „Fokus kommt nicht zurück“ (UI-AK-18) | der auslösende Knopf erhält den Fokus nach dem Schließen nicht | UI-AK-18-01, UI-AK-18-02 | UI-AK-19-01 |
    | F-P09-26 „Zwei Hauptüberschriften“ (UI-AK-19) | der Portlet-Dekorator zeigt den Titel als `h1` | UI-AK-19-01, UI-AK-19-02 | UI-AK-20-02 |
    | F-P09-27 „Fokus unter fester Leiste“ (UI-AK-17) | `scroll-padding` der festen Leisten entfernen | UI-AK-17-01 (Fokus verdeckt) | UI-AK-16-01 (axe prüft keine Verdeckung des Fokus) |
    | F-P09-28 „Kein Platzhalter“ (UI-AK-20) | die Vorschau der Glocke zeigt bis zur Antwort nichts | UI-AK-20-01 | UI-AK-20-02 |
    | F-P09-29 „Control Menu sichtbar“ (UI-AK-06) | Azubis erhalten das Recht auf das Control Menu | `FrameTest.UIAK06_controlMenuIstFuerAzubisUndAusbilderAus` | alle Prüffälle: das Control Menu liegt außerhalb der Merker |
    | F-P09-30 „Senna an“ (UI-AK-15) | Senna für die Site einschalten | `FrameTest.UIAK15_sennaIstFuerDieSiteAus` | UI-AK-15-01 bis UI-AK-15-03 (Erstaufruf ohne Skript) |
    | F-P09-31 „Fehlerseite von Liferay“ (AK-103) | die Seiten der App zeigen bei fremdem Bericht die Fehlerseite des Portals | `ErrorPagesTest.AK103_zugriffVerweigertUndNichtGefundenZeigenDieFestenTexte` | AK-103-01 bis AK-103-03 (Fachlogik) |
    | F-P09-32 „Darstellung einer anderen Person“ (UI-AK-14) | `updateOwnTheme` nimmt die Person aus dem Formular | `ThemeSettingTest.UIAK14_nurEigeneUndNurAktivePerson` | UI-AK-14-01 bis UI-AK-14-10 |

    Prüfschritt: zweiunddreißig rote Läufe mit den benannten Fällen im PR notiert, danach alles grün.
14. **Bau-Stand.** M09 in die Bau-Liste eintragen. Prüfung nach Abschnitt 8.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M09` | 22 Fachlogik-Fälle grün |
| `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium --project=smartphone-375 --grep M09.json` | 33 Ablauf-Fälle grün |
| `./gradlew :modules:bh-domain:test` | JUnit-Tests `UIAK03_…` bis `UIAK14_…` grün; Systemzeit-Prüfung grün |
| `./gradlew :modules:bh-test-integration:testIntegration --tests '*ThemeSettingTest*'` | grün (Darstellung am Konto) |
| `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium --project=smartphone-375 --grep "FrameTest\|ErrorPagesTest"` | grün (Senna aus, Control Menu aus, feste Texte von AK-103) |
| `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium --project=smartphone-375 pruefung/barrierefreiheit.spec.ts` | keine axe-Verstöße auf den Seiten der Site „Berichtsheft“ |
| `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium --project=smartphone-375` | alle bisherigen Ablauf-Fälle weiter grün bzw. „abweichend, begründet“; die vorbereiteten Szenarien bleiben für P10 |
| `./gradlew build formatSource` | grün, keine Änderungen |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: Firefox und Edge für alle Ablauf-Fälle (P10), der volle Job der Klasse L72.

## 9. Abschluss

- Commit, z. B. „L72-P09: Oberfläche (Theme, Glocke, Darstellung, Barrierefreiheit)“; vor dem Push `./gradlew build`, die Prüf-Adapter von M09 und die plattformeigenen Tests lokal grün.
- Draft-PR mit der UI-AK-Tabelle (UI-AK-01, UI-AK-02, UI-AK-03, UI-AK-04, UI-AK-05, UI-AK-06, UI-AK-07, UI-AK-08, UI-AK-09, UI-AK-10, UI-AK-11, UI-AK-12, UI-AK-13, UI-AK-14, UI-AK-15,
  UI-AK-16, UI-AK-17, UI-AK-18, UI-AK-19, UI-AK-20 mit Test, Prüffällen und Bewertung; dazu die zitierten AK-103, AK-401 und AK-1015), den Gegenproben, Screenshots nur mit Testdaten und
  „Bitte bestätigen“. Geschützte Pfade: `themes/**/package.json` und `**/build.gradle` (Bibliotheken, gemeinsam 5), `bh-pruefung` und `liferay-72/pruefung/**` (Prüf-Adapter), `**/service/impl/**`
  (`updateOwnTheme`); Chris mergt.
- Bericht an die Steuerung per `send_message`; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Dunkelmodus blitzt beim Laden hell auf | `data-theme` und Tokens vom Server in `portal_normal.ftl` (Schritt 6 und 9), nie erst per Skript |
| Eine Clay-Komponente bleibt im Dunkelmodus hell | Clay färbt über Sass-Variablen mit festen Farben; die Komponente in `_custom.scss` mit `var(--…)` überschreiben (Profil 7) |
| Sass bricht an `darken(var(--…))` | Funktionen nicht auf CSS-Variablen anwenden; Clay-Variablen bleiben hell, das Theme überschreibt (Profil 3.4) |
| Warnung beim Verlassen, Titel oder `data-theme` verschwinden nach einem Seitenwechsel | Senna (SPA) ist für die Site nicht abgeschaltet (Profil 7); `FrameTest.UIAK15_…` |
| Fokus verschwindet hinter dem Control Menu oder einer festen Leiste | Control Menu für Azubis und Ausbilder aus, `scroll-padding` für feste Leisten (UI-AK-17) |
| Zwei Hauptüberschriften auf einer Seite | Portlet-Dekorator `barebone` ohne Titel; Seitenkopf ohne zweites `h1` (UI-AK-19) |
| Theme sieht die Daten der App nicht | das Theme bekommt nur einfache Werte aus dem `TemplateContextContributor`, keine Klassen der Module (OSGi-Klassenlader, Profil 7) |
| Glocke zeigt Liferay-Benachrichtigungen statt der App | eigene Glocke aus `BH_Notification` (Profil 3.4), nicht die des Control Menu |
| Ablauf-Fall findet ein Element nicht | feste Merker nicht umbenennen oder weglassen; Liste in der Landkarte (Abschnitt M09) |
| Dialog verliert den Fokus | `<dialog>` mit eigener Fokusfalle und Fokusrückgabe; kein `Liferay.Util.openModal` (iFrame, Fokus nicht sicher) |
| Waagerechtes Scrollen bei 375 px | feste Breiten aus Clay-Raster statt eigener Breakpoints; Seitenränder des Portals im Layout |
| Serveraktion nur durch Ausblenden geschützt | Rolle und Besitz prüft der Service selbst (M02-R13) |
| Fremde Fehlerseite von Liferay bei „Zugriff verweigert“ | feste Texte der Spec in der App-Seite; nur das Control Panel bleibt bei Liferay |

## Bitte bestätigen

- [ ] Eigene Glocke im Theme aus `BH_Notification` statt der Glocke des Control Menu (Profil 7.2, 3.4 und „Bitte bestätigen“; gemeinsam 2.5). P09 baut die eigene Glocke; ohne Freigabe ist UI-AK-03
      nicht sicher erfüllbar und wird in P08 mit der Liferay-Glocke neu bewertet.
- [ ] UI-AK-16 **abweichend, begründet** für die Verwaltung von Liferay (Control Panel, Admin-Theme); alle Seiten der App einschließlich der Anmeldung bleiben im Umfang (Profil 6.3). Kein Prüffall trägt
      `abweichend.liferay-72`, weil keiner die Verwaltung erreicht.
- [ ] Schrift IBM Plex Sans (`docs/05-ui-spezifikation.md`) liegt im Repository nicht vor (dort nur Noto Sans für das PDF) und steht nicht in der Liste der Bibliotheken (gemeinsam 7). Vorschlag: Dateien samt Lizenz
      `OFL` ins Theme legen, Quelle im PR nennen; Ersatz Systemschrift.
- [ ] Profil 7.2, Abschnitt 3.4 (UI-AK-10) nennt für die lesbare Adresse des Prüfansicht-Berichts `FriendlyURLMapper` „(P07)“; P07 ist der PDF-Export. Vorschlag: Der Mapper entsteht in P09 (Schritt 8), das
      Profil wird bei Gelegenheit berichtigt.
- [ ] `<dialog>` in Firefox und Edge der CI (Profil, „In P00 zu bestätigen“): Fehlt die Unterstützung, wird derselbe Dialog mit `role="dialog"` und eigener Fokusfalle gebaut; die Prüffälle UI-AK-18-01 und
      UI-AK-18-02 bleiben der Maßstab.
- [ ] Gegenproben F-P09-1 bis F-P09-32 als Nachweis, dass Farbschema-, Kontrast-, Fokus- und Layout-Prüfungen wirken.

# P09 Oberfläche (M09)

Reihe `playbooks/liferay-625/` · Plattform Liferay Portal 6.2.5 CE GA6 · Profil `profile/liferay-625.md` (auf Grundlage
von `profile/liferay-gemeinsam.md`) · Stand: 16.10.2026 (Etappe G4, Paket G) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Die Oberfläche der App folgt der UI-Spezifikation mit den Mitteln von 6.2.5: eigenes Theme `bh-theme` (Velocity, Eltern-Theme
`_styled`) mit Tokens für Hell und Dunkel im `<head>`, Seitenleiste und Schublade, **eigene Glocke im Theme** aus
`BH_Notification` (Profil 6.2.5, Abschnitt 3.1), Portlets ohne eigene Überschrift, Status-Chips mit SVG, Darstellung System/Hell/Dunkel
vom Server ohne Aufblitzen, eigene Dialoge mit Fokusfalle, Seitentitel, Lade- und Leerzustände, WCAG 2.2 AA. Fertig,
wenn:

1. alle Prüffälle in `specs/pruefung/M09.json` grün sind (20 UI-AK-IDs; 22 Fachlogik- und 33 Ablauf-Fälle, letztere in
   Chromium und bei 375 px);
2. die eigenen Tests der Fachlogik (`test/unit/`, Namen ab der UI-AK-ID) und der Darstellung am Konto
   (`UIAK14_DarstellungAmKontoTest` in `test/integration/`) grün sind;
3. der axe-Lauf `liferay-625/e2e/barrierefreiheit.spec.ts` auf allen Seiten der Abläufe einschließlich Anmeldeseite,
   „Passwort vergessen“ und „Passwort setzen“ hell und dunkel bei 1280 und 375 px ohne Verstoß ist;
4. jede UI-AK eine Bewertung nach Profil 6.2.5, Abschnitt 3.2 hat; „abweichend, begründet“ gilt nur für die Seiten des Portals außerhalb
   der App (Control Panel, Fehlerseiten des Portals, UI-AK-16, M09-R19) und steht unter „Bitte bestätigen“.

Schemaänderung: keine neue Spalte; `BH_Person.theme` legt P02 mit an (gemeinsam 2.3). Falls sie fehlt: Spalte `theme`
(`SYSTEM`, `LIGHT`, `DARK`, Voreinstellung `SYSTEM`) über `service.xml`, Migration ja (Neuanlage bis `1.0.0`).

## 2. Voraussetzungen

- P00 bis P08 der Reihe abgenommen. Die Portlets der Module existieren funktional (Anmelden über den JSP-Hook, Kein
  Zugang, Start, Meine Wochen, Bericht, Prüfliste, Azubis, Personen, Benachrichtigungen, Nicht zustellbar,
  Einstellungen); P09 gibt ihnen Rahmen, Gestaltung und Zugänglichkeit.
- P00 hat Profil 6.2.5, „In P00 zu bestätigen“ Punkte 14, 17 und 18 (Dockbar-Glocke, Sass, Eltern-Theme, Portlet-Rahmen, Titelvorlage) als „offen bis
  P09“ vermerkt; P09 bestätigt sie in Schritt 2.
- Profil 6.2.5, Abschnitte 3 („Oberfläche“, „Theme-Daten“, „Dunkelmodus“), 3.1 (Glocke), 3.2 (Umfang, Technik,
  Bewertung je UI-AK), 4.3 (Ablauf-Adapter, Merker) und 7 („Sass des Themes“, „Portal-Bausteine“, „Mehrere
  Klassenlader“).
- Chromium und 375 px lokal; Firefox und Edge nur in CI.

## 3. Eingaben

- Fach-Spec: `specs/M09-oberflaeche.md` (Regeln M09-R01 bis M09-R23, feste Texte, Abschnitt 8).
- Prüffälle: `specs/pruefung/M09.json`; Ablauf-Aktionen, Prüfaktionen und Elemente: `specs/pruefung/format.md`, „Aufbau
  eines Ablauf-Falls“ und „Schnittstellen von M09“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M09 Oberfläche“ (Liste der festen Merker).
- Gestaltung (Referenz): `docs/05-ui-spezifikation.md` („Design-Tokens“, Komponenten, Seiten).
- Vorbild der Prüfaktionen (lesen, nicht ändern): `e2e/pruefung/ablauf-adapter.ts`, `e2e/pruefung/ablauf-pruefungen.ts`.

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Übertragbar sind die reinen Funktionen `src/domain/week-progress.ts`, `src/domain/theme.ts`,
`src/domain/relative-time.ts`, `bellCount()`/`bellLabel()` aus `src/components/ui/bell.tsx` und `STATUS_STYLES` aus
`src/components/ui/status-chip.tsx` (Formen der Symbole). Die React-Komponenten sind nicht übertragbar; Markup, Tokens
und Verhalten entstehen in Velocity, JSP und eigenem Skript. Belege zum Abgleich: `e2e/ui-ak.spec.ts`,
`e2e/barrierefreiheit.spec.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Theme-Gerüst und Tokens, (2) reine Fachfunktionen der Oberfläche, (3) Theme-Daten über die
`ServicePreAction`, (4) Rahmen, Menü und Glocke, (5) Bausteine (Chip, Dialog, Fehlerleiste, Fußleiste, Platzhalter), (6)
Seiten, (7) Darstellung, (8) Barrierefreiheit und Fokus, (9) Prüfaktionen des Ablauf-Adapters. Zu jedem UI-AK die
Prüffälle und die Umsetzung nach Profil 6.2.5, Abschnitt 3.2:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Umsetzung auf 6.2.5 (Bewertung) |
| --- | --- | --- | --- |
| UI-AK-01 | Seitenleiste ab 1024 px, darunter Menüknopf und Schublade mit Escape und Fokusrückgabe. | 4 (4 ablauf) | Seitenleiste und Schublade in `portal_normal.vm` und `main.js`, Fokusfalle und Escape von Hand (gleichwertig) |
| UI-AK-02 | Aktiver Menüpunkt gekennzeichnet; jede Rolle sieht genau ihre Menüpunkte. | 2 (2 ablauf) | Menü aus den Request-Attributen (Rolle, Zähler), `aria-current`; Schutz im Service (gleichwertig) |
| UI-AK-03 | Glocke mit Zähler, ab 100 „99+“, genaue Zahl im Namen. | 4 (4 fachlogik) | eigene Glocke im Theme aus `BH_Notification` (Profil 6.2.5, Abschnitt 3.1; gleichwertig, wenn der Vorschlag freigegeben ist) |
| UI-AK-04 | Start Azubi: aktuelle Woche mit Fortschritt; „Zu erledigen“ älteste zuerst, abgelehnte oben. | 4 (4 fachlogik) | `StartPortlet` (JSP), Fachlogik in `domain/` (gleichwertig) |
| UI-AK-05 | Leerzustand „Alles erledigt – keine offenen Wochen.“ | 2 (2 ablauf) | Leerzustand im Portlet (gleichwertig) |
| UI-AK-06 | Fünf Tage nebeneinander ab 1280 px, kein waagerechtes Scrollen bei 1280 und 375 px. | 3 (3 ablauf) | eigenes CSS-Raster, einspaltige Layout-Vorlage ohne Seitenränder des Portals (gleichwertig) |
| UI-AK-07 | Fußleiste „Ungespeicherte Änderungen“ / „Gespeichert“ und Meldung. | 1 (1 ablauf) | Fußleiste im Portlet, Zustand per Skript, Erfolgsmeldung des Portlets (gleichwertig) |
| UI-AK-08 | Fehlerleiste mit betroffenen Tagen und Sprunglinks, erhält den Fokus. | 1 (1 ablauf) | Fehlerleiste im Portlet, Fokus per Skript nach dem Laden (gleichwertig) |
| UI-AK-09 | Einreichen speichert zuerst, dann wird eingereicht. | 1 (1 ablauf) | eine Service-Transaktion speichert zuerst (P05; gleichwertig) |
| UI-AK-10 | Prüfliste links, Bericht rechts ab 1024 px; Bericht in der Adresse. | 1 (1 ablauf) | Prüfansicht als ein Portlet, Bericht als Render-Parameter über `friendly-url-routes.xml` (gleichwertig) |
| UI-AK-11 | Nach Entscheidung nächster Bericht; danach „Keine Berichte zur Prüfung.“ | 1 (1 ablauf) | Weiterleitung nach der Aktion (gleichwertig) |
| UI-AK-12 | Unter 1024 px Berichtsseite mit Entscheidungsleiste und „← Prüfliste“. | 2 (2 ablauf) | Berichtsseite mit Entscheidungsleiste unter 1024 px (gleichwertig) |
| UI-AK-13 | Jeder Status-Chip zeigt Symbol und Text. | 4 (4 fachlogik) | eingebettete SVG-Symbole, nicht Font Awesome 3 des Portals (gleichwertig) |
| UI-AK-14 | Darstellung System, Hell, Dunkel; gilt sofort, bleibt erhalten, gilt auf zweitem Gerät. | 10 (10 fachlogik) | `darstellungPruefen`, `darstellungErmitteln` in Java; `BH_Person.theme` und Cookie, Weiterleitung auf dieselbe Seite (gleichwertig) |
| UI-AK-15 | Bei System folgt die App dem Gerät; kein Aufblitzen des falschen Schemas. | 3 (3 ablauf) | `data-theme` und Tokens im `<head>` vom Server, kein Skript nötig (gleichwertig) |
| UI-AK-16 | Keine Verstöße WCAG A und AA, hell und dunkel, 1280 und 375 px. | 4 (4 ablauf) | axe auf allen Seiten der Abläufe einschließlich JSP-Hook (gleichwertig); **abweichend, begründet** für Seiten des Portals außerhalb der App |
| UI-AK-17 | Alle Abläufe nur mit der Tastatur; Fokus sichtbar und nie verdeckt. | 2 (2 ablauf) | Dockbar für Azubis und Ausbilder ausgeblendet, „Abmelden“ im Menü des Themes (gleichwertig) |
| UI-AK-18 | Dialog fängt Fokus, Escape schließt, Fokus kehrt zurück. | 2 (2 ablauf) | eigener Dialog (`<dialog>` bzw. eigenes Markup), kein `aui-modal` (gleichwertig) |
| UI-AK-19 | Eigener Seitentitel „<Seite> – Berichtsheft“ und genau eine Hauptüberschrift. | 2 (2 ablauf) | `PortalUtil.setPageTitle` und Titelvorlage im Theme; Portlet-Rahmen ohne Überschrift (gleichwertig) |
| UI-AK-20 | Platzhalter als Ladezustand; erklärender Leerzustand. | 2 (2 ablauf) | Platzhalter nur bei nachgeladenen Inhalten (Ressource-URL), sonst fertige Seite vom Server (gleichwertig) |

Kein Fall in `specs/pruefung/M09.json` trägt `abweichend.liferay-625`: Die Abweichung zu UI-AK-16 betrifft Seiten, die
kein Ablauf-Fall erreicht.

## 6. Empfehlung

**Weg B**, mit den Prüffällen als Maßstab (sie prüfen Layout, Fokus und Titel über feste Merker, nicht Pixel). Das Paket
ist groß: Die Steuerung darf es nach Modulgrenzen teilen (`playbooks/00-steuerung.md`, Abschnitt 3), z. B. (a) Schritte
2 bis 7 (Theme, Rahmen, Glocke, Seiten, Darstellung) und (b) Schritte 8 und 9 (Fokus, Barrierefreiheit,
Prüfaktionen). Weg A nur auf ausdrücklichen Auftrag.

## 7. Schritte

1. **Branch** `claude/l62-p09-oberflaeche`; Spec, `docs/05-ui-spezifikation.md`, Profil 6.2.5, Abschnitt 3.2 und Prüffälle lesen.
   Prüfschritt: Liste der festen Texte und der Elemente aus `specs/pruefung/format.md` im PR-Entwurf.
2. **Theme bestätigen** (Profil 6.2.5, „In P00 zu bestätigen“ 14, 17, 18). `bh-theme` mit Eltern-Theme `_styled`; Probe in
   `custom.css` mit CSS-Variablen, `var()`, `:root:not([data-theme=light])` und `@media (prefers-color-scheme: dark)`;
   Sass-Übersetzung beim Deployment im Tomcat-Log prüfen. Dockbar je Rolle ausblendbar, Portlet-Rahmen ohne `h1`
   (`portlet.vm`, `portlet-decorate` aus), Titelvorlage. Prüfschritt: Ergebnis je Punkt im PR; lässt Sass die Tokens
   nicht unverändert durch, bleiben sie im `<head>` (Schritt 3), sonst wandern sie nach `custom.css`.
3. **Tokens** (`docs/05-ui-spezifikation.md`, „Design-Tokens“; M09 Abschnitt 8). Farben nur als Tokens, einmal für Hell,
   einmal für Dunkel (`[data-theme=dark]` und `@media (prefers-color-scheme: dark)` für `:root:not([data-theme=light])`),
   dazu `color-scheme`, als `<style>`-Block im `<head>` von `portal_normal.vm` (Profil 6.2.5, Abschnitt 3.2, „Technik“). Bootstrap 2 und
   AlloyUI haben feste Farben: Das Theme überschreibt die genutzten Klassen (`.btn`, `.alert`, `.table`, Formularfelder,
   `.control-group`) mit Tokens. Eigene Breakpoints 1024 px und 1280 px; das Raster von Bootstrap 2 wird nicht genutzt.
   Schriften aus dem Theme, kein Abruf aus dem Internet. Prüfschritt: keine feste Farbe in JSP oder `custom.css` außer in
   den Tokens (Suche nach `#` und `rgb(` außerhalb des Token-Blocks).
4. **Fachfunktionen** (reine Java-Klassen unter `de.berichtsheft.domain.ui`, Gegenstücke zur TypeScript-App):
   `WeekProgress` (`weekProgress()`, `progressLabel()`, `firstLine()`; M09-R05, M09-R06, UI-AK-04), `Theme`
   (`isTheme()`, `themeAttribute()`, `themeFromCookie()`, `resolveTheme()`: Konto vor Gerät; M09-R16 bis M09-R18,
   UI-AK-14, UI-AK-15), `RelativeTime`, `Bell` (`bellCount()` ab 100 „99+“, `bellLabel()` mit genauer Zahl; UI-AK-03),
   `StatusChip` (Symbol und Text je Status; UI-AK-13). Prüfschritt: Unit-Tests mit Namen ab der UI-AK-ID
   (`UIAK03_…`, `UIAK13_…`).
5. **Theme-Daten** (Profil 6.2.5, Abschnitt 3 „Theme-Daten“, 7 „Mehrere Klassenlader“). `de.berichtsheft.hook.events.ServicePreAction`
   (`servlet.service.events.pre`) legt Person, Rolle, Darstellung (`resolveTheme()`), Zähler der Glocke, der Prüfliste
   und von Nicht zustellbar als Request-Attribute ab; `portal_normal.vm` liest nur diese, `serviceLocator` bleibt in
   Velocity gesperrt. Prüfschritt: Seite ohne Anmeldung zeigt das Theme ohne Fehler im Log; angemeldet stehen die
   Attribute im Rahmen.
6. **Rahmen, Menü und Glocke** (M09-R01 bis M09-R04, UI-AK-01, UI-AK-02, UI-AK-03, UI-AK-17). `portal_normal.vm`: Kopf
   mit Glocke und Konto, ab 1024 px Seitenleiste, darunter Menüknopf und Schublade (`main.js`: Fokusfalle, Escape,
   Fokus zurück), Menüpunkte je Rolle in der Reihenfolge der Spec mit `aria-current`, „Zum Inhalt springen“, Demo-Hinweis,
   „Abmelden“ (`/c/portal/logout`). Dockbar für Azubis und Ausbilder aus; die Sitzungswarnung des Portals ist aus
   (`session.timeout.warning=0`). **Eigene Glocke** (Profil 6.2.5, Abschnitt 3.1): Zähler und Vorschau aus `BH_Notification` mit
   `Bell`; Markieren nach AK-1015 über die Seite Benachrichtigungen. Merker `data-menue`, `data-menue-knopf`,
   `data-drawer-close`, `data-glocke`, `data-glocke-vorschau`. Prüfschritt: Ablauf-Fälle zu UI-AK-01 und UI-AK-02 bei
   1280 und 375 px.
7. **Bausteine und Seiten** (M09-R04 bis M09-R15, M09-R21 bis M09-R23; UI-AK-04, UI-AK-05, UI-AK-06, UI-AK-07, UI-AK-08,
   UI-AK-09, UI-AK-10, UI-AK-11, UI-AK-12, UI-AK-13, UI-AK-18, UI-AK-19, UI-AK-20).
   JSP-Fragmente unter `docroot/html/common/`: Status-Chip mit SVG, Kopf mit Zurück-Link „← Zurück zu <Liste>“,
   Fehlerleiste mit Sprunglinks und Fokus, Fußleiste („Ungespeicherte Änderungen“ / „Gespeichert“), Dialog mit
   Fokusfalle (Merker `data-oeffnet-dialog`), Leerzustand, Platzhalter (erst nach kurzer Verzögerung, nur bei Ressource-URL).
   Seiten: Start Azubi (aktuelle Woche, „Zu erledigen“ mit abgelehnten zuerst, sonst älteste zuerst, Leerzustand),
   Meine Wochen, Woche erfassen (ab 1280 px fünf Tage nebeneinander, Einreichen speichert zuerst), Prüfansicht (ab
   1024 px Liste links, Bericht rechts, Bericht in der Adresse über `friendly-url-routes.xml`, danach der nächste
   Bericht), Berichtsseite mit Entscheidungsleiste und „← Prüfliste“ unter 1024 px, Azubis, Personen,
   Benachrichtigungen („Keine Benachrichtigungen.“), Nicht zustellbar, Einstellungen; Anmelden, „Passwort vergessen“,
   „Passwort setzen“ und Kein Zugang in einer zentrierten Karte über den JSP-Hook (`custom-jsp-dir` `/html/hooks/login`).
   Seitentitel „<Seite> – Berichtsheft“ über `PortalUtil.setPageTitle` und die Titelvorlage, genau ein `h1` je Seite.
   Texte aus der Spec wörtlich, Merker aus der Landkarte (Liste dort). Keine Java-8-Syntax in JSPs (Profil 6.2.5, Abschnitt 7).
   Prüfschritt: Ablauf- und Fachlogik-Fälle dieser UI-AK grün.
8. **Darstellung** (M09-R16 bis M09-R18, UI-AK-14, UI-AK-15). `PersonLocalServiceImpl.updateOwnTheme()` (nur eigene,
   nur aktive Person, nur gültige Werte; Fehlercodes nach `darstellungPruefen`), `EinstellungenPortlet` speichert am Konto
   und im Cookie und leitet auf dieselbe Seite weiter (wirkt sofort). `portal_normal.vm` setzt `data-theme` am
   `<html>`-Element aus dem Request-Attribut: Konto vor Cookie, ohne beides `System`; damit steht das Schema vor dem
   ersten Darstellen fest (M09-R18). Eine Lösung nur im Browser bricht UI-AK-15. Prüfschritt:
   `UIAK14_DarstellungAmKontoTest` (speichern, Rechte, zweites Gerät über die Testschnittstelle) und
   `erstes_bild_lesen` im Browser.
9. **Barrierefreiheit, Fokus und Prüfaktionen** (M09-R19, M09-R20; UI-AK-16, UI-AK-17). Sichtbarer Fokus, keine
   verdeckten Ziele unter festen Leisten, Kontrast hell und dunkel, beschriftete Felder, `aria`-Namen (Glocke mit genauer
   Zahl), Berührflächen 44 × 44 px bei 375 px. `liferay-625/e2e/barrierefreiheit.spec.ts` mit `@axe-core/playwright`
   (Abhängigkeit des Repositorys; WCAG 2.0 bis 2.2 A und AA) auf allen Seiten der Abläufe, hell und dunkel, 1280 und
   375 px, einschließlich der drei Seiten des JSP-Hooks. Ablauf-Adapter unter `liferay-625/e2e/`: Prüfaktionen
   `ansicht_lesen`, `elemente_lesen`, `anordnung_lesen`, `fokus_lesen`, `bedienen`, `taste_druecken`, `tastatur_bis`,
   `tippen`, `warten`, `erstes_bild_lesen`, `barrierefreiheit_pruefen`, `darstellung_waehlen`; das Gerät (`geraet`:
   Breite, Höhe, Farbschema, langsames Netz) stellt der Runner ein, `netz: langsam` verzögert nur Ressource-Aufrufe
   (`p_p_lifecycle=2`, Profil 6.2.5, Abschnitt 4.3). Der Adapter liest nur feste Merker, nie Meldungstexte (Ausnahme: Seitentitel).
   Fachlogik-Adapter: `statusChip`, `glockenZaehler`, `wochenFortschritt`, `ersteZeile`, `darstellungPruefen`,
   `darstellungErmitteln`. Prüfschritt: `-g "M09.json"` im Ablauf-Runner und `ant pruefung-fachlogik
   -Dbh.pruefung.filter=M09.json` grün.
10. **Gegenprobe** (Gemeinsame Regeln). (a) Im Token-Block für Dunkel die Textfarbe auf den Wert von Hell setzen (dunkle
    Schrift auf dunklem Grund) → UI-AK-16-02 und UI-AK-16-04 bzw. der Dunkel-Lauf von `barrierefreiheit.spec.ts` melden
    Kontrastverstöße; (b) `data-theme` per Skript statt vom
    Server setzen → UI-AK-15-01 meldet beim ersten Bild das falsche Schema; (c) die Dockbar für Azubis wieder einblenden
    → UI-AK-17-01 meldet verdeckten Fokus. Ergebnis je Zeile im PR, danach zurücknehmen. Bleibt ein Fall grün, ist die
    Prüfung ohne Wirkung: der Steuerung melden.
11. **Bau-Stand.** M09 in `BauStand.java` eintragen. Prüfung nach Abschnitt 8.

## 8. Prüfung

Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh`, Playwright im Wurzelordner.

| Befehl | Erwartet |
| --- | --- |
| `ant pruefung-fachlogik -Dbh.pruefung.filter=M09.json` | 22 Fälle grün |
| `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=chromium --project=smartphone-375 -g "M09.json"` | 33 Ablauf-Fälle grün |
| `ant test-unit` | grün, auch die Tests der Fachfunktionen mit UI-AK-ID |
| `ant test-integration -Dtest.class=UIAK14_DarstellungAmKontoTest` | grün |
| `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=a11y` | keine axe-Verstöße auf den Seiten der Abläufe |
| `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=chromium --project=smartphone-375` | alle bisherigen Ablauf-Fälle weiterhin grün bzw. „abweichend, begründet“ |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: Firefox und Edge für alle Ablauf-Fälle (P10), der volle Liferay-6.2.5-Job.

## 9. Abschluss

- Commit, z. B. „L62 P09: Oberfläche (Theme, Glocke, Darstellung, Barrierefreiheit)“; vor dem Push alle Befehle aus
  Abschnitt 8 lokal grün.
- Draft-PR mit der UI-AK-Tabelle (UI-AK-01, UI-AK-02, UI-AK-03, UI-AK-04, UI-AK-05, UI-AK-06, UI-AK-07, UI-AK-08,
  UI-AK-09, UI-AK-10, UI-AK-11, UI-AK-12, UI-AK-13, UI-AK-14, UI-AK-15, UI-AK-16, UI-AK-17, UI-AK-18, UI-AK-19,
  UI-AK-20 mit Test, Prüffällen und Bewertung), der Gegenprobe, Screenshots nur mit Testdaten und „Bitte bestätigen“.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Dunkelmodus blitzt beim Laden hell auf | `data-theme` und Tokens vom Server im `<head>` (Schritt 8), nie erst per Skript |
| Theme-Änderung wirkt nicht, keine Fehlermeldung | Sass-Fehler beim Deployment stehen nur im Tomcat-Log (Profil 6.2.5, Abschnitt 7) |
| Tokens kommen in `custom.css` verändert an | Sass von 6.2 lässt CSS-Variablen nicht durch; Tokens im `<head>` lassen (Schritt 2) |
| Farben von Bootstrap 2 oder AlloyUI tauchen auf (Kontrast im Dunkelmodus) | genutzte Klassen im Theme mit Tokens überschreiben; keine AlloyUI-Bausteine mit eigener Farbe (`aui-modal`, Datumsauswahl) |
| Fokus verschwindet hinter einer festen Leiste | Dockbar für Azubis und Ausbilder aus; `scroll-margin` setzen (UI-AK-17) |
| Zwei Hauptüberschriften auf einer Seite | Portlet-Rahmen mit Titel (`portlet-decorate`) aus; Seitenkopf ohne `h1` (UI-AK-19) |
| Theme sieht die Daten der App nicht | Klassen des Plugins sind im Theme unsichtbar; nur Request-Attribute der `ServicePreAction` (Profil 6.2.5, Abschnitt 7) |
| Glocke zeigt Liferay-Benachrichtigungen statt der App | eigene Glocke aus `BH_Notification` (Profil 6.2.5, Abschnitt 3.1), nicht die der Dockbar |
| Ablauf-Fall findet ein Element nicht | feste Merker nicht umbenennen oder weglassen; Liste in der Landkarte (Abschnitt M09) |
| JSP lässt sich nicht übersetzen | Java-8-Syntax in einer JSP; Jasper von Tomcat 7 kennt sie nicht (Profil 6.2.5, Abschnitt 7) |
| Waagerechtes Scrollen bei 375 px | Raster von Bootstrap 2 (feste Breiten) statt eigener Breakpoints; Layout-Vorlage mit Seitenrändern des Portals |
| Serveraktion nur durch Ausblenden geschützt | Rolle und Besitz prüft der Service selbst (M02-R13) |

## Bitte bestätigen

- [ ] Eigene Glocke im Theme aus `BH_Notification` statt der Glocke der Dockbar (Profil 6.2.5, Abschnitt 3.1); Profil 6.2.5 nennt sie
      einen Vorschlag mit Geltung von gemeinsam 2.5 bis zur Freigabe, gemeinsam 2.5 und 3.1 führen sie schon als
      geändert. P09 baut die eigene Glocke; ohne Freigabe ist UI-AK-03 auf 6.2.5 nicht erfüllbar.
- [ ] Dunkelmodus-Umfang nach Profil 6.2.5, Abschnitt 3.2: Control Panel und Fehlerseiten des Portals bleiben hell und ungeprüft
      (**abweichend, begründet** zu M09-R19, UI-AK-16).
- [ ] Gegenprobe (a) bis (c) als Nachweis, dass Farbschema-, Kontrast- und Fokusprüfungen wirken.

# Auftrag an die Entwickler-Sitzung: Etappe 8 – Neugestaltung der Oberfläche

Du bist Entwickler der Berichtsheft-App im Repository `Schoenechristopher/berichtsheft-app` (seit 12.10.2026 in der Organisation `Schoenechristopher`; vorher `schoenechristopher96-lgtm/berichtsheft-app`). Etappen 1–7, der Zeitzonen-Fix und der Zeilenenden-Fix (PR #1–#9) sowie die CI-Richtlinie (PR #10) sind gemergt. Lies zuerst `CLAUDE.md`, `docs/ci-richtlinie.md`, `docs/05-ui-spezifikation.md` (neu, freigegeben am 12.10.2026), dann `docs/01-spezifikation.md`, `docs/02-plan.md`, `docs/03-testabdeckung.md`, `scripts/ak-abdeckung/`, `playwright.config.ts`, `.github/workflows/ci.yml`, `src/app/`, `src/components/`, `e2e/`.

`docs/05-ui-spezifikation.md` und dieser Auftrag liegen bereits auf dem Branch `etappe-8-ui`. Arbeite auf diesem Branch weiter.

## Ziel

Etappe 8: Die Oberfläche wird nach `docs/05-ui-spezifikation.md` neu gestaltet: Design-Tokens (Petrol, hell und dunkel), gemeinsame Komponenten, Seitenleiste mit Burger-Menü, neue Startseite Azubi, Woche erfassen mit fünf Spalten ab 1280 px, geteilte Prüfansicht, zusammengeführte Einstellungen mit Darstellung „System / Hell / Dunkel“, WCAG 2.2 AA. **Das fachliche Verhalten ändert sich nicht**; AK-101 bis AK-1102 gelten unverändert.

Der klickbare Entwurf (https://claude.ai/artifact/6w5J64847JtG9CRZ3uVsTp) ist für dich vermutlich nicht abrufbar. Maßgeblich ist der Text der UI-Spezifikation.

## Umfang

Reihenfolge laut Abschnitt „Umsetzung“ der UI-Spezifikation:

1. **Tokens und Komponenten** in `src/app/globals.css` (`@theme`) und `src/components/ui/`: Knopf, Textfeld/Textbereich mit Zähler, Auswahl Tagesart, Status-Chip, Karte, Liste/Tabelle, Dialog, Toast, Hinweisleiste, Glocke, Wochen-Kachel, Skeleton, Leerzustand. Schrift IBM Plex Sans über `next/font`, lokal gebündelt; im Docker-Image wird zur Laufzeit nichts aus dem Internet geladen. Bestehende Komponenten (`ui.tsx`, `ConfirmSubmit`, `NotificationBell` …) auf die neuen umstellen statt doppelt zu pflegen.
2. **Rahmen und Navigation:** Kopfzeile, Seitenleiste ab 1024 px, Burger-Schublade darunter, Menüpunkte je Rolle, „Zum Inhalt springen“, Browser-Titel „<Seite> – Berichtsheft“.
3. **Vier Hauptseiten:** Start Azubi, Woche erfassen, Prüfansicht (geteilt, `?bericht=<id>`, nach Entscheidung automatisch der nächste Bericht), Einstellungen (zusammengeführt; `/ausbilder/einstellungen` leitet um).
4. **Übrige Seiten** im neuen Stil, dazu neu `/azubi/wochen` (Meine Wochen mit Filter und Sammel-PDF) und `/ausbilder/azubis`.
5. **Darstellung:** Feld `theme` (System, Hell, Dunkel) an der Person mit Migration, Cookie für das erste Rendern, `data-theme` am `html`-Element vom Server gesetzt, kein Aufblitzen.
6. **AK-Abdeckung:** `npm run ak:abdeckung` erkennt heute nur `AK-\d{3,4}`. Erweitere das Skript so, dass es zusätzlich die IDs `UI-AK-01` bis `UI-AK-20` aus `docs/05-ui-spezifikation.md` liest und in `docs/03-testabdeckung.md` aufführt (eigener Abschnitt), mit Unit-Test für den Parser. Testnamen beginnen mit der UI-AK-ID, z. B. `UI-AK-07 Fußleiste zeigt ungespeicherte Änderungen`.
7. **Barrierefreiheit:** `@axe-core/playwright`; ein Test prüft alle Seiten hell und dunkel bei 1280 und 375 px (UI-AK-16). Gefundene Verstöße beheben, nicht ausschließen.
8. **Screenshots:** Ein Playwright-Test erzeugt Screenshots der vier Hauptseiten (Desktop/Handy, hell/dunkel). In CI werden sie als Artefakt hochgeladen; nach CI-20 höchstens 7 Tage Aufbewahrung. Hänge sie zusätzlich in die PR-Beschreibung oder beschreibe, wie man sie lokal erzeugt.
9. **Bestehende Tests:** Alle AK-Tests bleiben grün. Geänderte Texte oder Selektoren werden in den Tests nachgezogen; kein Test wird abgeschwächt, übersprungen oder gelöscht. Wo sich ein Testname oder eine Prüfung inhaltlich ändern müsste, im PR begründen.
10. **Demo-Anleitung und README:** Bildschirmbeschreibungen in `docs/04-demo-anleitung.md` an die neuen Seiten und Menüpunkte anpassen; README um die UI-Spezifikation ergänzen.

## CI-Minuten sparen (verbindlich, `docs/ci-richtlinie.md`)

- Alles zuerst lokal: schnelle Prüfung (Lint, Prettier, Typecheck, Vitest, `ak:abdeckung --pruefen`) und Browser-Tests mit `E2E_LOGIN_MODE=test npm run test:e2e -- --project=chromium --project=smartphone-375`.
- **Gebündelt pushen:** Arbeite lokal in Commits, pushe selten (Ziel: höchstens 3–4 Pushes für die ganze Etappe). Jeder Push auf den PR startet heute noch die volle Compose-Prüfung (~17 Minuten).
- Der PR bleibt Draft, bis lokal alles grün ist (CI-22). Auf „bereit“ stellt ihn erst Chris oder die Steuerung.
- Keine leeren Commits, kein Neustart von Läufen über CI-18 hinaus, keine Diagnose-Schleifen.
- Die Workflow-Umstellung auf CI-09 bis CI-20 ist **nicht** Teil dieser Etappe; nur den axe- und Screenshot-Schritt ergänzen, mit `timeout-minutes` nach CI-17.

## Fälle, zu denen du im PR einen Vorschlag zur Bestätigung machst

- Abweichungen von `docs/05-ui-spezifikation.md`, die technisch nötig oder deutlich besser sind (z. B. Breakpoints, Komponentenschnitt).
- Ob die Glocken-Vorschau (letzte 5) als Ausklappmenü am Desktop sinnvoll umsetzbar ist oder direkt zur Seite führt.
- Wo ein bestehender Test inhaltlich geändert werden müsste.
- Alles Weitere, das Spezifikation und Plan nicht eindeutig regeln.

## Akzeptanzkriterien dieser Etappe

UI-AK-01 bis UI-AK-20 – jeweils mindestens ein Test, Name beginnt mit der ID. Alle bestehenden AK-Tests grün. `npm run ak:abdeckung` meldet weder AK- noch UI-AK-IDs ohne Test. Kein horizontales Scrollen bei 375 px auf allen Seiten (AK-1102 bleibt erfüllt).

## Arbeitsweise

- Branch `etappe-8-ui`, Draft-PR gegen `main` im Repository `Schoenechristopher/berichtsheft-app`. PR-Beschreibung wie bisher: Umfang, Tabelle UI-AK → Test → Ebene, Doku-Änderungen, Screenshots, „Bitte bestätigen“, wie lokal starten.
- Vor jedem Push lokal Lint, Prettier, Typecheck und Tests grün. Danach den PR beobachten und CI-Fehler selbst beheben, bis alles grün ist.
- Bestätigte Auslegungen nach Bestätigung in `docs/05-ui-spezifikation.md` eintragen.
- Bei echten Unklarheiten: im PR fragen statt raten.

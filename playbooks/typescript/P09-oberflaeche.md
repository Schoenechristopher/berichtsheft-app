# P09 Oberfläche (M09)

Reihe `playbooks/typescript/` · Plattform TypeScript/Next.js · Profil `profile/typescript-nextjs.md` · Stand: 15.10.2026
(Etappe G4, Paket D) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Die Oberfläche der App folgt der UI-Spezifikation: Rahmen mit Seitenleiste und Schublade, Glocke, Start, Woche erfassen,
Prüfansicht, Status-Chips, Darstellung System/Hell/Dunkel ohne Aufblitzen, Dialoge mit Fokusfalle, Tastaturbedienung, Seitentitel,
Lade- und Leerzustände, WCAG 2.2 AA. Fertig, wenn alle Prüffälle in `specs/pruefung/M09.json` grün sind (20 UI-AK-IDs;
22 Fachlogik- und 33 Ablauf-Fälle, letztere in Chromium und bei 375 px), die Vitest-Tests der Fachlogik grün sind
(`src/components/ui/status-chip.test.tsx`, `src/domain/theme.test.ts`, `src/domain/week-progress.test.ts`,
`tests/db/theme.test.ts`) und `e2e/ui-ak.spec.ts` sowie der axe-Lauf (`e2e/barrierefreiheit.spec.ts`) grün sind.

## 2. Voraussetzungen

- P00 bis P08 abgenommen. Die Seiten der Module existieren funktional (Anmelden, Start, Meine Wochen, Woche erfassen, Prüfliste,
  Personen, Benachrichtigungen, Nicht zustellbar, Einstellungen); P09 gibt ihnen Rahmen, Gestaltung und Zugänglichkeit.
- Profil: Abschnitte 1 (Tailwind), 3 (Oberfläche, Dunkelmodus), 4 (Ablauf-Adapter, Prüfaktionen) und 7 (Merker, Farbschema auf dem
  Server).
- Chromium genügt lokal (Chromium und `smartphone-375`); Firefox und Edge laufen nur in CI.

## 3. Eingaben

- Fach-Spec: `specs/M09-oberflaeche.md` (Regeln M09-R01 bis M09-R23, feste Texte, Abschnitt 8).
- Prüffälle: `specs/pruefung/M09.json`; Ablauf-Aktionen, Prüfaktionen und die Tabelle der Elemente: `specs/pruefung/format.md`,
  „Aufbau eines Ablauf-Falls“ und „Schnittstellen von M09“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M09 Oberfläche“ (Liste der festen Merker).
- Gestaltung (Referenz): `docs/05-ui-spezifikation.md` (Tokens, Komponenten, Seiten).

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Lesereihenfolge: `src/domain/week-progress.ts`, `src/domain/theme.ts`, `bellCount()` in
`src/components/ui/bell.tsx`, `STATUS_STYLES` in `src/components/ui/status-chip.tsx`, `src/app/layout.tsx` und
`src/components/AppShell.tsx`, dann `src/app/(app)/azubi/page.tsx`, `src/app/(app)/berichte/[id]/`, `src/app/(app)/ausbilder/pruefliste/`,
`src/app/(app)/einstellungen/page.tsx`, zuletzt die Bausteine unter `src/components/ui/`. Belege: `e2e/ui-ak.spec.ts`,
`e2e/barrierefreiheit.spec.ts`, `e2e/pruefung/ablauf-pruefungen.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Tokens und Wurzel-Layout, (2) reine Fachfunktionen der Oberfläche, (3) Bausteine, (4) Rahmen und Navigation,
(5) Seiten, (6) Darstellung, (7) Barrierefreiheit und Fokus, (8) Prüfaktionen des Ablauf-Adapters. Zu jedem UI-AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| UI-AK-01 | Seitenleiste ab 1024 px, darunter Menüknopf und Schublade mit Escape und Fokusrückgabe. | 4 (4 ablauf) | `specs/pruefung/M09.json` |
| UI-AK-02 | Aktiver Menüpunkt gekennzeichnet; jede Rolle sieht genau ihre Menüpunkte. | 2 (2 ablauf) | `specs/pruefung/M09.json` |
| UI-AK-03 | Glocke mit Zähler, ab 100 „99+“, genaue Zahl im Namen. | 4 (4 fachlogik) | `specs/pruefung/M09.json` |
| UI-AK-04 | Start Azubi: aktuelle Woche mit Fortschritt; „Zu erledigen“ älteste zuerst, abgelehnte oben. | 4 (4 fachlogik) | `specs/pruefung/M09.json` |
| UI-AK-05 | Leerzustand „Alles erledigt – keine offenen Wochen.“ | 2 (2 ablauf) | `specs/pruefung/M09.json` |
| UI-AK-06 | Fünf Tage nebeneinander ab 1280 px, kein waagerechtes Scrollen bei 1280 und 375 px. | 3 (3 ablauf) | `specs/pruefung/M09.json` |
| UI-AK-07 | Fußleiste „Ungespeicherte Änderungen“ / „Gespeichert“ und Meldung. | 1 (1 ablauf) | `specs/pruefung/M09.json` |
| UI-AK-08 | Fehlerleiste mit betroffenen Tagen und Sprunglinks, erhält den Fokus. | 1 (1 ablauf) | `specs/pruefung/M09.json` |
| UI-AK-09 | Einreichen speichert zuerst, dann wird eingereicht. | 1 (1 ablauf) | `specs/pruefung/M09.json` |
| UI-AK-10 | Prüfliste links, Bericht rechts ab 1024 px; Bericht in der Adresse. | 1 (1 ablauf) | `specs/pruefung/M09.json` |
| UI-AK-11 | Nach Entscheidung nächster Bericht; danach „Keine Berichte zur Prüfung.“ | 1 (1 ablauf) | `specs/pruefung/M09.json` |
| UI-AK-12 | Unter 1024 px Berichtsseite mit Entscheidungsleiste und „← Prüfliste“. | 2 (2 ablauf) | `specs/pruefung/M09.json` |
| UI-AK-13 | Jeder Status-Chip zeigt Symbol und Text. | 4 (4 fachlogik) | `specs/pruefung/M09.json` |
| UI-AK-14 | Darstellung System, Hell, Dunkel; gilt sofort, bleibt erhalten, gilt auf zweitem Gerät. | 10 (10 fachlogik) | `specs/pruefung/M09.json` |
| UI-AK-15 | Bei System folgt die App dem Gerät; kein Aufblitzen des falschen Schemas. | 3 (3 ablauf) | `specs/pruefung/M09.json` |
| UI-AK-16 | Keine Verstöße WCAG A und AA, hell und dunkel, 1280 und 375 px. | 4 (4 ablauf) | `specs/pruefung/M09.json` |
| UI-AK-17 | Alle Abläufe nur mit der Tastatur; Fokus sichtbar und nie verdeckt. | 2 (2 ablauf) | `specs/pruefung/M09.json` |
| UI-AK-18 | Dialog fängt Fokus, Escape schließt, Fokus kehrt zurück. | 2 (2 ablauf) | `specs/pruefung/M09.json` |
| UI-AK-19 | Eigener Seitentitel „<Seite> – Berichtsheft“ und genau eine Hauptüberschrift. | 2 (2 ablauf) | `specs/pruefung/M09.json` |
| UI-AK-20 | Platzhalter als Ladezustand; erklärender Leerzustand. | 2 (2 ablauf) | `specs/pruefung/M09.json` |

## 6. Empfehlung

**Weg B**, mit den Prüffällen als Maßstab (sie prüfen Layout, Fokus und Titel über feste Merker, nicht Pixel). Das Paket ist groß:
die Steuerung darf es nach Modulgrenzen teilen (`playbooks/00-steuerung.md`, Abschnitt 3), z. B. (a) Schritte 2 bis 6 (Rahmen, Seiten,
Darstellung) und (b) Schritte 7 und 8 (Fokus, Barrierefreiheit, Prüfaktionen) „nach dem Muster“. Weg A nur auf ausdrücklichen Auftrag.

## 7. Schritte

1. **Branch** `claude/p09-oberflaeche`; Spec, `docs/05-ui-spezifikation.md` und Prüffälle lesen. Prüfschritt: Liste der festen Texte
   (Abschnitt „Feste Texte“ der Spec) und der Elemente aus `format.md` notiert.
2. **Tokens und Wurzel.** `src/app/globals.css`: Farben **nur** als Tokens (hell und dunkel; ein Wechsel der Akzentfarbe ist eine
   Änderung an einer Stelle), nie feste Farben in Komponenten. `src/app/layout.tsx` mit dem Titelmuster „<Seite> – Berichtsheft“
   (M09-R22), Schrift (`src/app/fonts.ts`), `src/app/error.tsx`, `src/app/not-found.tsx`, `src/app/(app)/error.tsx`. Prüfschritt:
   Seitentitel jeder Seite entspricht M09-R22; genau eine Hauptüberschrift.
3. **Fachfunktionen** (reine Funktionen): `src/domain/week-progress.ts` (`weekProgress()`, `progressLabel()`, `firstLine()`,
   M09-R05, M09-R06, UI-AK-04), `src/domain/theme.ts` (`Theme`, `THEMES`, `THEME_LABELS`, `THEME_COOKIE`, `isTheme()`,
   `themeAttribute()`, `themeFromCookie()`, `resolveTheme()`: Konto vor Gerät, M09-R16 bis M09-R18, UI-AK-14, UI-AK-15),
   `src/domain/relative-time.ts` (`relativeTime()`, „vor 2 Std.“), `bellCount()` und `bellLabel()` in `src/components/ui/bell.tsx`
   (ab 100 „99+“, der Name enthält die genaue Zahl, UI-AK-03), `STATUS_STYLES` in `src/components/ui/status-chip.tsx` (Symbol und
   Text je Status: Entwurf mit Stift, Eingereicht mit Pfeil nach oben usw., UI-AK-13). Prüfschritt: die zugehörigen Unit-Tests
   (Namen mit UI-AK-ID).
4. **Bausteine** `src/components/ui/`: Knopf, Karte, Feld, Hinweisleiste, Kopf mit Zurück-Link („← Zurück zu <Liste>“, M09-R04),
   Segmentauswahl, Liste/Tabelle, Symbole, `index.ts`; `dialog.tsx` (Fokusfalle, Escape schließt, Fokus zurück an den auslösenden
   Knopf, Merker `data-oeffnet-dialog`, M09-R21, UI-AK-07, UI-AK-18), `toast.tsx`, `use-hydrated.ts` (Felder gesperrt bis zur
   Interaktivität), `empty-state.tsx`, `skeleton.tsx` (Platzhalter in der Form des Inhalts, erst nach kurzer Verzögerung,
   M09-R23, UI-AK-05, UI-AK-20). Prüfschritt: Browser-Test der Dialoge (Tastatur).
5. **Rahmen `src/components/AppShell.tsx`** und `src/app/(app)/layout.tsx` (M09-R01 bis M09-R04, UI-AK-01 bis UI-AK-03): Kopfzeile mit
   Glocke und Konto; ab 1024 px Seitenleiste, darunter Menüknopf und Schublade; Menüpunkte je Rolle in fester Reihenfolge
   (Azubi: Start, Meine Wochen, …; Ausbilder laut Spec); aktiver Punkt gekennzeichnet; „Zum Inhalt springen“; Demo-Hinweis. Merker
   `data-menue`, `data-menue-knopf`, `data-drawer-close`, `data-glocke`, `data-glocke-vorschau`. Prüfschritt: Browser-Test
   UI-AK-01 und UI-AK-02 bei 1280 und 375 px.
6. **Seiten.** Start Azubi (`src/app/(app)/azubi/page.tsx`: aktuelle Woche mit Status-Chip und Tagesmarken, „Zu erledigen“ mit
   abgelehnten zuerst, sonst älteste zuerst, Leerzustand „Alles erledigt – keine offenen Wochen“, M09-R05 bis M09-R07), Meine Wochen
   mit Filter (`WeekOverview.tsx`), Woche erfassen (ab 1280 px fünf Tage nebeneinander, darunter untereinander, Fußleiste,
   Fehlerleiste mit Sprunglink, Einreichen speichert zuerst, M09-R08 bis M09-R11, UI-AK-06 bis UI-AK-09), Prüfansicht
   (`src/app/(app)/ausbilder/pruefliste/`: ab 1024 px Liste links und Bericht rechts, nach Freigeben oder Ablehnen der nächste
   Bericht, darunter eigene Berichtsseite mit derselben Entscheidungsleiste, M09-R12 bis M09-R14, UI-AK-10 bis UI-AK-12;
   Merker `data-bereich`, `data-woche`), Azubi-Liste, Personen, Benachrichtigungen mit Leerzustand „Keine Benachrichtigungen.“
   (UI-AK-20), Nicht zustellbar, Einstellungen, Anmelden und Kein Zugang in der zentrierten Karte (`src/components/AuthCard.tsx`).
   Alle Seiten tragen die festen Merker aus der Landkarte (Liste dort); Texte aus der Spec wörtlich. Prüfschritt:
   `e2e/ui-ak.spec.ts` (UI-AK-01 bis UI-AK-20 im Browser, auch bei 375 px).
7. **Darstellung** (M09-R16 bis M09-R18, UI-AK-14, UI-AK-15). `Person.theme` (Enum System/Hell/Dunkel, Voreinstellung System;
   Migration), `updateOwnTheme()` in `src/lib/people/service.ts` (nur eigene, nur aktive Person), `updateThemeAction()` in
   `src/app/(app)/einstellungen/actions.ts` (Konto und Cookie), `themeForRequest()` in `src/lib/theme.ts` (Konto vor Cookie), im
   Wurzel-Layout **auf dem Server** gesetzt, damit nichts aufblitzt; `src/components/ThemeSettings.tsx` (Merker `data-speicherstand`).
   Eine rein clientseitige Lösung bricht UI-AK-15. Prüfschritt: `tests/db/theme.test.ts` (speichern, Rechte, zweites Gerät) und
   `erstes_bild_lesen` im Browser.
8. **Barrierefreiheit und Fokus** (M09-R19, M09-R20, UI-AK-16, UI-AK-17): sichtbarer Fokus, Tab-Reihenfolge, keine verdeckten Ziele
   unter festen Leisten, Kontrast hell und dunkel, beschriftete Felder, `aria`-Namen (Glocke mit genauer Zahl). Prüfschritt:
   `E2E_LOGIN_MODE=test npx playwright test --project=a11y` (axe, WCAG 2.0 bis 2.2 A und AA, hell und dunkel, 1280 und 375 px) ohne
   Verstöße.
9. **Prüfaktionen im Ablauf-Adapter** (`e2e/pruefung/ablauf-adapter.ts`, Elemente in `e2e/pruefung/ablauf-pruefungen.ts`):
   `ansicht_lesen`, `elemente_lesen`, `anordnung_lesen`, `fokus_lesen`, `bedienen`, `taste_druecken`, `tastatur_bis`, `tippen`,
   `warten`, `erstes_bild_lesen`, `barrierefreiheit_pruefen`, `darstellung_waehlen`; das Gerät (`geraet`: Breite, Höhe, Farbschema,
   langsames Netz) stellt der Runner ein. Der Adapter liest nur feste Merker, nie Meldungstexte (Ausnahme: Seitentitel). Fachlogik-Adapter:
   `statusChip`, `glockenZaehler`, `wochenFortschritt`, `ersteZeile`, `darstellungPruefen`, `darstellungErmitteln`. Prüfschritt:
   `-t "M09.json"` in beiden Runnern grün.
10. **Bau-Stand.** M09 eintragen. Prüfung nach Abschnitt 8.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `npx vitest run --project unit tests/pruefung/fachlogik.test.ts -t "M09.json"` | 22 Fälle grün |
| `E2E_LOGIN_MODE=test npx playwright test e2e/pruefung-ablauf.spec.ts --project=chromium --project=smartphone-375 -g "M09.json"` | 33 Ablauf-Fälle grün |
| `npx vitest run --project unit src/components/ui/status-chip.test.tsx src/domain/theme.test.ts src/domain/week-progress.test.ts` | grün |
| `npx vitest run --project db tests/db/theme.test.ts` | grün |
| `E2E_LOGIN_MODE=test npx playwright test e2e/ui-ak.spec.ts --project=chromium --project=smartphone-375` | alle UI-AK grün |
| `E2E_LOGIN_MODE=test npx playwright test --project=a11y` | keine axe-Verstöße |
| `npm run lint && npm run format:check && npm run typecheck` | keine Fehler |
| `npm run ak:abdeckung` | schreibt `docs/03-testabdeckung.md` neu; die Datei wird mitcommittet (Profil, Abschnitt 4). Danach meldet `npm run ak:abdeckung -- --pruefen` keinen Befund |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | mit vorhandenem Quellcode „Playbook-Prüfung: keine Befunde.“; im Blindtest-Branch nur Befunde „fehlender-pfad“ auf Zielpfade, die noch nicht gebaut sind (Profil, Abschnitt 5) |

Nur in CI: Firefox und Edge für alle Ablauf-Fälle; Screenshots der Hauptseiten (`--project=screenshots`).

## 9. Abschluss

- `docs/03-testabdeckung.md` neu erzeugen und mitcommitten; die Merge-Reihenfolge der Pakete folgt KE-R05: der spätere PR gleicht per Merge mit dem Hauptzweig ab und erzeugt die Datei erneut.
- Commit, z. B. „P09: Oberfläche (Rahmen, Seiten, Darstellung, Barrierefreiheit)“; vor dem Push alles lokal grün.
- Draft-PR mit der UI-AK-Tabelle (UI-AK-01 bis UI-AK-20 mit Test und Prüffällen) und „Bitte bestätigen“; Screenshots nur mit Testdaten.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Dunkelmodus blitzt beim Laden hell auf | Farbschema auf dem Server aus Konto und Cookie setzen (`themeForRequest()`), nicht im Browser |
| Feste Farben in Komponenten | nur Tokens aus `src/app/globals.css` |
| Frühe Eingaben gehen verloren | Felder bis zur Interaktivität sperren (`use-hydrated.ts`); Browser-Tests warten darauf |
| Ablauf-Fall findet ein Element nicht | feste Merker nicht umbenennen oder weglassen; Liste in der Landkarte (Abschnitt M09) |
| Fokus verschwindet hinter der festen Leiste | Abstand/`scroll-margin` setzen; `tastatur_bis` meldet `verdeckt` |
| Dialog gibt den Fokus nicht zurück | Fokus beim Schließen an den auslösenden Knopf (M09-R21) |
| Waagerechtes Scrollen bei 375 px | Layout prüfen (`ansicht_lesen` meldet `waagerechtes_scrollen`), auch bei offenem Dialog |
| Reihenfolge unter „Zu erledigen“ falsch | abgelehnt zuerst, sonst älteste zuerst; nur im Browser prüfbar |
| Jede Serveraktion nur durch Ausblenden geschützt | Rolle und Besitz prüft die Aktion selbst (M02-R13) |

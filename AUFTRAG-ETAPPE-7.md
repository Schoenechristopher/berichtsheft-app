# Auftrag an die Entwickler-Sitzung: Etappe 7 – Feinschliff und Abnahme der Demo

Du bist Entwickler der Berichtsheft-App im Repository `schoenechristopher96-lgtm/berichtsheft-app`. Etappen 1–6 und der Zeitzonen-Fix (PR #1–#7) sind gemergt. Lies zuerst `CLAUDE.md`, `docs/01-spezifikation.md`, `docs/02-plan.md`, dann `playwright.config.ts`, `.github/workflows/`, `e2e/` und `README.md`. Lege diesen Auftrag (ab der Überschrift) als `AUFTRAG-ETAPPE-7.md` im Repository ab.

## Ziel

Etappe 7 aus dem Plan: Die Demo ist abnahmefertig. Alle Akzeptanzkriterien sind nachweisbar getestet, die App läuft in den geforderten Browsern und auf Smartphone-Breite, und der Auftraggeber kann die Demo mit einer Anleitung selbst vorführen. **Keine neuen Funktionen** – nur Prüfen, Absichern, Beheben und Dokumentieren.

## Umfang

1. **Browser-Matrix (AK-1101):** Playwright-Projekte für Chromium, Firefox und Microsoft Edge (Kanal `msedge`). In CI laufen alle drei gegen den Compose-Stack. In der Cloud-Sitzung ist nur Chromium vorinstalliert – Firefox und Edge nicht selbst installieren, sondern nur in CI prüfen und das im PR vermerken. Wenn die Laufzeit in CI zu lang wird: Chromium mit allen Tests, Firefox und Edge mit einer klar benannten Auswahl (mindestens alle Beispielszenarien und je ein Test pro AK-Bereich); begründe die Auswahl im PR.
2. **Smartphone-Breite (AK-1102):** Eigenes Playwright-Projekt mit 375 px Breite. Für jede Kernfunktion aus AK-1102 (erfassen, einreichen, zurückziehen, prüfen, kommentieren, exportieren, Einstellungen) und für die übrigen Seiten (Übersicht, Prüfliste, Nutzerverwaltung, Benachrichtigungen, Nicht zustellbar) prüft ein Test, dass sie bedienbar sind und **kein horizontales Scrollen** entsteht (z. B. `scrollWidth <= clientWidth`). Gefundene Darstellungsfehler beheben.
3. **Beispielszenarien:** Die drei Szenarien aus der Spezifikation als eigene, durchgehende Testdatei (`e2e/beispielszenarien.spec.ts`), Testnamen wörtlich wie die Szenarien. Sie laufen in allen Browser-Projekten.
4. **Nachweis der Testabdeckung:**
   - Ein Skript (`npm run ak:abdeckung`) liest alle AK-IDs aus `docs/01-spezifikation.md` und alle Testnamen (Vitest und Playwright) und meldet jede AK-ID ohne Test. In CI schlägt es fehl, wenn eine AK-ID ohne Test ist.
   - Es erzeugt `docs/03-testabdeckung.md`: Tabelle AK-ID → Kurztext → Testdateien/Testnamen → Ebene (Unit/DB/Browser). Die Datei wird im Repository mitgeführt und in CI auf Aktualität geprüft.
5. **Feinschliff:** Alle Abläufe einmal als Azubi, zugeordneter Ausbilder und Vertretung durchgehen (Desktop und 375 px) und kleine Mängel beheben: einheitliche deutsche Texte, Fehlermeldungen am Feld, leere Zustände (z. B. „Keine Berichte zur Prüfung“), Ladezustände, Fokus/Tastaturbedienung der Dialoge, Seitentitel. Liste im PR, was du gefunden und behoben hast. Größere Abweichungen von der Spezifikation nicht selbst ändern, sondern unter „Bitte bestätigen“ melden.
6. **Sicherheit, kurz:** `npm audit` ausführen; offene Meldungen der Stufe hoch/kritisch beheben oder im PR begründen. Prüfen, dass im Produktionsmodus kein Test-Login und kein Entwickler-Postfach erreichbar ist (Test dafür).
7. **Demo-Anleitung `docs/04-demo-anleitung.md`:** Für den Auftraggeber, ohne Vorwissen: Voraussetzungen, Start (`docker compose up --build`), Zurücksetzen (`docker compose down -v`), Testkonten, Adressen (App, Keycloak, Mailpit), dann ein Vorführ-Drehbuch von ca. 15 Minuten entlang der Beispielszenarien: Anna erfasst und reicht ein → Bernd lehnt mit Tageskommentar ab → Anna überarbeitet → Freigabe → PDF → Clara nimmt als Vertretung zurück → Benachrichtigungen in Glocke und Mailpit → Erinnerung per `npm run erinnerung` (mit Hinweis, wie die Uhr dafür gestellt wird) → Nutzerverwaltung mit Emil. Am Ende: bekannte Grenzen der Demo (Teams simuliert, Keycloak statt Entra ID, nur Testdaten) und Verweis auf „Übernahme in die Firmeninfrastruktur“ im Plan.
8. **README:** Status „Demo abnahmefertig“, Funktionsüberblick, Verweise auf Spezifikation, Plan, Testabdeckung und Demo-Anleitung.

## Fälle, zu denen du im PR einen Vorschlag zur Bestätigung machst

- Abweichungen von der Spezifikation, die dir beim Durchgehen auffallen.
- Die Auswahl der Tests für Firefox/Edge, falls nicht alle laufen.
- Alles Weitere, das Spezifikation und Plan nicht eindeutig regeln.

## Akzeptanzkriterien dieser Etappe

AK-1101 und AK-1102 vollständig; `npm run ak:abdeckung` meldet keine AK-ID ohne Test; alle Tests in allen Projekten grün in CI.

## Arbeitsweise

- Branch `etappe-7-abnahme`, Draft-PR gegen `main`. PR-Beschreibung wie bisher: Umfang, Tabelle AK → Test → Ebene (hier: Verweis auf `docs/03-testabdeckung.md`), Liste der behobenen Mängel, „Bitte bestätigen“, wie lokal starten.
- Vor jedem Push lokal Lint, Prettier, Typecheck und Tests grün. Danach den PR beobachten und CI-Fehler selbst beheben, bis alles grün ist.
- Bestätigte Auslegungen nach Bestätigung in `docs/01-spezifikation.md` bzw. `docs/02-plan.md` eintragen.
- Bei echten Unklarheiten: im PR fragen statt raten.

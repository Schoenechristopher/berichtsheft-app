# Auftrag an die Entwickler-Sitzung: Etappe 5 – PDF-Export

Du bist Entwickler der Berichtsheft-App im Repository `schoenechristopher96-lgtm/berichtsheft-app`. Etappen 1–4 (PR #1–#4) sind gemergt. Lies zuerst `CLAUDE.md`, `docs/01-spezifikation.md` (vor allem „PDF-Export“, AK-901–907, AK-204/AK-206, die bestätigten Auslegungen zu Wochen außerhalb der Ausbildung und zum Statusmodell), `docs/02-plan.md`, dann den bestehenden Code (vor allem `src/domain/report-access.ts`, `report-status.ts`, `report-history.ts`, `report-generation.ts` mit `classifyWeek`, `weeks.ts`, `src/lib/reports.ts`, die Berichtsseiten, `tests/`, `e2e/`). Lege diesen Auftrag (ab der Überschrift) als `AUFTRAG-ETAPPE-5.md` im Repository ab.

## Ziel

Etappe 5 aus dem Plan: Ein Wochenbericht und ein frei wählbarer Zeitraum lassen sich als PDF exportieren. Freigegebene Wochen tragen einen Freigabevermerk, nicht freigegebene sind unverwechselbar gekennzeichnet. Benachrichtigungen (Etappe 6) sind **nicht** Teil dieser Etappe.

## Umfang

1. **Technik laut Plan:** `@react-pdf/renderer`, serverseitig erzeugt. Eine Schrift mit vollständigen deutschen Zeichen (z. B. Noto Sans oder Inter, Lizenz OFL) liegt im Repository und wird eingebettet; zur Laufzeit wird nichts aus dem Internet geladen, auch nicht im Docker-Image.
2. **Aufbau des PDF als eigene, testbare Einheit** (Daten rein → Dokument raus), getrennt von Datenbank und Routen. Die Auswahl, was gedruckt wird (Status, Vermerk, Kennzeichnung), ist eine reine Funktion in `src/domain/`.
3. **Einzelwoche (AK-901):** Name des Azubis, Kalenderwoche, Zeitraum (Mo–Fr), je Tag Datum, Tagesart und Tätigkeiten, Status. Tage außerhalb der Ausbildung erkennbar gekennzeichnet. Kopf- oder Fußzeile mit Erstellungsdatum (aus dem Uhr-Modul) und Seitenzahl „Seite x von y“.
4. **Sammel-PDF (AK-902):** Zeitraum von–bis wählbar; alle Wochen des Zeitraums in zeitlicher Reihenfolge, jede Woche beginnt auf einer neuen Seite. Lange Wochen dürfen über mehrere Seiten laufen. Ausgeblendete Wochen (bestätigte Auslegung aus Etappe 3) erscheinen nicht.
5. **Freigabevermerk und Kennzeichnung (AK-903–905):** Freigegebene Wochen: Vermerk mit Name des freigebenden Ausbilders und Datum der (aktuell gültigen) Freigabe. Nicht freigegebene Wochen deutlich gekennzeichnet, z. B. „Nicht freigegeben – Status: Entwurf“. Das PDF wird bei jedem Aufruf neu erzeugt (kein Zwischenspeicher), damit nach einer Rücknahme kein Vermerk mehr erscheint.
6. **Zugriff (AK-906):** Azubi nur eigene Berichte, Ausbilder die aller Azubis, auch deaktivierter. Serverseitig über die vorhandenen Zugriffsfunktionen; fremde oder unbekannte IDs ergeben dieselben Antworten wie die Berichtsseite.
7. **Oberfläche:** „Als PDF herunterladen“ auf der Berichtsseite; Sammel-Export für den Azubi in seiner Übersicht und für Ausbilder in der Ansicht pro Azubi, jeweils mit Von/Bis-Auswahl (Vorbelegung z. B. Ausbildungsbeginn bis heute). Sprechender Dateiname, z. B. `Berichtsheft_Anna-Beispiel_KW40-2026.pdf` bzw. `…_2026-09-01_bis_2026-10-09.pdf`. Mobil bedienbar.
8. **Laufzeit:** Ein Sammel-PDF über eine ganze Ausbildung (rund 150 Wochen) muss in vertretbarer Zeit entstehen; miss es in einem Test und nenne die Zahl im PR.

## Fälle, zu denen du im PR einen Vorschlag zur Bestätigung machst

- Welche Wochen gehören zum Zeitraum (z. B. jede Woche, deren Mo–Fr den Zeitraum berührt)?
- Sollen Kommentare des Ausbilders bzw. der Verlauf ins PDF (Vorschlag: nein, nur der aktuelle Inhalt und der Vermerk)?
- Unterschriftszeilen ja/nein, oder gilt der elektronische Freigabevermerk als Nachweis?
- Alles Weitere, das Spezifikation und Plan nicht eindeutig regeln.

## Akzeptanzkriterien dieser Etappe

AK-901 bis AK-907 – jeweils mindestens ein Test, Name beginnt mit der AK-ID. Prüfe den Inhalt, indem du das erzeugte PDF in Vitest wieder ausliest (Text extrahieren), u. a.:

- AK-903/AK-905: Freigabe → Vermerk mit Name und Datum; nach Rücknahme → kein Vermerk.
- AK-907: Text mit Umlauten (ä ö ü Ä Ö Ü ß) und 5.000 Zeichen pro Tag erscheint vollständig.
- AK-902: Reihenfolge der Wochen und je Woche eine neue Seite.
- AK-906: Playwright-Download als Azubi (eigener ja, fremder nein) und als Ausbilder (auch deaktivierter Azubi).

## Arbeitsweise

- Branch `etappe-5-pdf-export`, Draft-PR gegen `main`. PR-Beschreibung wie bisher: Umfang, Tabelle AK → Test → Ebene, Doku-Änderungen, „Bitte bestätigen“, wie lokal starten. Hänge ein Beispiel-PDF (Seed-Daten) als Artefakt an den CI-Lauf oder beschreibe, wie man es lokal erzeugt.
- Vor jedem Push lokal Lint, Prettier, Typecheck und Tests grün. Danach den PR beobachten und CI-Fehler selbst beheben, bis alles grün ist.
- Bestätigte Auslegungen nach Bestätigung in `docs/01-spezifikation.md` bzw. `docs/02-plan.md` eintragen.
- Bei echten Unklarheiten: im PR fragen statt raten.

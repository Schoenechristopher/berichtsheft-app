# Auftrag an die Entwickler-Sitzung: Etappe 3 – Berichte erfassen

Du bist Entwickler der Berichtsheft-App im Repository `schoenechristopher96-lgtm/berichtsheft-app`. Etappe 1 (Grundgerüst, PR #1) und Etappe 2 (Nutzerverwaltung, PR #2) sind gemergt. Lies zuerst `CLAUDE.md`, `docs/01-spezifikation.md`, `docs/02-plan.md`, dann den bestehenden Code (vor allem `prisma/schema.prisma`, `src/domain/` mit `clock.ts`, `weeks.ts`, `report-access.ts`, `src/lib/reports.ts`, `src/lib/people/`, `src/worker/`, Seed, `tests/`, `e2e/`). Lege diesen Auftrag (ab der Überschrift) als `AUFTRAG-ETAPPE-3.md` im Repository ab.

## Ziel

Etappe 3 aus dem Plan: Wochenberichte entstehen automatisch, der Azubi erfasst pro Tag Tagesart und Tätigkeiten, Feiertage sind vorbelegt, Entwürfe lassen sich speichern, und die Übersicht zeigt alle Wochen mit Status. Einreichen und Prüfen sind **nicht** Teil dieser Etappe (Etappe 4).

## Umfang

1. **Wochen erzeugen (reine Funktion in `src/domain/`, dazu ein Service):**
   - Für jeden aktiven Azubi genau ein Bericht pro ISO-Woche vom Ausbildungsbeginn bis zur aktuellen Woche, höchstens bis zum Ausbildungsende (AK-301–AK-304). „Aktuelle Woche“ bestimmt sich nach Europe/Berlin über das Uhr-Modul.
   - Neue Berichte im Status „Entwurf“ mit fünf Tagen Mo–Fr. Tage vor Beginn bzw. nach Ende werden als „außerhalb der Ausbildung“ markiert (AK-305).
   - Gesetzliche Feiertage des eingestellten Bundeslands (feiertagejs) werden beim Anlegen als Tagesart „Feiertag“ vorbelegt (AK-404). Eine spätere Änderung des Bundeslands ändert bestehende Berichte nicht.
   - Idempotent und sicher bei gleichzeitigem Aufruf: Die Eindeutigkeit pro Azubi und Woche verhindert Doppelte; eine zweite Ausführung erzeugt nichts Neues.
   - Deaktivierte Azubis bekommen keine neuen Wochen (Teil von AK-205; nutze `listActiveTrainees` aus Etappe 2).
   - Auslöser: beim Öffnen der Übersicht des Azubis **und** täglich per pg-boss-Job im Worker (z. B. 00:05 Europe/Berlin).
   - **Nachträglich geänderter Ausbildungszeitraum** (AK-203): Fehlende Wochen werden ergänzt, die Markierung „außerhalb der Ausbildung“ in noch bearbeitbaren Berichten wird neu berechnet. Bestehende Berichte werden **nie automatisch gelöscht**. Reicht diese Regel in einem Fall nicht aus, im PR fragen.
2. **Bericht erfassen (Azubi):**
   - Bearbeitungsseite eines Berichts: Mo–Fr mit Datum, pro Tag Auswahl der Tagesart (genau die fünf Werte, AK-401/402) und Freitext „Tätigkeiten“; keine Felder für Stunden, Abteilung, Lernfeld (AK-403). Tage außerhalb der Ausbildung ausgegraut, ohne Pflicht.
   - Vorbelegte Tagesart änderbar (AK-405).
   - **Speichern:** ausdrücklicher „Speichern“-Knopf; beim Verlassen mit ungespeicherten Änderungen eine Warnung (AK-406, AK-408).
   - Texte unverändert speichern und anzeigen, inkl. Umlaute und Zeilenumbrüche; Obergrenze pro Tag mindestens 2.000 Zeichen (z. B. 5.000), mit Meldung am Feld bei Überschreitung (AK-407).
   - Bearbeiten nur durch den eigenen Azubi und nur in den Status „Entwurf“ und „Abgelehnt“; serverseitig über die vorhandenen Zugriffsfunktionen durchgesetzt. Ein deaktivierter Azubi kann nichts mehr ändern (AK-204).
3. **Übersicht (AK-306):** Der Azubi sieht alle seine Wochen, neueste zuerst, mit KW, Zeitraum und Status. Offene Wochen in der Vergangenheit („Entwurf“ oder „Abgelehnt“ vor der aktuellen Woche) sind deutlich hervorgehoben. Ausbilder sehen pro Azubi dieselbe Liste (nur lesend).
4. **Seed:** Der Beispielbericht KW 40/2026 bleibt als Inhalt erhalten, alle übrigen Wochen entstehen über die neue Erzeugung. Der Seed bleibt mehrfach ausführbar.
5. **Oberfläche:** Deutsch, mobil zuerst, bei 375 px ohne horizontales Scrollen bedienbar; Fehlermeldungen am Feld.

## Akzeptanzkriterien dieser Etappe

AK-301 bis AK-306, AK-401 bis AK-408 und der Teil von AK-205, der die Wochenerzeugung betrifft – jeweils mindestens ein Test, Name beginnt mit der AK-ID. Pflicht-Beispiele aus der Spezifikation als Tests:

- AK-301: Beginn 01.09.2026, Uhr auf 06.10.2026 → Berichte KW 36–41, keiner mehr.
- AK-404: Fr 25.12.2026 vorbelegt; Do 27.05.2027 (Fronleichnam) bei NW vorbelegt, bei NI nicht.
- AK-302: Uhr auf Montag der nächsten Woche stellen → neuer Bericht erscheint.

Zeit wird in allen Tests über das Uhr-Modul gesetzt, nie über die echte Uhrzeit.

## Arbeitsweise

- Branch `etappe-3-berichte-erfassen`, Draft-PR gegen `main`. PR-Beschreibung wie bei Etappe 1 und 2: Umfang, Tabelle AK → Test → Ebene, Doku-Änderungen, wie lokal starten.
- Vor jedem Push lokal Lint, Prettier, Typecheck und Tests grün. Danach den PR beobachten und CI-Fehler selbst beheben, bis alles grün ist.
- Wenn du Auslegungen triffst, die über Spezifikation und Plan hinausgehen: im PR unter „Bitte bestätigen“ auflisten und nach Bestätigung in `docs/01-spezifikation.md` bzw. `docs/02-plan.md` eintragen.
- Bei echten Unklarheiten: im PR fragen statt raten.

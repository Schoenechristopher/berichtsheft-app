# Fortschritt Spec-Architektur

Diese Datei schreibt nur die Steuerungsinstanz, jeweils nach dem Merge eines Pakets (`docs/06-spec-architektur.md`,
„Fortschrittsdatei“). Modelle stehen hier nur als Stufe (`docs/08-spec-modellwahl.md`, MW-R03).

## Übersicht

| Etappe | Paket | Stand | Datum | PR / Commit |
| --- | --- | --- | --- | --- |
| G1 Rahmen und Pilotmodul | Rahmen, `format.md`, Prüf-Runner TypeScript, M01 Kalender und Zeit | abgenommen, gemergt | 12.10.2026 | #16, Merge `b6d6220` (Inhalt `5e330f9`) |
| G2 Zerlegung Fachlogik | A: M02 Personen und Zugang, `ak:abdeckung` mit Ebene (E1), Nachträge G1 | abgenommen, gemergt | 12.10.2026 | #18, Merge `c6af82c` |
| G2 Zerlegung Fachlogik | B: M03 Wochenberichte entstehen, M04 Bericht erfassen, E4 (KW 53, „Feiertag (vorbelegt)“) | abgenommen, gemergt | 13.10.2026 | #19, Merge `ec70c70` |
| G2 Zerlegung Fachlogik | C: M05 Status und Prüfung, Daten-Runner | in Arbeit | – | – |
| G2 Zerlegung Fachlogik | D: M06 Historie, M07 PDF; E: M08 Benachrichtigungen, Abschluss G2 | offen (Welle 3) | – | – |

## G1 – Rahmen und Pilotmodul M01

### Modellwahl-Eintrag (MW-R10, KE-R18)

| Feld | Wert |
| --- | --- |
| Stufe und Denkaufwand je Anlauf | Anlauf 1: S3, Denkaufwand hoch (nur als Anweisung im Auftrag, siehe offene Punkte) |
| Grund | Neuheit hoch (erstes Format, erster Prüf-Runner), Schwierigkeit hoch (Zeitzonen, Jahreswechsel, Feiertagsrecht); MW-R05 „S3“ |
| Größenklasse und Budget | groß, 1 Sitzung, bis 2 Anläufe (nach Entscheidung von Chris nicht geteilt) |
| Anläufe | 1 |
| Beim ersten Anlauf abgenommen | ja |
| Ausweichen auf ein anderes Modell | keins gemeldet |
| Verbrauch der Entwicklersitzung | 99.306 Eingabe-, 112.768 Ausgabe-Token; 19.239.799 Token aus dem Zwischenspeicher gelesen, 260.358 geschrieben; 8,08 US-Dollar |
| Dauer | Start 13:34 UTC, Bericht 14:02 UTC (rund 30 Minuten bis zum Draft-PR) |
| CI-Läufe | 1 × schnelle Prüfung (Entwurf), 1 × volle Prüfung (bereit, alle Konfigurationen, rund 20 Minuten); beide grün beim ersten Mal |
| Rückfragen | keine blockierenden; 5 Punkte unter „Bitte bestätigen“ im PR, gebündelt an Chris weitergegeben |
| Erreichte Abbruchkriterien | keine |

### Abnahme durch die Steuerung

- Lokal nachgeprüft: Lint, Format, Typecheck, `npm test` (575 Tests), `ak:abdeckung -- --pruefen` (AK-404 und AK-1201
  bis AK-1206 mit 3 bis 11 Prüffällen), `pruefumfang -- --pruefen`, `landkarte` (4 erfasst, 32 noch nicht
  beschrieben), Browser-Tests Chromium und 375 px (88 bestanden, 2 übersprungen wie bisher).
- Gegenprobe des Runners mit eigenen Änderungen: falscher Erwartungswert, unbekannte Schnittstelle und Ebene `ablauf`
  ließen genau diese 3 Fälle scheitern; danach zurückgenommen.
- Fach-Spec M01 mit allen zehn Abschnitten.

### Offene Punkte

- [ ] `docs/01`, Kapitel 12: Die Stand-Zeile sagt noch „Entwurf zur Freigabe“. Mit dem Merge hat Chris den PR
      freigegeben; den Vermerk auf „freigegeben“ ändern (mit dem ersten PR von G2).
- [ ] Die Punkte aus „Bitte bestätigen“ (#16) mit dem Merge übernommen: Wortlaut AK-1201 bis AK-1206, `format.md` mit
      `uhrVorgeben` und optionaler `uhr` bei Fachlogik, Reformationstag vor 2018, BE 17.06.2028, Mariä Himmelfahrt
      in BY für das ganze Land. Nachziehen in G2: der Satz „Jeder Fall nennt seine Uhrzeit“ in `docs/06` und die
      Auslegung zu Mariä Himmelfahrt unter „Bestätigte Auslegungen“ in `specs/M01-kalender-und-zeit.md`.
- [ ] Die Datenbank-Regel für Kalenderwochen erlaubt KW 53 auch in Jahren mit 52 Wochen (G2, M03).
- [ ] `ReportView.tsx` zeigt „Feiertag (vorbelegt)“ nach dem aktuellen statt nach dem beim Anlegen gültigen
      Bundesland (G2, M04).
- [ ] Die Landkarten-Prüfung wird am Ende von G2 Pflicht in der CI (`docs/06`, offene Punkte).
- [ ] Denkaufwand je Entwicklersitzung lässt sich beim Start nicht einstellen; er steht nur als Anweisung im Auftrag
      (`docs/08`, offener Punkt bleibt offen).

### Rückblick (MW-R12, KE-R18)

| Kennzahl | G1 |
| --- | --- |
| KZ-1 Abnahme beim ersten Anlauf | 1 von 1 (100 %) |
| KZ-2 Rückfragen wegen unvollständigem Auftrag | 0 |
| KZ-3 Läufe der vollen Prüfung je PR | 1 |
| KZ-4 Pakete über Budget | 0 von 1 |
| KZ-5 Verbrauch je abgenommenem Paket | S3, groß: 8,08 US-Dollar (erster Richtwert) |

Vorschläge:

- Richtwerte in MW-R05 vorerst nicht ändern; ein Paket ist zu wenig für einen Schluss.
- KE-R14: erster Richtwert für „groß, S3“ rund 0,2 Mio. Ein- und Ausgabe-Token plus rund 19 Mio. Token aus dem
  Zwischenspeicher je Paket.
- Auftragsvorlage (G4): Die Liste der Aufrufer und möglichen Importzyklen gehörte in den Auftrag und hat Suchen gespart;
  so beibehalten.

## G2 – Zerlegung der Fachlogik

Plan „Etappe G2“, freigegeben von Chris am 12.10.2026 (E1 bis E5). Steuerung in einer eigenen Sitzung (E5). Stufen nach
`docs/08`: S1 Schnell, S2 Standard, S3 Stark, S4 Spitze; Zuordnung der Modelle nur im Chat (MW-R03).

### Welle 1 – Pakete A und B (parallel)

| Feld | A: M02 Personen und Zugang (#18) | B: M03 und M04 (#19) |
| --- | --- | --- |
| Stufe und Denkaufwand je Anlauf | Anlauf 1: S3, hoch (nur als Anweisung im Auftrag) | Anlauf 1: S3, mittel (nur als Anweisung im Auftrag) |
| Grund | Risiko hoch: Zugang und Sicherheit (MW-R05, M02 = S3) | Beschreibung bestehenden Codes, aber Migration und Klasse O; S3 bis MW-R11 greift |
| Größenklasse und Budget | mittel, 1 Sitzung, bis 2 Anläufe | mittel, 1 Sitzung, bis 2 Anläufe |
| Anläufe | 1 | 1 (dazu ein Abgleich mit `main` nach dem Merge von A, wie geplant) |
| Beim ersten Anlauf abgenommen | ja | ja |
| Ausweichen auf ein anderes Modell | keins gemeldet | keins gemeldet |
| Verbrauch der Entwicklersitzung | 647 Eingabe-, 106.730 Ausgabe-Token; 15.240.500 aus dem Zwischenspeicher gelesen, 268.466 geschrieben; 7,33 US-Dollar | 698 Eingabe-, 102.712 Ausgabe-Token; 22.308.926 aus dem Zwischenspeicher gelesen, 271.238 geschrieben; 8,69 US-Dollar |
| Dauer | Start 20:42 UTC, Draft-PR 21:04 UTC (rund 22 Minuten) | Start 20:42 UTC, Draft-PR 21:08 UTC (rund 26 Minuten); Abgleich mit `main` 21:53 bis 22:02 UTC |
| CI-Läufe | 1 × schnelle Prüfung (Entwurf, grün), 1 × volle Prüfung (bereit, Klasse L, grün) | 2 × schnelle Prüfung (vor dem Abgleich rot wie erwartet: `ak:abdeckung` ohne E1-Erweiterung; danach grün), 1 × volle Prüfung (bereit, Klasse O, alle Browser, grün) |
| Rückfragen | keine blockierenden; 6 Punkte „Bitte bestätigen“, von Chris bestätigt | keine blockierenden; 6 Punkte „Bitte bestätigen“, von Chris bestätigt (u. a. Schemaänderung für E4 b) |
| Erreichte Abbruchkriterien | keine | keine |

**Abnahme durch die Steuerung (beide Pakete):** Diff gelesen; lokal Lint, Format, Typecheck, `npm test` (A: 664, B nach
Abgleich: 725 Tests), `ak:abdeckung -- --pruefen`, `pruefumfang -- --pruefen`, `landkarte`, Browser Chromium und 375 px
(A: 88, B: 89 bestanden, je 2 übersprungen wie bisher). Gegenprobe mit eigenen, danach zurückgenommenen Änderungen:
falscher Erwartungswert, unbekannte Schnittstelle und Ebene `ablauf` ließen genau diese Fälle scheitern; in
`ak:abdeckung` scheiterten eine unmarkierte AK ohne Prüffall und ein unbekannter Ebenenwert.

**Ergebnis Welle 1:** M01 bis M04 beschrieben; 189 Prüffälle; Ebene „Ablauf, G3“ (Prüffall folgt in G3): AK-101,
AK-106, AK-205, AK-403, AK-408. Landkarte: 17 Dateien erfasst, 19 noch nicht beschrieben.

**Offene Punkte aus Welle 1:**

- [ ] `src/lib/request-path.ts` und `src/lib/seed-data.ts` gehören keinem Modul (→ Paket E, „Querschnitt“);
      `src/domain/week-progress.ts` gehört nach Einschätzung von B zu M09 (→ Paket E, Querschnitt oder M09 vermerken).
- [ ] `safeReturnPath()` und `src/proxy.ts` gehören fachlich zu M08 (AK-1003); `labels.ts` und `updateOwnTheme()` zu M09.
- [ ] `specs/00-uebersicht.md`: Satz „Stand G1: beschrieben ist nur M01“ am Ende von G2 anpassen (Paket E).
- [ ] AK-205: Die Hälfte „keine Erinnerung“ lässt sich in M08 als Prüffall der Fachlogik belegen (Paket E).
- [ ] `reminder_run.iso_week` ohne Prüfung der Wochennummer (M08, Paket E prüfen).

**Fallen für spätere Aufträge:**

- Regelfunktionen liefern oft nur Meldungstexte; neutrale Fehlercodes brauchen einen festen Grund in der Domäne
  (Muster `RuleReason` in `src/domain/people.ts`).
- E4 b) war nur mit einer Schemaänderung lösbar; so etwas gehört vorab in den Auftrag.
- Nach einer Schemaänderung braucht auch die Steuerung für ihre Abnahme `npx prisma generate`, sonst scheitert der
  Typecheck.
- Die Plattform abonniert eine Entwicklersitzung automatisch auf ihren eigenen PR; sie beendet das Abo wieder, damit die
  Ereignisse bei der Steuerung ankommen.
- `src/lib/auth/**` ist geschützt, auch die Tests darin; Testnamen dort bleiben vorerst ohne AK-ID.

## Übergabe an die Steuerung von G2

- **Stand:** G1 ist gemergt (#16). Auf `main` liegen `specs/00-uebersicht.md`, `specs/vorlage-fach-spec.md`,
  `specs/M01-kalender-und-zeit.md`, `specs/code-landkarte.md` (nur M01), `specs/pruefung/{format.md,testdaten.json,M01.json}`,
  der Runner `tests/pruefung/` sowie `npm run ak:abdeckung` mit Prüffällen und `npm run landkarte`.
- **Nächstes:** G2 – Fach-Specs, Landkarte und Prüffälle für M02 bis M08 (`docs/06`, Etappen). Erst die offenen Punkte
  oben einplanen: Stand-Zeile in `docs/01`, Satz zur Uhr in `docs/06`, Auslegung Mariä Himmelfahrt in M01.
- **Schnitt:** M02 hat keine Abhängigkeit und kann parallel zu M03 laufen; M03 setzt auf M01 und M02 auf. Zwei
  Sitzungen dürfen nie dieselben Dateien ändern (KE-R05). Gemeinsame Dateien (`docs/03-testabdeckung.md`,
  `specs/code-landkarte.md`, `specs/00-uebersicht.md`) erzeugen Konflikte; die Reihenfolge der Merges vorgeben oder
  diese Dateien nur in einem Paket ändern.
- **Stufe:** Nach MW-R05 starten M02 und M05 (und M06) auf S3; M03, M04, M07 und M08 sind Beschreibung bestehenden
  Codes und können auf S3 bleiben, bis drei Pakete in Folge beim ersten Anlauf abgenommen sind (MW-R11).
- **Fallen aus G1:**
  - `ak:abdeckung` meldet jede AK eines beschriebenen Moduls ohne Prüffall; ein neues `specs/Mxx-*.md` macht das Modul
    sofort prüfpflichtig.
  - `"id"` nur auf Prüffall-Ebene (`prueffallIds()` liest per Regex).
  - Der Runner kennt nur die Ebene `fachlogik`; Ablauf-Fälle lassen ihn scheitern, bis G3 einen Runner baut.
  - Seiten-Importe machen einen PR zur Klasse O; dann laufen alle Browser in der vollen Prüfung.
- **Werkzeuge der Steuerung:** Bericht der Entwicklersitzung per Nachricht; PR-Abo; Verbrauch über die Sitzungsdaten
  (`usage`) der Entwicklersitzung.

# Fortschritt Spec-Architektur

Diese Datei schreibt nur die Steuerungsinstanz, jeweils nach dem Merge eines Pakets (`docs/06-spec-architektur.md`,
„Fortschrittsdatei“). Modelle stehen hier nur als Stufe (`docs/08-spec-modellwahl.md`, MW-R03).

## Übersicht

| Etappe | Paket | Stand | Datum | PR / Commit |
| --- | --- | --- | --- | --- |
| G1 Rahmen und Pilotmodul | Rahmen, `format.md`, Prüf-Runner TypeScript, M01 Kalender und Zeit | abgenommen, gemergt | 12.10.2026 | #16, Merge `b6d6220` (Inhalt `5e330f9`) |
| G2 Zerlegung Fachlogik | M02 bis M08 | offen | – | – |

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

# Fortschritt Spec-Architektur

Diese Datei schreibt nur die Steuerungsinstanz, jeweils nach dem Merge eines Pakets (`docs/06-spec-architektur.md`,
„Fortschrittsdatei“). Modelle stehen hier nur als Stufe (`docs/08-spec-modellwahl.md`, MW-R03).

## Übersicht

| Etappe | Paket | Stand | Datum | PR / Commit |
| --- | --- | --- | --- | --- |
| G1 Rahmen und Pilotmodul | Rahmen, `format.md`, Prüf-Runner TypeScript, M01 Kalender und Zeit | abgenommen, gemergt | 12.10.2026 | #16, Merge `b6d6220` (Inhalt `5e330f9`) |
| G2 Zerlegung Fachlogik | A: M02 Personen und Zugang, `ak:abdeckung` mit Ebene (E1), Nachträge G1 | abgenommen, gemergt | 12.10.2026 | #18, Merge `c6af82c` |
| G2 Zerlegung Fachlogik | B: M03 Wochenberichte entstehen, M04 Bericht erfassen, E4 (KW 53, „Feiertag (vorbelegt)“) | abgenommen, gemergt | 13.10.2026 | #19, Merge `ec70c70` |
| G2 Zerlegung Fachlogik | C: M05 Status und Prüfung, Daten-Runner | abgenommen, gemergt | 13.10.2026 | #21, Merge `8eb4bc7` |
| G2 Zerlegung Fachlogik | D: M06 Historie, M07 PDF-Export | abgenommen, gemergt | 13.10.2026 | #23, Merge `13c22fe` |
| G2 Zerlegung Fachlogik | E: M08 Benachrichtigungen und Erinnerung, Abschluss G2 | abgenommen, gemergt | 13.10.2026 | #22, Merge `1b1f4e7` |
| G3 Oberfläche und Abläufe | Welle 1: H Nachträge G2, G M09 beschreiben, F Ablauf-Runner | in Arbeit | 13.10.2026 | – |
| G3 Oberfläche und Abläufe | Welle 2: I Ablauf-Fälle M09, J Q, Szenarien, Abschluss | geplant | – | – |
| A Automatisches Mergen | Welle 1: A1 AM-AK in `ak:abdeckung` | abgenommen, gemergt | 13.10.2026 | #30, Merge `e5e0adc` |
| A Automatisches Mergen | Welle 2: A2 CI-37 (nach #28, I, J), A3 Ablauf-Kriterien an Test-PRs (nach E1, E3) | geplant | – | – |

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

- [x] `docs/01`, Kapitel 12: Die Stand-Zeile sagt noch „Entwurf zur Freigabe“. Mit dem Merge hat Chris den PR
      freigegeben; den Vermerk auf „freigegeben“ ändern (mit dem ersten PR von G2).
- [x] Die Punkte aus „Bitte bestätigen“ (#16) mit dem Merge übernommen: Wortlaut AK-1201 bis AK-1206, `format.md` mit
      `uhrVorgeben` und optionaler `uhr` bei Fachlogik, Reformationstag vor 2018, BE 17.06.2028, Mariä Himmelfahrt
      in BY für das ganze Land. Nachziehen in G2: der Satz „Jeder Fall nennt seine Uhrzeit“ in `docs/06` und die
      Auslegung zu Mariä Himmelfahrt unter „Bestätigte Auslegungen“ in `specs/M01-kalender-und-zeit.md`.
- [x] Die Datenbank-Regel für Kalenderwochen erlaubt KW 53 auch in Jahren mit 52 Wochen (G2, M03).
- [x] `ReportView.tsx` zeigt „Feiertag (vorbelegt)“ nach dem aktuellen statt nach dem beim Anlegen gültigen
      Bundesland (G2, M04).
- [x] Die Landkarten-Prüfung wird am Ende von G2 Pflicht in der CI (`docs/06`, offene Punkte).
- [ ] Denkaufwand je Entwicklersitzung lässt sich beim Start nicht einstellen; er steht nur als Anweisung im Auftrag
      (`docs/08`, offener Punkt bleibt offen).

Stand 13.10.2026: Die ersten fünf Punkte sind in G2 erledigt (#18: Stand-Zeile, Satz zur Uhr, Mariä Himmelfahrt; #19:
KW 53 und „Feiertag (vorbelegt)“; #22: Landkarten-Prüfung in der CI). Der Denkaufwand bleibt offen.

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

- [x] `src/lib/request-path.ts` und `src/lib/seed-data.ts` gehören keinem Modul (→ Paket E, „Querschnitt“);
      `src/domain/week-progress.ts` gehört nach Einschätzung von B zu M09 (→ Paket E, Querschnitt oder M09 vermerken).
- [x] `safeReturnPath()` und `src/proxy.ts` gehören fachlich zu M08 (AK-1003); `labels.ts` und `updateOwnTheme()` zu M09.
- [x] `specs/00-uebersicht.md`: Satz „Stand G1: beschrieben ist nur M01“ am Ende von G2 anpassen (Paket E).
- [x] AK-205: Die Hälfte „keine Erinnerung“ lässt sich in M08 als Prüffall der Fachlogik belegen (Paket E).
- [x] `reminder_run.iso_week` ohne Prüfung der Wochennummer (M08, Paket E prüfen).

**Fallen für spätere Aufträge:**

- Regelfunktionen liefern oft nur Meldungstexte; neutrale Fehlercodes brauchen einen festen Grund in der Domäne
  (Muster `RuleReason` in `src/domain/people.ts`).
- E4 b) war nur mit einer Schemaänderung lösbar; so etwas gehört vorab in den Auftrag.
- Nach einer Schemaänderung braucht auch die Steuerung für ihre Abnahme `npx prisma generate`, sonst scheitert der
  Typecheck.
- Die Plattform abonniert eine Entwicklersitzung automatisch auf ihren eigenen PR; sie beendet das Abo wieder, damit die
  Ereignisse bei der Steuerung ankommen.
- `src/lib/auth/**` ist geschützt, auch die Tests darin; Testnamen dort bleiben vorerst ohne AK-ID.

### Welle 2 – Paket C (allein)

| Feld | C: M05 Status und Prüfung + Daten-Runner (#21) |
| --- | --- |
| Stufe und Denkaufwand je Anlauf | Anlauf 1: S3, hoch (nur als Anweisung im Auftrag) |
| Grund | Schwierigkeit hoch: Transaktion, Gleichzeitigkeit, neuer Runner (MW-R05, M05 = S3) |
| Größenklasse und Budget | groß, 1 Sitzung, bis 2 Anläufe (Richtwert 10 bis 15 US-Dollar) |
| Anläufe | 1 (dazu eine kleine Nacharbeit auf Bitte der Steuerung: eigener Grund „nicht gefunden“, verrutschter Kommentar) |
| Beim ersten Anlauf abgenommen | ja |
| Ausweichen auf ein anderes Modell | keins gemeldet |
| Verbrauch der Entwicklersitzung | 1.196 Eingabe-, 145.245 Ausgabe-Token; 24.544.720 aus dem Zwischenspeicher gelesen, 334.572 geschrieben; 10,50 US-Dollar |
| Dauer | Start 04:42 UTC, Runner lokal grün 04:58 UTC, Draft-PR 05:11 UTC (rund 29 Minuten); Nacharbeit 05:14 UTC |
| CI-Läufe | 2 × schnelle Prüfung (grün), 1 × volle Prüfung (Klasse I wegen `vitest.config.ts`, alle Konfigurationen, grün) |
| Rückfragen | keine blockierenden; 7 Punkte „Bitte bestätigen“, von Chris bestätigt |
| Erreichte Abbruchkriterien | keine |

**Ergebnis:** Daten-Runner `tests/pruefung/daten.test.ts` (Vitest-Projekt `db`) mit Daten-Adapter; Format eines
Daten-Falls in `specs/pruefung/format.md`; Gleichzeitigkeit (AK-508) deterministisch über „gesehen = Schrittnummer“, echte
Parallelität bleibt im DB-Test. M05 mit 95 Prüffällen (59 Fachlogik, 36 Daten); feste Gründe (`TransitionReason`) statt
Meldungstexte.

### Welle 3 – Pakete D und E (parallel)

| Feld | D: M06 Historie, M07 PDF-Export (#23) | E: M08 Benachrichtigungen, Abschluss G2 (#22) |
| --- | --- | --- |
| Stufe und Denkaufwand je Anlauf | Anlauf 1: S3, hoch (nur als Anweisung) | Anlauf 1: S3, mittel (nur als Anweisung) |
| Grund | Risiko hoch: Historie unveränderlich (MW-R05, M06 = S3) | S2 wäre nach MW-R11 erlaubt gewesen; S3 wegen Abschluss G2 (CI-Pflicht, alle Dateien erfasst); Chris hat nicht widersprochen |
| Größenklasse und Budget | mittel, 1 Sitzung, bis 2 Anläufe | mittel, 1 Sitzung, bis 2 Anläufe |
| Anläufe | 1 | 1 (dazu ein Abgleich mit `main` nach dem Merge von D, wie geplant) |
| Beim ersten Anlauf abgenommen | ja | ja |
| Ausweichen auf ein anderes Modell | keins gemeldet | keins gemeldet |
| Verbrauch der Entwicklersitzung | 670 Eingabe-, 128.743 Ausgabe-Token; 20.581.040 aus dem Zwischenspeicher gelesen, 319.589 geschrieben; 9,25 US-Dollar | 1.198 Eingabe-, 136.048 Ausgabe-Token; 26.910.331 aus dem Zwischenspeicher gelesen, 374.562 geschrieben; 11,10 US-Dollar |
| Dauer | Start 05:55 UTC, Draft-PR 06:23 UTC (rund 28 Minuten) | Start 05:55 UTC, Draft-PR 06:23 UTC (rund 28 Minuten); Abgleich 06:45 bis 06:55 UTC |
| CI-Läufe | 1 × schnelle Prüfung (grün), 1 × volle Prüfung (Klasse L, grün) | 2 × schnelle Prüfung (vor dem Abgleich rot wie erwartet: Landkarte ohne die Dateien von D; danach grün), 1 × volle Prüfung (Klasse I und O, alle Konfigurationen, grün) |
| Rückfragen | keine blockierenden; 6 Punkte „Bitte bestätigen“, von Chris bestätigt (u. a. Migration mit festem Fehlercode `BH803`) | keine blockierenden; 7 Punkte „Bitte bestätigen“, von Chris bestätigt |
| Erreichte Abbruchkriterien | keine | keine |

**Ergebnis Welle 3:** M06 und M07 mit 41 Prüffällen (Unveränderlichkeit der Historie, AK-803, als Daten-Fall; PDF über
Inhaltsmerkmale). M08 mit 80 Prüffällen (Outbox und „genau einmal“ als Daten-Fälle, Montag 9:00 Uhr mit gestellter
Uhr); AK-205 jetzt mit Daten-Fall. `npm run landkarte -- --pruefen` ist Pflicht in der schnellen Prüfung; alle 37 Dateien
unter `src/domain/` und `src/lib/` sind erfasst (Abschnitt „Querschnitt“ für Dateien ohne Fachlogik).

**Abnahme durch die Steuerung (C, D, E):** Diff gelesen (Migration von D Zeile für Zeile gegen die bisherigen
Trigger-Funktionen geprüft: nur der Fehlercode ist neu); lokal Lint, Format, Typecheck, `npm test` (C: 822, D: 864,
E nach Abgleich: 946 Tests), `ak:abdeckung -- --pruefen`, `pruefumfang -- --pruefen`, `landkarte` (bei E mit
`--pruefen`), Browser Chromium und 375 px (je 89 bestanden, 2 übersprungen wie bisher). Gegenprobe beider Runner mit
eigenen, danach zurückgenommenen Änderungen: falscher Erwartungswert und unbekannte Schnittstelle bzw. Aktion scheitern
genau einzeln, ein Fall der Ebene `ablauf` scheitert; bei E zusätzlich eine nicht erfasste Datei unter `src/lib/`, die
`landkarte -- --pruefen` scheitern lässt.

### Ergebnis G2

- M01 bis M08 beschrieben, Modultabelle in `docs/06` mit endgültiger AK-Zuordnung, `specs/00-uebersicht.md` auf Stand G2.
- 407 Prüffälle (Fachlogik und Daten), alle grün; Runner für `fachlogik` und `daten`.
- Ebene „Ablauf, G3“ (Prüffall folgt in G3): AK-101, AK-106, AK-403, AK-408.
- Code-Landkarte vollständig (37 Dateien), Prüfung Pflicht in der CI.
- Soll-Korrekturen: KW 53 nur in Jahren mit 53 Wochen (Migration), „Feiertag (vorbelegt)“ nach dem beim Anlegen
  gültigen Bundesland (Merker je Tag, Migration), feste Fehlercodes der Historie (Migration), feste Gründe statt
  Meldungstexte in Personen, Status, Speichern, PDF-Zeitraum und Benachrichtigungen.

### Offene Punkte nach G2

- [ ] Denkaufwand je Entwicklersitzung lässt sich beim Start nicht einstellen (`docs/08`, offen).
- [ ] Ablauf-Prüffälle für AK-101, AK-106, AK-403, AK-408 (G3); danach `DEFERRED_CASES_REQUIRED` in
      `scripts/ak-abdeckung/coverage.ts` umlegen.
- [ ] Erinnerungsläufe: Prüfung der Wochennummer (KW 1 bis 53) als spätere Migration (von Chris bestätigt, nicht in G2).
- [ ] Kaskade beim endgültigen Löschen einer Person (M06-R10) ohne neutralen Fall; Vorschlag G3 (M06, Abschnitt 10).
- [ ] Echte Gleichzeitigkeit (AK-508) und der Schutz der Datenhaltung an der Fachlogik vorbei (AK-505) nur in DB-Tests;
      in den Profilen (G4) je Plattform als eigener Nachweis vorsehen.
- [ ] Kleinigkeiten: `hasContent` doppelt in `src/lib/reports.ts` und `src/lib/notifications/service.ts`; veralteter
      Kommentar am `eventKey` im Schema; Tests in `src/lib/auth/config.test.ts` ohne AK-ID (geschützter Pfad).
- [ ] M09: `src/domain/week-progress.ts`, `src/lib/people/labels.ts`, `updateOwnTheme()` in G3 beschreiben (stehen bis
      dahin im Querschnitt bzw. bei M02).

### Rückblick G2 (MW-R12, KE-R18)

| Kennzahl | G2 |
| --- | --- |
| KZ-1 Abnahme beim ersten Anlauf | 5 von 5 (100 %) |
| KZ-2 Rückfragen wegen unvollständigem Auftrag | 0 (eine Lücke ohne Rückfrage: E4 b brauchte eine Schemaänderung, die der Auftrag nicht vorsah) |
| KZ-3 Läufe der vollen Prüfung je PR | 1 je Paket-PR (5 PRs); Doku-PRs nur schnelle Prüfung |
| KZ-4 Pakete über Budget | 0 von 5 |
| KZ-5 Verbrauch je abgenommenem Paket | S3 mittel: 7,33 / 8,69 / 9,25 / 11,10 US-Dollar (Mittel 9,09); S3 groß: 10,50 US-Dollar |
| Steuerung | rund 31 US-Dollar statt geschätzt 5 US-Dollar (siehe unten) |
| Eskalationen je Stufe | keine |

Summe G2: Entwicklersitzungen 46,87 US-Dollar, Steuerung rund 31 US-Dollar; 5 volle CI-Läufe.

**Vorschläge (von Chris angenommen am 13.10.2026; umgesetzt in `docs/08`, MW-R11, und `docs/09`, KE-R03, KE-R14, KE-S02):**

- **MW-R05:** Fünf S3-Pakete in Folge (dazu G1) beim ersten Anlauf abgenommen. Für Beschreibungs-Pakete bestehenden
  Codes (Art wie M03, M04, M07, M08) in G3 einen Versuch auf S2 nach MW-R11; scheitert er, bleibt S3.
- **KE-R14, Richtwerte in Token:** S3 mittel rund 0,1 bis 0,14 Mio. Ausgabe-Token und 15 bis 27 Mio. Token aus dem
  Zwischenspeicher (7 bis 11 US-Dollar); S3 groß rund 0,15 Mio. Ausgabe- und 25 Mio. Zwischenspeicher-Token (rund
  10,50 US-Dollar).
- **Steuerung (größter Kostenblock):** Die eine Steuerungssitzung lief über drei Wellen und rund elf Stunden; ihr Kontext
  wuchs auf rund 0,6 Mio. Token, und jede Benachrichtigung (PR-Ereignis, Bericht, Check-in) verarbeitet ihn erneut. Dazu
  kamen die eigenen Abnahmeläufe. Vorschlag: KE-R03 enger fassen – nach jeder Welle Übergabe und frische
  Steuerungssitzung; lokale Abnahmeläufe (Prüfbefehle, Gegenprobe, Browser) an einen Hilfsagenten der Stufe S1 geben,
  der nur das Ergebnis meldet; PR-Abos erst setzen, wenn die Abnahme beginnt (weniger Zwischenereignisse).
- **Auftragsvorlage (G4):** Der Block „Gemeinsame Regeln für alle Pakete“ hat sich bewährt (KZ-2 = 0) und gehört in
  `playbooks/vorlage-arbeitspaket.md`. Ergänzen: „feste Gründe statt Meldungstexte“ von Anfang an; mögliche
  Schemaänderungen im Auftrag benennen; Hinweis, dass die Plattform die Entwicklersitzung automatisch auf ihren PR
  abonniert.

## G3 – Oberfläche und Abläufe

Plan „Etappe G3“, freigegeben von Chris am 13.10.2026 mit den Entscheidungen E1 bis E8 wie vorgeschlagen. Gleichzeitig
freigegeben: `docs/06` bis `docs/09` (Status „freigegeben“) und die Vorschläge aus dem Rückblick G2. Steuerung je Welle in
einer frischen Sitzung (E8, KE-R03).

**Entscheidungen:**

- **E1 Testschnittstelle:** Uhr stellen und Testdaten zurücksetzen nur bei `NODE_ENV !== 'production'` und aktivem
  Test-Login, im Produktions-Build per Test abgesichert. Auslegung aus Paket F, von Chris bestätigt am 13.10.2026: In CI
  läuft der Ablauf-Runner gegen einen zusätzlichen Entwicklungs-Server auf Port 3100 mit Test-Login und der
  Compose-Datenbank; die übrigen Browser-Tests laufen unverändert gegen den Produktions-Build.
- **E2** Ablauf-Ergebnisse über unsichtbare feste Merker (Fehlercode, Status), Texte nur im Kern.
- **E3** Alle UI-AK als Ablauf-Fälle mit kleinem festem Prüfvokabular (Variante A).
- **E4** Code-Landkarte auch für `src/app/**` und `src/components/**`, Prüfung Pflicht.
- **E5** Paket H (Nachträge G2) in G3; die Tests in `src/lib/auth/config.test.ts` bleiben ohne AK-ID.
- **E6** CI-37 (Prüfung nach Modul) auf Etappe A verschoben; Paket J passt den Satz in `docs/ci-richtlinie.md` an.
- **E7** S2-Versuche für H und G (MW-R11).
- **E8** Frische Steuerung je Welle.

| Welle | Paket | Inhalt | Stufe | Größe, Richtwert | Klasse |
| --- | --- | --- | --- | --- | --- |
| 1 | H | Migration Wochennummer `reminder_run`, `hasContent` einmal, Kommentar `eventKey`, Daten-Fall Kaskade (M06-R10) | S2 mittel | klein, 3–5 US-Dollar | L |
| 1 | G | `specs/M09-oberflaeche.md`, Fachlogik-Fälle M09, Landkarte für `src/app` und `src/components` | S2 mittel | mittel, 5–7 US-Dollar | L |
| 1 | F | Ablauf-Runner, Testschnittstelle, Merker, Fälle AK-101, 106, 403, 408 | S3 hoch | groß, 10–15 US-Dollar | O |
| 2 | I | Ablauf-Fälle aller UI-AK, Prüfvokabular im Adapter | S3 mittel | mittel, 8–12 US-Dollar | O |
| 2 | J | Q-Spec, Beispielszenarien, `DEFERRED_CASES_REQUIRED = true`, `CLAUDE.md` „Fach-Specs maßgeblich“, CI-37-Satz | S3 mittel | mittel, 8–12 US-Dollar | O |

Merge-Reihenfolge: Welle 1 H → G → F, Welle 2 I → J; der spätere PR gleicht per Merge mit `main` ab. Steuerung je Welle
höchstens 7 US-Dollar. Fertig G3: alle AK und UI-AK mit Prüffall, `DEFERRED_CASES_REQUIRED = true`, alle Prüfungen
grün, Ablauf-Fälle in allen Browsern grün, `CLAUDE.md` angepasst, Rückblick und Übergabe.

### Welle 1 – Pakete H, G und F (parallel)

Gestartet am 13.10.2026 um 07:43 UTC. Einträge nach MW-R10 folgen nach der Abnahme.

## A – Automatisches Mergen

Plan „Etappe A“, freigegeben von Chris am 13.10.2026 mit E2 bis E7 wie vorgeschlagen; E1 offen. Grundlage:
`docs/07-spec-automatisches-mergen.md`, Einführung Schritt 4 und 5. Stufen nach `docs/08` (MW-R03).

**Stand Schritt 3 (lesend geprüft am 13.10.2026):** Über die REST-API ist für `main` kein Regelsatz sichtbar, der Branch ist
nicht geschützt, es gab noch keinen Lauf bei `merge_group`; „Allow auto-merge“ ist an, Merge-Commits sind erlaubt.

**Entscheidungen:**

- **E1 (offen):** Chris prüft, ob Regelsatz und Merge-Warteschlange für `main` aktiv sind. A3 wartet darauf.
- **E2** Schattenbetrieb (AM-R14) an Paket-PRs ab G3 Welle 2 und in G4: Die jeweilige Etappen-Steuerung schreibt nach
  ihrer Abnahme den Abnahme-Kommentar, setzt das Label `automerge` und trägt das Ergebnis in die Tabelle unten ein. Nicht
  an Doku-PRs. Automatisches Mergen bleibt aus.
- **E3** Test-Basis `am-test/main`: Chris legt sie an bzw. nimmt `am-test/**` in den Regelsatz auf. Die Steuerung A darf
  dort pushen, `aktiv: true` nur dort, Label und automatisches Mergen nur an Test-PRs; danach aufräumen.
- **E4** „Ergebnis am PR“ (AM-AK-14) ist der Check „Merge-Kriterien“ mit seiner Zusammenfassung; den Kommentar nach dem
  Merge (AM-AK-13) schreibt die Steuerung (AM-S04). Der Workflow bekommt kein Schreibrecht (CI-27).
- **E5** CI-37 wählt nur die Ablauf-Fälle (Browser) nach Modul aus; Fachlogik- und Daten-Fälle laufen weiter vollständig.
- **E6** Etappen-PRs laufen über die Warteschlange, sobald sie aktiv ist.
- **E7** AM-S04 (`playbooks/00-steuerung.md`) und die Liferay-Teile von AM-R04 folgen in G4/P00, nicht in A.

| Welle | Paket | Inhalt | Stufe | Größe, Richtwert | Klasse |
| --- | --- | --- | --- | --- | --- |
| 1 | A1 | AM-AK-01 bis AM-AK-14 in `ak:abdeckung`, `testsJeAk` für AM-AK-IDs | S2 mittel | klein, 3–5 US-Dollar | L |
| 2 | A2 | CI-37: Auswahl der Ablauf-Fälle nach Modul (Datei → Modul aus der Landkarte, Modulgraph als Datei) | S3 hoch | mittel, 7–11 US-Dollar | I |
| 2 | A3 | AM-AK-11 bis AM-AK-14 an Test-PRs gegen `am-test/main` bzw. `main` (nur AK-14), durch die Steuerung | Steuerung S3 | rund 3 US-Dollar | – |

Merge-Reihenfolge: A1 vor G3-I (gemeinsam: `docs/03`, `scripts/ak-abdeckung/coverage.ts`); `.github/**` und
`docs/ci-richtlinie.md`: #28 (F) → I → J → A2. Der spätere PR gleicht per Merge mit `main` ab. Steuerung je Welle
höchstens 7 US-Dollar. Fertig A: A1 bis A3 gemergt bzw. belegt, 10 Paket-PRs im Schattenbetrieb ohne Widerspruch (oder
Entscheidung von Chris), Rückblick und Übergabe. Danach setzt Chris `aktiv: true` und nimmt „Merge-Kriterien“ als
Pflicht-Check in den Regelsatz auf.

### Schattenbetrieb (AM-R14)

Je Paket-PR eine Zeile, eingetragen von der Steuerung, die ihn abnimmt. „Kriterien“ ist das Ergebnis des Checks
„Merge-Kriterien“ ohne den Grund „Schalter aus“ (AM-R12): Hätten die Kriterien den PR freigegeben? „Widerspruch“ heißt:
Kriterien und Entscheidung von Chris weichen voneinander ab.

| Nr. | PR | Etappe, Paket | Abnahme-Commit | Kriterien (ohne Schalter) | Gründe | Entscheidung Chris | Widerspruch |
| --- | --- | --- | --- | --- | --- | --- | --- |

### Welle 1 – Paket A1

| Feld | A1: AM-AK in `ak:abdeckung` (#30) |
| --- | --- |
| Stufe und Denkaufwand je Anlauf | Anlauf 1: S2, mittel (nur als Anweisung im Auftrag) |
| Grund | Erweiterung eines bestehenden Skripts, vollständig per Unit-Test prüfbar; Neuheit, Schwierigkeit und Risiko niedrig bis mittel (MW-R05 „S2“) |
| Größenklasse und Budget | klein, 1 Sitzung, 1 Anlauf (Richtwert 3–5 US-Dollar) |
| Anläufe | 1 |
| Beim ersten Anlauf abgenommen | ja |
| Ausweichen auf ein anderes Modell | keins gemeldet |
| Verbrauch der Entwicklersitzung | 38 Eingabe-, 13.599 Ausgabe-Token; 1.773.050 aus dem Zwischenspeicher gelesen, 62.932 geschrieben; 0,57 US-Dollar |
| Dauer | Start 10:13 UTC, Draft-PR 10:18 UTC (rund 5 Minuten) |
| CI-Läufe | 1 × schnelle Prüfung (Entwurf, grün), 1 × volle Prüfung (bereit, Klasse L, grün) |
| Rückfragen | keine blockierenden; 2 Punkte „Bitte bestätigen“ (Name der Kennzeichnung, erlaubte Ebenen „Fachlogik“ und „Ablauf“), von Chris bestätigt |
| Erreichte Abbruchkriterien | keine |

**Abnahme durch die Steuerung:** Diff gelesen. Ein Hilfsagent der Stufe S1 hat lokal ausgeführt: Lint, Format,
Typecheck, `npm test` (979 Tests), `ak:abdeckung`, `pruefumfang` und `landkarte` mit `--pruefen`. Gegenprobe mit
zurückgenommenen Änderungen: Ein umbenannter Test zu AM-AK-08 und eine unbekannte Ebene bei AM-AK-12 lassen
`ak:abdeckung -- --pruefen` scheitern; ein Lauf ohne `--pruefen` lässt `docs/03` unverändert.

**Ergebnis:** `docs/03` hat einen Abschnitt „Automatisches Mergen (`docs/07`)“. Die IDs und Ebenen kommen aus der Tabelle
in `docs/07`. AM-AK-01 bis -10 sind mit 1 bis 2 Tests je ID belegt. AM-AK-11 bis -14 tragen die Kennzeichnung „Ablauf,
Nachweis an Test-PRs (docs/07)“. `testsJeAk` zählt auch AM-AK-Zeilen, damit gilt AM-R06 für sie. Kleinigkeit: Der
Kurztext von AM-AK-05 in `docs/03` bricht nach „bzw.“ ab, weil die Kürzung am Satzende schneidet; bleibt
so (Chris, 13.10.2026).

**Steuerung Welle 1 (Planung, A1, zwei Doku-PRs):** 22.116 Eingabe-, 38.612 Ausgabe-Token; 9.771.676 aus dem
Zwischenspeicher gelesen, 288.673 geschrieben; rund 3,84 US-Dollar (Stand vor diesem PR).

**Falle für Abnahmeläufe:** Ein frischer Worktree hat keinen erzeugten Prisma-Client (`src/generated` ist ignoriert);
vor Typecheck und Tests `npx prisma generate` ausführen.

### Übergabe an die nächste Steuerung A (Welle 2)

- **Stand:** A1 gemergt (#30); Plan und Tabelle „Schattenbetrieb“ auf `main` (#29). `.github/automerge.yml` steht auf
  `aktiv: false`.
- **A2 (CI-37), Stufe S3 hoch, Klasse I:** startet erst nach dem Merge von #28 (G3-F), I und J. J passt den Satz zu
  CI-37 in `docs/ci-richtlinie.md` an; A2 gleicht danach mit `main` ab. Umfang nach E5: nur die Ablauf-Fälle (Browser)
  nach Modul auswählen. Im Zweifel laufen alle Fälle (CI-34). Die Zuordnung Datei → Modul steht bisher nur in den
  Überschriften von `specs/code-landkarte.md`; der Modulgraph steht in `docs/06` („Modulschnitt“) bzw. als Mermaid in
  `specs/00-uebersicht.md`. A2 legt ihn maschinenlesbar unter `specs/` ab. Die Status-Zeile in `docs/ci-richtlinie.md`
  sagt noch „Entwurf zur Freigabe“; korrigieren, falls J es nicht tut.
- **A3 (Test-PRs), durch die Steuerung selbst:** wartet auf E1 (Regelsatz und Warteschlange für `main` aktiv?) und E3
  (`am-test/main` im Regelsatz). Ablauf und Aufräumen stehen im Plan oben. Automatisches Mergen lässt sich über die
  REST-Route `PUT /repos/{owner}/{repo}/pulls/{n}/ccr/auto_merge` einschalten, auf „bereit“ stellen über `POST
  …/ccr/ready_for_review`. GraphQL ist aus der Sitzung nicht erreichbar.
- **Schattenbetrieb (E2):** Die Steuerungen von G3 Welle 2 und G4 tragen in die Tabelle oben ein; die Steuerung A zählt
  am Ende. Bisher 0 Einträge.
- **Am Ende von A:** `docs/07` (Einführung Schritt 4, offene Punkte) in einem Doku-PR nachziehen (geschützter Pfad, Chris
  mergt), dazu Rückblick nach MW-R12/KE-R18 und Übergabe.

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

## Übergabe an die Steuerung von G3

- **Stand:** G2 ist gemergt (#18, #19, #21, #22, #23; Fortschritt #20 und dieser PR). M01 bis M08 sind beschrieben, 407
  Prüffälle laufen in zwei Runnern (`tests/pruefung/fachlogik.test.ts` im Vitest-Projekt `unit`,
  `tests/pruefung/daten.test.ts` im Projekt `db`). `npm run ak:abdeckung -- --pruefen` und
  `npm run landkarte -- --pruefen` sind Pflicht in der schnellen Prüfung.
- **Nächstes (G3, `docs/06`, Etappen):** M09 Oberfläche und Q Plattform und Qualität beschreiben; Ablauf-Prüffälle mit
  einem Runner für die Ebene `ablauf` (Browser, der Adapter übersetzt fachliche Aktionen in Klicks); Beispielszenarien;
  Abdeckungsprüfung. Danach werden die Fach-Specs maßgeblich und `CLAUDE.md` wird angepasst.
- **Pflicht ab G3:** Die Ablauf-AKs AK-101, AK-106, AK-403, AK-408 brauchen Prüffälle; dann
  `DEFERRED_CASES_REQUIRED` in `scripts/ak-abdeckung/coverage.ts` umlegen.
- **Schnitt:** M09 hängt von allen Modulen ab; Q hängt von M09 ab. Der Ablauf-Runner ist die Voraussetzung für die
  Ablauf-Fälle aller Module; ihn zuerst bauen (wie den Daten-Runner in C). Gemeinsame Dateien wie in G2
  (`specs/code-landkarte.md`, `specs/00-uebersicht.md`, `specs/pruefung/format.md`, die Adapter, `docs/06`, `docs/03`):
  nur eigene Abschnitte, Merge-Reihenfolge vorgeben, `docs/03` nur über `npm run ak:abdeckung`.
- **Stufe:** Nach MW-R11 darf ein Beschreibungs-Paket bestehenden Codes auf S2 versucht werden (siehe Rückblick G2).
  Der Ablauf-Runner und alles mit Browser-Infrastruktur bleibt S3.
- **Fallen aus G2:**
  - Feste Gründe statt Meldungstexte: Prüffälle erkennen Fehler über Codes; die Domäne braucht dafür Gründe (Muster
    `RuleReason`, `TransitionReason`), und bestehende `toEqual`-Erwartungen werden dadurch strenger.
  - Daten-Fälle: `uhr` und `schritte` Pflicht; gleiche Zeitpunkte sortieren nicht stabil, daher je Schritt eine eigene
    `uhr`; Gleichzeitigkeit über „gesehen = Schrittnummer“.
  - Nach Schemaänderungen `npx prisma generate`, auch in der Steuerungssitzung vor der Abnahme; die Test-Datenbank
    migriert `tests/db/global-setup.ts` bei jedem Lauf.
  - Die Plattform abonniert Entwicklersitzungen automatisch auf ihren PR; sie beenden das Abo, damit die Ereignisse bei
    der Steuerung ankommen.
  - `src/app/**` macht einen PR zur Klasse O, `.github/**`, `vitest.config.ts` zur Klasse I (volle Prüfung in allen
    Konfigurationen).
  - E2E: Testpersonen entstehen erst beim ersten Seitenaufruf; in `describe.serial` überspringt ein Fehler alle
    Folgetests.
- **Werkzeuge der Steuerung:** Bericht der Entwicklersitzung per Nachricht; PR-Abo; Verbrauch über die Sitzungsdaten
  (`usage`) der Entwicklersitzung; Check-ins per verzögerter Nachricht in großem Abstand. Frische Steuerungssitzung je
  Welle erwägen (Rückblick G2).

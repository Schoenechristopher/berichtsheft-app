# M01 Kalender und Zeit

Stand: 12.10.2026 · Status: **Entwurf zur Freigabe** (Etappe G1) · @Chris

Fach-Spec nach `specs/vorlage-fach-spec.md`. Sie nennt keine Technik; wie die TypeScript-App die Regeln heute umsetzt,
steht in `specs/code-landkarte.md`, Abschnitt M01.

## 1. Zweck und Abgrenzung

M01 liefert allen anderen Modulen die Grundlagen für Zeit und Kalender:

- **Uhr:** die einzige Quelle für „jetzt“, für Tests und Vorführungen stellbar.
- **Kalendertag:** welcher Tag ein Zeitpunkt in der Zeitzone der Firma (Europe/Berlin) ist.
- **Wochen:** ISO-Kalenderwochen, ihre Arbeitstage, Folgewoche, Vergleich und die aktuelle Woche.
- **Bundesländer:** die festen Kürzel der 16 Bundesländer.
- **Feiertage:** ob ein Kalendertag in einem Bundesland ein gesetzlicher Feiertag ist.

Nicht in M01:

- Welche Wochen einen Bericht bekommen und wann (M03, AK-301 bis AK-304). M01 liefert dafür aktuelle Woche,
  Folgewoche und Vergleich.
- Das Vorbelegen der Tagesart „Feiertag“ beim Anlegen eines Berichts und dass eine spätere Änderung des Bundeslands
  bestehende Berichte nicht ändert (M03, Teil von AK-404). M01 beantwortet nur, ob ein Tag Feiertag ist.
- Wer das Bundesland einstellt (M02, AK-209).
- Zeitpläne wie die Montags-Erinnerung (M08). Sie nutzen Uhr und Zeitzone aus M01.

## 2. Begriffe

Zentrale Begriffe stehen in `specs/00-uebersicht.md`. Für M01 gilt zusätzlich:

| Begriff | Bedeutung |
| --- | --- |
| Zeitpunkt | ein Augenblick, unabhängig von einer Zeitzone (z. B. 05.10.2026, 22:30 UTC) |
| Kalendertag | ein Datum ohne Uhrzeit und ohne Zeitzone (z. B. 06.10.2026) |
| Zeitzone der Firma | Europe/Berlin, mit Sommer- und Winterzeit |
| Woche | ISO-Kalenderwoche: Jahr der Woche und Wochennummer, z. B. KW 53/2026 |
| Arbeitstage | Montag bis Freitag einer Woche |
| Bundesland | eines der 16 Länder, angegeben mit seinem festen Kürzel |
| Feiertag | landesweiter gesetzlicher Feiertag eines Bundeslands an einem Kalendertag |
| Einmaliger Feiertag | landesweiter gesetzlicher Feiertag, den ein Land nur für ein bestimmtes Jahr festgelegt hat |
| Produktivbetrieb | der echte Betrieb der App, im Unterschied zu Test, Entwicklung und Vorführung |

## 3. Regeln

**Uhr**

- **M01-R01:** „Jetzt“ hat genau eine Quelle, die Uhr von M01. Keine Regel eines Moduls liest die Zeit auf anderem Weg.
- **M01-R02:** Für Tests und Vorführungen lässt sich die Uhr auf einen festen Zeitpunkt stellen. Sie bleibt dann stehen,
  bis sie zurückgestellt wird.
- **M01-R03:** Im Produktivbetrieb wirkt eine Vorgabe des Zeitpunkts aus der Konfiguration nicht; es gilt die
  Systemzeit.
- **M01-R04:** Ein Zeitpunkt, der sich nicht lesen lässt, wird abgewiesen (`zeitpunkt_ungueltig`).

**Kalendertag**

- **M01-R05:** Der Kalendertag eines Zeitpunkts ist der Tag in der Zeitzone der Firma, mit Sommer- und Winterzeit.
  Beispiel: 05.10.2026, 22:30 UTC ist Dienstag, 06.10.2026.
- **M01-R06:** Ein Kalendertag trägt weder Uhrzeit noch Zeitzone. Rechnungen mit Kalendertagen (Wochentag, nächster
  Tag, Woche) hängen nicht davon ab, wo das System läuft.

**Wochen**

- **M01-R07:** Wochen sind ISO-8601-Kalenderwochen: Montag bis Sonntag; KW 1 ist die Woche mit dem 4. Januar. Das Jahr
  einer Woche ist das Jahr ihres Donnerstags. Beispiele: 01.01.2027 liegt in KW 53/2026, 29.12.2025 in KW 1/2026.
- **M01-R08:** Ein Jahr hat 52 oder 53 Wochen; es hat 53 genau dann, wenn der 28. Dezember in KW 53 liegt (z. B. 2026
  ja, 2027 nein).
- **M01-R09:** Die aktuelle Woche ist die Woche des heutigen Kalendertags (M01-R05). Eine neue Woche beginnt Montag,
  0:00 Uhr Berliner Zeit; Sonntag 23:59 Uhr gehört noch zur alten Woche.
- **M01-R10:** Die Arbeitstage einer Woche sind ihr Montag bis Freitag, auch wenn sie in zwei Kalenderjahren liegen.
- **M01-R11:** Folgewoche und Vergleich gelten über Jahresgrenzen: Auf KW 53/2026 folgt KW 1/2027, auf KW 52/2027 folgt
  KW 1/2028; KW 53/2026 liegt vor KW 1/2027.
- **M01-R12:** Eine Woche, die es nicht gibt (Nummer unter 1 oder über der Wochenzahl ihres Jahres, z. B. KW 0 oder
  KW 53/2027), wird abgewiesen (`woche_ungueltig`). Sie wird nie still in eine Woche des Nachbarjahrs umgedeutet.

**Bundesländer**

- **M01-R13:** Wählbar sind genau die 16 Bundesländer mit diesen festen Kürzeln: BW Baden-Württemberg, BY Bayern,
  BE Berlin, BB Brandenburg, HB Bremen, HH Hamburg, HE Hessen, MV Mecklenburg-Vorpommern, NI Niedersachsen,
  NW Nordrhein-Westfalen, RP Rheinland-Pfalz, SL Saarland, SN Sachsen, ST Sachsen-Anhalt, SH Schleswig-Holstein,
  TH Thüringen. Die Kürzel sind in Großbuchstaben fest.
- **M01-R14:** Jedes andere Kürzel ist unbekannt und wird abgewiesen (`bundesland_unbekannt`), auch eine Stadt oder
  Region (z. B. „AUGSBURG“).

**Feiertage**

- **M01-R15:** Feiertag ist jeder landesweite gesetzliche Feiertag des Bundeslands, nach dem Feiertagsrecht des
  jeweiligen Jahres. Beispiele: Fr 25.12.2026 überall; Do 27.05.2027 (Fronleichnam) in NW ja, in NI nein;
  Reformationstag in NI ab 2018 jedes Jahr, 2017 einmalig in allen Ländern.
- **M01-R16:** Einmalige landesweite Feiertage zählen in ihrem Jahr, z. B. 08.05.2020, 08.05.2025 und 17.06.2028 in
  Berlin. Die Liste steht in Abschnitt 5.
- **M01-R17:** Kommunale oder regionale Feiertage zählen nicht, z. B. das Augsburger Friedensfest (08.08.) oder
  Fronleichnam in den Teilen Sachsens und Thüringens, in denen er gilt.
- **M01-R18:** Die Feiertagsabfrage für ein unbekanntes Bundesland wird abgewiesen (M01-R14).
- **M01-R19:** Ob ein Tag Feiertag ist, hängt nur von Bundesland und Kalendertag ab, nicht vom Wochentag; auch
  Feiertage am Wochenende zählen (z. B. Ostersonntag in BB).

## 4. Akzeptanzkriterien

Text aus `docs/01-spezifikation.md`; Prüffälle in `specs/pruefung/M01.json`.

| AK-ID | Kriterium (Kurzfassung) | Regeln | Prüffälle | Ebene |
| --- | --- | --- | --- | --- |
| AK-404 | Gesetzliche Feiertage des eingestellten Bundeslands sind als „Feiertag“ vorbelegt; Beispiele 25.12.2026, Fronleichnam 2027 in NW ja, NI nein. Das Vorbelegen beim Anlegen regelt M03. | M01-R15, M01-R19 | AK-404-01 bis AK-404-03 | Fachlogik |
| AK-1201 | „Jetzt“ aus einer zentralen Uhr, für Tests und Vorführungen stellbar, im Produktivbetrieb nicht. | M01-R01 bis M01-R04 | AK-1201-01 bis AK-1201-05 | Fachlogik |
| AK-1202 | Maßgeblich ist der Kalendertag in Europe/Berlin, mit Sommer- und Winterzeit. | M01-R05, M01-R06, M01-R09 | AK-1202-01 bis AK-1202-09 | Fachlogik |
| AK-1203 | ISO-8601-Kalenderwochen (Woche 1 enthält den 4. Januar). | M01-R07, M01-R08, M01-R10, M01-R11 | AK-1203-01 bis AK-1203-10 | Fachlogik |
| AK-1204 | Eine Woche, die es nicht gibt, wird abgewiesen, z. B. KW 53/2027 oder KW 0. | M01-R08, M01-R12 | AK-1204-01 bis AK-1204-06 | Fachlogik |
| AK-1205 | Genau die 16 Bundesländer mit festen Kürzeln; ein unbekanntes Kürzel wird abgewiesen. | M01-R13, M01-R14, M01-R18 | AK-1205-01 bis AK-1205-06 | Fachlogik |
| AK-1206 | Feiertag ist jeder landesweite gesetzliche Feiertag, einschließlich einmaliger; kommunale und regionale zählen nicht. | M01-R15 bis M01-R17, M01-R19 | AK-1206-01 bis AK-1206-11 | Fachlogik |

Hilfsfunktionen für **AK-301 bis AK-304** (aktuelle Woche, Folgewoche, Vergleich) liefert M01; die Kriterien gehören
M03 und werden dort geprüft.

## 5. Logisches Datenmodell

M01 hält keine eigenen Bewegungsdaten. Es nutzt:

| Entität | Feld | Pflicht | Wertebereich | Bemerkung |
| --- | --- | --- | --- | --- |
| Einstellung (M02) | Bundesland | ja | Kürzel nach M01-R13 | genau eine für die ganze App; eingestellt vom Admin (AK-209) |

Referenzdaten „Einmalige landesweite Feiertage“ (fest, Änderung nur mit Quelle und Freigabe):

| Bundesland | Kalendertag | Anlass | Rechtsquelle |
| --- | --- | --- | --- |
| BE | 08.05.2020 | 75. Jahrestag der Befreiung vom Nationalsozialismus | Drittes Gesetz zur Änderung des Gesetzes über die Sonn- und Feiertage vom 30.01.2019, GVBl. Berlin 2019, Nr. 3, S. 22 |
| BE | 08.05.2025 | 80. Jahrestag der Befreiung vom Nationalsozialismus und des Endes des Zweiten Weltkriegs in Europa | Viertes Gesetz zur Änderung des Gesetzes über die Sonn- und Feiertage vom 10.07.2024, GVBl. Berlin 2024, Nr. 28, S. 460 |
| BE | 17.06.2028 | 75. Jahrestag des Volksaufstands vom 17. Juni 1953 | Viertes Gesetz zur Änderung des Gesetzes über die Sonn- und Feiertage vom 10.07.2024, GVBl. Berlin 2024, Nr. 28, S. 460 |

Wertebereiche: Kalendertag `JJJJ-MM-TT`; Woche Jahr (ganze Zahl) und Nummer 1 bis 52 bzw. 53 (M01-R08).

## 6. Schnittstellen

Angeboten (Formate und Fehlercodes in `specs/pruefung/format.md`):

| Schnittstelle | Ergebnis | Regeln |
| --- | --- | --- |
| `jetzt()` | Zeitpunkt | M01-R01, M01-R02 |
| `uhrVorgeben(zeitpunkt, betrieb)` | gestellt ja/nein \| `zeitpunkt_ungueltig` | M01-R02 bis M01-R04 |
| `kalendertag(zeitpunkt)` | Kalendertag und Wochentag | M01-R05, M01-R06 |
| `isoWoche(datum)` | Woche | M01-R07 |
| `montagDerWoche(jahr, woche)` | Kalendertag \| `woche_ungueltig` | M01-R07, M01-R12 |
| `arbeitstage(jahr, woche)` | fünf Kalendertage Mo–Fr \| `woche_ungueltig` | M01-R10, M01-R12 |
| `naechsteWoche(woche)` | Woche \| `woche_ungueltig` | M01-R11, M01-R12 |
| `vergleicheWochen(a, b)` | früher, gleich oder später | M01-R11 |
| `aktuelleWoche(zeitpunkt)` | Woche | M01-R09 |
| `bundeslaender()` | die 16 Kürzel | M01-R13 |
| `istBundesland(kuerzel)` | ja/nein | M01-R13, M01-R14 |
| `istFeiertag(bundesland, datum)` | ja/nein \| `bundesland_unbekannt` | M01-R15 bis M01-R19 |
| `feiertage(bundesland, jahr)` | Kalendertage aufsteigend \| `bundesland_unbekannt` | M01-R15 bis M01-R19 |

Genutzt: keine Schnittstellen anderer Module. Das eingestellte Bundesland kommt als Eingabe von M02 bzw. vom
aufrufenden Modul.

## 7. Ereignisse

Keine. M01 löst keine Ereignisse aus; Zeitpläne (z. B. Montags-Erinnerung, tägliches Anlegen fehlender Wochen) gehören
den Modulen, die sie brauchen (M03, M08).

## 8. Anforderungen an die Plattform

- **Uhr für Tests stellbar:** Tests und Vorführungen stellen „jetzt“ auf einen festen Zeitpunkt und wieder zurück, ohne
  die Systemzeit zu ändern; im Produktivbetrieb ist das über die Konfiguration nicht möglich (M01-R03).
- **Zeitzonen-Datenbank:** Die Plattform kennt Europe/Berlin mit den Regeln für Sommer- und Winterzeit.
- **Kalendertage ohne Zeitzone:** Kalendertage werden so gespeichert und verglichen, dass die Zeitzone von Server,
  Datenbank oder Browser sie nicht verschiebt.
- **Feiertage ohne Internetzugriff:** Die Feiertage werden lokal berechnet bzw. aus festen Referenzdaten gelesen.

## 9. Bestätigte Auslegungen

| Datum | Auslegung | Herkunft |
| --- | --- | --- |
| 06.10.2026 | Alle Regeln holen „jetzt“ aus einem Uhr-Modul; Tests stellen damit gezielt Montag 9:00 Uhr oder einen Feiertag ein, nie die echte Uhrzeit. | `docs/02-plan.md`, Etappe 3 |
| 06.10.2026 | Die aktuelle Woche bestimmt sich nach Europe/Berlin; Erinnerung und tägliches Anlegen laufen nach Berliner Zeit. | `docs/02-plan.md` |
| 06.10.2026 | Feiertage werden beim Anlegen des Berichts vorbelegt, nur innerhalb der Ausbildung; eine spätere Änderung des Bundeslands ändert bestehende Berichte nicht (Regel von M03). | AK-404, Ergänzung Etappe 3 |
| 07.10.2026 | Ein fester Zeitpunkt aus der Konfiguration gilt nur außerhalb des Produktivbetriebs (Demo, Browser-Tests, Erinnerung von Hand). | `docs/02-plan.md`, Etappe 6 |
| 12.10.2026 | Regeln zu Uhr, Kalendertag, Woche, Bundesländern und Feiertagen bekommen eigene AK-IDs (AK-1201 bis AK-1206); AK-404 gehört M01. | Entscheidung Chris, Plan G1 |
| 12.10.2026 | Soll-Verhalten in die Spec, Code wird angepasst: ungültige Wochen werden abgewiesen (AK-1204), einmalige landesweite Feiertage zählen (AK-1206). | Entscheidung Chris, Plan G1 |

## 10. Offene Punkte

- [ ] **Bitte bestätigen:** Mariä Himmelfahrt (15.08.) gilt in Bayern nur in Gemeinden mit überwiegend katholischer
      Bevölkerung, also regional. Heute zählt die App den Tag für ganz Bayern als Feiertag. Nach M01-R17 dürfte er
      nicht zählen; praktisch hat ihn der größte Teil Bayerns. Vorschlag: so lassen und als bestätigte Auslegung
      aufnehmen („landesweit“ heißt hier: im Gesetz des Landes genannt, nicht nur kommunal).
- [ ] **Bitte bestätigen:** Der 17.06.2028 (Berlin) fällt auf einen Samstag und wirkt sich auf Mo–Fr nicht aus; er steht
      der Vollständigkeit halber in der Liste.
- [ ] Neue einmalige Feiertage kommen nur mit Rechtsquelle in die Liste in Abschnitt 5; wer die Liste pflegt, legt G4
      im Profil fest.

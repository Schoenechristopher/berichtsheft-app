# M07 PDF-Export

Stand: 13.10.2026 · Status: **Entwurf zur Freigabe** (Etappe G2) · @Chris

Fach-Spec nach `specs/vorlage-fach-spec.md`. Sie nennt keine Technik; wie die TypeScript-App die Regeln heute umsetzt,
steht in `specs/code-landkarte.md`, Abschnitt M07.

## 1. Zweck und Abgrenzung

M07 legt fest, was ein exportiertes Berichtsheft enthält:

- **PDF einer Woche** und **Sammel-PDF** für einen frei wählbaren Zeitraum.
- **Inhalt:** Name, Kalenderwoche, Zeitraum, Tage mit Datum, Tagesart und Tätigkeiten, Status.
- **Freigabevermerk** bzw. **Kennzeichnung** einer nicht freigegebenen Woche.
- **Zeitraum:** welche Wochen dazugehören, Vorbelegung, Prüfung der Angaben.
- **Vollständigkeit** von Umlauten und langen Texten, Dateiname.
- **Zugriff** auf den Export.

Nicht in M07:

- Wer einen Bericht sehen darf (M02, M02-R09 bis M02-R11); M07 wendet diese Regeln unverändert auf den Export an.
- Welche Wochen ausgeblendet sind (M03, AK-306) und wann eine Freigabe gilt (M05, M06).
- Der Hinweis „Es wird der zuletzt gespeicherte Stand exportiert.“ vor dem Download aus dem Editor, das Formular für den
  Zeitraum und das Aussehen der Seiten (M09). M07 legt nur fest, was gedruckt wird.

## 2. Begriffe

Zentrale Begriffe stehen in `specs/00-uebersicht.md`; Status und Freigabe in M05, Historie in M06. Für M07 gilt
zusätzlich:

| Begriff | Bedeutung |
| --- | --- |
| PDF einer Woche | Druckfassung eines Wochenberichts |
| Sammel-PDF | Druckfassung aller Wochen eines Zeitraums in einem Dokument, jede Woche ab einer neuen Seite |
| Zeitraum | „Von“ und „Bis“ als Kalendertage, beide eingeschlossen |
| Freigabevermerk | Text „Freigegeben von <Name> am <Datum>, <Uhrzeit> Uhr“ einer freigegebenen Woche; gilt als Nachweis |
| Kennzeichnung | Text „Nicht freigegeben – Status: <Status>“ einer nicht freigegebenen Woche |
| Aktuell gültige Freigabe | die letzte Freigabe eines Berichts, der jetzt „Freigegeben“ ist |
| Erstellungszeitpunkt | „jetzt“ beim Erzeugen des PDF, aus der Uhr von M01 |

## 3. Regeln

**Inhalt einer Woche**

- **M07-R01:** Das PDF einer Woche enthält den Namen des Azubis, die Kalenderwoche („KW 40/2026“), den Zeitraum Montag
  bis Freitag („28.09.2026 – 02.10.2026“), alle fünf Tage mit Wochentag und Datum („Montag, 28.09.2026“), Tagesart und
  Tätigkeiten sowie den Status.
- **M07-R02:** Tagesart im PDF: die Tagesart (Betrieb, Berufsschule, Urlaub, Krank, Feiertag); ohne Tagesart „Tagesart
  noch offen“; ein Tag außerhalb der Ausbildung „außerhalb der Ausbildung“, mit gespeicherter Tagesart in Klammern
  („außerhalb der Ausbildung (Betrieb)“). Eine Woche ganz außerhalb der Ausbildung (M03) ist als solche markiert.
- **M07-R03:** Gedruckt wird der zuletzt gespeicherte Stand. Das PDF entsteht bei jedem Abruf neu aus dem gespeicherten
  Bestand; es gibt keine aufbewahrte Fassung.
- **M07-R04:** Ins PDF kommen nur der aktuelle Inhalt der Woche, Status und Freigabevermerk bzw. Kennzeichnung. Nicht
  hinein: Kommentare, Historie, die Begründung einer Rücknahme, Unterschriftszeilen und ein Hinweis „deaktiviert“.

**Freigabevermerk und Kennzeichnung**

- **M07-R05:** Eine Woche im Status „Freigegeben“ trägt den Freigabevermerk mit Name des Ausbilders und Datum und
  Uhrzeit der aktuell gültigen Freigabe in Berliner Zeit, z. B. „Freigegeben von Bernd Ausbilder am 05.10.2026, 09:45
  Uhr“. Nach Rücknahme und erneuter Freigabe zählt die neue Freigabe.
- **M07-R06:** Jede andere Woche trägt die Kennzeichnung „Nicht freigegeben – Status: <Status>“ (Entwurf, Eingereicht,
  Abgelehnt) und keinen Freigabevermerk. Nach einer Rücknahme ist der Status „Abgelehnt“; ein neu erzeugtes PDF hat
  deshalb keinen Vermerk mehr (M07-R03).
- **M07-R07:** Jede Seite einer Woche hat oben Name, Kalenderwoche und „Freigegeben“ bzw. „Nicht freigegeben
  (<Status>)“, unten den Erstellungszeitpunkt („Erstellt am 06.10.2026, 21:00 Uhr“) und „Seite x von y“, gezählt über
  das ganze Dokument.

**Sammel-PDF**

- **M07-R08:** Zum Zeitraum gehört jede Woche, von deren Montag bis Freitag mindestens ein Tag zwischen Von und Bis liegt
  (beide eingeschlossen); gedruckt wird immer die ganze Woche. Ein Zeitraum nur aus Samstag und Sonntag berührt keine
  Woche. Ausgeblendete Wochen (M03, AK-306) fehlen; eine Woche ganz außerhalb der Ausbildung mit Inhalt oder Historie
  erscheint, markiert nach M07-R02.
- **M07-R09:** Die Wochen stehen in zeitlicher Reihenfolge, auch über den Jahreswechsel (KW 53 vor KW 1). Jede Woche
  beginnt auf einer neuen Seite; eine lange Woche läuft über mehrere Seiten.
- **M07-R10:** Vorbelegung: Von = Ausbildungsbeginn, Bis = heute; ist die Ausbildung schon beendet, Bis =
  Ausbildungsende. Fehlt eine Angabe oder ist sie leer (nur Leerraum), gilt für sie die Vorbelegung.
- **M07-R11:** Von und Bis müssen Kalendertage sein, die es gibt (`von_ungueltig`, `bis_ungueltig`); Bis darf nicht vor
  Von liegen (`bis_vor_von`). Dann entsteht kein PDF. Ein gültiger Zeitraum ohne Wochen ergibt ein PDF mit einem Hinweis
  statt einer Fehlermeldung.

**Vollständigkeit und Dateiname**

- **M07-R12:** Umlaute, ß, Akzente, Zeilenumbrüche und lange Texte (bis 5.000 Zeichen je Tag, M04) erscheinen
  vollständig und unverändert; nichts wird abgeschnitten. Es gibt keine automatische Silbentrennung; nur ein Wort ohne
  Leerzeichen mit mehr als 24 Zeichen wird am Zeilenende mit Trennstrich umbrochen.
- **M07-R13:** Dateiname einer Woche „Berichtsheft_<Name>_KW<Woche>-<Jahr>.pdf“, eines Zeitraums
  „Berichtsheft_<Name>_<Von>_bis_<Bis>.pdf“ (Daten als JJJJ-MM-TT). Im Namen werden ä, ö, ü, Ä, Ö, Ü und ß
  umschrieben (ae, oe, ue, Ae, Oe, Ue, ss), Akzente entfernt; jede Folge anderer Zeichen als Buchstaben und Ziffern wird
  zu „-“, ohne „-“ am Anfang und Ende, höchstens 60 Zeichen; bleibt nichts übrig, steht „Azubi“. Der Titel des
  Dokuments ist „Berichtsheft <Name> – KW <Woche>/<Jahr>“ bzw. „Berichtsheft <Name> – <Von> – <Bis>“ mit Daten als
  TT.MM.JJJJ.

**Zugriff**

- **M07-R14:** Exportieren darf, wer den Bericht sehen darf (M02-R09 bis M02-R11): der Azubi nur eigene Berichte, jeder
  aktive Ausbilder die aller Azubis, auch deaktivierter; eine deaktivierte Person nichts. Ein fremder Bericht ergibt
  „Zugriff verweigert“ (`zugriff_verweigert`), ein unbekannter Bericht oder eine Person ohne Berichtsheft (kein Azubi
  mit Ausbildungsbeginn) „Seite nicht gefunden“ (`nicht_gefunden`). Jeder Export prüft das selbst (M02-R13).

## 4. Akzeptanzkriterien

Text aus `docs/01-spezifikation.md`, Kapitel 9; Prüffälle in `specs/pruefung/M07.json`.

| AK-ID | Kriterium (Kurzfassung) | Regeln | Prüffälle | Ebene |
| --- | --- | --- | --- | --- |
| AK-901 | Eine Woche lässt sich als PDF exportieren, mit Name, Kalenderwoche, Zeitraum, allen Tagen mit Datum, Tagesart und Tätigkeiten sowie dem Status; exportiert wird der zuletzt gespeicherte Stand. | M07-R01 bis M07-R04, M07-R07, M07-R13 | AK-901-01, AK-901-02 | Fachlogik |
| AK-902 | Für einen Zeitraum entsteht ein Sammel-PDF aller Wochen in zeitlicher Reihenfolge; jede Woche beginnt auf einer neuen Seite. | M07-R08 bis M07-R11, M07-R13 | AK-902-01 bis AK-902-13 | Fachlogik |
| AK-903 | Freigegebene Wochen tragen einen Freigabevermerk mit Name des Ausbilders, Datum und Uhrzeit der aktuell gültigen Freigabe. | M07-R05 | AK-903-01 bis AK-903-04 | Fachlogik |
| AK-904 | Nicht freigegebene Wochen sind deutlich gekennzeichnet, z. B. „Nicht freigegeben – Status: Entwurf“. | M07-R06, M07-R07 | AK-904-01, AK-904-02 | Fachlogik |
| AK-905 | Nach einer Rücknahme enthält ein neu erzeugtes PDF keinen Freigabevermerk mehr. | M07-R03, M07-R06 | AK-905-01, AK-905-02 | Daten |
| AK-906 | Der Azubi exportiert nur eigene Berichte, ein Ausbilder die aller Azubis, auch deaktivierter; fremd „Zugriff verweigert“, unbekannt „Seite nicht gefunden“. | M07-R14 | AK-906-01, AK-906-02 | Daten |
| AK-907 | Umlaute und lange Texte erscheinen im PDF vollständig, nichts wird abgeschnitten; keine Silbentrennung, nur Wörter über 24 Zeichen werden umbrochen. | M07-R12, M07-R13 | AK-907-01 bis AK-907-04 | Fachlogik |

Keine AK von M07 ist nur im Browser prüfbar; es gibt deshalb keine Markierung `Ablauf, G3`. Die Prüffälle prüfen den
**Inhalt** eines PDF über seine Merkmale (welche Texte und Vermerke es enthält, welche Wochen in welcher Reihenfolge),
nicht das Layout (`format.md`, „PDF-Inhalt“). Teile, die nur das gedruckte Dokument oder die Oberfläche betreffen,
prüfen heute Tests der TypeScript-App am erzeugten PDF und im Browser; sie sind Anforderungen an die Plattform
(Abschnitt 8):

- **AK-901:** der Hinweis vor dem Download bei ungespeicherten Änderungen (Oberfläche, M09; Ablauf-Fall ab G3).
- **AK-902:** „jede Woche beginnt auf einer neuen Seite“: Im Inhalt ist jede Woche ein eigener Eintrag in `wochen`; dass
  daraus eine neue Seite wird, ist eine Pflicht des Druckens (Abschnitt 8). Ebenso der Hinweis im PDF ohne Wochen.
- **AK-904:** Kopf- und Fußzeile auf jeder Seite (Kern: `kopfzeile` je Woche).
- **AK-907:** dass im gedruckten Dokument nichts abgeschnitten wird und überlange Wörter umbrochen werden (Kern: Texte
  kommen unverändert und vollständig in den Inhalt).

Gehört M02, wird hier nur genutzt: Sichtbarkeit (AK-103 bis AK-105). Gehört M03: ausgeblendete Wochen und „ganz
außerhalb“ (AK-306). Gehört M05 und M06: Status, Freigabe und Rücknahme (AK-603, AK-703), Historie (AK-801).

## 5. Logisches Datenmodell

M07 speichert nichts. Es liest:

| Entität | Feld | Pflicht | Wertebereich | Bemerkung |
| --- | --- | --- | --- | --- |
| Person (Azubi) | Name | ja | Text | im Kopf und im Dateinamen |
| Person (Azubi) | Ausbildungsbeginn, -ende | Beginn ja | Kalendertag | Vorbelegung des Zeitraums, „ganz außerhalb“ |
| Wochenbericht | Woche, Status | ja | | M03, M05 |
| Tag | Datum, Tagesart, Tätigkeiten, außerhalb | ja | | M03, M04 |
| Statuswechsel | neuer Status, Person (Name), Zeitpunkt, Reihenfolge | ja | | nur für die aktuell gültige Freigabe (M06) |

Ergebnis ist der Inhalt eines PDF: Titel, Dateiname, Erstellungszeitpunkt, beim Sammel-PDF der Zeitraum, und je Woche
Name, Kalenderwoche, Zeitraum, Status, Freigabevermerk oder Kennzeichnung, Kopfzeile, Markierung „ganz außerhalb“ und
die fünf Tage.

## 6. Schnittstellen

Angeboten (Formate und Fehlercodes in `specs/pruefung/format.md`, „Schnittstellen und Aktionen von M07“):

| Schnittstelle | Ergebnis | Regeln |
| --- | --- | --- |
| `pdfWoche(name, bericht, ausbildung)` | Inhalt des PDF einer Woche (Erstellungszeitpunkt aus der Uhr) | M07-R01, M07-R02, M07-R04 bis M07-R07, M07-R12, M07-R13 |
| `pdfZeitraum(name, ausbildung, von, bis, berichte)` | Inhalt des Sammel-PDF \| `von_ungueltig`, `bis_ungueltig`, `bis_vor_von` | M07-R05 bis M07-R13 |

Als Abläufe der Plattform mit gespeichertem Bestand (Daten-Fälle, Aktionen in `format.md`): PDF einer Woche und
Sammel-PDF exportieren, jeweils als handelnde Person mit Zugriffsprüfung (M07-R14).

Genutzt:

- M01: „jetzt“, Kalenderwochen, Wochentage, Datum und Uhrzeit in Berliner Zeit.
- M02: Sichtbarkeit (`darfBerichtSehen`).
- M03: Wochen ganz außerhalb der Ausbildung und ausgeblendete Wochen (`wocheEinordnen`), Anlegen fehlender Wochen vor
  dem Sammel-PDF.
- M05, M06: Status und die aktuell gültige Freigabe aus der Historie.

## 7. Ereignisse

M07 löst keine Ereignisse aus und reagiert auf keine: Das PDF entsteht bei jedem Abruf neu (M07-R03). Deshalb wirkt
„Freigabe zurückgenommen“ (M05) sofort, ohne dass M07 etwas nachführen muss.

## 8. Anforderungen an die Plattform

- **Jedes PDF neu erzeugen:** kein Zwischenspeicher beim Server oder im Browser, damit nach einer Rücknahme kein
  Vermerk bleibt (AK-905).
- **Seiten:** Jede Woche beginnt auf einer neuen Seite; Kopf- und Fußzeile auf jeder Seite; „Seite x von y“ über das
  ganze Dokument; ein Sammel-PDF ohne Wochen enthält einen Hinweis „Im Zeitraum … gibt es keine Wochenberichte.“
- **Schrift:** eine eingebettete Schrift, die Umlaute, ß und Akzente darstellt, ohne Abruf aus dem Internet.
- **Umbruch:** Texte laufen über Seiten weiter, nichts wird abgeschnitten; keine automatische Silbentrennung; Wörter
  ohne Leerzeichen über 24 Zeichen werden mit Trennstrich am Zeilenende umbrochen.
- **Zugriff auf dem Server** bei jedem Abruf nach M07-R14, unabhängig von der Oberfläche.
- **„Jetzt“ nur aus der Uhr von M01** (Erstellungszeitpunkt, Vorbelegung „heute“); Anzeige in Berliner Zeit.
- **Laufzeit:** Ein Sammel-PDF über eine ganze Ausbildung (rund 150 Wochen) entsteht in wenigen Sekunden.
- **Feste Fehlergründe:** Jede Abweisung hat einen festen Grund, unabhängig vom Meldungstext (für die Prüffälle).

## 9. Bestätigte Auslegungen

| Datum | Auslegung | Herkunft |
| --- | --- | --- |
| 06.10.2026 | Exportiert wird der zuletzt gespeicherte Stand; mit ungespeicherten Änderungen erscheint vor dem Download ein Hinweis, ohne keiner. | AK-901, Ergänzung Etappe 5 |
| 06.10.2026 | Zum Zeitraum gehört jede Woche, deren Mo–Fr ihn berührt; gedruckt wird die ganze Woche; ausgeblendete Wochen fehlen; Vorbelegung Ausbildungsbeginn bis heute, nach Ausbildungsende bis zum Ende; ein Zeitraum ohne Wochen ergibt ein PDF mit Hinweis. | AK-902, Ergänzung Etappe 5; `docs/01`, „PDF-Export“ |
| 06.10.2026 | Freigabevermerk mit Datum und Uhrzeit der aktuell gültigen Freigabe, z. B. „Freigegeben von Bernd Ausbilder am 05.10.2026, 09:45 Uhr“. | AK-903, Präzisierung Etappe 5 |
| 06.10.2026 | Fremde Berichte ergeben „Zugriff verweigert“, unbekannte „Seite nicht gefunden“. | AK-906, Ergänzung Etappe 5 |
| 06.10.2026 | Keine automatische Silbentrennung; nur Wörter ohne Leerzeichen über 24 Zeichen werden mit Trennstrich umbrochen. | AK-907, Ergänzung Etappe 5 |
| 06.10.2026 | Inhalt nur aktueller Inhalt, Status und Vermerk bzw. Kennzeichnung; keine Kommentare, kein Verlauf, keine Begründung, keine Unterschriftszeilen, kein Hinweis „deaktiviert“. Kopfzeile mit Name, Kalenderwoche und Status auf jeder Seite, Fußzeile mit Erstellungsdatum und „Seite x von y“. | `docs/01`, „PDF-Export“, Etappe 5 |
| 06.10.2026 | Das PDF entsteht bei jedem Aufruf neu, damit nach einer Rücknahme kein Vermerk bleibt; gleiche Zugriffsregeln wie die Berichtsseite. | `docs/02`, „PDF“, Etappe 5 |

## 10. Offene Punkte

- [ ] **Bitte bestätigen:** neue Schnittstellen `pdfWoche` und `pdfZeitraum`, das Format „PDF-Inhalt“, die Aktionen
      `pdf_woche_exportieren` und `pdf_zeitraum_exportieren` und die Fehlercodes `nicht_gefunden`, `von_ungueltig`,
      `bis_ungueltig`, `bis_vor_von` in `format.md` („Schnittstellen und Aktionen von M07“).
- [ ] **Bitte bestätigen:** „Jede Woche auf einer neuen Seite“ ist im Inhalt ein Strukturmerkmal (ein Eintrag je Woche
      in `wochen`), kein eigenes Feld; das Umsetzen in Seiten prüft jede Plattform am gedruckten Dokument.
- [ ] **Bitte bestätigen:** Dateiname und Titel (M07-R13) stehen bisher nur im Code, nicht in `docs/01`; sie sind hier
      als Soll übernommen.
- [ ] Ablauf-Fälle für den Hinweis vor dem Download und das Formular für den Zeitraum folgen in G3 (M09).

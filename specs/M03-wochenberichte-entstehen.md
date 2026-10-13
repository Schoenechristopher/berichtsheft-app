# M03 Wochenberichte entstehen

Stand: 12.10.2026 · Status: **Entwurf zur Freigabe** (Etappe G2) · @Chris

Fach-Spec nach `specs/vorlage-fach-spec.md`. Sie nennt keine Technik; wie die TypeScript-App die Regeln heute umsetzt,
steht in `specs/code-landkarte.md`, Abschnitt M03.

## 1. Zweck und Abgrenzung

M03 sorgt dafür, dass jeder Azubi für jede Woche seiner Ausbildung bis heute genau einen Wochenbericht hat, und ordnet
die Wochen für die Übersicht ein:

- **Entstehung:** welche Wochen einen Bericht bekommen, wann und mit welchen Tagen.
- **Außerhalb der Ausbildung:** welche Tage und Wochen vor dem Beginn oder nach dem Ende liegen, auch nach einer
  Änderung des Ausbildungszeitraums.
- **Vorbelegen beim Anlegen:** Feiertage werden beim Anlegen als „Feiertag“ vorbelegt und später nicht neu berechnet.
- **„Offen“:** die eine Definition, auf die Übersicht (M03), Bearbeiten und Prüfen (M04, M05) und Erinnerung (M08)
  verweisen.
- **Übersicht:** alle Wochen eines Azubis mit Status, vergangene offene Wochen hervorgehoben.

Nicht in M03:

- Uhr, Kalendertag, Wochen, Bundesländer und die Frage, ob ein Tag Feiertag ist (M01). M03 nutzt aktuelle Woche,
  Folgewoche, Vergleich, Arbeitstage und Feiertagsabfrage von M01. AK-404 gehört M01; M03 regelt nur, dass beim
  Anlegen vorbelegt wird.
- Wer Ausbildungsbeginn und -ende, Bundesland und Aktivität einer Person festlegt (M02, AK-203, AK-205, AK-209).
- Tagesarten, Tätigkeiten und Speichern eines Berichts (M04).
- Statusmodell, Pflichtangaben und Prüfen (M05); Historie (M06).
- Wann und an wen erinnert wird (M08). M08 nutzt die Definition „offen“ aus M03.

## 2. Begriffe

Zentrale Begriffe stehen in `specs/00-uebersicht.md`. Für M03 gilt zusätzlich:

| Begriff | Bedeutung |
| --- | --- |
| Ausbildungszeitraum | Ausbildungsbeginn (Pflicht für Azubis) und Ausbildungsende (optional) als Kalendertage; beide Tage gehören zur Ausbildung |
| Fällige Woche | Woche, für die ein Bericht existieren muss: von der Woche des Beginns bis zur aktuellen Woche, höchstens bis zur Woche des Endes |
| Tag außerhalb der Ausbildung | Arbeitstag vor dem Ausbildungsbeginn oder nach dem Ausbildungsende; ausgegraut, keine Pflicht, nicht änderbar |
| Woche ganz außerhalb der Ausbildung | Woche, deren fünf Arbeitstage alle außerhalb der Ausbildung liegen; kommt nur nach einer Änderung des Zeitraums vor |
| Vorbelegt | Tag, dessen Tagesart beim Anlegen (oder beim Einbeziehen nach einer Zeitraumänderung) automatisch auf „Feiertag“ gesetzt wurde; der Merker bleibt, auch wenn der Azubi die Tagesart ändert |
| Offener Status | Status „Entwurf“ oder „Abgelehnt“ |
| Offen | Bericht mit offenem Status, dessen Woche nicht ganz außerhalb der Ausbildung liegt; zählt als nicht eingereicht |
| Vergangen offen | offen und vor der aktuellen Woche; in der Übersicht deutlich hervorgehoben |
| Unberührt | Bericht im Status „Entwurf“ ohne Inhalt (kein Tag mit Tagesart oder Text) und ohne Historie (kein Statuswechsel) |
| Ausgeblendet | unberührter Bericht einer Woche ganz außerhalb der Ausbildung; erscheint in keiner Liste, wird aber nicht gelöscht |

## 3. Regeln

**Entstehung**

- **M03-R01:** Für jeden aktiven Azubi mit Ausbildungsbeginn existiert für jede fällige Woche genau ein Bericht. Ein neuer
  Bericht hat den Status „Entwurf“. Beispiel: Beginn 01.09.2026 (KW 36), heute 06.10.2026 (KW 41) → Berichte KW 36
  bis 41.
- **M03-R02:** Für zukünftige Wochen gibt es keinen Bericht. Mit Beginn einer neuen Woche (Montag, 0:00 Uhr Berliner
  Zeit, M01-R09) wird sie fällig; ihr Bericht entsteht ohne Zutun, spätestens beim nächsten Aufruf der Übersicht oder
  beim täglichen Anlegen. Ein Beginn in der Zukunft ergibt noch keinen Bericht.
- **M03-R03:** Nach der Woche des Ausbildungsendes entsteht kein Bericht mehr. Ein Ende in der Zukunft begrenzt nicht;
  es gilt die aktuelle Woche.
- **M03-R04:** Berichte entstehen nur automatisch; manuelles Anlegen gibt es nicht. Pro Azubi und Woche gibt es genau
  einen Bericht, auch bei wiederholtem oder gleichzeitigem Anlegen und über den Jahreswechsel (KW 53/2026 genau einmal,
  danach KW 1/2027).
- **M03-R05:** Für eine Woche, die es nicht gibt (M01-R12), entsteht kein Bericht; auch die Datenhaltung weist einen
  solchen Bericht ab (z. B. KW 53/2027, KW 0).
- **M03-R06:** Für deaktivierte Azubis entstehen keine neuen Berichte (AK-205, M02); bestehende bleiben.
- **M03-R07:** Ein Bericht hat genau die fünf Arbeitstage Mo–Fr seiner Woche (M01-R10). Fehlt einem bestehenden Bericht
  ein Tag, wird er ergänzt; vorhandene Tage und Inhalte bleiben unverändert.

**Tage beim Anlegen**

- **M03-R08:** Ein Tag liegt außerhalb der Ausbildung, wenn er vor dem Ausbildungsbeginn oder nach dem Ausbildungsende
  liegt; Beginn und Ende selbst liegen innerhalb. Solche Tage sind markiert (ausgegraut), brauchen weder Tagesart noch
  Text und lassen sich nicht ändern.
- **M03-R09:** Beim Anlegen bekommt ein Tag innerhalb der Ausbildung, der im eingestellten Bundesland Feiertag ist
  (M01), die Tagesart „Feiertag“ und den Merker „vorbelegt“. Alle anderen Tage haben noch keine Tagesart. Tage
  außerhalb der Ausbildung werden nie vorbelegt.
- **M03-R10:** Vorbelegungen werden später nicht neu berechnet. Eine Änderung des Bundeslands oder der Feiertagsliste
  ändert bestehende Berichte nicht, weder die Tagesart noch den Merker „vorbelegt“. Den Hinweis „Feiertag (vorbelegt)“
  zeigt M04 nach diesem Merker.

**Geänderter Ausbildungszeitraum** (ausgelöst von M02, AK-203)

- **M03-R11:** Nach einer Änderung von Beginn oder Ende werden fehlende fällige Wochen ergänzt (M03-R01). In Berichten
  mit offenem Status wird die Markierung „außerhalb der Ausbildung“ je Tag neu berechnet. Eingetragene Tagesarten und
  Texte bleiben immer erhalten, auch wenn der Tag nun außerhalb liegt.
- **M03-R12:** Ein Tag, der neu in die Ausbildung fällt, noch keine Tagesart hat und nach dem **aktuell** eingestellten
  Bundesland Feiertag ist, wird als „Feiertag“ vorbelegt und so gemerkt, wie beim Anlegen. Ein Tag mit Tagesart behält
  sie.
- **M03-R13:** Eingereichte und freigegebene Berichte sowie Berichte deaktivierter Azubis bleiben bei einer Änderung des
  Zeitraums unverändert. Berichte werden nie automatisch gelöscht.

**Offen und Übersicht**

- **M03-R14:** Ein Bericht ist **offen**, wenn sein Status offen ist („Entwurf“ oder „Abgelehnt“) und seine Woche nicht
  ganz außerhalb der Ausbildung liegt. Offen heißt: noch nicht eingereicht. Diese Definition gilt für Übersicht,
  Hervorhebung und Erinnerung (M08); wer einen Bericht bearbeiten darf, regeln M04 und M05 über den offenen Status.
- **M03-R15:** Eine Woche ganz außerhalb der Ausbildung wird aus dem aktuellen Ausbildungszeitraum berechnet und zählt
  nie als offen. Ist ihr Bericht unberührt, ist er ausgeblendet; sonst bleibt er sichtbar und ist als „außerhalb der
  Ausbildung“ markiert. Wandert der Beginn zurück (oder das Ende nach hinten), gilt die Woche wieder normal.
- **M03-R16:** Die Übersicht eines Azubis zeigt alle nicht ausgeblendeten Wochen mit Status, neueste zuerst. Vergangen
  offene Wochen sind deutlich hervorgehoben; die aktuelle Woche gilt nicht als vergangen.
- **M03-R17:** Ein Azubi sieht nur die eigene Übersicht. Ausbilder sehen für jeden Azubi dieselbe Liste, nur lesend,
  und je Azubi die Zahl der vergangen offenen Wochen.

## 4. Akzeptanzkriterien

Text aus `docs/01-spezifikation.md`, Kapitel 3; Prüffälle in `specs/pruefung/M03.json`.

| AK-ID | Kriterium (Kurzfassung) | Regeln | Prüffälle | Ebene |
| --- | --- | --- | --- | --- |
| AK-301 | Für jede Woche vom Ausbildungsbeginn bis zur aktuellen Woche existiert automatisch genau ein Bericht im Status „Entwurf“; Beispiel Beginn 01.09.2026, heute 06.10.2026 → KW 36–41. | M03-R01, M03-R07 | AK-301-01 bis AK-301-03 | Fachlogik |
| AK-302 | Für zukünftige Wochen gibt es keine Berichte; mit Beginn einer neuen Woche erscheint ihr Bericht automatisch. | M03-R02 | AK-302-01 bis AK-302-04 | Fachlogik |
| AK-303 | Nach dem Ausbildungsende entstehen keine Berichte mehr. | M03-R03 | AK-303-01 bis AK-303-04 | Fachlogik |
| AK-304 | Kein manuelles oder doppeltes Anlegen; pro Azubi und Woche immer genau ein Bericht. | M03-R04, M03-R05 | AK-304-01, AK-304-02 | Fachlogik |
| AK-305 | Tage außerhalb der Ausbildung (Beginn oder Ende mitten in der Woche) sind ausgegraut, brauchen weder Tagesart noch Text und sind nicht änderbar. | M03-R08, M03-R09, M03-R11, M03-R12 | AK-305-01 bis AK-305-09 | Fachlogik |
| AK-306 | Übersicht mit allen Wochen und Status, vergangene offene hervorgehoben; Ausbilder sehen dieselbe Liste lesend; Wochen ganz außerhalb der Ausbildung zählen nie als offen, unberührte sind ausgeblendet, andere markiert. | M03-R14 bis M03-R17 | AK-306-01 bis AK-306-17 | Fachlogik |

Alle AKs von M03 haben einen fachlichen Kern, der sich ohne Browser prüfen lässt; keine ist als `Ablauf, G3` markiert.
Was zusätzlich nur an Datenhaltung oder Oberfläche hängt (Eindeutigkeit bei gleichzeitigem Anlegen, Sortierung und
Hervorhebung in der Liste, Lesezugriff der Ausbilder), prüfen heute die Datenbank- und Browser-Tests (`docs/03`); als
neutrale Prüffälle folgt es mit dem Daten-Runner (Paket C) und den Ablauf-Fällen (G3).

Gehört M01, wird hier nur genutzt: **AK-404** (Feiertage vorbelegt; das Vorbelegen beim Anlegen regeln M03-R09 und
M03-R10, die Prüffälle AK-305-03 bis AK-305-05 zeigen es beim Anlegen).

## 5. Logisches Datenmodell

| Entität | Feld | Pflicht | Wertebereich | Bemerkung |
| --- | --- | --- | --- | --- |
| Wochenbericht | Azubi | ja | Person mit Rolle Azubi (M02) | |
| Wochenbericht | Woche | ja | Jahr und Nummer nach M01-R08 (1 bis 52 bzw. 53) | eindeutig je Azubi (M03-R04); eine Woche, die es nicht gibt, weist die Datenhaltung ab (M03-R05) |
| Wochenbericht | Status | ja | Entwurf, Eingereicht, Freigegeben, Abgelehnt | beim Anlegen „Entwurf“; Übergänge regelt M05 |
| Berichtstag | Bericht | ja | Wochenbericht | genau fünf je Bericht |
| Berichtstag | Datum | ja | Kalendertag Mo–Fr der Woche des Berichts | eindeutig je Bericht |
| Berichtstag | Tagesart | nein | Betrieb, Berufsschule, Urlaub, Krank, Feiertag (M04) | beim Anlegen leer oder „Feiertag“ (M03-R09) |
| Berichtstag | Tätigkeiten | ja | Text, beim Anlegen leer | Inhalt regelt M04 |
| Berichtstag | außerhalb der Ausbildung | ja | ja/nein | M03-R08, neu berechnet nach M03-R11 |
| Berichtstag | vorbelegt | ja | ja/nein | M03-R09, M03-R12; wird nie zurückgesetzt |

Genutzt aus M02 je Azubi: Ausbildungsbeginn (Kalendertag, Pflicht), Ausbildungsende (Kalendertag, optional, nicht vor
dem Beginn), aktiv ja/nein; einmal für die App: das eingestellte Bundesland. Aus M06: ob ein Bericht Statuswechsel hat
(für „unberührt“).

## 6. Schnittstellen

Angeboten (Formate in `specs/pruefung/format.md`, „Schnittstellen von M03“):

| Schnittstelle | Ergebnis | Regeln |
| --- | --- | --- |
| `faelligeWochen(beginn, ende)` mit „jetzt“ aus M01 | Wochen aufsteigend | M03-R01 bis M03-R04 |
| `berichtstageAnlegen(woche, beginn, ende, bundesland)` | fünf Tage Mo–Fr mit Datum, Tagesart (leer oder „Feiertag“) und Markierung „außerhalb“ \| `woche_ungueltig` \| `bundesland_unbekannt` | M03-R07 bis M03-R09 |
| `ausserhalbNeuBerechnen(tage, beginn, ende, bundesland)` | geänderte Tage: neue Markierung, ggf. vorbelegte Tagesart | M03-R11, M03-R12 |
| `istOffen(status)` | ja/nein (offener Status) | M03-R14 |
| `wocheEinordnen(woche, status, inhalt, historie, beginn, ende)` mit „jetzt“ aus M01 | ausgeblendet, außerhalb, offen, vergangen offen | M03-R14 bis M03-R16 |

Nicht als neutrale Schnittstelle, sondern als Ablauf der Plattform (Abschnitt 8): Berichte für einen Azubi oder alle
aktiven Azubis anlegen bzw. ergänzen, Übersicht eines Azubis lesen.

Genutzt: von M01 `jetzt()`, `aktuelleWoche`, `isoWoche`, `naechsteWoche`, `vergleicheWochen`, `arbeitstage`,
`istFeiertag`; von M02 Ausbildungszeitraum, Aktivität und Bundesland; von M06, ob es Statuswechsel gibt.

## 7. Ereignisse

M03 löst keine Ereignisse für andere Module aus; ein neu angelegter Bericht benachrichtigt niemanden. Ausgelöst wird
M03 durch:

- den Aufruf der Übersicht oder des Startbildschirms eines Azubis (Berichte bis heute ergänzen),
- das tägliche Anlegen für alle aktiven Azubis (Zeitplan nach Berliner Zeit),
- eine Änderung des Ausbildungszeitraums durch den Admin (M02, AK-203).

M08 liest für die Erinnerung, welche Wochen offen sind (M03-R14).

## 8. Anforderungen an die Plattform

- **Eindeutigkeit je Azubi und Woche** und je Bericht und Datum in der Datenhaltung, damit wiederholtes oder
  gleichzeitiges Anlegen keine Doppelten erzeugt (M03-R04).
- **Gültige Wochen in der Datenhaltung:** Wochennummer 1 bis 52, die 53 nur in Jahren mit 53 Wochen (M03-R05).
- **Anlegen in einer Transaktion:** Bericht und seine fünf Tage entstehen zusammen; niemand sieht einen Bericht ohne
  Tage. Wiederholtes Anlegen ist ohne Wirkung.
- **Täglicher Zeitplan** nach Berliner Zeit, der fehlende Wochen für alle aktiven Azubis anlegt; zusätzlich beim Aufruf
  der Übersicht.
- **„Jetzt“ nur aus der Uhr von M01**, für Tests stellbar.
- **Merker „vorbelegt“ gespeichert**, nicht aus dem aktuellen Bundesland berechnet (M03-R10).

## 9. Bestätigte Auslegungen

| Datum | Auslegung | Herkunft |
| --- | --- | --- |
| 06.10.2026 | Berichte entstehen nur automatisch ab Ausbildungsbeginn bis zur aktuellen Woche; manuelles Anlegen gibt es nicht. | `docs/01`, „Wochenbericht“ |
| 06.10.2026 | Tage außerhalb der Ausbildung sind keine Pflicht (AK-305) und auch nicht änderbar. | `docs/01`, Ergänzung Etappe 3 |
| 06.10.2026 | Feiertage werden beim Anlegen vorbelegt, nur innerhalb der Ausbildung; eine spätere Änderung des Bundeslands ändert bestehende Berichte nicht. | AK-404, Ergänzung Etappe 3 |
| 06.10.2026 | Geänderter Ausbildungszeitraum: fehlende Wochen ergänzen, in offenen Berichten aktiver Azubis „außerhalb“ neu berechnen, neu einbezogene Feiertage nach dem aktuellen Bundesland vorbelegen; nichts löschen, Inhalte bleiben. | AK-203, Ergänzung Etappe 3 |
| 06.10.2026 | Wochen ganz außerhalb der Ausbildung zählen nie als offen, auch nicht für die Erinnerung; unberührte leere Entwürfe ausgeblendet, Wochen mit Inhalt oder Historie markiert; wandert der Beginn zurück, erscheinen sie wieder. | AK-306, Ergänzung Etappe 3 |
| 06.10.2026 | Ausbilder sehen pro Azubi dieselbe Übersicht, nur lesend. | AK-306, Ergänzung Etappe 3 |
| 06.10.2026 | „Offen“ = Status „Entwurf“ oder „Abgelehnt“; zählt für die Erinnerung als nicht eingereicht. | `docs/01`, „Begriffe und bestätigte Annahmen“ |
| 06.10.2026 | Die aktuelle Woche bestimmt sich nach Europe/Berlin; das tägliche Anlegen läuft nach Berliner Zeit. | `docs/02-plan.md` |
| 12.10.2026 | AK-301 bis AK-304 gehören M03; M01 liefert die Hilfsfunktionen. | Entscheidung Chris, Plan G1 |
| 12.10.2026 | Die Definition „offen“ steht zentral in M03; M05 und M08 verweisen darauf. | Entscheidung Chris, Plan G2 |
| 12.10.2026 | Die Datenhaltung weist KW 53 in Jahren mit 52 Wochen ab (vorher nur 1 bis 53). Erledigt mit G2. | Entscheidung Chris, Plan G2 (E4) |

## 10. Offene Punkte

- [ ] **Bitte bestätigen:** Merker „vorbelegt“ je Tag (M03-R09, M03-R10, M03-R12). Ohne ihn lässt sich der Hinweis
      „Feiertag (vorbelegt)“ nach einem Bundeslandwechsel nicht richtig zeigen (E4). Für Berichte, die vor der Einführung
      entstanden sind, gilt als vorbelegt, wer innerhalb der Ausbildung heute „Feiertag“ hat (Näherung).
- [ ] **Bitte bestätigen:** Liegt der Ausbildungsbeginn auf einem Samstag oder Sonntag, ist die Woche des Beginns fällig
      (M03-R01), obwohl alle ihre Arbeitstage davor liegen. Ihr Bericht ist dann unberührt und ganz außerhalb, also
      ausgeblendet (M03-R15). Vorschlag: so lassen; es entsteht nichts Sichtbares.
- [ ] Der Daten-Runner (Paket C) übernimmt die Prüfungen an der Datenhaltung (Eindeutigkeit, gültige Wochen); die
      Ablauf-Fälle (G3) Sortierung, Hervorhebung und Lesezugriff der Ausbilder in der Übersicht.

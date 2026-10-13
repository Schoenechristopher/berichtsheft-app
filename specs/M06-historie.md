# M06 Historie

Stand: 13.10.2026 · Status: **Entwurf zur Freigabe** (Etappe G2) · @Chris

Fach-Spec nach `specs/vorlage-fach-spec.md`. Sie nennt keine Technik; wie die TypeScript-App die Regeln heute umsetzt,
steht in `specs/code-landkarte.md`, Abschnitt M06.

## 1. Zweck und Abgrenzung

M06 hält fest, was mit einem Wochenbericht nach dem Erfassen geschehen ist, und zeigt es an:

- **Historie:** alle Statuswechsel eines Berichts mit Zeitpunkt, Person, altem und neuem Status, Prüfrunde und
  Begründung einer Rücknahme.
- **Kommentare früherer Runden:** Gesamt- und Tageskommentare jeder Ablehnung bleiben erhalten und ihrer Runde
  zugeordnet.
- **Darstellung nach Prüfrunden:** Bezeichnung jedes Eintrags, Gruppierung nach Runde, Reihenfolge.
- **Unveränderlichkeit:** Niemand ändert oder löscht einen Eintrag, auch nicht an der Fachlogik vorbei.

Nicht in M06:

- Wann ein Statuswechsel erlaubt ist, welche Runde er bekommt und was er schreibt (M05, M05-R02, M05-R18, M05-R22).
- Die Rückmeldung oben auf der Berichtsseite (letzte Ablehnung bzw. Rücknahme, M05-R16, AK-606); M06 liefert dafür nur
  die gespeicherten Einträge.
- Wer einen Bericht sehen darf (M02, AK-103 bis AK-105) und wann eine Person endgültig gelöscht werden darf (M02,
  AK-206); M06 regelt nur, was das Löschen mit der Historie macht.
- Freigabevermerk im PDF (M07); das PDF enthält keine Historie.
- Aussehen der Historie auf der Berichtsseite (M09).

## 2. Begriffe

Zentrale Begriffe stehen in `specs/00-uebersicht.md`; Status, Statuswechsel, Prüfrunde, Gesamt- und Tageskommentar und
Begründung in M05. Für M06 gilt zusätzlich:

| Begriff | Bedeutung |
| --- | --- |
| Historie | alle Statuswechsel und Kommentare eines Berichts, in der Reihenfolge ihres Entstehens |
| Historieneintrag | ein Statuswechsel oder ein Kommentar der Historie |
| Bezeichnung | Name eines Statuswechsels in der Historie, z. B. „Erneut eingereicht“ oder „Freigabe zurückgenommen“ |
| Endgültiges Löschen | Löschen einer Person mit allen ihren Daten (M02, AK-206); einziger Weg, auf dem Historie verschwindet |

## 3. Regeln

**Was festgehalten wird**

- **M06-R01:** Jeder gelungene Statuswechsel steht genau einmal in der Historie des Berichts: Einreichen (auch erneut),
  Zurückziehen, Freigabe, Ablehnung und Rücknahme einer Freigabe, jeweils mit altem und neuem Status, Person, Datum und
  Uhrzeit, Prüfrunde und bei der Rücknahme der Begründung (geschrieben nach M05-R22). Ein gescheiterter Statuswechsel
  steht nicht in der Historie.
- **M06-R02:** Die Einträge stehen in der Reihenfolge ihres Entstehens, auch wenn zwei Einträge denselben Zeitpunkt
  haben.
- **M06-R03:** Datum und Uhrzeit sind der Zeitpunkt aus der Uhr von M01. Angezeigt wird in Berliner Zeit, auch über die
  Zeitumstellung hinweg, z. B. „07.10.2026, 14:05 Uhr“.
- **M06-R04:** Kommentare und Begründungen früherer Runden bleiben erhalten, auch nach erneutem Einreichen, weiteren
  Ablehnungen, Freigabe und Rücknahme. Jeder Kommentar gehört zur Runde der Ablehnung, in der er entstand; eine
  Begründung zum Statuswechsel der Rücknahme und damit zur Runde der Freigabe (M05-R18).

**Darstellung**

- **M06-R05:** Jeder Statuswechsel hat eine feste Bezeichnung:

  | von | nach | Bezeichnung |
  | --- | --- | --- |
  | Entwurf | Eingereicht | Eingereicht |
  | Abgelehnt | Eingereicht | Erneut eingereicht |
  | Eingereicht | Entwurf | Zurückgezogen |
  | Eingereicht | Freigegeben | Freigegeben |
  | Eingereicht | Abgelehnt | Abgelehnt |
  | Freigegeben | Abgelehnt | Freigabe zurückgenommen |

  Neben der Bezeichnung stehen Person, Datum und Uhrzeit und der neue Status; bei „Freigabe zurückgenommen“ die
  Begründung.
- **M06-R06:** Die Historie wird nach Prüfrunden gruppiert, die neueste Runde zuerst. Innerhalb einer Runde stehen die
  Statuswechsel in ihrer Reihenfolge (M06-R02), danach der Gesamtkommentar und dann die Tageskommentare von Montag bis
  Freitag. Eine Runde ohne Kommentare zeigt nur ihre Statuswechsel. Ein Bericht ohne Statuswechsel hat eine leere
  Historie.
- **M06-R07:** Die Historie sieht jede Person, die den Bericht sehen darf (M02-R09 bis M02-R11, AK-103 bis AK-105), vollständig
  mit allen Runden, solange der Bericht besteht.

**Unveränderlichkeit**

- **M06-R08:** Niemand kann einen Historieneintrag bearbeiten oder löschen, auch kein Ausbilder; es gibt dafür keine
  Aktion. Die Datenhaltung weist Ändern und Löschen eines Statuswechsels oder Kommentars zusätzlich selbst ab, auch wenn
  jemand an der Fachlogik vorbei schreibt (`historie_unveraenderlich`). Das gilt für jedes Feld eines Eintrags.
- **M06-R09:** Ein Bericht mit Historie lässt sich nicht einzeln löschen (`historie_unveraenderlich`); sonst verschwände
  seine Historie mit ihm.
- **M06-R10:** Nur das endgültige Löschen eines Azubis (M02-R21, AK-206) entfernt seine Berichte samt Historie, in einem
  Schritt. Kommt eine Person in der Historie von Berichten anderer Azubis vor, lässt sie sich nicht löschen, nur
  deaktivieren (M02-R22, `fremde_historie`); ihre Einträge bleiben dort erhalten.
- **M06-R11:** Eine abgewiesene Änderung ändert nichts: Die Historie bleibt, wie sie war, und weitere Statuswechsel nach
  M05 sind danach wie gewohnt möglich.

## 4. Akzeptanzkriterien

Text aus `docs/01-spezifikation.md`, Kapitel 8; Prüffälle in `specs/pruefung/M06.json`.

| AK-ID | Kriterium (Kurzfassung) | Regeln | Prüffälle | Ebene |
| --- | --- | --- | --- | --- |
| AK-801 | Jeder Bericht hat eine Historie aller Statuswechsel (Einreichen, Zurückziehen, Freigabe, Ablehnung, Rücknahme) mit Datum, Uhrzeit, Person und neuem Status. | M06-R01 bis M06-R03, M06-R05, M06-R06 | AK-801-01 bis AK-801-04 | Daten |
| AK-802 | Kommentare und Begründungen früherer Runden bleiben erhalten und sind ihrer Runde zugeordnet. | M06-R04, M06-R06 | AK-802-01 bis AK-802-04 | Daten |
| AK-803 | Historieneinträge kann niemand bearbeiten oder löschen; nur das endgültige Löschen der Person entfernt sie. Gilt für Statuswechsel und Kommentare; die Datenhaltung weist ihr Ändern und Löschen ab. | M06-R08 bis M06-R11 | AK-803-01 bis AK-803-04 | Daten |

Keine AK von M06 ist nur im Browser prüfbar; es gibt deshalb keine Markierung `Ablauf, G3`. Die Fälle der Ebene
`fachlogik` (`historieGruppieren`) prüfen Bezeichnung, Gruppierung und Reihenfolge ohne Speicher; die Fälle der Ebene
`daten` prüfen den gespeicherten Bestand und was die Berichtsseite daraus zeigt (`historie_lesen`). Die Darstellung
selbst (Aussehen, Platz auf der Seite) prüfen heute die Browser-Tests und ab G3 die Ablauf-Fälle.

**AK-803, Kaskade beim endgültigen Löschen (M06-R10):** Kein neutraler Fall prüft, dass das endgültige Löschen des
Azubis seine Berichte samt Historie entfernt, weil ein Daten-Fall einen danach fehlenden Bericht nicht beschreiben kann
(`format.md`: der Bestand nennt nur vorhandene Berichte). Belegt ist das heute durch Tests der TypeScript-App gegen die
Datenhaltung (Code-Landkarte, Belege); dass eine Person mit Einträgen in fremder Historie nicht gelöscht wird, prüfen
die Fälle von M02 (`loeschenPruefen`, `fremde_historie`). Siehe Abschnitt 10.

Gehört M05, wird hier nur genutzt: Statusmodell, Prüfrunde und was ein Statuswechsel schreibt (M05-R02, M05-R18,
M05-R22), die Rückmeldung (AK-606). Gehört M02: Sichtbarkeit und endgültiges Löschen (AK-103 bis AK-105, AK-206).

## 5. Logisches Datenmodell

| Entität | Feld | Pflicht | Wertebereich | Bemerkung |
| --- | --- | --- | --- | --- |
| Statuswechsel | Bericht | ja | Wochenbericht | |
| Statuswechsel | alter Status | ja | Status | beim ersten Einreichen „Entwurf“ |
| Statuswechsel | neuer Status | ja | Status | ein erlaubter Übergang nach M05-R02 |
| Statuswechsel | Person | ja | Person | wer den Wechsel ausgelöst hat; verhindert das Löschen dieser Person, solange der Bericht eines anderen Azubis besteht |
| Statuswechsel | Zeitpunkt | ja | Zeitpunkt | „jetzt“ aus M01; Anzeige in Berliner Zeit |
| Statuswechsel | Prüfrunde | ja | ganze Zahl ab 1 | nach M05-R18 |
| Statuswechsel | Begründung | nein | Text, 1 bis 5.000 Zeichen | nur bei der Rücknahme einer Freigabe |
| Statuswechsel | Reihenfolge | ja | fortlaufend je Bericht | eindeutige Reihenfolge auch bei gleichem Zeitpunkt (M06-R02) |
| Kommentar | Bericht | ja | Wochenbericht | |
| Kommentar | Prüfrunde | ja | ganze Zahl ab 1 | Runde der Ablehnung |
| Kommentar | Tag | nein | ein Tag des Berichts | leer = Gesamtkommentar |
| Kommentar | Person | ja | Person | der ablehnende Ausbilder |
| Kommentar | Zeitpunkt | ja | Zeitpunkt | wie beim Statuswechsel der Ablehnung |
| Kommentar | Text | ja | Text, 1 bis 5.000 Zeichen, nicht nur Leerraum | Zeilenumbrüche einheitlich (M05-R15) |

Statuswechsel und Kommentare werden nur angelegt (durch M05), nie geändert oder gelöscht (M06-R08). Sie verschwinden nur
mit ihrem Bericht beim endgültigen Löschen des Azubis (M06-R10).

## 6. Schnittstellen

Angeboten (Formate und Fehlercodes in `specs/pruefung/format.md`, „Schnittstellen und Aktionen von M06“):

| Schnittstelle | Ergebnis | Regeln |
| --- | --- | --- |
| `historieGruppieren(statuswechsel, kommentare)` | Runden, neueste zuerst, je Runde Einträge mit Bezeichnung, neuem Status, Person, Zeitpunkt, Begründung, dazu Gesamt- und Tageskommentare | M06-R02, M06-R05, M06-R06 |

Als Abläufe der Plattform mit gespeichertem Bestand (Daten-Fälle, Aktionen in `format.md`): Historie lesen, wie die
Berichtsseite sie zeigt; Schreibversuche an der Fachlogik vorbei (Eintrag ändern, Eintrag löschen, Bericht löschen),
die abgewiesen werden müssen.

Genutzt:

- M01: Zeitpunkt in Berliner Zeit.
- M02: Sichtbarkeit des Berichts (`darfBerichtSehen`), endgültiges Löschen einer Person, Prüfung „fremde Historie“.
- M05: Statuswechsel und Kommentare entstehen nur dort (M05-R22).

## 7. Ereignisse

M06 löst keine Ereignisse aus. Es reagiert auf die Ereignisse von M05 (Bericht eingereicht, zurückgezogen, freigegeben,
abgelehnt, Freigabe zurückgenommen): Für jedes entsteht in derselben Transaktion genau ein Statuswechsel, bei
„abgelehnt“ zusätzlich Gesamt- und Tageskommentare. M05 nutzt die Historie für die Rückmeldung und die Zahl der
Einreichungen, M07 die letzte Freigabe für den Freigabevermerk, M02 die Frage, ob eine Person in fremder Historie
vorkommt.

## 8. Anforderungen an die Plattform

- **Historie technisch unveränderlich, auch an der Fachlogik vorbei:** Die Datenhaltung selbst weist jedes Ändern und
  Löschen eines Statuswechsels oder Kommentars ab, nicht nur die Oberfläche oder die Fachlogik. Ein direkter
  Schreibversuch (z. B. aus einem Werkzeug oder einem fehlerhaften Programmteil) scheitert ebenso.
- **Bericht mit Historie nicht einzeln löschbar:** Auch das Löschen des ganzen Berichts weist die Datenhaltung ab,
  solange sein Azubi besteht.
- **Einzige Ausnahme Kaskade:** Das endgültige Löschen eines Azubis entfernt seine Berichte, deren Tage, Statuswechsel
  und Kommentare in einem Schritt. Kommt die Person in fremder Historie vor, weist die Datenhaltung ihr Löschen ab.
- **Fester Fehlergrund:** Eine Abweisung nach M06-R08 und M06-R09 hat einen festen Grund, an dem die Plattform sie
  erkennt, unabhängig vom Meldungstext (für die Prüffälle: `historie_unveraenderlich`).
- **Reihenfolge:** Jeder Statuswechsel trägt ein Merkmal, das die Reihenfolge auch bei gleichem Zeitpunkt festlegt.
- **Zeitpunkte** werden unabhängig von der Zeitzone des Servers gespeichert und in Berliner Zeit angezeigt; „jetzt“ nur
  aus der Uhr von M01.
- **Eine Transaktion** mit dem Statuswechsel von M05 (M05, Abschnitt 8).

## 9. Bestätigte Auslegungen

| Datum | Auslegung | Herkunft |
| --- | --- | --- |
| 06.10.2026 | Unveränderlich sind Statuswechsel und Kommentare; die Datenhaltung weist ihr Ändern und Löschen ab. | AK-803, Ergänzung Etappe 4 |
| 06.10.2026 | Jede Einreichung beginnt eine neue Prüfrunde, auch nach dem Zurückziehen; Ablehnung, Freigabe, Rücknahme und Kommentare gehören zur laufenden Runde, die Rücknahme also zur Runde der Freigabe. | `docs/01`, „Statusmodell“, Etappe 4 |
| 06.10.2026 | Jeder Wechsel landet mit Person und Zeitpunkt in der Historie; die Historie zeigt alle Statuswechsel und Kommentare nach Prüfrunde. | `docs/01`, „Statusmodell“; `docs/02`, „Regeln und Abläufe“, Etappe 4 |
| 06.10.2026 | Endgültiges Löschen entfernt Person, Berichte und deren Historie per Kaskade; kommt die Person in der Historie fremder Berichte vor, lässt sie sich nur deaktivieren, die Datenhaltung weist das Löschen zusätzlich ab. | AK-206, Ergänzung Etappe 2; `docs/02`, „Löschen und Historie“ |
| 06.10.2026 | Statuswechsel und Kommentare: Datenmodell mit Prüfrunde, Tag (leer = Gesamtkommentar) und fester Reihenfolge. | `docs/02`, „Datenmodell“, Etappe 4 |

## 10. Offene Punkte

- [ ] **Bitte bestätigen:** neuer Fehlercode `historie_unveraenderlich`, die Schnittstelle `historieGruppieren` und die
      Aktionen `historie_lesen`, `historie_aendern`, `historie_loeschen`, `bericht_loeschen` in `format.md`
      („Schnittstellen und Aktionen von M06“). Die drei Schreibaktionen sind bewusst Versuche an der Fachlogik vorbei
      und haben im Erfolgsfall kein fachliches Ergebnis.
- [ ] **Bitte bestätigen:** Die TypeScript-App erkennt die Abweisung über einen festen Fehlercode der Datenhaltung
      statt über den Meldungstext (Code-Landkarte, M06). Dafür meldet die Datenhaltung nach dieser Etappe einen eigenen
      Code; Verhalten und Meldungstexte bleiben gleich.
- [ ] Die Kaskade beim endgültigen Löschen (M06-R10) hat keinen neutralen Fall, weil das Format einen nach dem Fall
      fehlenden Bericht nicht beschreibt. Vorschlag für G3: im Daten-Fall-Format ein Bestandsmerkmal „Bericht gibt es
      nicht mehr“ zulassen und dann einen Fall `person_loeschen` ergänzen.
- [ ] Ablauf-Fälle für die Darstellung der Historie auf der Berichtsseite folgen in G3 (M09).

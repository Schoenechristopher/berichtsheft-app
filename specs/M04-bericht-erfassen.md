# M04 Bericht erfassen

Stand: 12.10.2026 · Status: **Entwurf zur Freigabe** (Etappe G2) · @Chris

Fach-Spec nach `specs/vorlage-fach-spec.md`. Sie nennt keine Technik; wie die TypeScript-App die Regeln heute umsetzt,
steht in `specs/code-landkarte.md`, Abschnitt M04.

## 1. Zweck und Abgrenzung

M04 regelt, was ein Azubi in einem Wochenbericht erfasst und wie es gespeichert wird:

- **Inhalt je Tag:** eine Tagesart aus genau fünf Werten und ein Freitext „Tätigkeiten“; keine weiteren Felder.
- **Vorbelegte Tagesart ändern** und der Hinweis „Feiertag (vorbelegt)“.
- **Entwurf speichern:** ausdrücklich, auch unvollständig, Text unverändert bis 5.000 Zeichen je Tag.
- **Ungespeicherte Änderungen:** Warnung beim Verlassen der Seite.

Nicht in M04:

- Welche Berichte und Tage es gibt, welche Tage außerhalb der Ausbildung liegen und was beim Anlegen vorbelegt wird
  (M03). Die Feiertage selbst und AK-404 gehören M01.
- Wer einen Bericht sehen und bearbeiten darf (M02: AK-103, AK-105, AK-204) und in welchem Status (M05: offener Status
  nach M03-R14, schreibgeschützt nach dem Einreichen).
- Pflichtangaben beim Einreichen (M05, AK-501, AK-502): Erst dort muss jeder Tag eine Tagesart und bei Betrieb oder
  Berufsschule einen Text haben.
- Der Hinweis vor dem PDF-Download mit ungespeicherten Änderungen (M07, AK-901); er nutzt dieselbe Erkennung
  ungespeicherter Änderungen.
- Aussehen von Auswahl, Feldern und Zeichenzähler (M09).

## 2. Begriffe

Zentrale Begriffe stehen in `specs/00-uebersicht.md`, „offen“ und „vorbelegt“ in M03. Für M04 gilt zusätzlich:

| Begriff | Bedeutung |
| --- | --- |
| Tagesart | eine von genau fünf: Betrieb, Berufsschule, Urlaub, Krank, Feiertag; „keine Tagesart“ ist im Entwurf erlaubt |
| Tätigkeiten | Freitext je Tag, höchstens 5.000 Zeichen |
| Zeichen | ein Unicode-Zeichen, wie Nutzer es sehen (ein Emoji ist eins); ein Zeilenumbruch zählt als eins |
| Speichern | ausdrückliche Aktion des Azubis; sie übernimmt die Eingaben aller Tage auf einmal oder gar nicht |
| Ungespeicherte Änderung | Eingabe im Bericht, die vom zuletzt gespeicherten Stand abweicht |

## 3. Regeln

**Inhalt eines Berichts**

- **M04-R01:** Ein Bericht zeigt seine fünf Tage Mo–Fr (M03-R07) mit Wochentag und Datum, je Tag eine Auswahl der
  Tagesart und ein Freitextfeld „Tätigkeiten“.
- **M04-R02:** Zur Auswahl stehen genau fünf Tagesarten in dieser Reihenfolge: Betrieb, Berufsschule, Urlaub, Krank,
  Feiertag. Jeder andere Wert wird beim Speichern abgewiesen, mit Meldung am Tag (`tagesart_unbekannt`).
- **M04-R03:** Weitere Felder gibt es weder je Tag noch je Bericht, insbesondere keine für Stunden, Abteilung oder
  Lernfeld.

**Vorbelegte Tagesart**

- **M04-R04:** Eine vorbelegte Tagesart (M03-R09) lässt sich ändern wie jede andere, z. B. von „Feiertag“ auf
  „Berufsschule“ oder auf „keine Tagesart“.
- **M04-R05:** Bei einem vorbelegten Tag heißt die Auswahl „Feiertag“ „Feiertag (vorbelegt)“. Maßgeblich ist der Merker
  „vorbelegt“ aus M03, nicht das heute eingestellte Bundesland und nicht die heute gewählte Tagesart: Der Hinweis bleibt
  nach einem Bundeslandwechsel und nachdem der Azubi die Tagesart geändert hat; ein Tag, der erst nach dem Wechsel
  Feiertag wäre, bekommt ihn nicht.

**Speichern**

- **M04-R06:** Gespeichert wird ausdrücklich per „Speichern“. Ein Entwurf darf unvollständig sein (ohne Tagesart, ohne
  Text); Pflicht wird beides erst beim Einreichen (M05). Nach Ab- und erneuter Anmeldung ist der gespeicherte Inhalt
  unverändert.
- **M04-R07:** Eine Eingabe, die nicht mitgeschickt wird, lässt den gespeicherten Wert unverändert. Eine geleerte
  Tagesart wird als „keine Tagesart“ gespeichert. Tage, deren Werte gleich bleiben, werden nicht geändert.
- **M04-R08:** Tage außerhalb der Ausbildung werden beim Speichern nicht geändert, auch wenn Eingaben für sie kommen
  (M03-R08).
- **M04-R09:** „Tätigkeiten“ wird unverändert gespeichert und angezeigt: Umlaute, Sonderzeichen, Leerzeichen am Anfang
  und Ende, Leerzeilen. Einzig Zeilenumbrüche werden einheitlich gespeichert (jede Form als ein Umbruch). Es wird nichts
  gekürzt oder abgeschnitten.
- **M04-R10:** Je Tag sind höchstens 5.000 Zeichen erlaubt, mindestens 2.000 müssen möglich sein. Ein längerer Text wird
  abgewiesen, mit Meldung am Feld, die nennt, um wie viele Zeichen zu kürzen ist (`text_zu_lang`).
- **M04-R11:** Ist eine Eingabe ungültig (M04-R02, M04-R10), wird nichts gespeichert. Jede Meldung steht am
  betroffenen Tag und Feld; ein Tag kann beide Meldungen haben.
- **M04-R12:** Speichern darf nur der eigene, aktive Azubi und nur bei offenem Status (Rechte: M02 und M05). Die
  Prüfung geschieht bei jedem Speichern auf dem Server, nicht nur in der Oberfläche. Speichern und ein gleichzeitiger
  Statuswechsel desselben Berichts schließen sich aus: Der Statuswechsel übergeht keine Speicherung und umgekehrt.

**Ungespeicherte Änderungen**

- **M04-R13:** Wer die Seite eines Berichts mit ungespeicherten Änderungen verlässt, wird vorher gewarnt und kann
  bleiben. Das gilt für Links und Formulare der App (z. B. „Abmelden“), Schließen und Neuladen sowie Zurück und Vor im
  Browser. Nach dem Speichern gibt es keine Warnung mehr.

## 4. Akzeptanzkriterien

Text aus `docs/01-spezifikation.md`, Kapitel 4; Prüffälle in `specs/pruefung/M04.json`.

| AK-ID | Kriterium (Kurzfassung) | Regeln | Prüffälle | Ebene |
| --- | --- | --- | --- | --- |
| AK-401 | Jeder Bericht zeigt Mo–Fr mit Datum, pro Tag eine Auswahl der Tagesart und ein Freitextfeld „Tätigkeiten“. | M04-R01 | AK-401-01, AK-401-02 | Fachlogik |
| AK-402 | Zur Auswahl stehen genau: Betrieb, Berufsschule, Urlaub, Krank, Feiertag. | M04-R02, M04-R11 | AK-402-01 bis AK-402-04 | Fachlogik |
| AK-403 | Felder für Stunden, Abteilung oder Lernfeld gibt es nicht. | M04-R03 | AK-403-01, AK-403-02 | Ablauf |
| AK-405 | Der Azubi kann eine vorbelegte Tagesart ändern, z. B. von „Feiertag“ auf „Berufsschule“. | M04-R04, M04-R05 | AK-405-01, AK-405-02 | Fachlogik |
| AK-406 | Ein Entwurf lässt sich ausdrücklich speichern, auch unvollständig, und später unverändert weiterbearbeiten, auch nach Ab- und erneuter Anmeldung. | M04-R06, M04-R07 | AK-406-01 bis AK-406-03 | Fachlogik |
| AK-407 | Umlaute, Zeilenumbrüche und lange Texte (mindestens 2.000 Zeichen) unverändert; höchstens 5.000 Zeichen je Tag mit Meldung am Feld; Zeilenumbrüche einheitlich. | M04-R09 bis M04-R11 | AK-407-01 bis AK-407-08 | Fachlogik |
| AK-408 | Wer die Seite mit ungespeicherten Änderungen verlässt, wird gewarnt (Links, Formulare, Schließen, Neuladen, Zurück und Vor). | M04-R13 | AK-408-01 bis AK-408-07 | Ablauf |

Begründung der Ebene `Ablauf` (Ablauf-Fälle seit G3, `specs/pruefung/format.md`, „Aufbau eines Ablauf-Falls“):

- **AK-403:** Es geht darum, welche Felder die Oberfläche anbietet; eine Schnittstelle kann das Fehlen eines Feldes
  nicht zeigen, weil der Adapter nur die Felder abbildet, die er kennt.
- **AK-408:** Die Warnung entsteht nur im Browser beim Verlassen der Seite; es gibt keine Fachlogik dahinter.

AK-401 ist als Fachlogik geprüft, soweit es einen fachlichen Kern hat (genau die Tage Mo–Fr mit Datum, je Tag eine
Tagesart, auch über den Jahreswechsel); dass Auswahl und Freitextfeld angezeigt werden, prüfen heute die Browser-Tests
und ab G3 die Ablauf-Fälle.

Gehört M01, wird hier nur genutzt: **AK-404** (Feiertage vorbelegt). Der Hinweis „Feiertag (vorbelegt)“ (M04-R05) folgt
dem Merker aus M03.

## 5. Logisches Datenmodell

M04 ändert nur die Inhalte der Berichtstage aus M03:

| Entität | Feld | Pflicht | Wertebereich | Bemerkung |
| --- | --- | --- | --- | --- |
| Berichtstag | Tagesart | nein | Betrieb, Berufsschule, Urlaub, Krank, Feiertag | leer erlaubt bis zum Einreichen (M05) |
| Berichtstag | Tätigkeiten | ja | Text mit 0 bis 5.000 Zeichen, Zeilenumbrüche einheitlich | leerer Text erlaubt bis zum Einreichen (M05) |
| Berichtstag | vorbelegt | ja | ja/nein | nur gelesen (M03-R09); bestimmt den Hinweis nach M04-R05 |
| Berichtstag | außerhalb der Ausbildung | ja | ja/nein | nur gelesen; solche Tage sind nicht änderbar (M04-R08) |

Weitere Felder gibt es nicht (M04-R03).

## 6. Schnittstellen

Angeboten (Formate in `specs/pruefung/format.md`, „Schnittstellen von M04“):

| Schnittstelle | Ergebnis | Regeln |
| --- | --- | --- |
| `tagesarten()` | die fünf Tagesarten in fester Reihenfolge | M04-R02 |
| `tageSpeichern(tage, eingaben)` | Tage, deren Werte sich ändern, mit neuer Tagesart und neuem Text \| `tage_ungueltig` mit `tagesart_unbekannt` bzw. `text_zu_lang` je Tag | M04-R02, M04-R04, M04-R06 bis M04-R11 |

Nicht als neutrale Schnittstelle, sondern als Ablauf der Plattform: einen Bericht mit seinen Tagen zum Bearbeiten
lesen, speichern mit Rechte- und Statusprüfung (M04-R12), Warnung beim Verlassen (M04-R13).

Genutzt: von M03 die Tage eines Berichts mit Markierung „außerhalb“ und Merker „vorbelegt“ sowie `berichtstageAnlegen`
(für AK-401); von M02 und M05, ob die Person den Bericht in seinem Status bearbeiten darf.

## 7. Ereignisse

Keine. Speichern ändert keinen Status, schreibt keine Historie und benachrichtigt niemanden; das tun erst die
Statuswechsel in M05.

## 8. Anforderungen an die Plattform

- **Text unverändert speichern:** Die Datenhaltung speichert Unicode vollständig und ohne Kürzen; nur die Form der
  Zeilenumbrüche wird vereinheitlicht.
- **Alles oder nichts:** Die Eingaben aller Tage eines Berichts werden in einem Schritt gespeichert oder gar nicht.
- **Sperre gegen gleichzeitigen Statuswechsel:** Während gespeichert wird, wartet ein Statuswechsel desselben Berichts
  (und umgekehrt); geprüft wird der Status, der beim Speichern tatsächlich gilt.
- **Prüfung auf dem Server:** Rechte, Status, Tagesart und Länge prüft der Server bei jedem Speichern, unabhängig von
  der Oberfläche.
- **Warnung beim Verlassen:** Die Oberfläche erkennt ungespeicherte Änderungen und fängt Verlassen über Links,
  Formulare, Schließen, Neuladen sowie Zurück und Vor ab.

## 9. Bestätigte Auslegungen

| Datum | Auslegung | Herkunft |
| --- | --- | --- |
| 06.10.2026 | Gespeichert wird ausdrücklich per „Speichern“; ein Entwurf darf unvollständig sein, auch ohne Tagesart. | AK-406, Ergänzung Etappe 3 |
| 06.10.2026 | Obergrenze 5.000 Zeichen je Tag (Unicode-Zeichen, Zeilenumbruch zählt als eins), Meldung am Feld; Zeilenumbrüche einheitlich, sonst bleibt der Text exakt. | AK-407, Präzisierung Etappe 3 |
| 06.10.2026 | Gewarnt wird bei Links und Formularen der App (z. B. „Abmelden“), beim Schließen und Neuladen sowie bei Zurück und Vor im Browser. | AK-408, Präzisierung Etappe 3 |
| 06.10.2026 | Der Azubi kann eine vorbelegte Tagesart ändern; Pflicht wird die Tagesart erst beim Einreichen. | `docs/01`, „Wochenbericht“ |
| 06.10.2026 | Exportiert wird der zuletzt gespeicherte Stand; mit ungespeicherten Änderungen erscheint vorher ein Hinweis (Regel von M07). | AK-901, Ergänzung Etappe 5 |
| 12.10.2026 | Der Hinweis „Feiertag (vorbelegt)“ richtet sich nach dem beim Anlegen gültigen Bundesland, nicht nach dem aktuellen. Erledigt mit G2. | Entscheidung Chris, Plan G2 (E4) |

## 10. Offene Punkte

- [ ] **Bitte bestätigen:** Der Hinweis „Feiertag (vorbelegt)“ bleibt, auch nachdem der Azubi die Tagesart geändert hat
      (M04-R05), damit erkennbar bleibt, dass der Tag ein Feiertag war. So verhielt sich die App schon vor G2.
- [ ] Ein Ablauf-Fall für AK-401 (Anzeige) folgt in G3; AK-403 und AK-408 haben seit G3 Ablauf-Fälle (AK-403-01, AK-403-02,
      AK-408-01 bis AK-408-07).

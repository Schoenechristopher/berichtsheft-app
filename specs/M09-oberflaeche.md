# M09 Oberfläche

Stand: 13.10.2026 · Status: **Entwurf zur Freigabe** (Etappe G3) · @Chris

Fach-Spec nach `specs/vorlage-fach-spec.md`. Sie nennt keine Technik; wie die TypeScript-App die Oberfläche heute
umsetzt, steht in `specs/code-landkarte.md`, Abschnitt M09. Maßgeblich für Aussehen und Verhalten bleibt
`docs/05-ui-spezifikation.md` (Tokens, Komponenten, Seiten); diese Spec macht daraus technikneutrale, einzeln
überprüfbare Regeln.

## 1. Zweck und Abgrenzung

M09 regelt, wie die Fachregeln der Module M01 bis M08 den Nutzern gezeigt und bedienbar gemacht werden:

- **Rahmen und Navigation:** Menüpunkte je Rolle, Glocke, Konto, Zurück-Navigation.
- **Hauptseiten:** Start Azubi, Woche erfassen, Prüfansicht, Einstellungen.
- **Statusdarstellung:** Status-Chip mit Symbol und Text.
- **Darstellung:** System, Hell, Dunkel.
- **Barrierefreiheit, Seitentitel, Lade- und Leerzustände, Breiten** 1024, 1280 und 375 px.

Nicht in M09:

- Was die Fachregeln entscheiden (Status, Pflichtangaben, Rechte, Wochen, Erinnerung): M02 bis M08. M09 zeigt ihr
  Ergebnis und löst sie aus, ändert sie aber nicht.
- Farbwerte, Schriften, Abstände: stehen in `docs/05` und sind Layout, nicht Verhalten.
- PDF, E-Mail-Texte und Anmeldeseite des Identity Providers (`docs/05`, „Gilt nicht für“).
- Die Anzahl ungelesener Benachrichtigungen (M08, AK-1015); M09 zeigt sie nur an.

## 2. Begriffe

Allgemeine Begriffe stehen in `specs/00-uebersicht.md`, „offen“ und „überfällig“ in M03.

| Begriff | Bedeutung |
| --- | --- |
| Rahmen | Kopfzeile, Seitenleiste bzw. Menü und Inhaltsbereich, die jede Seite nach der Anmeldung umgibt |
| Seitenleiste | feste Menüspalte ab 1024 px Breite; darunter öffnet ein Menüknopf dasselbe Menü als Schublade |
| Glocke | Knopf in der Kopfzeile mit Zähler ungelesener App-Benachrichtigungen |
| Status-Chip | kleines Etikett mit Symbol und Text für einen der vier Status; „Überfällig“ ist ein Hinweis, kein Status |
| Wochen-Kachel | Karte mit KW, Zeitraum, Status-Chip, Fortschritt und einem Knopf |
| Fortschritt | „<n> von <m> Tagen ausgefüllt“; ausgefüllt = Tag erfüllt die Pflichtangaben fürs Einreichen (M05) |
| Fußleiste | feste Leiste am unteren Rand der Seite Woche erfassen mit Speicherzustand und Knöpfen |
| Fehlerleiste | Leiste oben auf der Seite Woche erfassen, wenn Einreichen an Pflichtangaben scheitert |
| Darstellung | Wahl zwischen `System`, `Hell` und `Dunkel` |
| Leerzustand | erklärender Satz statt einer leeren Liste |
| Ladezustand | Platzhalter in der Form des Inhalts, solange Daten fehlen |
| Feste Texte | wörtlich vorgegebene Texte, die Prüfungen nennen dürfen, siehe Abschnitt 5 |

## 3. Regeln

**Rahmen und Navigation**

- **M09-R01:** Ab 1024 px Breite ist die Seitenleiste sichtbar, darunter nicht. Darunter öffnet ein Menüknopf das Menü
  als Schublade; Escape schließt sie, ebenso der Knopf „Schließen“, ein Klick neben die Schublade und die Wahl eines
  Menüpunkts. Solange sie offen ist, bleibt der Fokus in ihr; danach kehrt er zum Menüknopf zurück. (UI-AK-01)
- **M09-R02:** Jede Rolle sieht genau ihre Menüpunkte in dieser Reihenfolge. Azubi: Start, Meine Wochen,
  Benachrichtigungen, Einstellungen. Ausbilder: Start, Prüfliste (mit Zähler offener Prüfungen), Azubis, Personen,
  Benachrichtigungen, Einstellungen, Nicht zustellbar (nur wenn es solche Nachrichten gibt, mit Zähler). Nur in der
  Demo kommt für beide „Teams-Postfach (Demo)“ abgesetzt dazu. Der Menüpunkt der aktuellen Seite ist als „aktuelle
  Seite“ gekennzeichnet. Was die Rolle darf, entscheidet allein der Server (M02-R12), nicht das Menü. (UI-AK-02)
- **M09-R03:** Die Glocke zeigt die Zahl der ungelesenen App-Benachrichtigungen (M08), ab 100 „99+“; ohne ungelesene
  keinen Zähler. Ihr Name nennt die genaue Zahl: „Benachrichtigungen, 3 ungelesen“. Eine Vorschau der letzten 5
  markiert nichts als gelesen (M08, AK-1015). (UI-AK-03)
- **M09-R04:** Unterseiten zeigen über dem Titel einen Link „← Zurück zu <Liste>“. Die Warnung bei ungespeicherten
  Änderungen (M04-R13) gilt für alle Wege aus der Seite.

**Start Azubi**

- **M09-R05:** Start Azubi zeigt die aktuelle Woche mit Status-Chip, einer Tagesmarke je Tag (ausgefüllt, leer,
  außerhalb), dem Fortschritt und einem Hauptknopf („Weiter erfassen“; bei „Eingereicht“ „Ansehen“). Darunter stehen
  unter „Zu erledigen“ die offenen Wochen davor (M03), abgelehnte zuerst, sonst die älteste zuerst; eine abgelehnte
  Woche zeigt die erste Zeile des Gesamtkommentars. (UI-AK-04)
- **M09-R06:** Der Fortschritt zählt je Tag innerhalb der Ausbildung, ob er die Pflichtangaben erfüllt (M05-R05),
  und nennt ihn als „<n> von <m> Tagen ausgefüllt“, bei einem Tag „1 von 1 Tag ausgefüllt“. Tage außerhalb der
  Ausbildung zählen nicht mit. (UI-AK-04)
- **M09-R07:** Gibt es keine offene Woche, zeigt „Zu erledigen“ den Leerzustand „Alles erledigt – keine offenen
  Wochen.“ (UI-AK-05)

**Woche erfassen**

- **M09-R08:** Ab 1280 px stehen die fünf Tage nebeneinander, darunter untereinander. Bei 1280 und 375 px entsteht
  kein waagerechtes Scrollen. (UI-AK-06)
- **M09-R09:** Die Fußleiste zeigt nach jeder Eingabe „Ungespeicherte Änderungen“, nach dem Speichern „Gespeichert“ und
  zusätzlich eine Erfolgsmeldung („Entwurf gespeichert“). (UI-AK-07)
- **M09-R10:** Scheitert das Einreichen an Pflichtangaben (M05-R05), erscheint oben eine Fehlerleiste mit den
  betroffenen Tagen und Sprunglinks zu ihnen; sie erhält den Fokus. Die Fehler stehen zusätzlich am Tag. (UI-AK-08)
- **M09-R11:** Einreichen mit ungespeicherten Änderungen speichert zuerst (M04) und reicht dann ein (M05-R08); scheitert das
  Speichern, wird nicht eingereicht. (UI-AK-09)

**Prüfliste**

- **M09-R12:** Ab 1024 px zeigt die Prüfansicht links die Prüfliste, rechts den ausgewählten Bericht. Der ausgewählte
  Bericht steht in der Adresse, sodass ein Link ihn direkt öffnet. (UI-AK-10)
- **M09-R13:** Nach Freigeben oder Ablehnen (M05) öffnet sich automatisch der nächste Bericht der Liste; nach dem
  letzten erscheint der Leerzustand „Keine Berichte zur Prüfung.“ (UI-AK-11)
- **M09-R14:** Unter 1024 px öffnet ein Eintrag der Prüfliste die Berichtsseite mit derselben Entscheidungsleiste und
  dem Link „← Prüfliste“. (UI-AK-12)

**Status-Chip**

- **M09-R15:** Jeder Status erscheint als Chip mit Symbol und Text: Entwurf mit Stift, Eingereicht mit Pfeil nach oben,
  Freigegeben mit Haken, Abgelehnt mit Kreuz im Kreis. Die Symbole sind paarweise verschieden; kein Status ist allein
  an der Farbe zu erkennen. Der Hinweis „Überfällig“ trägt ebenfalls Symbol (Uhr) und Text. (UI-AK-13)

**Darstellung**

- **M09-R16:** Die Darstellung lässt sich auf `System`, `Hell` und `Dunkel` stellen und gilt sofort. Jeder andere Wert
  wird abgewiesen (`darstellung_unbekannt`). Jede Person ändert nur ihre eigene, und nur eine aktive Person (M02-R12);
  geprüft auf dem Server. (UI-AK-14)
- **M09-R17:** Die Wahl wird am Konto gespeichert und bleibt nach Ab- und Anmeldung erhalten; auf einem zweiten Gerät
  gilt die Wahl am Konto vor der am Gerät gemerkten. Ohne Anmeldung gilt die am Gerät gemerkte Wahl, ohne beides
  `System`. (UI-AK-14)
- **M09-R18:** Bei `System` folgt die App der Einstellung des Geräts (hell oder dunkel). Das Farbschema steht schon beim
  ersten Darstellen der Seite fest; das falsche Schema blitzt nicht auf. (UI-AK-15)

**Barrierefreiheit**

- **M09-R19:** Alle Seiten erfüllen WCAG 2.2 Stufe AA, hell und dunkel, bei 1280 und 375 px; automatisch geprüft.
  (UI-AK-16)
- **M09-R20:** Alle Abläufe der Beispielszenarien lassen sich nur mit der Tastatur durchführen; der Fokus ist jederzeit
  sichtbar und nie von fest stehenden Leisten verdeckt. (UI-AK-17)
- **M09-R21:** Jeder Dialog fängt den Fokus, schließt mit Escape und gibt den Fokus an den auslösenden Knopf zurück.
  (UI-AK-18)

**Seitentitel, Lade- und Leerzustände**

- **M09-R22:** Jede Seite hat einen eigenen Titel „<Seite> – Berichtsheft“ (z. B. „KW 41/2026 – Berichtsheft“) und genau
  eine Hauptüberschrift. (UI-AK-19)
- **M09-R23:** Ladezustände zeigen Platzhalter in der Form des Inhalts (erst nach kurzer Verzögerung, kein Ladekreis
  über der ganzen Seite). Listen ohne Einträge zeigen einen erklärenden Leerzustand. (UI-AK-20)

## 4. Akzeptanzkriterien

Text aus `docs/05-ui-spezifikation.md`, „UI-Akzeptanzkriterien“; Prüffälle in `specs/pruefung/M09.json`.

| AK-ID | Kriterium (Kurzfassung) | Regeln | Prüffälle | Ebene |
| --- | --- | --- | --- | --- |
| UI-AK-01 | Seitenleiste ab 1024 px, darunter Menüknopf und Schublade mit Escape und Fokusrückgabe. | M09-R01 | UI-AK-01-01 bis UI-AK-01-04 | Ablauf |
| UI-AK-02 | Aktiver Menüpunkt gekennzeichnet; jede Rolle sieht genau ihre Menüpunkte. | M09-R02 | UI-AK-02-01 bis UI-AK-02-02 | Ablauf |
| UI-AK-03 | Glocke mit Zähler, ab 100 „99+“, genaue Zahl im Namen. | M09-R03 | UI-AK-03-01 bis UI-AK-03-04 | Fachlogik |
| UI-AK-04 | Start Azubi: aktuelle Woche mit Fortschritt; „Zu erledigen“ älteste zuerst, abgelehnte oben. | M09-R05, M09-R06 | UI-AK-04-01 bis UI-AK-04-04 | Fachlogik |
| UI-AK-05 | Leerzustand „Alles erledigt – keine offenen Wochen.“ | M09-R07 | UI-AK-05-01 bis UI-AK-05-02 | Ablauf |
| UI-AK-06 | Fünf Tage nebeneinander ab 1280 px, kein waagerechtes Scrollen bei 1280 und 375 px. | M09-R08 | UI-AK-06-01 bis UI-AK-06-03 | Ablauf |
| UI-AK-07 | Fußleiste „Ungespeicherte Änderungen“ / „Gespeichert“ und Meldung. | M09-R09 | UI-AK-07-01 | Ablauf |
| UI-AK-08 | Fehlerleiste mit betroffenen Tagen und Sprunglinks, erhält den Fokus. | M09-R10 | UI-AK-08-01 | Ablauf |
| UI-AK-09 | Einreichen speichert zuerst, dann wird eingereicht. | M09-R11 | UI-AK-09-01 | Ablauf |
| UI-AK-10 | Prüfliste links, Bericht rechts ab 1024 px; Bericht in der Adresse. | M09-R12 | UI-AK-10-01 | Ablauf |
| UI-AK-11 | Nach Entscheidung nächster Bericht; danach „Keine Berichte zur Prüfung.“ | M09-R13 | UI-AK-11-01 | Ablauf |
| UI-AK-12 | Unter 1024 px Berichtsseite mit Entscheidungsleiste und „← Prüfliste“. | M09-R14 | UI-AK-12-01 bis UI-AK-12-02 | Ablauf |
| UI-AK-13 | Jeder Status-Chip zeigt Symbol und Text. | M09-R15 | UI-AK-13-01 bis UI-AK-13-04 | Fachlogik |
| UI-AK-14 | Darstellung System, Hell, Dunkel; gilt sofort, bleibt erhalten, gilt auf zweitem Gerät. | M09-R16, M09-R17 | UI-AK-14-01 bis UI-AK-14-10 | Fachlogik |
| UI-AK-15 | Bei System folgt die App dem Gerät; kein Aufblitzen des falschen Schemas. | M09-R18 | UI-AK-15-01 bis UI-AK-15-03 | Ablauf |
| UI-AK-16 | Keine Verstöße WCAG A und AA, hell und dunkel, 1280 und 375 px. | M09-R19 | UI-AK-16-01 bis UI-AK-16-04 | Ablauf |
| UI-AK-17 | Alle Abläufe nur mit der Tastatur; Fokus sichtbar und nie verdeckt. | M09-R20 | UI-AK-17-01 bis UI-AK-17-02 | Ablauf |
| UI-AK-18 | Dialog fängt Fokus, Escape schließt, Fokus kehrt zurück. | M09-R21 | UI-AK-18-01 bis UI-AK-18-02 | Ablauf |
| UI-AK-19 | Eigener Seitentitel „<Seite> – Berichtsheft“ und genau eine Hauptüberschrift. | M09-R22 | UI-AK-19-01 bis UI-AK-19-02 | Ablauf |
| UI-AK-20 | Platzhalter als Ladezustand; erklärender Leerzustand. | M09-R23 | UI-AK-20-01 bis UI-AK-20-02 | Ablauf |

Ebene „Ablauf“: Alle diese Kriterien beschreiben Verhalten im Browser (Breiten, Fokus, Tastatur, Schublade,
Seitentitel, Zustände, Farbschema beim Laden, automatische Prüfung auf Barrierefreiheit). Eine Schnittstelle dahinter
gibt es nicht; ihre Prüffälle sind Ablauf-Fälle (G3, Paket I) mit den generischen Prüfaktionen aus
`specs/pruefung/format.md` („Prüfaktionen“, Entscheidung E3, Variante A), Breite und Farbschema des Geräts über das
Fall-Feld `geraet`. Feste Texte (Abschnitt 5) prüfen sie nur beim Seitentitel wörtlich (UI-AK-19); Leerzustände
(UI-AK-05, UI-AK-11, UI-AK-20) und Menüpunkte (UI-AK-02) erkennen sie über feste Merker bzw. die Zielseite.

Fachlogik, soweit es einen fachlichen Kern gibt (wie AK-401 in M04):

- **UI-AK-03:** Zähler und Name der Glocke als Funktion der Zahl; Anzeige in der Kopfzeile prüft der Ablauf.
- **UI-AK-04:** Fortschritt und erste Zeile des Kommentars; die Reihenfolge unter „Zu erledigen“ ist heute in der Seite
  selbst und hat keine eigene Schnittstelle (siehe offene Punkte), sie prüft der Ablauf.
- **UI-AK-13:** Text und Symbol je Status; dass der Chip so gezeigt wird, prüfen die Browser-Tests.
- **UI-AK-14:** Gültigkeit der Wahl und Vorrang Konto vor Gerät; Speichern am Konto und über Ab- und Anmeldung als
  Daten-Fall bzw. Ablauf in Welle 2 (die Wirkung „sofort“ im Browser).

## 5. Logisches Datenmodell

M09 hat keinen eigenen Datenbestand außer der Darstellung der Person.

| Entität | Feld | Pflicht | Wertebereich | Bemerkung |
| --- | --- | --- | --- | --- |
| Person | Darstellung | ja | System, Hell, Dunkel | Vorgabe `System`; wird am Konto gespeichert (M09-R17) |

**Feste Texte** (Begriffe, nicht Layout; wörtlich so zu prüfen):

| Ort | Text |
| --- | --- |
| Start Azubi, Leerzustand | „Alles erledigt – keine offenen Wochen.“ |
| Prüfliste, Leerzustand | „Keine Berichte zur Prüfung.“ (bei „Meine Azubis“ mit Hinweis auf „Alle Azubis“) |
| Benachrichtigungen, Leerzustand | „Keine Benachrichtigungen.“ |
| Seitentitel | „<Seite> – Berichtsheft“; Wochenbericht „KW <nn>/<jjjj> – Berichtsheft“ |
| Fußleiste | „Ungespeicherte Änderungen“, „Gespeichert“; Meldung „Entwurf gespeichert“ |
| Glocke | „Benachrichtigungen“, „Benachrichtigungen, <n> ungelesen“; Zähler „99+“ ab 100 |
| Fortschritt | „<n> von <m> Tagen ausgefüllt“, bei einem Tag „Tag“ |
| Fehlerzustand | „Die Daten konnten nicht geladen werden.“ mit „Erneut versuchen“ |
| Kein Zugriff, nicht gefunden | „Zugriff verweigert“, „Seite nicht gefunden“ (AK-103) |

## 6. Schnittstellen

Angeboten (Formate in `specs/pruefung/format.md`, „Schnittstellen von M09“):

| Schnittstelle | Ergebnis | Regeln |
| --- | --- | --- |
| `statusChip(status)` | Text und Symbol | M09-R15 |
| `glockenZaehler(ungelesen)` | Anzeige und Name der Glocke | M09-R03 |
| `wochenFortschritt(tage)` | Markierung je Tag, ausgefüllt, gesamt, Text | M09-R05, M09-R06 |
| `ersteZeile(text, maxLaenge)` | erste Zeile eines Kommentars für Listen | M09-R05 |
| `darstellungPruefen(wert)` | Darstellung \| `darstellung_unbekannt` | M09-R16 |
| `darstellungErmitteln(konto, gemerkt)` | gültige Darstellung beim Darstellen | M09-R17 |

Nicht als neutrale Schnittstelle, sondern als Ablauf der Plattform: Darstellung für eine Person speichern (nur eigene,
nur aktive Person, M09-R16), alle Regeln zu Layout, Fokus, Tastatur und Titel.

Genutzt: von M03 die offenen Wochen und „überfällig“; von M04/M05 die Pflichtangaben (`einreichenPruefen`) und die
Statuswechsel; von M08 die Zahl ungelesener Benachrichtigungen; von M02 Rolle und Aktivität der Person.

## 7. Ereignisse

Keine. M09 löst Aktionen der anderen Module aus, erzeugt aber selbst weder Status, Historie noch Benachrichtigungen.

## 8. Anforderungen an die Plattform

- **Farben nur über Tokens:** Hell und Dunkel unterscheiden sich allein durch die Belegung der Tokens; ein Wechsel der
  Akzentfarbe ist eine Änderung an einer Stelle.
- **Farbschema vor dem ersten Darstellen:** Der Server kennt die Wahl (Konto bzw. am Gerät gemerkt) und liefert die Seite
  im richtigen Schema aus.
- **Serverseitige Prüfung:** Rollen, Besitz und gültige Werte prüft der Server bei jeder Aktion; Ausblenden in der
  Oberfläche ist kein Schutz.
- **Schriften ohne Abruf zur Laufzeit** aus dem Internet.
- **Breiten:** 1024 px (Seitenleiste, geteilte Prüfansicht), 1280 px (fünf Spalten), 375 px (Handy) und bis 320 px bzw.
  200 % Vergrößerung ohne Verlust von Inhalt oder Funktion.
- **Berührflächen** mindestens 44 × 44 px am Handy; Animationen höchstens 200 ms, bei Wunsch des Geräts keine.

## 9. Bestätigte Auslegungen

Die 17 bestätigten Auslegungen der Etappe 8 (`docs/05`, „Bestätigte Auslegungen“, bestätigt am 12.10.2026) gelten
unverändert. Zusätzlich:

| Datum | Auslegung | Herkunft |
| --- | --- | --- |
| 12.10.2026 | Kein Zugriff und nicht gefunden zeigen weiter die Meldungen von AK-103. | `docs/05`, Auslegung 4 |
| 12.10.2026 | Ladezustände über Platzhalter innerhalb der Seiten, kein seitenweiter Ladezustand. | `docs/05`, Auslegung 15 |
| 12.10.2026 | Handprüfung mit Tastatur und Screenreader macht Chris selbst; sie blockiert die Abnahme nicht. | `docs/05`, Auslegung 17 |

## 10. Offene Punkte

- [ ] **Bitte bestätigen:** UI-AK-15 ist `Ablauf`, obwohl `resolveTheme` (Konto vor Gerät) als Fachlogik unter
      UI-AK-14 geprüft wird. Der Kern von UI-AK-15 („folgt dem Gerät“, „kein Aufblitzen“) ist reines Browser-Verhalten.
- [ ] **Bitte bestätigen:** `darstellungPruefen` prüft die Wertemenge (`isTheme`), nicht `updateOwnTheme()` selbst (das
      braucht die Datenbank und die Rechteprüfung; dafür in Welle 2 ein Daten-Fall). Die App liefert dort nur einen
      Meldungstext („Unbekannte Darstellung.“), keinen festen Grund; der Adapter bildet `!isTheme` auf den Code ab.
- [ ] Die Reihenfolge unter „Zu erledigen“ (abgelehnt zuerst, sonst älteste zuerst) steht heute in der Seite
      `azubi/page.tsx` und nicht in der Fachlogik. Eine reine Funktion in `src/domain/` würde sie als Fachlogik
      prüfbar machen (Änderung außerhalb von G3-G).
- [ ] `relativeTime()` („vor 2 Std.“) gehört zu M09, hat aber kein UI-AK und keinen Prüffall.
- [x] Ablauf-Fälle für UI-AK-01, 02, 05 bis 12, 15 bis 20 (G3, Welle 2, Paket I).
- [ ] **Liferay (Profil, G4):** Liferay 6.2.5 bringt AlloyUI als Oberflächen-Bibliothek mit; ob die Komponenten dort
      nachgebaut oder ersetzt werden, ist offen. Dunkelmodus ist dort nur begrenzt möglich (Themes der Plattform);
      UI-AK-14 und UI-AK-15 brauchen eine Abweichung, falls er entfällt. Ob 375 px und WCAG 2.2 AA mit der Plattform
      erreichbar sind, klärt das Profil.

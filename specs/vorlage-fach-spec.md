# Mxx Name des Moduls

Stand: TT.MM.JJJJ · Status: **Entwurf zur Freigabe** · @Chris

Vorlage für jede Fach-Spec (M01 bis M09, Q) nach `docs/06-spec-architektur.md`, „Vorlage Fach-Spec“. Die Fach-Spec
nennt **keine Technik**: keine Bibliothek, keine Tabelle, keine Programmiersprache, kein Framework. Wie die
TypeScript-App ein Modul umsetzt, steht in `specs/code-landkarte.md`; wie eine Plattform es umsetzt, im Profil.

Dateiname: `specs/Mxx-<name>.md` (z. B. `M01-kalender-und-zeit.md`), für das Querschnittsmodul `specs/Q-<name>.md`.
`npm run ak:abdeckung` liest die Tabelle in Abschnitt 4 und verlangt für jede dort genannte AK-ID mindestens einen
Prüffall mit diesem Modul; ausgenommen bis G3 sind AKs mit Ebene `Ablauf, G3` (Entscheidung E1).

## 1. Zweck und Abgrenzung

Was das Modul tut und was ausdrücklich nicht (mit Verweis auf das zuständige Modul).

## 2. Begriffe

Begriffe des Moduls, z. B. „offen“, „Prüfrunde“, „außerhalb der Ausbildung“. Allgemeine Begriffe stehen in
`specs/00-uebersicht.md` und werden nur verwiesen.

| Begriff | Bedeutung |
| --- | --- |
| … | … |

## 3. Regeln

Nummeriert und einzeln überprüfbar, z. B.:

- **Mxx-R01:** Ablehnen nur mit nicht leerem Gesamtkommentar.

## 4. Akzeptanzkriterien

Die AK-IDs des Moduls mit ihrem Text aus `docs/01` (bzw. `docs/05`), je ID die Regeln und Prüffälle, die sie belegen,
und die Ebene, auf der sie geprüft wird. Jede AK-ID gehört genau einem Modul.

| AK-ID | Kriterium (Kurzfassung) | Regeln | Prüffälle | Ebene |
| --- | --- | --- | --- | --- |
| AK-… | … | Mxx-R01 | AK-…-01 | Fachlogik |

Werte der Spalte „Ebene“ (genau so geschrieben; ein anderer Wert lässt `npm run ak:abdeckung` scheitern):

- `Fachlogik`: geprüft mit Prüffällen der Ebene `fachlogik` (Regel ohne Speicher und ohne Oberfläche).
- `Daten`: geprüft mit Prüffällen der Ebene `daten` (Regel am gespeicherten Bestand).
- `Ablauf`: nur im Ablauf (Browser) prüfbar, geprüft mit Prüffällen der Ebene `ablauf` (seit G3); unter der Tabelle
  begründet ein Satz je AK, warum sie sich nicht als Fachlogik prüfen lässt.
- `Ablauf, G3`: nur im Ablauf (Browser) prüfbar; der Prüffall folgt in G3 (Entscheidung E1). In „Prüffälle“ steht
  dann `folgt in G3`, und unter der Tabelle begründet ein Satz je AK, warum sie sich nicht als Fachlogik prüfen lässt.
  Bis G3 ist eine solche AK ohne Prüffall kein Fehler; sie erscheint in `docs/03-testabdeckung.md` in der Spalte
  „Prüffall folgt (G3)“. Eine AK, die sich als Fachlogik prüfen lässt, wird nicht so markiert.

Eine Tabelle mit vier Spalten (ohne „Ebene“) bleibt lesbar; neue Fach-Specs nutzen fünf.

## 5. Logisches Datenmodell

Entitäten, Felder, Pflicht, Wertebereiche, Eindeutigkeit, Beziehungen; Referenzdaten mit Quelle.

| Entität | Feld | Pflicht | Wertebereich | Bemerkung |
| --- | --- | --- | --- | --- |
| … | … | … | … | … |

## 6. Schnittstellen

Angeboten: neutrale Signaturen, z. B. `pruefeUebergang(status, aktion, rolle, bericht) → erlaubt | Fehler`. Formate und
Fehlercodes stehen in `specs/pruefung/format.md`. Genutzt: was andere Module anbieten.

## 7. Ereignisse

Was das Modul auslöst, z. B. „Bericht eingereicht“ für M08, mit Inhalt.

## 8. Anforderungen an die Plattform

Ohne Technikvorgabe, z. B. „Statuswechsel, Historie und Benachrichtigung in einer Transaktion“, „Historie technisch
unveränderlich“, „Uhr für Tests einstellbar“.

## 9. Bestätigte Auslegungen

Aus den Etappen 1 bis 8 und späteren Freigaben übernommen, mit Datum und Herkunft.

| Datum | Auslegung | Herkunft |
| --- | --- | --- |
| … | … | … |

## 10. Offene Punkte

- [ ] …

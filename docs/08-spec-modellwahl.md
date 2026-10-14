# Spec Modellwahl für Arbeitspakete

Stand: 12.10.2026 · Status: **freigegeben (13.10.2026)** · gilt für die Steuerungsinstanz aus `docs/06-spec-architektur.md`

## Ziel und Geltungsbereich

Die Steuerungsinstanz startet für jedes Arbeitspaket eine Entwicklersitzung. Bisher läuft jede Sitzung mit dem Modell,
das gerade eingestellt ist. Diese Spec lässt die Steuerung **für jedes Paket aus den Modellen wählen, die zu diesem
Zeitpunkt verfügbar sind**, nach Anspruch, Risiko und Kosten des Pakets. Sie legt fest, wie die Steuerung die
verfügbaren Modelle ermittelt, nach welchen Regeln sie wählt, wann sie hoch- oder herunterstuft und wie die Wahl
nachvollziehbar bleibt.

- **Grundsatz:** So stark wie nötig, so günstig wie möglich. Gemessen wird an den Kosten je **abgenommenem** Paket,
  nicht je Sitzung: Ein günstiges Modell, das zwei Anläufe braucht, ist oft teurer als ein stärkeres, das beim ersten
  Mal besteht.
- **Dynamisch:** Die Spec nennt keine Modellnamen. Neue Modelle kommen hinzu, alte fallen weg; die Steuerung ordnet die
  jeweils verfügbaren Modelle zur Laufzeit Stufen zu (MW-R02).
- **Gilt für:** die Steuerungsinstanz selbst, die Entwicklersitzungen und Hilfsagenten innerhalb einer Sitzung (z. B.
  für Suche oder Review).
- **Gilt nicht für:** die Wahl der Modelle in der App selbst. Die Berichtsheft-App nutzt keine KI.
- **Zusammenspiel:** Wie sparsam eine Sitzung arbeitet, regelt `docs/09-spec-kosteneffizienz.md`. Diese Spec regelt
  nur, mit welchem Modell und welchem Denkaufwand sie arbeitet.

## Begriffe

- **Modell:** ein von der Plattform angebotenes Sprachmodell mit Kennung, Preis je Million Token für Eingabe und
  Ausgabe und Fähigkeiten.
- **Stufe:** eine Leistungsklasse, der die Steuerung die verfügbaren Modelle zuordnet:

  | Stufe | Kennzeichen | Typischer Einsatz |
  | --- | --- | --- |
  | S1 Schnell | günstigste Modelle, Preis höchstens ein Zehntel von S3 | Suchen, Zusammenfassen, mechanische Umformungen, Format- und Vollständigkeitsprüfungen |
  | S2 Standard | ausgewogene Modelle, Preis etwa die Hälfte von S3 | Übersetzen nach Code-Landkarte (Weg A), Formulare, Tests nach klarer Vorlage |
  | S3 Stark | stärkste allgemein empfohlene Modelle | Steuerung, neue Plattform aufsetzen, Transaktionen und Gleichzeitigkeit, Sicherheit, Upgrade, Reviews |
  | S4 Spitze | leistungsfähigste Modelle, Preis deutlich über S3 | nur nach Eskalation oder mit Begründung (MW-R07) |

- **Denkaufwand:** die Einstellung, wie gründlich ein Modell nachdenkt (z. B. niedrig, mittel, hoch), soweit die
  Plattform sie je Sitzung oder Hilfsagent einstellen lässt.
- **Paketprofil:** die Merkmale eines Arbeitspakets, nach denen gewählt wird (MW-R04).
- **Modellwahl-Eintrag:** die Zeile in `FORTSCHRITT.md`, die Stufe, Denkaufwand, Grund, Anläufe und Ergebnis eines
  Pakets festhält (MW-R10).

## Regeln

### Verfügbare Modelle ermitteln

- **MW-R01 Zur Laufzeit, nicht aus dem Repository:** Die Steuerung ermittelt zu Beginn eines Vorhabens und vor jeder
  Etappe, welche Modelle verfügbar sind. Quellen, in dieser Reihenfolge:
  1. die Modellliste ihrer eigenen Umgebung (Systemhinweise, Auswahl der Werkzeuge zum Starten von Sitzungen und
     Hilfsagenten),
  2. die Modell-Schnittstelle der Plattform, falls die Sitzung darauf zugreifen kann,
  3. ein Startversuch: Lehnt die Plattform ein Modell ab, gilt es als nicht verfügbar.
- **MW-R02 Stufen zuordnen:** Jedes verfügbare Modell kommt in genau eine Stufe, nach Preis und Stellung in seiner
  Modellfamilie. Gibt es mehrere Modelle einer Stufe, nimmt die Steuerung das neueste. Ältere Modelle bleiben nur als
  Ersatz, wenn das neueste abgelehnt wird.
- **MW-R03 Keine Kennungen im Repository:** Modellkennungen stehen nie in Dateien, Commits oder PR-Texten des
  Repositorys, nur die Stufe. Die Zuordnung Stufe → Modell nennt die Steuerung Chris im Chat, zu Beginn jedes
  Vorhabens und wenn sie sich ändert.

### Wählen

- **MW-R04 Paketprofil:** Vor dem Start bewertet die Steuerung jedes Paket nach fünf Merkmalen:

  | Merkmal | niedrig | hoch |
  | --- | --- | --- |
  | Neuheit | Muster gibt es schon (z. B. zweites Modul auf derselben Plattform) | erstes Paket einer Plattform (P00), unbekannte Technik |
  | Schwierigkeit | 1:1 übersetzen nach Code-Landkarte | Transaktionen, Gleichzeitigkeit, Zeitzonen, Upgrade-Schritte |
  | Risiko | Fehler fallen in den Prüffällen sofort auf | Sicherheit, Datenverlust, Historie, alles unter AM-R04 |
  | Umfang | wenige Dateien, ein Modul | viele Dateien, mehrere Module |
  | Prüfbarkeit | Prüffälle decken das Paket vollständig ab | Teile lassen sich nur im Review prüfen |

- **MW-R05 Startstufe:**
  - **S3**, wenn Neuheit, Schwierigkeit oder Risiko hoch ist.
  - **S2**, wenn alle drei niedrig oder mittel sind und die Prüfbarkeit hoch ist.
  - **S1** nur für Hilfsagenten und rein mechanische Pakete, z. B. Testdaten-JSON nach Vorlage oder Format- und
    Abdeckungsprüfungen.
  - **Im Zweifel die höhere Stufe.**

  Richtwerte je Reihe:

  | Paket | Startstufe |
  | --- | --- |
  | P00 jeder Plattform, U00 bis U06, M02 (Zugang), M05 (Status, Transaktion), M06 (Historie unveränderlich) | S3 |
  | M01, M03, M04, M07, M08 auf einer Plattform, deren P00 abgenommen ist | S2 |
  | M09 Oberfläche | S2, auf Liferay 6.2.5 S3 wegen AlloyUI und Theme |
  | P10 Abnahme, Blindtest-Auswertung | S3 |
  | Steuerungsinstanz | S3 |
  | Review vor der Abnahme (AM-R07) | S3, mindestens eine Stufe über der Entwicklersitzung, höchstens S3 |
  | Suche, Zusammenfassung, Logauswertung als Hilfsagent | S1 |

- **MW-R06 Denkaufwand:**
  - Standard ist **mittel**.
  - **Hoch** gilt für die Pakete mit Startstufe S3 aus der Tabelle in MW-R05 und für Reviews.
  - **Niedrig** gilt für S1-Hilfsagenten.
  - Bevor die Steuerung ein Paket eine Stufe höher setzt, prüft sie, ob dieselbe Stufe mit höherem Denkaufwand reicht.
    Ein stärkeres Modell mit niedrigerem Denkaufwand ist oft günstiger als ein schwächeres mit hohem.
  - **Umsetzung auf der Plattform (Stand 14.10.2026):** Der Denkaufwand lässt sich beim Starten einer Sitzung nicht
    setzen. Eine Umgebungsvariable `CLAUDE_CODE_EFFORT_LEVEL` in der Cloud-Umgebung wirkt nicht, weil die Plattform den
    Aufwand je Runde mitschickt. Verfahren: Die Steuerung nennt Chris beim Start jeder Sitzung mit Denkaufwand „hoch“
    deren ID; Chris stellt in der App auf „Hoch“; die Einstellung gilt danach für alle Runden der Sitzung, auch für Runden
    aus Nachrichten anderer Sitzungen und aus PR-Ereignissen. Geprüft wird über die Sitzungsdaten (`effort_level`).
    Hilfsagenten bekommen den Aufwand direkt im Aufruf.
- **MW-R07 S4 nur mit Grund:** S4 wählt die Steuerung nur,
  - wenn ein Paket auf S3 mit hohem Denkaufwand zweimal nicht abgenommen wurde,
  - für die Analyse eines nicht bestandenen Blindtests oder
  - wenn Chris es für ein Paket anordnet.

  Der Grund steht im Modellwahl-Eintrag.
- **MW-R08 Eine Sitzung, ein Modell:** Eine Entwicklersitzung behält ihr Modell bis zum Ende. Ein Wechsel mitten in
  der Sitzung verwirft den Zwischenspeicher und kostet mehr, als er spart. Muss hochgestuft werden, startet eine neue
  Sitzung mit Übergabe (MW-R09).

### Eskalieren und lernen

- **MW-R09 Hochstufen:**
  - **Wann:** Ein Paket wird eine Stufe höher neu gestartet, wenn
    - die Sitzung ihr Abbruchkriterium aus `docs/09-spec-kosteneffizienz.md` erreicht, z. B. derselbe Fehler dreimal,
      oder
    - die Abnahme der Steuerung das Paket zweimal zurückweist.
  - **Übergabe:** Die neue Sitzung bekommt den Branch, die Notizen der vorigen Sitzung und deren Diagnose.
  - **Ohne Einsicht kein Hochstufen:** Ein Hochstufen ohne neue Erkenntnis ist verboten. Bleibt die Ursache unklar,
    fragt die Steuerung Chris.
- **MW-R10 Festhalten:** Für jedes Paket steht in `FORTSCHRITT.md`:
  - Stufe und Denkaufwand je Anlauf
  - Grund der Wahl
  - Zahl der Anläufe
  - ob beim ersten Anlauf abgenommen
  - Verbrauch, soweit die Plattform ihn meldet, sonst Dauer und Zahl der Runden

  Meldet die Plattform, dass sie für eine Runde auf ein anderes Modell ausgewichen ist, steht das ebenfalls dort, als
  Stufe.
- **MW-R11 Herunterstufen:** Sind auf einer Plattform drei Pakete mit Startstufe S3 in Folge beim ersten Anlauf
  abgenommen worden und ist das nächste Paket von gleicher Art, darf die Steuerung es auf S2 versuchen. Scheitert der
  Versuch, gilt für diese Art von Paket wieder S3. Nach G2 (fünf S3-Pakete in Folge beim ersten Anlauf abgenommen) gilt
  das für Beschreibungs-Pakete bestehenden Codes der Spec-Architektur (Art wie M03, M04, M07, M08, M09); Runner und
  Browser-Infrastruktur bleiben S3 (freigegeben 13.10.2026).
- **MW-R12 Rückblick:** Am Ende jeder Etappe wertet die Steuerung die Modellwahl-Einträge aus und schlägt Chris
  geänderte Richtwerte für MW-R05 vor:
  - Kosten je abgenommenem Paket und Stufe
  - Quote der Abnahme beim ersten Anlauf
  - Zahl der Eskalationen

  Die Richtwerte ändert nur ein freigegebener PR.

### Grenzen

- **MW-R13 Keine Wahl gegen Vorgaben:** Ordnet Chris für ein Vorhaben oder Paket ein Modell oder eine Stufe an, gilt
  das vor allen Regeln dieser Spec.
- **MW-R14 Nicht verfügbar:** Ist für eine Stufe kein Modell verfügbar, nimmt die Steuerung die nächsthöhere Stufe und
  vermerkt das. Ist auch S3 nicht verfügbar, hält sie an und fragt Chris.

## Akzeptanzkriterien

| ID | Kriterium | Ebene |
| --- | --- | --- |
| MW-AK-01 | Zu Beginn eines Vorhabens nennt die Steuerung Chris im Chat die verfügbaren Modelle und ihre Stufe. | Ablauf |
| MW-AK-02 | Kein Commit und kein PR-Text enthält eine Modellkennung; `FORTSCHRITT.md` nennt nur Stufen. | Daten |
| MW-AK-03 | Ein P00-Paket startet auf S3 mit hohem Denkaufwand; ein M04-Paket auf einer Plattform mit abgenommenem P00 startet auf S2. | Fachlogik |
| MW-AK-04 | Jedes Paket hat einen Modellwahl-Eintrag mit Stufe, Denkaufwand, Grund und Anläufen. | Daten |
| MW-AK-05 | Nach dem Abbruchkriterium oder zwei Zurückweisungen startet das Paket eine Stufe höher in einer neuen Sitzung mit Übergabe; die alte Sitzung wechselt ihr Modell nicht. | Ablauf |
| MW-AK-06 | S4 kommt nur mit einem der Gründe aus MW-R07 vor, und der Grund steht im Eintrag. | Daten |
| MW-AK-07 | Lehnt die Plattform ein Modell ab, nimmt die Steuerung das nächste der Stufe oder die nächsthöhere Stufe und vermerkt das; ohne verfügbare S3 fragt sie Chris. | Ablauf |
| MW-AK-08 | Am Ende einer Etappe liegt ein Rückblick mit Kosten je abgenommenem Paket, Quote beim ersten Anlauf und Eskalationen je Stufe vor. | Ablauf |

## Umsetzung

- **MW-S01 Regeln als reine Funktion:** `waehleStufe(paketprofil, verlauf) → { stufe, denkaufwand, grund }` mit
  Unit-Tests zu MW-AK-03, MW-AK-05 und MW-AK-06. Sie liegt neben der Fortschrittsdatei-Logik der Steuerung (G4,
  `playbooks/00-steuerung.md`).
- **MW-S02 Leitfaden:** `playbooks/00-steuerung.md` bekommt einen Abschnitt „Modellwahl“ mit dem Ablauf aus MW-R01 bis
  MW-R14 und der Vorlage für den Modellwahl-Eintrag. `vorlage-arbeitspaket.md` nennt Stufe und Denkaufwand des Pakets.
- **MW-S03 Einführung:** ab G1 für die Etappen-Sitzungen, voll ab L62.

## Offene Punkte

- [x] Ob die Plattform den Denkaufwand je Entwicklersitzung einstellen lässt: erledigt am 14.10.2026, nicht beim Start,
      aber über die App (Verfahren in MW-R06, „Umsetzung auf der Plattform“).
- [x] Die Plattform meldet den Verbrauch je Sitzung: Die Sitzungsdaten, die die Steuerung für eine
      Entwicklersitzung abrufen kann, enthalten Eingabe-, Ausgabe- und Zwischenspeicher-Token sowie die Kosten in US-Dollar
      (festgestellt am 12.10.2026). Die Steuerung liest sie nach Ende des Pakets und trägt sie ein.

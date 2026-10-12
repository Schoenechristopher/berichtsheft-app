# Spec Kosteneffizientes Arbeiten der Claude-Sitzungen

Stand: 12.10.2026 · Status: **Entwurf zur Freigabe** · gilt für die Steuerungsinstanz und alle Entwicklersitzungen

## Ziel und Geltungsbereich

Die Spec-Architektur (`docs/06-spec-architektur.md`) verteilt die Arbeit auf viele Claude-Code-Sitzungen. Jede Sitzung
kostet: Token, also Geld oder Kontingent des Abos, dazu Laufzeit und CI. Diese Spec legt fest, wie Steuerung und
Entwicklersitzungen **mit möglichst wenig Verbrauch zu einem abgenommenen Ergebnis kommen**, ohne an Qualität zu sparen.

- **Maßstab:**
  - Gezählt werden die Kosten je **abgenommenem Arbeitspaket**, nicht je Sitzung oder Runde.
  - Ein zweiter Anlauf, eine Rückfrage aus Unklarheit oder ein roter CI-Lauf zählen mit.
  - Gute Vorbereitung ist deshalb meist die billigste Maßnahme.
- **Was teuer ist, in dieser Reihenfolge:**
  1. Arbeit, die wiederholt werden muss: falsches Ergebnis, Abbruch, Missverständnis im Auftrag.
  2. Kontext, der ohne Not gelesen wird: ganze Dateien, Logs, Wiederholungen.
  3. Ausgaben: lange Erklärungen, ganze Dateien neu schreiben statt gezielt ändern.
  4. Warten und Nachfragen in Schleifen: Abfragen im Takt, CI-Läufe zur Fehlersuche.
- **Abo oder Abrechnung:** Läuft die Arbeit über ein Abo, zählt der Anteil am Nutzungskontingent statt Geld. Die Regeln
  gelten gleich; als Gewicht dienen die Listenpreise der Modelle.
- **Zusammenspiel:**
  - Welches Modell eine Sitzung nutzt, regelt `docs/08-spec-modellwahl.md`.
  - Wann CI läuft, regelt `docs/ci-richtlinie.md`.
  - Diese Spec regelt die Arbeitsweise dazwischen.

## Begriffe

- **Auftrag:** der Text, mit dem die Steuerung eine Entwicklersitzung startet (`playbooks/vorlage-arbeitspaket.md`).
- **Kontext:** alles, was eine Sitzung gelesen und geschrieben hat. Er wächst mit jeder Runde und wird bei jeder
  Runde erneut verarbeitet; ein Zwischenspeicher macht unveränderte Teile billiger, aber nicht kostenlos.
- **Zwischenspeicher:** Die Plattform speichert den unveränderten Anfang des Kontexts eine Zeit lang. Eine Sitzung, die
  weiterarbeitet, liest ihn günstig; nach einer langen Pause oder einem Modellwechsel verfällt er.
- **Abbruchkriterium:** die Bedingung, bei der eine Sitzung aufhört und berichtet, statt weiterzuprobieren (KE-R12).
- **Budget:** der geplante Verbrauch eines Pakets nach Größenklasse (KE-R14).
- **Übergabe:** ein Abschnitt in `FORTSCHRITT.md`, mit dem eine neue Sitzung dort weitermacht, wo eine alte aufgehört
  hat.

## Regeln für die Steuerungsinstanz

- **KE-R01 Vollständiger Auftrag:** Jeder Auftrag enthält alles, was die Sitzung braucht, damit sie nicht suchen muss:
  - Ziel und Fertig-Kriterium mit den Prüffall-IDs
  - Playbook und Schritt
  - die Dateien aus der Code-Landkarte in Lesereihenfolge
  - die Befehle zum Prüfen
  - Branch, Stufe und Denkaufwand (`docs/08-spec-modellwahl.md`)
  - Budget und Abbruchkriterium
  - bekannte Fallen aus früheren Paketen

  Ein Auftrag verweist auf Abschnitte, statt ganze Dokumente zu kopieren.
- **KE-R02 Zustand in Dateien, nicht im Gedächtnis:** Die Steuerung hält ihren Stand in `FORTSCHRITT.md` fest, nicht
  nur im eigenen Verlauf. So kann sie jederzeit in einer frischen Sitzung weitermachen.
- **KE-R03 Frische Steuerung je Etappe:** Nach jeder Etappe, spätestens wenn die Plattform den Verlauf zusammenfasst,
  schreibt die Steuerung eine Übergabe und endet. Die nächste Etappe startet eine neue Steuerungssitzung mit der
  Übergabe. Ein langer Verlauf macht jede weitere Runde teurer.
- **KE-R04 Warten ohne Abfragen:** Die Steuerung wartet auf Ereignisse:
  - PR-Ereignisse, Benachrichtigungen aus Entwicklersitzungen, ein Check-in in großem Abstand.
  - Nie Abfragen im Minutentakt und nie aktives Warten mit Pausenbefehlen.
  - Ein Check-in, der nichts Neues findet, wird still neu angesetzt, und das höchstens dreimal in Folge.
- **KE-R05 Parallel, wo es nichts kostet:** Pakete ohne gegenseitige Abhängigkeit laufen parallel, aber nie zwei
  Sitzungen auf denselben Dateien. Mehr gleichzeitige Sitzungen als unabhängige Pakete gibt es nicht.
- **KE-R06 Rückfragen bündeln:** Fragen an Chris sammelt die Steuerung und stellt sie gemeinsam, mit Vorschlag und
  Folgen jeder Antwort. Eine Frage, die das laufende Paket blockiert, stellt sie sofort; die übrigen Pakete laufen
  weiter.
- **KE-R07 Selbst nicht entwickeln:** Die Steuerung liest Diffs und Prüfergebnisse, nicht den ganzen Code. Für eine
  breite Suche nimmt sie einen Hilfsagent der Stufe S1, der nur das Ergebnis zurückgibt.

## Regeln für Entwicklersitzungen

- **KE-R08 Umgebung startbereit:** Abhängigkeiten, Datenbank, JDK und Liferay-Bundle installiert ein Startskript der
  Sitzung (KE-S01), nicht die Sitzung selbst Schritt für Schritt. Eine Sitzung, die ihre Umgebung erst erkunden muss,
  vermerkt das als Falle für den nächsten Auftrag.
- **KE-R09 Gezielt lesen:**
  - Gelesen werden zuerst die Dateien aus dem Auftrag. Gesucht wird mit Suchbefehlen; ganze Dateien nur, wenn sie
    gebraucht werden, große Dateien nur in Abschnitten.
  - Logs werden gefiltert (Fehlerzeilen und ihr Umfeld), nie vollständig gelesen.
  - Eine eben geänderte Datei wird nicht zur Kontrolle erneut gelesen.
- **KE-R10 Gezielt ändern:** Änderungen erfolgen als gezielte Ersetzungen, nicht durch Neuschreiben ganzer Dateien.
  Erzeugte Dateien entstehen über ihr Werkzeug (z. B. `npm run ak:abdeckung`), nie von Hand.
- **KE-R11 Gestuft prüfen:** Erst die Tests des eigenen Moduls, dann vor dem Push einmal die schnelle Prüfung und die
  Browser-Tests im verfügbaren Browser (CI-21). Auf Liferay erst Deploy in die laufende Instanz, statt sie neu zu
  starten. Die volle Prüfung läuft in der CI nach der Änderungsklasse, nicht zur Fehlersuche.
- **KE-R12 Abbruchkriterium:** Die Sitzung hört auf und berichtet der Steuerung, wenn
  - derselbe Fehler nach drei unterschiedlichen Lösungsversuchen bleibt,
  - das Budget um die Hälfte überschritten ist,
  - der Auftrag eine Lücke hat, die nur eine Auslegung schließen kann, oder
  - eine Regel aus Spec oder Profil dem Auftrag widerspricht.

  Ihr Bericht nennt Stand, Diagnose, versuchte Wege und einen Vorschlag. Weiterzuprobieren ohne neue Erkenntnis ist
  verboten.
- **KE-R13 Knapp berichten:**
  - Zwischenstände sind kurz.
  - Die PR-Beschreibung folgt der Vorlage: AK-Tabelle, Abweichungen, „Bitte bestätigen“.
  - Der Abschlussbericht an die Steuerung umfasst höchstens eine Bildschirmseite. Ausführliches steht im PR, nicht
    doppelt im Chat.

## Gemeinsame Regeln

- **KE-R14 Budget je Paket:** Die Steuerung legt das Budget nach Größenklasse fest:

  | Klasse | Kennzeichen | Budget |
  | --- | --- | --- |
  | klein | ein Modul, bis 10 Dateien | 1 Sitzung, 1 Anlauf |
  | mittel | ein Modul mit Oberfläche oder Datenhaltung | 1 Sitzung, bis 2 Anläufe |
  | groß | P00, Upgrade-Schritt, mehrere Module | wird geteilt (`00-steuerung.md`), sonst wie mittel |

  Meldet die Plattform den Verbrauch, ergänzt die Steuerung die Tabelle nach der ersten Etappe um Richtwerte in Token.
- **KE-R15 Zwischenspeicher schonen:**
  - Eine Sitzung arbeitet ihr Paket ohne lange Pausen ab und wechselt nicht das Modell (MW-R08).
  - Stabile Texte stehen am Anfang des Kontexts und werden nicht umformuliert: Auftrag, `CLAUDE.md`, Playbook-Abschnitt.
- **KE-R16 Hilfsagenten für Breite:** Wer viel lesen muss (mehrere Dateien durchsuchen, ein langes Log auswerten,
  Dokumentation nachschlagen), gibt das an einen Hilfsagent der Stufe S1 ab. Der Hilfsagent liefert nur das Ergebnis
  zurück, nicht das Gelesene.
- **KE-R17 Keine Arbeit doppelt:** Was ein Werkzeug prüft (Lint, Typecheck, Abdeckung, Merge-Kriterien), prüft keine
  Sitzung noch einmal von Hand. Was die Steuerung schon festgestellt hat, steht im Auftrag und wird nicht neu ermittelt.
- **KE-R18 Messen und nachschärfen:** Für jedes Paket stehen in `FORTSCHRITT.md` neben dem Modellwahl-Eintrag (MW-R10):
  - Verbrauch bzw. Dauer
  - Zahl der Anläufe und der CI-Läufe
  - Rückfragen
  - erreichte Abbruchkriterien

  Am Ende jeder Etappe schlägt die Steuerung Chris vor, was sich ändern soll: Auftragsvorlage, Budgets, Startskript,
  Fallen in der Code-Landkarte.

## Kennzahlen

| Nr. | Kennzahl | Ziel |
| --- | --- | --- |
| KZ-1 | Anteil der Pakete, die beim ersten Anlauf abgenommen werden | ≥ 70 % |
| KZ-2 | Rückfragen aus der Sitzung, weil der Auftrag unvollständig war | ≤ 1 je 5 Pakete |
| KZ-3 | CI-Läufe der vollen Prüfung je PR | ≤ 2 (CI-22) |
| KZ-4 | Pakete über Budget | ≤ 20 % |
| KZ-5 | Verbrauch je abgenommenem Paket, je Stufe und Größenklasse | sinkt von Etappe zu Etappe oder bleibt gleich |

## Akzeptanzkriterien

| ID | Kriterium | Ebene |
| --- | --- | --- |
| KE-AK-01 | Jeder Auftrag enthält Fertig-Kriterium mit Prüffall-IDs, Dateiliste, Prüfbefehle, Stufe, Budget und Abbruchkriterium; eine Prüfung der Vorlage meldet fehlende Felder. | Fachlogik |
| KE-AK-02 | Nach jeder Etappe gibt es eine Übergabe in `FORTSCHRITT.md`, und die nächste Etappe startet in einer neuen Steuerungssitzung. | Ablauf |
| KE-AK-03 | Eine Entwicklersitzung, die dreimal am selben Fehler scheitert, endet mit einem Bericht nach KE-R12, statt weiterzuprobieren. | Ablauf |
| KE-AK-04 | Eine neue Cloud-Sitzung hat nach dem Start ohne eigene Installationsschritte eine lauffähige Umgebung (Abhängigkeiten, Datenbank mit Seed). | Ablauf |
| KE-AK-05 | Für jedes Paket stehen die Werte aus KE-R18 in `FORTSCHRITT.md`; am Ende jeder Etappe liegt ein Rückblick mit KZ-1 bis KZ-5 vor. | Daten |
| KE-AK-06 | Die Steuerung startet keine Abfrage im Minutentakt; zwischen zwei Check-ins ohne neues Ereignis liegen mindestens 50 Minuten. | Ablauf |

## Umsetzung

- **KE-S01 Startskript für Cloud-Sitzungen:** Ein Startskript (SessionStart-Hook oder Setup-Skript der Umgebung) richtet
  jede neue Sitzung ein. Für die TypeScript-App:
  - PostgreSQL starten, Rolle und Datenbanken anlegen
  - `.env` aus `.env.example`
  - `npm ci`, Migration und Seed

  Für Liferay ergänzt P00 der Plattform JDK und Bundle. Umgesetzt als SessionStart-Hook in
  `.claude/hooks/session-start.sh` (12.10.2026): idempotent, `npm ci` nur bei geändertem `package-lock.json`; erster
  Lauf rund 40 Sekunden, jeder weitere rund 4 Sekunden.
- **KE-S02 Auftragsvorlage:** `playbooks/vorlage-arbeitspaket.md` (G4) bekommt die Pflichtfelder aus KE-R01. Ein kleines
  Prüfskript meldet fehlende Felder (KE-AK-01).
- **KE-S03 Leitfaden der Steuerung:** `playbooks/00-steuerung.md` bekommt die Regeln KE-R01 bis KE-R07, die Vorlage für
  die Übergabe und den Etappen-Rückblick.
- **KE-S04 `CLAUDE.md`:** Die Regeln KE-R08 bis KE-R13 kommen kurz gefasst in `CLAUDE.md`, weil jede Entwicklersitzung
  sie liest. `CLAUDE.md` bleibt dabei knapp; Einzelheiten stehen hier.

## Offene Punkte

- [ ] Ob die Plattform den Verbrauch je Sitzung meldet. Sonst messen KE-R18 und KZ-5 mit Dauer und Zahl der Runden.
- [x] Startskript als Hook im Repository (`.claude/hooks/session-start.sh`), nicht über die Umgebung; damit ist es
      versioniert und geschützter Pfad (AM-R04).

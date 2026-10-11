# CI-Richtlinie für alle Repositories von Chris

Stand: 11.10.2026 · Status: **Entwurf zur Freigabe** · Gilt für jedes Repository des Kontos `schoenechristopher96-lgtm`
mit GitHub Actions. Diese Datei liegt als identische Kopie in jedem Repository unter `docs/ci-richtlinie.md`. Ändert
sich etwas, werden alle Kopien gemeinsam angepasst.

## 1. Warum

- **Kontingent:** Das Konto hat GitHub Free. Private Repositories teilen sich **2.000 Actions-Minuten pro Monat**,
  und zwar für alle Repositories zusammen. Der Zähler beginnt am Monatsersten neu. Eine Linux-Minute darüber hinaus
  kostet 0,006 $ (Abrechnung Oktober 2026).
- **Oktober 2026:**
  - Das Kontingent war am 10.10. aufgebraucht, nach vier Entwicklungstagen.
  - Verbrauch: ImmobilienSoftware 1.730 Minuten, davon 25 für die WebKit-Schleife, berichtsheft-app 270 Minuten.
  - Spitzentag war der 8.10. mit 867 Minuten.
  - Danach brach GitHub jeden Job nach 2 Sekunden ab, ohne Runner und ohne Log. Etappe 8 wurde deshalb ohne
    WebKit- und Firefox-Prüfung gemergt.
- **Ziel:**
  - Die CI findet Fehler weiterhin **vor** dem Merge.
  - Der Durchschnitt bleibt unter dem Freikontingent.
  - Kein Monat kostet mehr als das Budget.

## 2. Begriffe

- **Schnelle Prüfung:** Unit-Tests, Build, Lint, Typecheck, Formatierung, AK-Abdeckung, also alles ohne Browser und
  ohne Container-Stack. Ziel: höchstens 3 Minuten.
- **Volle Prüfung:** Browser- bzw. End-to-End-Tests in allen Pflicht-Konfigurationen, gegebenenfalls mit Container-Stack.
- **Kern-Prüfung:** Die volle Prüfung, beschränkt auf die wichtigste Konfiguration des Repositorys (Abschnitt 5).
- **Doku-Änderung:** Ein Push, der nur Dateien der Doku-Pfade des Repositorys ändert (Abschnitt 5).

## 3. Regeln

### Budget und Überwachung

- **CI-01 Budget:** Für Actions gilt ein Budget von **25 $ pro Monat**. Bei Erreichen stoppt Actions; mehr wird nie
  abgebucht. Chris stellt es unter Settings → Billing and plans → Budgets and alerts ein (Entscheidung 11.10.2026).
- **CI-02 Warnungen:** Für dieses Budget sind E-Mail-Warnungen bei 75 % und 90 % eingeschaltet. Erreicht der Verbrauch
  vor dem 20. des Monats das Freikontingent, sagt die Steuerung Chris Bescheid.
- **CI-03 Rückblick:** Am Monatsanfang vergleicht die Steuerung den Verbrauch des Vormonats je Repository mit dieser
  Richtlinie. Ein Repository, das mehr als die Hälfte des Freikontingents braucht, wird angepasst.

### Wann was läuft

- **CI-04 Schnelle Prüfung immer:** Die schnelle Prüfung läuft bei jedem Push auf einen PR und auf `main`.
- **CI-05 Draft-PR:** Solange ein PR ein Entwurf ist, läuft zusätzlich nur die Kern-Prüfung (Entscheidung 11.10.2026).
- **CI-06 Bereiter PR:** Wird ein PR auf „bereit“ gestellt (`ready_for_review`), läuft die volle Prüfung. Danach läuft
  sie bei jedem weiteren Push auf diesen PR.
- **CI-07 Doku-Änderungen:** Bei einer Doku-Änderung läuft nur die schnelle Prüfung, auch bei bereiten PRs
  (Entscheidung 11.10.2026).
- **CI-08 main nach dem Merge:** Auf `main` läuft nach einem Merge nur die schnelle Prüfung. Der PR hat die volle Prüfung
  bereits bestanden (Entscheidung 11.10.2026).
- **CI-09 Wochenlauf:**
  - Einmal pro Woche, montags früh, läuft die volle Prüfung auf `main` nach Zeitplan.
  - Gab es seit dem letzten Wochenlauf keinen neuen Commit auf `main`, endet der Lauf nach dem Vergleich ohne Tests.
  - Er lässt sich außerdem jederzeit von Hand starten (`workflow_dispatch`).
  - So fallen Wechselwirkungen zwischen PRs und schleichende Ausfälle spätestens nach einer Woche auf (Entscheidung
    11.10.2026).
- **CI-10 Alte Läufe abbrechen:** Ein neuer Push auf denselben PR bricht dessen noch laufende Prüfung ab
  (`concurrency` mit `cancel-in-progress`). Der Wochenlauf wird nicht abgebrochen.
- **CI-11 Diagnose nur von Hand:** Workflows zur Fehlersuche (z. B. Wiederholungsschleifen) starten nur von Hand und
  haben eine Obergrenze für Wiederholungen (höchstens 20). Sie laufen nie automatisch.

### Sparsam bauen

- **CI-12 Zeitlimit:** Jeder Job hat `timeout-minutes` von höchstens dem Doppelten eines normalen Laufs. Ein Hänger
  kostet so nicht mehr als zwei Läufe.
- **CI-13 Keine automatischen Wiederholungen:** In der CI gilt `retries: 0`. Ein unzuverlässiger Test wird untersucht,
  nicht verdeckt. Einen Lauf von Hand neu zu starten ist höchstens einmal erlaubt, und nur bei einem Abbruch vor dem
  ersten Test (Infrastruktur).
- **CI-14 Vorbereitete Umgebung:** Abhängigkeiten kommen aus einem Cache (z. B. `cache: npm`), Browser aus einem
  fertigen Image statt aus einer Installation in jedem Lauf.
- **CI-15 Artefakte:** Testspuren werden nur bei einem Fehlschlag hochgeladen und höchstens 7 Tage aufbewahrt.

### Arbeitsweise der Claude-Sitzungen

- **CI-16 Erst lokal, dann pushen:** Vor jedem Push laufen lokal die schnelle Prüfung und die Browser-Tests im
  verfügbaren Browser. Mehrere Commits gehen gebündelt in einem Push hinaus, nicht einzeln.
- **CI-17 Bereit erst, wenn lokal grün:** Ein PR bleibt Entwurf, bis lokal alles grün ist und die Review-Befunde
  eingearbeitet sind. Erst dann wird er auf „bereit“ gestellt. So läuft die volle Prüfung möglichst nur ein- bis
  zweimal je PR.
- **CI-18 Kein Lauf ohne Grund:** Keine leeren Commits, kein Schließen und Wiederöffnen eines PRs, um die CI
  anzustoßen. Kein Neustart über CI-13 hinaus.
- **CI-19 Notfall:** Läuft die CI nicht, weil das Budget erreicht ist oder GitHub ausfällt, darf Chris trotzdem
  mergen, wenn:
  - die lokale Prüfung grün ist,
  - der PR das vermerkt und
  - die volle Prüfung auf `main` beim nächsten möglichen Lauf von Hand nachgeholt wird.

  Befunde daraus werden sofort behoben (Entscheidung 11.10.2026).

## 4. Erwartete Wirkung

Grobe Schätzung pro Code-PR mit 6 Pushes als Entwurf und 2 Pushes nach „bereit“:

| | bisher | mit Richtlinie |
|---|---|---|
| Code-PR (ImmobilienSoftware) | 8 × ~12 Min. + Merge ~12 Min. ≈ 108 Min. | 6 × ~5 Min. + 2 × ~12 Min. + Merge 1 Min. ≈ 55 Min. |
| Doku-PR | ~12 Min. + Merge ~12 Min. ≈ 24 Min. | ~1 Min. + Merge 1 Min. ≈ 2 Min. |
| Wochenlauf | – | ~12 Min. × 4 ≈ 48 Min. im Monat |

- **Gesamt:** etwa 40–60 % weniger Minuten.
- **Ein Monat wie der Oktober 2026** (mehrere Etappen und lange Fehlersuche) bliebe trotzdem über 2.000 Minuten. Das
  Budget von 25 $ deckt dann gut 4.000 weitere Minuten.
- **Ruhige Monate** bleiben im Freikontingent.

## 5. Umsetzung je Repository

| Repository | Schnelle Prüfung | Kern-Prüfung (Draft) | Volle Prüfung | Doku-Pfade |
|---|---|---|---|---|
| ImmobilienSoftware | `npm test`, `npm run build`, `npm run ak -- --pruefen` | Playwright `webkit-iphone` (Firefox auf dem iPhone, Hauptgerät) | Playwright `webkit-iphone`, `firefox-rechner`, `chromium-rechner` | `docs/**`, `auftraege/**`, `*.md` |
| berichtsheft-app | Lint, Formatierung, Typecheck, Vitest mit PostgreSQL, AK-Abdeckung, Beispiel-PDF | keine; die Sitzungen testen lokal mit Test-Login (Docker-Compose-Stack ist der teure Teil) | Docker Compose + Playwright (Chromium, Firefox, Edge, 375 px) | `docs/**`, `*.md` |
| weitere Repositories (z. B. Übungs-Repos) | sinngemäß; Lern-Repos mit fremden Workflows bleiben unverändert | – | – | – |

Die Workflow-Änderungen kommen je Repository als eigener PR. Ihr Inhalt ist das, was diese Richtlinie verlangt. Ein
PR, der die Richtlinie umsetzt, nennt die CI-Nummern, die er abdeckt.

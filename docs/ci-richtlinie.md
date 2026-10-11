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
- **Ausblick:**
  - Chris arbeitet zunehmend spezifikationsgetrieben mit Claude Code. Es entstehen weitere Projekte, darunter ein
    Liferay-Update mit Migration: ein Java-Anwendungsserver mit Datenbank und Suchdienst, mit langen Testläufen.
  - Der Bedarf an CI-Minuten wächst also weiter.
  - Ein Runner auf dem Homelab kommt nicht in Frage, weil dessen Arbeitsspeicher knapp ist und die Last andere Dienste
    stört (E-059).
- **Ziel:**
  - Die CI findet Fehler **vor** dem Merge.
  - Sie steht nie wegen eines leeren Kontingents still.
  - Sie liefert spürbar schneller Ergebnisse.
  - Sie kostet planbar wenig.
  - Das Ziel wird gemessen (Abschnitt 6).

## 2. Begriffe

- **Schnelle Prüfung:** Unit-Tests, Build, Lint, Typecheck, Formatierung, AK-Abdeckung, also alles ohne Browser,
  Container-Stack oder Anwendungsserver. Ziel: höchstens 3 Minuten.
- **Volle Prüfung:** Browser- bzw. End-to-End-Tests in allen Pflicht-Konfigurationen, gegebenenfalls mit Container-Stack,
  Anwendungsserver oder Migrationstest.
- **Kern-Prüfung:** Die volle Prüfung, beschränkt auf die wichtigste Konfiguration des Repositorys (Abschnitt 7).
- **Schwerer Job:** Ein Job, der länger als 5 Minuten läuft oder Browser, einen Container-Stack oder einen
  Anwendungsserver braucht.
- **Doku-Änderung:** Ein Push, der nur Dateien der Doku-Pfade des Repositorys ändert (Abschnitt 7).
- **VPS:** Der gemietete Server, auf dem die selbst betriebenen Runner laufen (Abschnitt 4).

## 3. Regeln

### Wo was läuft

- **CI-01 Zwei Arten von Runnern:** Schnelle Prüfungen laufen auf den Runnern von GitHub. Sie starten parallel und
  verbrauchen kaum Minuten. Schwere Jobs laufen auf dem VPS und verbrauchen keine GitHub-Minuten.
- **CI-02 Zuordnung je Repository:** Ein Repository bekommt einen Runner auf dem VPS, sobald es einen schweren Job hat.
  Repositories ohne schwere Jobs bleiben ganz auf den Runnern von GitHub. Die Zuordnung steht in Abschnitt 7.
- **CI-03 Ein Runner je Repository:** Das Konto hat keine Organisation, deshalb ist jeder selbst betriebene Runner an
  genau ein Repository gebunden. Alle Runner laufen auf demselben VPS. Ein neues Repository mit schweren Jobs bekommt
  seinen Runner durch einen Eintrag in der Repository-Liste des Ansible-Playbooks (Abschnitt 4).
- **CI-04 Gleichzeitigkeit begrenzt:** Auf dem VPS laufen höchstens so viele schwere Jobs gleichzeitig, wie die
  Ausstattung trägt, anfangs **2**. Weitere Jobs warten, bis ein Platz frei ist. Wie die Grenze umgesetzt wird,
  entscheidet die Einrichtung.
- **CI-05 Ausweichen bei Ausfall:** Ist der VPS nicht erreichbar, lässt sich jede volle Prüfung von Hand auf den
  Runnern von GitHub starten (`workflow_dispatch` mit Auswahl des Runners). Das bezahlt das Budget (CI-06).

### Budget und Überwachung

- **CI-06 Budget:** Für GitHub Actions gilt ein Budget von **25 $ pro Monat**, bis der VPS läuft. Danach sind es
  **10 $** als Reserve. Bei Erreichen stoppt Actions; mehr wird nie abgebucht. Chris stellt es unter Settings →
  Billing and plans → Budgets and alerts ein (Entscheidung 11.10.2026).
- **CI-07 Warnungen:** Für das Budget sind E-Mail-Warnungen bei 75 % und 90 % eingeschaltet. Erreicht der
  GitHub-Verbrauch vor dem 20. des Monats das Freikontingent, sagt die Steuerung Chris Bescheid.
- **CI-08 Monatsrückblick:** Am Monatsanfang erfasst die Steuerung die Kennzahlen aus Abschnitt 6 für den Vormonat,
  also Kosten, Laufzeiten, Wartezeiten und Ausfälle. Weicht ein Wert vom Ziel ab, schlägt sie eine Änderung vor:
  Ausstattung anpassen, Zuordnung ändern oder Regeln nachschärfen.

### Wann was läuft

- **CI-09 Schnelle Prüfung immer:** Die schnelle Prüfung läuft bei jedem Push auf einen PR und auf `main`.
- **CI-10 Draft-PR:** Solange ein PR ein Entwurf ist, läuft zusätzlich nur die Kern-Prüfung (Entscheidung 11.10.2026).
- **CI-11 Bereiter PR:** Wird ein PR auf „bereit“ gestellt (`ready_for_review`), läuft die volle Prüfung. Danach läuft
  sie bei jedem weiteren Push auf diesen PR.
- **CI-12 Doku-Änderungen:** Bei einer Doku-Änderung läuft nur die schnelle Prüfung, auch bei bereiten PRs
  (Entscheidung 11.10.2026).
- **CI-13 main nach dem Merge:** Auf `main` läuft nach einem Merge nur die schnelle Prüfung. Der PR hat die volle
  Prüfung bereits bestanden (Entscheidung 11.10.2026).
- **CI-14 Wochenlauf:**
  - Einmal pro Woche, montags früh, läuft die volle Prüfung auf `main` nach Zeitplan.
  - Gab es seit dem letzten Wochenlauf keinen neuen Commit auf `main`, endet der Lauf nach dem Vergleich ohne Tests.
  - Er lässt sich außerdem jederzeit von Hand starten (`workflow_dispatch`).
  - Mehrere Repositories starten ihren Wochenlauf zeitversetzt, damit sie sich auf dem VPS nicht stauen.
  - So fallen Wechselwirkungen zwischen PRs und schleichende Ausfälle spätestens nach einer Woche auf (Entscheidung
    11.10.2026).
- **CI-15 Alte Läufe abbrechen:** Ein neuer Push auf denselben PR bricht dessen noch laufende Prüfung ab
  (`concurrency` mit `cancel-in-progress`). Der Wochenlauf wird nicht abgebrochen.
- **CI-16 Diagnose nur von Hand:** Workflows zur Fehlersuche (z. B. Wiederholungsschleifen) starten nur von Hand und
  haben eine Obergrenze für Wiederholungen (höchstens 20). Sie laufen nie automatisch.

### Sparsam und schnell bauen

- **CI-17 Zeitlimit:** Jeder Job hat `timeout-minutes` von höchstens dem Doppelten eines normalen Laufs. Ein Hänger
  blockiert so keinen Platz auf dem VPS länger als nötig.
- **CI-18 Keine automatischen Wiederholungen:** In der CI gilt `retries: 0`. Ein unzuverlässiger Test wird
  untersucht, nicht verdeckt. Einen Lauf von Hand neu zu starten ist höchstens einmal erlaubt, und nur bei einem
  Abbruch vor dem ersten Test (Infrastruktur).
- **CI-19 Zwischenspeicher nutzen:** Auf dem VPS bleiben zwischen den Läufen erhalten:
  - Docker-Images und -Schichten
  - Paket-Caches (npm, Maven/Gradle)
  - Browser-Images

  Auf den Runnern von GitHub kommen Abhängigkeiten aus dem Cache (z. B. `cache: npm`). Browser kommen aus einem
  fertigen Image, statt in jedem Lauf installiert zu werden.
- **CI-20 Artefakte:** Testspuren werden nur bei einem Fehlschlag hochgeladen und höchstens 7 Tage aufbewahrt.

### Arbeitsweise der Claude-Sitzungen

- **CI-21 Erst lokal, dann pushen:** Vor jedem Push laufen lokal die schnelle Prüfung und die Browser-Tests im
  verfügbaren Browser. Mehrere Commits gehen gebündelt in einem Push hinaus, nicht einzeln.
- **CI-22 Bereit erst, wenn lokal grün:** Ein PR bleibt Entwurf, bis lokal alles grün ist und die Review-Befunde
  eingearbeitet sind. Erst dann wird er auf „bereit“ gestellt. So läuft die volle Prüfung möglichst nur ein- bis
  zweimal je PR.
- **CI-23 Kein Lauf ohne Grund:** Keine leeren Commits, kein Schließen und Wiederöffnen eines PRs, um die CI
  anzustoßen. Kein Neustart über CI-18 hinaus.
- **CI-24 Notfall:** Läuft die CI nicht, weil VPS und Budget gleichzeitig ausfallen oder GitHub ausfällt, darf Chris
  trotzdem mergen, wenn:
  - die lokale Prüfung grün ist,
  - der PR das vermerkt und
  - die volle Prüfung auf `main` beim nächsten möglichen Lauf von Hand nachgeholt wird.

  Befunde daraus werden sofort behoben (Entscheidung 11.10.2026).
- **CI-25 Neues Repository:** Ein neues Projekt übernimmt diese Datei und ordnet sich in Abschnitt 7 ein, bevor sein
  erster Workflow läuft. Hat es schwere Jobs, bekommt es seinen Runner auf dem VPS (CI-03).

## 4. Der VPS

- **Anbieter und Ausstattung:**
  - Host Unlimited „vServer KVM“ mit 4 vCores (Xeon), 24 GB RAM, 120 GB SSD (RAID), Ubuntu 24.04 LTS Server.
  - Standort Deutschland, prepaid, ohne Mindestlaufzeit, jederzeit kündbar.
  - Kosten: 14,39 € im Monat (Stand 11.10.2026).
  - Die Traffic-Flatrate gilt nach Fair Use. Für CI braucht es nur einige GB im Monat.
- **Warum diese Größe:**
  - Zwei schwere Jobs gleichzeitig, z. B. Browser-Tests in drei Browsern und ein Docker-Stack.
  - Der RAM reicht auch für einen Liferay-Test mit Datenbank und Suchdienst (6 bis 10 GB).
  - Abgelehnt wurde IONOS VPS Linux XXL+: nach drei Monaten 59 € statt 17 € im Monat.
- **Einrichtung nur per Ansible:**
  - Das Playbook liegt in einem eigenen privaten Repository.
  - Es setzt den Server jederzeit gleich neu auf:
    - Updates, automatische Sicherheitsupdates
    - SSH nur mit Schlüssel, Firewall ohne offene Ports außer SSH
    - Docker
    - ein Runner je Repository aus einer Liste, als Dienst unter einem eigenen Benutzer ohne root-Rechte
    - Grenze für gleichzeitige schwere Jobs (CI-04)
    - wöchentliches Aufräumen alter Images und Arbeitsordner, damit die 120 GB reichen
  - Von Hand wird am Server nichts verändert.
- **Sicherheit:**
  - Auf dem VPS läuft Code aus jedem PR. Das ist vertretbar, weil nur Chris und seine Claude-Sitzungen in die privaten
    Repositories pushen. Ein öffentliches Repository bekommt nie einen Runner auf dem VPS.
  - Auf dem VPS liegen keine echten Kundendaten und keine Produktionszugänge. Tests, auch Migrationstests, nutzen nur
    erfundene oder anonymisierte Daten.
  - Zugangsdaten stehen nie im Repository oder im Chat.
- **Wachsen:**
  - Werden die Ziele für die Wartezeit dauerhaft verfehlt (Abschnitt 6), wird das Paket beim selben Anbieter größer
    gebucht (bis 12 vCores und 64 GB) und die Grenze in CI-04 angehoben.
  - Reicht das nicht, kommt ein zweiter VPS mit demselben Playbook dazu.
  - Ein Snapshot vor jeder größeren Änderung sichert den Stand.

## 5. Erwartete Wirkung

- **GitHub-Minuten:**
  - Fallen nur noch für schnelle Prüfungen an, etwa 1 bis 3 Minuten je Push.
  - Ein Monat wie der Oktober 2026 hätte so grob 300 bis 500 Minuten gebraucht statt 2.000.
  - Das Freikontingent reicht dann auch für deutlich mehr Projekte.
- **Kosten:**
  - Der VPS kostet fest 14,39 €. Das entspricht etwa 2.600 GitHub-Minuten zu 0,006 $.
  - Schon die schweren Jobs des Oktobers (rund 1.700 Minuten) und erst recht Liferay-Migrationstests (20 bis 45 Minuten
    je Lauf) liegen darüber.
- **Tempo:**
  - Auf dem VPS entfallen das Laden des Browser-Images (etwa 2 GB), der Neubau von Docker-Stacks und die Installation
    von Paketen, weil der Zwischenspeicher erhalten bleibt (CI-19).
  - Erwartet wird, dass die volle Prüfung von ImmobilienSoftware von rund 15 auf höchstens 10 Minuten sinkt. Das wird
    gemessen, nicht angenommen.

## 6. Ziele und Wirtschaftlichkeitsprüfung

| Nr. | Ziel | Messung |
|---|---|---|
| Z-1 | Kein Stillstand der CI wegen Kontingent oder Budget | Läufe, die ohne Runner abgebrochen wurden: 0 |
| Z-2 | Volle Prüfung ImmobilienSoftware schneller | Dauer vom Push bis zum Ergebnis im Median ≤ 10 Min. (Oktober: ~15 Min.) |
| Z-3 | Kurze Wartezeit auf dem VPS | Wartezeit eines schweren Jobs auf einen freien Platz im Median ≤ 5 Min. |
| Z-4 | Planbare Kosten | VPS + GitHub zusammen ≤ 25 € im Monat |
| Z-5 | Wenig Pflege | Handarbeit am VPS ≤ 1 Stunde im Monat (Updates laufen automatisch) |

- **Wirtschaftlichkeitsprüfung:** Nach zwei vollen Monaten mit VPS, also Anfang Januar 2027 für November und Dezember, vergleicht die Steuerung
  zwei Zahlen:
  1. die tatsächlichen Kosten von VPS und GitHub,
  2. was dieselben Laufzeiten nur auf GitHub gekostet hätten (Laufzeit der VPS-Jobs aus der Actions-Historie ×
     0,006 $).
- **Ergebnis der Prüfung:**
  - Sind Z-1 bis Z-4 erreicht und ist der VPS nicht teurer als die Rechnung nur mit GitHub, bleibt er.
  - Sonst schlägt die Steuerung vor, das Paket zu verkleinern oder zu vergrößern oder den VPS zu kündigen. Wegen
    prepaid ist das zum Monatsende möglich.
  - Chris entscheidet.

## 7. Umsetzung je Repository

| Repository | Schnelle Prüfung (GitHub) | Kern-Prüfung im Draft | Volle Prüfung | Runner für schwere Jobs | Doku-Pfade |
|---|---|---|---|---|---|
| ImmobilienSoftware | `npm test`, `npm run build`, `npm run ak -- --pruefen` | Playwright `webkit-iphone` (Firefox auf dem iPhone, Hauptgerät) | Playwright `webkit-iphone`, `firefox-rechner`, `chromium-rechner` | VPS | `docs/**`, `auftraege/**`, `*.md` |
| berichtsheft-app | Lint, Formatierung, Typecheck, Vitest mit PostgreSQL, AK-Abdeckung, Beispiel-PDF | keine; die Sitzungen testen lokal mit Test-Login | Docker Compose + Playwright (Chromium, Firefox, Edge, 375 px) | VPS | `docs/**`, `*.md` |
| Liferay-Update und Migration (geplant) | wird mit der Spezifikation des Projekts festgelegt | wird festgelegt | Liferay mit Datenbank und Suchdienst, Migrationstest mit erfundenen Daten | VPS | wird festgelegt |
| weitere Projekte | nach CI-02 und CI-25 | | | VPS nur bei schweren Jobs | |
| Übungs-Repos mit fremden Workflows | unverändert | – | – | GitHub | – |

## 8. Reihenfolge der Umsetzung

1. Chris setzt das Budget von 25 $ (CI-06). Damit läuft die CI sofort wieder.
2. Die Workflows von ImmobilienSoftware und berichtsheft-app setzen CI-09 bis CI-20 um, je Repository ein PR, noch
   auf den Runnern von GitHub.
3. Chris bestellt den VPS. Die Steuerung schreibt den Auftrag für das Ansible-Repository mit Anleitung. Eine Sitzung
   setzt es um, und Chris führt es einmal aus.
4. Die schweren Jobs wechseln auf den VPS (`runs-on` mit dem Label des VPS). Das Budget sinkt auf 10 $.
5. Erster Monatsrückblick (CI-08) Anfang Dezember 2026, Wirtschaftlichkeitsprüfung Anfang Januar 2027.

# CI-Richtlinie für berichtsheft-app

Stand: 14.10.2026 · Status: **freigegeben (12.10.2026)** · Gilt für `Schoenechristopher/berichtsheft-app`

Diese Datei ist aus der gemeinsamen CI-Richtlinie vom 11.10.2026 abgeleitet. Seit das Repository in der Organisation
`Schoenechristopher` liegt und öffentlich ist, gelten hier eigene Bedingungen: kostenlose Standard-Runner von GitHub,
kein VPS. Die Regelnummern bleiben gleich, damit Verweise in Aufträgen und PRs stimmen; entfallene Regeln sind markiert.
Angaben zu anderen Repositories stehen bewusst nicht in dieser öffentlichen Datei.

## 1. Warum

- **Kosten:** Für öffentliche Repositories sind die Standard-Runner von GitHub kostenlos und ohne Minutengrenze. Die
  3.000 Freiminuten der Organisation gelten nur für private Repositories; dieses Repository verbraucht sie nicht.
- **Trotzdem sparsam:**
  - Laufzeit ist Wartezeit: Jede Minute CI verzögert die Rückmeldung an die Sitzung und an Chris.
  - Die Zahl gleichzeitiger Jobs ist für die ganze Organisation begrenzt.
  - Liferay-Läufe werden lang (geschätzt 20 bis 40 Minuten, der Upgrade-Test 45 bis 90 Minuten; gemessen wird in P00).
- **Öffentlich heißt sichtbar:** Logs, Artefakte und PRs kann jeder lesen, und fremde PRs können Workflows starten.
  Abschnitt 4 regelt das.
- **Ziel:**
  - Die CI findet Fehler **vor** dem Merge.
  - Sie liefert schnell Ergebnisse.
  - Sie lässt sich von außen nicht missbrauchen.
  - Das Ziel wird gemessen (Abschnitt 6).

## 2. Begriffe

- **Standard-Runner:** Linux-Runner von GitHub (`ubuntu-latest`). Für öffentliche Repositories: 4 Kerne, 16 GB RAM,
  14 GB SSD.
- **Schnelle Prüfung:** Unit-Tests, Build, Lint, Typecheck, Formatierung, AK-Abdeckung, also alles ohne Browser,
  Container-Stack oder Anwendungsserver. Ziel: höchstens 3 Minuten.
- **Volle Prüfung:** Browser- bzw. End-to-End-Tests in allen Pflicht-Konfigurationen, gegebenenfalls mit Container-Stack,
  Anwendungsserver oder Upgrade-Test.
- **Kern-Prüfung:** Die volle Prüfung, beschränkt auf die wichtigste Konfiguration (Abschnitt 7).
- **Schwerer Job:** Ein Job, der länger als 5 Minuten läuft oder Browser, einen Container-Stack oder einen
  Anwendungsserver braucht.
- **Doku-Änderung:** Ein Push, der nur Dateien der Doku-Pfade ändert (Abschnitt 7).
- **Änderungsklasse:** Einordnung eines PRs nach den Pfaden, die er gegenüber seinem Ziel-Branch ändert (Abschnitt 7).
  Sie bestimmt den Umfang der vollen Prüfung.

## 3. Regeln

### Wo was läuft

- **CI-01 Nur Standard-Runner:** Alle Jobs laufen auf den Standard-Runnern von GitHub. Größere, kostenpflichtige Runner
  nur nach Entscheidung von Chris.
- **CI-02** entfällt (Zuordnung zum VPS).
- **CI-03 Kein selbst betriebener Runner:** Dieses Repository bekommt nie einen selbst betriebenen Runner. Ein Workflow
  aus einem fremden PR könnte dort beliebigen Code auf dem Rechner ausführen.
- **CI-04 Gleichzeitigkeit begrenzt:** Ein schwerer Liferay-Job läuft je Plattform höchstens einmal gleichzeitig
  (`concurrency`-Gruppe je Plattform). Weitere Läufe warten oder brechen den älteren nach CI-15 ab.
- **CI-05** entfällt (Ausweichen bei Ausfall des VPS).

### Budget und Überwachung

- **CI-06 Kein Budget nötig:** Solange das Repository öffentlich ist, kosten Standard-Runner nichts. Wird es wieder
  privat, wird diese Richtlinie vor dem nächsten Push überarbeitet.
- **CI-07** entfällt (Warnungen zum Kontingent).
- **CI-08 Monatsrückblick:** Am Monatsanfang erfasst die Steuerung die Kennzahlen aus Abschnitt 6 für den Vormonat,
  also Laufzeiten, Wartezeiten und Ausfälle. Weicht ein Wert vom Ziel ab, schlägt sie eine Änderung vor.

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
  - GitHub schaltet Zeitpläne in öffentlichen Repositories nach 60 Tagen ohne Aktivität ab. Der Monatsrückblick (CI-08)
    prüft, ob der Wochenlauf noch aktiv ist.
  - So fallen Wechselwirkungen zwischen PRs und schleichende Ausfälle spätestens nach einer Woche auf (Entscheidung
    11.10.2026).
- **CI-15 Alte Läufe abbrechen:** Ein neuer Push auf denselben PR bricht dessen noch laufende Prüfung ab
  (`concurrency` mit `cancel-in-progress`). Der Wochenlauf wird nicht abgebrochen.
- **CI-16 Diagnose nur von Hand:** Workflows zur Fehlersuche (z. B. Wiederholungsschleifen) starten nur von Hand und
  haben eine Obergrenze für Wiederholungen (höchstens 20). Sie laufen nie automatisch.

### Umfang der Prüfung

- **CI-32 Umfang nach Änderungsklasse:** Die volle Prüfung prüft nur, was die Änderung erreichen kann. Welche Pfade
  welche Klasse auslösen und welche Jobs dazugehören, steht in Abschnitt 7. Ändert ein PR Dateien mehrerer Klassen,
  gilt die Vereinigung aller ausgelösten Jobs.
- **CI-33 Ganzer PR, nicht letzter Push:** Die Klasse ergibt sich aus allen Änderungen des PRs gegenüber dem
  Ziel-Branch, nicht nur aus dem letzten Push. So geht keine Änderung verloren, wenn später nur noch Doku folgt.
- **CI-34 Im Zweifel voll:** Ein Pfad, der zu keiner Klasse passt, löst die volle Prüfung in allen Konfigurationen der
  TypeScript-App aus. Eine neue Datei oder ein neuer Ordner wird beim ersten Mal in Abschnitt 7 eingeordnet.
- **CI-35 Voll erzwingen:** Die volle Prüfung in allen Konfigurationen läuft unabhängig von der Klasse
  - im Wochenlauf (CI-14), dort auch für jede Liferay-Umsetzung,
  - bei einem PR mit dem Label `volle-pruefung`,
  - beim Start von Hand (`workflow_dispatch` mit Auswahl „voll“).
- **CI-36 Abschluss-Job:** Ein letzter Job „Prüfung abgeschlossen“ prüft, dass jeder für die Klasse nötige Job grün
  ist. Nur dieser Job ist im Regelsatz für `main` Pflicht. Grund: Ein übersprungener Job zählt bei GitHub als
  bestanden, ein Pflicht-Check je Job würde also nichts absichern.
- **CI-37 Auswahl nach Modul (umgesetzt, Etappe A):** Bei Logik- und Serveränderungen laufen nur die Ablauf-Fälle
  (Browser) der betroffenen Module und der Module, die nach dem Abhängigkeitsgraph davon abhängen; die Zuordnung Datei →
  Modul kommt aus der Code-Landkarte. Fachlogik- und Daten-Fälle laufen immer vollständig, im Zweifel laufen alle Fälle
  (CI-34). Umgesetzt in Etappe A (Paket A2a; Entscheidungen E5 und E6 aus Etappe A bzw. G3):
  - Modulgraph: `specs/modulgraph.json` (direkte Abhängigkeiten wie im Diagramm in `specs/00-uebersicht.md`; ein Test
    der schnellen Prüfung gleicht beide Diagramme und die Tabelle „Modulschnitt“ in `docs/06` ab).
  - Auswahl: `scripts/pruefumfang/modulauswahl.mjs` mit Tests in `scripts/pruefumfang/pruefumfang.test.ts`; Datei →
    Modul über die Abschnitte der Code-Landkarte (`sectionsByFile()` in `scripts/code-landkarte/landkarte.mjs`), Fall →
    Modul über die AK-IDs in Testnamen und Tags und Abschnitt 4 der Fach-Specs.
  - Gilt nur, wenn der PR außer Doku nur Dateien der Klassen L und P ändert. Klasse O, I, unbekannte Pfade und die
    erzwungene volle Prüfung (CI-35) wählen alle Fälle. Ebenso alle Fälle: eine Datei im „Querschnitt“ oder in keinem
    Modulabschnitt der Landkarte (z. B. `prisma/**`, `src/worker/**`, `specs/pruefung/**`) und das Testgerüst
    (`e2e/helpers.ts`, `e2e/pruefung/**`, `tests/pruefung/**`, `playwright.config.ts`).
  - Ein Fall ohne AK-ID und die Fälle in `ui-ak`, `barrierefreiheit`, `produktionsmodus`, `screenshots`, `ak-1101-…`
    und `ak-1102-…` laufen immer mit; eine geänderte Spec-Datei unter `e2e/` läuft immer.
  - Der Job „Umfang“ gibt die Auswahl als Muster für `playwright test --grep-invert` aus (`ablauf_grep_invert`, leer =
    alle Fälle) und nennt Module und Gründe mit festen Codes in der Zusammenfassung des Laufs (`modul:M01`,
    `abhaengig:M03`, `datei:e2e/…`, `alle:querschnitt`, `alle:unbekannte-datei`, `alle:testgeruest`,
    `alle:klasse-O`, `alle:erzwungen` …). Lokal: `npm run pruefumfang -- --auswahl <Datei> …`.

### Sparsam und schnell bauen

- **CI-17 Zeitlimit:** Jeder Job hat `timeout-minutes` von höchstens dem Doppelten eines normalen Laufs. Ein Hänger
  blockiert so keinen Platz in der Organisation länger als nötig.
- **CI-18 Keine automatischen Wiederholungen:** In der CI gilt `retries: 0`. Ein unzuverlässiger Test wird
  untersucht, nicht verdeckt. Einen Lauf von Hand neu zu starten ist höchstens einmal erlaubt, und nur bei einem
  Abbruch vor dem ersten Test (Infrastruktur).
- **CI-19 Zwischenspeicher nutzen:** Abhängigkeiten kommen aus dem Actions-Cache (höchstens 10 GB je Repository):
  - Paket-Caches (npm, Gradle, Ivy/Ant)
  - Playwright-Browser
  - Liferay-Bundles und Java-Laufzeiten, sobald es Liferay-Jobs gibt
- **CI-20 Artefakte:** Testspuren werden nur bei einem Fehlschlag hochgeladen und höchstens 7 Tage aufbewahrt.

### Arbeitsweise der Claude-Sitzungen

- **CI-21 Erst lokal, dann pushen:** Vor jedem Push laufen lokal die schnelle Prüfung und die Browser-Tests im
  verfügbaren Browser. Mehrere Commits gehen gebündelt in einem Push hinaus, nicht einzeln.
- **CI-22 Bereit erst, wenn lokal grün:** Ein PR bleibt Entwurf, bis lokal alles grün ist und die Review-Befunde
  eingearbeitet sind. Erst dann wird er auf „bereit“ gestellt. So läuft die volle Prüfung möglichst nur ein- bis
  zweimal je PR.
- **CI-23 Kein Lauf ohne Grund:** Keine leeren Commits, kein Schließen und Wiederöffnen eines PRs, um die CI
  anzustoßen. Kein Neustart über CI-18 hinaus.
- **CI-24 Notfall:** Läuft die CI nicht, weil GitHub ausfällt, darf Chris trotzdem mergen, wenn:
  - die lokale Prüfung grün ist,
  - der PR das vermerkt und
  - die volle Prüfung auf `main` beim nächsten möglichen Lauf von Hand nachgeholt wird.

  Befunde daraus werden sofort behoben (Entscheidung 11.10.2026).
- **CI-25 Neue Teile im Repository:** Eine neue Umsetzung (z. B. `liferay-625/`, `liferay-72/`) ordnet sich in
  Abschnitt 7 ein, bevor ihr erster Workflow läuft.

## 4. Öffentliches Repository: Sicherheit

- **CI-26 Workflows aus Forks nur nach Freigabe:** Unter Settings → Actions → General ist „Require approval for all
  external contributors“ gesetzt. Ein fremder PR startet keinen Job, bevor Chris ihn freigibt.
- **CI-27 Rechte knapp halten:** Jeder Workflow setzt `permissions: contents: read`. Mehr Rechte gibt es nur je Job und
  mit Begründung im PR. `pull_request_target` und `workflow_run` mit Code aus einem PR sind verboten. Ausnahme: der Workflow „Rückmeldung“
  (CI-38) darf als `workflow_run` am PR kommentieren, ohne Checkout und ohne Code aus dem PR.
- **CI-28 Keine Geheimnisse in Workflows:** Workflows nutzen nur Demo-Werte (`.env.example`, `docker-compose.yml`,
  Keycloak-Realm). Braucht ein Job je ein echtes Secret, läuft er nie für PRs aus Forks und wird vorher mit Chris
  abgestimmt.
- **CI-29 Logs und Artefakte sind öffentlich:** Darin stehen nur Testdaten. Kein Ausgeben von Umgebungsvariablen
  (`env`, `printenv`), keine echten Adressen, keine Datenbankabzüge außer aus dem Seed.
- **CI-30 Fremde Actions:** Nur Actions von GitHub (`actions/*`). Andere nur auf einen Commit-SHA festgelegt und nach
  Prüfung im PR.
- **CI-31 Fremdsoftware nicht einchecken:** Liferay-Bundles, JDKs und Datenbank-Abzüge kommen aus ihrer Bezugsquelle
  oder dem Cache, nie ins Repository.
- **CI-38 Rückmeldung als Kommentar:** Der Workflow `rueckmeldung.yml` schreibt nach jedem abgeschlossenen CI-Lauf eines
  PRs einen Kommentar mit dem Ergebnis von „Prüfung abgeschlossen“ (grün oder rot, Commit, Link zum Lauf). Grüne Läufe
  erzeugen sonst kein Ereignis für Sitzungen, die den PR abonnieren. Abgebrochene Läufe (CI-15) bleiben stumm; Läufe aus
  `merge_group`, `push` und Wochenlauf gehören zu keinem PR. Rechte nur `pull-requests: write` und `actions: read`, nur
  `GITHUB_TOKEN`, keine fremden Actions. Er läuft nur mit der Datei vom Standardzweig, ein Lauf am eigenen PR ist nicht
  möglich.
- **Einstellungen im Repository** (setzt Chris einmalig):
  - Regelsatz für `main`: nur per PR, kein Force-Push, schnelle Prüfung muss grün sein.
  - Code security: Secret Scanning mit Push Protection, Dependabot-Warnungen, „Private vulnerability reporting“.
  - Im eigenen GitHub-Konto: „Keep my email addresses private“ und „Block command line pushes that expose my email“.

## 5. Erwartete Wirkung

- **Kosten:** keine für dieses Repository.
- **Liferay:** Auf den größeren Runnern öffentlicher Repositories ist ein Liferay-Test mit Datenbank und Suchdienst
  voraussichtlich machbar. Am engsten wird Liferay 7.2 mit Elasticsearch; P00 der Plattform misst Speicher und Laufzeit.
- **Tempo:** Ohne Zwischenspeicher zwischen den Läufen müssen Docker-Stacks und Liferay jedes Mal neu starten. Der
  Actions-Cache (CI-19) spart Downloads, nicht den Start.

## 6. Ziele

| Nr. | Ziel | Messung |
|---|---|---|
| Z-1 | Kein Stillstand der CI | Läufe, die ohne Runner abgebrochen wurden: 0 |
| Z-2 | Schnelle Prüfung schnell | Dauer im Median ≤ 3 Min. |
| Z-3 | Volle Prüfung TypeScript in vertretbarer Zeit | Dauer im Median ≤ 20 Min. |
| Z-4 | Volle Prüfung Liferay in vertretbarer Zeit | Dauer je Plattform im Median ≤ 45 Min. (Wert wird in P00 bestätigt) |
| Z-5 | Kein Lauf aus Forks ohne Freigabe | Läufe aus Forks ohne Freigabe: 0 |

## 7. Umsetzung in diesem Repository

### Änderungsklassen (CI-32)

Die volle Prüfung läuft erst, wenn der PR „bereit“ ist (CI-10, CI-11). Die schnelle Prüfung läuft immer (CI-09).

| Klasse | Pfade | Volle Prüfung bei bereitem PR | Begründung |
|---|---|---|---|
| D Doku | `docs/**`, `profile/**`, `playbooks/**`, `specs/**/*.md`, `*.md` | keine (CI-12) | ändert kein Verhalten |
| P Prüffälle | `specs/pruefung/**` | TypeScript: wie Klasse L; Liferay: nur im Wochenlauf oder mit Label `volle-pruefung` | der Prüf-Runner der schnellen Prüfung führt die Fachlogik-Fälle schon aus |
| L Logik und Server | `src/domain/**`, `src/lib/**`, `src/pdf/**`, `src/worker/**`, `src/auth.ts`, `src/proxy.ts`, `prisma/**`, `scripts/**`, `tests/**`, `specs/modulgraph.json` | Docker Compose + Playwright `chromium` und `smartphone-375`, Ablauf-Fälle nach Modul (CI-37) | Verhalten ändert sich, die Darstellung im Browser nicht |
| O Oberfläche | `src/app/**`, `src/components/**`, `assets/**`, `public/**`, `e2e/**`, `playwright.config.ts`, `next.config.ts`, `postcss.config.mjs` | zusätzlich `firefox`, `msedge`, `a11y`, `screenshots` | Darstellung und Barrierefreiheit können je Browser abweichen |
| I Infrastruktur und Abhängigkeiten | `package.json`, `package-lock.json`, `Dockerfile`, `docker/**`, `docker-compose.yml`, `keycloak/**`, `.github/**`, `.claude/**`, `.env.example`, `.dockerignore`, `.gitattributes`, `.gitignore`, `.prettierignore`, `.prettierrc.json`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `prisma.config.ts` | alle Konfigurationen der TypeScript-App | wirkt auf alles, z. B. neue Bibliotheksversionen |
| L62 Liferay 6.2.5 | `liferay-625/**` | Liferay-6.2.5-Job | eigene Umsetzung |
| L72 Liferay 7.2 | `liferay-72/**` | Liferay-7.2-Job | eigene Umsetzung |
| U Upgrade | – | nur von Hand (`workflow_dispatch`) | sehr lang, nur bei U-PRs nötig |
| sonstige Pfade | alles, was oben fehlt | alle Konfigurationen der TypeScript-App (CI-34) | im Zweifel voll |

Beispiele: Ein PR, der nur `docs/` und `src/domain/weeks.ts` ändert, ist Klasse L und läuft mit Chromium und 375 px.
Ein PR mit einer neuen Komponente ist Klasse O und läuft in allen Browsern. Ein Dependabot-PR ist Klasse I.

Festlegung des Umfangs (12.10.2026, von Chris an Claude übertragen):

- **Klasse L nur mit Chromium und 375 px:** Logik, Datenbank, PDF und Worker laufen auf dem Server und sind vom Browser
  unabhängig. Chromium prüft die Abläufe, 375 px die mobile Bedienung (AK-1102). Abweichungen in Firefox oder Edge
  entstehen in Darstellung und Bedienung, also in Klasse O.
- **Testdateien (`e2e/**`) in Klasse O:** AK-1101 verlangt jeden Browser-Test in Chromium, Firefox und Edge. Ein
  geänderter Test muss daher in allen dreien laufen, sonst fällt ein Fehler erst im Wochenlauf auf.
- **Restrisiko:** Was die Auswahl übersieht, findet der Wochenlauf (CI-14) mit allen Konfigurationen spätestens nach
  einer Woche. Wer unsicher ist, setzt das Label `volle-pruefung` (CI-35).
- **Automatisches Mergen:** Ein PR, der automatisch gemergt werden soll, braucht mindestens den Umfang der Klasse L
  (`docs/07-spec-automatisches-mergen.md`, AM-R08). Der Job „Umfang“ setzt das um: Mit dem Label `automerge` läuft
  mindestens Compose mit Chromium und 375 px. Der Workflow „Merge-Kriterien“ (nur lesende Rechte, CI-27) wertet den
  Antrag aus.

### Browser für Liferay (L62, L72)

Vorschlag (G4-L, 16.10.2026), gilt für die Ablauf-Prüffälle beider Liferay-Umsetzungen:

- **Je PR (volle Prüfung der Klasse L62 bzw. L72):** Ablauf-Prüffälle in Chromium und in 375 px (`chromium`,
  `smartphone-375`), wie Klasse L der TypeScript-App.
- **Firefox und Edge** (`firefox`, `msedge`): im Wochenlauf (CI-14) und bei einem PR mit dem Label `volle-pruefung`
  (CI-35); P10 der Plattform läuft mit diesem Label.
- **Begründung:** AK-1101 verlangt jeden Browser-Test in Chromium, Firefox und Edge; das erfüllen Wochenlauf und
  P10-Abnahme. Je PR alle drei Browser zu prüfen, verdreifacht die Laufzeit des Ablauf-Teils in einem Job, der mit
  Portal-Start ohnehin bis zu 60 Minuten braucht (P00 misst). Die Liferay-Pakete ändern meist Service und Logik;
  Darstellung und Bedienung prüfen Chromium und 375 px (AK-1102). Restrisiko wie oben: Ein Fehler nur in Firefox oder
  Edge fällt spätestens im Wochenlauf auf.
- **Bitte bestätigen:** Diese Festlegung ersetzt den Hinweis „Prüffälle mit Playwright (Chromium)“ in der Tabelle
  unten; die Workflows setzt ein eigener Auftrag der Klasse I um.

### Prüfungen je Teil

| Teil | Schnelle Prüfung | Kern-Prüfung im Draft | Volle Prüfung | Doku-Pfade |
|---|---|---|---|---|
| TypeScript-App | Lint, Formatierung, Typecheck, Vitest mit PostgreSQL, AK-Abdeckung, Beispiel-PDF | keine; die Sitzungen testen lokal mit Test-Login | Docker Compose + Playwright (Chromium, Firefox, Edge, 375 px, axe, Screenshots); Umfang nach Änderungsklasse | siehe Klasse D |
| Specs und Prüffälle (ab G1) | Prüf-Runner für TypeScript, AK-Abdeckung | keine | wie TypeScript-App | `specs/**/*.md` |
| Liferay 6.2.5 (ab L62) | wird in P00 festgelegt (Build, JUnit) | keine | Liferay mit Datenbank, Prüffälle mit Playwright (Chromium, 375 px; Firefox und Edge siehe „Browser für Liferay“); nur bei Änderungen unter `liferay-625/` | wird in P00 festgelegt |
| Liferay 7.2 (ab L72) | wird in P00 festgelegt (Gradle, JUnit) | keine | Liferay mit Datenbank und Elasticsearch, Prüffälle mit Playwright (Chromium, 375 px; Firefox und Edge siehe „Browser für Liferay“); nur bei Änderungen unter `liferay-72/` | wird in P00 festgelegt |
| Upgrade 6.2.5 → 7.2 (ab U) | – | – | nur von Hand (`workflow_dispatch`): 6.2.5 befüllen, Upgrade, 7.2 prüfen | – |

## 8. Reihenfolge der Umsetzung

1. Chris gibt diese Richtlinie frei, setzt den E-Mail-Schutz im eigenen Konto und stellt das Repository auf öffentlich.
2. Chris setzt die Einstellungen aus Abschnitt 4.
3. Ein PR setzt CI-09 bis CI-20, CI-27 und CI-32 bis CI-36 im Workflow um. Die Zuordnung der Pfade steht an einer
   Stelle im Workflow, und ein Test der schnellen Prüfung meldet Dateien im Repository, die keiner Klasse angehören.
   Die Workflows reagieren zusätzlich auf `merge_group`, damit die Merge-Warteschlange aus
   `docs/07-spec-automatisches-mergen.md` prüfen kann.
   **Umgesetzt am 12.10.2026:**
   - Die Zuordnung steht in `scripts/pruefumfang/pruefumfang.mjs`, mit Tests.
   - Der Job „Umfang“ bestimmt den Umfang je Lauf und zeigt ihn in der Zusammenfassung des Laufs.
   - „Prüfung abgeschlossen“ ist der Abschluss-Job.
   - `npm run pruefumfang -- --pruefen` in der schnellen Prüfung meldet Dateien ohne Klasse.
   - Jedes neue Label an einem PR startet die Prüfung neu. So stammt das Ergebnis am Commit immer aus einer
     vollständigen Auswertung und nie aus einem übersprungenen Lauf.
4. Liferay-Jobs kommen mit L62 bzw. L72 dazu (CI-25).
5. Erster Monatsrückblick (CI-08) Anfang Dezember 2026.

# Spec Automatisches Mergen

Stand: 12.10.2026 · Status: **freigegeben (13.10.2026)** · gilt für `Schoenechristopher/berichtsheft-app`

## Ziel und Geltungsbereich

Ab den Liferay-Etappen entstehen viele PRs: je Plattform elf Playbooks, oft in mehrere Arbeitspakete geteilt, dazu das
Upgrade. Wenn Chris jeden dieser PRs selbst mergt, wird er zum Engpass, und die Steuerungsinstanz wartet. Diese Spec legt
fest, **wann ein PR ohne Klick von Chris gemergt werden darf, wer das auslöst, wie es technisch abgesichert ist und was
bei einem Fehler passiert.**

- **Grundsatz:** Automatisch gemergt wird nur, was eine Maschine vollständig prüfen kann. Alles, was eine Auslegung, eine
  Regel oder die Sicherheit betrifft, bleibt bei Chris.
- **Gilt für:** PRs aus Branches dieses Repositorys, die eine Claude-Sitzung erstellt hat, und Dependabot-PRs.
- **Gilt nicht für:**
  - PRs aus Forks, also von außen.
  - Etappen-PRs, die Chris ausdrücklich abnimmt (G1 bis G5, Abschluss von L62, L72, U).
  - Wegwerf-Branches der Blindtests; dort mergt die Steuerungsinstanz ohnehin selbst (`docs/06-spec-architektur.md`).
- **Ohne Antrag ändert sich nichts:** Wer nichts beantragt, merged wie bisher von Hand. Die Prüfung greift nur, wenn
  automatisches Mergen beantragt ist (AM-R01).

## Begriffe

- **Antrag:** Das Label `automerge` am PR. Nur Konten mit Schreibrecht können Labels setzen. Wer von außen beiträgt, kann
  also keinen Antrag stellen.
- **Merge-Kriterien:** Der Check gleichen Namens. Er wertet die Regeln dieser Spec aus und nennt jeden Verstoß einzeln.
- **Geschützter Pfad:** Eine Datei, deren Änderung immer Chris freigibt (AM-R04).
- **Abnahme der Steuerung:** Ein Kommentar der Steuerungsinstanz mit dem Ergebnis ihrer Prüfliste (AM-R07). Er trägt die
  Markierung `<!-- abnahme-steuerung sha=<Commit> -->` mit dem Stand des PRs, für den die Abnahme gilt.
- **Merge-Warteschlange:** Die Merge-Queue von GitHub. Sie prüft jeden PR noch einmal zusammen mit dem aktuellen `main`,
  bevor er gemergt wird.
- **Schalter:** Die Datei `.github/automerge.yml` mit `aktiv: true` oder `aktiv: false`. Sie ist selbst ein geschützter
  Pfad.
- **Schattenbetrieb:** Die Merge-Kriterien laufen und melden ihr Ergebnis, gemergt wird aber weiter von Hand (AM-R14).

## Regeln

### Auslösen

- **AM-R01 Nur auf Antrag:** Ohne Label `automerge` meldet der Check „Merge-Kriterien“ immer Erfolg mit dem Hinweis „kein
  Antrag“. Der Ablauf von Hand bleibt also unverändert.
- **AM-R02 Wer beantragt:** Den Antrag stellt die Steuerungsinstanz, nachdem sie das Arbeitspaket abgenommen hat
  (`docs/06-spec-architektur.md`, „Abnahme eines Pakets“). Chris darf ihn ebenfalls stellen. Eine Entwicklersitzung
  stellt ihn nie für ihren eigenen PR.
- **AM-R03 Wer mergt:** Ist der Antrag gestellt, schaltet die Steuerungsinstanz das automatische Mergen von GitHub für
  den PR ein. GitHub reiht ihn in die Merge-Warteschlange ein, sobald alle Pflicht-Checks grün sind. Gemergt wird mit
  einem Merge-Commit wie bisher.

### Was nie automatisch gemergt wird

- **AM-R04 Geschützte Pfade:** Ändert der PR eine dieser Dateien, ist automatisches Mergen ausgeschlossen:
  - Regeln und Auslegungen: `docs/01-spezifikation.md`, `docs/02-plan.md`, `docs/05-ui-spezifikation.md`,
    `docs/06-spec-architektur.md`, diese Spec, `docs/08-spec-modellwahl.md`, `docs/09-spec-kosteneffizienz.md`,
    `docs/ci-richtlinie.md`, `specs/**` außer `specs/code-landkarte.md`,
    `profile/**`, `playbooks/**`.
  - Anweisungen an Sitzungen: `CLAUDE.md`, `AGENTS.md`, `.claude/**`. Abgelegte Aufträge (`AUFTRAG-*.md`) sind nicht
    geschützt, sie dokumentieren nur, was die Steuerung beauftragt hat.
  - CI, Laufzeit und Schalter: `.github/**`, `Dockerfile`, `docker/**`, `docker-compose.yml`, `keycloak/**`,
    `.env.example`.
  - Abhängigkeiten: `package.json`, `package-lock.json` (Ausnahme siehe AM-R09) und die Build-Dateien im
    Wurzelordner der Liferay-Umsetzungen (`settings.gradle`, `gradle.properties`, `build.gradle`, `build.properties`,
    `build.xml`, `ivy.xml`). Build-Dateien einzelner Module sind nicht geschützt, weil jedes Arbeitspaket Module
    anlegt; eine externe Bibliothek, die nicht im Profil der Plattform steht, schließt das automatische Mergen aber aus.
  - Sicherheit: `src/auth.ts`, `src/proxy.ts`, `src/lib/auth/**`, `src/domain/access.ts`,
    `src/domain/report-access.ts`; auf Liferay die entsprechenden Dateien, die das Profil als sicherheitsrelevant
    benennt.
  - Datenbank: `prisma/migrations/**`, `prisma/schema.prisma` und die Upgrade-Schritte der Reihe U. Migrationen
    lassen sich nicht einfach zurücknehmen. `service.xml` in `liferay-625/` und `liferay-72/` ist nicht geschützt, weil
    dort noch keine Daten bestehen; dass die Tabellen dem Profil entsprechen, prüft die Abnahme der Steuerung (AM-R07).
  - Die Umsetzung dieser Spec selbst: `scripts/merge-kriterien/**`.
- **AM-R05 Offene Fragen:** Steht in der PR-Beschreibung unter „Bitte bestätigen“ ein Listenpunkt, der nicht mit `[x]`
  abgehakt ist, ist automatisches Mergen ausgeschlossen. Das gilt für jeden Listenpunkt, auch nummeriert oder ohne
  Checkbox. Fragen an Chris werden also nie übergangen.
- **AM-R06 Keine schwächeren Tests:** Ausgeschlossen ist ein PR, der
  - eine Testdatei löscht oder umbenennt (`*.test.ts`, `e2e/**`, `tests/**`, Liferay-Testordner),
  - einen Test überspringt oder einschränkt (`.skip`, `.only`, `.fixme`, `test.fail`, `@Ignore`, `@Disabled`),
  - die Zahl der Tests zu einer AK- oder UI-AK-ID verringert (`npm run ak:abdeckung` vor und nach dem PR) oder
  - einen Prüffall entfernt.

### Was erfüllt sein muss

- **AM-R07 Abnahme der Steuerung:** Am PR steht ein Abnahme-Kommentar mit `<!-- abnahme-steuerung sha=<Commit> -->` von
  einem Konto mit Schreibrecht, und `<Commit>` ist der aktuelle Stand des PRs (mindestens 7 Zeichen); ohne gültiges
  `sha=` gilt die Abnahme als fehlend, Grund `abnahme-ohne-sha`. Nach jedem Push
  ist eine neue Abnahme nötig. Schreibrecht heißt: Eigentümer, Mitglied der Organisation oder Mitarbeitender des
  Repositorys. Die Prüfliste darin umfasst:
  - Arbeitspaket nach Playbook erledigt.
  - Prüffälle des Pakets grün, vorher fertige Pakete weiter grün.
  - Keine Abweichung von Fach-Spec oder Profil ohne Freigabe; auf Liferay entsprechen Tabellen und Spalten dem Profil.
  - Review-Befunde eingearbeitet.
- **AM-R08 CI grün:** Der Abschluss-Job „Prüfung abgeschlossen“ (`docs/ci-richtlinie.md`, CI-36) ist auf dem aktuellen
  Stand grün, und zwar mit dem Umfang der Änderungsklasse (CI-32), mindestens aber der Klasse L. Ein PR, der nur Doku
  ändert, braucht also trotzdem einmal Chromium und 375 px, wenn er automatisch gemergt werden soll. Umgesetzt im Job
  „Umfang“: Mit dem Label `automerge` läuft mindestens der Umfang der Klasse L; das Label startet die Prüfung neu.
- **AM-R09 Dependabot:** Ein Dependabot-PR darf trotz AM-R04 automatisch gemergt werden, wenn er nur Patch- oder
  Minor-Versionen von Entwicklungsabhängigkeiten oder nur Patch-Versionen von Laufzeitabhängigkeiten anhebt und die
  volle Prüfung aller Konfigurationen grün ist. Major-Versionen und Minor-Versionen von Laufzeitabhängigkeiten gibt
  Chris frei. Die Abnahme der Steuerung (AM-R07) entfällt hier; den Antrag stellt sie trotzdem.
- **AM-R10 Größe:** Der PR ändert höchstens 1.500 Zeilen, ohne Lockfiles und erzeugte Dateien wie
  `docs/03-testabdeckung.md`. Größere PRs werden geteilt oder von Chris gemergt. Der Wert wird im Schattenbetrieb
  überprüft.
- **AM-R11 main ist grün:** Die letzte Prüfung auf `main` ist grün. Solange `main` rot ist, wird nichts automatisch
  gemergt, außer dem Revert nach AM-R13.
- **AM-R12 Schalter an:** In `.github/automerge.yml` steht `aktiv: true`.

### Nach dem Merge

- **AM-R13 Rücknahme bei Fehler:** Wird `main` nach einem automatischen Merge rot (schnelle Prüfung oder Wochenlauf) und
  ist der Merge die wahrscheinliche Ursache, erstellt die Steuerungsinstanz sofort einen Revert-PR. Der Revert-PR darf
  automatisch gemergt werden, wenn seine Prüfung grün ist; AM-R04 und AM-R07 gelten für ihn nicht. Chris bekommt Bescheid.
  Bis `main` wieder grün ist, gilt AM-R11.
- **AM-R14 Schattenbetrieb zuerst:** Nach der Einführung laufen die Merge-Kriterien zunächst nur mit. Die Steuerung
  stellt Anträge, schaltet das automatische Mergen von GitHub aber nicht ein. Für jeden PR vermerkt sie, ob die
  Kriterien ihn freigegeben hätten und wie Chris entschieden hat. Nach 10 PRs ohne Widerspruch oder auf Entscheidung von
  Chris setzt Chris `aktiv: true`.
- **AM-R15 Nachvollziehbar:** Jeder automatische Merge steht
  - als Kommentar am PR, mit den ausgewerteten Kriterien und dem Ergebnis,
  - in `FORTSCHRITT.md` der Umsetzung und
  - in der wöchentlichen Zusammenfassung der Steuerung an Chris.

## Akzeptanzkriterien

| ID | Kriterium | Ebene |
| --- | --- | --- |
| AM-AK-01 | Ohne Label `automerge` ist der Check „Merge-Kriterien“ grün und meldet „kein Antrag“, auch wenn der PR geschützte Pfade ändert. | Fachlogik |
| AM-AK-02 | Mit Antrag und einer Änderung an `docs/01-spezifikation.md` ist der Check rot und nennt „geschützter Pfad: docs/01-spezifikation.md“. | Fachlogik |
| AM-AK-03 | Ein PR aus einem Fork ist mit Antrag rot („PR von außen“). | Fachlogik |
| AM-AK-04 | Ein nicht abgehakter Punkt unter „Bitte bestätigen“ macht den Check rot und nennt den Punkt. | Fachlogik |
| AM-AK-05 | Ein gelöschter Test, ein neues `.skip` oder weniger Tests zu einer AK-ID machen den Check rot und nennen Datei bzw. AK-ID. | Fachlogik |
| AM-AK-06 | Fehlt die Abnahme der Steuerung, ist sie älter als der letzte Push oder stammt sie von einem Konto ohne Schreibrecht, ist der Check rot. | Fachlogik |
| AM-AK-07 | Ein Dependabot-PR mit einem Patch-Update ist bei grüner voller Prüfung zulässig; ein Major-Update ist rot („Major-Version“). | Fachlogik |
| AM-AK-08 | Ein PR mit mehr als 1.500 geänderten Zeilen (ohne Lockfiles und erzeugte Dateien) ist rot. | Fachlogik |
| AM-AK-09 | Ist `main` rot oder der Schalter aus, ist der Check rot und nennt den Grund; ein Revert-PR nach AM-R13 ist trotz rotem `main` zulässig. | Fachlogik |
| AM-AK-10 | Verstößt ein PR gegen mehrere Regeln, nennt der Check alle Verstöße, nicht nur den ersten. | Fachlogik |
| AM-AK-11 | Erfüllt ein PR alle Regeln, ist der Check grün; mit eingeschaltetem automatischem Mergen kommt der PR in die Merge-Warteschlange und wird gemergt, sobald die Prüfung mit dem aktuellen `main` grün ist. | Ablauf |
| AM-AK-12 | Ist „Prüfung abgeschlossen“ rot oder fehlt der Check, wird nicht gemergt, auch nicht mit Antrag. | Ablauf |
| AM-AK-13 | Nach jedem automatischen Merge steht am PR ein Kommentar mit allen ausgewerteten Kriterien. | Ablauf |
| AM-AK-14 | Im Schattenbetrieb wird kein PR automatisch gemergt; das Ergebnis der Kriterien steht trotzdem am PR. | Ablauf |

Die Fachlogik-Kriterien werden als Unit-Tests gegen die reine Funktion aus AM-S01 geprüft, mit erfundenen PR-Daten. Die
Ablauf-Kriterien werden einmal an echten Test-PRs geprüft und im PR der Umsetzung dokumentiert.

## Umsetzung

- **AM-S01 Regeln als reine Funktion:** `entscheideAutomerge(pr) → { zulaessig, gruende[] }` unter
  `scripts/merge-kriterien/`. Eingaben sind Label, Herkunft des PRs, geänderte Dateien mit Zeilenzahl und Status,
  PR-Beschreibung, Kommentare mit Autor und Schreibrecht, Zahl der Tests je AK-ID vor und nach dem PR, Status von `main`
  und der Schalter. Ohne Netz und ohne GitHub testbar, wie die Fachregeln unter `src/domain/` (`CLAUDE.md`).
- **AM-S02 Workflow:**
  - Ein Job „Merge-Kriterien“ läuft bei `pull_request` (auch bei `labeled`, `unlabeled`, `edited`) und bei
    `merge_group`.
  - Nicht bei `issue_comment`: Solche Läufe gehören zum Stand von `main` und melden kein Ergebnis am PR. Deshalb
    schreibt die Steuerung die Abnahme vor dem Label. Kommt danach ein Push, ist die Abnahme veraltet (AM-R07); die
    Steuerung nimmt dann neu ab und setzt das Label erneut.
  - Er sammelt die Eingaben und ruft AM-S01 auf. Die Zusammenfassung listet jedes ausgewertete Kriterium einzeln. Dateien, Zeilen, Tests je AK-ID (`docs/03-testabdeckung.md`) und
    Prüffälle liest er aus dem Test-Merge des PRs, Kommentare und den Status von `main` aus der GitHub-API, mit
    `permissions: contents: read, pull-requests: read, issues: read, actions: read`.
  - Er setzt nie selbst Labels und mergt nie selbst. Ein Merge mit dem `GITHUB_TOKEN` würde die Prüfung auf `main` nicht
    auslösen.
  - Bei `merge_group` meldet er Erfolg, weil die Warteschlange nur PRs aufnimmt, deren Pflicht-Checks schon grün waren.
- **AM-S03 Einstellungen** (setzt Chris):
  - Regelsatz für `main` mit dem Pflicht-Check „Prüfung abgeschlossen“. „Merge-Kriterien“ wird erst Pflicht-Check,
    wenn Chris den Schalter auf `aktiv: true` stellt: Im Schattenbetrieb ist der Check mit Antrag immer rot (AM-R12)
    und würde sonst auch das Mergen von Hand blockieren.
  - Merge-Warteschlange mit Merge-Commit.
  - „Allow auto-merge“ einschalten.
  - Die Workflows reagieren zusätzlich auf `merge_group` (CI-Richtlinie, Abschnitt 8).
- **AM-S04 Steuerungsinstanz:** `playbooks/00-steuerung.md` beschreibt den Ablauf:
  1. Paket abnehmen.
  2. Abnahme-Kommentar schreiben.
  3. Label setzen.
  4. Automatisches Mergen einschalten (nicht im Schattenbetrieb).
  5. Nach dem Merge Kommentar, Fortschrittsdatei und Wochenzusammenfassung.

## Einführung

1. Workflow-Umbau nach `docs/ci-richtlinie.md` (Änderungsklassen, Abschluss-Job, `merge_group`); umgesetzt am
   12.10.2026.
2. AM-S01 mit Unit-Tests zu AM-AK-01 bis AM-AK-10 und der Job aus AM-S02, eigener PR; `.github/automerge.yml` mit
   `aktiv: false`. Umgesetzt am 12.10.2026 in `scripts/merge-kriterien/` und `.github/workflows/merge-kriterien.yml`.
3. Chris setzt die Einstellungen aus AM-S03.
4. Schattenbetrieb (AM-R14) ab G1, Ablauf-Kriterien AM-AK-11 bis AM-AK-14 an Test-PRs prüfen.
5. Chris setzt `aktiv: true`. Spätestens vor L62.

## Offene Punkte

- [ ] Ob die Merge-Warteschlange für dieses öffentliche Repository der Organisation verfügbar ist, wird in Schritt 3
      geprüft. Ohne sie gilt: Branch muss vor dem Merge auf dem Stand von `main` sein (Regelsatz „Require branches to be
      up to date“).
- [ ] Ob Etappen-PRs (G1 bis G5) nach der Freigabe durch Chris ebenfalls über die Warteschlange laufen sollen, damit
      auch dort mit dem aktuellen `main` geprüft wird.
- [ ] Liferay-spezifische Teile von AM-R04 ergänzen, sobald die Profile sie benennen (G4, P00): sicherheitsrelevante
      Dateien, Pfad der Upgrade-Schritte der Reihe U, Liste der freigegebenen externen Bibliotheken. Bis dahin prüft
      `scripts/merge-kriterien/` nur die Build-Dateien im Wurzelordner der Liferay-Umsetzungen.
- [ ] AM-AK-01 bis AM-AK-14 in `npm run ak:abdeckung` aufnehmen, damit die Testabdeckung auch diese IDs zählt.

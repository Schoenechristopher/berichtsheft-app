# P05 Status und Prüfung (M05)

Reihe `playbooks/typescript/` · Plattform TypeScript/Next.js · Profil `profile/typescript-nextjs.md` · Stand: 15.10.2026
(Etappe G4, Paket D) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Das Statusmodell (Entwurf, Eingereicht, Freigegeben, Abgelehnt) mit Einreichen und Pflichtprüfung, Zurückziehen, Prüfliste,
Freigeben, Ablehnen, Rücknahme der Freigabe und der Absicherung gegen gleichzeitige Änderungen ist umgesetzt. Fertig, wenn alle
Prüffälle in `specs/pruefung/M05.json` grün sind (19 AK-IDs; 59 Fachlogik- und 36 Daten-Fälle), die Datenbanktests
(`tests/db/transitions.test.ts`) grün sind, der Schreibschutz der Datenhaltung greift (AK-505) und die Browser-Tests zu AK-501 bis AK-508, AK-601 bis AK-607 und AK-701 bis AK-704 laufen. Die Beispielszenarien „Einreichen
scheitert an fehlendem Text“ und „Vertretung nimmt Freigabe zurück“ (Prüffälle AK-502-04 und AK-703-06 in `specs/pruefung/szenarien.json`)
sind in P05 vorbereitet (Schritt 11), werden aber erst in P10 verbindlich verlangt: sie brauchen Historie (P06) und die Seiten von P09. Nachweis AK-505 und AK-508: Profil, Abschnitt „Nachweis AK-505 und
AK-508“.

## 2. Voraussetzungen

- P00 bis P04 abgenommen (Berichte, Tage, Speichern, Berichtsseite); M02 liefert Rollen, M04 das Speichern.
- Profil: Abschnitte 3 (Transaktion und Gleichzeitigkeit, Historie), 4 (Daten-Adapter) und 7.
- Die Historie (Statuswechsel und Kommentare) wird hier geschrieben; ihre Unveränderlichkeit und Anzeige folgen in P06, die
  Nachrichten in P08 (Einhängepunkt in Schritt 6).

## 3. Eingaben

- Fach-Spec: `specs/M05-status-und-pruefung.md` (Regeln M05-R01 bis M05-R22, Abschnitt 5 Datenmodell, Abschnitt 6 Schnittstellen und
  Aktionen, Abschnitt 8 Anforderungen an die Plattform, Abschnitt 9 Auslegungen).
- Prüffälle: `specs/pruefung/M05.json` und die Szenarien in `specs/pruefung/szenarien.json`; Daten-Fälle, Aktionen und Fehlercodes:
  `specs/pruefung/format.md`, „Aufbau eines Daten-Falls“ und „Schnittstellen und Aktionen von M05“.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M05 Status und Prüfung“.
- Vorgabe: `docs/01-spezifikation.md`, „Statusmodell“ (Referenz).

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Lesereihenfolge: `src/domain/report-status.ts` (`TRANSITIONS`, dann `decideTransition()` von
oben nach unten: die Reihenfolge der Prüfungen ist M05-R21), `src/domain/report-submission.ts`, `canEditReport()` in
`src/domain/report-access.ts`, `src/lib/report-transitions.ts`, `listReviewQueue()` in `src/lib/reports.ts`,
`src/app/(app)/berichte/[id]/actions.ts`, `src/app/(app)/berichte/[id]/ReviewForms.tsx`,
`src/app/(app)/ausbilder/pruefliste/page.tsx`. Belege: `src/domain/report-status.test.ts`, `src/domain/report-submission.test.ts`,
`tests/db/transitions.test.ts`, `e2e/ak-501-803-einreichen-pruefen.spec.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Datenmodell mit Schreibschutz-Trigger, (2) Statusmodell und Entscheidung als reine Funktionen, (3) Pflichtprüfung
beim Einreichen, (4) Statuswechsel in einer Transaktion mit Sperre und bedingtem Update, (5) Prüfliste, (6) Serveraktion und
Formulare, (7) Daten-Adapter, (8) Ablauf-Aktionen. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-501 | Ein offener Bericht lässt sich nur mit vollständigen Pflichtangaben einreichen (nur Leerzeichen gelten als leer); nicht bei Wochen ganz außerhalb; die laufende Woche schon vor ihrem Ende. | 11 (9 fachlogik, 2 daten) | `specs/pruefung/M05.json` |
| AK-502 | Fehlt eine Pflichtangabe, wird nicht eingereicht; die Tage werden mit „Tagesart fehlt“ bzw. „Tätigkeiten fehlen“ benannt und markiert. | 4 (2 fachlogik, 1 daten, 1 ablauf) | `specs/pruefung/M05.json`, `specs/pruefung/szenarien.json` |
| AK-503 | Bei Urlaub, Krank und Feiertag ist kein Text nötig; ein eingetragener Text bleibt. | 2 (1 fachlogik, 1 daten) | `specs/pruefung/M05.json` |
| AK-504 | Auch eine Woche nur aus Urlaub und Feiertagen muss eingereicht werden und zählt bis dahin als offen. | 2 (1 fachlogik, 1 daten) | `specs/pruefung/M05.json` |
| AK-505 | Nach dem Einreichen „Eingereicht“ und schreibgeschützt; Einreichen speichert Eingaben mit, beim Scheitern bleiben sie als Entwurf; zusätzlich Schutz in der Datenhaltung. | 7 (4 daten, 3 fachlogik) | `specs/pruefung/M05.json` |
| AK-506 | Der Azubi kann einen eingereichten Bericht zurückziehen: wieder Entwurf, bearbeitbar, nicht mehr in der Prüfliste. | 3 (1 daten, 2 fachlogik) | `specs/pruefung/M05.json` |
| AK-507 | Ein freigegebener oder abgelehnter Bericht kann nicht zurückgezogen werden; die Schaltfläche fehlt. | 6 (5 fachlogik, 1 daten) | `specs/pruefung/M05.json` |
| AK-508 | Zieht der Azubi zurück, während ein Ausbilder prüft, scheitert dessen Prüfung mit „Bericht wurde zurückgezogen“; umgekehrt scheitert das Zurückziehen nach der Prüfung. | 11 (5 daten, 6 fachlogik) | `specs/pruefung/M05.json` |
| AK-601 | Die Prüfliste zeigt eingereichte Berichte mit Azubi, Woche und Einreichungsdatum; standardmäßig eigene Azubis, per Filter alle. | 2 (2 daten) | `specs/pruefung/M05.json` |
| AK-602 | Jeder Ausbilder darf jeden eingereichten Bericht freigeben oder ablehnen, auch ohne Zuordnung (Vertretung). | 7 (3 daten, 4 fachlogik) | `specs/pruefung/M05.json` |
| AK-603 | Bei der Freigabe wird der Status „Freigegeben“; Ausbilder sowie Datum und Uhrzeit werden gespeichert. | 2 (2 daten) | `specs/pruefung/M05.json` |
| AK-604 | Ablehnen geht nur mit nicht leerem Gesamtkommentar; Kommentare und Begründung je bis 5.000 Zeichen. | 8 (6 fachlogik, 2 daten) | `specs/pruefung/M05.json` |
| AK-605 | Optionale Tageskommentare zu jedem Tag, auch außerhalb der Ausbildung; beim Freigeben werden eingetippte Kommentare nicht gespeichert. | 3 (3 daten) | `specs/pruefung/M05.json` |
| AK-606 | Nach einer Ablehnung sieht der Azubi Gesamt- und Tageskommentare, nach einer Rücknahme die Begründung; nach dem erneuten Einreichen nur noch in der Historie. | 3 (3 daten) | `specs/pruefung/M05.json` |
| AK-607 | Berichte im Status „Entwurf“ kann der Ausbilder weder freigeben noch ablehnen. | 5 (4 fachlogik, 1 daten) | `specs/pruefung/M05.json` |
| AK-701 | Ein abgelehnter Bericht ist bearbeitbar und erneut einreichbar; danach „Eingereicht“ und wieder in der Prüfliste. | 3 (1 daten, 2 fachlogik) | `specs/pruefung/M05.json` |
| AK-702 | Der Zyklus aus Ablehnen und erneutem Einreichen funktioniert beliebig oft (dreimal ablehnen, dann freigeben). | 6 (1 daten, 5 fachlogik) | `specs/pruefung/M05.json` |
| AK-703 | Eine Freigabe lässt sich nur mit nicht leerer Begründung zurücknehmen; danach „Abgelehnt“ und bearbeitbar. | 6 (4 fachlogik, 1 daten, 1 ablauf) | `specs/pruefung/M05.json`, `specs/pruefung/szenarien.json` |
| AK-704 | Außer durch die Rücknahme kann niemand einen freigegebenen Bericht ändern, auch kein Ausbilder. | 6 (5 fachlogik, 1 daten) | `specs/pruefung/M05.json` |

## 6. Empfehlung

**Weg B.** Das Statusmodell ist als Tabelle (4 Status × 6 Aktionen × Rollen) und mit festen Fehlercodes vollständig spezifiziert;
die Daten-Fälle zeigen Gleichzeitigkeit deterministisch (`gesehen`). Weg A nur auf ausdrücklichen Auftrag.

## 7. Schritte

1. **Branch** `claude/p05-status-und-pruefung`; Spec (insbesondere Regeln M05-R20 und M05-R21) und Prüffälle lesen. Prüfschritt:
   AK-Tabelle im PR-Entwurf, Liste der Fehlercodes aus Abschnitt 6 der Spec notiert.
2. **Datenmodell.** `prisma/schema.prisma`: `StatusChange` (`reportId` Kaskade, `fromStatus` leer erlaubt, `toStatus`, `actorId`
   mit `onDelete: NoAction`, `reason`, `reviewRound` Anfang 0, `seq` eindeutig mit Zähler für die Reihenfolge auch bei gleichem
   Zeitpunkt, `createdAt`) und `Comment` (`reportId` Kaskade, `reviewRound`, `dayId` leer = Gesamtkommentar, `authorId`,
   `text`, `createdAt`). Migration von Hand ergänzen: `review_round` nie negativ, bei Kommentaren mindestens 1, Kommentartext nie
   leer, und der **Schreibschutz der Tage**: Funktion und Trigger `report_day_locked` (`BEFORE UPDATE ON "report_day"`), der
   eine Ausnahme wirft, wenn der Bericht `SUBMITTED` oder `APPROVED` ist (AK-505, AK-704). Prüfschritt: Ein `UPDATE` auf
   `report_day` eines eingereichten Berichts scheitert in der Datenbank (Text „schreibgeschützt“).
3. **Statusmodell `src/domain/report-status.ts`** (M05-R01 bis M05-R04, M05-R12, M05-R14, M05-R15, M05-R18 bis M05-R21,
   AK-507, AK-508, AK-604, AK-607, AK-703, AK-704): `REPORT_STATUSES`, `STATUS_LABELS`, `REPORT_ACTIONS`, `ACTION_LABELS`,
   `TRANSITIONS` (die sechs erlaubten Übergänge mit Rolle), `decideTransition()` mit `TransitionDecision`, `TransitionReason`,
   `TRANSITION_MESSAGES` und `SeenState` (Status und Version, die die Person gesehen hat). Die Reihenfolge der Prüfungen ist
   M05-R21: Person und Rolle, Besitz, deaktivierter Azubi, gesehener Stand gegen aktuellen (zurückgezogen, bereits geprüft,
   bereits eingereicht, inzwischen geändert), erlaubter Übergang, Pflichttext. Dazu `availableActions()` (Schaltflächen),
   `isBlank()`, `normalizeComment()`, `commentTooLong()`, `MAX_COMMENT_LENGTH` 5.000, `reviewRoundFor()` (jede Einreichung
   beginnt eine neue Prüfrunde, AK-702), `OPEN_STATUSES` und `isOpenStatus()`. Jede Ablehnung trägt einen festen Fehlercode
   unabhängig vom Meldungstext (`bericht_zurueckgezogen`, `bereits_geprueft`, `bereits_eingereicht`, `bereits_zurueckgezogen`,
   `bereits_zurueckgenommen`, `inzwischen_geaendert`, `begruendung_fehlt` u. a. nach der Spec). Prüfschritt:
   `src/domain/report-status.test.ts` als Tabelle 4 Status × 6 Aktionen × Rollen und der Block „Gleichzeitigkeit (AK-508)“ mit vier
   Tests.
4. **Pflichtangaben `src/domain/report-submission.ts`** (M05-R05 bis M05-R07, AK-501 bis AK-504): `validateSubmission()` mit
   `SubmissionIssue`, `SubmissionProblem` (Tagesart fehlt, Tätigkeiten fehlen), betroffene Tage in Kalenderreihenfolge; bei
   Urlaub, Krank und Feiertag ist kein Text nötig, ein eingetragener bleibt; Tage außerhalb zählen nicht; eine Woche ganz außerhalb
   lässt sich nicht einreichen (`WEEK_OUTSIDE_TRAINING_MESSAGE`); die laufende Woche geht schon vor ihrem Ende;
   `submissionHeadline()`, `submissionSummary()`. Prüfschritt: `src/domain/report-submission.test.ts`.
5. **Bearbeitbarkeit.** `canEditReport()` vollständig (Status Entwurf oder Abgelehnt, nur eigener aktiver Azubi, AK-505, AK-506,
   AK-701, AK-703, AK-704). Prüfschritt: `src/domain/report-access.test.ts` ergänzt.
6. **Statuswechsel `src/lib/report-transitions.ts`** (`transitionReport()`, `TransitionInput`, `TransitionResult`,
   `TransitionFailureReason`, `TransitionEvent`; M05-R05 bis M05-R08, M05-R13, M05-R14, M05-R20 bis M05-R22): **eine
   Transaktion**: (a) Bericht mit `SELECT … FOR UPDATE` sperren; (b) Sicht-Recht prüfen (`canViewReport()`), mit `decideTransition()`
   entscheiden, mit dem gesehenen Stand aus dem Formular; (c) beim Einreichen die Tageseingaben **in derselben Transaktion**
   speichern, danach `validateSubmission()` – scheitert nur die Pflichtprüfung, endet die Transaktion regulär und die Eingaben
   bleiben als Entwurf (ein Rollback an dieser Stelle verletzt AK-505); (d) **bedingtes Update** `updateMany` mit
   `where: { id, status: von, version: gesehen }` und `data: { status: nach, version: { increment: 1 } }`; zählt es 0 Zeilen,
   mit dem aktuellen Stand neu entscheiden, damit die Meldung stimmt (`changed-meanwhile`, `withdrawn-meanwhile`,
   `reviewed-meanwhile`); (e) `StatusChange` mit `reviewRound` aus der Zahl der bisherigen Einreichungen (nicht am Bericht
   gespeichert) und Zeitpunkt aus `now()`, nie `new Date()`; (f) beim Ablehnen Gesamtkommentar und Tageskommentare als `Comment`
   (Tageskommentare nur beim Ablehnen; beim Freigeben ignoriert der Server sie), bei der Rücknahme die Begründung als `reason`;
   (g) Einhängepunkt für Benachrichtigungen: das Ergebnis trägt ein `TransitionEvent` (Bericht, Statuswechsel, handelnde Person),
   P08 schreibt in derselben Transaktion in den Ausgangskorb. Prüfschritt: `tests/db/transitions.test.ts` mit echter
   Gleichzeitigkeit (`Promise.all`, genau eine Aktion gewinnt, ein Historieneintrag pro Wechsel).
7. **Prüfliste.** `listReviewQueue()` und `ReviewScope` (eingereichte Berichte, standardmäßig eigene Azubis, per Filter alle,
   letzte Einreichung, älteste zuerst; AK-601, AK-602), `rejectionTexts()` (Gesamtkommentar bzw. Begründung der aktuellen
   Ablehnung für „Zu erledigen“, AK-606, über `currentFeedback()` aus P06; bis dahin ein einfacher Zugriff, den P06 ersetzt).
   Prüfschritt: Tests zu AK-601, AK-602, AK-606.
8. **Serveraktion und Formulare.** `src/app/(app)/berichte/[id]/actions.ts` ergänzt `transitionAction()` (Einreichen,
   Zurückziehen, Freigeben, Ablehnen, Freigabe zurücknehmen; prüft Rolle und Besitz auf dem Server, schickt Status und Version
   des gesehenen Stands mit; „Einreichen“ speichert zuerst, dann der Wechsel), `ReviewForms.tsx` (Prüfformulare mit Rückfrage,
   Pflichttext, Zeichenzähler; Fehler als Meldung der Fachlogik), die Fehlerleiste mit Sprunglink beim Einreichen, die Seite
   `src/app/(app)/ausbilder/pruefliste/page.tsx` mit `ReviewQueueList.tsx` (Liste links, Bericht rechts, nach der Entscheidung
   der nächste Bericht, AK-601, AK-602, AK-603). Gestaltung folgt in P09. Prüfschritt:
   `e2e/ak-501-803-einreichen-pruefen.spec.ts` (Einreichen, Prüfliste, Zurückziehen, AK-508 in zwei Browsern, Ablehnen mit
   Kommentaren, Rücknahme; Namen mit der AK-ID).
9. **Daten-Adapter `tests/pruefung/daten-adapter.ts`.** Vor jedem Fall leeren (`resetDatabase`), Testdaten und den
   Ausgangsbestand nach `format.md` herstellen (Personen, Berichte mit `tage` und `verlauf`, Uhr), Schritte ausführen über
   dieselben Funktionen wie die Serveraktionen (`einreichen`, `erneut_einreichen`, `zurueckziehen`, `freigeben`, `ablehnen`,
   `freigabe_zuruecknehmen`, `tage_speichern`, `pruefliste_lesen`, `rueckmeldung_lesen`, `person_deaktivieren`,
   `ausbildungszeitraum_aendern`); `gesehen` stellt den Stand nach Schritt `n` nach; den Bestand der genannten Berichte mit
   Tagen, Historie und Kommentaren zurückgeben (Namen auf Schlüssel zurückführen, Versionsstand nie ausgeben). Prüfschritt:
   `npx vitest run --project db tests/pruefung/daten.test.ts -t "M05.json"` grün (36 Fälle).
10. **Fachlogik-Adapter.** Schnittstellen `einreichenPruefen`, `uebergangPruefen`, `moeglicheAktionen`, `pruefrunde`,
    `darfBearbeiten`. Prüfschritt: `-t "M05.json"` im Fachlogik-Runner grün (59 Fälle).
11. **Ablauf-Aktionen** für die Beispielszenarien: `einreichen`, `freigeben`, `ablehnen`, `freigabe_zuruecknehmen` (Rückfrage
    bestätigt, ungespeicherte Eingaben werden mitgespeichert), Seite `pruefliste` mit `eintraege` und `ausgewaehlt`; fertig, wenn
    die App es meldet. Die Szenario-Fälle laufen erst in P10 verbindlich.
12. **Bau-Stand.** M05 eintragen. Prüfung nach Abschnitt 8.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `npx vitest run --project unit tests/pruefung/fachlogik.test.ts -t "M05.json"` | 59 Fälle grün |
| `npx vitest run --project db tests/pruefung/daten.test.ts -t "M05.json"` | 36 Fälle grün |
| `npx vitest run --project unit src/domain/report-status.test.ts src/domain/report-submission.test.ts src/domain/report-access.test.ts` | grün |
| `npx vitest run --project db tests/db/transitions.test.ts` | grün, auch AK-508 mit `Promise.all` |
| `E2E_LOGIN_MODE=test npm run test:e2e -- --project=chromium --project=smartphone-375 e2e/ak-501-803-einreichen-pruefen.spec.ts` | Tests zu AK-501 bis AK-508, AK-601 bis AK-607, AK-701 bis AK-704 grün |
| `npm run lint && npm run format:check && npm run typecheck` | keine Fehler |
| `npm run ak:abdeckung` | schreibt `docs/03-testabdeckung.md` neu; die Datei wird mitcommittet (Profil, Abschnitt 4). Danach meldet `npm run ak:abdeckung -- --pruefen` keinen Befund |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | mit vorhandenem Quellcode „Playbook-Prüfung: keine Befunde.“; im Blindtest-Branch nur Befunde „fehlender-pfad“ auf Zielpfade, die noch nicht gebaut sind (Profil, Abschnitt 5) |

## 9. Abschluss

- `docs/03-testabdeckung.md` neu erzeugen und mitcommitten; die Merge-Reihenfolge der Pakete folgt KE-R05: der spätere PR gleicht per Merge mit dem Hauptzweig ab und erzeugt die Datei erneut.
- Commit, z. B. „P05: Status und Prüfung (Statusmodell, Einreichen, Prüfliste)“; vor dem Push alles lokal grün.
- Draft-PR mit der AK-Tabelle (alle AK-IDs aus Abschnitt 5 mit Test und Prüffällen), dem Nachweis AK-505 und AK-508 (Verweis
  auf das Profil) und „Bitte bestätigen“.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Beide gleichzeitigen Aktionen gelingen | bedingtes Update mit Status und Version, davor `FOR UPDATE`; Version bei jedem Wechsel erhöhen (AK-508) |
| Eingaben gehen verloren, wenn nur die Pflichtprüfung scheitert | Transaktion regulär beenden, nicht zurückrollen (AK-505) |
| Pflichtprüfung meldet Tage in falscher Reihenfolge | in Kalenderreihenfolge sortieren (AK-502) |
| Zeitpunkt der Historie stimmt nicht mit der Prüffall-Uhr | „jetzt“ aus `now()`, nie `new Date()` oder Datenbank-Default |
| Meldung falsch nach gleichzeitiger Aktion | nach 0 Zeilen mit dem aktuellen Stand neu entscheiden |
| Prüfrunde falsch | Einreichungen aus der Historie zählen (`reviewRoundFor()`), nicht am Bericht speichern |
| Ausbilder kann Tage ändern | Schreibschutz-Trigger fehlt oder prüft nur `SUBMITTED`; auch `APPROVED` sperren (AK-704) |
| Kommentare an freigegebenem Bericht gespeichert | Tageskommentare nur beim Ablehnen lesen |

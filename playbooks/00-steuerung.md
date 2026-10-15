# Leitfaden der Steuerung

Stand: 15.10.2026 · Status: **Entwurf zur Freigabe (G4)** · Umsetzung von KE-S03, AM-S04 und MW-S02

Dieser Leitfaden ist der Einstieg für jede Steuerungsinstanz. Auf einen Satz wie „Baue die App auf <Plattform>“ oder
„Führe das Upgrade 6.2.5 → 7.2 durch“ steuert sie das Vorhaben allein mit dieser Datei und den Verweisen darin.
Er ist **keine neue Regel**: Maßgeblich sind `docs/06-spec-architektur.md`, `docs/07-spec-automatisches-mergen.md`,
`docs/08-spec-modellwahl.md`, `docs/09-spec-kosteneffizienz.md`, `docs/ci-richtlinie.md` und die Fach-Specs unter
`specs/`. Hier steht, wie sie angewendet werden. Was nur aus der Praxis stammt, trägt den Vermerk **„Verfahren, Stand
15.10.2026“**; widerspricht es einer freigegebenen Datei, gilt die Datei.

Lesereihenfolge beim Start: dieser Leitfaden, dann `CLAUDE.md`, dann die letzte Übergabe in `FORTSCHRITT.md`, dann
gezielt die Regel-Abschnitte, auf die ein Schritt verweist (KE-R09 sinngemäß).

## 1. Rolle und Grenzen

| Rolle | Aufgabe (docs/06, „Steuerung und Arbeitspakete“) |
| --- | --- |
| Steuerung | liest Specs, Profil, Playbooks; schneidet Pakete; schreibt Aufträge; wählt Stufe und Denkaufwand; startet Entwicklersitzungen; nimmt ab; führt Merge-Ablauf und `FORTSCHRITT.md`; bündelt Rückfragen |
| Gesamtsteuerung (falls vorhanden) | führt mehrere Etappen, startet je Etappe bzw. Welle eine Steuerung, legt Pläne und Fragen Chris vor; entwickelt nicht, nimmt nicht ab, hält keine PR-Abos (`FORTSCHRITT.md`, „Gesamtsteuerung“) |
| Entwicklersitzung | setzt genau ein Paket um, Draft-PR, Bericht an die Steuerung |
| Chris | gibt Auslegungen frei, stellt den Denkaufwand ein, mergt alles, was nicht automatisch gemergt werden darf |

Grenzen der Steuerung:

- **Selbst nicht entwickeln (KE-R07):** Diffs und Prüfergebnisse lesen, nicht den ganzen Code. Keine CI-Logs selbst
  lesen; breite Suchen, Logs und lokale Prüfläufe gehen an einen Hilfsagenten der Stufe S1 (KE-R03, KE-R16).
- **Frische Steuerung je Welle (KE-R03):** nach jeder Welle Übergabe (Abschnitt 11) und Ende.
- **Grenzen je Welle bzw. Sitzung** (`FORTSCHRITT.md`, „Entscheidungen und Verfahren“): höchstens 6–8 US-Dollar oder
  200 000–250 000 Token Kontext, dann Übergabe. Schon Lesen, Aufträge und PR-Ereignisse füllen 100 000–180 000 Token;
  die Kontextgrenze kommt meist vor der Kostengrenze.
- **Kurze Aufgaben auslagern:** Doku-PR schreiben oder einen PR bis zum Merge begleiten in eine eigene kleine Sitzung
  (S2) mit 3–5 US-Dollar Grenze.
- Eigenen Verbrauch regelmäßig prüfen: `get_session` ohne `session_id`, Feld `usage.cost_usd`.

## 2. Start eines Vorhabens

1. **Plattform lesen:** Profil `profile/<plattform>.md` (Abschnitte 1, 5 und 7 zuerst; _Verfahren, Stand 15.10.2026_) und die Reihe
   `playbooks/<plattform>/` (P00–P10) bzw. `playbooks/upgrade-625-auf-72/` (U00–U06). Nur die Abschnitte „Ziel“,
   „Voraussetzungen“ und „Prüfung“ jedes Playbooks; den Rest liest die Entwicklersitzung.
2. **Modelle ermitteln (MW-R01 bis MW-R03, MW-R14):** verfügbare Modelle aus der eigenen Umgebung (Systemhinweise,
   Auswahl in den Werkzeugen zum Starten von Sitzungen und Hilfsagenten), Stufen S1–S4 zuordnen, die Zuordnung Chris
   **im Chat** nennen (MW-AK-01). Ist keine S3 verfügbar: anhalten und fragen.
3. **Voraussetzungen prüfen, lesend (Hilfsagent S1):**
   - Schalter `.github/automerge.yml`: `aktiv: true` oder Schattenbetrieb (Abschnitt 8).
   - Startskript nach KE-S01 (`.claude/hooks/session-start.sh`) richtet eine frische Sitzung ohne eigene Schritte ein
     (KE-AK-04); für Liferay ergänzt P00 der Plattform JDK und Bundle.
   - P00 der Plattform ist abgenommen, bevor P01 ff. starten.
   - Letzte Prüfung auf `main` grün (AM-R11 sinngemäß als Start-Voraussetzung; _Verfahren, Stand 15.10.2026_).
4. **Plan an Chris:** Schnitt, Wellen, Stufen, Budgets (Abschnitte 3 und 4) als eine Nachricht mit Vorschlag; erst nach
   Freigabe starten. Den Plan als Doku-PR in `FORTSCHRITT.md` festhalten (KE-R02).

## 3. Pakete schneiden

- **Ein Playbook je Paket** (docs/06). Ein großes Playbook (KE-R14, Klasse „groß“: P00, Upgrade-Schritt, mehrere
  Module) wird geteilt:
  - **nach Stufe (MW-R05):** der neuartige oder riskante Teil zuerst als S3-Paket; der Rest danach als S2-Paket „nach
    dem Muster“ des abgenommenen S3-Teils (so in G4);
  - **nach Modulgrenzen** aus `specs/00-uebersicht.md`;
  - **nie zwei parallele Pakete auf denselben Dateien (KE-R05).** Gemeinsame Dateien (z. B. `docs/03-testabdeckung.md`,
    `docs/ci-richtlinie.md`) bekommen eine Merge-Reihenfolge; der spätere PR gleicht per Merge mit `main` ab.
- **Wellen** nach dem Abhängigkeitsgraph in `specs/00-uebersicht.md` (Abschnitt „Abhängigkeiten“): was nicht
  voneinander abhängt, läuft parallel, sonst nacheinander. Nicht mehr Sitzungen als unabhängige Pakete.
- **Größenklasse und Budget:** Klasse und Richtwerte nach KE-R14 (Rückblick G2); dazu Erfahrungswerte aus G3:

  | Stufe und Klasse | Richtwert (US-Dollar) |
  | --- | --- |
  | S2 klein | rund 1–3 (Rückblick G3, _Verfahren, Stand 15.10.2026_) |
  | S3 mittel | 7–11 (KE-R14) |
  | S3 groß | rund 10,50 (KE-R14); in G3 ungeteilt bis rund 20 (Paket F), abweichend von KE-R14 |

  - **Harte Grenze inkl. Diagnose:** rund 1,5 × oberer Richtwert (_Verfahren, Stand 15.10.2026_).
  - **Diagnose-Grenze:** rund 15 % der harten Grenze (_Verfahren, Stand 15.10.2026_).
  - Beispiel S3 mittel, 7–11: harte Grenze rund 16, Diagnose rund 2–2,5.

  Die harte Grenze folgt aus KE-R12 („Budget um die Hälfte überschritten“). Die Diagnose-Grenze setzt die
  Entscheidung „Fehlersuche gehört ins Paket“ um: Ist sie erreicht, stoppt die Sitzung und meldet das Fehlerbild.

## 4. Modellwahl: Stufe und Denkaufwand

1. **Paketprofil (MW-R04):** Neuheit, Schwierigkeit, Risiko, Umfang, Prüfbarkeit je niedrig/mittel/hoch.
2. **Startstufe (MW-R05):** S3, wenn Neuheit, Schwierigkeit oder Risiko hoch (alles unter AM-R04 ist Risiko hoch); S2,
   wenn alle drei höchstens mittel und die Prüfbarkeit hoch ist; im Zweifel höher. Richtwerte je Reihe in der Tabelle
   von MW-R05; Herunterstufen nach MW-R11, Hochstufen nach MW-R09, S4 nur nach MW-R07.
3. **Denkaufwand (MW-R06):** S3-Pakete und Reviews „hoch“, sonst „mittel“, S1-Hilfsagenten „niedrig“. Vor dem
   Hochstufen prüfen, ob dieselbe Stufe mit höherem Denkaufwand reicht.
4. **Auf der Plattform einstellen (MW-R06, „Umsetzung“):** Beim Start nicht setzbar. Die Steuerung nennt Chris (bzw. der
   Gesamtsteuerung) **ID und Titel jeder S3-Sitzung** gleich nach dem Start; Chris stellt in der App auf „Hoch“.
   Prüfen mit `get_session` (`session_context.effort_level`), bevor die Abnahme beginnt. S2 bleibt „Mittel“.
5. **Hilfsagenten:** Stufe S1 und Denkaufwand „niedrig“ direkt im Aufruf des Agent-Werkzeugs (Parameter für Modell und
   Aufwand); Auftrag: nur das Ergebnis melden.
6. **Keine Modellkennungen (MW-R03, MW-AK-02):** in Dateien, Commits und PR-Texten nur Stufen. Die Zuordnung Stufe →
   Modell steht nur im Chat.
7. **Eine Sitzung, ein Modell (MW-R08):** nie mitten in der Sitzung wechseln; Hochstufen heißt neue Sitzung mit
   Übergabe (MW-R09), und ohne neue Einsicht wird nicht hochgestuft – bleibt die Ursache unklar, Chris fragen.
8. **Vorgaben und Verfügbarkeit:** Ordnet Chris ein Modell oder eine Stufe an, gilt das vor allem anderen (MW-R13).
   Fehlt für eine Stufe ein Modell, die nächsthöhere nehmen und vermerken (MW-R14).
9. **Festhalten (MW-R10):** Modellwahl-Eintrag je Paket nach Abschnitt 9.

## 5. Auftrag schreiben und Sitzung starten

1. **Auftrag** nach `playbooks/vorlage-arbeitspaket.md` mit allen Pflichtfeldern aus KE-R01 und dem Block „Gemeinsame
   Regeln für alle Pakete“ (KE-S02). Verweise statt Abschrift; bekannte Fallen aus früheren Paketen und mögliche
   Schemaänderungen benennen. Was die Steuerung schon festgestellt hat, steht drin (KE-R17).
2. **Prüfen:** Auftrag als Datei ablegen und `npx tsx scripts/playbooks/pruefen.ts <auftrag>` ausführen (KE-AK-01);
   fehlende Felder ergänzen, bis die Prüfung grün ist. Das Skript entsteht in G4-A; fehlt es, die Pflichtfelder aus
   KE-R01 von Hand prüfen.
3. **Starten** mit `create_session`: `source_url` des Repositorys, `prompt` = Auftrag, Titel „<Etappe> <Paket>:
   <Kurzinhalt>“, Tags `<vorhaben>` und `rolle:entwicklung`; Umgebung erbt die der Steuerung. _Verfahren, Stand
   15.10.2026._
4. **S3-Meldung** an Chris bzw. Gesamtsteuerung nach Abschnitt 4, Schritt 4.
5. Sitzungs-ID, Branch und Budget sofort im eigenen Stand notieren (für die Übergabe).

## 6. Warten (KE-R04, KE-AK-06)

- **Ereignisgesteuert:** Berichte der Entwicklersitzungen kommen per `send_message`; PR-Ereignisse über ein Abo
  (`subscribe_pr_activity`), das die Steuerung **erst zu Beginn der Abnahme** setzt (KE-R03).
- **Kein Abfragen im Minutentakt,** kein aktives Warten mit Pausenbefehlen.
- **Sicherheits-Check-in** mit `send_later` frühestens 60 Minuten nach dem letzten Ereignis (KE-AK-06 verlangt
  mindestens 50); grüne Läufe kommen nicht immer als Ereignis an (Lehre A2). Findet ein Check-in nichts Neues, still
  neu ansetzen; nach drei Runden ohne Neues keine weiteren Check-ins und Chris einmal kurz Bescheid geben (_Verfahren, Stand 15.10.2026_).
- Während eine Welle wartet, nichts „nebenbei“ lesen: Jede Runde verarbeitet den ganzen Kontext erneut.

## 7. Abnahme (docs/06, „Abnahme eines Pakets“; AM-R07)

1. **Bericht prüfen:** Fertig-Kriterien mit Beleg, „Bitte bestätigen“, Verbrauch.
2. **Diff lesen**, gezielt: geänderte Dateien gegen „erlaubte Pfade“ des Auftrags; Doku-Dateien auf ungewollte
   Löschungen prüfen (Lehre A2a).
3. **Prüfläufe über einen S1-Hilfsagenten:** frischer Worktree des PR-Branches, zuerst `npx prisma generate`, dann die
   Prüfbefehle aus dem Auftrag und die Gegenprobe. Er meldet nur Ergebnis und Fehlerbild.
4. **Prüffälle des Pakets grün, vorher fertige Pakete weiter grün** (AM-R07, Prüfliste).
5. **Review:** wo AM-R07 und MW-R05 es verlangen, mindestens eine Stufe über der Entwicklersitzung (höchstens S3,
   Denkaufwand hoch), als Hilfsagent mit Diff und Fach-Spec-Abschnitt. Befunde gehen als Nachricht an die Paket-Sitzung.
6. **Rote CI:** Fehlerbild per S1-Hilfsagent (`get_job_logs`, gefiltert) holen und an die Paket-Sitzung senden. Die
   Fehlersuche gehört ins Paket und zählt auf dessen Diagnose-Grenze; die Steuerung sucht nicht selbst.
7. **Zurückweisen** mit konkreter Liste; nach zwei Zurückweisungen hochstufen (MW-R09).

## 8. Merge-Ablauf (AM-S04) und Schattenbetrieb (AM-R14)

Die REST-Routen sind _Verfahren, Stand 15.10.2026_ (A3).

1. **Abnehmen** nach Abschnitt 7. Erst danach den PR auf „bereit“ stellen:
   `POST /repos/{owner}/{repo}/pulls/{n}/ccr/ready_for_review`. Der Wechsel bricht den Entwurfs-Lauf ab; „Prüfung
   abgeschlossen“ meldet diesen kurz rot – erwartet.
2. **Abnahme-Kommentar** nach dem letzten Push, mit der Prüfliste aus AM-R07 und der Markierung
   `<!-- abnahme-steuerung sha=<head-SHA> -->`. Nach jedem weiteren Push neu. Gesetzt mit den GitHub-Werkzeugen der
   Sitzung: Kommentar am Issue bzw. PR; das Label in Schritt 3 über das Issue-Update (_Verfahren, Stand 15.10.2026_).
3. **Danach** das Label `automerge` setzen (AM-R02). Ein neues Label startet die Prüfung neu (CI-15, AM-R08); erst
   dieser Lauf sieht die Abnahme.
4. **Automatisches Mergen** nur bei `aktiv: true` (AM-R12) einschalten: `PUT /repos/{owner}/{repo}/pulls/{n}/ccr/auto_merge`
   (ausschalten mit `DELETE`). **Im Schattenbetrieb** stattdessen eine Zeile in der Tabelle „Schattenbetrieb“ von
   `FORTSCHRITT.md` (Ergebnis „Merge-Kriterien“ ohne den Grund „Schalter aus“); nicht an Doku-PRs. Chris mergt über
   „Merge when ready“.
5. **Nach dem Merge:** Nach einem **automatischen** Merge ist der Kommentar am PR mit allen ausgewerteten Kriterien
   AM-R01 bis AM-R12 und Ergebnis Pflicht (AM-AK-13, AM-R15); Grundlage ist die Zusammenfassung des Checks
   „Merge-Kriterien“, ergänzt um Merge-Commit und Ablauf. Im Schattenbetrieb ersetzt ihn der Eintrag in die Tabelle
   (E2, E4 in `FORTSCHRITT.md`). Dann Fortschrittsdatei (Abschnitt 9) und die Wochenzusammenfassung an Chris.

Bekannte Eigenheiten:

- Ein Abnahme-Kommentar löst keinen neuen Lauf aus; deshalb Reihenfolge Kommentar → Label (AM-S02).
- Geschützte Pfade (AM-R04, z. B. `playbooks/**`, `specs/**`) und offene Punkte unter „Bitte bestätigen“ (AM-R05)
  schließen automatisches Mergen aus; dann mergt Chris. Kommentar und Label trotzdem setzen (Schattenbetrieb zählt).
- Wird `main` nach einem automatischen Merge rot und ist der Merge die wahrscheinliche Ursache: sofort Revert-PR, Chris
  bekommt Bescheid (AM-R13).

## 9. Fortschrittsdatei (KE-R02, KE-R18, MW-R10)

- **Nur die Steuerung schreibt** `FORTSCHRITT.md`, nach dem Merge eines Pakets, als Doku-PR – möglichst in einer eigenen
  S2-Sitzung (Abschnitt 1). So kollidieren parallele PRs nicht.
- **Kosten** aus `get_session` der Entwicklersitzung (`usage.cost_usd`, dazu Token aus `usage`), nach Ende des Pakets.
- Je Paket ein **Modellwahl-Eintrag** als Tabelle (Muster: „Welle 1 – Paket A1“ in `FORTSCHRITT.md`):

```markdown
| Feld | <Paket>: <Kurzinhalt> (#<PR>) |
| --- | --- |
| Stufe und Denkaufwand je Anlauf | Anlauf 1: S…, … |
| Grund | Paketprofil nach MW-R04, Regel aus MW-R05 |
| Größenklasse und Budget | <klasse>, Richtwert …, hart …, Diagnose … US-Dollar |
| Anläufe | … |
| Beim ersten Anlauf abgenommen | ja/nein (Grund) |
| Ausweichen auf ein anderes Modell | keins gemeldet / als Stufe |
| Verbrauch der Entwicklersitzung | Token und … US-Dollar |
| Dauer | Start … UTC, Draft-PR … UTC |
| CI-Läufe | schnelle und volle Prüfung, Warteschlange |
| Rückfragen | blockierend / „Bitte bestätigen“ mit Entscheidung |
| Erreichte Abbruchkriterien | keine / KE-R12 … |
```

Dazu je Paket: Abnahme (was geprüft, Gegenprobe), Ergebnis in zwei bis drei Sätzen, Lehren. Den eigenen Verbrauch der
Steuerung je Welle eintragen.

## 10. Rückfragen (KE-R06)

- Fragen an Chris **sammeln** und gemeinsam stellen, jede mit Vorschlag und den Folgen jeder Antwort.
- Eine Frage, die ein laufendes Paket **blockiert**, sofort stellen; die übrigen Pakete laufen weiter.
- Rückfragen der Entwicklersitzungen beantwortet die Steuerung selbst, wo Spec oder Auftrag es hergeben; sonst bündeln.
- Für Plattformgrenzen Chris eine konkrete Klick-Anleitung geben, nachdem ein Hilfsagent lesend geprüft hat.

## 11. Vorlagen

**Übergabe** (Abschnitt in `FORTSCHRITT.md`, KE-R03; Muster „Übergabe an die Steuerung von G4“):

```markdown
## Übergabe an die Steuerung von <Etappe>, <Welle>

- **Stand:** gemergt (#…), offen (#…, Zustand), Schalter `aktiv: …`, Schattenbetrieb n von 10.
- **Nächstes:** Pakete der nächsten Welle mit Voraussetzung.
- **Schnitt und Abhängigkeiten:** Wellen, Merge-Reihenfolge, gemeinsame Dateien.
- **Stufen:** je Paket Stufe, Denkaufwand, Grund; laufende S3-Sitzungen mit ID.
- **Fallen:** was in dieser Welle Zeit oder Geld gekostet hat.
- **Offene Punkte:** - [ ] … (mit Zuständigkeit)
- **Werkzeuge:** was funktioniert, was nicht erreichbar ist.
```

**Etappen-Rückblick** (MW-R12, KE-R18, KE-AK-05; Muster „Rückblick G3“):

```markdown
### Rückblick <Etappe> (MW-R12, KE-R18)

| Kennzahl | <Etappe> |
| --- | --- |
| KZ-1 Abnahme beim ersten Anlauf | n von m (…%) |
| KZ-2 Rückfragen wegen unvollständigem Auftrag | … |
| KZ-3 Läufe der vollen Prüfung je PR | … |
| KZ-4 Pakete über Budget | über Richtwert …; über harter Grenze … |
| KZ-5 Verbrauch je abgenommenem Paket | je Stufe und Größenklasse |
| Steuerung | je Welle und Teilaufgabe |
| Eskalationen je Stufe | … |

**Lehren und Vorschläge (zur Freigabe durch Chris, noch nicht beschlossen):**

1. … (Auftragsvorlage, Budgets in KE-R14, Richtwerte in MW-R05, Startskript, Fallen in der Code-Landkarte)
```

## 12. Blindtest (Etappe B)

- Bei einer Lücke in Leitfaden, Profil oder Playbook **nicht fragen**, sondern eine Annahme treffen und sie in einer
  **Lückenliste** vermerken (Datei, Stelle, Annahme, Folge).
- **Bestanden** nur mit grünen Prüffällen und leerer Lückenliste (docs/06, „Offene Punkte“).
- Gemergt wird **nur in Wegwerf-Branches**; dort mergt die Steuerung selbst (docs/06, „Steuerung und Arbeitspakete“
  und „Etappen“, Zeile B; AM-R04 gilt dort nicht, _Verfahren, Stand 15.10.2026_). Für TypeScript ein Branch ohne `src/`, `prisma/`, `e2e/`
  und `tests/`.
- **Wegwerf-Basis** (_Verfahren, Stand 15.10.2026_): ein Branch `blindtest/<plattform>/main` von `main`; alle Paket-PRs zielen dorthin. Dort
  kein Schattenbetrieb und kein Label `automerge`.
- Was im Normalbetrieb Chris erledigt (Denkaufwand „Hoch“ einstellen, Freigaben), wird im Blindtest zur Annahme mit
  Eintrag in der Lückenliste, sofern der Auftrag nichts anderes sagt.

## 13. Typische Fehler und Gegenmittel

| Fehler | Gegenmittel |
| --- | --- |
| Lange Steuerungssitzung über mehrere Wellen (G2: rund 31 statt 5 US-Dollar; G3 Welle 1: 31) | Grenzen aus Abschnitt 1; Übergabe und frische Steuerung; Doku-PRs und PR-Begleitung in kleine Sitzungen |
| Eigene Log-Auswertung in der Steuerung oder Entwicklersitzung (G3-J: rund 7 US-Dollar) | Fehlerbild nur über S1-Hilfsagent mit `get_job_logs`, gefiltert; Diagnose-Grenze im Auftrag |
| Firefox fehlt in der Sandbox; jeder Firefox-Befund kostet einen vollen CI-Lauf | im Auftrag als Falle nennen; Diagnosemeldungen früh einbauen; lokal nur Chromium und 375 px (CI-21) |
| E2E-Job läuft bis 60 Minuten (CI-17), langsamere Runner auf der Warteschlange | Check-in nicht vor 60 Minuten; ein Ausfall ohne Bezug zum Diff wird höchstens einmal neu gestartet (CI-18) |
| Werkzeug nicht erreichbar: GraphQL, Branches löschen, direkter Log-Download | REST-Routen aus Abschnitt 8; Logs nur per `get_job_logs` über Hilfsagent; Branches löscht Chris |
| Plattformgrenze angenommen statt geprüft (Regelsatz fehlte; Denkaufwand beim Start nicht setzbar) | erst lesend prüfen lassen, dann Chris eine Klick-Anleitung geben |
| Frischer Worktree ohne Prisma-Client: Typecheck und Tests scheitern | vor jedem Prüflauf `npx prisma generate` |
| Abnahme vor dem letzten Push oder Label vor dem Kommentar | Reihenfolge aus Abschnitt 8 einhalten; nach jedem Push neu abnehmen |
| Doku-Abschnitte im Diff versehentlich gelöscht (A2a) | Hilfsagent prüft, dass sich nur die beauftragten Abschnitte ändern |
| Auftrag ohne Abbruchvorgabe | KE-R12 und Diagnose-Grenze in jedem Auftrag; A2c zeigt, dass ein früher Abbruch billig ist |

## Bitte bestätigen

- [ ] **Eine Steuerung je Vorhaben** (docs/06) gegenüber „frische Steuerung je Welle“ und Gesamtsteuerung
      (KE-R03, `FORTSCHRITT.md`): ausgelegt als „zu jedem Zeitpunkt genau eine Steuerung je Vorhaben“.
- [ ] **Budget in US-Dollar** (Abschnitt 3): Richtwerte aus dem Rückblick G3, harte Grenze 1,5 × oberer Richtwert und
      Diagnose-Grenze sind Verfahren, Stand 15.10.2026, noch nicht in KE-R14.
- [ ] **Werkzeugwege** (Abschnitte 5, 6, 8): `create_session` mit Tags, `send_later`, die `ccr`-REST-Routen und
      `get_job_logs` sind Verfahren, Stand 15.10.2026.
- [ ] **Fortschrittsdatei der Liferay-Umsetzungen:** docs/06 und AM-R15 sprechen von der Fortschrittsdatei „der
      Umsetzung“; ausgelegt als `FORTSCHRITT.md` im Wurzelordner mit einem Abschnitt je Vorhaben.
- [ ] **Check-ins:** Abbruch nach drei Runden ohne Neues und einmal Bescheid an Chris (KE-R04 mit der Praxis aus A2).
- [ ] **Blindtest:** Denkaufwand und Freigaben werden zur Annahme in der Lückenliste; Wegwerf-Basis
      `blindtest/<plattform>/main`, dort kein Schattenbetrieb und kein Label `automerge`; AM-R04 gilt dort nicht
      (Abschnitt 12).
- [ ] **Weitere Verfahren:** Lesereihenfolge des Profils (Abschnitt 2), AM-R11 als Start-Voraussetzung, Check-in ab
      60 Minuten, Setzen von Kommentar und Label über die GitHub-Werkzeuge.

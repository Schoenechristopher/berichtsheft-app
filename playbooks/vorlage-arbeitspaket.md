# Vorlage Arbeitspaket (Auftrag an eine Entwicklersitzung)

Stand: 15.10.2026 · gilt für alle Plattformen (TypeScript, Liferay 6.2.5, Liferay 7.2, Upgrade)

Die Steuerung schreibt für jedes Arbeitspaket einen Auftrag nach dieser Vorlage (KE-R01, KE-S02) und startet damit eine
Entwicklersitzung. Der Auftrag verweist auf Abschnitte, statt Dokumente abzuschreiben. Die Abschnitte von „Ziel und
Fertig-Kriterium“ bis „Erwartete Rückmeldung“ sind Pflicht und dürfen nicht leer sein; der Block „Gemeinsame Regeln für
alle Pakete“ wird je Etappe angepasst und angehängt.

Prüfung eines fertigen Auftrags vor dem Start (KE-AK-01): Auftrag als Datei ablegen und
`npx tsx scripts/playbooks/pruefen.ts <auftrag>.md` aufrufen. Rückgabe 0 heißt vollständig; sonst meldet die Prüfung
feste Gründe wie `fehlender-abschnitt`, `fehlende-pruef-id`, `fehlende-stufe`, `fehlender-denkaufwand`,
`fehlende-harte-grenze` oder `fehlende-diagnose-grenze`.

Modelle erscheinen in Aufträgen nie mit Namen oder Kennung, nur als Stufe S1, S2 oder S3 (MW-R01, MW-R03). Welches
Modell eine Stufe hat, ermittelt die Steuerung zur Laufzeit.

## Ziel und Fertig-Kriterium

Ausfüllhinweis:

- Ein Satz zum Ziel, z. B. „Alle Prüffälle von M05 grün auf Liferay 7.2“.
- Nummerierte Fertig-Kriterien, jedes prüfbar. Pflicht: mindestens eine Prüffall- oder AK-ID (z. B. die Prüffälle aus
  `specs/pruefung/`, Format in `specs/pruefung/format.md`) oder ausdrücklich „keine Prüffälle, weil …“ mit Begründung.
- Bei Doku- oder Werkzeugpaketen die Spec-AK nennen, die das Paket erfüllt (z. B. KE-AK-01).
- Mögliche Schemaänderungen benennen: welche Tabelle oder welches Feld, Migration ja oder nein. Gibt es keine, steht
  „Keine Schemaänderung“ da.

## Playbook und Schritt

Ausfüllhinweis: Plattform-Reihe und Playbook (`playbooks/<plattform>/Pnn-<kurzname>.md` oder
`playbooks/upgrade-625-auf-72/Unn-<kurzname>.md`), bei geteilten Playbooks die Schritte, dazu der empfohlene Weg (A aus
dem Quellcode, B aus der Spec). Ohne Playbook: die Grundlagen mit Regel-IDs (z. B. KE-R01, MW-R05), nicht deren Text.

## Dateien in Lesereihenfolge

Ausfüllhinweis: nummerierte Liste, zuerst `CLAUDE.md`, dann Profil-Abschnitte, Fach-Spec, Abschnitt der
Code-Landkarte (`specs/code-landkarte.md`), Prüffälle und die zu ändernden Dateien. Große Dateien mit Abschnitt
angeben (KE-R09). Darunter:

- **Dateien, die du anlegst oder änderst:** abschließende Liste. Alles andere ist tabu.
- **Bausteine:** vorhandene Funktionen oder Komponenten, die die Sitzung wiederverwenden soll, mit Pfad.
- **Gemeinsame Dateien:** Dateien, die parallele Pakete ebenfalls berühren, und wer dort was ändert.

## Prüfbefehle

Ausfüllhinweis: die Befehle, die vor jedem Push grün sein müssen, wörtlich, mit erwarteter Ausgabe, wo sie nicht
offensichtlich ist. TypeScript: Lint, Format, Typecheck, Unit-Tests, gezielte Browser-Tests. Liferay: Build und Tests
nach Profil (Abschnitt „4. Tests und Prüf-Adapter“), Prüf-Adapter für die Prüffälle des Pakets.

## Branch, Stufe und Denkaufwand

Ausfüllhinweis: Branch `claude/<etappe>-<paket>-<kurzname>`, Stufe S1, S2 oder S3 mit Denkaufwand (niedrig, mittel,
hoch) und Grund nach MW-R05 und MW-R06 (`docs/08-spec-modellwahl.md`), dazu die Änderungsklasse nach
`docs/07-spec-automatisches-mergen.md`. Für Denkaufwand „hoch“ nennt die Steuerung Chris die Sitzungs-ID.

## Budget und Abbruch

Ausfüllhinweis: Größenklasse und Richtwert in US-Dollar (KE-R14), **harte Grenze in US-Dollar einschließlich Diagnose**
und **Diagnose-Grenze in US-Dollar** (Anteil der harten Grenze für Fehlersuche). Abbruch nach KE-R12: dreimal derselbe
Fehler (KE-AK-03), harte Grenze oder Diagnose-Grenze erreicht.

## Bekannte Fallen

Ausfüllhinweis: Fallen aus früheren Paketen und aus der Code-Landkarte, die dieses Paket treffen können, je ein Punkt
mit Ausweg. Dazu die Laufzeit der vollen Prüfung, falls das Paket sie auslöst, und Grenzen der Sandbox (z. B. Browser,
Container).

## Erwartete Rückmeldung

Ausfüllhinweis: Bericht nach dem Block „Gemeinsame Regeln für alle Pakete“ (Punkt „Bericht“), dazu was die Steuerung
für dieses Paket zusätzlich braucht, z. B. die Liste der festen Gründe einer Prüfung oder Messwerte.

## Gemeinsame Regeln für alle Pakete

Diesen Block passt die Steuerung je Etappe an (Sitzungs-ID, Konventionen der Parallelpakete) und hängt ihn an jeden
Auftrag.

- **Rolle:** Du bist eine Entwicklersitzung und setzt genau dieses Paket um. Die Steuerung ist die Sitzung
  `<steuerungs-sitzung>`. Sie nimmt ab, schreibt `FORTSCHRITT.md` und gibt Fragen an Chris weiter. Chris gibt frei
  und mergt. Fragen an Chris stellst du nicht direkt, sondern über die Steuerung.
- **Lesereihenfolge:** zuerst `CLAUDE.md`, dann die Dateien aus „Dateien in Lesereihenfolge“. Lies gezielt, große
  Dateien nur abschnittsweise (KE-R09). Breite Suchen und Log-Auswertungen gibst du an einen Hilfsagenten der Stufe S1
  mit Denkaufwand niedrig ab; er liefert nur das Ergebnis (KE-R16).
- **Umgebung:** Das Startskript richtet die Sitzung ein (TypeScript: `.claude/hooks/session-start.sh`, Protokoll
  `/tmp/session-start.log`; Liferay: JDK und Bundle nach P00 der Plattform). Eigene Installationsschritte nur, wenn es
  fehlschlägt, und dann im Bericht nennen.
- **Grundsatz:** Profile und Playbooks ändern nie eine Regel. Die Fach-Specs unter `specs/` sind maßgeblich; verwiesen
  wird auf Regel- und AK-IDs. Abweichungen kennzeichnest du als „abweichend, begründet“ und listest sie unter „Bitte
  bestätigen“.
- **Bausteine:** Was der Auftrag als Baustein nennt, verwendest du wieder, statt es neu zu bauen. Fachregeln liegen
  plattformunabhängig als reine Funktionen bzw. Klassen ohne Abhängigkeit zu Oberfläche oder Datenbank (TypeScript:
  `src/domain/`; Liferay: Service-Schicht nach Profil). „Jetzt“ kommt nur aus dem Uhr-Baustein.
- **Gemeinsame Dateien:** Du änderst nur die Dateien aus der Liste des Auftrags. Was parallele Pakete ebenfalls
  berühren, steht dort mit Zuständigkeit; alles andere ist tabu, vor allem `specs/**`, `docs/**`, `CLAUDE.md`,
  `.claude/**`, `.github/**` und `FORTSCHRITT.md`.
- **Schemaänderungen:** nur, wenn der Auftrag sie nennt. Brauchst du eine ungenannte, hältst du an und fragst die
  Steuerung.
- **Prüfbefehle:** alle Befehle aus „Prüfbefehle“ lokal grün vor jedem Push.
- **Feste Gründe statt Meldungstexte:** Prüfskripte und Fachfunktionen melden feste, maschinenlesbare Gründe (z. B.
  `fehlender-abschnitt`) plus Datei und Stelle; Tests prüfen den Grund, nicht den Wortlaut.
- **Gegenprobe:** Bei jeder Prüfung, die du baust oder auf die du dich verlässt, zeigst du einmal, dass sie bei einem
  absichtlich eingebauten Fehler scheitert, und nimmst den Fehler danach zurück.
- **Git und CI** (`docs/ci-richtlinie.md`):
  - Branch wie im Auftrag, Commit-Beschreibungen auf Deutsch, ohne `Co-Authored-By`-Zeile.
  - Keine Modellkennungen in Commits, PR-Texten und Dateien (MW-R03).
  - Erst lokal prüfen, dann gebündelt pushen (möglichst ein Push). Keine Tests überspringen, keine leeren Commits, kein
    Force-Push.
  - Der PR bleibt Entwurf; auf „bereit“ stellt erst die Steuerung nach der Abnahme. Der Wechsel auf „bereit“ bricht den
    laufenden Entwurfs-Lauf ab und meldet ihn rot; das ist erwartet.
  - Die Plattform abonniert deine Sitzung automatisch auf deinen PR. Auf CI-Ereignisse reagierst du nur, wenn die
    schnelle Prüfung rot ist.
  - Der E2E-Job der vollen Prüfung läuft bis zu 60 Minuten; nicht darauf warten, darum kümmert sich die Steuerung.
  - Firefox (und weitere Browser nach Profil) gibt es in der Sandbox nicht; jeder Befund dort kostet einen vollen
    CI-Lauf. Baue Diagnosemeldungen (Zustand, Zeitpunkt, Auswahl) früh in Browser-Tests ein, nicht erst nach dem
    ersten Ausfall.
- **Budget und Abbruch:** Richtwert und harte Grenze stehen im Auftrag; die Grenze gilt einschließlich Diagnose. Deinen
  Verbrauch prüfst du mit `get_session` ohne `session_id` (`usage.cost_usd`), wenn verfügbar, sonst schätzt du ihn.
  - **Diagnose-Grenze:** höchstens der im Auftrag genannte Betrag für Fehlersuche. Danach stoppst du und berichtest an
    die Steuerung mit dem Fehlerbild.
  - CI-Logs und Artefakte liest du nicht selbst. Das Fehlerbild liefert die Steuerung über einen Hilfsagenten der
    Stufe S1; bitte sie per `send_message` darum.
  - Scheiterst du dreimal am selben Fehler (KE-AK-03) oder erreichst du die harte Grenze, endest du mit Bericht
    (KE-R12): Stand, Ursache, nächster Schritt.
- **Bericht** per `send_message` an die Steuerung, sobald der Draft-PR steht:
  - PR-Nummer und Head-SHA,
  - Liste der Dateien,
  - erfüllte Fertig-Kriterien mit Beleg (Befehl, Ergebnis),
  - Gegenprobe,
  - Abweichungen und „Bitte bestätigen“,
  - Verbrauch in US-Dollar,
  - offene Punkte.

  Die PR-Beschreibung enthält: Inhalt, abgedeckte IDs (AK, Prüffälle, Spec-AK) und wie sie geprüft sind, „Bitte
  bestätigen“ als Liste `- [ ]` sowie die Änderungsklasse mit dem Hinweis, wer mergt.

## Beispiel (ausgefüllt)

```markdown
# Auftrag <etappe>-<paket>: M05 Status und Prüfung auf Liferay 7.2

## Ziel und Fertig-Kriterium
Ziel: M05 läuft auf Liferay 7.2. Fertig, wenn:
1. Alle Prüffälle von M05 grün über den Prüf-Adapter, darunter AK-501-01 bis AK-501-08 und AK-505-01.
2. Nachweis AK-505 und AK-508 nach `profile/liferay-72.md`.
3. Keine Schemaänderung außer den Statusfeldern laut Playbook (Service Builder, Migration ja).

## Playbook und Schritt
`playbooks/liferay-72/P05-status-und-pruefung.md`, Schritte 1–9, Weg B (aus der Spec).

## Dateien in Lesereihenfolge
1. `CLAUDE.md`
2. `profile/liferay-72.md`, Abschnitte 3 und 4
3. `specs/M05-status-und-pruefung.md`
4. `specs/code-landkarte.md`, Abschnitt M05
5. `specs/pruefung/M05.json`

Dateien, die du anlegst oder änderst: `liferay-72/modules/berichtsheft-status-*`. Sonst nichts.

## Prüfbefehle
`<build-befehl>`, `<test-befehl>`, `<pruef-adapter-befehl> M05`.

## Branch, Stufe und Denkaufwand
Branch `claude/<etappe>-p05-liferay-72`. Stufe S3, Denkaufwand mittel. Grund: neue Plattform, Statusregeln mit
Risiko (MW-R05). Änderungsklasse <klasse>.

## Budget und Abbruch
Größe mittel, Richtwert 10–15 US-Dollar, harte Grenze 20 US-Dollar inkl. Diagnose, davon Diagnose höchstens
4 US-Dollar. Abbruch nach KE-R12.

## Bekannte Fallen
- <Falle aus früherem Paket> – <Ausweg>.

## Erwartete Rückmeldung
Bericht nach den gemeinsamen Regeln, dazu die Laufzeit des Prüf-Adapters.
```

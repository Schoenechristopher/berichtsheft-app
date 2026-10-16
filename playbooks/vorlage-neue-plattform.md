# Vorlage neue Plattform

Vorlage für eine weitere Umsetzung der Berichtsheft-App, z. B. Java/Spring, .NET oder Liferay 7.4 · Grundlage
`docs/06-spec-architektur.md` („Plattform-Profile“, „Playbooks“, „Weitere Dateien“) · Stand: 16.10.2026 (Etappe G4,
Paket L) · Status: **Entwurf zur Freigabe** · @Chris

Die Vorlage hat zwei Teile in fester Reihenfolge: **zuerst das Profil** der Plattform nach der Profil-Vorlage, **dann die
Reihe P00 bis P10** aus diesem Profil. Eine Reihe ohne freigegebenes Profil wird nicht begonnen. Die Fach-Specs unter
`specs/` und die Prüffälle unter `specs/pruefung/` gelten unverändert; Profil und Reihe ändern nie eine Regel.

## 1. Ziel und Fertig-Kriterium

Für eine neue Plattform `<plattform>` (Kurzname in Kleinbuchstaben mit Bindestrich, z. B. `spring-boot`, `dotnet`,
`liferay-74`) liegen vor:

1. `profile/<plattform>.md` mit den sieben Abschnitten der Profil-Vorlage und dem Abschnitt „Nachweis AK-505 und AK-508“
   (Abschnitt 5, Schritte 1 bis 6), freigegeben von Chris.
2. Die Reihe `playbooks/<plattform>/P00-grundgeruest.md` bis `P10-abnahme.md` nach den Aufbau-Regeln in Abschnitt 6.
3. Die Folgeaufträge außerhalb von `profile/` und `playbooks/` (Playbook-Prüfung, Merge-Kriterien, CI-Klasse) sind der
   Steuerung gemeldet (Schritt 13); sie sind eigene Aufträge.
4. `npx tsx scripts/playbooks/pruefen.ts` meldet für alle neuen Dateien keinen Befund (KE-AK-01).

Diese Vorlage gehört keinem Fach-Modul. AK-IDs nennt erst die Reihe: P01 bis P09 jede AK-ID ihres Moduls, P10 die von Q.

## 2. Voraussetzungen

- Die Fach-Specs M01 bis M09 und Q sind maßgeblich (`specs/00-uebersicht.md`), die Prüffälle vollständig
  (`specs/pruefung/format.md`).
- Mindestens eine Reihe ist fertig und dient als Muster: `playbooks/typescript/` (Referenz mit Quellcode),
  `playbooks/liferay-72/` oder `playbooks/liferay-625/` (Plattform ohne Quellcode der Referenz).
- Für eine Liferay-Version: `profile/liferay-gemeinsam.md` gilt mit (Schema, Bausteine, AM-R04-Muster, Bibliotheken);
  das neue Profil nennt nur, was die Version anders macht. Für eine Plattform außerhalb von Liferay ist das Schema der
  Referenz Grundlage (`prisma/schema.prisma`, Migrationen unter `prisma/migrations/`, Abschnitt 5 der Fach-Specs).
- Freigabe der Plattform durch Chris (Name, Versionen, Zweck); ohne sie kein Profil.

## 3. Eingaben

- `docs/06-spec-architektur.md`: „Plattform-Profile“ (Profil-Vorlage und Abbildung der Bausteine), „Playbooks“ (Vorlage je
  Playbook, Reihe je Plattform), „Weitere Dateien“.
- Ein bestehendes Profil als Muster: `profile/liferay-72.md` (Plattform mit gemeinsamer Grundlage) oder
  `profile/typescript-nextjs.md` (Referenz).
- `specs/code-landkarte.md`: je Modul, was 1:1 übersetzt und was durch Bordmittel ersetzt wird.
- `specs/modulgraph.json`: Abhängigkeiten der Module, daraus die Bau-Reihenfolge.
- `docs/07-spec-automatisches-mergen.md` (AM-R04), `docs/ci-richtlinie.md` (Abschnitt 7), `docs/08-spec-modellwahl.md`,
  `docs/09-spec-kosteneffizienz.md`.
- Playbook-Prüfung: `scripts/playbooks/pruefung.ts` (Pflichtabschnitte, IDs, Pfade, Modellkennungen).

## 4. Weg A: aus dem Quellcode

Nur für eine Plattform, die eng an die TypeScript-App angelehnt ist (z. B. eine andere Node-Laufzeit): Das Profil
übernimmt `profile/typescript-nextjs.md` Abschnitt für Abschnitt und nennt nur die Unterschiede; die Reihe übernimmt die
Abschnitte 4 („Weg A“) aus `playbooks/typescript/` mit angepassten Pfaden. Für alle anderen Plattformen gibt es keinen
Quellcode der Referenz in der Zielsprache; Weg A beschränkt sich dann auf plattformneutrale Teile wie den Ablauf-Adapter
(`e2e/pruefung/ablauf-adapter.ts`, `e2e/pruefung/ablauf-pruefungen.ts`).

## 5. Weg B: aus der Spec

Bau-Reihenfolge der Vorlage:

1. Profil nach der Profil-Vorlage (Abschnitte 1 bis 7 und Nachweis), Schritte 1 bis 6.
2. Pfadmuster für AM-R04, CI-Klasse und Browser-Umfang im Profil vorschlagen, Schritt 7.
3. Freigabe des Profils, Schritt 8.
4. Reihe P00 bis P10 nach den Regeln aus Abschnitt 6, Schritte 9 bis 12.
5. Folgeaufträge an die Steuerung, Schritt 13.

## 6. Empfehlung

**Weg B**, außer die Plattform ist eine Variante der TypeScript-App. Wichtiger als die Reihenfolge ist, dass jede Annahme
des Profils in P00 am laufenden System bestätigt oder als Befund gemeldet wird.

### Aufbau der Reihe (gilt für P00 bis P10 jeder neuen Plattform)

- **Dateiname und Kurzname** wie in `playbooks/typescript/`: `P00-grundgeruest.md`, `P01-kalender-und-zeit.md`,
  `P02-personen-und-zugang.md`, `P03-wochenberichte-entstehen.md`, `P04-bericht-erfassen.md`,
  `P05-status-und-pruefung.md`, `P06-historie.md`, `P07-pdf-export.md`, `P08-benachrichtigungen-und-erinnerung.md`,
  `P09-oberflaeche.md`, `P10-abnahme.md`.
- **Kopfzeile** unter dem Titel: Reihe `playbooks/<plattform>/`, Plattform mit Version, Profil `profile/<plattform>.md`
  (bei Liferay „baut auf `profile/liferay-gemeinsam.md` auf“), Stand mit Datum und Paket, Status, Verantwortlicher.
- **Zehn Abschnitte** in der Reihenfolge der Vorlage je Playbook (`docs/06-spec-architektur.md`): „1. Ziel und
  Fertig-Kriterium“ bis „10. Typische Fehler“. Die Playbook-Prüfung meldet einen fehlenden, leeren oder vertauschten
  Abschnitt.
- **Branch** `claude/<kurzform>-pNN-<kurzname>` (z. B. `claude/l72-p05-status-und-pruefung`); die Kurzform legt das Profil
  fest. Alle Befehle aus dem Wurzelordner der Umsetzung (`<plattform>/`), außer Playwright (aus der Wurzel des Repositorys).
- **Abschnitt 5** hat je Modul eine AK-Tabelle mit **jeder** AK-ID des Moduls einzeln (Kurzfassung, Zahl der Prüffälle je
  Ebene, Datei); ein Bereich „von … bis …“ zählt nur seine Endpunkte. Abweichungen stehen in einer eigenen Spalte
  „Bewertung auf `<plattform>`“: gleichwertig bzw. **abweichend, begründet** mit Prüffall-ID und Verweis auf das Profil.
- **Fachlogik** als reine Funktionen bzw. Klassen ohne Abhängigkeit zu Oberfläche oder Datenbank (Gegenstück zu
  `src/domain/`); der Service prüft Rolle und Besitz selbst; „jetzt“ nur aus dem Uhr-Baustein. Ort und Paket nennt das
  Profil, Abschnitt 2.
- **Plattformeigene Tests** beginnen mit der AK-ID (in der Schreibweise der Plattform, z. B. `AK505_…` in Java);
  Prüffall-Tests tragen die Prüffall-ID unverändert (`AK-505-01`); Berichte nennen die AK-ID mit Bindestrich.
- **Bau-Stand:** P00 legt eine Liste der gebauten Module an; ungebaute Fälle erscheinen als „noch nicht gebaut“, nie still
  übersprungen. P01 bis P09 tragen am Ende ihr Modul ein, P10 löscht die Liste.
- **Wirksame Gegenprobe** zu jeder Prüfung, die ein Playbook baut: ein benannter, absichtlich eingebauter Fehler und die
  benannten Prüffälle bzw. Tests, die er rot macht; danach zurücknehmen.
- **Abschnitt 8** nennt mindestens: Fachlogik-Adapter des Moduls, Daten-Adapter des Moduls, plattformeigene Tests,
  Ablauf-Fälle in Chromium und 375 px, den Build-Befehl der Plattform und die Playbook-Prüfung.
- **Abschnitt 9** nennt die Änderungsklasse (`docs/ci-richtlinie.md`, Abschnitt 7), die geschützten Pfade, die das Paket
  berührt (AM-R04), und wer mergt; Bericht an die Steuerung per `send_message`, `FORTSCHRITT.md` schreibt die Steuerung.
- **„Bitte bestätigen“** als letzter Abschnitt, wenn ein Playbook vom Profil abweicht; das Profil ändert das Playbook nie
  stillschweigend.

## 7. Schritte

1. **Plattform festlegen.** Kurzname, Versionen von Sprache, Server, Datenbank und Suchdienst, Bezugsquellen (in der
   Cloud-Sitzung erreichbar?). Prüfschritt: jede Version mit Quelle und Datum belegt, nicht aus dem Gedächtnis.
2. **Profil anlegen** `profile/<plattform>.md` mit Kopf (Plattform, Stand, Status) und genau diesen Abschnitten in dieser
   Reihenfolge: „1. Laufzeit und Versionen“, „2. Projektstruktur und Build“, „3. Abbildung der Bausteine“, „4. Tests und
   Prüf-Adapter“, „5. Lokaler Start, Cloud-Sitzung und CI“, „6. Bewusste Abweichungen“, „7. Fallstricke und Grenzen“,
   dazu „Nachweis AK-505 und AK-508“, „Bitte bestätigen“ und „In P00 zu bestätigen“. Prüfschritt: Gliederung entspricht
   `profile/liferay-72.md`.
3. **Abbildung der Bausteine** (Abschnitt 3): je Zeile der Tabelle in `docs/06-spec-architektur.md` (Laufzeit, Anmeldung,
   Rollen und Besitz, Persistenz, Transaktion und Gleichzeitigkeit, Historie unveränderlich, Uhr, Hintergrundjobs,
   Benachrichtigung in der App, E-Mail, Teams, PDF, Oberfläche, Dunkelmodus, Prüf-Adapter) die Umsetzung und der Ort.
   Bordmittel der Plattform vor eigener Lösung; eine eigene Lösung mit Begründung unter „Bitte bestätigen“. Prüfschritt:
   keine Zeile leer, jede mit Ort im Projekt.
4. **Schema** (Abschnitt 2 oder Verweis): Tabellen, Spalten, Typen, Constraints, Trigger und Indizes nach der Referenz;
   Kalendertage ohne Zeitzone, Zeitpunkte in UTC (M01-R01, M01-R06). Bei Liferay nur Verweis auf das gemeinsame Profil,
   Abschnitt 2. Prüfschritt: jede Tabelle der Referenz ist abgebildet oder unter „Was nicht übernommen wird“ begründet.
5. **Tests und Prüf-Adapter** (Abschnitt 4): je Ebene (Fachlogik, Daten, Ablauf) Runner, Ort und Befehl nach
   `specs/pruefung/format.md`, „Regeln für Adapter“; Testschnittstelle nur außerhalb des Produktivbetriebs (M01-R03).
   Prüfschritt: drei Ebenen benannt, eine Ebene ohne Runner lässt den Lauf scheitern.
6. **Nachweis AK-505 und AK-508:** wie die Plattform den Schreibschutz in der Datenhaltung und das bedingte Update mit
   Versionsstand erfüllt, mit Prüffall-IDs (AK-505-01, AK-508-01) und einem plattformeigenen Test per direktem SQL bzw.
   Datenzugriff an der Fachlogik vorbei. Fachliche Ablehnungen, nach denen gespeicherte Eingaben bleiben müssen
   (Einreichen mit fehlenden Pflichtangaben), sind ein Ergebnis, keine Ausnahme, die die Transaktion zurückrollt.
   Prüfschritt: die Playbook-Prüfung findet beide IDs im Abschnitt.
7. **AM-R04, CI und Browser im Profil vorschlagen.**
   - Sicherheitsrelevante Dateien als Pfadmuster (`**`, `*`) nach dem Vorbild von `profile/liferay-gemeinsam.md`,
     Abschnitt 5: je Zeile die Entsprechung in der Referenz (`src/auth.ts`, `src/proxy.ts`, `src/domain/access.ts`,
     Rechte, Konfiguration und Testschnittstelle, Schema und Schutz in der Datenhaltung, Upgrade- bzw. Migrationsschritte,
     Bibliotheken und Build). Jedes Muster beginnt mit `<plattform>/`, damit es den TypeScript-Teil nie trifft.
   - Freigegebene externe Bibliotheken mit Version, Lizenz und Bezugsquelle wie im gemeinsamen Profil, Abschnitt 7.
   - Änderungsklasse `<plattform>/**` mit eigenem Job und Browser-Umfang nach `docs/ci-richtlinie.md`, Abschnitt 7
     („Browser für Liferay“ als Muster).
   Prüfschritt: jedes Muster mit Beispielpfad aus Abschnitt 2 und einem ungeschützten Nachbarpfad.
8. **Freigabe des Profils.** Draft-PR nur mit dem Profil, „Bitte bestätigen“ als Liste `- [ ]`; Änderungsklasse D,
   `profile/**` ist geschützt, Chris mergt. Prüfschritt: `npx tsx scripts/playbooks/pruefen.ts profile/<plattform>.md`
   ohne Befund zu IDs und Pfaden (die Abschnittsprüfung greift erst nach Schritt 13).
9. **P00 Grundgerüst ableiten** aus `playbooks/liferay-72/P00-grundgeruest.md` (Plattform ohne Quellcode der Referenz)
   bzw. `playbooks/typescript/P00-grundgeruest.md`: Umgebung, leere App startet, Prüf-Adapter der drei Ebenen mit
   Bau-Stand, Testdaten aus `specs/pruefung/testdaten.json` (Anna, Bernd, Clara, Dora, Emil), Messung von Speicher und
   Laufzeit, Vorschlag für den CI-Job, Liste „In P00 zu bestätigen“ abarbeiten, dazu die Regeln aus Abschnitt 6 dieser
   Vorlage als eigenen Unterabschnitt „Aufbau der Reihe“. Prüfschritt: P00 nennt keine AK-ID als Fertig-Kriterium.
10. **P01 bis P09 ableiten**, je Modul aus der Fach-Spec, dem Abschnitt der Code-Landkarte und der Prüffall-Datei des Moduls unter `specs/pruefung/`;
    Reihenfolge und Voraussetzungen aus `specs/modulgraph.json`. Je Playbook die AK-Tabelle mit jeder AK-ID, die
    Bewertungsspalte, die Schritte mit Prüfschritt und die Gegenproben. Prüfschritt: die Playbook-Prüfung meldet keine
    `fehlende-ak-id`.
11. **P10 Abnahme ableiten:** Q mit jeder AK-ID, Beispielszenarien, alle Prüffälle grün (Bau-Stand gelöscht),
    Demo-Anleitung der Plattform, voller Browser-Lauf (AK-1101). Prüfschritt: wie Schritt 10 für Q.
12. **Querprüfung der Reihe:** Branch-Namen, Kopfzeilen, Abschnitt 8 und 9 einheitlich; jede Abweichung vom Profil unter
    „Bitte bestätigen“. Prüfschritt: `npx tsx scripts/playbooks/pruefen.ts` ohne Befund.
13. **Folgeaufträge an die Steuerung melden** (nicht selbst umsetzen; jeweils geschützte Pfade, Chris mergt):
    - Playbook-Prüfung: `profile/<plattform>.md` in `PROFILE_FILES` und `playbooks/<plattform>/` im Muster von `kindOf`
      (`scripts/playbooks/pruefung.ts`), sonst prüft sie Profil und Reihe nur als „sonstige“ Datei ohne Pflichtabschnitte
      und AK-IDs.
    - Merge-Kriterien: die Pfadmuster aus Schritt 7 in `scripts/merge-kriterien/merge-kriterien.mjs` (Liste der Glob-Muster
      neben `GESCHUETZT_LIFERAY`) mit Unit-Tests je Muster, AM-R04 in `docs/07-spec-automatisches-mergen.md` verweist auf
      das Profil.
    - CI: Änderungsklasse und Job in `docs/ci-richtlinie.md`, Abschnitt 7, und der Workflow unter `.github/**` (Klasse I).
    - Steuerung: die Reihe in `playbooks/00-steuerung.md` (Start eines Vorhabens, Pakete schneiden).
    Prüfschritt: Liste im Bericht an die Steuerung.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |
| `npx tsx scripts/playbooks/pruefen.ts profile/<plattform>.md` (vor Schritt 13) | Befunde nur zu Auftragsabschnitten, keine zu IDs, Pfaden oder Modellkennungen |
| `grep -c "AK-" playbooks/<plattform>/P05-status-und-pruefung.md` | mindestens so viele Treffer wie AK-IDs in `specs/M05-status-und-pruefung.md` |
| `ls playbooks/<plattform>/` | elf Dateien `P00-…` bis `P10-…` |

## 9. Abschluss

- Zwei Draft-PRs: zuerst das Profil (Schritt 8), nach dessen Freigabe die Reihe. Commit-Beschreibungen auf Deutsch, z. B.
  „<Kurzform>: Profil“ und „<Kurzform>: Playbooks P00 bis P10“.
- PR-Beschreibung: Inhalt, Muster für AM-R04 mit Beispielpfaden, Vorschlag CI-Klasse und Browser, „Bitte bestätigen“,
  Folgeaufträge aus Schritt 13. Änderungsklasse D; `profile/**` und `playbooks/**` sind geschützt, Chris mergt.
- Bericht an die Steuerung per `send_message`. Den Eintrag in `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Reihe vor dem freigegebenen Profil begonnen | anhalten; erst Profil freigeben lassen (Schritt 8) |
| Profil ändert eine Regel („auf dieser Plattform gilt AK-… nicht“) | Regel bleibt; Abweichung als „abweichend, begründet“ mit Prüffall-ID unter „Bitte bestätigen“ |
| AK-Tabelle fasst Bereiche zusammen | jede AK-ID einzeln; die Playbook-Prüfung meldet `fehlende-ak-id` |
| Pfadmuster ohne Wurzelordner (`**/upgrade/**`) | Muster beginnt immer mit `<plattform>/`, sonst trifft es den TypeScript-Teil |
| Neue Plattform wird von der Playbook-Prüfung nicht erkannt | Folgeauftrag aus Schritt 13 (`PROFILE_FILES`, `kindOf`) |
| Fachliche Ablehnung als Ausnahme gebaut, gespeicherte Tage weg | Ablehnung als Ergebnis zurückgeben (Schritt 6, M05-R08) |
| Zeitpunkte um eine oder zwei Stunden verschoben | Laufzeit und Datenbanksitzung fest in UTC, Test mit `TZ=Europe/Berlin` (Gegenstück zu `tests/db/timezone.test.ts`) |
| Version aus dem Gedächtnis | Quelle und Datum nennen; nicht erreichbare Quelle unter „In P00 zu bestätigen“ |

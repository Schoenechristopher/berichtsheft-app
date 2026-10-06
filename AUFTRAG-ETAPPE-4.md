# Auftrag an die Entwickler-Sitzung: Etappe 4 – Einreichen und Prüfen

Du bist Entwickler der Berichtsheft-App im Repository `schoenechristopher96-lgtm/berichtsheft-app`. Etappen 1–3 (PR #1–#3) sind gemergt. Lies zuerst `CLAUDE.md`, `docs/01-spezifikation.md` (vor allem Statusmodell, AK-501–508, AK-601–607, AK-701–704, AK-801–803 und die bestätigten Auslegungen), `docs/02-plan.md`, dann den bestehenden Code (vor allem `prisma/schema.prisma` mit `WeeklyReport.version`, `Comment`, `StatusChange` und den Triggern, `src/domain/report-access.ts`, `report-days.ts`, `report-generation.ts` mit `classifyWeek`, `src/lib/reports.ts`, die Berichtsseiten, `tests/`, `e2e/`). Lege diesen Auftrag (ab der Überschrift) als `AUFTRAG-ETAPPE-4.md` im Repository ab.

## Ziel

Etappe 4 aus dem Plan: Der vollständige Ablauf des Statusmodells – Einreichen, Zurückziehen, Prüfliste, Freigabe, Ablehnung mit Gesamt- und Tageskommentaren, erneutes Einreichen, Rücknahme der Freigabe – mit lückenloser, unveränderlicher Historie. Benachrichtigungen (Etappe 6) und PDF (Etappe 5) sind **nicht** Teil dieser Etappe.

## Umfang

1. **Statusmodell als reine Funktion in `src/domain/`:** Eine Funktion entscheidet für (aktueller Status, Aktion, handelnde Person, Bericht) ob der Übergang erlaubt ist und mit welchem Fehler sonst. Aktionen: einreichen, zurückziehen, freigeben, ablehnen, erneut einreichen, Freigabe zurücknehmen. Erlaubt sind genau die Übergänge des Statusmodells der Spezifikation; alles andere wird mit verständlicher Meldung abgewiesen (u. a. AK-507, AK-607, AK-704).
2. **Ein Service für alle Übergänge:** Jeder Übergang läuft über **eine** serverseitige Funktion, die
   - Rolle und Besitz prüft (Azubi nur eigene Berichte; Ausbilder jeden, auch ohne Zuordnung – AK-602),
   - den Wechsel als bedingtes Update schreibt („nur wenn Status und Version noch stimmen“) und bei Konflikt mit der passenden Meldung scheitert (AK-508, beide Richtungen),
   - in derselben Transaktion den Statuswechsel (Person, Zeitpunkt, alter/neuer Status, Begründung) und ggf. Kommentare schreibt,
   - eine klar erkennbare Stelle hat, an der Etappe 6 später die Benachrichtigungen (Outbox) in dieselbe Transaktion einhängt. Jetzt noch keine Benachrichtigungen erzeugen.
3. **Einreichen (AK-501–505):** Pflichtfeld-Prüfung als reine Funktion, gemeinsam für Oberfläche (Vorschau) und Server (verbindlich): alle Tage innerhalb der Ausbildung mit Tagesart; „Betrieb“ und „Berufsschule“ mit nicht leerem Text (nur Leerzeichen = leer). Bei Fehlern wird nicht eingereicht, die betroffenen Tage werden benannt und am Tag markiert („Tätigkeiten fehlen“, „Tagesart fehlt“). Eine Woche nur aus Urlaub/Feiertagen muss trotzdem eingereicht werden (AK-504). Nach dem Einreichen ist der Bericht für den Azubi schreibgeschützt.
4. **Zurückziehen (AK-506, AK-507):** Nur im Status „Eingereicht“ durch den Azubi; danach „Entwurf“, bearbeitbar, nicht mehr in der Prüfliste.
5. **Prüfliste und Prüfen (AK-601–607):**
   - Prüfliste mit Azubi, Woche, Einreichungsdatum; standardmäßig die eigenen Azubis, per Filter alle.
   - Freigeben: Status „Freigegeben“, Person und Zeitpunkt gespeichert und angezeigt.
   - Ablehnen: nur mit nicht leerem Gesamtkommentar; zusätzlich optionale Kommentare je Tag. Kommentare gehören zur aktuellen Prüfrunde.
   - Der Azubi sieht nach der Ablehnung den Gesamtkommentar oben und jeden Tageskommentar beim jeweiligen Tag (AK-606).
6. **Überarbeiten und Rücknahme (AK-701–704):** Abgelehnter Bericht bearbeitbar und erneut einreichbar (neue Prüfrunde); beliebig viele Runden (Test: dreimal ablehnen, dann freigeben). Ein Ausbilder kann eine Freigabe nur mit nicht leerer Begründung zurücknehmen → „Abgelehnt“, bearbeitbar. Sonst ist ein freigegebener Bericht für niemanden änderbar.
7. **Historie (AK-801–803):** Auf der Berichtsseite für Azubi und Ausbilder: alle Statuswechsel (Datum, Uhrzeit, Person, neuer Status, Begründung) und alle Kommentare früherer Runden, nach Runde gruppiert. Nichts davon lässt sich bearbeiten oder löschen; die bestehenden Datenbank-Trigger bleiben die zweite Schranke.
8. **„Offen“ konsistent halten:** Die Definition „offen“ (Entwurf oder Abgelehnt, mit der Ausnahme aus `classifyWeek`) gilt überall gleich – Übersicht, Hervorhebung, später Erinnerung.
9. **Oberfläche:** Deutsch, mobil zuerst, bei 375 px bedienbar; Bestätigungsdialoge für Einreichen, Zurückziehen, Freigeben, Ablehnen, Rücknahme; Fehlermeldungen am Feld.

## Fälle, zu denen du im PR einen Vorschlag zur Bestätigung machst

Entscheide nicht stillschweigend, sondern liste deinen Vorschlag unter „Bitte bestätigen“:

- Was passiert mit einem eingereichten Bericht, wenn der Azubi deaktiviert wird (darf er noch freigegeben/abgelehnt werden)?
- Dürfen Wochen, die ganz außerhalb der Ausbildung liegen, aber Inhalt haben, eingereicht werden?
- Darf die laufende Woche schon vor ihrem Ende eingereicht werden?
- Alles Weitere, das Spezifikation und Plan nicht eindeutig regeln.

## Akzeptanzkriterien dieser Etappe

AK-501 bis AK-508, AK-601 bis AK-607, AK-701 bis AK-704, AK-801 bis AK-803 – jeweils mindestens ein Test, Name beginnt mit der AK-ID. Zusätzlich:

- Gleichzeitigkeit (AK-508) als DB-Test mit zwei parallelen Übergängen und als Playwright-Test mit zwei Browser-Kontexten.
- Die Beispielszenarien „Einreichen scheitert an fehlendem Text“ und – soweit ohne Benachrichtigung und PDF möglich – „Vertretung nimmt Freigabe zurück“ als Playwright-Tests.
- Statusmodell vollständig als Unit-Test-Tabelle (jeder Status × jede Aktion × Rolle).

## Arbeitsweise

- Branch `etappe-4-einreichen-pruefen`, Draft-PR gegen `main`. PR-Beschreibung wie bisher: Umfang, Tabelle AK → Test → Ebene, Doku-Änderungen, „Bitte bestätigen“, wie lokal starten.
- Vor jedem Push lokal Lint, Prettier, Typecheck und Tests grün. Danach den PR beobachten und CI-Fehler selbst beheben, bis alles grün ist.
- Bestätigte Auslegungen nach Bestätigung in `docs/01-spezifikation.md` bzw. `docs/02-plan.md` eintragen.
- Bei echten Unklarheiten: im PR fragen statt raten.

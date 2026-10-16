# U04 Konfiguration

Reihe `playbooks/upgrade-625-auf-72/` · Upgrade Liferay 6.2.5 CE GA6 → Liferay 7.2.1 CE GA2 · Profile
`profile/liferay-gemeinsam.md`, `profile/liferay-625.md`, `profile/liferay-72.md` · Stand: 16.10.2026 (Etappe G4,
Paket I) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Nach dem Daten-Upgrade sind Konten, Rollen, Mail, Zeitplan und Theme auf 7.2 so eingerichtet, wie es
`profile/liferay-72.md` verlangt, ohne dass Personen neu angelegt oder Daten der App geändert werden. Fertig, wenn:

1. Die Testpersonen melden sich auf der aktualisierten Instanz mit ihren bisherigen Liferay-Konten an; `BH_Person` ist
   unverändert, Bindung und Rolle gelten wie vorher (Upgrade-Fälle in `specs/pruefung/upgrade/personen.json`: AK-104,
   AK-201, AK-203, AK-204).
2. Die Rollen „BH Azubi“ und „BH Ausbilder“ bestehen, die Seiten der Site „Berichtsheft“ sind für die richtige Rolle
   sichtbar und zeigen die Portlets von 7.2.
3. Mail, Teams-Modus, Betriebsart (`bh.betrieb`) und Zeitplan laufen nach der OSGi-Konfiguration von 7.2
   (`liferay-72/configs/`); kein Eintrag aus 6.2.5 (Scheduler, Mail-Einstellungen im Control Panel) wirkt ungewollt
   weiter. Die Upgrade-Fälle in `specs/pruefung/upgrade/benachrichtigungen.json` sind grün (AK-1004, AK-1011, AK-1015,
   AK-1021).
4. Die Site nutzt das Theme von 7.2; Senna ist für die Site aus (`profile/liferay-72.md`, 7).
5. Die Upgrade-Fälle aus U03 bleiben grün (AK-505, AK-508, AK-803).

Keine Schemaänderung.

## 2. Voraussetzungen

- U03 abgenommen (Datenbank aktualisiert, Upgrade-Runner vorhanden).
- Profile: `profile/liferay-72.md`, 3 (Konfiguration, Anmeldung, Hintergrundjobs, Theme), 3.3 (Zeitplan in
  Europe/Berlin), 3.4 (Dunkelmodus), 6.1 (Liferay-eigene Konten) und 7; `profile/liferay-gemeinsam.md`, 2.5.
- Sandbox: nur in CI (Klasse U).

## 3. Eingaben

- `liferay-72/upgrade-625/bestandsaufnahme.md` (U00: Theme-Kennung, Mail-Einstellungen, Rollen),
  `liferay-72/upgrade-625/zuordnung.md` (U02).
- `liferay-72/configs/` der Reihe 7.2 (Umgebungen `local`, `ci`, `prod`).
- Prüffälle: `specs/pruefung/upgrade/personen.json`, `specs/pruefung/upgrade/benachrichtigungen.json`.
- Fach-Specs: `specs/M02-personen-und-zugang.md` (M02-R03, M02-R07, AK-201), `specs/M08-benachrichtigungen-und-erinnerung.md`
  (M08-R17, Zeitplan).

## 4. Weg A: aus dem Quellcode

`liferay-625/config/portal-ext.beispiel.properties` und `liferay-portlet.xml` (Scheduler-Einträge) gegen
`liferay-72/configs/**` und die `SchedulerEntry`-Komponenten in `liferay-72/modules/bh-notification/` lesen; jede
Einstellung von 6.2.5 bekommt ihr Gegenstück oder entfällt begründet.

## 5. Weg B: aus der Spec

Aus `profile/liferay-72.md`, 3, die Soll-Konfiguration; aus U00 der Ist-Stand. Reihenfolge: Betriebsart → Konten →
Rollen und Seiten → Mail und Teams → Zeitplan → Theme.

## 6. Empfehlung

**Weg B.** Die Konfiguration von 7.2 steht in `liferay-72/configs/`; U04 gleicht nur Reste aus 6.2.5 ab.

## 7. Schritte

1. **Betriebsart und Konfiguration einsetzen.** `liferay-72/configs/<umgebung>` ins Bundle (`./gradlew initBundle` bzw.
   Kopie nach `osgi/configs`); für den Runner `bh.betrieb=test`, für eine echte Übernahme `produktion`. Prüfschritt:
   Testschnittstelle antwortet nur bei `test` (Gegenprobe mit `produktion`: 404).
2. **Konten prüfen.** Anmeldung von Anna, Bernd und Clara mit den Konten aus 6.2.5. Liferay 6.2 und 7.2 speichern
   Passwort-Hashes mit demselben Verfahren (Voreinstellung `passwords.encryption.algorithm`; in U00 festgehalten).
   Folgeseiten der Anmeldung (Nutzungsbedingungen, Erinnerungsfrage, Passwortwechsel) bleiben aus
   (`profile/liferay-72.md`, 5). Prüfschritt: Ablauf-Schritt `anmelden` gelingt für die drei; Dora und Emil haben
   Konten, aber keinen Zugang bzw. keinen gebundenen Eintrag (wie vor dem Upgrade).
3. **Rollen und Seiten.** Rollen „BH Azubi“ und „BH Ausbilder“ vorhanden; Mitgliedschaften der Testpersonen wie in
   `BH_Person.role`; Seiten der Site „Berichtsheft“ mit den umgeschriebenen Portlet-IDs (U03, Schritt 6) und ihren
   Rechten. Prüfschritt: Anna sieht keine Seite der Ausbilder; Bernd sieht Prüfliste und Personen; die Fälle aus
   `personen.json` sind grün.
4. **Mail und Teams.** SMTP aus der OSGi- bzw. Portal-Konfiguration von 7.2 (Mailpit in CI). Einstellungen, die 6.2.5
   im Control Panel gespeichert hat (`PortalPreferences`), überschreiben `portal-ext.properties` weiter: prüfen und
   entfernen, wenn sie von 7.2 abweichen. Teams-Modus `bh.teams.modus` auf das Demo-Postfach. Prüfschritt: der Fall
   AK-1004 aus `benachrichtigungen.json` ist grün (zugestellte Nachricht nicht erneut, offene genau einmal).
5. **Zeitplan.** Die Scheduler-Einträge von 6.2.5 (`scheduler-entry`, Speicherart `MEMORY_CLUSTERED`) bleiben nicht
   erhalten; 7.2 registriert seine `SchedulerEntry`-Komponenten neu (`profile/liferay-72.md`, 3.3). Prüfschritt: in der
   Quartz-Verwaltung bzw. den `QUARTZ_`-Tabellen kein Auftrag des 6.2-Plugins; die Fälle AK-1021 und AK-1015 aus
   `benachrichtigungen.json` sind grün (kein zweiter Erinnerungslauf derselben Woche, Glocke wie vorher).
6. **Theme.** Site „Berichtsheft“ auf das Theme von 7.2 umstellen (Theme-Kennung aus U02), Senna für die Site aus,
   Dunkelmodus nach `profile/liferay-72.md`, 3.4. Prüfschritt: Startseite jeder Rolle zeigt Rahmen und Glocke des neuen
   Themes; kein Verweis mehr auf das 6.2-Theme in `LayoutSet`.
7. **Runner erweitern.** Schritt 4 des Upgrade-Runners (`specs/pruefung/format.md`, „Runner“) führt nach U03 auch
   Schritte 1 und 3 bis 6 dieses Playbooks aus. Prüfschritt: `personen.json` und `benachrichtigungen.json` grün, die
   Dateien aus U03 bleiben grün.

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| Upgrade-Runner mit `personen.json` und `benachrichtigungen.json` (in CI, Klasse U) | alle Fälle grün |
| Upgrade-Runner mit allen Dateien unter `specs/pruefung/upgrade/` (in CI) | alle Fälle grün |
| Testschnittstelle bei `bh.betrieb=produktion` (in CI) | HTTP 404 |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

## 9. Abschluss

- Commit, z. B. „U04: Konfiguration nach dem Upgrade (Konten, Rollen, Mail, Zeitplan, Theme)“.
- Draft-PR: Liste der Einstellungen alt → neu, entfernte Reste aus 6.2.5, Ergebnis der Upgrade-Fälle. „Bitte
  bestätigen“: Einstellungen, die bewusst entfallen. Hinweis: nur Platzhalter in `liferay-72/configs/`, keine
  Geheimnisse.
- Bericht an die Steuerung per `send_message`.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Anmeldung scheitert nach dem Upgrade | Passwort-Verfahren oder Folgeseiten der Anmeldung; Einstellungen aus U00 vergleichen, Konten nicht neu anlegen |
| Mails gehen an einen falschen Server | Einstellung aus dem Control Panel von 6.2.5 wirkt weiter (Schritt 4) |
| Erinnerung läuft doppelt oder zur falschen Zeit | alter Auftrag aus 6.2.5 aktiv oder Cron in Berliner Zeit geschrieben (`profile/liferay-72.md`, 3.3) |
| Seiten leer oder „Portlet nicht verfügbar“ | Portlet-IDs nicht umgeschrieben (U03, Schritt 6) |
| Azubi sieht Seiten der Ausbilder | Rechte der Seiten nach dem Umschreiben prüfen; geschützt wird im Service, die Sichtbarkeit muss trotzdem stimmen |
| Theme bleibt hell bzw. alt | `LayoutSet.themeId` zeigt noch auf das 6.2-Theme |

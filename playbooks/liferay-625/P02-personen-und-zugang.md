# P02 Personen und Zugang (M02)

Reihe `playbooks/liferay-625/` · Plattform Liferay Portal 6.2.5 CE GA6 · Profil `profile/liferay-625.md` (auf Grundlage
von `profile/liferay-gemeinsam.md`) · Stand: 16.10.2026 (Etappe G4, Paket G) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Anmeldung mit dem Liferay-Konto, Binden beim ersten Login, Zugangsprüfung bei jeder Anfrage, Rollen, Besitz und die
Nutzerverwaltung des Ausbilders sind umgesetzt: Fachregeln als reine Java-Klassen unter `de.berichtsheft.domain`,
`PersonLocalServiceImpl` mit eigener Rollen- und Besitzprüfung, Login-Aktion, Servlet-Filter, JSP-Hook der Anmeldeseite
und die Portlets Kein Zugang, Start, Personen und Einstellungen (Bundesland). Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M02.json` grün sind (15 AK-IDs; 82 Fachlogik-, 1 Daten- und 5 Ablauf-Fälle), außer
   den zurückgestellten AK-205-01 und AK-205-02 (sie brauchen den Erinnerungslauf, P08) und den zwei Fällen mit
   `abweichend.liferay-625`;
2. genau **AK-101-01** und **AK-106-01** als „abweichend, begründet“ ausgewiesen sind (Feld `abweichend` in
   `specs/pruefung/M02.json`, Verweis Profil 6.2.5, Abschnitt 6.1); AK-101-02, AK-101-03 und AK-106-02 laufen und sind grün;
3. die eigenen Tests zu AK-102, AK-104, AK-201, AK-204 und AK-207 (Schritt 11) grün sind;
4. Service Builder die Tabellen `BH_Person` und `BH_Setting` nach `profile/liferay-gemeinsam.md` 2.3 anlegt und das
   Skript „Schutz in der Datenhaltung“ (gemeinsam 2.6) ihre Teile enthält (Schemaänderung: ja, neue Tabellen über
   Service Builder und `UpgradeProcess`, Schritt 2).

## 2. Voraussetzungen

- P00 und P01 abgenommen und gemergt (Uhr-Service, Testschnittstelle, Runner, Kalender). P01 und P02 laufen
  **nacheinander**: beide ändern den Fachlogik-Adapter und `BauStand.java`.
- P00 hat bestätigt oder als „offen bis P02“ markiert: Hook-Teile im selben Plugin, `custom-jsp-dir`, Folgeseiten der
  Anmeldung abschaltbar, `auth.login.url` und Landeseite (Profil 6.2.5, „In P00 zu bestätigen“ 7, 15, 16).
- Profil 6.2.5, Abschnitte 3 (Anmeldung, Zugang je Anfrage, Rollen und Besitz, Persistenz, Transaktion), 4.2
  (Testschnittstelle, Liferay-Konten der Testdaten), 5.1 (Anmeldung, Sitzung), 6.1 (Abweichungen) und 7.
- Gemeinsames Profil: 2.3 (`BH_Person`, `BH_Setting`), 2.4 (Löschen nur per Kaskade), 2.5 (Verbindung zum
  Liferay-Benutzer, ein Mandant), 2.6, 5 (sicherheitsrelevante Pfade).

## 3. Eingaben

- Fach-Spec: `specs/M02-personen-und-zugang.md` (Regeln M02-R01 bis M02-R28, Abschnitt 5 Datenmodell, Abschnitt 6
  Schnittstellen, Abschnitt 8 Anforderungen an die Plattform).
- Prüffälle: `specs/pruefung/M02.json`; Schnittstellen und Datenformate: `specs/pruefung/format.md`, „Schnittstellen von
  M02“; Testdaten `specs/pruefung/testdaten.json`.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M02 Personen und Zugang“ (Gegenstücke der Fachfunktionen, Spalte
  „Übertragung“).
- Profil: `profile/liferay-625.md` 6.1 (Bewertung je AK), `profile/liferay-gemeinsam.md` 2.5.

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Übertragbar sind die reinen Funktionen; Lesereihenfolge `src/domain/access.ts`,
`src/domain/people.ts`, `src/domain/report-access.ts`, danach `src/lib/people/service.ts` (nur für Reihenfolge und
Fehlerübersetzung, die Transaktion baut 6.2.5 anders, Schritt 6). Der Plattformteil (Auth.js, `src/proxy.ts`,
`src/lib/session.ts`) ist nicht übertragbar; er entsteht aus Profil 6.2.5, Abschnitte 3 und 6.1. Belege zum Abgleich:
`src/domain/access.test.ts`, `src/domain/people.test.ts`, `src/domain/report-access.test.ts`, `tests/db/people.test.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Service Builder und Schema, (2) Zugang und Binden als reine Funktionen, (3) Regeln der
Nutzerverwaltung, (4) Zugriffsprüfungen, (5) `PersonLocalServiceImpl`, (6) Login-Aktion, Filter und Sitzung, (7) JSP-Hook
und Portlets, (8) Testschnittstelle und Testdaten, (9) Adapter, eigene Tests. Zu jedem AK die Prüffälle und die
Bewertung nach Profil 6.2.5, Abschnitt 6.1:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Auf 6.2.5 |
| --- | --- | --- | --- |
| AK-101 | Anmeldung nur über das Firmenkonto; ein eigenes Passwort in der App gibt es nicht. | 3 (3 ablauf): AK-101-01, AK-101-02, AK-101-03 | **AK-101-01 abweichend, begründet** (Anmeldeseite mit Passwortfeld, Anmeldeweg Liferay-Konto); AK-101-02 und AK-101-03 gleichwertig |
| AK-102 | Firmenkonto ohne Eintrag oder mit deaktivierter Person wird abgewiesen, mit dem Hinweis „Kein Zugang – bitte an den Ausbilder wenden“. | 9 (9 fachlogik) | gleichwertig; Filter zeigt `kein_zugang` |
| AK-103 | Ein Azubi sieht nur eigene Berichte; ein fremder Bericht ergibt „Zugriff verweigert“. | 3 (3 fachlogik) | gleichwertig |
| AK-104 | Ein Azubi erreicht keine Prüf- oder Admin-Funktionen, auch nicht per direkt eingegebener Adresse. | 4 (4 fachlogik) | gleichwertig; Schutz im Service, Liferay-Rollen nur für Sichtbarkeit |
| AK-105 | Jeder Ausbilder kann die Berichte aller Azubis ansehen. | 3 (3 fachlogik) | gleichwertig |
| AK-106 | Nach dem Abmelden ist ohne erneute Anmeldung kein Zugriff möglich. | 2 (2 ablauf): AK-106-01, AK-106-02 | **AK-106-01 abweichend, begründet** (prüft am Ende die Anmeldeseite wie AK-101-01); AK-106-02 gleichwertig |
| AK-201 | Admin legt eine Person mit Firmen-E-Mail, Name und Rolle an; erster Login bindet über die bestätigte E-Mail, danach zählt nur die Konto-ID. | 11 (11 fachlogik) | gleichwertig mit Auslegung: „bestätigt“ = `User.isEmailAddressVerified()`, Konto-ID = `User_.userId` |
| AK-202 | Ein Azubi braucht zugeordneten Ausbilder und Ausbildungsbeginn; fehlt eines, nennt die Meldung das Feld. | 9 (9 fachlogik) | gleichwertig |
| AK-203 | Der Admin ändert Rolle, zugeordneten Ausbilder sowie Ausbildungsbeginn und -ende. Die Folgen für die Berichte regelt M03. | 7 (7 fachlogik) | gleichwertig; Rollenwechsel setzt auch die Liferay-Rolle |
| AK-204 | Entfernen deaktiviert: keine Anmeldung, Berichte für Ausbilder lesbar, nicht änderbar; wieder aktivieren, einen Azubi nur mit aktivem Ausbilder. | 10 (10 fachlogik) | gleichwertig über den Filter je Anfrage; das Liferay-Konto bleibt aktiv |
| AK-205 | Deaktivierte Azubis erhalten keine Erinnerungen, und für sie entstehen keine neuen Wochenberichte. | 2 (1 fachlogik, 1 daten): AK-205-01, AK-205-02 | gleichwertig; beide zurückgestellt bis P08 |
| AK-206 | Endgültiges Löschen nur nach ausdrücklicher Bestätigung; Person in fremder Historie nur deaktivierbar, „Deaktivieren“ wird angeboten. | 7 (7 fachlogik) | gleichwertig; Löschen nur der Zeile `BH_Person`, Kinder per Kaskade (gemeinsam 2.4) |
| AK-207 | Der letzte aktive Ausbilder wird weder deaktiviert, gelöscht noch herabgestuft; niemand deaktiviert, löscht sich selbst oder ändert die eigene Rolle. | 8 (8 fachlogik) | gleichwertig; Ausschluss gleichzeitiger Änderungen über eine Zeilensperre (Schritt 6) |
| AK-208 | Ausbilder mit zugeordneten Azubis erst nach Neuzuordnung deaktivierbar; fürs Löschen und Herabstufen zählen auch deaktivierte Azubis. | 5 (5 fachlogik) | gleichwertig |
| AK-209 | Der Admin kann das Bundesland der Firma für die Feiertage einstellen. | 5 (5 fachlogik) | gleichwertig; `BH_Setting` mit genau einer Zeile |

AK-205 und AK-209 schließen den Kreis zu M03 und M08: Die Wirkung auf Berichte und Erinnerung prüfen P03 und P08; die
zwei Prüffälle zu AK-205 liegen in `specs/pruefung/M02.json`. Nur AK-101-01 und AK-106-01 tragen `abweichend`; dieses
Playbook setzt keine weitere Markierung und ändert die Prüffälle nicht.

## 6. Empfehlung

**Weg B.** Die Regeln (Zugang, Binden, Rollenwechsel, Löschen) sind in der Spec vollständig und als Fachlogik-Fälle
prüfbar; der Plattformteil folgt Profil 6.2.5, Abschnitte 3 und 6.1. Weg A nur für den Abgleich der reinen Funktionen.

## 7. Schritte

1. **Branch** `claude/l62-p02-personen-und-zugang`; Spec, Profil 6.2.5, Abschnitt 6.1 und Prüffälle lesen. Prüfschritt: AK-Tabelle aus
   Abschnitt 5 mit den zwei abweichenden Fällen im PR-Entwurf.
2. **Service Builder und Schema** (gemeinsam 2.3, 2.6; Profil 6.2.5, Abschnitt 3 „Persistenz“, „Schema-Schritte“, 7
   „`build.auto.upgrade`“). `service.xml` mit `package-path="de.berichtsheft"`, `<namespace>BH</namespace>`, Entities
   `Person` und `Setting` mit den Spalten aus gemeinsam 2.3 (`active` → `active_`, `userId` leer bis zum ersten Login),
   Finder `UserId`, `Email`, `TrainerId`; Spaltenlängen in `portlet-model-hints.xml`. `service-ext.properties` mit
   `build.auto.upgrade=false`. `ant build-service`; erzeugte `tables.sql` gegen gemeinsam 2.3 vergleichen. Das Skript
   „Schutz in der Datenhaltung“ als Datei `de/berichtsheft/upgrade/schutz-in-der-datenhaltung.sql`, ausgeführt von
   `UpgradeSchutzDerDatenhaltung` (`UpgradeProcess`) nach dem Anlegen der Tabellen; P02 trägt die CHECK-Constraints
   `person_trainee_requires_trainer_and_start`, `person_training_end_after_start`, `person_trainer_not_self`,
   `person_email_normalized`, `setting_single_row`, den Fremdschlüssel `trainerId` (`ON DELETE NO ACTION`) und den
   partiellen eindeutigen Index auf `userId` ein. Spätere Playbooks ergänzen das Skript um ihre Teile; bis zur Version
   `1.0.0` wird die Demo-Datenbank bei einer Schemaänderung neu angelegt (siehe „Bitte bestätigen“). Prüfschritt:
   `ant build-service deploy`; ein `INSERT` eines Azubis ohne Ausbilder per `psql` scheitert am CHECK; Ort von
   `upgrade.processes` und Reihenfolge Tabellen → Skript belegt (Profil 6.2.5, „In P00 zu bestätigen“ 4 bis 6).
3. **Zugang `de.berichtsheft.domain.access.AccessRules`** (Gegenstück zu `src/domain/access.ts`; M02-R03, M02-R07,
   M02-R08, AK-101, AK-102, AK-201): `decideAccess()` (nur angelegte, aktive Personen; Hinweis nach M02-R03),
   `matchLogin()` (zuerst `userId`, sonst einmaliges Binden über die bestätigte E-Mail), `homePathFor()`,
   `safeReturnPath()` (nur Pfade der Site, gehört fachlich zu M08). Die Fachlogik kennt nur die Werte, nicht `User`: Die
   Login-Aktion übergibt `userId`, E-Mail und `emailAddressVerified` (Profil 6.2.5, Abschnitt 6.1, AK-201). Ablehnungsgründe als feste
   Codes (`Fehlercode`). Prüfschritt: Unit-Test `AK102_ZugangTest` und `AK201_ZuordnungTest` in `test/unit/`.
4. **Nutzerverwaltung `de.berichtsheft.domain.people.PeopleRules`** (Gegenstück zu `src/domain/people.ts`; M02-R06,
   M02-R14 bis M02-R26; AK-201, AK-202, AK-203,
   AK-204, AK-205, AK-206, AK-207, AK-208): `validatePerson()`, `normalizeEmail()`, `checkUpdate()`,
   `checkDeactivate()`, `checkReactivate()`, `isLastActiveTrainer()`, `assignedTrainees()`, `checkDelete()`,
   `confirmsName()`, `checkFederalStateSetting()` (nur Admin, nur eines der 16 Kürzel, AK-209). Java 8, keine
   Liferay-Klasse. Prüfschritt: `test/unit/` mit Namen ab der AK-ID.
5. **Zugriff `de.berichtsheft.domain.access.ReportAccess`** (Gegenstück zu `src/domain/report-access.ts`; M02-R09 bis
   M02-R12, AK-103, AK-104, AK-105, AK-204): `canViewReport()` (Azubi nur eigene, Ausbilder alle, deaktivierter Azubi
   bleibt lesbar), `canManagePeople()` (nur aktive Ausbilder). `canEditReport()` entsteht in P04 (Speichern braucht es), P05 ergänzt dessen Fälle zu AK-505 und AK-704. Prüfschritt:
   Unit-Tests.
6. **`PersonLocalServiceImpl`** (M02-R13, M02-R27; AK-201, AK-202, AK-203, AK-204, AK-205, AK-206,
   AK-207, AK-208, AK-209). Schreibende Methoden heißen `addPerson`,
   `updatePerson`, `deactivatePerson`, `reactivatePerson`, `deletePerson`, `updateFederalState`; lesende `getPeople`,
   `getFederalState` (Präfix `get` läuft nur lesend, Profil 6.2.5, Abschnitt 7). Jede Methode nimmt die handelnde Person und prüft sie
   selbst über `de.berichtsheft.service.permission.PeoplePermission` (gegen `BH_Person`, nicht gegen Liferay-Rollen).
   **Ausschluss gleichzeitiger Änderungen (M02-R27):** jede schreibende Methode sperrt zuerst die einzige Zeile von
   `BH_Setting` mit `SELECT … FOR UPDATE` (Custom SQL in `PersonFinderImpl`), liest danach den Personenstand und prüft;
   zwei gleichzeitige Deaktivierungen laufen so nacheinander und sehen den Stand der ersten (AK-207). Fachliche
   Ablehnungen sind `DomainRuleException` (Unterklasse von `PortalException`, mit `Fehlercode`) und rollen zurück.
   `deletePerson` löscht nur die Zeile in `BH_Person` per Custom SQL (`DELETE FROM BH_Person WHERE personId = ?`) und
   leert danach Entity-, Finder- und Hibernate-Sitzungs-Cache aller Entities (gemeinsam 2.4); `hasForeignHistory()` ist
   eine Abfrage an die Historie und liefert bis P06 immer „nein“ (Platzhalter mit Test, den P06 scharf stellt); ein
   Fremdschlüsselfehler beim Löschen wird in `fremde_historie` übersetzt (AK-206). Beim Anlegen legt der Service das
   Liferay-Konto mit derselben E-Mail an (`UserLocalServiceUtil.addUser`, ohne Passwort in der App) und setzt die
   Liferay-Rolle „BH Azubi“ bzw. „BH Ausbilder“; Rollenwechsel tauscht sie. Deaktivieren lässt das Liferay-Konto aktiv
   (Profil 6.2.5, Abschnitt 6.1). Prüfschritt: `AK207_ZweiGleichzeitigeDeaktivierungenTest` (Schritt 11).
7. **Anmeldung und Sitzung** (Profil 6.2.5, Abschnitt 3 „Anmeldung“, „Zugang je Anfrage“, 5.1, 6.1).
   - `de.berichtsheft.hook.events.LoginPostAction` (`login.events.post` in `portal.properties` des Plugins): sucht die
     Person über `matchLogin()`, bindet beim ersten Login **bedingt** (`UPDATE BH_Person SET userId = ? WHERE personId = ?
     AND userId IS NULL AND active_ = true`, eine Zeile, sonst die gebundene Person neu lesen) und vermerkt den
     Anmeldezeitpunkt aus der Uhr in der Sitzung (`bh.anmeldezeitpunkt`).
   - `de.berichtsheft.servlet.filter.ZugangFilter` (`servlet-filter` und `servlet-filter-mapping` in `liferay-hook.xml`,
     auf alle Seiten der Site „Berichtsheft“ außer Anmelden und Kein Zugang): liest bei **jeder** Anfrage
     `PortalUtil.getUserId(request)` → `BH_Person` (aktiv, gebunden), entscheidet mit `decideAccess()`; ohne Zugang
     Weiterleitung auf `/web/berichtsheft/kein-zugang`, nach 8 Stunden ab `bh.anmeldezeitpunkt` Abmelden (M02-R04,
     M02-R05).
   - Portal-Einstellungen aus Profil 6.2.5, Abschnitt 5.1: `auth.login.url`, `default.landing.page.path`, `default.logout.page.path`,
     `auth.forward.by.last.path=true` (Rücksprungziel, AK-1003), `company.security.auto.login=false`,
     Folgeseiten aus (Nutzungsbedingungen, Erinnerungsfrage, Passwortwechsel), `session.timeout.warning=0`.
   - Abmelden über `/c/portal/logout`; das Portal ist der Anmeldedienst, damit gilt M02-R05 (Profil 6.2.5, Abschnitt 6.1, AK-106).
   Prüfschritt: Anmelden als Anna führt auf die Startseite der Rolle; Dora (Konto ohne `BH_Person`) landet auf
   `kein_zugang`.
8. **JSP-Hook und Portlets** (Profil 6.2.5, Abschnitte 3.2, 4.3). `custom-jsp-dir` `/html/hooks/login`: Anmeldeseite des Login-Portlets
   mit den festen Merkern (`data-anmeldeweg="liferay-konto"`, Passwortfeld vorhanden; das ist der abweichende Teil von
   AK-101-01), „Passwort vergessen“ und `html/portal/update_password.jsp` („Passwort setzen“ aus dem Link der
   Einladungsmail). `MVCPortlet`-Klassen unter `de.berichtsheft.portlet`: `KeinZugangPortlet` (Hinweis nach M02-R03),
   `StartPortlet` (leitet nach Rolle), `PersonenPortlet` (Liste, Anlegen, Bearbeiten, Deaktivieren, Reaktivieren,
   Löschen mit Namensbestätigung), `EinstellungenPortlet` (Bundesland). **Jede `processAction` ruft den Service, und der
   Service prüft selbst**; ausgeblendete Menüpunkte sind kein Schutz. Seiten und Rechte legt die Testschnittstelle bzw.
   ein `UpgradeProcess` an, nicht das Control Panel (Profil 6.2.5, Abschnitt 5.1 Schritt 7). Gestaltung folgt in P09. Prüfschritt: Anna
   ruft die Seite `personen` per Adresse und eine Aktions-URL des `PersonenPortlet` (`p_p_lifecycle=1`) direkt auf; beides
   wird abgewiesen (AK-104).
9. **Testschnittstelle und Testdaten** (Profil 6.2.5, Abschnitt 4.2). `testdaten_laden` legt je Person aus `specs/pruefung/testdaten.json`
   ein Liferay-Konto mit der E-Mail und dem Demo-Passwort aus der Konfiguration (Platzhalter) an, für Anna, Bernd und
   Clara zusätzlich `BH_Person`; Dora und Emil bekommen nur das Konto (Gegenprobe zu AK-102). Die E-Mail der Testkonten
   gilt als bestätigt. `bestand_leeren` löscht Personen nur über `deletePerson` bzw. die Kaskade. `BH_Setting` mit `NW`.
   Prüfschritt: zweimal `testdaten_laden` hintereinander legt nichts doppelt an; bei `bh.betrieb=produktion` antwortet
   die Schnittstelle mit 404.
10. **Adapter.** Fachlogik-Adapter (`de.berichtsheft.pruefung.FachlogikAdapter`): Schnittstellen `zugangPruefen`,
    `anmeldungZuordnen`, `personPruefen`, `aenderungPruefen`, `deaktivierenPruefen`, `reaktivierenPruefen`,
    `loeschenPruefen`, `namenBestaetigen`, `bundeslandEinstellen`, `darfBerichtSehen`, `darfVerwalten`; die Formate
    Person, Personenstand, Konto, Kandidat, Bericht und Formulardaten nach `specs/pruefung/format.md` werden übersetzt,
    nicht umgedeutet (Konto-ID → `userId`, bestätigte E-Mail → `emailAddressVerified`). Ablauf-Adapter unter
    `liferay-625/e2e/`: Aktionen `anmelden` (E-Mail und Demo-Passwort ins Login-Portlet, bis die Landeseite erscheint),
    `abmelden`, `seite_aufrufen`, `seite_verlassen`, `seite_lesen`; Seiten `anmelden`, `kein_zugang`, `start`;
    Ergebnisform `{ warnung, seite, angemeldet }`, auf der Anmeldeseite zusätzlich `passwortfeld` und `anmeldewege`.
    Prüfschritt: `ant pruefung-fachlogik -Dbh.pruefung.filter=M02.json`; Ablauf-Runner mit `-g "M02.json"` in Chromium
    und bei 375 px.
11. **Eigene Tests je AK** (Namen beginnen mit der AK-ID; JUnit ohne Bindestrich, Profil 6.2.5, Abschnitt 4.1):
    - `AK201_BindenNurEinmalTest` in `test/db/`: zwei JDBC-Verbindungen binden gleichzeitig dieselbe Person; genau eine
      ändert eine Zeile.
    - `AK207_ZweiGleichzeitigeDeaktivierungenTest` in `test/integration/`: zwei Threads mit Startschranke deaktivieren
      die letzten beiden aktiven Ausbilder; genau eine gelingt, die andere liefert `letzter_ausbilder` (Fehlercode nach
      der Spec).
    - Playwright unter `liferay-625/e2e/`: `ak-102-kein-zugang.spec.ts` (Dora meldet sich an und sieht den Hinweis,
      nicht die Meldung des Portals), `ak-104-admin-gesperrt.spec.ts` (Seite und Aktions-URL direkt),
      `ak-204-deaktivieren-wirkt-sofort.spec.ts` (Bernd deaktiviert Anna in deren laufender Sitzung; Annas nächste
      Anfrage endet auf `kein_zugang`), `produktionsmodus.spec.ts` (Testschnittstelle 404 bei `produktion`).
    Prüfschritt: `ant test-db test-integration` und Playwright grün.
12. **Bau-Stand.** M02 in `BauStand.java` eintragen; AK-205-01 und AK-205-02 bleiben zurückgestellt (P08). Alles prüfen
    (Abschnitt 8).

## 8. Prüfung

Ant-Befehle im Ordner `liferay-625/portlets/bh-portlet/` nach `. ../../env.sh`, Playwright im Wurzelordner.

| Befehl | Erwartet |
| --- | --- |
| `ant test-unit` | grün, auch `DomainOhneLiferayTest` |
| `ant pruefung-fachlogik -Dbh.pruefung.filter=M02.json` | 82 Fälle, davon 81 grün, AK-205-01 „noch nicht gebaut“, kein roter |
| `ant pruefung-daten -Dbh.pruefung.filter=M02.json` | AK-205-02 „noch nicht gebaut“ (bis P08), kein roter |
| `ant test-db test-integration` | grün, auch `AK201_BindenNurEinmalTest` und `AK207_ZweiGleichzeitigeDeaktivierungenTest` |
| `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=chromium --project=smartphone-375 -g "M02.json"` | AK-101-02, AK-101-03, AK-106-02 grün; AK-101-01 und AK-106-01 „abweichend, begründet“ (nicht grün) |
| `npx playwright test -c liferay-625/e2e/playwright.config.ts --project=chromium --project=smartphone-375 liferay-625/e2e/ak-1*.spec.ts liferay-625/e2e/ak-2*.spec.ts liferay-625/e2e/produktionsmodus.spec.ts` | grün |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: Firefox und Edge, der volle Liferay-6.2.5-Job; im PR vermerken.

## 9. Abschluss

- Commit, z. B. „L62 P02: Personen und Zugang (Liferay-Konto, Binden, Nutzerverwaltung)“; vor dem Push alle Befehle aus
  Abschnitt 8 lokal grün.
- Draft-PR mit der AK-Tabelle (AK-101, AK-102, AK-103, AK-104, AK-105, AK-106, AK-201, AK-202, AK-203, AK-204, AK-205,
  AK-206, AK-207, AK-208, AK-209 mit Test und Prüffällen), den abweichenden Fällen AK-101-01 und AK-106-01 mit Verweis
  auf Profil 6.2.5, Abschnitt 6.1, den zurückgestellten Fällen AK-205-01 und AK-205-02 und „Bitte bestätigen“. Hinweis: `hook/**`,
  `liferay-hook.xml`, `portal.properties`, `html/hooks/login/**`, `servlet/filter/**`, `domain/access/**`,
  `service/impl/**`, `service/permission/**`, `service.xml`, `sql/**` und `upgrade/**` sind sicherheitsrelevant
  (gemeinsam 5, Profil 6.2.5, Abschnitt 2.3); Chris gibt frei.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Ablauf-Fälle scheitern alle bei `anmelden` | Folgeseiten der Anmeldung (Nutzungsbedingungen, Erinnerungsfrage, Passwortwechsel) sind an; Profil 6.2.5, Abschnitt 5.1 |
| Deaktivierte Person sieht die Meldung des Portals statt des Hinweises | Liferay-Konto nicht mitdeaktivieren; der Filter zeigt `kein_zugang` (Profil 6.2.5, Abschnitt 6.1, AK-102) |
| Deaktivierung wirkt erst nach Ablauf der Sitzung | Filter liest `BH_Person` bei jeder Anfrage, kein Zwischenspeicher in der Sitzung (M02-R04) |
| Erster Login bindet nicht | `emailAddressVerified` des Kontos ist falsch; Weg der Bestätigung nach P00 (Profil 6.2.5, Abschnitt 6.1, AK-201) |
| Zweiter Login überschreibt die Bindung | Binden nur als bedingtes Update `WHERE userId IS NULL AND active_ = true` |
| Letzter aktiver Ausbilder lässt sich bei zwei gleichzeitigen Aktionen deaktivieren | Sperre auf `BH_Setting` vor dem Lesen des Personenstands fehlt (Schritt 6) |
| Schreibende Service-Methode speichert nichts | Methodenname beginnt mit `get`, `is` oder `has` und läuft nur lesend (Profil 6.2.5, Abschnitt 7) |
| Fachlicher Fehler lässt halbe Änderungen zurück | Ablehnung als `DomainRuleException` (Unterklasse von `PortalException`) werfen, nicht als `RuntimeException` |
| Löschen einer Person scheitert mit `BH803` | Kinder über Service Builder gelöscht; nur die Zeile `BH_Person`, Kinder per Kaskade (gemeinsam 2.4) |
| Nach dem Löschen zeigt die App die Person noch | Entity-, Finder- und Hibernate-Cache nach Custom SQL leeren |
| Rolle nur über Liferay-Rollen geprüft | `PeoplePermission` prüft gegen `BH_Person`; Liferay-Rollen steuern nur die Sichtbarkeit |
| `AK-101-01` erscheint als grün oder rot | Runner liest `abweichend.liferay-625` nicht; ausweisen als „abweichend, begründet“ (P00, Schritt 11) |

## Bitte bestätigen

- [ ] Markierung „abweichend, begründet“ für AK-101-01 und AK-106-01 nach Profil 6.2.5, Abschnitt 6.1; sie steht bereits in
      `specs/pruefung/M02.json`. Profil 6.2.5, „Bitte bestätigen“ nennt das Eintragen noch als offen (veralteter Text im
      Profil, keine Änderung durch dieses Playbook).
- [ ] Ausschluss gleichzeitiger Änderungen der Nutzerverwaltung über die Sperre der einzigen Zeile von `BH_Setting`
      statt serialisierbarer Transaktion mit Wiederholung wie in der TypeScript-App (gleiche Wirkung nach
      M02-R27, einfacher auf Liferay 6.2).
- [ ] Die App legt beim Anlegen einer Person auch das Liferay-Konto an und pflegt die Liferay-Rolle (Vorschlag zu
      gemeinsam 2.5, „Bitte bestätigen“: App oder Admin in der Liferay-Verwaltung).
- [ ] Wachsendes Skript „Schutz in der Datenhaltung“ bis zur Version `1.0.0`; vorher wird die Demo-Datenbank bei jeder
      Schemaänderung neu angelegt, erst ab `1.0.0` gibt es Upgrade-Schritte (gemeinsam 2.6 nennt nur `1.0.0`).
- [ ] Merker `data-anmeldeweg="liferay-konto"` auf der Anmeldeseite (AK-101-01 bleibt abweichend).
- [ ] Die App deaktiviert das Liferay-Konto nicht mit (Profil 6.2.5, „Bitte bestätigen“; AK-102, AK-204).

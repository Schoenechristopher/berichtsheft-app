# P02 Personen und Zugang (M02)

Reihe `playbooks/liferay-72/` · Plattform Liferay Portal 7.2 CE · Profil `profile/liferay-72.md` (baut auf
`profile/liferay-gemeinsam.md` auf) · Stand: 16.10.2026 (Etappe G4, Paket H) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Anmeldung mit Liferay-eigenen Konten, Zugangsprüfung bei jedem Zugriff, Rollen, Besitz und die Nutzerverwaltung des
Ausbilders sind umgesetzt: Fachregeln als reine Java-Klassen in `bh-domain`, Entities `Person` und `Setting` mit Service
Builder, Rechteprüfung in `PersonLocalServiceImpl`, die `LifecycleAction`s in `bh-access` und die Seiten Anmelden, Kein
Zugang, Start, Personen und Einstellungen (Bundesland). Fertig, wenn:

1. alle Prüffälle in `specs/pruefung/M02.json` über die Prüf-Adapter grün sind (15 AK-IDs; 82 Fachlogik-, 1 Daten- und
   5 Ablauf-Fälle), außer den zurückgestellten AK-205-01 und AK-205-02 (bis P08, sie brauchen den Erinnerungslauf);
2. die Ablauf-Fälle AK-101-02, AK-101-03 und AK-106-02 in Chromium und bei 375 px grün sind und **nur** AK-101-01 und
   AK-106-01 als „abweichend, begründet“ erscheinen (Feld `abweichend` mit `liferay-72` in `specs/pruefung/M02.json`;
   Profil 6.1), getrennt gezählt und nie grün;
3. die plattformeigenen Tests zu Zugang je Anfrage, Sitzungsdauer, Binden beim ersten Login und gleichzeitigem Deaktivieren
   (AK-207) grün sind und die Gegenproben aus Schritt 13 je einen roten Lauf gezeigt haben;
4. `/api/jsonws` keine BH-Dienste kennt (`remote-service="false"`, Profil, Abschnitt 7).

Keine Abweichung außer AK-101-01 und AK-106-01; AK-101-02 und AK-101-03 sind auf 7.2 gleichwertig.

## 2. Voraussetzungen

- L72-P00 und L72-P01 abgenommen und gemergt. P01 und P02 laufen **nacheinander**: beide ändern den Fachlogik-Adapter, den
  Bau-Stand und die Testschnittstelle (Uhr aus P00, Bundesland-Referenzdaten aus P01).
- Profil: Abschnitte 3 (Anmeldung, Zugang bei jedem Zugriff, Binden, Sitzung, Rollen und Besitz, Persistenz), 4
  (Testschnittstelle, Ablauf-Adapter), 6.1 (Anmeldung mit Liferay-Konten) und 7; gemeinsam 2.3 (`BH_Person`, `BH_Setting`),
  2.5 (Verbindung zum Liferay-Benutzer) und 2.6.
- OIDC bleibt aus, solange P00 die sechs Bedingungen aus Profil 6.2 nicht nachgewiesen hat.

## 3. Eingaben

- Fach-Spec: `specs/M02-personen-und-zugang.md` (Regeln M02-R01 bis M02-R28, Abschnitt 5 Datenmodell, Abschnitt 6
  Schnittstellen, Abschnitt 8 Anforderungen an die Plattform).
- Prüffälle: `specs/pruefung/M02.json`; Schnittstellen und Datenformate: `specs/pruefung/format.md`, „Schnittstellen von
  M02“; Testdaten `specs/pruefung/testdaten.json`.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M02 Personen und Zugang“ (Funktionen und Fallen; „Ersetzt durch
  Bordmittel“ gilt hier nach Profil 6.1).
- Profil: `profile/liferay-72.md` 3, 6.1, 6.2, Pfadmuster unter „Bitte bestätigen“ (`bh-access` ist sicherheitsrelevant).

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Aus der TypeScript-App lassen sich die Fachregeln 1:1 nach Java übersetzen; Lesereihenfolge
`src/domain/access.ts`, `src/domain/people.ts`, `src/domain/report-access.ts`, dann `src/lib/people/service.ts` als Vorbild für
die Service-Methoden. Den Plattformteil (`src/auth.ts`, `src/lib/auth/`, `src/lib/session.ts`, `src/proxy.ts`) ersetzt das
Profil durch Liferay-Konten und `LifecycleAction`s; er wird nicht übertragen. Belege der Referenz: `src/domain/access.test.ts`,
`src/domain/people.test.ts`, `src/domain/report-access.test.ts`, `tests/db/people.test.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Entities `Person` und `Setting` mit Schranken, (2) Zugang und Zuordnung beim Login, (3) Formular- und
Rollenregeln der Nutzerverwaltung, (4) Zugriffsprüfungen, (5) Personen-Service, (6) Anmeldung, Zugang je Anfrage und Sitzung,
(7) Portlets und MVC-Commands, (8) Testschnittstelle, (9) Adapter und Tests. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Bewertung auf 7.2 |
| --- | --- | --- | --- |
| AK-101 | Anmeldung nur über das Firmenkonto; ein eigenes Passwort in der App gibt es nicht. | 3 (3 ablauf) | AK-101-01 **abweichend, begründet** (Login-Portlet mit Passwortfeld, `anmeldewege` Liferay-Konto; Profil 6.1); AK-101-02, AK-101-03 gleichwertig |
| AK-102 | Firmenkonto ohne Eintrag oder mit deaktivierter Person wird abgewiesen, mit dem Hinweis „Kein Zugang – bitte an den Ausbilder wenden“. | 9 (9 fachlogik) | gleichwertig; Pre-Action prüft je Anfrage |
| AK-103 | Ein Azubi sieht nur eigene Berichte; ein fremder Bericht ergibt „Zugriff verweigert“. | 3 (3 fachlogik) | gleichwertig |
| AK-104 | Ein Azubi erreicht keine Prüf- oder Admin-Funktionen, auch nicht per direkt eingegebener Adresse. | 4 (4 fachlogik) | gleichwertig; Prüfung im Service, Liferay-Rolle nur Sichtbarkeit |
| AK-105 | Jeder Ausbilder kann die Berichte aller Azubis ansehen. | 3 (3 fachlogik) | gleichwertig |
| AK-106 | Nach dem Abmelden ist ohne erneute Anmeldung kein Zugriff möglich. | 2 (2 ablauf) | AK-106-01 **abweichend, begründet** (nur der letzte Schritt liest die Anmeldeseite; Profil 6.1); AK-106-02 gleichwertig |
| AK-201 | Admin legt eine Person mit Firmen-E-Mail, Name und Rolle an; erster Login bindet über die bestätigte E-Mail, danach zählt nur die Konto-ID. | 11 (11 fachlogik) | gleichwertig mit Ersatz: Konto-ID = `userId`, bestätigte E-Mail = `User.isEmailAddressVerified()` |
| AK-202 | Ein Azubi braucht zugeordneten Ausbilder und Ausbildungsbeginn; fehlt eines, nennt die Meldung das Feld. | 9 (9 fachlogik) | gleichwertig |
| AK-203 | Der Admin ändert Rolle, zugeordneten Ausbilder sowie Ausbildungsbeginn und -ende. Die Folgen für die Berichte regelt M03. | 7 (7 fachlogik) | gleichwertig; Liferay-Rolle folgt `BH_Person.role` |
| AK-204 | Entfernen deaktiviert: keine Anmeldung, Berichte für Ausbilder lesbar, nicht änderbar; wieder aktivieren, einen Azubi nur mit aktivem Ausbilder. | 10 (10 fachlogik) | gleichwertig |
| AK-205 | Deaktivierte Azubis erhalten keine Erinnerungen, und für sie entstehen keine neuen Wochenberichte. | 2 (1 fachlogik, 1 daten) | gleichwertig; AK-205-01 und AK-205-02 zurückgestellt bis P08 |
| AK-206 | Endgültiges Löschen nur nach ausdrücklicher Bestätigung; Person in fremder Historie nur deaktivierbar, „Deaktivieren“ wird angeboten. | 7 (7 fachlogik) | gleichwertig; Löschen nur der Zeile `BH_Person`, Kinder per Kaskade (gemeinsam 2.4) |
| AK-207 | Der letzte aktive Ausbilder wird weder deaktiviert, gelöscht noch herabgestuft; niemand deaktiviert, löscht sich selbst oder ändert die eigene Rolle. | 8 (8 fachlogik) | gleichwertig; Gleichzeitigkeit über Sperre (Schritt 6) |
| AK-208 | Ausbilder mit zugeordneten Azubis erst nach Neuzuordnung deaktivierbar; fürs Löschen und Herabstufen zählen auch deaktivierte Azubis. | 5 (5 fachlogik) | gleichwertig |
| AK-209 | Der Admin kann das Bundesland der Firma für die Feiertage einstellen. | 5 (5 fachlogik) | gleichwertig; `BH_Setting` mit genau einer Zeile |

AK-205 und AK-209 schließen den Kreis zu M03 und M08: Die Wirkung auf Berichte und Erinnerung prüfen P03 und P08; die zwei
Prüffälle zu AK-205 liegen in `specs/pruefung/M02.json`.

## 6. Empfehlung

**Weg B.** Die Regeln (Zugang, Zuordnung, Rollenwechsel, Löschen) sind in der Spec vollständig und hängen an keiner
Plattform; der Plattformteil folgt ohnehin dem Profil (Liferay-Konten, `LifecycleAction`, Service Builder). Weg A nur für die
Übersetzung der reinen Funktionen und nur auf ausdrücklichen Auftrag.

## 7. Schritte

1. **Branch** `claude/l72-p02-personen-und-zugang`; Spec und Prüffälle lesen. Prüfschritt: AK-Tabelle aus Abschnitt 5 und die
   Abweichungsliste (nur AK-101-01, AK-106-01) im PR-Entwurf.
2. **Entities** in `modules/bh/bh-service/service.xml` nach gemeinsam 2.3: `Person` (`BH_Person`: `userId` leer bis zum ersten
   Login, `email` klein und eindeutig, `role` `TRAINEE`/`TRAINER`, `active` → Spalte `active_`, `trainerId`, `trainingStart`,
   `trainingEnd`; Kanäle und `theme` mit Voreinstellung, genutzt erst in P08 und P09) und `Setting` (`BH_Setting`, `settingId`
   immer 1, `federalState` Voreinstellung `NW`). Jede Entity mit `mvcc-enabled="false"` und `remote-service="false"`. Das Skript
   „Schutz in der Datenhaltung“ (Upgrade-Schritt aus P00) bekommt die CHECK-Constraints `person_trainee_requires_trainer_and_start`,
   `person_training_end_after_start`, `person_trainer_not_self`, `person_email_normalized`, `setting_single_row`, den CHECK auf
   die 16 Kürzel, den Fremdschlüssel `trainerId` (`ON DELETE NO ACTION`) und den partiellen eindeutigen Index auf
   `BH_Person.userId`. `./gradlew :modules:bh:bh-service:buildService`; danach Datenbank `berichtsheft_l72` neu anlegen und
   Bundle neu starten, damit der Schritt läuft. Prüfschritt: erzeugte `tables.sql` gegen gemeinsam 2.3; ein direktes `INSERT`
   eines Azubis ohne Ausbilder scheitert in PostgreSQL.
3. **Zugang** `de.berichtsheft.domain.access` in `bh-domain` (M02-R03, M02-R07, M02-R08; AK-101, AK-102, AK-201):
   `AccessRules.decideAccess()` (nur angelegte, aktive Personen; Grund `konto_unbekannt` bzw. `person_deaktiviert`),
   `LoginMatcher.matchLogin()` (zuerst Konto-ID, sonst einmaliges Binden über die **bestätigte** E-Mail; Ergebnis `bekannt`,
   `binden` oder `keine`), `homePathFor()`, `safeReturnPath()` (gehört fachlich zu M08). Die Konto-ID ist in der Fachlogik ein
   `String`; auf 7.2 ist sie `String.valueOf(userId)`, damit die Prüffälle unverändert laufen. Prüfschritt: JUnit-Tests
   `AK102_…`, `AK201_…` in `bh-domain`.
4. **Nutzerverwaltung** `de.berichtsheft.domain.people` (M02-R06, M02-R14 bis M02-R26; AK-201 bis AK-208, AK-209):
   `validatePerson()`, `normalizeEmail()`, `checkUpdate()`, `checkDeactivate()`, `checkReactivate()`, `isLastActiveTrainer()`,
   `assignedTrainees()`, `checkDelete()`, `confirmsName()`, `checkFederalStateSetting()`; Ablehnungsgründe als feste Codes
   (`RuleReason`), unabhängig vom Meldungstext. Prüfschritt: JUnit-Tests je AK in `bh-domain`.
5. **Zugriff** `de.berichtsheft.domain.access.ReportAccess` (M02-R09 bis M02-R12; AK-103, AK-104, AK-105, AK-204):
   `canViewReport()` (Azubi nur eigene, Ausbilder alle, deaktivierter Azubi bleibt lesbar, deaktivierte Person sieht nichts),
   `canManagePeople()` (nur aktive Ausbilder). `canEditReport()` folgt in P05. Prüfschritt: JUnit-Tests `AK103_…` bis `AK105_…`.
6. **Personen-Service** `PersonLocalServiceImpl` in `bh-service` (M02-R13, M02-R27; AK-201 bis AK-209): `addPerson`,
   `updatePerson`, `deactivatePerson`, `reactivatePerson`, `deletePerson`, `updateFederalState`, `getFederalState`,
   `getPeople`, `getActiveTrainees`. Jede Methode bekommt nur die `userId` des Handelnden, liest dessen `BH_Person` und prüft
   `canManagePeople()` selbst. **Gleichzeitigkeit (AK-207):** zuerst die einzige Zeile `BH_Setting` mit `SELECT … FOR UPDATE`
   (Custom SQL, `PersonFinderImpl`) sperren, dann den Personenstand **innerhalb** der Transaktion lesen und die Regel anwenden;
   so lassen zwei gleichzeitige Deaktivierungen den letzten aktiven Ausbilder nicht durch. Abweisungen sind Unterklassen von
   `PortalException` mit festem Grund und rollen zurück. Beim Anlegen und beim Rollenwechsel setzt der Service die Liferay-Rolle
   „BH Azubi“ bzw. „BH Ausbilder“ (nur Sichtbarkeit; gemeinsam 2.5). `deletePerson` löscht nur die Zeile in `BH_Person`, nie
   Kinder über Service Builder (gemeinsam 2.4); `hasForeignHistory()` liefert bis P06 immer „nein“ (Platzhalter mit Test, den
   P06 scharfstellt). Prüfschritt: Arquillian-Test `PersonServiceTest.AK207_gleichzeitigesDeaktivierenLaesstLetztenAusbilderStehen`
   (zwei Threads, `CountDownLatch`, genau einer scheitert mit `letzter_ausbilder`).
7. **Anmeldung, Zugang und Sitzung** in `bh-access` (Profil, Abschnitt 3; M02-R02 bis M02-R05, M02-R07, M02-R08):
   - `BhLoginPostAction` (`LifecycleAction`, `key=login.events.post`): ruft `matchLogin()` mit `String.valueOf(userId)`,
     E-Mail des Liferay-Kontos und `User.isEmailAddressVerified()`; bei `binden` **bedingt**
     `UPDATE BH_Person SET userId = ? WHERE personId = ? AND userId IS NULL AND active_ = true` und genau eine Zeile verlangen,
     sonst neu lesen; setzt den Anmeldezeitpunkt aus der Uhr in die HTTP-Sitzung.
   - Pre-Action (`key=servlet.service.events.pre`): liest bei **jeder** Anfrage auf Seiten der Site „Berichtsheft“
     `BH_Person` zu `PortalUtil.getUserId(request)` und ruft `decideAccess()`; unbekannt oder deaktiviert → Abmelden und Seite
     `kein_zugang`; nach 8 Stunden ab Anmeldezeitpunkt → Sitzung beenden (`session.timeout` bleibt für Untätigkeit). Das
     Control Panel bleibt außen vor.
   - `logout.events.post`: nichts Eigenes bei Liferay-Konten; mit OIDC (Profil 6.2) die Weiterleitung zum Anbieter.
   Prüfschritt: Arquillian-Tests `AccessTest.AK102_deaktiviertePersonVerliertZugangBeiDerNaechstenAnfrage`,
   `AccessTest.AK106_sitzungEndetNachAchtStunden` (Uhr gestellt) und `LoginTest.AK201_ersterLoginBindetNurBeiBestaetigterEmail`.
8. **Portlets und MVC-Commands** in `bh-web`, funktional ohne Feinschliff (Gestaltung folgt in P09): Anmeldeseite als
   Login-Portlet von Liferay im eigenen Theme (Merker `data-anmeldeweg` am angebotenen Weg, Wert für das Liferay-Konto),
   Seite „Kein Zugang“ mit dem Hinweis aus AK-102, Startseite je Rolle, Personenverwaltung (Liste, Anlegen, Bearbeiten,
   Deaktivieren, Reaktivieren, Löschen mit Namensbestätigung), Einstellungen des Bundeslands. **Jeder MVC-Command übergibt nur
   die `userId`; die Prüfung macht der Service** (M02-R13); das Ausblenden ist kein Schutz. Seiten der Ausbilder sind
   zusätzlich über die Liferay-Rolle gesperrt. Prüfschritt: Aufruf der Personenverwaltung als Anna (Azubi) per direkter
   Adresse führt zur eigenen Startseite; ein direkt abgeschickter Action-Request als Anna scheitert im Service mit
   `zugriff_verweigert` (AK-104).
9. **Testschnittstelle** `bh-pruefung` erweitern: Testdaten laden legt Anna, Bernd und Clara aus `specs/pruefung/testdaten.json`
   als `BH_Person` und als Liferay-Konto mit Platzhalter-Passwort an (nur bei `bh.betrieb=test`, M02 Abschnitt 8), stellt das
   Bundesland `NW`; Dora bekommt nur ein Liferay-Konto ohne Person, Emil nichts. „Bestand leeren“ löscht nur die Zeilen in
   `BH_Person` (Kaskade) und leert danach die Caches (gemeinsam 2.4). Prüfschritt: zweimal Testdaten laden ändert nichts Zweites;
   mit `bh.betrieb=produktion` antwortet die Schnittstelle mit 404.
10. **Fachlogik-Adapter.** Schnittstellen `zugangPruefen`, `anmeldungZuordnen`, `personPruefen`, `aenderungPruefen`,
    `deaktivierenPruefen`, `reaktivierenPruefen`, `loeschenPruefen`, `namenBestaetigen`, `bundeslandEinstellen`,
    `darfBerichtSehen`, `darfVerwalten` (Formate laut `specs/pruefung/format.md`). Prüfschritt:
    `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M02` mit 81 grünen Fällen und AK-205-01 „noch nicht gebaut“.
11. **Ablauf-Adapter.** Aktionen `anmelden` (Login-Portlet mit Platzhalter-Zugangsdaten), `abmelden` (`/c/portal/logout`),
    `seite_aufrufen`, `seite_verlassen`, `seite_lesen`; Seiten `anmelden`, `kein_zugang`, `start`; Ergebnisform
    `{ warnung, seite, angemeldet }`, dazu `passwortfeld` und `anmeldewege` aus den Merkern. Prüfschritt: Ablauf-Fälle von M02 in
    Chromium und 375 px: AK-101-02, AK-101-03, AK-106-02 grün; AK-101-01 und AK-106-01 als „abweichend, begründet“ mit Verweis
    „profile/liferay-72.md, Abschnitt 6.1“.
12. **Keine JSON-Webdienste.** `remote-service="false"` an jeder Entity (Profil, Abschnitt 2). Prüfschritt: `/api/jsonws` (als
    Administrator geöffnet) listet keinen Dienst mit `bh` bzw. `de.berichtsheft`.
13. **Gegenproben** (je ein benannter Fehler, je danach zurücknehmen):
    - **F-P02-1 „Deaktivierte Person kommt hinein“:** `decideAccess()` prüft `active` nicht. Rot werden AK-102-02, AK-102-03 und
      AK-204-04 (Fachlogik) sowie `AccessTest.AK102_deaktiviertePersonVerliertZugangBeiDerNaechstenAnfrage`.
    - **F-P02-2 „Binden über unbestätigte E-Mail“:** `matchLogin()` ignoriert die Bestätigung. Rot werden AK-201-07 und
      `LoginTest.AK201_ersterLoginBindetNurBeiBestaetigterEmail`.
    - **F-P02-3 „Personenstand vor der Sperre gelesen“:** in `deactivatePerson` die Sperre auf `BH_Setting` entfernen. Rot wird
      `PersonServiceTest.AK207_gleichzeitigesDeaktivierenLaesstLetztenAusbilderStehen` (beide Threads gelingen).
    - **F-P02-4 „JSON-Webdienst offen“:** an `Person` vorübergehend `remote-service="true"`. `/api/jsonws` listet den Dienst
      (Prüfschritt 12 rot).
    Prüfschritt: vier rote Läufe im PR notiert, danach alles grün.
14. **Bau-Stand.** M02 in die Liste der gebauten Module eintragen; AK-205-01 und AK-205-02 bleiben zurückgestellt (P08). Alles
    prüfen (Abschnitt 8).

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `./gradlew :modules:bh-domain:test -Pbh.pruefung.modul=M02` | 82 Fachlogik-Fälle, davon 81 grün, AK-205-01 „noch nicht gebaut“, keiner rot |
| `./gradlew :modules:bh-test-integration:testIntegration --tests '*DatenPrueffaelleTest*' -Pbh.pruefung.modul=M02` | AK-205-02 „noch nicht gebaut“ (bis P08), keiner rot |
| `./gradlew :modules:bh-test-integration:testIntegration --tests '*AccessTest*' --tests '*LoginTest*' --tests '*PersonServiceTest*'` | grün, auch gleichzeitiges Deaktivieren (AK-207) |
| `npx playwright test --config liferay-72/pruefung/playwright.config.ts --project=chromium --project=smartphone-375` | AK-101-02, AK-101-03, AK-106-02 grün; AK-101-01, AK-106-01 „abweichend, begründet“ |
| `/api/jsonws` als Administrator | kein BH-Dienst |
| `./gradlew build formatSource` | grün, keine Änderungen |
| `npx prisma generate && npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: Firefox und Edge; mit freigegebenem OIDC (Profil 6.2) zusätzlich die Anmeldung über Keycloak. Im PR vermerken.

## 9. Abschluss

- Commit, z. B. „L72-P02: Personen und Zugang (Liferay-Konten, Zugang je Anfrage, Nutzerverwaltung)“; vor dem Push
  `./gradlew build` und die Prüf-Adapter von M02 lokal grün.
- Draft-PR mit der AK-Tabelle (AK-101, AK-102, AK-103, AK-104, AK-105, AK-106, AK-201, AK-202, AK-203, AK-204, AK-205, AK-206,
  AK-207, AK-208, AK-209 mit Test und Prüffällen), den abweichenden Fällen AK-101-01 und AK-106-01 (Verweis Profil 6.1), den
  zurückgestellten Fällen AK-205-01 und AK-205-02, den Gegenproben und „Bitte bestätigen“. Hinweis: `bh-access`,
  `**/domain/access/**`, `**/service/impl/**`, `**/security/permission/**`, `service.xml`, `**/upgrade/**` und `bh-pruefung`
  sind geschützte Pfade (gemeinsam 5); Chris mergt.
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Letzter aktiver Ausbilder lässt sich bei zwei gleichzeitigen Aktionen deaktivieren | zuerst `BH_Setting` mit `FOR UPDATE` sperren, dann den Personenstand in derselben Transaktion lesen (Schritt 6) |
| Deaktivierte Person kommt noch hinein | Pre-Action muss bei jeder Anfrage `BH_Person` lesen; die Liferay-Sitzung allein widerruft nichts |
| Zweiter Login überschreibt die Bindung | Binden nur bedingt (`userId IS NULL AND active_ = true`), genau eine Zeile verlangen |
| Groß/Klein in der E-Mail führt zu `konto_unbekannt` | E-Mail immer mit `normalizeEmail()` speichern, auch die des Liferay-Kontos; CHECK `person_email_normalized` |
| Liferay-Konto ohne bestätigte E-Mail wird nie gebunden | ob Liferay `emailAddressVerified` beim Setzen des Passworts über den Link setzt, klärt P00 (Profil 6.1); sonst Weg der Kontoanlage anpassen |
| Rolle nur über die Liferay-Rolle geprüft | jede Service-Methode prüft gegen `BH_Person` (`canManagePeople()`, `canViewReport()`); die Liferay-Rolle steuert nur Sichtbarkeit |
| `deletePerson` scheitert mit `BH803` | Kinder nie über Service Builder löschen; nur die Zeile `BH_Person`, danach Caches leeren (gemeinsam 2.4) |
| Ablauf-Fall AK-101-02 rot wegen Passwortfeld | `seite_lesen` liest die Startseite nach der Anmeldung; dort darf das Login-Portlet nicht eingebunden sein |
| Pre-Action sperrt das Control Panel | nur Seiten der Site „Berichtsheft“ prüfen (Profil, Abschnitt 3) |

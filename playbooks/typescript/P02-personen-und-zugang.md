# P02 Personen und Zugang (M02)

Reihe `playbooks/typescript/` · Plattform TypeScript/Next.js · Profil `profile/typescript-nextjs.md` · Stand: 15.10.2026
(Etappe G4, Paket D) · Status: **Entwurf zur Freigabe** · @Chris

## 1. Ziel und Fertig-Kriterium

Anmeldung über das Firmenkonto (OIDC), Zugangsprüfung, Rollen, Besitz und die Nutzerverwaltung des Ausbilders sind umgesetzt:
Fachregeln als reine Funktionen unter `src/domain/`, Personen-Service, Auth.js, Sitzung und die Seiten Anmelden, Kein Zugang,
Start, Personen und Einstellungen (Bundesland). Fertig, wenn alle Prüffälle in `specs/pruefung/M02.json` grün sind (15
AK-IDs; 82 Fachlogik-, 1 Daten- und 5 Ablauf-Fälle) und die Browser-Tests zu AK-101 bis AK-106 und AK-201 bis AK-209 grün
sind. Zurückgestellt bis P08: AK-205-01 und AK-205-02 (sie brauchen den Erinnerungslauf).

## 2. Voraussetzungen

- P00 abgenommen. Die Fachregeln von M02 brauchen M01 nicht, M01 und M02 dürfen deshalb parallel laufen (keine gemeinsamen
  Dateien). Die Testschnittstelle (Schritt 9) stellt aber die Uhr aus `src/domain/clock.ts`: Wird P01 nicht zuerst gemergt, lege
  `src/domain/clock.ts` in P02 nicht selbst an, sondern warte mit Schritt 9, bis P01 gemergt ist.
- Profil: Abschnitte 3 (Anmeldung, Rollen und Besitz, Persistenz, Transaktion), 5 (Umgebungsvariablen, Test-Login) und 7.
- Keycloak ist für die lokale Prüfung nicht nötig (Test-Login); der echte OIDC-Weg wird in CI mit dem Compose-Stack geprüft.

## 3. Eingaben

- Fach-Spec: `specs/M02-personen-und-zugang.md` (Regeln M02-R01 bis M02-R28, Abschnitt 5 Datenmodell, Abschnitt 6
  Schnittstellen, Abschnitt 8).
- Prüffälle: `specs/pruefung/M02.json`; Schnittstellen und Datenformate: `specs/pruefung/format.md`, „Schnittstellen von M02“;
  Testdaten `specs/pruefung/testdaten.json`.
- Code-Landkarte: `specs/code-landkarte.md`, Abschnitt „M02 Personen und Zugang“.
- Vorgaben: `.env.example` (Variablen `AUTH_*`), `keycloak/realm-berichtsheft.json` (Demo-Realm).

## 4. Weg A: aus dem Quellcode

Nur auf ausdrücklichen Auftrag. Lesereihenfolge: `src/domain/access.ts`, `src/domain/people.ts`, `src/domain/report-access.ts`,
`src/lib/people/service.ts`, danach der Plattformteil `src/auth.ts`, `src/lib/auth/config.ts`, `src/lib/auth/login.ts`,
`src/lib/auth/logout.ts`, `src/lib/session.ts`, `src/proxy.ts`, `src/app/(app)/ausbilder/personen/actions.ts`. Die
Domänenfunktionen sind 1:1 übertragbar. Belege: `src/domain/access.test.ts`, `src/domain/people.test.ts`,
`src/domain/report-access.test.ts`, `src/lib/auth/config.test.ts`, `tests/db/people.test.ts`.

## 5. Weg B: aus der Spec

Bau-Reihenfolge: (1) Datenmodell `Person` und `Setting` mit Schranken, (2) Zugang und Zuordnung beim Login, (3) Formular- und
Rollenregeln der Nutzerverwaltung, (4) Zugriffsprüfungen, (5) Personen-Service, (6) Anmeldung und Sitzung, (7) Seiten und
Serveraktionen, (8) Seed und Testschnittstelle, (9) Adapter und Browser-Tests. Zu jedem AK die Prüffälle:

| AK-ID | Kriterium (Kurzfassung aus der Fach-Spec) | Prüffälle | Prüffall-Datei |
| --- | --- | --- | --- |
| AK-101 | Anmeldung nur über das Firmenkonto; ein eigenes Passwort in der App gibt es nicht. | 3 (3 ablauf) | `specs/pruefung/M02.json` |
| AK-102 | Firmenkonto ohne Eintrag oder mit deaktivierter Person wird abgewiesen, mit dem Hinweis „Kein Zugang – bitte an den Ausbilder wenden“. | 9 (9 fachlogik) | `specs/pruefung/M02.json` |
| AK-103 | Ein Azubi sieht nur eigene Berichte; ein fremder Bericht ergibt „Zugriff verweigert“. | 3 (3 fachlogik) | `specs/pruefung/M02.json` |
| AK-104 | Ein Azubi erreicht keine Prüf- oder Admin-Funktionen, auch nicht per direkt eingegebener Adresse. | 4 (4 fachlogik) | `specs/pruefung/M02.json` |
| AK-105 | Jeder Ausbilder kann die Berichte aller Azubis ansehen. | 3 (3 fachlogik) | `specs/pruefung/M02.json` |
| AK-106 | Nach dem Abmelden ist ohne erneute Anmeldung kein Zugriff möglich. | 2 (2 ablauf) | `specs/pruefung/M02.json` |
| AK-201 | Admin legt eine Person mit Firmen-E-Mail, Name und Rolle an; erster Login bindet über die bestätigte E-Mail, danach zählt nur die Konto-ID. | 11 (11 fachlogik) | `specs/pruefung/M02.json` |
| AK-202 | Ein Azubi braucht zugeordneten Ausbilder und Ausbildungsbeginn; fehlt eines, nennt die Meldung das Feld. | 9 (9 fachlogik) | `specs/pruefung/M02.json` |
| AK-203 | Der Admin ändert Rolle, zugeordneten Ausbilder sowie Ausbildungsbeginn und -ende. Die Folgen für die Berichte regelt M03. | 7 (7 fachlogik) | `specs/pruefung/M02.json` |
| AK-204 | Entfernen deaktiviert: keine Anmeldung, Berichte für Ausbilder lesbar, nicht änderbar; wieder aktivieren, einen Azubi nur mit aktivem Ausbilder. | 10 (10 fachlogik) | `specs/pruefung/M02.json` |
| AK-205 | Deaktivierte Azubis erhalten keine Erinnerungen, und für sie entstehen keine neuen Wochenberichte. | 2 (1 fachlogik, 1 daten) | `specs/pruefung/M02.json` |
| AK-206 | Endgültiges Löschen nur nach ausdrücklicher Bestätigung; Person in fremder Historie nur deaktivierbar, „Deaktivieren“ wird angeboten. | 7 (7 fachlogik) | `specs/pruefung/M02.json` |
| AK-207 | Der letzte aktive Ausbilder wird weder deaktiviert, gelöscht noch herabgestuft; niemand deaktiviert, löscht sich selbst oder ändert die eigene Rolle. | 8 (8 fachlogik) | `specs/pruefung/M02.json` |
| AK-208 | Ausbilder mit zugeordneten Azubis erst nach Neuzuordnung deaktivierbar; fürs Löschen und Herabstufen zählen auch deaktivierte Azubis. | 5 (5 fachlogik) | `specs/pruefung/M02.json` |
| AK-209 | Der Admin kann das Bundesland der Firma für die Feiertage einstellen. | 5 (5 fachlogik) | `specs/pruefung/M02.json` |

AK-205 (Berichte entstehen nach Anlegen und Ausbildungsstart) und die Bundesland-Einstellung AK-209 schließen den Kreis zu M03
und M08: Die Wirkung auf Berichte und Erinnerung wird in P03 und P08 geprüft.

## 6. Empfehlung

**Weg B.** Die Regeln (Zugang, Zuordnung, Rollenwechsel, Löschen) sind in der Spec vollständig; der Plattformteil (Auth.js,
Sitzung, Proxy) folgt ohnehin dem Profil. Weg A nur auf ausdrücklichen Auftrag.

## 7. Schritte

1. **Branch** `claude/p02-personen-und-zugang`; Spec und Prüffälle lesen. Prüfschritt: AK-Tabelle aus Abschnitt 5 und die
   Abweichungsliste im PR-Entwurf angelegt.
2. **Datenmodell** in `prisma/schema.prisma`: `Person` (Rolle `TRAINEE`/`TRAINER`, `accountId` leer bis zum ersten Login und
   eindeutig, `email` klein geschrieben und eindeutig, `active`, `trainerId` mit `onDelete: NoAction`, `trainingStart`,
   `trainingEnd`, Kanäle und Darstellung folgen in P08 und P09), `Setting` (genau eine Zeile, `federalState`, Voreinstellung
   `NW`). Migration mit `prisma migrate dev --create-only`, dann von Hand ergänzen: Azubi braucht Ausbilder und Beginn (AK-202),
   Ende nach Beginn, nicht der eigene Ausbilder, Konto-ID nie leer (`person_account_id_not_blank`), E-Mail klein und ohne
   Rand-Leerzeichen (`person_email_normalized`), Einzeilen-Tabelle `setting`. Prüfschritt: `npm run db:migrate` läuft; ein
   `INSERT` eines Azubis ohne Ausbilder wird von der Datenbank abgewiesen.
3. **Zugang `src/domain/access.ts`** (M02-R03, M02-R07, M02-R08, AK-101, AK-102, AK-201): `decideAccess()`
   (nur angelegte, aktive Personen; `NO_ACCESS_MESSAGE`), `matchLogin()` (zuerst Konto-ID, sonst einmaliges Binden über die vom
   Anmeldedienst bestätigte E-Mail), `extractAccountId()`, `extractLoginClaims()`, `ClaimNames`, `homePathFor()`, `roleLabel()`,
   `RETURN_PARAM`, `safeReturnPath()` (nur Pfade innerhalb der App, gehört fachlich zu M08). Prüfschritt:
   `src/domain/access.test.ts`.
4. **Nutzerverwaltung `src/domain/people.ts`** (M02-R06, M02-R14 bis M02-R26, AK-201 bis AK-208): `validatePerson()`,
   `normalizeEmail()`, `isValidDate()`, `FIELD_LABELS`, `checkUpdate()`, `checkDeactivate()`, `checkReactivate()`,
   `isLastActiveTrainer()`, `assignedTrainees()`, `checkDelete()`, `confirmsName()`, `foreignHistoryMessage()`,
   `checkFederalStateSetting()` (nur Admin, nur eines der 16 Kürzel, AK-209). Ablehnungsgründe als feste Codes (`RuleReason`),
   unabhängig vom Meldungstext. Prüfschritt: `src/domain/people.test.ts`.
5. **Zugriff `src/domain/report-access.ts`** (M02-R09 bis M02-R12, AK-103, AK-104, AK-105, AK-204): `canViewReport()` (Azubi nur
   eigene, Ausbilder alle, deaktivierter Azubi bleibt lesbar), `canManagePeople()` (nur aktive Ausbilder), `Viewer`,
   `ACCESS_DENIED_MESSAGE`. `canEditReport()` kommt in P05 hinzu. Prüfschritt: `src/domain/report-access.test.ts`.
6. **Personen-Service `src/lib/people/service.ts`** (M02-R13, M02-R27, AK-201 bis AK-209): `createPerson()`, `updatePerson()`,
   `deactivatePerson()`, `reactivatePerson()`, `deletePerson()`, `updateFederalState()`, `getFederalState()`, `listPeople()`,
   `listActiveTrainees()`. Jede Funktion prüft die Rolle selbst (`canManagePeople()`), lädt den Personenstand **innerhalb** der
   serialisierbaren Transaktion und wiederholt bei `P2034` bzw. `TransactionWriteConflict` bis zu fünfmal (AK-207: zwei
   gleichzeitige Deaktivierungen lassen den letzten aktiven Ausbilder nicht durch). `hasForeignHistory()` ist eine Abfrage an
   die Historie und liefert bis P06 immer „nein“ (Platzhalter mit Test, der in P06 scharfgestellt wird); das Löschen weist die
   Datenbank zusätzlich per Fremdschlüssel ab, `deletePerson()` übersetzt den Fehler in dieselbe Meldung (AK-206). Prüfschritt:
   `tests/db/people.test.ts` (Name beginnt mit der AK-ID) einschließlich gleichzeitigem Deaktivieren.
7. **Anmeldung und Sitzung.**
   `src/lib/auth/config.ts` (`oidcConfig()` aus `AUTH_*`, `testLoginEnabled()` nie in Produktion,
   `toInternalUrl()`, `SESSION_MAX_AGE_SECONDS` = 8 Stunden), `src/auth.ts` (Provider OIDC mit Claims für Konto-ID und bestätigte
   E-Mail, Test-Login als Credentials-Provider, Callbacks `signIn`, `jwt`, `session`; Sitzung als JWT),
   `src/lib/auth/login.ts` (`resolveLoginPerson()`: Person zur Konto-ID bzw. E-Mail suchen, beim ersten Login **bedingt** binden
   mit `accountId: null, active: true`; ein gleichzeitiger zweiter Login liest danach die gebundene Person),
   `src/lib/auth/logout.ts` (`logout()`, `switchAccount()`, RP-initiated Logout beim Identity Provider),
   `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/session.ts` (`getCurrentPerson()`, `requirePerson()`: liest bei **jeder**
   Anfrage die Person aus der Datenbank; ohne Sitzung zur Anmeldung, ohne Zugang zum Hinweis, falsche Rolle zur eigenen
   Startseite), `src/proxy.ts` mit `src/lib/request-path.ts` (gibt den aufgerufenen Pfad als Rücksprungziel weiter, AK-1003).
   Prüfschritt: `src/lib/auth/config.test.ts` (Sitzung 8 Stunden, Test-Login in Produktion aus).
8. **Seiten und Serveraktionen.** Funktional, ohne Feinschliff (Rahmen und Gestaltung folgen in P09): `src/app/anmelden/page.tsx`
   (Anmeldeweg „Firmenkonto“ mit dem Merker `data-anmeldeweg`, Test-Login nur außerhalb von Produktion und nicht als Anmeldeweg
   gezählt), `src/app/kein-zugang/page.tsx` (AK-102), Startseiten je Rolle (`src/app/(app)/page.tsx` leitet nach Rolle um),
   `src/app/(app)/ausbilder/layout.tsx` (Rollenschranke), Personenverwaltung unter `src/app/(app)/ausbilder/personen/`
   (`page.tsx`, `neu/page.tsx`, `[id]/page.tsx`, `PersonForm.tsx`, `PersonActions.tsx`, `actions.ts` mit
   `createPersonAction()`, `updatePersonAction()`, `deactivatePersonAction()`, `reactivatePersonAction()`,
   `deletePersonAction()`, `updateSettingsAction()`), Einstellungen des Bundeslands unter
   `src/app/(app)/ausbilder/einstellungen/`. **Jede Serveraktion ruft selbst `canManagePeople()` auf**; das Ausblenden ist kein
   Schutz. Prüfschritt: Aufruf als Azubi (Test-Login) auf `/ausbilder/personen` leitet zur eigenen Startseite (AK-104).
9. **Seed und Testschnittstelle.** `prisma/seed.ts` legt Anna, Bernd und Clara aus `specs/pruefung/testdaten.json` an
   (idempotent) und stellt das Bundesland `NW` ein; Dora und Emil bleiben ohne Eintrag. `src/app/api/test/zustand/route.ts`
   (POST) stellt die Uhr, lädt die Testdaten und stellt den Ausgangsbestand; **nur** wenn `NODE_ENV` nicht `production` ist und
   der Test-Login an ist, sonst 404 (Q: „Prüfbarkeit“). Prüfschritt: `npm run db:seed` zweimal hintereinander ändert nichts
   Zweites; die Route antwortet in `next start` mit 404.
10. **Adapter und Runner.** `tests/pruefung/adapter.ts`: Schnittstellen `zugangPruefen`, `anmeldungZuordnen`, `personPruefen`,
    `aenderungPruefen`, `deaktivierenPruefen`, `reaktivierenPruefen`, `loeschenPruefen`, `namenBestaetigen`,
    `bundeslandEinstellen`, `darfBerichtSehen`, `darfVerwalten` (Formate: Person, Personenstand, Konto, Kandidat, Bericht,
    Formulardaten laut `format.md`). Ablauf-Adapter: `e2e/pruefung/ablauf-adapter.ts` mit den Aktionen `anmelden`, `abmelden`,
    `seite_aufrufen`, `seite_verlassen`, `seite_lesen` und den Seiten `anmelden`, `kein_zugang`, `start`; Ergebnisform
    `{ warnung, seite, angemeldet }`. Prüfschritt: `-t "M02.json"` im Fachlogik-Runner und im Ablauf-Runner grün (Chromium und
    375 px).
11. **Browser-Tests je AK.** Playwright-Dateien `e2e/ak-101-anmeldung.spec.ts`, `e2e/ak-102-kein-zugang.spec.ts`,
    `e2e/ak-103-105-berichte.spec.ts` (Berichte kommen mit P03; hier nur die Zugriffsfälle, die schon möglich sind),
    `e2e/ak-104-admin-gesperrt.spec.ts`, `e2e/ak-106-abmelden.spec.ts`, `e2e/ak-201-209-nutzerverwaltung.spec.ts`,
    `e2e/produktionsmodus.spec.ts` (kein Test-Login im Produktionsmodus). Testnamen beginnen mit der AK-ID. Prüfschritt:
    `E2E_LOGIN_MODE=test npm run test:e2e -- --project=chromium --project=smartphone-375 e2e/ak-1*.spec.ts e2e/ak-2*.spec.ts`.
12. **Bau-Stand.** M02 in die Liste der gebauten Module eintragen; AK-205-01 und AK-205-02 bleiben zurückgestellt (P08). Alles
    prüfen (Abschnitt 8).

## 8. Prüfung

| Befehl | Erwartet |
| --- | --- |
| `npx vitest run --project unit tests/pruefung/fachlogik.test.ts -t "M02.json"` | 82 Fälle, davon 81 grün (AK-205-01 zurückgestellt), kein roter |
| `npx vitest run --project db tests/pruefung/daten.test.ts -t "M02.json"` | AK-205-02 zurückgestellt bis P08 (keiner rot) |
| `npx vitest run --project db tests/db/people.test.ts` | grün, auch gleichzeitiges Deaktivieren (AK-207) |
| `E2E_LOGIN_MODE=test npm run test:e2e -- --project=chromium --project=smartphone-375` | alle Tests zu AK-101 bis AK-106 und AK-201 bis AK-209 und die Ablauf-Fälle AK-101-01, AK-101-02, AK-101-03, AK-106-01, AK-106-02 grün |
| `npm run lint && npm run format:check && npm run typecheck` | keine Fehler |
| `npx tsx scripts/playbooks/pruefen.ts` | „Playbook-Prüfung: keine Befunde.“ |

Nur in CI: echter OIDC-Login gegen Keycloak (`E2E_LOGIN_MODE=keycloak`, AK-101 mit Firmenkonto) und Firefox/Edge; im PR vermerken.

## 9. Abschluss

- Commit, z. B. „P02: Personen und Zugang (Anmeldung, Nutzerverwaltung)“; vor dem Push Lint, Format, Typecheck und Tests lokal grün.
- Draft-PR mit der AK-Tabelle (AK-101 bis AK-106, AK-201 bis AK-209 mit Test und Prüffällen), den zurückgestellten Fällen
  (AK-205-01, AK-205-02) und „Bitte bestätigen“. Hinweis: `src/auth.ts`, `src/proxy.ts`, `src/lib/auth/`,
  `src/domain/access.ts` und `src/domain/report-access.ts` sind geschützte Pfade (Chris gibt sie frei).
- Bericht an die Steuerung; `FORTSCHRITT.md` schreibt die Steuerung.

## 10. Typische Fehler

| Fehler | Was tun |
| --- | --- |
| Letzter aktiver Ausbilder lässt sich bei zwei gleichzeitigen Aktionen deaktivieren | Personenstand innerhalb der serialisierbaren Transaktion lesen, Konflikte (`P2034`, `TransactionWriteConflict`) wiederholen |
| Deaktivierte Person kommt noch hinein | `getCurrentPerson()` muss bei jeder Anfrage die Datenbank lesen; JWT-Sitzungen haben keinen Widerruf |
| Zweiter Login überschreibt die Konto-ID | Binden nur als bedingtes Update (`accountId: null, active: true`) |
| Groß/Klein in der E-Mail führt zu „unbekannt“ | E-Mail immer mit `normalizeEmail()` speichern, auch die aus den Claims; Abgleich ist Gleichheit |
| Test-Login in Produktion erreichbar | `testLoginEnabled()` und erneut in `authorize()` prüfen; `e2e/produktionsmodus.spec.ts` |
| Rolle nur in der Oberfläche geprüft | jede Serveraktion und jeder Route-Handler ruft `canManagePeople()` bzw. `canViewReport()` selbst auf |
| `matchLogin()` entscheidet über den Zugang | sie sagt nur, wer es ist; ob die Person hinein darf, entscheidet danach `decideAccess()` |

# Auftrag an die Entwickler-Sitzung: Etappe 1 – Grundgerüst

Du bist Entwickler der Berichtsheft-App im Repository `schoenechristopher96-lgtm/berichtsheft-app`. Lies zuerst `CLAUDE.md`, `docs/01-spezifikation.md` und `docs/02-plan.md`. Spezifikation und Plan sind freigegeben; setze sie um, ohne sie eigenmächtig zu ändern.

## Ziel

Etappe 1 aus dem Plan: ein lauffähiges Grundgerüst, das mit `docker compose up` startet, in dem man sich anmelden und abmelden kann und das in CI automatisch getestet wird.

## Umfang

1. **Projekt:** Next.js (App Router, TypeScript strict), Tailwind CSS, ESLint, Prettier, Vitest, Playwright. Ordnerstruktur mit `src/domain/` für Fachlogik und `src/domain/clock.ts` als Uhr-Modul.
2. **Datenbank:** Prisma mit dem vollständigen Datenmodell aus dem Plan (Person, Einstellung, Wochenbericht, Tag, Kommentar, Statuswechsel, Benachrichtigung), erste Migration. Die Datenbank weist UPDATE und DELETE auf Statuswechsel ab (Trigger), außer beim Löschen der Person per Kaskade.
3. **Docker Compose:** Dienste `app`, `worker` (vorerst nur Start und pg-boss-Verbindung), `db` (PostgreSQL 16), `keycloak` (Realm-Import mit Anna, Bernd, Clara), `mailpit`. `.env.example` mit allen Variablen.
4. **Seed:** Anna (Azubi, Beginn 01.09.2026, zugeordnet Bernd), Bernd (Ausbilder), Clara (Ausbilderin), Bundesland NW. Dieselben Konten im Keycloak-Realm.
5. **Login:** Auth.js mit OIDC gegen Keycloak. Zuordnung über die stabile Konto-ID (`sub`/`oid`), nicht über Namen. Konten ohne Eintrag oder deaktiviert werden mit „Kein Zugang – bitte an den Ausbilder wenden“ abgewiesen. Abmelden beendet die Sitzung. Nach dem Login eine einfache Startseite je Rolle (Platzhalter reicht).
6. **CI:** GitHub Actions: Lint, Typecheck, Vitest, dann `docker compose up` und Playwright gegen die laufende Demo.
7. **README:** Starten in drei Schritten, Testkonten, Links zu Mailpit und Keycloak.

## Akzeptanzkriterien dieser Etappe

- AK-101, AK-102, AK-106 – jeweils mit Playwright-Test, Name beginnt mit der AK-ID.
- Zusätzlich: Unit-Test, dass das Uhr-Modul in Tests fest einstellbar ist; DB-Test, dass ein Statuswechsel-Eintrag nicht geändert oder gelöscht werden kann (Vorbereitung AK-803).

## Arbeitsweise

- Branch `etappe-1-grundgeruest`, Draft-PR gegen `main`. PR-Beschreibung: abgedeckte AK-IDs, wie getestet, wie man lokal startet.
- Vor jedem Push lokal Lint, Typecheck und Tests grün. Danach den PR beobachten und CI-Fehler selbst beheben, bis alles grün ist.
- Hinweise zur Cloud-Umgebung (Docker-Dienst, gesperrte Registries) stehen in `CLAUDE.md`. Wenn Keycloak oder Mailpit in der Sitzung nicht ladbar sind, Login-Tests dort mit dem Dev-Provider ausführen und die echten Container nur in CI prüfen; im PR vermerken.
- Bei echten Unklarheiten in Spezifikation oder Plan: im PR fragen statt raten.

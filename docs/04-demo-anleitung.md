# Demo-Anleitung: Berichtsheft-App vorführen

Diese Anleitung richtet sich an alle, die die Demo selbst starten und vorführen möchten – ohne Vorwissen über die Technik. Die Vorführung dauert etwa 15 Minuten und folgt den Beispielszenarien aus der [Spezifikation](01-spezifikation.md#beispielszenarien).

## 1. Voraussetzungen

- Ein Rechner mit **Docker Desktop** (Windows, macOS) bzw. Docker Engine mit Docker Compose (Linux), mindestens 4 GB freier Arbeitsspeicher.
- Ein aktueller Browser: Microsoft Edge, Google Chrome oder Mozilla Firefox.
- Die Ports 3000 (App), 8080 (Anmeldung), 8025 und 1025 (E-Mail-Postfach) und 5432 (Datenbank) sind frei. Andere Ports lassen sich in einer `.env` einstellen (Vorlage `.env.example`).
- Für die Vorführung am besten **zwei Browserfenster** nebeneinander: ein normales und ein privates (Inkognito-)Fenster. So können zwei Personen gleichzeitig angemeldet sein, z. B. Anna und Bernd.

## 2. Starten, beenden, zurücksetzen

| Was | Befehl (im Ordner `berichtsheft-app`) |
| --- | --- |
| Starten (beim ersten Mal einige Minuten) | `docker compose up --build` |
| Beenden | `Strg+C` im Terminal, danach `docker compose down` |
| Auf den Anfangszustand zurücksetzen (löscht alle Eingaben) | `docker compose down -v`, danach wieder `docker compose up --build` |

Die App ist bereit, sobald im Terminal `[app] Starte Next.js …` erscheint und <http://localhost:3000> die Anmeldeseite zeigt. Vor jeder Vorführung empfiehlt sich ein Zurücksetzen, damit alle Testdaten im Anfangszustand sind.

## 3. Adressen

| Dienst | Adresse | Zugang |
| --- | --- | --- |
| Berichtsheft-App | <http://localhost:3000> | Testkonten unten |
| Keycloak (ersetzt in der Demo das Firmenkonto) | <http://localhost:8080> | Verwaltung: `admin` / `admin` (für die Vorführung nicht nötig) |
| Mailpit (fängt alle E-Mails ab, nichts geht nach außen) | <http://localhost:8025> | ohne Anmeldung |
| Teams-Postfach (Demo) | Menüpunkt „Teams-Postfach (Demo)“ in der App | angemeldet |

## 4. Testkonten

Nur Testdaten, keine echten Personen. Benutzername und Passwort sind jeweils gleich und werden auf der Anmeldeseite von Keycloak eingegeben („Mit Firmenkonto anmelden“).

| Konto | Passwort | Rolle in der App |
| --- | --- | --- |
| `anna` | `anna` | Azubi, Ausbildungsbeginn 01.09.2026, zugeordnet Bernd |
| `bernd` | `bernd` | Ausbilder (zugleich Admin), Annas zugeordneter Ausbilder |
| `clara` | `clara` | Ausbilderin (zugleich Admin), Vertretung |
| `dora` | `dora` | Firmenkonto ohne Eintrag in der App → „Kein Zugang – bitte an den Ausbilder wenden“ |
| `emil` | `emil` | Firmenkonto, das erst in der Vorführung angelegt wird |

Abmelden: Schaltfläche „Abmelden“ oben rechts. Um die Person zu wechseln, abmelden und mit dem anderen Konto anmelden – oder das zweite (private) Fenster nutzen.

## 5. Drehbuch (ca. 15 Minuten)

Annas Woche **KW 40/2026** (28.09.–02.10.2026) ist im Anfangszustand teilweise ausgefüllt (Montag bis Mittwoch) und eignet sich für den ganzen Ablauf.

### 5.1 Anna erfasst und reicht ein (3 Minuten)

1. Fenster 1: als `anna` anmelden. Die Übersicht „Meine Wochenberichte“ zeigt alle Wochen seit Ausbildungsbeginn; vergangene offene Wochen sind gelb hervorgehoben.
2. **KW 40/2026** öffnen. Jeder Tag hat eine Tagesart (Betrieb, Berufsschule, Urlaub, Krank, Feiertag) und das Feld „Tätigkeiten“.
3. Donnerstag: Tagesart „Betrieb“, Tätigkeiten z. B. „Arbeitsplätze vorbereitet“. Freitag: Tagesart leer lassen. Auf **„Einreichen“** klicken: Der Bericht wird **nicht** eingereicht, Freitag ist rot als „Tagesart fehlt“ markiert (Pflichtfelder werden geprüft).
4. Freitag: Tagesart „Urlaub“ (kein Text nötig). **„Speichern“**, dann **„Einreichen“** und im Dialog bestätigen. Status: „Eingereicht“, der Bericht ist jetzt schreibgeschützt.

Tipp: Beispielszenario „Einreichen scheitert an fehlendem Text“ – eine Woche mit Feiertag (z. B. KW 52 mit dem 25.12.) ist erst später in der Ausbildung vorhanden; dasselbe Verhalten zeigt Schritt 3.

### 5.2 Bernd lehnt mit Tageskommentar ab (2 Minuten)

1. Fenster 2 (privat): als `bernd` anmelden. Die **Glocke** oben zeigt eine ungelesene Benachrichtigung („Bericht eingereicht“).
2. Menü **„Prüfliste“** → Annas KW 40 öffnen.
3. Beim Mittwoch in „Kommentar zu Mittwoch … (optional)“ z. B. „Welche Themen genau?“ eintragen. Ohne Gesamtkommentar auf **„Ablehnen“** klicken: Meldung am Feld „Bitte einen Gesamtkommentar eingeben“.
4. Gesamtkommentar „Bitte die Berufsschule genauer beschreiben.“ eintragen, **„Ablehnen“** und bestätigen. Status: „Abgelehnt“.

### 5.3 Anna überarbeitet, Bernd gibt frei, PDF (3 Minuten)

1. Fenster 1 (Anna): Seite neu laden. Oben steht der Gesamtkommentar, beim Mittwoch der Tageskommentar; die Glocke zeigt die Ablehnung.
2. Mittwoch ergänzen (z. B. „Lernfeld 2: Aufbau eines PCs, Mainboard und Speicher“), **„Erneut einreichen“** und bestätigen.
3. Fenster 2 (Bernd): Prüfliste → Bericht öffnen → **„Freigeben“** und bestätigen. Angezeigt wird „Freigegeben von Bernd Ausbilder am …, … Uhr“.
4. **„Als PDF herunterladen“**: Das PDF enthält Name, Kalenderwoche, alle Tage und den Freigabevermerk.
5. Unten auf der Berichtsseite steht der **Verlauf** nach Prüfrunden: Einreichen, Ablehnung mit Kommentaren, erneutes Einreichen, Freigabe – jeweils mit Person und Zeitpunkt, nicht änderbar.

### 5.4 Clara nimmt die Freigabe als Vertretung zurück (2 Minuten)

Beispielszenario „Vertretung nimmt Freigabe zurück“.

1. Fenster 2: Bernd abmelden, als `clara` anmelden. Clara ist Anna **nicht** zugeordnet und hat deshalb keine Benachrichtigung bekommen – prüfen darf sie trotzdem.
2. Startseite → „Wochenberichte der Azubis“ → **Anna Azubi** → KW 40 öffnen.
3. „Begründung für die Rücknahme“: „Mittwoch falsches Datum“, **„Freigabe zurücknehmen“** und bestätigen. Status: „Abgelehnt“; der Verlauf zeigt Bernds Freigabe und Claras Rücknahme mit Begründung.
4. **„Als PDF herunterladen“**: Das neue PDF trägt keinen Freigabevermerk mehr, sondern „Nicht freigegeben – Status: Abgelehnt“.

### 5.5 Benachrichtigungen in Glocke und Mailpit (2 Minuten)

1. Fenster 1 (Anna): Seite neu laden – die Glocke zählt die neuen Benachrichtigungen. Glocke öffnen: Freigabe und Rücknahme stehen als „Neu“ in der Liste; mit „Zum Bericht“ geht es direkt zur Woche. Kommentare und Begründungen stehen bewusst nur im Bericht, nicht in der Nachricht.
2. <http://localhost:8025> (Mailpit) öffnen: Dieselben Nachrichten sind als E-Mail angekommen (an Bernd: „Bericht eingereicht“, an Anna: Ablehnung, Freigabe, Rücknahme). Die E-Mails gehen nicht nach außen.
3. Optional: Anna wählt unter **„Einstellungen“** zusätzlich „Teams“. Neue Nachrichten erscheinen dann im **„Teams-Postfach (Demo)“** – in der Demo ist Teams nur simuliert. Wer alle Kanäle abwählt, sieht einen Hinweis, dass dann auch keine Erinnerungen kommen.

### 5.6 Erinnerung am Montag um 9:00 Uhr (2 Minuten)

Beispielszenario „Erinnerung und Information an den Ausbilder“. Der Worker erinnert automatisch jeden Montag um 9:00 Uhr an offene Wochen. Für die Vorführung wird der Montags-Job von Hand ausgelöst und die **Uhr dafür auf einen Montag, 9:00 Uhr gestellt** – über die Umgebungsvariable `APP_FIXED_NOW` (nur für diesen einen Aufruf; die App selbst läuft mit der echten Uhrzeit weiter).

In einem zweiten Terminal im Ordner `berichtsheft-app`:

```bash
docker compose exec -e NODE_ENV=development -e APP_FIXED_NOW=2026-10-05T09:00:00+02:00 worker npm run erinnerung
```

- `APP_FIXED_NOW` ist der Stichtag im Format `JJJJ-MM-TTT09:00:00+02:00` (Sommerzeit) bzw. `+01:00` (Winterzeit). Am besten den **letzten Montag vor dem Vorführtag** wählen (oder heute, wenn Montag ist); das Beispiel oben ist Montag, 05.10.2026. Ein Montag in der Zukunft würde den Wochenbericht dieser Woche schon vorzeitig anlegen.
- `NODE_ENV=development` ist nötig, weil die gestellte Uhr im Produktionsmodus bewusst nicht wirkt.
- Mit installiertem Node.js 22 geht es auch ohne Docker-Befehl: `npm ci`, `cp .env.example .env`, dann `APP_FIXED_NOW=2026-10-05T09:00:00+02:00 npm run erinnerung`.

Ergebnis: Anna erhält **eine** Erinnerung, die alle ihre offenen Wochen nennt (Glocke und Mailpit). Weil im Anfangszustand auch ältere Wochen (ab KW 36) offen sind, wird zusätzlich **Bernd** als zugeordneter Ausbilder über die überfälligen Wochen informiert – Clara als Vertretung nicht. Ein zweiter Aufruf mit demselben Stichtag verschickt nichts doppelt; ein Aufruf mit dem Montag eine Woche später (sofern nicht in der Zukunft) erinnert erneut, solange die Wochen offen sind.

### 5.7 Nutzerverwaltung mit Emil (2 Minuten)

1. Fenster 2: als `bernd` (oder `clara`) angemeldet, Menü **„Personen“** → **„Person anlegen“**.
2. Name „Emil Neu“, Firmen-E-Mail `emil@berichtsheft.test`, Rolle „Azubi“. Ohne Ausbilder speichern: Die Meldung nennt das fehlende Feld. Dann „Zugeordneter Ausbilder“ Bernd und einen Ausbildungsbeginn (z. B. Montag der laufenden Woche) wählen und speichern. Emil ist „noch nie angemeldet“.
3. Fenster 1: abmelden, als `emil` anmelden. Der erste Login ordnet das Firmenkonto über die E-Mail zu; Emil sieht seine Wochenberichte ab Ausbildungsbeginn.
4. Fenster 2: Emil öffnen → **„Deaktivieren“**. Fenster 1: Emil abmelden und erneut anmelden → „Kein Zugang – bitte an den Ausbilder wenden“. (Dasselbe sieht `dora`, die gar nicht angelegt ist.) Mit „Wieder aktivieren“ hat Emil wieder Zugang.
5. Unter **„Einstellungen“** stellt der Ausbilder das Bundesland der Firma ein; es bestimmt die vorbelegten Feiertage neuer Wochen.

### 5.8 Smartphone (optional, 1 Minute)

Im Browser die Entwicklerwerkzeuge öffnen (`F12`) und die Geräteansicht wählen (z. B. 375 px Breite) oder die App im selben Netzwerk auf dem Smartphone aufrufen: Alle Funktionen sind ohne seitliches Scrollen bedienbar.

## 6. Bekannte Grenzen der Demo

- **Teams ist simuliert:** Nachrichten des Kanals „Teams“ landen im „Teams-Postfach (Demo)“ in der App. Die echte Anbindung über Microsoft Graph braucht den Firmen-Tenant und eine Freigabe der IT.
- **Keycloak statt Microsoft Entra ID:** Die Anmeldung läuft über dasselbe Verfahren (OpenID Connect) wie später mit dem Microsoft-Firmenkonto; ausgetauscht wird nur die Konfiguration.
- **E-Mails bleiben im Haus:** Mailpit fängt alle E-Mails ab; produktiv versendet Exchange Online.
- **Nur Testdaten:** Anna, Bernd, Clara, Dora und Emil sind erfundene Personen. Bitte keine echten Ausbildungsdaten in der Demo erfassen.
- **Lokaler Betrieb:** Die Demo läuft nur auf diesem Rechner, ohne HTTPS und ohne Datensicherung.

Wie die App in die Firmeninfrastruktur übernommen wird (Firmen-VM oder Azure, Entra ID, Exchange Online, Teams, Backup), beschreibt der Abschnitt [„Übernahme in die Firmeninfrastruktur“ im Plan](02-plan.md#übernahme-in-die-firmeninfrastruktur).

## 7. Wenn etwas nicht klappt

| Problem | Lösung |
| --- | --- |
| `port is already allocated` beim Start | Ein anderes Programm nutzt den Port. `.env.example` nach `.env` kopieren und z. B. `APP_PORT=3001` setzen (dann <http://localhost:3001>). |
| Anmeldung hängt oder meldet einen Fehler | Keycloak braucht nach dem Start bis zu einer Minute. Kurz warten, Seite neu laden. |
| Daten der letzten Vorführung stören | `docker compose down -v`, danach `docker compose up --build`. |
| Keine E-Mail in Mailpit | Der Worker versendet alle 5 Sekunden; kurz warten. Die Glocke in der App zeigt die Nachricht sofort. |

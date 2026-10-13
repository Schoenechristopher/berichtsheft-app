# Format der neutralen Prüffälle

Stand: 12.10.2026 · Status: **Entwurf zur Freigabe** (Etappe G1) · @Chris

Die Prüffälle sind der gemeinsame Maßstab aller Plattformen (`docs/06-spec-architektur.md`, „Neutrale Prüffälle“). Sie
liegen als JSON unter `specs/pruefung/`. Jede Plattform führt sie über einen eigenen Adapter aus. Diese Datei legt fest,
wie ein Prüffall aufgebaut ist und welche Begriffe er verwenden darf. Die Listen unten sind **abschließend**; eine
Erweiterung braucht die Freigabe von Chris.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `M01.json` … `M09.json`, `Q.json` | Prüffälle je Modul, als JSON-Liste von Prüffällen |
| `szenarien.json` | die Beispielszenarien aus `docs/01` als Abläufe (ab G3) |
| `testdaten.json` | gemeinsame Testdaten (Anna, Bernd, Clara, Dora, Emil); **keine** Prüffall-Datei |
| `upgrade/` | Datenbestand vor dem Upgrade und erwarteter Zustand danach (ab U) |

Jede JSON-Datei unter `specs/pruefung/` außer `testdaten.json` ist eine Prüffall-Datei und enthält eine Liste.

## Aufbau eines Prüffalls

| Feld | Pflicht | Inhalt |
| --- | --- | --- |
| `id` | ja | `<AK-ID>-<NN>`, z. B. `AK-1204-01`; eindeutig über alle Dateien |
| `modul` | ja | `M01` … `M09` oder `Q`; das Modul, dem die AK-ID gehört |
| `ebene` | ja | `fachlogik`, `ablauf`, `daten` oder `upgrade` |
| `beschreibung` | nein | ein Satz für Menschen; wird nicht ausgewertet |
| `uhr` | bei `ablauf` ja, sonst nein | Zeitpunkt, auf den die Uhr vor dem Fall gestellt wird. Ein Fachlogik-Fall ohne `uhr` hängt nicht von „jetzt“ ab |
| `schnittstelle` | bei `fachlogik` | Name einer Schnittstelle aus der Liste unten |
| `eingabe` | bei `fachlogik` | Parameter der Schnittstelle als Objekt |
| `schritte` | bei `ablauf` | Liste von Schritten `{ "als": <Person>, "aktion": <Aktion>, … }` (ab G3) |
| `erwartet` | ja | erwartetes Ergebnis als Objekt; bei einem Fehler `{ "fehler": "<Fehlercode>" }` |
| `abweichend` | nein | `{ "<plattform>": "<Verweis auf den Abschnitt im freigegebenen Profil>" }`, siehe „Abweichend, begründet“ |

Das Ergebnis wird als Ganzes verglichen: Das Objekt, das der Adapter liefert, muss genau `erwartet` entsprechen (gleiche
Felder, gleiche Werte; Listen in derselben Reihenfolge).

**Wichtig:** Das Feld `"id"` steht nur auf der Ebene des Prüffalls, nie verschachtelt (auch nicht in `eingabe`,
`erwartet` oder `schritte`) und nie in `testdaten.json`. `prueffallIds()` in
`scripts/merge-kriterien/merge-kriterien.mjs` liest die IDs per Regex aus dem Text und würde ein verschachteltes `"id"`
als Prüffall zählen.

### Beispiel

```json
{
  "id": "AK-404-02",
  "modul": "M01",
  "ebene": "fachlogik",
  "schnittstelle": "istFeiertag",
  "eingabe": { "bundesland": "NI", "datum": "2027-05-27" },
  "erwartet": { "feiertag": false }
}
```

## ID-Schema

- `<AK-ID>-<NN>`: AK-ID aus `docs/01-spezifikation.md` (z. B. `AK-1204`) oder UI-AK-ID aus
  `docs/05-ui-spezifikation.md` (z. B. `UI-AK-14`), dahinter eine zweistellige laufende Nummer ab `01`.
- Die AK-ID muss in der Spezifikation stehen und in der Tabelle „Akzeptanzkriterien“ der Fach-Spec des angegebenen
  `modul` (`specs/Mxx-*.md`).
- `npm run ak:abdeckung` prüft das und zählt jeden Prüffall als Test der Ebene „Prüffall“.

## Datenformate

| Art | Format | Beispiel |
| --- | --- | --- |
| Kalendertag | `JJJJ-MM-TT` | `2026-12-25` |
| Zeitpunkt | ISO 8601 mit Offset, in `erwartet` immer in Berliner Ortszeit | `2026-10-12T09:00:00+02:00` |
| Woche | ISO-Woche `JJJJ-Www` | `2026-W53` |
| Jahr, Wochennummer | ganze Zahl | `2027`, `53` |
| Wochentag | `Mo`, `Di`, `Mi`, `Do`, `Fr`, `Sa`, `So` | `Di` |
| Bundesland | Kürzel aus AK-1205 | `NW` |
| Wahrheitswert | `true` / `false` | `false` |

Ein Prüffall mit einer Eingabe, die nicht diesem Format folgt, ist fehlerhaft: Der Runner scheitert an ihm. Ein
Fehlercode beschreibt dagegen eine fachlich abgewiesene Eingabe im richtigen Format (z. B. KW 53/2027).

## Schnittstellen von M01 (Fachlogik)

Die Signaturen stehen in `specs/M01-kalender-und-zeit.md`, Abschnitt 6.

| Schnittstelle | `eingabe` | `erwartet` (Erfolg) | Fehlercodes |
| --- | --- | --- | --- |
| `jetzt` | `{}` | `{ "zeitpunkt": <Zeitpunkt> }` | – |
| `uhrVorgeben` | `{ "zeitpunkt": <Text>, "betrieb": "test" \| "produktiv" }` | `{ "gestellt": <Wahrheitswert> }` | `zeitpunkt_ungueltig` |
| `kalendertag` | `{ "zeitpunkt": <Zeitpunkt> }` | `{ "datum": <Kalendertag>, "wochentag": <Wochentag> }` | – |
| `isoWoche` | `{ "datum": <Kalendertag> }` | `{ "woche": <Woche> }` | – |
| `montagDerWoche` | `{ "jahr": <Jahr>, "woche": <Wochennummer> }` | `{ "datum": <Kalendertag> }` | `woche_ungueltig` |
| `arbeitstage` | `{ "jahr": <Jahr>, "woche": <Wochennummer> }` | `{ "tage": [<Kalendertag> × 5] }` | `woche_ungueltig` |
| `naechsteWoche` | `{ "woche": <Woche> }` | `{ "woche": <Woche> }` | `woche_ungueltig` |
| `vergleicheWochen` | `{ "a": <Woche>, "b": <Woche> }` | `{ "ergebnis": "frueher" \| "gleich" \| "spaeter" }` (a gegenüber b) | – |
| `aktuelleWoche` | `{ "zeitpunkt": <Zeitpunkt> }` | `{ "woche": <Woche> }` | – |
| `bundeslaender` | `{}` | `{ "bundeslaender": [<Bundesland> × 16] }` | – |
| `istBundesland` | `{ "kuerzel": <Text> }` | `{ "bundesland": <Wahrheitswert> }` | – |
| `istFeiertag` | `{ "bundesland": <Text>, "datum": <Kalendertag> }` | `{ "feiertag": <Wahrheitswert> }` | `bundesland_unbekannt` |
| `feiertage` | `{ "bundesland": <Text>, "jahr": <Jahr> }` | `{ "feiertage": [<Kalendertag>, …] }` aufsteigend, alle Tage des Jahres (auch Sonntage, z. B. Ostersonntag in BB) | `bundesland_unbekannt` |

`uhrVorgeben` bildet die Vorgabe eines festen Zeitpunkts über die Konfiguration nach (TypeScript: `APP_FIXED_NOW`).
`betrieb` sagt, ob die Plattform im Produktivbetrieb läuft. `gestellt` ist `true`, wenn „jetzt“ danach den vorgegebenen
Zeitpunkt liefert.

## Schnittstellen von M02 (Fachlogik)

Die Signaturen stehen in `specs/M02-personen-und-zugang.md`, Abschnitt 6. Personen werden über ihren `schluessel` aus
`testdaten.json` benannt (`anna`, `bernd`, `clara`, `dora`, `emil`); weitere Schlüssel sind erlaubt, z. B. ein
unbekannter Ausbilder.

**Datenformate von M02:**

| Art | Format | Beispiel |
| --- | --- | --- |
| Rolle | `azubi` oder `ausbilder` | `azubi` |
| Person | `{ "schluessel": <Text>, "rolle": <Rolle>, "aktiv": <Wahrheitswert> }` | `{ "schluessel": "anna", "rolle": "azubi", "aktiv": true }` |
| Personenstand | Liste von `{ "schluessel", "name", "rolle", "aktiv", "ausbilder": <Schlüssel> \| null }`; `ausbilder` nur bei Azubis | alle Personen mit Rolle, Zustand und Zuordnung |
| Konto | `{ "kontoId": <Text> \| null, "email": <Text> \| null, "emailBestaetigt": <Wahrheitswert> }` | Angaben des Anmeldedienstes beim Login |
| Kandidat | `{ "schluessel": <Text>, "kontoId": <Text> \| null, "aktiv": <Wahrheitswert> }` oder `null` | Person, die über Konto-ID bzw. E-Mail gefunden wurde |
| Bericht | `{ "azubi": <Schlüssel>, "azubiAktiv": <Wahrheitswert> }` | Ausschnitt eines Berichts für die Zugriffsprüfung |
| Formulardaten | `{ "name", "email", "rolle", "ausbilder", "ausbildungsbeginn", "ausbildungsende" }`, jeweils Text; fehlendes Feld = leer | Eingabe des Admins, noch ungeprüft; `rolle` darf hier jeder Text sein |

| Schnittstelle | `eingabe` | `erwartet` (Erfolg) | Fehlercodes |
| --- | --- | --- | --- |
| `zugangPruefen` | `{ "person": <Person> \| null }` (`null` = Firmenkonto ohne Person) | `{ "zugang": true }` | `konto_unbekannt`, `person_deaktiviert` |
| `anmeldungZuordnen` | `{ "konto": <Konto>, "ueberKontoId": <Kandidat>, "ueberEmail": <Kandidat> }` | `{ "zuordnung": "bekannt", "person": <Schlüssel> }`, `{ "zuordnung": "binden", "person": <Schlüssel>, "kontoId": <Text> }` oder `{ "zuordnung": "keine" }` | – |
| `darfBerichtSehen` | `{ "person": <Person>, "bericht": <Bericht> }` | `{ "erlaubt": true }` | `zugriff_verweigert` |
| `darfVerwalten` | `{ "person": <Person> \| null }` (`null` = nicht angemeldet) | `{ "erlaubt": true }` | `zugriff_verweigert` |
| `personPruefen` | `{ "daten": <Formulardaten>, "personen": <Personenstand>, "ziel": <Schlüssel> }`; `ziel` nur beim Ändern, die Person steht dann im Personenstand | `{ "person": { "name", "email", "rolle", "ausbilder", "ausbildungsbeginn", "ausbildungsende" } }`, leere Felder als `null` | `eingabe_ungueltig` mit `"felder"` |
| `aenderungPruefen` | `{ "personen": <Personenstand>, "ziel": <Schlüssel>, "handelnd": <Schlüssel>, "rolle": <Rolle> }` (neue Rolle) | `{ "erlaubt": true }` | `letzter_ausbilder`, `azubis_zugeordnet`, `eigene_person` |
| `deaktivierenPruefen` | `{ "personen": <Personenstand>, "ziel": <Schlüssel>, "handelnd": <Schlüssel> }` | `{ "erlaubt": true }` | `bereits_deaktiviert`, `letzter_ausbilder`, `azubis_zugeordnet`, `eigene_person` |
| `reaktivierenPruefen` | `{ "personen": <Personenstand>, "ziel": <Schlüssel> }` | `{ "erlaubt": true }` | `bereits_aktiv`, `ausbilder_deaktiviert` |
| `loeschenPruefen` | `{ "personen": <Personenstand>, "ziel": <Schlüssel>, "handelnd": <Schlüssel>, "fremdeHistorie": <Wahrheitswert> }` | `{ "erlaubt": true }` | `letzter_ausbilder`, `azubis_zugeordnet`, `eigene_person`, `fremde_historie` (mit `"deaktivierenAnbieten": true`, wenn die Person aktiv ist) |
| `namenBestaetigen` | `{ "eingabe": <Text>, "name": <Text> }` | `{ "bestaetigt": <Wahrheitswert> }` | – |
| `bundeslandEinstellen` | `{ "person": <Person> \| null, "bundesland": <Text> }` | `{ "bundesland": <Bundesland> }` | `zugriff_verweigert`, `bundesland_unbekannt` |

**Fehlerergebnis mit Zusatzfeldern:** Bei `eingabe_ungueltig` nennt `"felder"` die betroffenen Felder der Formulardaten
in der Reihenfolge `name`, `email`, `rolle`, `ausbilder`, `ausbildungsbeginn`, `ausbildungsende`, z. B.
`{ "fehler": "eingabe_ungueltig", "felder": ["ausbilder", "ausbildungsbeginn"] }`. Bei `fremde_historie` steht
`"deaktivierenAnbieten": true`, wenn die Person noch aktiv ist. Sonst trägt ein Fehlerergebnis nur `"fehler"`.

**Fehlercodes von M02:**

| Code | Bedeutung | AK |
| --- | --- | --- |
| `konto_unbekannt` | Zum Firmenkonto gibt es keine Person. | AK-102 |
| `person_deaktiviert` | Die Person ist deaktiviert. | AK-102, AK-204 |
| `zugriff_verweigert` | Die Person darf das nicht sehen oder tun (Rolle, Besitz, deaktiviert). | AK-103, AK-104, AK-209 |
| `eingabe_ungueltig` | Formulardaten einer Person verletzen eine Pflicht- oder Formatregel; `"felder"` nennt die Felder. | AK-201 bis AK-203 |
| `bereits_deaktiviert` | Die Person ist schon deaktiviert. | AK-204 |
| `bereits_aktiv` | Die Person ist schon aktiv. | AK-204 |
| `ausbilder_deaktiviert` | Der zugeordnete Ausbilder des Azubis ist deaktiviert; er wird nicht wieder aktiviert. | AK-204 |
| `fremde_historie` | Die Person kommt in der Historie von Berichten anderer Azubis vor; nur deaktivierbar. | AK-206 |
| `letzter_ausbilder` | Die Person ist der letzte aktive Ausbilder. | AK-207 |
| `eigene_person` | Die handelnde Person würde sich selbst deaktivieren, löschen oder die eigene Rolle ändern. | AK-207 |
| `azubis_zugeordnet` | Dem Ausbilder sind noch Azubis zugeordnet (fürs Deaktivieren nur aktive). | AK-208 |

`bundesland_unbekannt` ist der Fehlercode aus M01 (AK-1205).

## Schnittstellen von M03 (Fachlogik)

Die Signaturen stehen in `specs/M03-wochenberichte-entstehen.md`, Abschnitt 6. Zusätzliche Datenformate:

| Art | Format | Beispiel |
| --- | --- | --- |
| Status | `Entwurf`, `Eingereicht`, `Freigegeben`, `Abgelehnt` (Statusmodell in `docs/01`) | `Abgelehnt` |
| Tagesart | `Betrieb`, `Berufsschule`, `Urlaub`, `Krank`, `Feiertag`; keine Tagesart: `null` | `Feiertag` |
| Ausbildungszeitraum | `beginn` Kalendertag, `ende` Kalendertag oder `null` (kein Ende eingetragen) | `"ende": null` |

| Schnittstelle | `eingabe` | `erwartet` (Erfolg) | Fehlercodes |
| --- | --- | --- | --- |
| `faelligeWochen` | `{ "beginn", "ende" }`; der Fall nennt `uhr` | `{ "wochen": [<Woche>, …] }` aufsteigend | – |
| `berichtstageAnlegen` | `{ "woche": <Woche>, "beginn", "ende", "bundesland": <Bundesland> }` | `{ "tage": [{ "datum": <Kalendertag>, "tag": <Wochentag>, "tagesart": <Tagesart> \| null, "ausserhalb": <Wahrheitswert> } × 5] }` | `woche_ungueltig`, `bundesland_unbekannt` |
| `ausserhalbNeuBerechnen` | `{ "tage": [{ "datum", "tagesart", "ausserhalb" }, …], "beginn", "ende", "bundesland" }` | `{ "aenderungen": [{ "datum", "ausserhalb", "tagesart"? }, …] }` nur geänderte Tage; `tagesart` nur, wenn sie vorbelegt wird | `bundesland_unbekannt` |
| `istOffen` | `{ "status": <Status> }` | `{ "offen": <Wahrheitswert> }` | – |
| `wocheEinordnen` | `{ "woche", "status", "inhalt": <Wahrheitswert>, "historie": <Wahrheitswert>, "beginn", "ende" }`; der Fall nennt `uhr` | `{ "ausgeblendet", "ausserhalb", "offen", "vergangenOffen" }` (je Wahrheitswert) | – |

`inhalt` heißt: Mindestens ein Tag hat eine Tagesart oder einen Text. `historie` heißt: Es gibt mindestens einen
Statuswechsel.

## Schnittstellen von M04 (Fachlogik)

Die Signaturen stehen in `specs/M04-bericht-erfassen.md`, Abschnitt 6. Status und Tagesart wie bei M03; Tage eines
Berichts werden mit ihrem Wochentag `Mo` bis `Fr` benannt.

| Schnittstelle | `eingabe` | `erwartet` (Erfolg) | Fehlercodes |
| --- | --- | --- | --- |
| `tagesarten` | `{}` | `{ "tagesarten": [<Tagesart> × 5] }` in fester Reihenfolge | – |
| `tageSpeichern` | `{ "tage": [{ "tag", "ausserhalb", "tagesart", "text" }, …], "eingaben": [{ "tag", "tagesart": <Text> \| "" \| null, "text": <Text> \| null }, …] }` | `{ "aenderungen": [{ "tag", "tagesart": <Tagesart> \| null, "text" }, …] }` nur Tage, deren Werte sich ändern | `tage_ungueltig` mit `"tage": [{ "tag", "fehler": [<Code>, …] }]` |

`tage` ist der gespeicherte Stand, `eingaben` das, was der Azubi abschickt. In `eingaben` heißt `null` „nicht
mitgeschickt, bleibt unverändert“, `""` bei der Tagesart „geleert“. Eine Tagesart, die keine der fünf ist, gibt der
Adapter unverändert an die Plattform weiter, die sie abweisen muss. Bei `tage_ungueltig` wird nichts gespeichert; je
betroffenem Tag stehen die Codes in der Reihenfolge `tagesart_unbekannt`, `text_zu_lang`.

**Fehlercodes von M04:**

| Code | Bedeutung | AK |
| --- | --- | --- |
| `tage_ungueltig` | Mindestens ein Tag hat eine ungültige Eingabe; nichts wird gespeichert. Die Codes je Tag folgen. | AK-402, AK-407 |
| `tagesart_unbekannt` | Die Tagesart ist keine der fünf (je Tag in `tage_ungueltig`). | AK-402 |
| `text_zu_lang` | „Tätigkeiten“ hat mehr als 5.000 Zeichen (je Tag in `tage_ungueltig`). | AK-407 |

## Fehlercodes

| Code | Bedeutung | AK |
| --- | --- | --- |
| `woche_ungueltig` | Die Woche gibt es nicht (KW 0, KW 53 in einem Jahr mit 52 Wochen, über 53). | AK-1204 |
| `bundesland_unbekannt` | Das Kürzel ist keines der 16 Bundesländer. | AK-1205 |
| `zeitpunkt_ungueltig` | Der Zeitpunkt lässt sich nicht lesen. | AK-1201 |

## Aktionen und Status

Aktionen (`schritte[].aktion`) und Status kommen mit den Ablauf-Prüffällen in G3 dazu. Bis dahin legt `docs/01`
fest:

- **Status:** `Entwurf`, `Eingereicht`, `Freigegeben`, `Abgelehnt` (Statusmodell in `docs/01`).
- **Aktionen:** werden mit G2 (M04, M05) aus den Statusübergängen in `docs/01` abgeleitet und hier abschließend
  aufgezählt.

## Regeln für Adapter

- **Übersetzen ja, umdeuten nein:** Ein Adapter bildet eine neutrale Schnittstelle auf die Funktionen der Plattform ab
  und wandelt Ein- und Ausgabeformate um (z. B. `2026-W53` in Jahr und Woche, ein Datum der Plattform in
  `JJJJ-MM-TT`). Er ändert kein Ergebnis, rechnet nichts nach und ergänzt keine Fachlogik.
- **Fehler:** Ein fachlicher Fehler der Plattform wird als `{ "fehler": "<code>" }` geliefert, mit einem Code aus der
  Liste oben. Die Zuordnung Fehler → Code erfolgt über die Fehlerart der Plattform, nicht über den Meldungstext. Jeder
  andere Fehler lässt den Fall scheitern.
- **Uhr:** Nennt ein Fall `uhr`, stellt der Runner die Uhr der Plattform vor dem Fall darauf und danach zurück.
- **Kein stilles Überspringen:** Eine unbekannte Schnittstelle, eine Ebene ohne Runner oder ein fehlerhafter Prüffall
  lassen den Runner scheitern. Es gibt kein Auslassen ohne Markierung.

## Abweichend, begründet

Erfüllt eine Plattform eine Regel bewusst anders (z. B. Anmeldung mit Liferay-Konten), steht das im Profil der
Plattform (`profile/<plattform>.md`), und der Fall trägt `"abweichend": { "<plattform>": "<Verweis>" }`.

- Ein solcher Fall zählt für das Fertig-Kriterium als erfüllt, wenn Chris die Abweichung im Profil freigegeben hat
  (Entscheidung 12.10.2026).
- Berichte weisen ihn getrennt aus („abweichend, begründet“), nie als grün.
- Die TypeScript-App ist die Referenz und hat keine Abweichungen: Der TypeScript-Runner scheitert an einem Fall mit
  `abweichend.typescript`.

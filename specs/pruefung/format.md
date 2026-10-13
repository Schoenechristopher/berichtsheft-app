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
| `uhr` | bei `ablauf` und `daten` ja, sonst nein | Zeitpunkt, auf den die Uhr vor dem Fall gestellt wird. Ein Fachlogik-Fall ohne `uhr` hängt nicht von „jetzt“ ab |
| `schnittstelle` | bei `fachlogik` | Name einer Schnittstelle aus der Liste unten |
| `eingabe` | bei `fachlogik` | Parameter der Schnittstelle als Objekt |
| `ausgangsbestand` | nein, nur bei `daten` | fallbezogene Ergänzungen zu den Testdaten, siehe „Aufbau eines Daten-Falls“ |
| `schritte` | bei `ablauf` und `daten` | Liste von Schritten `{ "als": <Person>, "aktion": <Aktion>, … }` (Ablauf ab G3) |
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

## Aufbau eines Daten-Falls

Ein Fall der Ebene `daten` prüft eine Regel am gespeicherten Bestand: Er stellt einen Ausgangsbestand her, lässt
Personen Aktionen ausführen und vergleicht die Ergebnisse der Aktionen und den Bestand danach. Er nennt keine Tabelle,
Spalte oder technische Kennung; der Adapter der Plattform übersetzt.

**Ausgangsbestand** (in dieser Reihenfolge hergestellt):

1. Die Datenhaltung ist leer. Geladen werden die Testdaten aus `testdaten.json`: alle Personen mit `"angelegt": true`
   und das Bundesland.
2. `ausgangsbestand.personen` (optional): weitere Personen für diesen Fall, je
   `{ "schluessel", "name", "rolle" }`, bei `azubi` zusätzlich `"ausbilder": <Schlüssel>` und
   `"ausbildungsbeginn": <Kalendertag>`, optional `"ausbildungsende"`. Die E-Mail ergänzt der Adapter.
3. Die Uhr steht auf `uhr`. Für jeden Azubi entstehen die Berichte wie in M03 (alle fälligen Wochen bis „jetzt“, Tage
   außerhalb markiert, Feiertage vorbelegt).
4. `ausgangsbestand.berichte` (optional), je Bericht `{ "azubi", "woche", "tage"?, "verlauf"? }`:
   - `tage`: Eingaben wie bei der Aktion `tage_speichern`, gespeichert vom Azubi selbst;
   - `verlauf`: Liste von Schritten (ohne `azubi`, `woche` und `gesehen`), die diesen Bericht in seinen Ausgangsstatus
     bringen, z. B. einreichen und freigeben. Sie stehen danach in der Historie.

   Gelingt eine dieser Eingaben oder einer dieser Schritte nicht, ist der Fall fehlerhaft.

**Schritte:** `schritte` ist eine nicht leere Liste `{ "als": <Schlüssel>, "aktion": <Aktion>, … }`, ausgeführt in
dieser Reihenfolge. Die Aktionen und ihre Felder stehen beim Modul (für M05 in „Schnittstellen und Aktionen von M05“).
Für alle Schritte gilt:

- `als` ist die handelnde Person; die Plattform prüft ihre Rechte mit ihrem aktuellen Stand (Rolle, aktiv).
- `azubi` und `woche` benennen einen Bericht. Gibt es ihn nicht, ist der Fall fehlerhaft.
- `uhr` (optional) stellt die Uhr vor dem Schritt; sie bleibt danach auf diesem Zeitpunkt. Auch Schritte im `verlauf`
  dürfen `uhr` tragen.
- `gesehen` (optional, nur bei Statuswechseln) ist eine Schrittnummer `n`: Die Person handelt auf dem Stand des
  Berichts, wie er nach Schritt `n` war (`0` = Ausgangsbestand). So werden konkurrierende Änderungen deterministisch
  nachgestellt, z. B. zwei Personen auf demselben Stand. Ohne `gesehen` prüft die Plattform nur gegen den aktuellen
  Stand.
- Ein Feld, das die Aktion nicht kennt, und ein fehlendes Pflichtfeld machen den Fall fehlerhaft.

**Erwartet:** `{ "ergebnisse": [ … ], "berichte": [ … ] }`.

- `ergebnisse`: je Schritt das Ergebnis der Aktion, in derselben Reihenfolge; ein fachlicher Fehler als
  `{ "fehler": "<Code>" }` (ggf. mit Zusatzfeldern). Ein Fehlschlag ändert nichts am Bestand.
- `berichte`: der Bestand aller Berichte, die der Fall nennt (im Ausgangsbestand oder in einem Schritt), in der
  Reihenfolge ihrer ersten Nennung, je Bericht:

| Feld | Inhalt |
| --- | --- |
| `azubi`, `woche` | Schlüssel des Azubis, Woche |
| `status` | Status (M03) |
| `tage` | `[{ "tag": <Wochentag>, "tagesart": <Tagesart> \| null, "text": <Text> } × 5]`, Mo bis Fr |
| `historie` | alle Statuswechsel in ihrer Reihenfolge: `{ "von": <Status>, "nach": <Status>, "person": <Schlüssel>, "zeitpunkt": <Zeitpunkt>, "runde": <Zahl>, "begruendung": <Text> \| null }` |
| `kommentare` | alle Kommentare: `{ "runde": <Zahl>, "tag": <Wochentag> \| null, "person": <Schlüssel>, "text": <Text> }`; je Runde zuerst der Gesamtkommentar (`tag` = `null`), dann die Tage Mo bis Fr |

Der Bestand wird nur gelesen, nicht bewertet: Der Adapter liefert, was gespeichert ist. Einen Versionsstand nennt ein
Daten-Fall nie; ob ein gesehener Stand veraltet ist, entscheidet die Plattform. Gleichzeitige Zeitpunkte ordnet die
Plattform nicht verlässlich; ein Fall, der eine Reihenfolge nach Zeitpunkt erwartet, gibt seinen Schritten
verschiedene `uhr`.

**Beispiel** (AK-508: Anna zieht zurück, während Bernd den eingereichten Stand offen hat):

```json
{
  "id": "AK-508-01",
  "modul": "M05",
  "ebene": "daten",
  "uhr": "2026-10-06T10:00:00+02:00",
  "ausgangsbestand": {
    "berichte": [
      {
        "azubi": "anna",
        "woche": "2026-W40",
        "tage": { "alle": { "tagesart": "Betrieb", "text": "Netzwerk geplant" } },
        "verlauf": [{ "als": "anna", "aktion": "einreichen" }]
      }
    ]
  },
  "schritte": [
    { "als": "anna", "aktion": "zurueckziehen", "azubi": "anna", "woche": "2026-W40", "gesehen": 0 },
    { "als": "bernd", "aktion": "freigeben", "azubi": "anna", "woche": "2026-W40", "gesehen": 0 }
  ],
  "erwartet": {
    "ergebnisse": [{ "status": "Entwurf" }, { "fehler": "bericht_zurueckgezogen" }],
    "berichte": [{ "azubi": "anna", "woche": "2026-W40", "status": "Entwurf", "tage": ["…"], "historie": ["…"], "kommentare": [] }]
  }
}
```

(`"…"` steht hier abgekürzt für die vollständigen Listen; ein echter Fall nennt sie ganz.)

## Aufbau eines Ablauf-Falls

Ein Fall der Ebene `ablauf` prüft, was Personen in der laufenden App im Browser erleben: Er stellt einen
Ausgangsbestand her, lässt Personen fachliche Aktionen ausführen und vergleicht je Schritt, was die Oberfläche zeigt.
Er nennt keine Adresse, keinen Knopftext und keine Meldung; der Adapter der Plattform übersetzt die Aktionen in Klicks
und liest das Ergebnis über feste Merker der Oberfläche (Codes, Status, Woche), nicht über Meldungstexte.

**Ausgangsbestand** (vor jedem Fall neu hergestellt; kein Fall hängt von einem anderen ab):

1. Die Uhr der laufenden App steht auf `uhr` (Pflicht), in Seiten und Aktionen gleichermaßen.
2. Die Datenhaltung ist leer. Geladen werden die Testdaten aus `testdaten.json` (alle Personen mit
   `"angelegt": true` und das Bundesland); für jeden Azubi entstehen die Berichte wie in M03 bis „jetzt“.
3. `ausgangsbestand` (optional) wie bei Daten-Fällen (`personen`, `berichte`), siehe „Aufbau eines Daten-Falls“.
4. Niemand ist angemeldet. Jede Person (`als`) hat einen eigenen Browser mit eigener Sitzung, der sich bei ihrem
   ersten Schritt öffnet.

Nach dem Fall stellt der Runner die Uhr zurück. Werkzeuge, mit denen der Runner Uhr und Bestand stellt (bei TypeScript
die Testschnittstelle und der Test-Login), gibt es im Produktionsbetrieb nicht.

**Seiten** werden neutral benannt, nie über ihre Adresse:

| Seite | Inhalt |
| --- | --- |
| `anmelden` | Anmeldeseite |
| `kein_zugang` | Hinweis „Kein Zugang“ (AK-102) |
| `start` | Startseite der eigenen Rolle |
| `wochen` | „Meine Wochen“ eines Azubis |
| `bericht` | ein Wochenbericht; benannt mit `azubi` und `woche` |
| `pruefliste` | Prüfliste der Ausbilder |

**Schritte:** `schritte` ist eine nicht leere Liste `{ "als": <Schlüssel>, "aktion": <Aktion>, … }`, ausgeführt in
dieser Reihenfolge. `uhr` (optional) stellt die Uhr vor dem Schritt; sie bleibt danach auf diesem Zeitpunkt. Ein Feld,
das die Aktion nicht kennt, ein fehlendes Pflichtfeld, eine unbekannte Aktion und ein Bericht, den es nicht gibt,
machen den Fall fehlerhaft.

**Aktionen der Ablauf-Fälle** (Felder außer `aktion`; `?` = optional):

| Aktion | Felder | Ergebnis | Bedeutung |
| --- | --- | --- | --- |
| `anmelden` | `als` | Seiten-Ergebnis | Die Person meldet sich an, wie sie es in der App kann, bis eine Seite erscheint. |
| `abmelden` | `als`, `dialog?` | Seiten-Ergebnis | über „Abmelden“ der App |
| `seite_aufrufen` | `als`, `seite`, bei `bericht` dazu `azubi`, `woche`; `dialog?` | Seiten-Ergebnis | direkt über die Adresse, wie eingetippt |
| `seite_verlassen` | `als`, `weg`: `link` \| `neu_laden` \| `zurueck` \| `vor` \| `schliessen`; bei `link` dazu `ziel` (Seite, bei `bericht` mit `azubi`, `woche`); `dialog?` | Seiten-Ergebnis | über einen Link der App, Neuladen, Zurück oder Vor im Browser oder Schließen des Browserfensters |
| `seite_lesen` | `als` | Seiteninhalt (unten) | liest die gerade angezeigte Seite, ohne etwas zu ändern |
| `tag_erfassen` | `als`, `woche`, `tag`, `tagesart?` (eine der fünf oder `""` = leeren), `text?` | `{ "erfasst": true }` | Eingabe auf der geöffneten Berichtsseite dieser Woche, ohne zu speichern. Ist sie nicht geöffnet, ist der Fall fehlerhaft. |
| `speichern` | `als` | `{ "gespeichert": true }` | „Speichern“ auf der geöffneten Berichtsseite |
| `einreichen` | `als` | `{ "status": <Status> }`; Fehler `pflichtangaben_fehlen` mit `"tage"` wie bei `einreichenPruefen` (M05) | „Einreichen“ auf der geöffneten Berichtsseite, Rückfrage bestätigt; ungespeicherte Eingaben werden mitgespeichert |

**Seiten-Ergebnis:** `{ "warnung": <Code> | null, "seite": <Seite> | null, "angemeldet": <Schlüssel> | null }`.

- `warnung`: Die App hat vor dem Verlassen gewarnt (Rückfrage der App oder Dialog des Browsers), mit dem Code der
  Warnung; `null` = ohne Warnung. `dialog` sagt, wie die Person antwortet: `abbrechen` (Voreinstellung, sie bleibt)
  oder `bestaetigen` (sie verlässt die Seite).
- `seite`: die Seite danach; `null`, wenn das Browserfenster geschlossen ist.
- `angemeldet`: die Person, als die die Seite angemeldet zeigt, sonst `null`.

**Seiteninhalt** (`seite_lesen`): immer `{ "seite", "angemeldet", "passwortfeld": <Wahrheitswert> }`
(`passwortfeld`: Die Seite enthält ein Eingabefeld für ein Passwort), dazu je Seite:

| Seite | weitere Felder |
| --- | --- |
| `anmelden` | `anmeldewege`: Liste der angebotenen Anmeldewege, z. B. `["firmenkonto"]`. Werkzeuge des Runners (Test-Login) zählen nicht. |
| `start` eines Azubis | `aktuelle_woche`: Woche der großen Karte „Diese Woche“ oder `null` |
| `bericht` | `woche`; `status`; `ungespeichert` (Wahrheitswert); `tage`: `[{ "tag": <Wochentag>, "felder": [<Feld>, …] } × 5]` mit allen Eingabefeldern des Tages, oder `null`, wenn die Seite keine Eingabe anbietet; `weitere_felder`: Eingabefelder des Berichts außerhalb der Tage; `historie`: `[{ "von": <Status> \| null, "nach": <Status>, "person": <Schlüssel>, "zeitpunkt": <Zeitpunkt> }]`, ältester zuerst |

Felder heißen `tagesart` und `taetigkeiten`; ein Eingabefeld, das keines davon ist, liefert der Adapter als
`ohne_merker` (so scheitert ein Fall, wenn ein weiteres Feld dazukommt, AK-403).

**Codes der Ablauf-Fälle:**

| Code | Bedeutung | AK |
| --- | --- | --- |
| `ungespeicherte_aenderungen` | Warnung beim Verlassen einer Seite mit ungespeicherten Änderungen | AK-408 |

**Erwartet:** `{ "ergebnisse": [ … ] }`, je Schritt das Ergebnis in derselben Reihenfolge. Weitere Aktionen und
Seiteninhalte kommen mit den Ablauf-Fällen der Module dazu (Welle 2 von G3); jede neue Aktion steht in dieser Tabelle.

**Beispiel** (AK-408: Neuladen mit ungespeicherten Änderungen):

```json
{
  "id": "AK-408-03",
  "modul": "M04",
  "ebene": "ablauf",
  "uhr": "2026-09-16T09:00:00+02:00",
  "schritte": [
    { "als": "anna", "aktion": "anmelden" },
    { "als": "anna", "aktion": "seite_aufrufen", "seite": "bericht", "azubi": "anna", "woche": "2026-W38" },
    { "als": "anna", "aktion": "tag_erfassen", "woche": "2026-W38", "tag": "Mo", "text": "Netzwerk geplant" },
    { "als": "anna", "aktion": "seite_verlassen", "weg": "neu_laden", "dialog": "abbrechen" }
  ],
  "erwartet": {
    "ergebnisse": [
      { "warnung": null, "seite": "start", "angemeldet": "anna" },
      { "warnung": null, "seite": "bericht", "angemeldet": "anna" },
      { "erfasst": true },
      { "warnung": "ungespeicherte_aenderungen", "seite": "bericht", "angemeldet": "anna" }
    ]
  }
}
```

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

## Schnittstellen und Aktionen von M05

Die Signaturen stehen in `specs/M05-status-und-pruefung.md`, Abschnitt 6. Status, Tagesart und Wochentage wie bei M03
und M04, Person und Bericht wie bei M02.

**Aktionen (Statuswechsel):** `einreichen` (Entwurf → Eingereicht), `zurueckziehen` (Eingereicht → Entwurf),
`freigeben` (Eingereicht → Freigegeben), `ablehnen` (Eingereicht → Abgelehnt), `erneut_einreichen` (Abgelehnt →
Eingereicht), `freigabe_zuruecknehmen` (Freigegeben → Abgelehnt). Sie gelten für `schnittstelle` `uebergangPruefen`,
für `moeglicheAktionen` und als Aktionen der Daten-Fälle; Liste in dieser Reihenfolge.

**Datenformate von M05:**

| Art | Format | Beispiel |
| --- | --- | --- |
| Bericht | `{ "azubi": <Schlüssel>, "azubiAktiv": <Wahrheitswert>, "status": <Status> }` | `{ "azubi": "anna", "azubiAktiv": true, "status": "Eingereicht" }` |
| Gesehener Stand | `{ "status": <Status>, "veraltet": <Wahrheitswert> }` oder `null`; `veraltet` heißt: Der Bericht wurde seitdem geändert (auch bei gleichem Status) | `{ "status": "Eingereicht", "veraltet": true }` |
| Tag zum Einreichen | `{ "tag": <Wochentag>, "tagesart": <Tagesart> \| null, "text": <Text>, "ausserhalb": <Wahrheitswert> }` | `{ "tag": "Fr", "tagesart": "Berufsschule", "text": "", "ausserhalb": false }` |

**Schnittstellen (Fachlogik):**

| Schnittstelle | `eingabe` | `erwartet` (Erfolg) | Fehlercodes |
| --- | --- | --- | --- |
| `uebergangPruefen` | `{ "aktion": <Aktion>, "person": <Person>, "bericht": <Bericht>, "gesehen": <Gesehener Stand>, "text": <Text> \| null }`; `text` = Gesamtkommentar bzw. Begründung | `{ "von": <Status>, "nach": <Status>, "text": <Text> \| null }`, `text` mit einheitlichen Zeilenumbrüchen, nur bei `ablehnen` und `freigabe_zuruecknehmen` | `zugriff_verweigert`, `uebergang_unzulaessig`, `bericht_zurueckgezogen`, `bereits_geprueft`, `bereits_eingereicht`, `bereits_zurueckgezogen`, `bereits_zurueckgenommen`, `inzwischen_geaendert`, `azubi_deaktiviert`, `kommentar_fehlt`, `begruendung_fehlt`, `text_zu_lang` (mit `"feld"`) |
| `moeglicheAktionen` | `{ "person": <Person>, "bericht": <Bericht> }` | `{ "aktionen": [<Aktion>, …] }` in der Reihenfolge oben | – |
| `einreichenPruefen` | `{ "tage": [<Tag zum Einreichen> × 5] }` | `{ "einreichbar": true }` | `pflichtangaben_fehlen` mit `"tage": [{ "tag", "fehler": "tagesart_fehlt" \| "taetigkeiten_fehlen" }]` in Kalenderreihenfolge |
| `darfBearbeiten` | `{ "person": <Person>, "bericht": <Bericht> }` | `{ "bearbeitbar": <Wahrheitswert> }` | – |
| `pruefrunde` | `{ "aktion": <Aktion>, "einreichungen": <Zahl> }` (bisherige Einreichungen des Berichts) | `{ "runde": <Zahl> }` (Runde des neuen Statuswechsels) | – |

**Aktionen der Daten-Fälle** (Felder außer `aktion`; `?` = optional):

| Aktion | Felder | Ergebnis (Erfolg) | Fehlercodes |
| --- | --- | --- | --- |
| `einreichen`, `erneut_einreichen` | `als`, `azubi`, `woche`, `gesehen?`, `tage?` (ungespeicherte Eingaben, werden mitgespeichert) | `{ "status": <Status> }` | wie `uebergangPruefen`, dazu `pflichtangaben_fehlen` (mit `"tage"`), `woche_ausserhalb`, `tage_ungueltig` (M04, mit `"tage"`) |
| `zurueckziehen` | `als`, `azubi`, `woche`, `gesehen?` | `{ "status": <Status> }` | wie `uebergangPruefen` |
| `freigeben` | `als`, `azubi`, `woche`, `gesehen?`, `kommentar?`, `tageskommentare?` (eingetippt, werden nicht gespeichert) | `{ "status": <Status> }` | wie `uebergangPruefen` |
| `ablehnen` | `als`, `azubi`, `woche`, `kommentar`, `tageskommentare?` (`{ "Mo": <Text>, … }`), `gesehen?` | `{ "status": <Status> }` | wie `uebergangPruefen`; zu langer Tageskommentar: `text_zu_lang` mit `"feld": "tageskommentar"` und `"tage": [<Wochentag>, …]` |
| `freigabe_zuruecknehmen` | `als`, `azubi`, `woche`, `begruendung`, `gesehen?` | `{ "status": <Status> }` | wie `uebergangPruefen` |
| `tage_speichern` | `als`, `azubi`, `woche`, `tage`: `{ "alle"?, "Mo"? … "Fr"? }` je `{ "tagesart", "text" }` wie die Eingaben von `tageSpeichern` (M04); `alle` gilt für jeden nicht genannten Tag | `{ "gespeichert": true }` | `zugriff_verweigert`, `nicht_bearbeitbar`, `tage_ungueltig` (mit `"tage"`) |
| `pruefliste_lesen` | `als`, `filter`: `eigene` \| `alle` | `{ "berichte": [{ "azubi", "woche", "eingereicht": <Zeitpunkt>, "azubiAktiv" }, …] }`, älteste Einreichung zuerst | – |
| `rueckmeldung_lesen` | `azubi`, `woche` (ohne `als`: liest, was die Berichtsseite dem Azubi oben und bei den Tagen zeigt) | `{ "rueckmeldung": null }` oder `{ "rueckmeldung": { "art": "ablehnung" \| "ruecknahme", "text": <Text>, "tage": [{ "tag", "texte": [<Text>, …] }] } }` | – |
| `person_deaktivieren` | `als`, `person` (Aktion von M02, hier nur zum Herstellen eines Bestands) | `{ "deaktiviert": true }` | – (ein Fehlschlag macht den Fall fehlerhaft) |
| `ausbildungszeitraum_aendern` | `als`, `person`, `beginn`, `ende` (Aktion von M02, wie oben) | `{ "geaendert": true }` | – (wie oben) |

**Fehlercodes von M05:**

| Code | Bedeutung | AK |
| --- | --- | --- |
| `uebergang_unzulaessig` | Die Aktion ist im aktuellen Status nicht vorgesehen (z. B. Entwurf freigeben, freigegebenen Bericht zurückziehen). | AK-507, AK-607, AK-704 |
| `bericht_zurueckgezogen` | Der Ausbilder prüft einen Stand „Eingereicht“, der Azubi hat inzwischen zurückgezogen („Bericht wurde zurückgezogen“). | AK-508 |
| `bereits_geprueft` | Der gesehene Stand „Eingereicht“ wurde inzwischen geprüft (Zurückziehen oder zweite Prüfung). | AK-508 |
| `bereits_eingereicht` | Der Bericht ist schon eingereicht. | AK-508 |
| `bereits_zurueckgezogen` | Der Bericht wurde auf diesem Stand schon zurückgezogen. | AK-508 |
| `bereits_zurueckgenommen` | Die Freigabe wurde auf diesem Stand schon zurückgenommen. | AK-508 |
| `inzwischen_geaendert` | Der gesehene Stand ist veraltet (z. B. zurückgezogen und erneut eingereicht). | AK-508 |
| `azubi_deaktiviert` | Der Azubi des Berichts ist deaktiviert: Er selbst ändert nichts mehr, Ausbilder dürfen nur noch freigeben. | AK-602 (bestätigte Auslegung) |
| `kommentar_fehlt` | Ablehnen ohne nicht leeren Gesamtkommentar. | AK-604 |
| `begruendung_fehlt` | Freigabe zurücknehmen ohne nicht leere Begründung. | AK-703 |
| `text_zu_lang` | Gesamtkommentar, Tageskommentar oder Begründung hat mehr als 5.000 Zeichen; `"feld"` ist `kommentar`, `tageskommentar` oder `begruendung`. | AK-604 |
| `pflichtangaben_fehlen` | Einreichen scheitert an fehlenden Pflichtangaben; `"tage"` nennt je Tag `tagesart_fehlt` oder `taetigkeiten_fehlen`. | AK-501, AK-502 |
| `woche_ausserhalb` | Die Woche liegt ganz außerhalb der Ausbildung und wird nicht eingereicht. | AK-501 (bestätigte Auslegung) |
| `nicht_bearbeitbar` | Der Bericht ist in seinem Status oder für diese Person nicht bearbeitbar. | AK-505, AK-704 |

`zugriff_verweigert` ist der Code aus M02 (fremder Bericht, falsche Rolle, deaktivierte Person); `text_zu_lang` und
`tage_ungueltig` sind die Codes aus M04, hier mit `"feld"` bzw. wie bei `tageSpeichern`.

## Schnittstellen und Aktionen von M06

Die Signaturen stehen in `specs/M06-historie.md`, Abschnitt 6. Status und Wochentage wie bei M03 und M04; Personen als
Schlüssel wie bei M02.

**Datenformate von M06:**

| Art | Format | Beispiel |
| --- | --- | --- |
| Statuswechsel | `{ "von": <Status>, "nach": <Status>, "person": <Schlüssel>, "zeitpunkt": <Zeitpunkt>, "runde": <Zahl>, "begruendung": <Text> \| null }` (wie im Bestand eines Daten-Falls) | `{ "von": "Freigegeben", "nach": "Abgelehnt", "person": "clara", "zeitpunkt": "2026-10-06T12:00:00+02:00", "runde": 1, "begruendung": "Mittwoch falsches Datum" }` |
| Kommentar | `{ "runde": <Zahl>, "tag": <Wochentag> \| null, "person": <Schlüssel>, "text": <Text> }`; `tag` = `null` ist der Gesamtkommentar (wie im Bestand) | `{ "runde": 1, "tag": "Mo", "person": "bernd", "text": "Montag ergänzen" }` |
| Historie | `{ "runden": [{ "runde": <Zahl>, "eintraege": [{ "bezeichnung", "nach": <Status>, "person", "zeitpunkt", "begruendung" }], "gesamtkommentare": [{ "person", "text" }], "tageskommentare": [{ "tag", "person", "text" }] }] }`; Runden neueste zuerst, Einträge in ihrer Reihenfolge, Tageskommentare Mo bis Fr | was die Berichtsseite als Historie zeigt |
| Bezeichnung | `Eingereicht`, `Erneut eingereicht`, `Zurückgezogen`, `Freigegeben`, `Abgelehnt`, `Freigabe zurückgenommen` (M06-R05) | `Erneut eingereicht` |

**Schnittstellen (Fachlogik):**

| Schnittstelle | `eingabe` | `erwartet` (Erfolg) | Fehlercodes |
| --- | --- | --- | --- |
| `historieGruppieren` | `{ "statuswechsel": [<Statuswechsel>, …] }` in ihrer Reihenfolge, `"kommentare": [<Kommentar>, …]` in beliebiger Reihenfolge | `<Historie>` | – |

**Aktionen der Daten-Fälle** (Felder außer `aktion`; `?` = optional). Die drei Schreibaktionen sind Versuche **an der
Fachlogik vorbei**: Der Adapter übersetzt sie in einen direkten Schreibzugriff auf die Datenhaltung, ohne Person und
ohne Prüfung der Plattform-Fachlogik. Erwartet ist immer die Abweisung durch die Datenhaltung; ein Erfolg verletzt
M06-R08 bzw. M06-R09.

| Aktion | Felder | Ergebnis (Erfolg) | Fehlercodes |
| --- | --- | --- | --- |
| `historie_lesen` | `azubi`, `woche` (ohne `als`: liest, was die Berichtsseite als Historie zeigt) | `<Historie>` | – |
| `historie_aendern` | `azubi`, `woche`, `eintrag`: `statuswechsel` \| `kommentar`, `nummer` (ab 1, Position in `historie` bzw. `kommentare` des Bestands), `werte`: neue Werte, bei `statuswechsel` aus `von`, `nach`, `person`, `zeitpunkt`, `runde`, `begruendung`, bei `kommentar` aus `runde`, `person`, `text` | `{ "geaendert": true }` | `historie_unveraenderlich` |
| `historie_loeschen` | `azubi`, `woche`, `eintrag`, `nummer` (wie oben) | `{ "geloescht": true }` | `historie_unveraenderlich` |
| `bericht_loeschen` | `azubi`, `woche` (den ganzen Bericht samt Tagen löschen) | `{ "geloescht": true }` | `historie_unveraenderlich` |

Eine `nummer`, zu der es keinen Eintrag gibt, macht den Fall fehlerhaft. Die Zuordnung zur Abweisung erfolgt über den
festen Grund der Datenhaltung, nie über ihren Meldungstext.

**Fehlercodes von M06:**

| Code | Bedeutung | AK |
| --- | --- | --- |
| `historie_unveraenderlich` | Die Datenhaltung weist das Ändern oder Löschen eines Statuswechsels oder Kommentars oder das Löschen eines Berichts mit Historie ab. | AK-803 |

## Schnittstellen und Aktionen von M07

Die Signaturen stehen in `specs/M07-pdf-export.md`, Abschnitt 6. Status, Tagesart, Woche und Wochentage wie bei M03 und
M04. **Personen stehen hier mit ihrem Namen** (Text), weil das PDF Namen druckt.

**Datenformate von M07:**

| Art | Format | Beispiel |
| --- | --- | --- |
| Tag im PDF-Bericht | `{ "tag": <Wochentag>, "tagesart": <Tagesart> \| null, "text": <Text>, "ausserhalb": <Wahrheitswert> }`, gespeicherter Stand | `{ "tag": "Mo", "tagesart": null, "text": "", "ausserhalb": true }` |
| Bericht für das PDF | `{ "woche": <Woche>, "status": <Status>, "tage": [<Tag im PDF-Bericht> × 5], "statuswechsel": [{ "von": <Status> \| null, "nach": <Status>, "person": <Name>, "zeitpunkt": <Zeitpunkt> }, …] }`, Statuswechsel in ihrer Reihenfolge | eine gespeicherte Woche mit ihrer Historie |
| Ausbildung | `{ "beginn": <Kalendertag>, "ende": <Kalendertag> \| null }` | `{ "beginn": "2026-09-01", "ende": null }` |
| PDF-Inhalt | siehe unten | |

**PDF-Inhalt.** Ein Fall prüft, welche Texte und Vermerke ein PDF enthält, nicht das Layout. Texte stehen genau so, wie
sie gedruckt werden:

| Feld | Inhalt |
| --- | --- |
| `titel` | Titel des Dokuments, z. B. `Berichtsheft Anna Azubi – KW 40/2026` |
| `dateiname` | z. B. `Berichtsheft_Anna-Azubi_KW40-2026.pdf` |
| `erstellt` | Erstellungszeitpunkt aus der Uhr, z. B. `06.10.2026, 21:00 Uhr` (Fußzeile „Erstellt am …“) |
| `zeitraum` | nur Sammel-PDF: gewählter Zeitraum, z. B. `01.09.2026 – 06.10.2026` |
| `wochen` | Liste der gedruckten Wochen in Druckreihenfolge. **Jeder Eintrag beginnt im PDF auf einer neuen Seite** (M07-R09); eine leere Liste ergibt das PDF mit Hinweis |

Je Woche: `{ "name", "kw", "zeitraum", "status", "vermerk", "kennzeichnung", "kopfzeile", "ausserhalb", "tage" }`:

| Feld | Inhalt |
| --- | --- |
| `name` | Name des Azubis |
| `kw` | z. B. `KW 40/2026` |
| `zeitraum` | Montag bis Freitag, z. B. `28.09.2026 – 02.10.2026` |
| `status` | Status der Woche |
| `vermerk` | Freigabevermerk, z. B. `Freigegeben von Bernd Ausbilder am 05.10.2026, 14:05 Uhr`, sonst `null` |
| `kennzeichnung` | z. B. `Nicht freigegeben – Status: Entwurf`, bei einer freigegebenen Woche `null` |
| `kopfzeile` | Statusangabe der Kopfzeile jeder Seite: `Freigegeben` oder z. B. `Nicht freigegeben (Entwurf)` |
| `ausserhalb` | `true`, wenn die Woche ganz außerhalb der Ausbildung liegt |
| `tage` | `[{ "datum": <z. B. „Montag, 28.09.2026“>, "tagesart": <Text>, "taetigkeiten": <Text> } × 5]`, Mo bis Fr; `tagesart` wie gedruckt (M07-R02), `taetigkeiten` unverändert |

**Schnittstellen (Fachlogik):** Der Fall nennt `uhr` (Erstellungszeitpunkt und „heute“ für die Vorbelegung).

| Schnittstelle | `eingabe` | `erwartet` (Erfolg) | Fehlercodes |
| --- | --- | --- | --- |
| `pdfWoche` | `{ "name": <Text>, "ausbildung": <Ausbildung> \| null }` und die Felder von `<Bericht für das PDF>` (`woche`, `status`, `tage`, `statuswechsel`) | `<PDF-Inhalt>` ohne `zeitraum` | – |
| `pdfZeitraum` | `{ "name": <Text>, "ausbildung": <Ausbildung>, "von": <Text> \| null, "bis": <Text> \| null, "berichte": [<Bericht für das PDF>, …] }`; `von`/`bis` wie im Formular eingegeben, `null` = nicht angegeben; `berichte` = alle Berichte des Azubis in beliebiger Reihenfolge | `<PDF-Inhalt>` mit `zeitraum` | `von_ungueltig`, `bis_ungueltig`, `bis_vor_von` |

**Aktionen der Daten-Fälle** (Felder außer `aktion`; `?` = optional):

| Aktion | Felder | Ergebnis (Erfolg) | Fehlercodes |
| --- | --- | --- | --- |
| `pdf_woche_exportieren` | `als`, `azubi`, `woche` | `{ "pdf": <PDF-Inhalt> }` | `zugriff_verweigert`, `nicht_gefunden` |
| `pdf_zeitraum_exportieren` | `als`, `azubi` (Schlüssel der Person, deren Berichtsheft exportiert wird), `von?`, `bis?` (Text wie bei `pdfZeitraum`; fehlt = nicht angegeben) | `{ "pdf": <PDF-Inhalt> }` | `zugriff_verweigert`, `nicht_gefunden`, `von_ungueltig`, `bis_ungueltig`, `bis_vor_von` |

Im Daten-Fall stehen die Namen im PDF-Inhalt wie in `testdaten.json` bzw. `ausgangsbestand.personen`. `pdf_zeitraum_exportieren` nennt keinen
Bericht (nur eine Person); seine Wochen erscheinen deshalb nicht in `erwartet.berichte`.

**Fehlercodes von M07:**

| Code | Bedeutung | AK |
| --- | --- | --- |
| `nicht_gefunden` | Den Bericht gibt es nicht, oder die Person hat kein Berichtsheft (kein Azubi mit Ausbildungsbeginn): „Seite nicht gefunden“. | AK-906 |
| `von_ungueltig` | „Von“ ist kein Kalendertag, den es gibt. | AK-902 |
| `bis_ungueltig` | „Bis“ ist kein Kalendertag, den es gibt. | AK-902 |
| `bis_vor_von` | „Bis“ liegt vor „Von“. | AK-902 |

`zugriff_verweigert` ist der Code aus M02 (fremder Bericht, deaktivierte Person).

## Schnittstellen und Aktionen von M08

Die Signaturen stehen in `specs/M08-benachrichtigungen-und-erinnerung.md`, Abschnitt 6. Status, Woche und Personen wie
bei M02, M03 und M05; die Aktionen der Statuswechsel sind die von M05.

**Datenformate von M08:**

| Art | Format | Beispiel |
| --- | --- | --- |
| Kanal | `email`, `teams`, `app`; Listen in dieser Reihenfolge | `teams` |
| Empfänger | `{ "schluessel": <Text>, "aktiv": <Wahrheitswert>, "kanaele": [<Kanal>, …] }` | `{ "schluessel": "bernd", "aktiv": true, "kanaele": ["email", "app"] }` |
| Anlass | `eingereicht`, `erneut_eingereicht`, `freigegeben`, `abgelehnt`, `freigabe_zurueckgenommen`, `erinnerung`, `ueberfaellig` | `ueberfaellig` |
| Nachricht | `{ "empfaenger": <Schlüssel>, "kanal": <Kanal>, "anlass": <Anlass>, "azubi": <Schlüssel>, "wochen": [<Woche>, …], "ziel": "bericht" \| "uebersicht" }`; `wochen` aufsteigend, `ziel` ist das Ziel des Links | siehe unten |
| Azubi zur Erinnerung | `{ "schluessel", "aktiv", "kanaele", "beginn", "ende", "ausbilder": <Empfänger> \| null, "wochen": [{ "woche", "status", "inhalt", "historie" }, …] }`; `inhalt` und `historie` wie bei `wocheEinordnen` (M03) | |

Betreff und Text nennt eine Nachricht nicht wörtlich: Ihr Wortlaut ist Sache der Plattform. Die neutrale Nachricht
sagt, worüber sie informiert (Anlass, Azubi, Wochen) und wohin ihr Link führt. Die Reihenfolge der Nachrichten ist die
der Plattform je Ereignis: je Azubi zuerst die Erinnerung, dann die Information; je Nachricht die Kanäle in der
Reihenfolge oben.

**Schnittstellen (Fachlogik):**

| Schnittstelle | `eingabe` | `erwartet` (Erfolg) | Fehlercodes |
| --- | --- | --- | --- |
| `kanaeleWaehlen` | `{ "werte": [<Text>, …] }` (Auswahl im Formular, ungeprüft) | `{ "kanaele": [<Kanal>, …] }` | `kanal_unbekannt` |
| `voreinstellungKanaele` | `{}` | `{ "kanaele": [<Kanal>, …] }` | – |
| `benachrichtigungenPlanen` | `{ "aktion": <Aktion>, "woche": <Woche>, "azubi": <Empfänger>, "ausbilder": <Empfänger> \| null }` (`ausbilder` = zugeordneter Ausbilder) | `{ "nachrichten": [<Nachricht>, …] }` | – |
| `erinnerungenPlanen` | `{ "azubis": [<Azubi zur Erinnerung>, …] }`; der Fall nennt `uhr` = Stichtag | `{ "nachrichten": [<Nachricht>, …] }` | – |
| `erinnerungFaellig` | `{ "zeitpunkt": <Zeitpunkt> }` | `{ "woche": <Woche>, "stichtag": <Zeitpunkt>, "faellig": <Wahrheitswert> }`; `faellig` = zwischen Stichtag und Ende des Nachholens | – |
| `wartezeitNachFehlversuch` | `{ "versuche": <Zahl ab 1> }` (bisherige Fehlversuche) | `{ "sekunden": <Zahl> }` | – |
| `ruecksprungZiel` | `{ "ziel": <Text> \| null }` (aufgerufene Adresse) | `{ "ziel": <Text> \| null }`; `null` = zur Startseite | – |

Ein unbekannter Kanal in `kanaeleWaehlen` geht unverändert an die Plattform, die ihn abweisen muss. In den anderen
Schnittstellen macht ein unbekannter Kanal den Fall fehlerhaft.

**Aktionen der Daten-Fälle** (Felder außer `aktion`; `?` = optional). Nachrichten an E-Mail und Teams gehen über einen
Test-Kanal der Plattform, nie an einen echten Dienst; er zählt die Übergaben je Nachricht und lässt sich je Versandlauf
stören.

| Aktion | Felder | Ergebnis (Erfolg) | Fehlercodes |
| --- | --- | --- | --- |
| `kanaele_einstellen` | `als`, `kanaele` (Liste von Texten, ungeprüft) | `{ "gespeichert": true }` | `zugriff_verweigert`, `kanal_unbekannt` |
| `kanaele_lesen` | `person` | `{ "kanaele": [<Kanal>, …] }` | – |
| `erinnerung_ausloesen` | – (der Erinnerungslauf, wie ihn die Plattform zu „jetzt“ startet) | `{ "lauf": "ausgefuehrt", "angelegt": <Zahl> }`, `{ "lauf": "nicht_faellig" }` oder `{ "lauf": "schon_erledigt" }` | – |
| `nachrichten_versenden` | `stoerung?` (Liste von `email`, `teams`: in diesem Lauf scheitert jede Übergabe) | `{ "versendet": <Zahl>, "erneut": <Zahl>, "aufgegeben": <Zahl> }` | – |
| `nachrichten_lesen` | `empfaenger?` (nur die Nachrichten an diese Person) | `{ "nachrichten": [<Gespeicherte Nachricht>, …] }` | – |
| `ungelesen_zaehlen` | `als` | `{ "anzahl": <Zahl> }` (ungelesene eigene App-Nachrichten) | – |
| `benachrichtigungen_oeffnen` | `als` | `{ "nachrichten": [{ "art", "woche", "neu": <Wahrheitswert> }, …] }`, eigene App-Nachrichten, neueste zuerst; markiert alle als gelesen | – |
| `nicht_zustellbar_lesen` | `als` | `{ "nachrichten": [{ "empfaenger", "kanal", "versuche", "empfaengerAktiv" }, …] }`, zuletzt aufgegebene zuerst | `zugriff_verweigert` |
| `erneut_versuchen` | `als`, `empfaenger`, `kanal` (benennen die eine aufgegebene Nachricht an diese Person über diesen Kanal) | `{ "erneut": true }` | `zugriff_verweigert`, `nicht_wiederholbar` |
| `wochen_lesen` | `azubi` (liest, welche Wochenberichte es für den Azubi gibt; Bestand von M03) | `{ "wochen": [<Woche>, …] }` aufsteigend | – |

Die Statuswechsel von M05 (`einreichen` … `freigabe_zuruecknehmen`) und `person_deaktivieren` gelten unverändert; ihre
Nachrichten entstehen dabei.

**Gespeicherte Nachricht** (`nachrichten_lesen`):

| Feld | Inhalt |
| --- | --- |
| `empfaenger`, `kanal` | Schlüssel der Person, Kanal |
| `art` | `statuswechsel`, `erinnerung` oder `ueberfaellig` (Information an den Ausbilder) |
| `woche` | Woche des Berichts; `null`, wenn die Nachricht mehrere Wochen nennt |
| `angelegt` | Zeitpunkt des Anlegens |
| `zustand` | `offen` (wartet auf den Versand), `zugestellt` (App: beim Anlegen) oder `aufgegeben` |
| `versuche` | Zahl der Versuche (Fehlversuche und der erfolgreiche) |
| `naechsterVersuch` | frühester Zeitpunkt des nächsten Versuchs bei `offen`, sonst `null` |
| `uebergaben` | wie oft der Test-Kanal die Nachricht in diesem Fall erhalten hat (App: immer 0) |

Reihenfolge: Zeitpunkt des Anlegens, dann Empfänger (Schlüssel), dann Kanal. Ein Erinnerungsfall mit mehreren Azubis
desselben Ausbilders gibt seinen Schritten verschiedene `uhr` oder liest je Empfänger.

**Fehlercodes von M08:**

| Code | Bedeutung | AK |
| --- | --- | --- |
| `kanal_unbekannt` | Ein gewählter Kanal ist keiner von E-Mail, Teams, App; nichts wird gespeichert. | AK-1011 |
| `nicht_wiederholbar` | „Erneut versuchen“ geht nicht: Der Empfänger ist deaktiviert oder die Nachricht ist nicht (mehr) aufgegeben. | AK-1004 |

`zugriff_verweigert` ist der Code aus M02 (deaktivierte Person, Azubi bei „nicht zustellbar“).

**Beispiel** (AK-1001-01):

```json
{
  "id": "AK-1001-01",
  "modul": "M08",
  "ebene": "fachlogik",
  "schnittstelle": "benachrichtigungenPlanen",
  "eingabe": {
    "aktion": "einreichen",
    "woche": "2026-W41",
    "azubi": { "schluessel": "anna", "aktiv": true, "kanaele": ["email", "app"] },
    "ausbilder": { "schluessel": "bernd", "aktiv": true, "kanaele": ["email", "app"] }
  },
  "erwartet": {
    "nachrichten": [
      { "empfaenger": "bernd", "kanal": "email", "anlass": "eingereicht", "azubi": "anna", "wochen": ["2026-W41"], "ziel": "bericht" },
      { "empfaenger": "bernd", "kanal": "app", "anlass": "eingereicht", "azubi": "anna", "wochen": ["2026-W41"], "ziel": "bericht" }
    ]
  }
}
```

## Fehlercodes

| Code | Bedeutung | AK |
| --- | --- | --- |
| `woche_ungueltig` | Die Woche gibt es nicht (KW 0, KW 53 in einem Jahr mit 52 Wochen, über 53). | AK-1204 |
| `bundesland_unbekannt` | Das Kürzel ist keines der 16 Bundesländer. | AK-1205 |
| `zeitpunkt_ungueltig` | Der Zeitpunkt lässt sich nicht lesen. | AK-1201 |

## Aktionen und Status

- **Status:** `Entwurf`, `Eingereicht`, `Freigegeben`, `Abgelehnt` (Statusmodell in `docs/01`).
- **Aktionen:** die Statuswechsel und die Aktionen der Daten-Fälle in den Abschnitten „Schnittstellen und Aktionen von
  …“ der Module (seit G2).
- **Aktionen der Ablauf-Fälle:** in „Aufbau eines Ablauf-Falls“ (seit G3).

## Regeln für Adapter

- **Übersetzen ja, umdeuten nein:** Ein Adapter bildet eine neutrale Schnittstelle auf die Funktionen der Plattform ab
  und wandelt Ein- und Ausgabeformate um (z. B. `2026-W53` in Jahr und Woche, ein Datum der Plattform in
  `JJJJ-MM-TT`). Er ändert kein Ergebnis, rechnet nichts nach und ergänzt keine Fachlogik.
- **Fehler:** Ein fachlicher Fehler der Plattform wird als `{ "fehler": "<code>" }` geliefert, mit einem Code aus der
  Liste oben. Die Zuordnung Fehler → Code erfolgt über die Fehlerart der Plattform, nicht über den Meldungstext. Jeder
  andere Fehler lässt den Fall scheitern.
- **Uhr:** Nennt ein Fall `uhr`, stellt der Runner die Uhr der Plattform vor dem Fall darauf und danach zurück.
- **Daten-Fälle:** Der Runner stellt vor jedem Fall einen sauberen Ausgangsbestand her; kein Fall hängt vom Bestand
  eines anderen ab. Ein Fehler der Plattform wird nur über ihren festen Grund auf einen Fehlercode abgebildet.
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

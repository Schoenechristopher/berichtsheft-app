# M02 Personen und Zugang

Stand: 12.10.2026 · Status: **Entwurf zur Freigabe** (Etappe G2) · @Chris

Fach-Spec nach `specs/vorlage-fach-spec.md`. Sie nennt keine Technik; wie die TypeScript-App die Regeln heute umsetzt,
steht in `specs/code-landkarte.md`, Abschnitt M02.

## 1. Zweck und Abgrenzung

M02 legt fest, wer die App benutzen darf und was jede Person sehen und tun darf:

- **Rollen:** Azubi und Ausbilder; jeder Ausbilder ist zugleich Admin.
- **Anmeldung und Zugang:** Anmeldung nur über das Firmenkonto, Zugang nur für angelegte, aktive Personen, Zuordnung
  eines Firmenkontos zu einer Person beim ersten Login, Abmelden.
- **Zugriff:** wer welche Berichte sieht und wer Prüf- und Admin-Funktionen erreicht.
- **Nutzerverwaltung:** Personen anlegen und ändern, Zuordnung zu einem Ausbilder, Ausbildungszeitraum, Deaktivieren,
  wieder Aktivieren, endgültiges Löschen, Schutz des letzten aktiven Ausbilders und Selbstschutz.
- **Bundesland der Firma:** wer es einstellt.

Nicht in M02:

- Welche Wochen ein Azubi bekommt und was ein geänderter Ausbildungszeitraum an seinen Berichten ändert (M03,
  Ergänzung zu AK-203, AK-306). M02 meldet die Änderung (Abschnitt 7).
- Wer einen Bericht ändern darf (M04) und wer welchen Statuswechsel auslösen darf, also auch das Prüfen (M05). M02 liefert
  dafür Rolle und „aktiv“.
- Ob eine Person in der Historie eines Berichts vorkommt (M06). M02 nutzt die Antwort beim Löschen.
- Erinnerungen und Benachrichtigungen, auch dass deaktivierte Azubis keine bekommen, und der Rücksprung nach der
  Anmeldung zum Link einer Benachrichtigung (M08, AK-1003).
- Welche Bundesländer es gibt und welche Tage Feiertage sind (M01).
- Seiten, Formulare und Meldungstexte (M09). Meldungstexte prüft nur der Ablauf.

## 2. Begriffe

Zentrale Begriffe (Zugeordneter Ausbilder, Vertretung, Rollen) stehen in `specs/00-uebersicht.md`. Für M02 gilt
zusätzlich:

| Begriff | Bedeutung |
| --- | --- |
| Firmenkonto | das Konto der Person beim Anmeldedienst der Firma (z. B. Microsoft); die App kennt kein eigenes Passwort |
| Konto-ID | stabile Kennung des Firmenkontos; ändert sich nicht, wenn sich Name oder E-Mail im Firmenkonto ändern |
| Bestätigte E-Mail | E-Mail, die der Anmeldedienst ausdrücklich als bestätigt ausweist |
| Firmen-E-Mail | E-Mail, mit der der Admin eine Person anlegt; ohne Groß-/Kleinschreibung eindeutig |
| Noch nie angemeldet | Person ist angelegt, ihr Firmenkonto aber noch nicht gebunden (keine Konto-ID) |
| Binden | einmaliges Verknüpfen einer angelegten Person mit der Konto-ID beim ersten Login |
| Admin | jeder aktive Ausbilder in seiner Rolle für Nutzerverwaltung und Einstellungen |
| Aktiv / deaktiviert | Zustand einer Person; „Entfernen“ deaktiviert, Daten bleiben erhalten |
| Endgültig löschen | Person und alle ihre Berichte entfernen; nur bewusst, mit Bestätigung |
| Fremde Historie | Statuswechsel oder Kommentare einer Person an Berichten anderer Azubis (M06) |
| Letzter aktiver Ausbilder | ein aktiver Ausbilder, neben dem es keinen anderen aktiven Ausbilder gibt |
| Sitzung | Zeitraum nach der Anmeldung, in dem die App die Person ohne erneute Anmeldung kennt |

## 3. Regeln

**Rollen und Zugang**

- **M02-R01:** Es gibt genau zwei Rollen: Azubi und Ausbilder. Jeder Ausbilder ist zugleich Admin.
- **M02-R02:** Die Anmeldung läuft ausschließlich über das Firmenkonto; die App hat kein eigenes Passwort. Ein
  Test-Zugang ohne Firmenkonto gibt es nur außerhalb des Produktivbetriebs.
- **M02-R03:** Zugang hat nur eine Person, die der Admin angelegt hat und die aktiv ist. Ein Firmenkonto ohne Person
  wird abgewiesen (`konto_unbekannt`), eine deaktivierte Person ebenso (`person_deaktiviert`); beide sehen den Hinweis
  „Kein Zugang – bitte an den Ausbilder wenden“.
- **M02-R04:** Der Zugang wird bei jedem Zugriff gegen den aktuellen Stand der Person geprüft. Eine Deaktivierung wirkt
  sofort, auch in einer laufenden Sitzung.
- **M02-R05:** Eine Sitzung gilt höchstens 8 Stunden. Nach dem Abmelden ist ohne erneute Anmeldung kein Zugriff möglich;
  das Abmelden beendet auch die Anmeldung beim Anmeldedienst.

**Zuordnung beim Login**

- **M02-R06:** Der Admin legt eine Person mit Firmen-E-Mail, Name und Rolle an. Die Firmen-E-Mail wird ohne Leerzeichen
  am Rand und in Kleinbuchstaben gespeichert und ist ohne Groß-/Kleinschreibung eindeutig.
- **M02-R07:** Beim Login zählt zuerst die Konto-ID: Gehört sie zu einer Person, ist es diese Person, gleich welche
  E-Mail das Firmenkonto inzwischen hat (`bekannt`). Ob sie Zugang hat, entscheidet M02-R03.
- **M02-R08:** Gehört die Konto-ID zu keiner Person, wird nur über eine bestätigte E-Mail zugeordnet: Eine aktive, noch
  nie angemeldete Person mit dieser E-Mail wird einmalig an die Konto-ID gebunden (`binden`). Eine an ein anderes Konto
  gebundene Person wird nie über die E-Mail umgebunden, eine deaktivierte nie gebunden; ohne Konto-ID oder ohne
  bestätigte E-Mail gibt es keine Zuordnung (`keine`).

**Zugriff auf Berichte und Funktionen**

- **M02-R09:** Ein Azubi sieht nur eigene Berichte. Der Aufruf eines fremden Berichts ergibt „Zugriff verweigert“
  (`zugriff_verweigert`).
- **M02-R10:** Jeder aktive Ausbilder sieht die Berichte aller Azubis, unabhängig von der Zuordnung (Vertretung) und
  auch die Berichte deaktivierter Azubis.
- **M02-R11:** Eine deaktivierte Person sieht nichts, auch keine eigenen Berichte.
- **M02-R12:** Prüf- und Admin-Funktionen (Nutzerverwaltung, Einstellungen) erreicht nur ein aktiver Ausbilder, ein
  Azubi auch nicht über eine direkt eingegebene Adresse oder eine direkt ausgelöste Aktion (`zugriff_verweigert`).
  Welche Statuswechsel ein Ausbilder auslösen darf, regelt M05.
- **M02-R13:** Jede Aktion prüft Rolle und Besitz selbst. Eine ausgeblendete Schaltfläche ist kein Schutz.

**Personen anlegen und ändern**

- **M02-R14:** Pflicht sind Name (höchstens 200 Zeichen), Firmen-E-Mail (gültige Adresse, höchstens 320 Zeichen) und
  Rolle. Eine abgewiesene Eingabe nennt jedes betroffene Feld (`eingabe_ungueltig`).
- **M02-R15:** Ein Azubi braucht einen zugeordneten Ausbilder und einen Ausbildungsbeginn. Zugeordnet werden kann nur
  eine Person mit Rolle Ausbilder, nicht die Person selbst, und nur ein aktiver Ausbilder, außer die Person selbst ist
  deaktiviert.
- **M02-R16:** Ausbildungsbeginn und -ende sind Kalendertage, die es gibt. Das Ende ist freiwillig und liegt nicht vor
  dem Beginn; derselbe Tag ist erlaubt.
- **M02-R17:** Für einen Ausbilder werden Zuordnung und Ausbildungszeitraum nicht gespeichert; sie entfallen auch beim
  Wechsel vom Azubi zum Ausbilder.
- **M02-R18:** Der Admin kann Name, Firmen-E-Mail, Rolle, Zuordnung und Ausbildungszeitraum ändern. Der Wechsel vom Azubi
  zum Ausbilder ist immer möglich, der Wechsel vom Ausbilder zum Azubi nur nach M02-R23 bis M02-R25. Was ein geänderter
  Zeitraum an den Berichten ändert, regelt M03 (Abschnitt 7).

**Deaktivieren, wieder aktivieren, löschen**

- **M02-R19:** „Entfernen“ deaktiviert die Person: keine Anmeldung mehr (M02-R03); ihre Berichte bleiben für Ausbilder
  lesbar und exportierbar (M02-R10), sind aber nicht mehr änderbar (M04). Für einen deaktivierten Azubi entstehen keine
  neuen Wochenberichte (M03), und er erhält keine Erinnerungen (M08). Eine schon deaktivierte Person wird nicht noch
  einmal deaktiviert (`bereits_deaktiviert`).
- **M02-R20:** Der Admin kann eine deaktivierte Person wieder aktivieren, einen Azubi nur, wenn sein zugeordneter
  Ausbilder aktiv ist (`ausbilder_deaktiviert`). Eine aktive Person wird nicht noch einmal aktiviert (`bereits_aktiv`).
- **M02-R21:** Endgültiges Löschen entfernt die Person und alle ihre Berichte mit deren Historie; danach ist kein Bericht
  der Person mehr auffindbar. Gelöscht wird nur nach ausdrücklicher Bestätigung durch Eintippen des genauen Namens
  (Leerzeichen am Rand zählen nicht, Groß- und Kleinschreibung schon).
- **M02-R22:** Kommt die Person in fremder Historie vor, lässt sie sich nur deaktivieren, nicht löschen
  (`fremde_historie`). Ist sie noch aktiv, wird „Deaktivieren“ angeboten.
- **M02-R23:** Der letzte aktive Ausbilder kann weder deaktiviert noch gelöscht noch zum Azubi herabgestuft werden
  (`letzter_ausbilder`).
- **M02-R24:** Ein Ausbilder mit zugeordneten Azubis kann erst deaktiviert werden, wenn ihm keine aktiven Azubis mehr
  zugeordnet sind; gelöscht oder zum Azubi herabgestuft erst, wenn ihm gar keine Azubis mehr zugeordnet sind, auch
  keine deaktivierten (`azubis_zugeordnet`).
- **M02-R25:** Niemand deaktiviert oder löscht sich selbst oder ändert die eigene Rolle (`eigene_person`). Ist die
  Person zugleich der letzte aktive Ausbilder, gilt `letzter_ausbilder`.
- **M02-R26:** Treffen mehrere Gründe zu, wird einer gemeldet, in dieser Reihenfolge: beim Deaktivieren
  `bereits_deaktiviert`, `letzter_ausbilder`, `azubis_zugeordnet`, `eigene_person`; beim Löschen `letzter_ausbilder`,
  `azubis_zugeordnet`, `eigene_person`, `fremde_historie`; beim Herabstufen `letzter_ausbilder`,
  `azubis_zugeordnet`, `eigene_person`.
- **M02-R27:** Gleichzeitige Änderungen dürfen eine Regel nicht gemeinsam umgehen: Deaktivieren zwei Admins zur selben
  Zeit die beiden letzten aktiven Ausbilder, bleibt mindestens einer aktiv.

**Bundesland der Firma**

- **M02-R28:** Es gibt genau ein Bundesland für die ganze App. Nur der Admin stellt es ein (`zugriff_verweigert`), und
  nur eines der 16 Bundesländer mit seinem festen Kürzel (M01-R13, `bundesland_unbekannt`). Solange keines eingestellt
  ist, gilt NW.

## 4. Akzeptanzkriterien

Text aus `docs/01-spezifikation.md`; Prüffälle in `specs/pruefung/M02.json`.

| AK-ID | Kriterium (Kurzfassung) | Regeln | Prüffälle | Ebene |
| --- | --- | --- | --- | --- |
| AK-101 | Anmeldung nur über das Firmenkonto; ein eigenes Passwort in der App gibt es nicht. | M02-R02 | AK-101-01 bis AK-101-03 | Ablauf |
| AK-102 | Firmenkonto ohne Eintrag oder mit deaktivierter Person wird abgewiesen, mit dem Hinweis „Kein Zugang – bitte an den Ausbilder wenden“. | M02-R03, M02-R04, M02-R08, M02-R11 | AK-102-01 bis AK-102-09 | Fachlogik |
| AK-103 | Ein Azubi sieht nur eigene Berichte; ein fremder Bericht ergibt „Zugriff verweigert“. | M02-R09, M02-R13 | AK-103-01 bis AK-103-03 | Fachlogik |
| AK-104 | Ein Azubi erreicht keine Prüf- oder Admin-Funktionen, auch nicht per direkt eingegebener Adresse. | M02-R12, M02-R13 | AK-104-01 bis AK-104-04 | Fachlogik |
| AK-105 | Jeder Ausbilder kann die Berichte aller Azubis ansehen. | M02-R10 | AK-105-01 bis AK-105-03 | Fachlogik |
| AK-106 | Nach dem Abmelden ist ohne erneute Anmeldung kein Zugriff möglich. | M02-R05 | AK-106-01, AK-106-02 | Ablauf |
| AK-201 | Admin legt eine Person mit Firmen-E-Mail, Name und Rolle an; erster Login bindet über die bestätigte E-Mail, danach zählt nur die Konto-ID. | M02-R01, M02-R06 bis M02-R08, M02-R14, M02-R17 | AK-201-01 bis AK-201-11 | Fachlogik |
| AK-202 | Ein Azubi braucht zugeordneten Ausbilder und Ausbildungsbeginn; fehlt eines, nennt die Meldung das Feld. | M02-R14 bis M02-R16 | AK-202-01 bis AK-202-09 | Fachlogik |
| AK-203 | Der Admin ändert Rolle, zugeordneten Ausbilder sowie Ausbildungsbeginn und -ende. Die Folgen für die Berichte regelt M03. | M02-R16 bis M02-R18 | AK-203-01 bis AK-203-07 | Fachlogik |
| AK-204 | Entfernen deaktiviert: keine Anmeldung, Berichte für Ausbilder lesbar, nicht änderbar; wieder aktivieren, einen Azubi nur mit aktivem Ausbilder. | M02-R03, M02-R10, M02-R19, M02-R20 | AK-204-01 bis AK-204-10 | Fachlogik |
| AK-205 | Deaktivierte Azubis erhalten keine Erinnerungen, und für sie entstehen keine neuen Wochenberichte. | M02-R19 | AK-205-01, AK-205-02 | Daten |
| AK-206 | Endgültiges Löschen nur nach ausdrücklicher Bestätigung; Person in fremder Historie nur deaktivierbar, „Deaktivieren“ wird angeboten. | M02-R21, M02-R22 | AK-206-01 bis AK-206-07 | Fachlogik |
| AK-207 | Der letzte aktive Ausbilder wird weder deaktiviert, gelöscht noch herabgestuft; niemand deaktiviert, löscht sich selbst oder ändert die eigene Rolle. | M02-R23, M02-R25 bis M02-R27 | AK-207-01 bis AK-207-08 | Fachlogik |
| AK-208 | Ausbilder mit zugeordneten Azubis erst nach Neuzuordnung deaktivierbar; fürs Löschen und Herabstufen zählen auch deaktivierte Azubis. | M02-R24, M02-R26 | AK-208-01 bis AK-208-05 | Fachlogik |
| AK-209 | Der Admin kann das Bundesland der Firma für die Feiertage einstellen. | M02-R28 | AK-209-01 bis AK-209-05 | Fachlogik |

Begründung der Ebene `Ablauf` (Entscheidung E1; Ablauf-Fälle seit G3, `specs/pruefung/format.md`, „Aufbau eines Ablauf-Falls“):

- **AK-101:** Dass es nur die Anmeldung über das Firmenkonto und kein eigenes Passwort gibt, zeigt sich nur im
  Anmeldeablauf mit dem Anmeldedienst; dafür gibt es keine Regel, die sich ohne ihn aufrufen ließe.
- **AK-106:** Abmelden und der anschließende Zugriffsversuch sind ein Ablauf über Sitzung und Anmeldedienst; ohne
  Sitzung gibt es dazu keine Fachlogik.

AK-205 wirkt beim Anlegen der Wochen (M03) und beim Planen der Erinnerung (M08); M02 liefert dafür nur „aktiv“. Ihre
Prüffälle nutzen deshalb Schnittstelle und Aktionen von M08 (`erinnerungenPlanen`, `erinnerung_ausloesen`,
`nachrichten_lesen`, `wochen_lesen`; `format.md`, „Schnittstellen und Aktionen von M08“).

Nicht als Fachlogik geprüft werden außerdem Teile, die nur der Ablauf zeigt: die Meldungstexte („Kein Zugang – bitte an
den Ausbilder wenden“, „Zugriff verweigert“, die Meldung am Feld), dass eine Deaktivierung eine laufende Sitzung sofort
beendet (M02-R04), das Löschen der Berichte samt Historie (M02-R21) und gleichzeitige Änderungen (M02-R27). Sie bleiben
in G2 mit den bestehenden Tests belegt (`docs/03-testabdeckung.md`).

## 5. Logisches Datenmodell

| Entität | Feld | Pflicht | Wertebereich | Bemerkung |
| --- | --- | --- | --- | --- |
| Person | Schlüssel | ja | eindeutig | interne Kennung; ändert sich nie |
| Person | Name | ja | Text, 1 bis 200 Zeichen | ohne Leerzeichen am Rand |
| Person | Firmen-E-Mail | ja | gültige Adresse, höchstens 320 Zeichen | in Kleinbuchstaben gespeichert; eindeutig |
| Person | Rolle | ja | Azubi, Ausbilder | |
| Person | aktiv | ja | ja/nein | beim Anlegen ja; „Entfernen“ setzt nein |
| Person | Konto-ID | nein | Text | leer bis zum ersten Login („noch nie angemeldet“); eindeutig, sobald gesetzt; wird nie über die E-Mail geändert |
| Person | zugeordneter Ausbilder | bei Azubi ja | Person mit Rolle Ausbilder, nicht die Person selbst | bei Ausbildern leer |
| Person | Ausbildungsbeginn | bei Azubi ja | Kalendertag (M01) | bei Ausbildern leer |
| Person | Ausbildungsende | nein | Kalendertag, nicht vor dem Beginn | bei Ausbildern leer |
| Einstellung | Bundesland | ja | Kürzel nach M01-R13 | genau eine für die ganze App; Voreinstellung NW |
| Sitzung | Person, Beginn | ja | Zeitpunkt | gilt höchstens 8 Stunden; endet mit dem Abmelden |

Beziehungen:

- Ein Azubi hat genau einen zugeordneten Ausbilder; ein Ausbilder hat null bis viele zugeordnete Azubis.
- Eine Person besitzt als Azubi ihre Wochenberichte (M03, M04); Statuswechsel und Kommentare nennen die handelnde Person
  (M06).
- Endgültiges Löschen entfernt die Person, ihre Berichte und deren Historie. Statuswechsel und Kommentare der Person an
  Berichten anderer Azubis verhindern das Löschen (M02-R22).

Weitere Felder der Person gehören anderen Modulen: Kanäle für Benachrichtigungen (M08) und Darstellung hell/dunkel
(M09, UI-AK-14).

## 6. Schnittstellen

Angeboten (Formate und Fehlercodes in `specs/pruefung/format.md`, Abschnitt „Schnittstellen von M02 (Fachlogik)“):

| Schnittstelle | Ergebnis | Regeln |
| --- | --- | --- |
| `zugangPruefen(person)` | Zugang \| `konto_unbekannt` \| `person_deaktiviert` | M02-R03 |
| `anmeldungZuordnen(konto, ueberKontoId, ueberEmail)` | bekannt \| binden \| keine | M02-R07, M02-R08 |
| `darfBerichtSehen(person, bericht)` | erlaubt \| `zugriff_verweigert` | M02-R09 bis M02-R11 |
| `darfVerwalten(person)` | erlaubt \| `zugriff_verweigert` | M02-R12 |
| `personPruefen(daten, personen, ziel)` | geprüfte Person \| `eingabe_ungueltig` mit Feldern | M02-R06, M02-R14 bis M02-R17 |
| `aenderungPruefen(personen, ziel, handelnd, rolle)` | erlaubt \| `letzter_ausbilder` \| `azubis_zugeordnet` \| `eigene_person` | M02-R18, M02-R23 bis M02-R26 |
| `deaktivierenPruefen(personen, ziel, handelnd)` | erlaubt \| `bereits_deaktiviert` \| `letzter_ausbilder` \| `azubis_zugeordnet` \| `eigene_person` | M02-R19, M02-R23 bis M02-R26 |
| `reaktivierenPruefen(personen, ziel)` | erlaubt \| `bereits_aktiv` \| `ausbilder_deaktiviert` | M02-R20 |
| `loeschenPruefen(personen, ziel, handelnd, fremdeHistorie)` | erlaubt \| `letzter_ausbilder` \| `azubis_zugeordnet` \| `eigene_person` \| `fremde_historie` | M02-R22 bis M02-R26 |
| `namenBestaetigen(eingabe, name)` | bestätigt ja/nein | M02-R21 |
| `bundeslandEinstellen(person, bundesland)` | Bundesland \| `zugriff_verweigert` \| `bundesland_unbekannt` | M02-R28 |

Die Regeln der Nutzerverwaltung bekommen den ganzen Personenstand (alle Personen mit Rolle, aktiv und zugeordnetem
Ausbilder), weil „letzter aktiver Ausbilder“ und „zugeordnete Azubis“ vom Stand aller Personen abhängen.

Genutzt:

- M01: `istBundesland(kuerzel)` und die 16 Kürzel (M02-R28).
- M06: ob eine Person in fremder Historie vorkommt (Eingabe `fremdeHistorie` von `loeschenPruefen`).
- M05 nutzt Rolle und „aktiv“ aus M02 für das Prüfen; M04 für das Recht, einen Bericht zu ändern; M03 und M08 die aktiven
  Azubis mit ihrem Ausbildungszeitraum und zugeordneten Ausbilder.

## 7. Ereignisse

| Ereignis | Inhalt | Wer reagiert |
| --- | --- | --- |
| Person angelegt | Person, Rolle; bei Azubi zugeordneter Ausbilder und Ausbildungszeitraum | M03 legt die fälligen Wochen an |
| Person geändert | Person, alter und neuer Ausbildungszeitraum, Zuordnung | M03 ergänzt fehlende Wochen und berechnet „außerhalb der Ausbildung“ in offenen Berichten neu (Ergänzung zu AK-203); Benachrichtigungen gehen an den neu zugeordneten Ausbilder (M08) |
| Person deaktiviert | Person | M03 legt keine Wochen mehr an, M08 plant keine Erinnerungen und gibt Nachrichten an sie auf |
| Person wieder aktiviert | Person | M03 ergänzt fehlende Wochen |
| Person endgültig gelöscht | Person | ihre Berichte mit Historie entfallen (M03 bis M06) |
| Firmenkonto gebunden | Person, Konto-ID | – (nur Nachvollziehbarkeit) |
| Bundesland geändert | neues Bundesland | wirkt nur auf künftig angelegte Berichte und neu in die Ausbildung fallende Tage (M03); bestehende Berichte bleiben |

## 8. Anforderungen an die Plattform

- **Anmeldung über den Anmeldedienst der Firma:** Die Plattform meldet Personen über das Firmenkonto an und liest dabei
  die stabile Konto-ID und, nur für die Zuordnung beim ersten Login, die bestätigte E-Mail. Welche Angaben des
  Anmeldedienstes das sind, ist einstellbar (z. B. verschieden bei der Demo und beim Firmenkonto).
- **Kein eigenes Passwort:** Die App speichert keine Passwörter. Ein Test-Zugang ohne Firmenkonto ist im
  Produktivbetrieb immer aus, auch wenn die Konfiguration ihn einschaltet.
- **Jede Aktion prüft Rolle und Besitz selbst (M02-R13):** auf dem Server, bei jedem Aufruf, auch bei direkt
  eingegebenen Adressen und direkt ausgelösten Aktionen. Ausgeblendete Schaltflächen und Menüs sind kein Schutz.
- **Zugang bei jedem Zugriff prüfen (M02-R04):** gegen den aktuellen Stand der Person; eine Deaktivierung wirkt ohne
  Warten auf das Ende der Sitzung.
- **Sitzung (M02-R05):** höchstens 8 Stunden; Abmelden beendet die Sitzung der App und die Anmeldung beim
  Anmeldedienst.
- **Keine gemeinsame Umgehung (M02-R27):** Regeln der Nutzerverwaltung werden gegen den aktuellen Personenstand geprüft
  und unter Ausschluss gleichzeitiger Änderungen geschrieben.
- **Eindeutigkeit:** Firmen-E-Mail ohne Groß-/Kleinschreibung und Konto-ID sind eindeutig. Das Binden beim ersten Login
  schreibt nur, wenn die Person noch ungebunden und aktiv ist; melden sich zwei Sitzungen desselben Kontos gleichzeitig
  an, entsteht genau eine Bindung.
- **Löschen vollständig und geschützt:** Endgültiges Löschen entfernt Person, Berichte und deren Historie gemeinsam. Die
  Datenhaltung weist das Löschen einer Person in fremder Historie zusätzlich ab; die App erklärt das statt eines
  Fehlers.
- **Rollen in der App:** Rollen und Zuordnung pflegt der Admin in der App, nicht im Firmenkonto.

## 9. Bestätigte Auslegungen

| Datum | Auslegung | Herkunft |
| --- | --- | --- |
| 06.10.2026 | Angelegt wird mit Firmen-E-Mail, Name und Rolle; der erste Login ordnet über die vom Anmeldedienst bestätigte E-Mail zu (ohne Groß-/Kleinschreibung) und speichert die Konto-ID; danach zählt nur die Konto-ID, eine spätere E-Mail-Änderung bricht die Zuordnung nicht. | AK-201, Präzisierung Etappe 2; `docs/02-plan.md`, „Zuordnung beim Login“ |
| 06.10.2026 | Eine bereits gebundene Person wird nie über die E-Mail umgebunden; gebunden wird nur eine angelegte, aktive, noch nicht gebundene Person. | `docs/02-plan.md`, „Anmeldung und Zuordnung“ |
| 06.10.2026 | Sitzungen gelten 8 Stunden ohne Widerruf am Server; eine Deaktivierung wirkt trotzdem sofort, weil jeder Zugriff die Person prüft. | `docs/02-plan.md`, Entscheidung „Sitzungen“ |
| 06.10.2026 | Rollen und Zuordnung pflegt der Admin in der App, nicht im Firmenkonto; Zuordnung und Bundesland legt nur der Admin fest. | `docs/02-plan.md`, „Rollen und Zuordnung“; `docs/01`, bestätigte Annahmen (AK-202, AK-209) |
| 06.10.2026 | Eine deaktivierte Person kann wieder aktiviert werden, ein Azubi nur mit aktivem zugeordnetem Ausbilder. | AK-204, Ergänzung Etappe 2 |
| 06.10.2026 | Wer in der Historie von Berichten anderer Azubis vorkommt (Statuswechsel oder Kommentare), lässt sich nur deaktivieren; die Oberfläche erklärt das und bietet „Deaktivieren“ an. | AK-206, Ergänzung Etappe 2 (Entscheidung „Ausbilder mit Historie“) |
| 06.10.2026 | Kein Ausbilder deaktiviert oder löscht sich selbst oder ändert die eigene Rolle; ist er der letzte aktive Ausbilder, erscheint die Meldung zu AK-207. | AK-207, Ergänzung Etappe 2 |
| 06.10.2026 | Fürs Deaktivieren zählen nur aktive zugeordnete Azubis, fürs endgültige Löschen und Herabstufen alle. Ein Ausbilder mit Azubis wird erst nach Neuzuordnung deaktiviert. | AK-208, Präzisierung Etappe 2; `docs/01`, bestätigte Annahmen |
| 06.10.2026 | Ein geänderter Ausbildungszeitraum ergänzt Wochen und berechnet offene Berichte neu, gelöscht wird nichts (Regel bei M03). | AK-203, Ergänzung Etappe 3 |
| 07.10.2026 | Der Test-Zugang ohne Firmenkonto ist im Produktivbetrieb immer aus, auch wenn die Konfiguration ihn einschaltet. | `docs/02-plan.md`, Etappe 6 |
| 12.10.2026 | Anmeldung und Abmelden (AK-101, AK-106) sind nur im Ablauf prüfbar; ihre Prüffälle folgen in G3. | Entscheidung Chris E1, Plan G2 |

## 10. Offene Punkte

- [x] AK-205 ist seit G2 (Paket E, 13.10.2026) mit Ebene `Daten` belegt: AK-205-01 über die Erinnerung von M08
      (Fachlogik, `erinnerungenPlanen`), AK-205-02 als Daten-Fall mit dem Erinnerungslauf von M08, der vorher die
      fälligen Wochen anlegt (M03): Für die deaktivierte Anna entsteht keine neue Woche und keine Erinnerung, für einen
      aktiven Azubi beides. Der Vorschlag vom 13.10.2026 ist damit umgesetzt.
- [ ] **Bitte bestätigen:** Reihenfolge der Gründe bei mehreren zutreffenden Regeln (M02-R26). Sie entspricht dem
      heutigen Verhalten der App; fachlich vorgegeben ist nur „letzter aktiver Ausbilder vor eigener Person“ (AK-207).
- [ ] **Bitte bestätigen:** Wechselt ein Azubi mit Berichten zum Ausbilder, bleiben seine Berichte erhalten, bekommen
      aber keine neuen Wochen mehr. Die Spezifikation sagt dazu nichts; so verhält sich die App heute.
- [ ] „Nicht mehr änderbar“ aus AK-204 prüft M04 (Recht, einen Bericht zu ändern); das Prüfen durch einen Azubi aus
      AK-104 prüft M05 (Statuswechsel). Die Prüffälle dort verweisen auf diese AKs, gehören aber den AKs ihres Moduls.
- [ ] Auf Liferay ersetzen Anmeldung, Sitzung und Konten der Plattform die Regeln M02-R02, M02-R05 bis M02-R08; die
      Fälle von `anmeldungZuordnen` werden dort voraussichtlich „abweichend, begründet“ (Profil, G4).

# M05 Status und Prüfung

Stand: 13.10.2026 · Status: **Entwurf zur Freigabe** (Etappe G2) · @Chris

Fach-Spec nach `specs/vorlage-fach-spec.md`. Sie nennt keine Technik; wie die TypeScript-App die Regeln heute umsetzt,
steht in `specs/code-landkarte.md`, Abschnitt M05.

## 1. Zweck und Abgrenzung

M05 regelt den Lebenslauf eines Wochenberichts nach dem Erfassen:

- **Statusmodell:** vier Status, sechs erlaubte Übergänge, wer welchen Übergang auslösen darf.
- **Einreichen:** Pflichtangaben, Übernahme ungespeicherter Eingaben, Schreibschutz danach.
- **Zurückziehen**, solange noch nicht geprüft.
- **Prüfen:** Prüfliste, Freigeben, Ablehnen mit Gesamt- und Tageskommentaren, Vertretung.
- **Überarbeiten und Rücknahme:** erneut einreichen, Prüfrunden, Freigabe zurücknehmen.
- **Gleichzeitigkeit:** konkurrierende Aktionen auf demselben Bericht.
- **Bearbeitungsrecht nach Status:** In welchem Status der Azubi den Inhalt ändern darf.

Nicht in M05:

- Welche Berichte es gibt und wann ein Bericht als „offen“ gilt (M03, M03-R14); Inhalt und Speichern der Tage (M04).
- Wer einen Bericht überhaupt sehen darf und wer Ausbilder ist (M02: AK-103 bis AK-105, AK-204).
- Die Historie selbst: wie Statuswechsel und Kommentare angezeigt, nach Runden gruppiert und vor Änderung geschützt
  werden (M06, AK-801 bis AK-803). M05 nennt nur, was ein Statuswechsel in die Historie schreibt (M05-R22).
- Benachrichtigungen und Erinnerung (M08); M05 löst nur die Ereignisse aus (Abschnitt 7).
- Freigabevermerk im PDF (M07); Aussehen von Prüfliste, Schaltflächen und Dialogen (M09).

## 2. Begriffe

Zentrale Begriffe stehen in `specs/00-uebersicht.md`, „offen“ in M03, Rollen und Vertretung in M02. Für M05 gilt
zusätzlich:

| Begriff | Bedeutung |
| --- | --- |
| Status | einer von vier: Entwurf, Eingereicht, Freigegeben, Abgelehnt |
| Statuswechsel | ein erlaubter Übergang von einem Status in einen anderen, ausgelöst durch eine Person; landet in der Historie |
| Prüfen | Freigeben oder Ablehnen eines eingereichten Berichts durch einen Ausbilder |
| Geprüft | Ein Bericht ist geprüft, sobald er nach dem Einreichen freigegeben oder abgelehnt wurde |
| Prüfliste | Liste der eingereichten Berichte für die Ausbilder |
| Gesamtkommentar | Pflichttext des Ausbilders beim Ablehnen |
| Tageskommentar | optionaler Text des Ausbilders zu einem Tag beim Ablehnen |
| Begründung | Pflichttext des Ausbilders beim Zurücknehmen einer Freigabe |
| Rückmeldung | was der Azubi bei einem abgelehnten Bericht oben und bei den Tagen sieht: die Kommentare der letzten Ablehnung bzw. die Begründung der Rücknahme |
| Prüfrunde | Abschnitt im Leben eines Berichts von einer Einreichung bis zur nächsten; nummeriert ab 1 |
| Gesehener Stand | der Stand des Berichts, den eine Person vor sich hatte, als sie die Aktion auslöste |
| Versionsstand | Merkmal des gespeicherten Berichts, das sich bei jedem Statuswechsel ändert; daran erkennt die Plattform einen veralteten gesehenen Stand |
| Bearbeitbar | Der Azubi darf Tagesarten und Texte ändern und speichern (M04) |

## 3. Regeln

**Statusmodell**

- **M05-R01:** Ein Bericht hat genau einen von vier Status: Entwurf, Eingereicht, Freigegeben, Abgelehnt. Ein neu
  angelegter Bericht ist „Entwurf“ (M03-R01).
- **M05-R02:** Es gibt genau sechs Übergänge; jeder andere wird abgewiesen (`uebergang_unzulaessig`):

  | Aktion | von | nach | durch |
  | --- | --- | --- | --- |
  | einreichen | Entwurf | Eingereicht | Azubi |
  | zurückziehen | Eingereicht | Entwurf | Azubi |
  | freigeben | Eingereicht | Freigegeben | Ausbilder |
  | ablehnen | Eingereicht | Abgelehnt | Ausbilder |
  | erneut einreichen | Abgelehnt | Eingereicht | Azubi |
  | Freigabe zurücknehmen | Freigegeben | Abgelehnt | Ausbilder |

  Insbesondere: Einen Entwurf kann kein Ausbilder freigeben oder ablehnen (AK-607); einen freigegebenen oder
  abgelehnten Bericht kann niemand zurückziehen (AK-507); einen freigegebenen Bericht kann niemand einreichen, prüfen
  oder zurückziehen (AK-704).
- **M05-R03:** Die Aktionen des Azubis löst nur der eigene, aktive Azubi des Berichts aus. Die Aktionen des Ausbilders
  löst jeder aktive Ausbilder aus, auch ohne Zuordnung (Vertretung). Sonst `zugriff_verweigert`. Jede Aktion prüft das
  selbst (M02-R13).
- **M05-R04:** Einer Person werden genau die Aktionen angeboten, die M05-R02, M05-R03 und M05-R12 im aktuellen Status
  erlauben; alle anderen fehlen. Eine fehlende Schaltfläche ist kein Schutz: Die Aktion wird trotzdem geprüft.

**Einreichen**

- **M05-R05:** Einreichen (und erneut einreichen) geht nur, wenn jeder Tag innerhalb der Ausbildung eine Tagesart hat
  und jeder Tag mit „Betrieb“ oder „Berufsschule“ einen nicht leeren Text. Ein Text nur aus Leerraum (Leerzeichen,
  Tabulator, Zeilenumbruch) gilt als leer. Bei Urlaub, Krank und Feiertag ist kein Text nötig; ein eingetragener Text
  bleibt gespeichert und sichtbar. Tage außerhalb der Ausbildung sind keine Pflicht (M03-R08).
- **M05-R06:** Ist M05-R05 nicht erfüllt, wird nicht eingereicht. Jeder betroffene Tag wird in Kalenderreihenfolge
  benannt und markiert, mit „Tagesart fehlt“ bzw. „Tätigkeiten fehlen“ (`pflichtangaben_fehlen`).
- **M05-R07:** Eine Woche ganz außerhalb der Ausbildung (M03) wird nicht eingereicht, auch mit Inhalt
  (`woche_ausserhalb`). Die laufende Woche darf schon vor ihrem Ende eingereicht werden. Eine Woche nur aus Urlaub und
  Feiertagen muss eingereicht werden und bleibt bis dahin offen (M03-R14).
- **M05-R08:** Einreichen übernimmt die ungespeicherten Eingaben des Azubis: Sie werden zuerst wie beim Speichern
  geprüft (M04-R02, M04-R10) und gespeichert, dann gilt M05-R05 für den gespeicherten Stand. Ist eine Eingabe ungültig,
  wird nichts gespeichert (`tage_ungueltig`). Scheitert das Einreichen an M05-R05, bleiben die Eingaben als Entwurf
  gespeichert und der Status bleibt.

**Bearbeiten nach Status**

- **M05-R09:** Bearbeitbar ist ein Bericht nur in offenem Status (Entwurf, Abgelehnt; M03-R14) und nur für den
  eigenen, aktiven Azubi (M02). Ein eingereichter oder freigegebener Bericht ist schreibgeschützt
  (`nicht_bearbeitbar`). Ausbilder ändern nie den Inhalt; Prüfen ist ein Statuswechsel. Die Datenhaltung schützt
  eingereichte und freigegebene Berichte zusätzlich gegen Änderungen an der Fachlogik vorbei.
- **M05-R10:** Der Azubi kann einen eingereichten Bericht zurückziehen, solange er noch nicht geprüft ist. Danach ist
  er „Entwurf“, wieder bearbeitbar und nicht mehr in der Prüfliste.

**Prüfen**

- **M05-R11:** Die Prüfliste zeigt allen aktiven Ausbildern die eingereichten Berichte mit Azubi, Woche und
  Einreichungsdatum (Zeitpunkt der letzten Einreichung), älteste Einreichung zuerst. Voreinstellung: nur die Azubis,
  denen der Ausbilder zugeordnet ist; per Filter alle. Ein Azubi hat keine Prüfliste.
- **M05-R12:** Ist der Azubi deaktiviert, dürfen Ausbilder seinen eingereichten Bericht freigeben, aber nicht ablehnen,
  und eine Freigabe nicht zurücknehmen (`azubi_deaktiviert`); sonst entstünde ein abgelehnter Bericht, den niemand
  überarbeiten kann. Der Azubi selbst kann nichts mehr (M02). Der Bericht bleibt mit dem Hinweis „deaktiviert“ in der
  Prüfliste. Nach dem Wiederaktivieren gilt wieder alles.
- **M05-R13:** Freigeben setzt den Status „Freigegeben“; der Statuswechsel hält den Ausbilder sowie Datum und Uhrzeit
  fest (M05-R22). Beim Freigeben eingetippte Kommentare werden nicht gespeichert; der Bestätigungsdialog weist darauf
  hin.
- **M05-R14:** Ablehnen geht nur mit einem nicht leeren Gesamtkommentar (`kommentar_fehlt`); Tageskommentare allein
  genügen nicht. Zusätzlich kann der Ausbilder zu jedem Tag einen eigenen, optionalen Kommentar schreiben, auch zu einem
  Tag außerhalb der Ausbildung. Ein leerer Tageskommentar wird nicht gespeichert.
- **M05-R15:** Gesamtkommentar, jeder Tageskommentar und die Begründung einer Rücknahme fassen je bis zu 5.000 Zeichen
  (gezählt wie „Tätigkeiten“, M04). Sie werden unverändert gespeichert, nur Zeilenumbrüche einheitlich. Ein längerer
  Text wird am Feld abgewiesen (`text_zu_lang`); dann wird nichts gespeichert.
- **M05-R16:** Nach einer Ablehnung sieht der Azubi den Gesamtkommentar oben und jeden Tageskommentar beim jeweiligen
  Tag; nach einer Rücknahme sieht er oben die Begründung. Gezeigt wird nur die letzte Ablehnung bzw. Rücknahme und nur,
  solange der Bericht „Abgelehnt“ ist. Nach dem erneuten Einreichen stehen die Kommentare nur noch in der Historie (M06).

**Überarbeiten und Rücknahme**

- **M05-R17:** Ein abgelehnter Bericht ist für den Azubi bearbeitbar und erneut einreichbar; danach ist er
  „Eingereicht“ und wieder in der Prüfliste. Der Zyklus aus Ablehnen und erneutem Einreichen funktioniert beliebig oft.
- **M05-R18:** Jede Einreichung beginnt eine neue Prüfrunde, auch die erneute Einreichung nach dem Zurückziehen; die
  erste Einreichung beginnt Runde 1. Zurückziehen, Freigabe, Ablehnung, Rücknahme und Kommentare gehören zur laufenden
  Runde, die Rücknahme also zur Runde der Freigabe.
- **M05-R19:** Eine Freigabe nimmt nur ein Ausbilder zurück, und nur mit nicht leerer Begründung
  (`begruendung_fehlt`). Danach ist der Bericht „Abgelehnt“ und für den Azubi bearbeitbar. Außer durch diese Rücknahme
  kann niemand einen freigegebenen Bericht ändern, auch kein Ausbilder.

**Gleichzeitigkeit**

- **M05-R20:** Eine Aktion bezieht sich auf den Stand, den die Person gesehen hat. Hat sich der Bericht seitdem
  geändert, scheitert die spätere Aktion mit Meldung und ändert nichts:
  - Ausbilder prüft, der Azubi hat inzwischen zurückgezogen: „Bericht wurde zurückgezogen“ (`bericht_zurueckgezogen`).
  - Azubi zieht zurück, ein Ausbilder hat inzwischen geprüft; oder ein zweiter Ausbilder prüft denselben Stand:
    `bereits_geprueft`.
  - Dieselbe Aktion wurde auf diesem Stand schon ausgeführt: `bereits_eingereicht`, `bereits_zurueckgezogen`,
    `bereits_zurueckgenommen`.
  - Der Status ist gleich, der Bericht aber inzwischen geändert (z. B. zurückgezogen und erneut eingereicht):
    `inzwischen_geaendert`.

  Von zwei gleichzeitigen Aktionen auf demselben Stand gelingt genau eine.
- **M05-R21:** Treffen mehrere Gründe zu, wird einer gemeldet, in dieser Reihenfolge: Person, Rolle und Besitz
  (`zugriff_verweigert`); Status und gesehener Stand (`uebergang_unzulaessig`, M05-R20); deaktivierter Azubi
  (`azubi_deaktiviert`); Pflichttext und Länge (`kommentar_fehlt`, `begruendung_fehlt`, `text_zu_lang`); beim Einreichen
  dann Woche außerhalb, ungültige Eingaben, fehlende Pflichtangaben.

**Was ein Statuswechsel schreibt**

- **M05-R22:** Jeder gelungene Statuswechsel schreibt genau einen Historieneintrag mit altem und neuem Status, Person,
  Zeitpunkt (aus der Uhr von M01), Prüfrunde und bei einer Rücknahme der Begründung; bei einer Ablehnung zusätzlich den
  Gesamtkommentar und die Tageskommentare mit ihrer Runde. Ein gescheiterter Statuswechsel schreibt nichts. Wie die
  Historie gezeigt und geschützt wird, regelt M06.

## 4. Akzeptanzkriterien

Text aus `docs/01-spezifikation.md`, Kapitel 5 bis 7; Prüffälle in `specs/pruefung/M05.json`.

| AK-ID | Kriterium (Kurzfassung) | Regeln | Prüffälle | Ebene |
| --- | --- | --- | --- | --- |
| AK-501 | Ein offener Bericht lässt sich nur mit vollständigen Pflichtangaben einreichen (nur Leerzeichen gelten als leer); nicht bei Wochen ganz außerhalb; die laufende Woche schon vor ihrem Ende. | M05-R02, M05-R03, M05-R05, M05-R07 | AK-501-01 bis AK-501-11 | Fachlogik |
| AK-502 | Fehlt eine Pflichtangabe, wird nicht eingereicht; die Tage werden mit „Tagesart fehlt“ bzw. „Tätigkeiten fehlen“ benannt und markiert. | M05-R06 | AK-502-01 bis AK-502-03 | Fachlogik |
| AK-503 | Bei Urlaub, Krank und Feiertag ist kein Text nötig; ein eingetragener Text bleibt. | M05-R05 | AK-503-01, AK-503-02 | Fachlogik |
| AK-504 | Auch eine Woche nur aus Urlaub und Feiertagen muss eingereicht werden und zählt bis dahin als offen. | M05-R05, M05-R07 | AK-504-01, AK-504-02 | Fachlogik |
| AK-505 | Nach dem Einreichen „Eingereicht“ und schreibgeschützt; Einreichen speichert Eingaben mit, beim Scheitern bleiben sie als Entwurf; zusätzlich Schutz in der Datenhaltung. | M05-R08, M05-R09 | AK-505-01 bis AK-505-07 | Daten |
| AK-506 | Der Azubi kann einen eingereichten Bericht zurückziehen: wieder Entwurf, bearbeitbar, nicht mehr in der Prüfliste. | M05-R02, M05-R10 | AK-506-01 bis AK-506-03 | Daten |
| AK-507 | Ein freigegebener oder abgelehnter Bericht kann nicht zurückgezogen werden; die Schaltfläche fehlt. | M05-R02, M05-R04 | AK-507-01 bis AK-507-06 | Fachlogik |
| AK-508 | Zieht der Azubi zurück, während ein Ausbilder prüft, scheitert dessen Prüfung mit „Bericht wurde zurückgezogen“; umgekehrt scheitert das Zurückziehen nach der Prüfung. | M05-R20, M05-R21 | AK-508-01 bis AK-508-11 | Daten |
| AK-601 | Die Prüfliste zeigt eingereichte Berichte mit Azubi, Woche und Einreichungsdatum; standardmäßig eigene Azubis, per Filter alle. | M05-R11 | AK-601-01, AK-601-02 | Daten |
| AK-602 | Jeder Ausbilder darf jeden eingereichten Bericht freigeben oder ablehnen, auch ohne Zuordnung (Vertretung). | M05-R03, M05-R12 | AK-602-01 bis AK-602-07 | Daten |
| AK-603 | Bei der Freigabe wird der Status „Freigegeben“; Ausbilder sowie Datum und Uhrzeit werden gespeichert. | M05-R13, M05-R22 | AK-603-01, AK-603-02 | Daten |
| AK-604 | Ablehnen geht nur mit nicht leerem Gesamtkommentar; Kommentare und Begründung je bis 5.000 Zeichen. | M05-R14, M05-R15 | AK-604-01 bis AK-604-08 | Fachlogik |
| AK-605 | Optionale Tageskommentare zu jedem Tag, auch außerhalb der Ausbildung; beim Freigeben werden eingetippte Kommentare nicht gespeichert. | M05-R13, M05-R14 | AK-605-01 bis AK-605-03 | Daten |
| AK-606 | Nach einer Ablehnung sieht der Azubi Gesamt- und Tageskommentare, nach einer Rücknahme die Begründung; nach dem erneuten Einreichen nur noch in der Historie. | M05-R16 | AK-606-01 bis AK-606-03 | Daten |
| AK-607 | Berichte im Status „Entwurf“ kann der Ausbilder weder freigeben noch ablehnen. | M05-R02, M05-R04 | AK-607-01 bis AK-607-05 | Fachlogik |
| AK-701 | Ein abgelehnter Bericht ist bearbeitbar und erneut einreichbar; danach „Eingereicht“ und wieder in der Prüfliste. | M05-R09, M05-R17 | AK-701-01 bis AK-701-03 | Daten |
| AK-702 | Der Zyklus aus Ablehnen und erneutem Einreichen funktioniert beliebig oft (dreimal ablehnen, dann freigeben). | M05-R17, M05-R18 | AK-702-01 bis AK-702-06 | Daten |
| AK-703 | Eine Freigabe lässt sich nur mit nicht leerer Begründung zurücknehmen; danach „Abgelehnt“ und bearbeitbar. | M05-R19 | AK-703-01 bis AK-703-05 | Fachlogik |
| AK-704 | Außer durch die Rücknahme kann niemand einen freigegebenen Bericht ändern, auch kein Ausbilder. | M05-R02, M05-R09, M05-R19 | AK-704-01 bis AK-704-06 | Fachlogik |

Keine AK von M05 ist nur im Browser prüfbar; es gibt deshalb keine Markierung `Ablauf, G3`. Einzelne Teile betreffen
nur die Anzeige und werden hier über ihren fachlichen Kern geprüft; die Anzeige selbst prüfen heute die Browser-Tests
und ab G3 die Ablauf-Fälle:

- **AK-502:** die Markierung am Tag im Formular (Kern: `pflichtangaben_fehlen` mit den Tagen).
- **AK-507:** Schaltfläche fehlt oder ist gesperrt (Kern: `moeglicheAktionen`).
- **AK-605:** der Hinweis im Bestätigungsdialog beim Freigeben (Kern: Kommentare werden nicht gespeichert).
- **AK-606:** die Darstellung oben und beim Tag (Kern: Rückmeldung je Tag).
- **AK-505:** der Schutz in der Datenhaltung gegen Änderungen an der Fachlogik vorbei ist eine Anforderung an die
  Plattform (Abschnitt 8); ein neutraler Fall prüft den Schreibschutz über die Fachlogik.

Gehört M03, wird hier nur genutzt: „offen“ (M03-R14, AK-306). Gehört M02: Sichtbarkeit und Rollen (AK-103 bis AK-105,
AK-204). Gehört M06: Historie (AK-801 bis AK-803).

## 5. Logisches Datenmodell

M05 ändert den Status eines Berichts und legt Statuswechsel und Kommentare an. Die Entitäten „Statuswechsel“ und
„Kommentar“ beschreibt M06 vollständig; hier nur, was M05 schreibt.

| Entität | Feld | Pflicht | Wertebereich | Bemerkung |
| --- | --- | --- | --- | --- |
| Wochenbericht | Status | ja | Entwurf, Eingereicht, Freigegeben, Abgelehnt | Anfang „Entwurf“ (M03); ändert sich nur über M05-R02 |
| Wochenbericht | Versionsstand | ja | fortlaufend | ändert sich mit jedem Statuswechsel; Grundlage für M05-R20 |
| Statuswechsel | Bericht | ja | Wochenbericht | |
| Statuswechsel | alter Status, neuer Status | ja | Status | ein erlaubter Übergang nach M05-R02 |
| Statuswechsel | Person | ja | Person | wer den Wechsel ausgelöst hat |
| Statuswechsel | Zeitpunkt | ja | Zeitpunkt | „jetzt“ aus M01; Anzeige in Berliner Zeit |
| Statuswechsel | Prüfrunde | ja | ganze Zahl ab 1 | nach M05-R18 |
| Statuswechsel | Begründung | nein | Text, 1 bis 5.000 Zeichen | nur bei der Rücknahme einer Freigabe |
| Statuswechsel | Reihenfolge | ja | fortlaufend | eindeutige Reihenfolge auch bei gleichem Zeitpunkt |
| Kommentar | Bericht, Prüfrunde | ja | | Runde der Ablehnung |
| Kommentar | Tag | nein | ein Tag des Berichts | leer = Gesamtkommentar |
| Kommentar | Person, Zeitpunkt | ja | | wie beim Statuswechsel der Ablehnung |
| Kommentar | Text | ja | Text, 1 bis 5.000 Zeichen | Zeilenumbrüche einheitlich |

Statuswechsel und Kommentare werden nie geändert oder gelöscht (M06).

## 6. Schnittstellen

Angeboten (Formate und Fehlercodes in `specs/pruefung/format.md`, „Schnittstellen und Aktionen von M05“):

| Schnittstelle | Ergebnis | Regeln |
| --- | --- | --- |
| `uebergangPruefen(aktion, person, bericht, gesehen, text)` | alter und neuer Status, gespeicherter Text \| Fehlercode | M05-R02, M05-R03, M05-R12, M05-R14, M05-R15, M05-R19 bis M05-R21 |
| `moeglicheAktionen(person, bericht)` | die angebotenen Aktionen | M05-R04 |
| `einreichenPruefen(tage)` | einreichbar \| `pflichtangaben_fehlen` mit Tagen | M05-R05, M05-R06 |
| `darfBearbeiten(person, bericht)` | bearbeitbar ja/nein | M05-R09 |
| `pruefrunde(aktion, einreichungen)` | Runde des neuen Statuswechsels | M05-R18 |

Als Abläufe der Plattform mit gespeichertem Bestand (Daten-Fälle, Aktionen in `format.md`): einreichen (mit
ungespeicherten Eingaben), zurückziehen, freigeben, ablehnen (mit Tageskommentaren), erneut einreichen, Freigabe
zurücknehmen, jeweils mit gesehenem Stand; Prüfliste lesen; Rückmeldung lesen.

Genutzt:

- M01: „jetzt“ für den Zeitpunkt des Statuswechsels.
- M02: Rolle und „aktiv“ der handelnden Person und des Azubis, Zuordnung Azubi → Ausbilder (Prüfliste), Sichtbarkeit
  (`darfBerichtSehen`).
- M03: offener Status (M03-R14), Woche ganz außerhalb der Ausbildung, Markierung „außerhalb“ je Tag.
- M04: Prüfung und Speichern der Tageseingaben beim Einreichen (M05-R08), Zählweise der Zeichen.
- M06: Statuswechsel und Kommentare des Berichts für die Rückmeldung (M05-R16) und die Zahl der bisherigen Einreichungen
  (M05-R18).

## 7. Ereignisse

Jeder gelungene Statuswechsel löst genau ein Ereignis aus, in derselben Transaktion wie der Wechsel. Gemeinsamer Inhalt:
Bericht (Azubi, Woche), handelnde Person, alter und neuer Status, Prüfrunde, Zeitpunkt.

| Ereignis | Zusätzlicher Inhalt | Wer reagiert |
| --- | --- | --- |
| Bericht eingereicht | ob erneut eingereicht (nach einer Ablehnung) | M06 schreibt den Eintrag; M08 informiert den zugeordneten Ausbilder |
| Bericht zurückgezogen | – | M06 schreibt den Eintrag; keine Nachricht |
| Bericht freigegeben | – | M06 schreibt den Eintrag; M08 informiert den Azubi; M07 druckt den Freigabevermerk |
| Bericht abgelehnt | Gesamtkommentar, Tageskommentare je Tag | M06 schreibt Eintrag und Kommentare; M08 informiert den Azubi |
| Freigabe zurückgenommen | Begründung | M06 schreibt den Eintrag mit Begründung; M08 informiert den Azubi; M07 druckt keinen Freigabevermerk mehr |

Ein gescheiterter Statuswechsel löst kein Ereignis aus.

## 8. Anforderungen an die Plattform

- **Eine Transaktion:** Statuswechsel, Historieneintrag, Kommentare und Benachrichtigung entstehen zusammen oder gar
  nicht. Beim Einreichen gehört das Speichern der Tageseingaben dazu; scheitert nur die Pflichtprüfung, bleiben die
  gespeicherten Eingaben als Entwurf erhalten (M05-R08).
- **Versionsstand:** Konkurrierende Änderungen werden über einen Versionsstand des Berichts erkannt. Die Plattform
  bekommt mit jeder Aktion den gesehenen Stand und wechselt nur, wenn Status und Versionsstand noch stimmen; sonst
  scheitert die spätere Aktion mit Meldung (M05-R20). Von zwei gleichzeitigen Aktionen gelingt genau eine.
- **Sperre:** Während ein Statuswechsel läuft, warten Speichern (M04) und andere Statuswechsel desselben Berichts;
  geprüft wird der Stand, der beim Wechsel tatsächlich gilt.
- **Prüfung auf dem Server:** Rolle, Besitz, Status, gesehener Stand und Pflichttexte prüft jede Aktion selbst,
  unabhängig von der Oberfläche.
- **Schreibschutz in der Datenhaltung:** Tage eingereichter und freigegebener Berichte lassen sich auch an der
  Fachlogik vorbei nicht ändern (AK-505).
- **„Jetzt“ nur aus der Uhr von M01**, für Tests stellbar; Zeitpunkte werden unabhängig von der Zeitzone des Servers
  gespeichert und in Berliner Zeit angezeigt.
- **Feste Fehlergründe:** Jede Ablehnung hat einen festen Grund, unabhängig vom Meldungstext (für die Prüffälle).

## 9. Bestätigte Auslegungen

| Datum | Auslegung | Herkunft |
| --- | --- | --- |
| 06.10.2026 | Wochen ganz außerhalb der Ausbildung lassen sich nicht einreichen, auch mit Inhalt; die laufende Woche darf vor ihrem Ende eingereicht werden. | AK-501, Ergänzung Etappe 4 |
| 06.10.2026 | Markiert wird am Tag mit „Tagesart fehlt“ bzw. „Tätigkeiten fehlen“. | AK-502, Ergänzung Etappe 4 |
| 06.10.2026 | Einreichen speichert ungespeicherte Änderungen mit; scheitert die Prüfung auf dem Server, bleiben sie als Entwurf gespeichert. Eingereichte und freigegebene Berichte schützt zusätzlich die Datenhaltung. | AK-505, Ergänzung Etappe 4 |
| 06.10.2026 | Gesamtkommentar, Tageskommentare und Begründung fassen je bis zu 5.000 Zeichen. | AK-604, Ergänzung Etappe 4 |
| 06.10.2026 | Tageskommentare an jedem Tag, auch außerhalb der Ausbildung; beim Freigeben werden eingetippte Kommentare nicht gespeichert, der Bestätigungsdialog weist darauf hin. | AK-605, Ergänzung Etappe 4 |
| 06.10.2026 | Nach einer Rücknahme sieht der Azubi oben die Begründung; nach dem erneuten Einreichen stehen die Kommentare nur noch in der Historie. | AK-606, Ergänzung Etappe 4 |
| 06.10.2026 | Prüfrunde: Jede Einreichung beginnt eine neue Runde, auch nach dem Zurückziehen; Rücknahme gehört zur Runde der Freigabe. | `docs/01`, „Statusmodell“, Etappe 4 |
| 06.10.2026 | Deaktivierter Azubi: freigeben ja, ablehnen und Freigabe zurücknehmen nein; Bericht bleibt mit Hinweis „deaktiviert“ in der Prüfliste; nach dem Wiederaktivieren gilt wieder alles. | `docs/01`, „Statusmodell“, Etappe 4 |
| 06.10.2026 | Statusübergänge als bedingter Wechsel „nur wenn Status und Versionsstand noch stimmen“; das Formular schickt den gesehenen Stand mit. „Offen“ ist zentral definiert (heute M03-R14). | `docs/02`, „Statusübergänge“, Etappe 4 |
| 12.10.2026 | Bearbeitbarkeit nur nach Status (M04); Definition „offen“ zentral in M03. | Bestätigung Chris mit #18/#19 |

## 10. Offene Punkte

- [ ] **Bitte bestätigen:** neue Fehlercodes und Aktionen in `format.md` („Schnittstellen und Aktionen von M05“),
      insbesondere die Unterscheidung der Konflikte nach M05-R20 (`bericht_zurueckgezogen`, `bereits_geprueft`,
      `bereits_eingereicht`, `bereits_zurueckgezogen`, `bereits_zurueckgenommen`, `inzwischen_geaendert`) statt eines
      einzigen Codes.
- [ ] **Bitte bestätigen:** „einreichen“ und „erneut einreichen“ sind zwei Aktionen (wie im Statusdiagramm); aus
      „Abgelehnt“ ist nur „erneut einreichen“ möglich (Prüffall AK-501-06).
- [ ] **Bitte bestätigen:** Reihenfolge der Gründe nach M05-R21 (so verhielt sich die App schon vor G2).
- [ ] Echte Gleichzeitigkeit (zwei Aktionen im selben Augenblick) prüft kein neutraler Fall, weil der Gewinner nicht
      feststeht; die Daten-Fälle stellen sie über den gesehenen Stand nach. Jede Plattform weist M05-R20 („genau eine
      gelingt“) mit eigenen Tests nach.
- [ ] Ablauf-Fälle für die Anzeige (Markierung am Tag, fehlende Schaltflächen, Hinweis im Dialog, Rückmeldung beim Tag)
      folgen in G3.

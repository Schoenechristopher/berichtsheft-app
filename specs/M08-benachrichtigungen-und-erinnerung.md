# M08 Benachrichtigungen und Erinnerung

Stand: 13.10.2026 · Status: **Entwurf zur Freigabe** (Etappe G2) · @Chris

Fach-Spec nach `specs/vorlage-fach-spec.md`. Sie nennt keine Technik; wie die TypeScript-App die Regeln heute umsetzt,
steht in `specs/code-landkarte.md`, Abschnitt M08.

## 1. Zweck und Abgrenzung

M08 informiert Personen über Ereignisse an ihren Berichten und erinnert an offene Wochen:

- **Benachrichtigungen** zu Statuswechseln aus M05: wer bei welchem Ereignis eine Nachricht bekommt und was darin steht.
- **Kanäle:** E-Mail, Teams und App, je Person frei wählbar.
- **Versand:** genau eine Nachricht je Ereignis, Empfänger und Kanal; Wiederholung nach Fehlschlag, Aufgeben, nicht
  zustellbare Nachrichten.
- **App-Benachrichtigungen:** Zähler ungelesener Nachrichten und Liste.
- **Erinnerung** montags um 9:00 Uhr an den Azubi und Information an den zugeordneten Ausbilder, mit Nachholen.
- **Rücksprung nach der Anmeldung:** Der Link einer Nachricht führt nach der Anmeldung direkt zum Ziel.

Nicht in M08:

- Wann ein Bericht „offen“ ist (M03, M03-R14) und wann Wochenberichte entstehen (M03).
- Die Statuswechsel selbst und ihre Ereignisse (M05, Abschnitt 7); M08 reagiert nur darauf.
- Wer aktiv oder deaktiviert ist und wer welchem Ausbilder zugeordnet ist (M02); M08 nutzt beides.
- Die Anmeldung selbst (M02); M08 regelt nur, wohin es danach geht.
- „Jetzt“, Wochen und Berliner Zeit (M01).
- Aussehen von Glocke, Liste, Einstellungen und Postfach (M09).

## 2. Begriffe

Zentrale Begriffe stehen in `specs/00-uebersicht.md`, „offen“ in M03, Rollen, „aktiv“ und Zuordnung in M02. Für M08
gilt zusätzlich:

| Begriff | Bedeutung |
| --- | --- |
| Kanal | Weg einer Nachricht: E-Mail, Teams oder App |
| Benachrichtigung | eine Nachricht an genau einen Empfänger über genau einen Kanal zu genau einem Ereignis |
| Ereignis | Anlass einer Nachricht: ein Statuswechsel aus M05 oder der Erinnerungslauf einer Woche |
| Anlass | eingereicht, erneut eingereicht, freigegeben, abgelehnt, Freigabe zurückgenommen, Erinnerung, überfällig |
| Versandlauf | ein Durchgang, der alle fälligen, noch nicht versendeten Nachrichten an E-Mail und Teams übergibt |
| Zugestellt | E-Mail oder Teams: vom Kanal angenommen; App: angelegt |
| Aufgegeben | nach zu vielen Fehlversuchen oder weil der Empfänger deaktiviert ist, nicht mehr versendet |
| Nicht zustellbar | aufgegebene E-Mail- und Teams-Nachrichten, die Ausbilder sehen und erneut versuchen können |
| Ungelesen | App-Nachricht, deren Liste der Empfänger seit dem Anlegen noch nicht geöffnet hat |
| Stichtag | Montag 9:00 Uhr Berliner Zeit der laufenden Woche |
| Erinnerungslauf | einmal pro Woche: prüft zum Stichtag alle aktiven Azubis und legt Erinnerungen und Informationen an |
| Vorwoche | die Woche vor der Woche des Stichtags |
| Überfällig | eine Woche, die am Stichtag offen ist und vor der Vorwoche liegt, also schon am Montag davor offen war |
| Erinnerung | Nachricht an den Azubi mit allen offenen Wochen vor der laufenden |
| Information | Nachricht an den zugeordneten Ausbilder mit allen überfälligen Wochen eines Azubis |
| Rücksprungziel | die geschützte Seite, die jemand ohne Anmeldung aufgerufen hat; nach der Anmeldung geht es dorthin |

## 3. Regeln

**Empfänger bei Statuswechseln**

- **M08-R01:** Zu den Ereignissen aus M05 (Abschnitt 7) gehen Nachrichten an:

  | Ereignis | Anlass | Empfänger |
  | --- | --- | --- |
  | Bericht eingereicht | eingereicht | zugeordneter Ausbilder |
  | Bericht eingereicht, erneut (nach Ablehnung oder Rücknahme) | erneut eingereicht | zugeordneter Ausbilder |
  | Bericht freigegeben | freigegeben | Azubi |
  | Bericht abgelehnt | abgelehnt | Azubi |
  | Freigabe zurückgenommen | Freigabe zurückgenommen | Azubi |
  | Bericht zurückgezogen | – | niemand |

  Andere Ausbilder (Vertretung) bekommen nie eine Nachricht, auch wenn sie selbst prüfen.
- **M08-R02:** Ein Empfänger, der beim Ereignis deaktiviert ist, bekommt nichts. Hat der Azubi keinen zugeordneten
  Ausbilder, geht beim Einreichen keine Nachricht raus.
- **M08-R03:** Ein gescheiterter Statuswechsel löst keine Nachricht aus. Nachrichten zu einem Statuswechsel entstehen
  zusammen mit ihm oder gar nicht (M05, Abschnitt 8).

**Kanäle**

- **M08-R04:** Jede Person wählt selbst eine beliebige Kombination aus E-Mail, Teams und App, auch keinen Kanal.
  Doppelt genannte Kanäle zählen einmal; gespeichert wird in der Reihenfolge E-Mail, Teams, App. Ein unbekannter
  Kanal wird abgewiesen und ändert nichts (`kanal_unbekannt`). Jede Person ändert nur ihre eigenen Kanäle; eine
  deaktivierte Person nichts (`zugriff_verweigert`).
- **M08-R05:** Neue Personen haben die Voreinstellung E-Mail + App.
- **M08-R06:** Je Ereignis und Empfänger entsteht genau eine Nachricht je gewähltem Kanal. Ohne Kanal entsteht keine;
  der Status des Berichts bleibt in der App sichtbar. Wer alle Kanäle abwählt, bekommt auch keine Erinnerungen.
- **M08-R07:** Es gelten die Kanäle, die beim Ereignis eingestellt sind. Geänderte Kanäle wirken ab dem nächsten
  Ereignis; schon angelegte, noch nicht versendete Nachrichten gehen über ihren ursprünglichen Kanal raus.

**Inhalt und Link**

- **M08-R08:** Jede Nachricht nennt Anlass, Azubi und Woche und verlinkt den Bericht: Betreff mit Anlass, Azubi und
  Woche; der Text nennt Anlass, Azubi und Woche mit Zeitraum. Kommentar- und Begründungstexte stehen nicht in der
  Nachricht, nur der Hinweis, dass sie im Bericht stehen.
- **M08-R09:** Nennt eine Nachricht mehrere Wochen, steht im Text jede Woche mit eigenem Link, in aufsteigender
  Reihenfolge; der Link in der App führt dann zur Übersicht (beim Azubi die eigene, beim Ausbilder die des Azubis).
- **M08-R10:** Wer ohne Anmeldung eine geschützte Seite aufruft (z. B. über den Link einer Nachricht), landet nach der
  Anmeldung direkt dort, auch mit Parametern. Rücksprungziel ist nur ein Pfad innerhalb der App; fremde Adressen,
  Adressen auf einen anderen Rechner, Steuerzeichen, die Anmeldung, „Kein Zugang“ und die Startseite selbst werden
  ignoriert, dann geht es zur Startseite.

**Versand**

- **M08-R11:** Je Ereignis, Empfänger und Kanal geht genau eine Nachricht raus. Ein zweites Anlegen desselben Ereignisses
  und ein weiterer Versandlauf erzeugen keine Dublette; zwei gleichzeitige Versandläufe übergeben jede Nachricht nur
  einmal.
- **M08-R12:** Eine App-Nachricht wird nicht versendet; sie gilt beim Anlegen als zugestellt.
- **M08-R13:** Scheitert der Versand einer E-Mail- oder Teams-Nachricht, wird er wiederholt, frühestens nach einer
  Wartezeit, die mit jedem Fehlversuch wächst: nach dem n-ten Fehlversuch 30 Sekunden × 2^(n−1), höchstens eine Stunde.
  Nach dem 8. Fehlversuch wird aufgegeben.
- **M08-R14:** An einen Empfänger, der beim Versand deaktiviert ist, wird nichts mehr versendet; die Nachricht wird
  ohne Versuch aufgegeben.
- **M08-R15:** Aufgegebene E-Mail- und Teams-Nachrichten sind „nicht zustellbar“. Jeder aktive Ausbilder sieht sie mit
  Empfänger, Kanal, Anlass, Zeitpunkt des letzten Versuchs und Fehlermeldung, neueste zuerst, dazu ihre Anzahl; Azubis
  sehen sie nicht (`zugriff_verweigert`). „Erneut versuchen“ (nur Ausbilder) nimmt eine Nachricht an einen aktiven
  Empfänger mit neuer Zählung der Versuche in den nächsten Versandlauf; an einen deaktivierten Empfänger nicht
  (`nicht_wiederholbar`).

**App**

- **M08-R16:** Der Kanal App zeigt die Zahl der ungelesenen eigenen App-Nachrichten. Das Öffnen der Liste zeigt die
  eigenen App-Nachrichten, neueste zuerst, hebt die bis dahin ungelesenen als „Neu“ hervor und markiert alle als
  gelesen. Eine Vorschau (z. B. der letzten Nachrichten) markiert nichts.

**Erinnerung**

- **M08-R17:** Der Erinnerungslauf gehört zum Stichtag Montag 9:00 Uhr Berliner Zeit (Sommer- und Winterzeit). Er läuft
  höchstens einmal pro Woche. Lief er um 9:00 Uhr nicht, wird er einmal nachgeholt, sobald die Plattform zwischen
  Montag 9:00 Uhr und Dienstag 23:59 Uhr derselben Woche läuft; Stichtag bleibt der Montag. Ab Mittwoch 0:00 Uhr wird
  diese Woche nicht mehr nachgeholt.
- **M08-R18:** Vor der Prüfung entstehen die fälligen Wochenberichte (M03), damit die laufende Woche zählt.
- **M08-R19:** Jeder aktive Azubi mit mindestens einem Kanal, der am Stichtag offene Wochen (M03-R14) vor der laufenden
  Woche hat, bekommt eine Erinnerung mit allen diesen Wochen in einer Nachricht, älteste zuerst. Eingereichte und
  freigegebene Wochen, die laufende Woche und Wochen ganz außerhalb der Ausbildung zählen nie. Abgelehnte Wochen sind
  offen.
- **M08-R20:** Ist mindestens eine dieser Wochen überfällig (vor der Vorwoche), bekommt der zugeordnete, aktive
  Ausbilder eine Information mit allen überfälligen Wochen dieses Azubis, eine Nachricht pro Azubi, über seine eigenen
  Kanäle. Es zählt der Status am Stichtag, auch bei abgelehnten Wochen. Das gilt auch, wenn der Azubi keinen Kanal hat.
- **M08-R21:** Erinnerung und Information gehen jeden Montag erneut raus, solange die Woche offen ist; nach dem
  Einreichen nicht mehr (auch wenn sie noch nicht geprüft ist).
- **M08-R22:** Deaktivierte Azubis bekommen keine Erinnerung, ihr Ausbilder keine Information zu ihnen (AK-205, M02).

## 4. Akzeptanzkriterien

Text aus `docs/01-spezifikation.md`, Kapitel 10 und „Benachrichtigungen und Erinnerung“; Prüffälle in
`specs/pruefung/M08.json`.

| AK-ID | Kriterium (Kurzfassung) | Regeln | Prüffälle | Ebene |
| --- | --- | --- | --- | --- |
| AK-1001 | Beim Einreichen wird der zugeordnete Ausbilder benachrichtigt, andere Ausbilder nicht. | M08-R01, M08-R02 | AK-1001-01 bis AK-1001-04 | Fachlogik |
| AK-1002 | Bei Freigabe, Ablehnung und Rücknahme wird der Azubi benachrichtigt; erneutes Einreichen benachrichtigt den Ausbilder wie das erste, Zurückziehen niemanden. | M08-R01 | AK-1002-01 bis AK-1002-07 | Fachlogik |
| AK-1003 | Jede Nachricht nennt Azubi, Woche und Anlass und verlinkt den Bericht; ohne Kommentartexte; mehrere Wochen je mit Link; Rücksprung nach der Anmeldung, fremde Adressen ignoriert. | M08-R08 bis M08-R10 | AK-1003-01 bis AK-1003-08 | Fachlogik |
| AK-1004 | Pro Ereignis und Kanal genau eine Nachricht; Wiederholung mit Wartezeit; Aufgeben nach Fehlversuchen oder bei deaktiviertem Empfänger; „Nicht zustellbare Nachrichten“ mit „Erneut versuchen“. | M08-R03, M08-R11 bis M08-R15 | AK-1004-01 bis AK-1004-12 | Daten |
| AK-1011 | Jede Person kann E-Mail, Teams und App beliebig kombinieren, auch alle abwählen. | M08-R04 | AK-1011-01 bis AK-1011-05 | Fachlogik |
| AK-1012 | Neue Personen haben die Voreinstellung E-Mail + App. | M08-R05 | AK-1012-01, AK-1012-02 | Fachlogik |
| AK-1013 | Nur über die gewählten Kanäle; ohne Kanal keine Nachricht, der Status bleibt in der App sichtbar. | M08-R06 | AK-1013-01 bis AK-1013-05 | Fachlogik |
| AK-1014 | Geänderte Kanäle gelten ab dem nächsten Ereignis; angelegte, noch nicht versendete Nachrichten über den ursprünglichen Kanal. | M08-R07 | AK-1014-01, AK-1014-02 | Daten |
| AK-1015 | Der Kanal App zeigt ungelesene Nachrichten mit Zähler; das Öffnen der Liste markiert alle als gelesen, die ungelesenen sind dabei „Neu“. | M08-R16 | AK-1015-01 | Daten |
| AK-1021 | Ist die Vorwoche am Montag um 9:00 Uhr noch offen, erhält der Azubi eine Erinnerung; einmal nachgeholt bis Dienstag 23:59 Uhr, Stichtag bleibt Montag. | M08-R17 bis M08-R19 | AK-1021-01 bis AK-1021-17 | Daten |
| AK-1022 | Ist dieselbe Woche am folgenden Montag noch offen, wird zusätzlich der zugeordnete Ausbilder informiert; jede offene Woche vor der Vorwoche, auch abgelehnte; eine Nachricht pro Azubi; Azubi ohne Kanal: Ausbilder trotzdem. | M08-R20 | AK-1022-01 bis AK-1022-06; Beispielszenario AK-1022-07 (`szenarien.json`, Ablauf) | Fachlogik |
| AK-1023 | Für eingereichte oder freigegebene Wochen und für die laufende Woche kommt keine Erinnerung. | M08-R19 | AK-1023-01 bis AK-1023-05 | Fachlogik |
| AK-1024 | Erinnerung und Information gehen jeden Montag erneut raus, bis die Woche eingereicht ist. | M08-R21 | AK-1024-01 bis AK-1024-04 | Daten |
| AK-1025 | Sind mehrere Wochen offen, nennt die Erinnerung alle in einer Nachricht. | M08-R09, M08-R19 | AK-1025-01, AK-1025-02 | Fachlogik |

Keine AK von M08 ist nur im Browser prüfbar; es gibt deshalb keine Markierung `Ablauf, G3`. Die Ebene nennt die
Hauptebene; mehrere AKs haben Fälle beider Ebenen (z. B. AK-1001-04, AK-1021-13 bis AK-1021-17 als Daten-Fälle).
Einzelne Teile betreffen nur die Anzeige oder einen echten Dienst und werden hier über ihren fachlichen Kern geprüft;
die Anzeige selbst prüfen heute die Browser-Tests und ab G3 die Ablauf-Fälle:

- **AK-1003:** der Wortlaut von Betreff und Text und der Link im Text (Kern: Anlass, Azubi, Wochen und Ziel der
  Nachricht); dass der Link nach der Anmeldung tatsächlich dort landet (Kern: `ruecksprungZiel`).
- **AK-1004:** Versand über einen echten Mail- oder Teams-Dienst und die Kennung gegen Duplikate beim Empfänger (Kern:
  Übergaben an einen Test-Kanal je Nachricht); echte Gleichzeitigkeit zweier Versandläufe (siehe Abschnitt 10).
- **AK-1015:** Glocke mit Zähler und Hervorhebung „Neu“ (Kern: Zahl der ungelesenen und `neu` je Nachricht).

AK-205 (deaktivierte Azubis erhalten keine Erinnerungen) gehört M02; ihre Prüffälle in `specs/pruefung/M02.json`
nutzen die Schnittstelle `erinnerungenPlanen` und die Aktionen `erinnerung_ausloesen`, `nachrichten_lesen` und
`wochen_lesen` von M08. Gehört M03: „offen“ (M03-R14, AK-306). Gehört M05: die Ereignisse.

## 5. Logisches Datenmodell

| Entität | Feld | Pflicht | Wertebereich | Bemerkung |
| --- | --- | --- | --- | --- |
| Person | Kanäle | ja | Teilmenge von E-Mail, Teams, App | Voreinstellung E-Mail + App (M08-R05); leer erlaubt |
| Benachrichtigung | Ereignis | ja | Statuswechsel oder Erinnerungslauf (Woche des Stichtags, Azubi, Erinnerung bzw. Information) | fachlicher Schlüssel des Anlasses |
| Benachrichtigung | Empfänger | ja | Person | |
| Benachrichtigung | Kanal | ja | E-Mail, Teams, App | Kanal zum Zeitpunkt des Ereignisses (M08-R07) |
| Benachrichtigung | Bericht | nein | Wochenbericht | leer, wenn die Nachricht mehrere Wochen nennt |
| Benachrichtigung | Betreff, Text | ja | Text | fertig zum Versand, ohne Kommentartexte (M08-R08) |
| Benachrichtigung | Link | nein | Pfad in der App | Bericht oder Übersicht (M08-R09) |
| Benachrichtigung | angelegt | ja | Zeitpunkt | „jetzt“ aus M01 |
| Benachrichtigung | zugestellt am | nein | Zeitpunkt | bei App = angelegt |
| Benachrichtigung | gelesen am | nein | Zeitpunkt | nur App (M08-R16) |
| Benachrichtigung | Versuche | ja | ganze Zahl ab 0 | Fehlversuche und der erfolgreiche Versuch |
| Benachrichtigung | nächster Versuch | ja | Zeitpunkt | anfangs = angelegt; nach Fehlschlag nach M08-R13 |
| Benachrichtigung | letzter Fehler | nein | Text | Meldung des Kanals |
| Benachrichtigung | aufgegeben am | nein | Zeitpunkt | M08-R13, M08-R14 |
| Erinnerungslauf | Woche des Stichtags | ja | Woche | höchstens ein Lauf je Woche (M08-R17) |
| Erinnerungslauf | Zeitpunkt, Anzahl | ja | Zeitpunkt, ganze Zahl | wann gelaufen, wie viele Nachrichten angelegt |
| Teams-Postfach (Demo) | Benachrichtigung, Empfänger, Inhalt | ja | | höchstens eine Nachricht je Benachrichtigung |

Eindeutig: Benachrichtigung je Ereignis, Empfänger und Kanal (M08-R11).

## 6. Schnittstellen

Angeboten (Formate und Fehlercodes in `specs/pruefung/format.md`, „Schnittstellen und Aktionen von M08“):

| Schnittstelle | Ergebnis | Regeln |
| --- | --- | --- |
| `kanaeleWaehlen(werte)` | gespeicherte Kanäle \| `kanal_unbekannt` | M08-R04 |
| `voreinstellungKanaele()` | Kanäle neuer Personen | M08-R05 |
| `benachrichtigungenPlanen(aktion, woche, azubi, ausbilder)` | Nachrichten je Empfänger und Kanal mit Anlass, Azubi, Wochen, Ziel | M08-R01, M08-R02, M08-R06, M08-R08 |
| `erinnerungenPlanen(azubis)` mit „jetzt“ = Stichtag | Erinnerungen und Informationen | M08-R09, M08-R19 bis M08-R22 |
| `erinnerungFaellig(zeitpunkt)` | Woche, Stichtag, fällig ja/nein | M08-R17 |
| `wartezeitNachFehlversuch(versuche)` | Sekunden bis zum nächsten Versuch | M08-R13 |
| `ruecksprungZiel(ziel)` | Ziel oder keines | M08-R10 |

Als Abläufe der Plattform mit gespeichertem Bestand (Daten-Fälle, Aktionen in `format.md`): Kanäle einstellen und
lesen, Erinnerungslauf auslösen, Versandlauf (über einen Test-Kanal, nie einen echten Dienst), Nachrichten lesen,
ungelesene zählen, Liste öffnen, nicht zustellbare lesen, erneut versuchen, Wochen eines Azubis lesen.

Genutzt:

- M01: „jetzt“, Woche eines Zeitpunkts, Montag einer Woche, Berliner Zeit.
- M02: Rolle, „aktiv“ und Zuordnung Azubi → Ausbilder; Ausbilder sein für „nicht zustellbar“.
- M03: „offen“ und „ganz außerhalb der Ausbildung“ je Woche (M03-R14), Anlegen der fälligen Wochen.
- M05: die Ereignisse der Statuswechsel (Abschnitt 7) und ihre Transaktion.

## 7. Ereignisse

M08 löst keine Ereignisse für andere Module aus. Es reagiert auf die Ereignisse von M05 (M08-R01) und auf den
Zeitpunkt Montag 9:00 Uhr (M08-R17). Ergebnis sind Benachrichtigungen; was eine Person in der App sieht, zeigt M09.

## 8. Anforderungen an die Plattform

- **Eine Transaktion mit dem Statuswechsel:** Nachrichten zu einem Statuswechsel entstehen in derselben Transaktion wie
  der Wechsel (M05, Abschnitt 8). Der Versand geschieht danach, getrennt davon (Ausgangskorb).
- **Genau einmal:** Eindeutigkeit je Ereignis, Empfänger und Kanal in der Datenhaltung. Mehrere gleichzeitige
  Versandläufe übergeben eine Nachricht nie doppelt; jede wird erst nach erfolgreicher Übergabe als zugestellt
  markiert. Bricht die Plattform zwischen Übergabe und Markierung ab, darf sie erneut übergeben; der Kanal muss die
  Wiederholung erkennen können (feste Kennung je Nachricht).
- **Zeitgesteuerter Lauf:** montags 9:00 Uhr in Europe/Berlin, nie in der Zeitzone des Servers; Nachholen beim Start
  und regelmäßig bis Dienstag 23:59 Uhr; höchstens ein Lauf pro Woche, auch bei mehreren gleichzeitigen Läufen
  (Vermerk der Woche in derselben Transaktion wie die Nachrichten).
- **„Jetzt“ nur aus der Uhr von M01**, für Tests stellbar; der Erinnerungslauf lässt sich für Vorführung und Test von
  Hand mit gestellter Uhr auslösen (nie im Produktivbetrieb).
- **Externe Dienste nur über austauschbare Kanäle:** E-Mail, Teams und App sind getrennt angebunden und per
  Konfiguration gewählt. Tests nutzen nie einen echten Dienst. Teams landet in der Demo im Teams-Postfach der App; eine
  produktive Installation bietet das Postfach nur an, wenn es ausdrücklich eingeschaltet ist.
- **Prüfung auf dem Server:** Kanäle ändert nur die Person selbst; „nicht zustellbar“ und „Erneut versuchen“ prüfen die
  Rolle selbst, unabhängig von der Oberfläche.
- **Feste Gründe:** Jede Ablehnung hat einen festen Grund, unabhängig vom Meldungstext (für die Prüffälle).

## 9. Bestätigte Auslegungen

| Datum | Auslegung | Herkunft |
| --- | --- | --- |
| 07.10.2026 | Jede Person wählt eine beliebige Kombination aus E-Mail, Teams und App, auch keinen; Voreinstellung E-Mail + App; wer alles abwählt, bekommt auch keine Erinnerungen. | `docs/01`, „Benachrichtigungen und Erinnerung“, Etappe 6 |
| 07.10.2026 | Erneutes Einreichen benachrichtigt den zugeordneten Ausbilder wie das erste; Zurückziehen benachrichtigt niemanden. | AK-1002, Ergänzung Etappe 6 |
| 07.10.2026 | Kommentar- und Begründungstexte stehen nicht in der Nachricht; bei mehreren Wochen jede Woche mit eigenem Link, der Link in der App führt zur Übersicht. Rücksprung nach der Anmeldung für jede geschützte Seite, fremde Adressen ignoriert. | AK-1003, Ergänzung Etappe 6 |
| 07.10.2026 | Wiederholung mit Wartezeit; nach mehreren Fehlversuchen oder bei deaktiviertem Empfänger aufgegeben; „Nicht zustellbare Nachrichten“ mit „Erneut versuchen“ für Ausbilder, Azubis sehen die Liste nicht. | AK-1004, Ergänzung Etappe 6 |
| 07.10.2026 | Wartezeit 30 Sekunden bis eine Stunde, wachsend; nach 8 Versuchen aufgegeben. | `docs/02`, „Benachrichtigungen“, Etappe 6 |
| 07.10.2026 | Geänderte Kanäle gelten ab dem nächsten Ereignis; schon angelegte Nachrichten gehen über den ursprünglichen Kanal; an einen inzwischen deaktivierten Empfänger wird nichts versendet. | AK-1014, Ergänzung Etappe 6 |
| 07.10.2026 | Das Öffnen der Liste markiert alle als gelesen; die bis dahin ungelesenen sind dabei als „Neu“ hervorgehoben. | AK-1015, Präzisierung Etappe 6 |
| 07.10.2026 | Verpasster Montag: einmal nachgeholt zwischen Montag 9:00 Uhr und Dienstag 23:59 Uhr derselben Woche; Stichtag bleibt Montag; jede Woche höchstens einmal. | AK-1021, Ergänzung Etappe 6 |
| 07.10.2026 | Überfällig = am Stichtag offen und vor der Vorwoche, auch abgelehnt; Status am Stichtag zählt; eine Information pro Azubi; Azubi ohne Kanal: Ausbilder trotzdem informiert. | AK-1022, Präzisierung Etappe 6 |
| 07.10.2026 | Die wöchentliche Erinnerung läuft bis zur Einreichung weiter. | `docs/01`, „Begriffe und bestätigte Annahmen“ |
| 07.10.2026 | Beispielszenario „Erinnerung“: Annas Wochen vor KW 41 sind eingereicht oder freigegeben. | `docs/01`, Beispielszenarien, Etappe 7 |
| 07.10.2026 | Teams in der Demo: Teams-Postfach in der App; Azubis sehen eigene, Ausbilder alle Nachrichten; produktiv nur, wenn ausdrücklich eingeschaltet. | `docs/01`, „Benachrichtigungen und Erinnerung“, Etappe 7 |
| 06.10.2026 | Wochen ganz außerhalb der Ausbildung zählen nie als offen, auch nicht für die Erinnerung. | AK-306, Ergänzung Etappe 3 (M03) |
| 12.10.2026 | Definition „offen“ zentral in M03 (M03-R14); M08 verweist darauf. | Bestätigung Chris mit #18/#19 |

## 10. Offene Punkte

- [ ] **Bitte bestätigen:** neue Schnittstellen, Aktionen, Kanal- und Anlassnamen und die Fehlercodes `kanal_unbekannt`
      und `nicht_wiederholbar` in `format.md` („Schnittstellen und Aktionen von M08“).
- [ ] **Bitte bestätigen:** Die Wartezeiten (M08-R13: 30 s × 2^(n−1), höchstens 1 h, Aufgeben nach 8 Fehlversuchen)
      stehen bisher nur im Plan (`docs/02`); als Regel sind sie für alle Plattformen verbindlich.
- [ ] **Bitte bestätigen:** „Erneut versuchen“ darf jeder aktive Ausbilder (auch die Vertretung), nicht nur der
      zugeordnete; so verhält sich die App heute.
- [ ] Echte Gleichzeitigkeit (zwei Versandläufe oder zwei Erinnerungsläufe im selben Augenblick) prüft kein neutraler
      Fall, weil die Reihenfolge nicht feststeht; die Daten-Fälle prüfen „kein zweiter Lauf“ und „keine Dublette“
      nacheinander. Jede Plattform weist M08-R11 und M08-R17 mit eigenen Tests nach.
- [x] Die Datenhaltung weist Erinnerungsläufe mit einer Wochennummer außerhalb 1 bis 53 ab (Migration
      `20261013100000_erinnerungslauf_wochennummer`, Test AK-1024 in `tests/db/reminders.test.ts`); ob KW 53 im Jahr vorkommt,
      bestimmt der Stichtag aus M01.
- [ ] Ablauf-Fälle für die Anzeige (Glocke, Liste „Neu“, Wortlaut der Nachricht, tatsächlicher Rücksprung nach der
      Anmeldung) folgen in G3.

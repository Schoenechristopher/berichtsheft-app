# Q Plattform und Qualität

Stand: 14.10.2026 · Status: **Entwurf zur Freigabe** (Etappe G3) · @Chris

Fach-Spec nach `specs/vorlage-fach-spec.md` für das Querschnittsmodul. Sie nennt keine Technik; welche Browser-Tests
der TypeScript-App die Regeln heute belegen, steht in `specs/code-landkarte.md` und in `docs/03-testabdeckung.md`.

## 1. Zweck und Abgrenzung

Q legt fest, unter welchen Bedingungen eine Umsetzung als „funktioniert“ gilt, unabhängig vom Modul:

- **Browser-Matrix:** Die App funktioniert in den aktuellen Versionen von Edge, Chrome und Firefox (AK-1101).
- **Smartphone-Breite:** Bei 375 px sind alle Kernfunktionen und Seiten ohne waagerechtes Scrollen bedienbar (AK-1102).
- **Testdaten:** Alle Plattformen prüfen mit denselben Testpersonen (`specs/pruefung/testdaten.json`).
- **Beispielszenarien:** Die drei Szenarien aus `docs/01-spezifikation.md` laufen als Ablauf-Fälle
  (`specs/pruefung/szenarien.json`) auf jeder Plattform.
- **Testgrenzen:** Wo ein Prüfwerkzeug einen Ablauf in einem Browser nachweislich nicht treu nachstellen kann, wird das
  benannt, begründet und freigegeben, nie still ausgelassen.

Nicht in Q:

- Die Fachregeln selbst (M01 bis M08) und das Aussehen der Oberfläche (M09). Q verlangt nur, dass sie in jedem Browser
  und bei jeder Breite gleich gelten.
- Breiten 1024 und 1280 px, Barrierefreiheit und Tastaturbedienung: M09 (UI-AK-01, 06, 16, 17).
- Leistung, Last und Betrieb: nicht im Umfang der Spezifikation.

## 2. Begriffe

Allgemeine Begriffe stehen in `specs/00-uebersicht.md`.

| Begriff | Bedeutung |
| --- | --- |
| Browser-Matrix | die Browser, in denen jeder Ablauf-Fall und jeder Browser-Test läuft: Chrome (Chromium), Firefox, Edge |
| Smartphone-Breite | Ansicht mit 375 px Breite, Touch und mobilem Viewport |
| Waagerechtes Scrollen | Der Inhalt einer Seite ist breiter als die Ansicht, sodass sie sich seitlich verschieben lässt |
| Kernfunktionen | erfassen, einreichen, zurückziehen, prüfen, kommentieren, exportieren, Einstellungen (AK-1102) |
| Testdaten | Anna (Azubi), Bernd und Clara (Ausbilder), Dora und Emil (Firmenkonten ohne Eintrag); nur Testpersonen |
| Beispielszenario | durchgehender Ablauf über mehrere Rollen aus `docs/01`, „Beispielszenarien“ |
| Testgrenze | ein Ablauf-Fall, der in genau einem Browser übersprungen wird, weil das Prüfwerkzeug ihn dort nicht treu nachstellen kann; mit Begründung und Freigabe |

## 3. Regeln

- **Q-R01:** Jeder Ablauf-Fall (alle Module, auch die Szenarien) läuft in jedem Browser der Matrix und muss dort dasselbe
  Ergebnis liefern. Einen Ablauf-Fall, der nur in einem Browser gilt, gibt es nicht. (AK-1101)
- **Q-R02:** Jeder Ablauf-Fall läuft zusätzlich bei Smartphone-Breite und muss dort dasselbe Ergebnis liefern; die
  Aktionen sind auch mit Touch und Menü-Schublade ausführbar. (AK-1102)
- **Q-R03:** Bei 375 px entsteht auf keiner Seite waagerechtes Scrollen: Übersicht, Woche erfassen, Prüfliste und
  Prüfansicht, Nutzerverwaltung, Benachrichtigungen, Nicht zustellbar, Einstellungen, Anmelden, Kein Zugang. Das gilt
  auch für geöffnete Dialoge. (AK-1102)
- **Q-R04:** Alle Prüfungen verwenden nur die Testdaten aus `testdaten.json`; Personen, die ein Fall zusätzlich braucht,
  legt er im Ausgangsbestand an. Echte Personendaten kommen in Tests, Logs und Artefakten nicht vor.
- **Q-R05:** Die drei Beispielszenarien aus `docs/01` sind Ablauf-Fälle in `szenarien.json`. Ihre ID beginnt mit der
  AK-ID, die das Szenario im Kern belegt, `modul` ist das Modul dieser AK (nicht Q).
- **Q-R06:** Eine Testgrenze gilt für genau einen Fall in genau einem Browser, nennt ihren Grund und die Freigabe durch
  Chris und erscheint im Bericht als übersprungen mit dieser Begründung. Dieselbe Regel muss in diesem Browser durch einen
  anderen Fall belegt sein.

## 4. Akzeptanzkriterien

Text aus `docs/01-spezifikation.md`, Kapitel 11; Prüffälle in `specs/pruefung/Q.json`.

| AK-ID | Kriterium (Kurzfassung) | Regeln | Prüffälle | Ebene |
| --- | --- | --- | --- | --- |
| AK-1101 | Die Web-App funktioniert in Edge, Chrome und Firefox; nachgewiesen, indem alle Browser-Tests in allen drei Browsern laufen. | Q-R01, Q-R06 | AK-1101-01 | Ablauf |
| AK-1102 | Bei 375 px sind alle Kernfunktionen und Seiten ohne waagerechtes Scrollen bedienbar. | Q-R02, Q-R03 | AK-1102-01 | Ablauf |

Begründung der Ebene: Beide Kriterien sprechen über Browser und Bildschirmbreite; eine Schnittstelle ohne Oberfläche
gibt es dafür nicht.

- **AK-1101:** Belegt durch die gesamte Browser-Matrix: Der Ablauf-Runner führt jeden Ablauf-Fall in Chrome, Firefox und
  Edge aus (Q-R01). AK-1101-01 ist zusätzlich ein eigener Kernablauf (erfassen, speichern, einreichen, freigeben, Historie
  lesen), damit die AK einen Prüffall mit ihrer ID hat.
- **AK-1102:** Der Ablauf-Runner führt jeden Ablauf-Fall auch bei 375 px aus (Q-R02). AK-1102-01 stellt das Gerät auf
  375 px (`geraet`) und liest mit `ansicht_lesen` auf jeder Seite aus Q-R03 (auch mit offener Rückfrage beim Einreichen
  und Ablehnen), ob sie waagerecht scrollt; dabei werden erfasst, eingereicht und freigegeben. „Kein Zugang“ fehlt im
  Fall, weil der Ablauf keine Person ohne Eintrag anmelden kann; die Seite prüft `e2e/ak-1102-smartphone.spec.ts`.

**Beispielszenarien** (`specs/pruefung/szenarien.json`, Q-R05):

| Szenario (`docs/01`) | Prüffall | Modul | Was der Fall prüft |
| --- | --- | --- | --- |
| Einreichen scheitert an fehlendem Text | AK-502-04 | M05 | Anna erfasst KW 52/2026 Mo–Do, ändert Freitag (Feiertag) auf Berufsschule ohne Text; Einreichen scheitert mit `pflichtangaben_fehlen`, Freitag `taetigkeiten_fehlen`; Status bleibt Entwurf |
| Vertretung nimmt Freigabe zurück | AK-703-06 | M05 | Bernd gibt KW 40 frei, Clara (nicht zugeordnet) nimmt die Freigabe mit Begründung zurück; Status Abgelehnt; Annas Historie zeigt Einreichen, Bernds Freigabe und Claras Rücknahme |
| Erinnerung und Information an den Ausbilder | AK-1022-07 | M08 | Ausgangsbestand: KW 36–40 eingereicht und freigegeben, KW 41 Entwurf. Erinnerungslauf am 12.10.2026: Anna hat eine Erinnerung für KW 41, Bernd nur die Statuswechsel aus dem Ausgangsbestand. Lauf am 19.10.2026: Anna eine weitere Erinnerung (KW 41 und 42, daher ohne einzelne Woche), Bernd die Information über KW 41 |

Was die Szenarien noch nicht im Ablauf prüfen und wo es belegt ist: Vorbelegung „Feiertag“ am 25.12.2026 (M03,
Fachlogik und Daten), Begründung in der Historie (M06, Daten), Benachrichtigung an Anna nach der Rücknahme (M08, Daten),
PDF ohne Freigabevermerk (M07, AK-905), die Kanäle E-Mail und Teams (M08, Daten). Die Browser-Tests `e2e/beispielszenarien.spec.ts` decken die Szenarien weiterhin
vollständig ab.

## 5. Logisches Datenmodell

Q hat keinen eigenen Datenbestand. Die Testdaten stehen in `specs/pruefung/testdaten.json`:

| Schlüssel | Rolle | Angelegt | Bemerkung |
| --- | --- | --- | --- |
| `anna` | Azubi | ja | Ausbildungsbeginn 01.09.2026, Ausbilder Bernd |
| `bernd` | Ausbilder | ja | Anna zugeordnet |
| `clara` | Ausbilder | ja | niemandem zugeordnet (Vertretung) |
| `dora` | – | nein | Firmenkonto ohne Eintrag in der App (AK-102) |
| `emil` | – | nein | Firmenkonto, das der Admin im Test erst anlegt (AK-201) |

Bundesland der Testdaten: `NW`.

## 6. Schnittstellen

Q bietet keine fachliche Schnittstelle. Es nutzt die Aktionen und Seiteninhalte der Ablauf-Fälle
(`specs/pruefung/format.md`, „Aufbau eines Ablauf-Falls“), für die Szenarien zusätzlich `freigabe_zuruecknehmen`,
`erinnerung_ausloesen`, den Ausgangsbestand mit Berichten und den Seiteninhalt der Benachrichtigungen; AK-1102-01 nutzt
`geraet` und `ansicht_lesen`.

## 7. Ereignisse

Keine.

## 8. Anforderungen an die Plattform

- **Browser:** aktuelle Versionen von Chrome, Firefox und Edge; keine browserabhängige Fachlogik.
- **Breite:** bedienbar ab 375 px ohne waagerechtes Scrollen, mit Touch; bis 320 px bzw. 200 % Vergrößerung ohne Verlust
  (M09).
- **Prüfbarkeit:** Uhr und Testdaten der laufenden App lassen sich für Ablauf-Fälle stellen, nur außerhalb des
  Produktivbetriebs; Ablauf-Fälle lesen Ergebnisse über feste Merker, nicht über Meldungstexte.
- **Prüfwerkzeug:** Der Ablauf-Runner einer Plattform führt alle Ablauf-Fälle in jedem Browser der Matrix und bei
  375 px aus.
- **Öffentliche Prüfläufe:** Logs und Artefakte enthalten nur Testdaten.

**Testgrenzen** (Q-R06; für TypeScript in `e2e/pruefung/testgrenzen.ts`):

| Fall | Browser | Grund | Ersatzbeleg | Freigabe |
| --- | --- | --- | --- | --- |
| AK-408-03 (Neuladen mit bestätigter Warnung) | Firefox | Playwright kann in Firefox „Neuladen mit bestätigtem Dialog beim Verlassen“ nicht treu nachstellen: `page.reload()` zeigt den Dialog nicht, ein Neuladen per Seitenskript setzt die Navigation nach dem Bestätigen nicht fort. | Dieselbe Warnung ist in Firefox über AK-408-05 belegt; in Chrome, Edge und bei 375 px läuft AK-408-03. | Chris, 13.10.2026 (Option A) |

Die Testgrenze ist eine Grenze des Werkzeugs, nicht der App. **In G5 erneut prüfen** (neuere Playwright- oder
Firefox-Version, anderer Weg zum Neuladen); entfällt sie, wird der Eintrag gelöscht. Eine Liferay-Umsetzung übernimmt sie
nur, wenn ihr Prüfwerkzeug dieselbe Grenze zeigt; sonst läuft der Fall dort auch in Firefox.

## 9. Bestätigte Auslegungen

| Datum | Auslegung | Herkunft |
| --- | --- | --- |
| 07.10.2026 | AK-1101 ist nachgewiesen, wenn alle Browser-Tests in Chromium, Firefox und Edge laufen. | `docs/01`, Ergänzung AK-1101 (Etappe 7) |
| 07.10.2026 | AK-1102 gilt auch für Übersicht, Prüfliste, Nutzerverwaltung, Benachrichtigungen, Nicht zustellbar, Anmelden und Kein Zugang. | `docs/01`, Ergänzung AK-1102 (Etappe 7) |
| 07.10.2026 | Im Szenario „Erinnerung“ sind Annas Wochen vor KW 41 (KW 36–40) eingereicht oder freigegeben. | `docs/01`, Präzisierung (Etappe 7) |
| 13.10.2026 | Testgrenze AK-408-03 in Firefox (Option A); in G5 erneut prüfen. | `FORTSCHRITT.md`, G3 Welle 1 |

## 10. Offene Punkte

- [x] AK-1102-01 (kein waagerechtes Scrollen, Ablauf) mit dem Prüfvokabular von Paket I (14.10.2026).
- [x] Szenario „Erinnerung und Information an den Ausbilder“ als AK-1022-07, mit `ausgangsbestand` im Ablauf-Runner
      und `erinnerung_ausloesen` (14.10.2026).
- [ ] Testgrenze AK-408-03 in Firefox in G5 erneut prüfen.
- [ ] **Bitte bestätigen:** `erinnerung_ausloesen` ist der einzige Ablauf-Schritt ohne `als`, weil der Lauf keiner
      Person gehört; neue feste Merker `data-art` und `data-woche` an den Benachrichtigungen.
- [ ] **Bitte bestätigen:** Die Szenarien tragen die ID und das Modul der AK, die sie im Kern belegen (AK-502, AK-703,
      AK-1022), statt einer eigenen Szenario-ID; so bleibt das ID-Schema aus `format.md` unverändert.
- [ ] **Liferay (Profil, G4):** ob Edge und Firefox mit dem Prüfwerkzeug der Liferay-Umsetzungen laufen und ob
      Liferay 6.2.5 bei 375 px ohne waagerechtes Scrollen erreichbar ist (Theme der Plattform).

import { describe, expect, it } from "vitest";
import {
  CHANNELS,
  DEFAULT_CHANNELS,
  NO_CHANNEL_WARNING,
  noticeFor,
  parseChannels,
  planReminders,
  planTransitionNotifications,
  reminderWeeks,
  retryDelaySeconds,
  type Channel,
  type Recipient,
  type ReminderTrainee,
  type ReminderWeek,
  type TransitionNotificationInput,
} from "./notifications";
import type { ReportStatus } from "./report-access";
import { REPORT_ACTIONS, type ReportAction } from "./report-status";

const BASE = "https://berichtsheft.example.test";
const bernd: Recipient = { id: "bernd", name: "Bernd Ausbilder", active: true, channels: ["EMAIL", "APP"] };
const anna: Recipient = { id: "anna", name: "Anna Azubi", active: true, channels: ["EMAIL", "APP"] };

function transition(action: ReportAction, overrides: Partial<TransitionNotificationInput> = {}) {
  return planTransitionNotifications({
    statusChangeId: "sc-1",
    action,
    report: { id: "r-41", isoYear: 2026, isoWeek: 41 },
    trainee: { ...anna, trainer: bernd },
    actor: { name: action === "SUBMIT" || action === "RESUBMIT" ? "Anna Azubi" : "Clara Ausbilderin" },
    baseUrl: BASE,
    ...overrides,
  });
}

const recipients = (drafts: { recipientId: string; channel: Channel }[]) =>
  drafts.map((draft) => `${draft.recipientId}:${draft.channel}`);

describe("Benachrichtigungen bei Statuswechseln (AK-1001 – AK-1003)", () => {
  it("AK-1001 Einreichen benachrichtigt nur den zugeordneten Ausbilder, keine Vertretung und nicht den Azubi", () => {
    expect(recipients(transition("SUBMIT"))).toEqual(["bernd:EMAIL", "bernd:APP"]);
    expect(recipients(transition("RESUBMIT"))).toEqual(["bernd:EMAIL", "bernd:APP"]);
  });

  it("AK-1001 ohne zugeordneten oder mit deaktiviertem Ausbilder geht niemand eine Nachricht", () => {
    expect(transition("SUBMIT", { trainee: { ...anna, trainer: null } })).toEqual([]);
    expect(transition("SUBMIT", { trainee: { ...anna, trainer: { ...bernd, active: false } } })).toEqual([]);
  });

  it("AK-1002 Freigabe, Ablehnung und Rücknahme der Freigabe benachrichtigen den Azubi", () => {
    for (const action of ["APPROVE", "REJECT", "REVOKE_APPROVAL"] as const) {
      expect(recipients(transition(action))).toEqual(["anna:EMAIL", "anna:APP"]);
    }
  });

  it("AK-1002 Zurückziehen löst keine Benachrichtigung aus (Vorschlag), alle anderen Wechsel genau einen Anlass", () => {
    expect(transition("WITHDRAW")).toEqual([]);
    expect(REPORT_ACTIONS.filter((action) => noticeFor(action) === null)).toEqual(["WITHDRAW"]);
  });

  it("AK-1003 Nachricht nennt Azubi, Woche und Anlass und verlinkt den Bericht", () => {
    const [email, app] = transition("SUBMIT");
    expect(email.subject).toBe("Bericht eingereicht: Anna Azubi, KW 41/2026");
    expect(email.body).toContain("Hallo Bernd Ausbilder,");
    expect(email.body).toContain("Anlass: Bericht eingereicht");
    expect(email.body).toContain("Azubi: Anna Azubi");
    expect(email.body).toContain("Woche: KW 41/2026 (05.10.2026 – 09.10.2026)");
    expect(email.body).toContain(`Zum Bericht: ${BASE}/berichte/r-41`);
    expect(email.link).toBe("/berichte/r-41");
    expect(email.reportId).toBe("r-41");
    expect(app).toMatchObject({ subject: email.subject, body: email.body, link: email.link });

    const [revoked] = transition("REVOKE_APPROVAL");
    expect(revoked.subject).toBe("Freigabe zurückgenommen: Anna Azubi, KW 41/2026");
    expect(revoked.body).toContain("Clara Ausbilderin hat die Freigabe Ihres Wochenberichts KW 41/2026");
  });

  it("AK-1003 Basis-URL mit Schrägstrich am Ende ergibt keinen doppelten", () => {
    const [email] = transition("APPROVE", { baseUrl: `${BASE}/` });
    expect(email.body).toContain(`${BASE}/berichte/r-41`);
  });

  it("AK-1004 Ereignisschlüssel ist der Historieneintrag: pro Ereignis, Empfänger und Kanal genau eine Zeile", () => {
    const drafts = transition("APPROVE", { trainee: { ...anna, channels: ["EMAIL", "TEAMS", "APP"], trainer: bernd } });
    expect(drafts.map((draft) => draft.eventKey)).toEqual([
      "status-change:sc-1",
      "status-change:sc-1",
      "status-change:sc-1",
    ]);
    expect(new Set(recipients(drafts)).size).toBe(3);
  });
});

describe("Kanäle (AK-1011 – AK-1014)", () => {
  it("AK-1011 jede Kombination aus E-Mail, Teams und App ist erlaubt, auch keine", () => {
    expect(parseChannels(["TEAMS"])).toEqual(["TEAMS"]);
    expect(parseChannels(["APP", "EMAIL", "TEAMS", "APP"])).toEqual(["EMAIL", "TEAMS", "APP"]);
    expect(parseChannels([])).toEqual([]);
    expect(parseChannels(["SMS"])).toBeNull();
    expect(NO_CHANNEL_WARNING).toContain("keine Erinnerungen");
  });

  it("AK-1012 Voreinstellung für neue Personen ist E-Mail + App", () => {
    expect(DEFAULT_CHANNELS).toEqual(["EMAIL", "APP"]);
  });

  it("AK-1013 benachrichtigt wird nur über die gewählten Kanäle; ohne Kanal keine Zeile", () => {
    const only = (channels: Channel[]) => transition("APPROVE", { trainee: { ...anna, channels, trainer: bernd } });
    expect(recipients(only(["TEAMS"]))).toEqual(["anna:TEAMS"]);
    expect(recipients(only([...CHANNELS]))).toEqual(["anna:EMAIL", "anna:TEAMS", "anna:APP"]);
    expect(only([])).toEqual([]);
  });

  it("AK-1013 deaktivierte Empfänger bekommen nichts", () => {
    expect(transition("APPROVE", { trainee: { ...anna, active: false, trainer: bernd } })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Erinnerung
// ---------------------------------------------------------------------------

/** Montag 9:00 Uhr in Berlin. */
const monday = (date: string) => new Date(`${date}T09:00:00+02:00`);

function week(isoWeek: number, status: ReportStatus = "DRAFT", extra: Partial<ReminderWeek> = {}): ReminderWeek {
  return { isoYear: 2026, isoWeek, status, hasContent: false, hasHistory: false, reportId: `r-${isoWeek}`, ...extra };
}

function trainee(weeks: ReminderWeek[], overrides: Partial<ReminderTrainee> = {}): ReminderTrainee {
  return {
    ...anna,
    trainingStart: new Date("2026-09-01T00:00:00Z"),
    trainingEnd: null,
    trainer: bernd,
    weeks,
    ...overrides,
  };
}

function remind(now: Date, ...trainees: ReminderTrainee[]) {
  return planReminders({ now, trainees, baseUrl: BASE });
}

/** Annas Wochen KW 36–43; alle eingereicht außer den angegebenen offenen. */
function weeksWithOpen(open: Record<number, ReportStatus>, upTo = 43): ReminderWeek[] {
  return Array.from({ length: upTo - 35 }, (_, i) => 36 + i).map((isoWeek) =>
    week(isoWeek, open[isoWeek] ?? "APPROVED"),
  );
}

describe("Erinnerung montags 9:00 Uhr (AK-1021 – AK-1025, AK-205)", () => {
  it("AK-1021 Vorwoche am Montag noch offen → Erinnerung an den Azubi, Ausbilder noch nicht", () => {
    const drafts = remind(monday("2026-10-12"), trainee(weeksWithOpen({ 41: "DRAFT", 42: "DRAFT" }, 42)));
    expect(recipients(drafts)).toEqual(["anna:EMAIL", "anna:APP"]);
    expect(drafts[0].subject).toBe("Erinnerung: Wochenbericht noch offen – KW 41/2026");
    expect(drafts[0].body).toContain(`- KW 41/2026 (05.10.2026 – 09.10.2026): ${BASE}/berichte/r-41`);
    expect(drafts[0].link).toBe("/berichte/r-41");
    expect(drafts[0].eventKey).toBe("reminder:2026-W42:anna");
  });

  it("AK-1021 auch eine abgelehnte Woche ist offen", () => {
    const drafts = remind(monday("2026-10-12"), trainee(weeksWithOpen({ 41: "REJECTED" }, 42)));
    expect(recipients(drafts)).toEqual(["anna:EMAIL", "anna:APP"]);
  });

  it("AK-1022 dieselbe Woche am folgenden Montag noch offen → zusätzlich der zugeordnete Ausbilder", () => {
    const drafts = remind(monday("2026-10-19"), trainee(weeksWithOpen({ 41: "DRAFT", 43: "DRAFT" }, 43)));
    expect(recipients(drafts)).toEqual(["anna:EMAIL", "anna:APP", "bernd:EMAIL", "bernd:APP"]);
    const info = drafts.find((draft) => draft.recipientId === "bernd");
    expect(info?.subject).toBe("Information: Anna Azubi – Wochenbericht überfällig – KW 41/2026");
    expect(info?.body).toContain("Anna Azubi hat folgenden Wochenbericht seit mehr als einer Woche nicht eingereicht:");
    expect(info?.body).toContain(`${BASE}/berichte/r-41`);
    expect(info?.body).toContain("Stichtag: 19.10.2026");
    expect(info?.eventKey).toBe("trainer-info:2026-W43:anna");
  });

  it("AK-1022 Information nur an den zugeordneten, aktiven Ausbilder; seine eigenen Kanäle zählen", () => {
    const weeks = weeksWithOpen({ 40: "DRAFT" }, 43);
    expect(recipients(remind(monday("2026-10-19"), trainee(weeks, { trainer: null })))).toEqual([
      "anna:EMAIL",
      "anna:APP",
    ]);
    expect(
      recipients(remind(monday("2026-10-19"), trainee(weeks, { trainer: { ...bernd, channels: ["TEAMS"] } }))),
    ).toEqual(["anna:EMAIL", "anna:APP", "bernd:TEAMS"]);
  });

  it("AK-1023 keine Erinnerung für eingereichte oder freigegebene Wochen und für die laufende Woche", () => {
    const now = monday("2026-10-19");
    const weeks = [week(40, "SUBMITTED"), week(41, "APPROVED"), week(42, "SUBMITTED"), week(43, "DRAFT")];
    expect(remind(now, trainee(weeks))).toEqual([]);
  });

  it("AK-1023 Montag 0:00 Uhr Berlin gehört schon zur neuen Woche: die eben beendete Woche ist die Vorwoche", () => {
    const sundayNight = new Date("2026-10-11T22:00:00Z");
    const drafts = remind(sundayNight, trainee([week(41, "DRAFT"), week(42, "DRAFT")]));
    expect(drafts.map((draft) => draft.subject)).toEqual([
      "Erinnerung: Wochenbericht noch offen – KW 41/2026",
      "Erinnerung: Wochenbericht noch offen – KW 41/2026",
    ]);
  });

  it("AK-1024 jeden Montag erneut, bis eingereicht: neuer Schlüssel je Woche; danach nichts mehr", () => {
    const open = trainee(weeksWithOpen({ 41: "DRAFT" }, 44));
    const keys = (now: Date) => [...new Set(remind(now, open).map((draft) => draft.eventKey))];
    expect(keys(monday("2026-10-19"))).toEqual(["reminder:2026-W43:anna", "trainer-info:2026-W43:anna"]);
    expect(keys(monday("2026-10-26"))).toEqual(["reminder:2026-W44:anna", "trainer-info:2026-W44:anna"]);
    expect(remind(monday("2026-10-26"), trainee(weeksWithOpen({ 41: "SUBMITTED" }, 44)))).toEqual([]);
  });

  it("AK-1024 doppelter Lauf am selben Montag ergibt dieselben Schlüssel (die Outbox überspringt Doppelte)", () => {
    const open = trainee(weeksWithOpen({ 39: "DRAFT" }, 43));
    const first = remind(monday("2026-10-19"), open);
    const second = remind(new Date("2026-10-19T09:30:00+02:00"), open);
    expect(second.map((draft) => draft.eventKey)).toEqual(first.map((draft) => draft.eventKey));
  });

  it("AK-1025 mehrere offene Wochen: eine Nachricht nennt alle, älteste zuerst", () => {
    const drafts = remind(
      monday("2026-10-19"),
      trainee([week(43, "DRAFT"), week(41, "DRAFT"), week(39, "REJECTED"), week(40, "APPROVED"), week(42, "DRAFT")]),
    );
    const toAnna = drafts.filter((draft) => draft.recipientId === "anna" && draft.channel === "EMAIL");
    expect(toAnna).toHaveLength(1);
    expect(toAnna[0].subject).toBe("Erinnerung: Wochenberichte noch offen – KW 39/2026, KW 41/2026, KW 42/2026");
    expect(toAnna[0].body).toContain("folgende 3 Wochenberichte sind noch nicht eingereicht:");
    const listed = toAnna[0].body.split("\n").filter((line) => line.startsWith("- KW"));
    expect(listed.map((line) => line.slice(2, 13))).toEqual(["KW 39/2026 ", "KW 41/2026 ", "KW 42/2026 "]);
    expect(toAnna[0].link).toBe("/azubi");
    // Ausbilder: nur die schon am Montag davor offenen Wochen (KW 39, KW 41), ebenfalls in einer Nachricht.
    const info = drafts.filter((draft) => draft.recipientId === "bernd" && draft.channel === "EMAIL");
    expect(info).toHaveLength(1);
    expect(info[0].subject).toBe("Information: Anna Azubi – Wochenberichte überfällig – KW 39/2026, KW 41/2026");
    expect(info[0].link).toBe("/ausbilder/azubis/anna");
  });

  it("AK-1025 bei mehr als drei Wochen fasst der Betreff zusammen, der Text nennt alle", () => {
    const drafts = remind(monday("2026-10-19"), trainee([36, 37, 38, 39, 40].map((isoWeek) => week(isoWeek))));
    expect(drafts[0].subject).toBe("Erinnerung: Wochenberichte noch offen – 5 Wochen, älteste KW 36/2026");
    expect(drafts[0].body.split("\n").filter((line) => line.startsWith("- KW"))).toHaveLength(5);
  });

  it("AK-205 deaktivierte Azubis erhalten keine Erinnerung, ihr Ausbilder keine Information", () => {
    expect(remind(monday("2026-10-19"), trainee([week(39), week(40)], { active: false }))).toEqual([]);
  });

  it("AK-1013 Azubi ohne Kanal bekommt keine Erinnerung; der Ausbilder wird trotzdem informiert", () => {
    const drafts = remind(monday("2026-10-19"), trainee([week(40)], { channels: [] }));
    expect(recipients(drafts)).toEqual(["bernd:EMAIL", "bernd:APP"]);
  });

  it("AK-306 Wochen ganz außerhalb der Ausbildung zählen nie als offen, auch mit Inhalt", () => {
    // Beginn nachträglich auf den 01.10.2026 verschoben: KW 36–39 liegen ganz davor.
    const weeks = [week(38, "DRAFT", { hasContent: true }), week(39, "REJECTED", { hasHistory: true })];
    const later = { trainingStart: new Date("2026-10-01T00:00:00Z") };
    expect(remind(monday("2026-10-19"), trainee(weeks, later))).toEqual([]);
    // Ausbildungsende mitten in KW 40: die Woche zählt noch (Mo–Mi in der Ausbildung).
    const ended = { trainingEnd: new Date("2026-09-30T00:00:00Z") };
    expect(
      reminderWeeks(trainee([week(40), week(41)], ended), monday("2026-10-19")).open.map((w) => w.isoWeek),
    ).toEqual([40]);
  });
});

describe("Versand", () => {
  it("AK-1004 Wartezeit zwischen Versuchen wächst, höchstens eine Stunde", () => {
    expect([1, 2, 3, 4, 10, 20].map(retryDelaySeconds)).toEqual([30, 60, 120, 240, 3600, 3600]);
  });
});

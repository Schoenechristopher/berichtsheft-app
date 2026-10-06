import { describe, expect, it } from "vitest";
import type { ReportStatus, Viewer } from "./report-access";
import {
  REPORT_ACTIONS,
  REPORT_STATUSES,
  TRANSITION_MESSAGES,
  availableActions,
  decideTransition,
  isOpenStatus,
  reviewRoundFor,
  type ReportAction,
} from "./report-status";

const anna: Viewer = { id: "anna", role: "TRAINEE", active: true };
const otto: Viewer = { id: "otto", role: "TRAINEE", active: true };
const bernd: Viewer = { id: "bernd", role: "TRAINER", active: true };
const clara: Viewer = { id: "clara", role: "TRAINER", active: true };

const report = (status: ReportStatus, extra: Partial<{ traineeActive: boolean; version: number }> = {}) => ({
  traineeId: "anna",
  traineeActive: true,
  status,
  version: 3,
  ...extra,
});

/**
 * Erwartete Übergänge laut Statusdiagramm der Spezifikation: [Status, Aktion, Rolle] → neuer Status.
 * „Azubi“ = Besitzer des Berichts. Alles, was hier fehlt, ist verboten.
 */
const ALLOWED: Record<string, ReportStatus> = {
  "DRAFT SUBMIT Azubi": "SUBMITTED",
  "SUBMITTED WITHDRAW Azubi": "DRAFT",
  "SUBMITTED APPROVE Ausbilder": "APPROVED",
  "SUBMITTED REJECT Ausbilder": "REJECTED",
  "REJECTED RESUBMIT Azubi": "SUBMITTED",
  "APPROVED REVOKE_APPROVAL Ausbilder": "REJECTED",
};

const ACTORS: [string, Viewer][] = [
  ["Azubi", anna],
  ["fremder Azubi", otto],
  ["Ausbilder", bernd],
  ["Vertretung", clara],
];

describe("Statusmodell als Tabelle: jeder Status × jede Aktion × Rolle", () => {
  const cases = REPORT_STATUSES.flatMap((status) =>
    REPORT_ACTIONS.flatMap((action) => ACTORS.map(([role, actor]) => ({ status, action, role, actor }))),
  );
  it("deckt 4 Status × 6 Aktionen × 4 Rollen ab", () => {
    expect(cases).toHaveLength(96);
  });

  it.each(cases)("AK-507 AK-607 AK-704 $status + $action durch $role", ({ status, action, role, actor }) => {
    const decision = decideTransition({ action, actor, report: report(status), text: "Begründung" });
    // Vertretung prüft wie der zugeordnete Ausbilder (AK-602).
    const expected = ALLOWED[`${status} ${action} ${role === "Vertretung" ? "Ausbilder" : role}`];
    if (expected) {
      expect(decision).toEqual({
        ok: true,
        from: status,
        to: expected,
        text: action === "REJECT" || action === "REVOKE_APPROVAL" ? "Begründung" : null,
      });
    } else {
      expect(decision.ok).toBe(false);
      if (!decision.ok) {
        expect(decision.message.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Meldungen bei verbotenen Übergängen", () => {
  it("AK-507 Zurückziehen eines freigegebenen oder abgelehnten Berichts", () => {
    for (const status of ["APPROVED", "REJECTED"] as const) {
      expect(decideTransition({ action: "WITHDRAW", actor: anna, report: report(status) })).toEqual({
        ok: false,
        code: "NOT_ALLOWED",
        message: TRANSITION_MESSAGES.notWithdrawable,
      });
    }
  });

  it("AK-607 Entwurf kann weder freigegeben noch abgelehnt werden", () => {
    for (const action of ["APPROVE", "REJECT"] as const) {
      expect(decideTransition({ action, actor: bernd, report: report("DRAFT"), text: "x" })).toMatchObject({
        ok: false,
        message: TRANSITION_MESSAGES.draftNotReviewable,
      });
    }
  });

  it("AK-704 freigegebener Bericht: weder einreichen noch zurückziehen noch prüfen, nur Rücknahme", () => {
    expect(availableActions(anna, report("APPROVED"))).toEqual([]);
    expect(availableActions(bernd, report("APPROVED"))).toEqual(["REVOKE_APPROVAL"]);
    expect(decideTransition({ action: "SUBMIT", actor: anna, report: report("APPROVED") })).toMatchObject({
      message: TRANSITION_MESSAGES.approvedLocked,
    });
  });

  it("AK-103 AK-104 fremde Azubis und falsche Rollen werden abgewiesen", () => {
    expect(decideTransition({ action: "SUBMIT", actor: otto, report: report("DRAFT") })).toMatchObject({
      code: "FORBIDDEN",
      message: "Zugriff verweigert",
    });
    expect(decideTransition({ action: "APPROVE", actor: anna, report: report("SUBMITTED") })).toMatchObject({
      code: "FORBIDDEN",
      message: TRANSITION_MESSAGES.trainerOnly,
    });
    expect(decideTransition({ action: "WITHDRAW", actor: bernd, report: report("SUBMITTED") })).toMatchObject({
      code: "FORBIDDEN",
      message: TRANSITION_MESSAGES.traineeOnly,
    });
    for (const actor of [anna, bernd]) {
      for (const action of REPORT_ACTIONS) {
        expect(
          decideTransition({ action, actor: { ...actor, active: false }, report: report("SUBMITTED"), text: "x" }),
        ).toMatchObject({ code: "FORBIDDEN" });
      }
    }
  });
});

describe("Gleichzeitigkeit (AK-508)", () => {
  const seenSubmitted = { status: "SUBMITTED" as const, version: 3 };

  it("AK-508 Ausbilder prüft, Azubi hat inzwischen zurückgezogen: „Bericht wurde zurückgezogen“", () => {
    for (const action of ["APPROVE", "REJECT"] as const) {
      expect(
        decideTransition({
          action,
          actor: bernd,
          report: report("DRAFT", { version: 4 }),
          seen: seenSubmitted,
          text: "x",
        }),
      ).toEqual({ ok: false, code: "CONFLICT", message: "Bericht wurde zurückgezogen" });
    }
  });

  it("AK-508 Azubi zieht zurück, ein Ausbilder hat inzwischen geprüft: Meldung", () => {
    for (const status of ["APPROVED", "REJECTED"] as const) {
      expect(
        decideTransition({
          action: "WITHDRAW",
          actor: anna,
          report: report(status, { version: 4 }),
          seen: seenSubmitted,
        }),
      ).toEqual({ ok: false, code: "CONFLICT", message: TRANSITION_MESSAGES.reviewedMeanwhile });
    }
  });

  it("AK-508 zwei Ausbilder gleichzeitig: der zweite erfährt, dass schon geprüft wurde", () => {
    expect(
      decideTransition({
        action: "APPROVE",
        actor: clara,
        report: report("APPROVED", { version: 4 }),
        seen: seenSubmitted,
      }),
    ).toMatchObject({ code: "CONFLICT", message: TRANSITION_MESSAGES.reviewedByOther });
  });

  it("AK-508 gleicher Status, aber neue Version (zurückgezogen und erneut eingereicht): veraltet", () => {
    expect(
      decideTransition({
        action: "APPROVE",
        actor: bernd,
        report: report("SUBMITTED", { version: 5 }),
        seen: seenSubmitted,
      }),
    ).toMatchObject({ code: "CONFLICT", message: TRANSITION_MESSAGES.changedMeanwhile });
    expect(
      decideTransition({ action: "APPROVE", actor: bernd, report: report("SUBMITTED"), seen: seenSubmitted }),
    ).toMatchObject({ ok: true });
  });
});

describe("Pflichttexte", () => {
  it("AK-604 Ablehnen nur mit nicht leerem Gesamtkommentar", () => {
    for (const text of [undefined, null, "", "  \n\t "]) {
      expect(decideTransition({ action: "REJECT", actor: bernd, report: report("SUBMITTED"), text })).toEqual({
        ok: false,
        code: "TEXT",
        field: "comment",
        message: TRANSITION_MESSAGES.commentRequired,
      });
    }
    expect(
      decideTransition({ action: "REJECT", actor: bernd, report: report("SUBMITTED"), text: "Zeile 1\r\nZeile 2" }),
    ).toMatchObject({ ok: true, text: "Zeile 1\nZeile 2" });
  });

  it("AK-703 Freigabe nur mit nicht leerer Begründung zurücknehmen", () => {
    expect(
      decideTransition({ action: "REVOKE_APPROVAL", actor: clara, report: report("APPROVED"), text: " " }),
    ).toEqual({ ok: false, code: "TEXT", field: "reason", message: TRANSITION_MESSAGES.reasonRequired });
    expect(
      decideTransition({
        action: "REVOKE_APPROVAL",
        actor: clara,
        report: report("APPROVED"),
        text: "Mittwoch falsches Datum",
      }),
    ).toEqual({ ok: true, from: "APPROVED", to: "REJECTED", text: "Mittwoch falsches Datum" });
  });

  it("zu lange Kommentare werden am Feld abgewiesen", () => {
    expect(
      decideTransition({ action: "REJECT", actor: bernd, report: report("SUBMITTED"), text: "x".repeat(5001) }),
    ).toMatchObject({ ok: false, field: "comment", message: TRANSITION_MESSAGES.tooLong });
  });
});

describe("Deaktivierter Azubi (Vorschlag zur Bestätigung)", () => {
  it("Freigeben geht, Ablehnen und Rücknahme nicht; der Azubi selbst kann nichts mehr", () => {
    const inactive = (status: ReportStatus) => report(status, { traineeActive: false });
    expect(decideTransition({ action: "APPROVE", actor: bernd, report: inactive("SUBMITTED") }).ok).toBe(true);
    expect(
      decideTransition({ action: "REJECT", actor: bernd, report: inactive("SUBMITTED"), text: "x" }),
    ).toMatchObject({
      code: "TRAINEE_INACTIVE",
    });
    expect(
      decideTransition({ action: "REVOKE_APPROVAL", actor: bernd, report: inactive("APPROVED"), text: "x" }),
    ).toMatchObject({ code: "TRAINEE_INACTIVE" });
    expect(decideTransition({ action: "SUBMIT", actor: anna, report: inactive("DRAFT") })).toMatchObject({
      code: "TRAINEE_INACTIVE",
    });
  });
});

describe("Offen und Prüfrunden", () => {
  it("AK-504 offen sind genau Entwurf und Abgelehnt", () => {
    expect(REPORT_STATUSES.filter(isOpenStatus)).toEqual(["DRAFT", "REJECTED"]);
  });

  it("AK-802 jede Einreichung beginnt eine neue Prüfrunde, alle anderen Wechsel gehören zur laufenden", () => {
    const rounds: [ReportAction, number][] = [
      ["SUBMIT", 1],
      ["WITHDRAW", 1],
      ["SUBMIT", 2],
      ["REJECT", 2],
      ["RESUBMIT", 3],
      ["APPROVE", 3],
      ["REVOKE_APPROVAL", 3],
      ["RESUBMIT", 4],
    ];
    let submissions = 0;
    for (const [action, expected] of rounds) {
      const round = reviewRoundFor(action, submissions);
      expect(round, action).toBe(expected);
      submissions = round;
    }
  });
});

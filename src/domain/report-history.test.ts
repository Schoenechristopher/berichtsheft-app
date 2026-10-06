import { describe, expect, it } from "vitest";
import {
  changeLabel,
  currentApproval,
  currentFeedback,
  formatDateTime,
  groupHistory,
  type HistoryChange,
  type HistoryComment,
} from "./report-history";

let seq = 0;
const change = (
  reviewRound: number,
  fromStatus: HistoryChange["fromStatus"],
  toStatus: HistoryChange["toStatus"],
  actorName: string,
  reason: string | null = null,
): HistoryChange => ({
  id: `c${++seq}`,
  seq,
  reviewRound,
  fromStatus,
  toStatus,
  actorName,
  reason,
  createdAt: new Date("2026-10-07T12:05:00Z"),
});
const comment = (reviewRound: number, dayId: string | null, text: string, day?: string): HistoryComment => ({
  id: `k${++seq}`,
  reviewRound,
  dayId,
  dayDate: day ? new Date(day) : null,
  authorName: "Bernd",
  text,
  createdAt: new Date("2026-10-07T12:05:00Z"),
});

const changes = [
  change(1, "DRAFT", "SUBMITTED", "Anna"),
  change(1, "SUBMITTED", "REJECTED", "Bernd"),
  change(2, "REJECTED", "SUBMITTED", "Anna"),
  change(2, "SUBMITTED", "APPROVED", "Bernd"),
  change(2, "APPROVED", "REJECTED", "Clara", "Mittwoch falsches Datum"),
];
const comments = [
  comment(1, "fr", "Freitag ergänzen", "2026-10-09"),
  comment(1, null, "Bitte genauer"),
  comment(1, "mo", "Montag ergänzen", "2026-10-05"),
];

describe("Historie", () => {
  it("AK-801 AK-802 nach Runde gruppiert, neueste zuerst; Kommentare ihrer Runde zugeordnet", () => {
    const rounds = groupHistory(changes, comments);
    expect(rounds.map((round) => round.round)).toEqual([2, 1]);
    expect(rounds[1].changes.map(changeLabel)).toEqual(["Eingereicht", "Abgelehnt"]);
    expect(rounds[1].overall.map((c) => c.text)).toEqual(["Bitte genauer"]);
    expect(rounds[1].days.map((c) => c.text)).toEqual(["Montag ergänzen", "Freitag ergänzen"]);
    expect(rounds[0].changes.map(changeLabel)).toEqual([
      "Erneut eingereicht",
      "Freigegeben",
      "Freigabe zurückgenommen",
    ]);
    expect(rounds[0].changes[2].reason).toBe("Mittwoch falsches Datum");
  });

  it("AK-801 Zurückziehen hat eine eigene Bezeichnung", () => {
    expect(changeLabel({ fromStatus: "SUBMITTED", toStatus: "DRAFT" })).toBe("Zurückgezogen");
  });

  it("AK-606 nach Ablehnung: Gesamtkommentar und Tageskommentare der letzten Runde", () => {
    const rejected = changes.slice(0, 2);
    const feedback = currentFeedback("REJECTED", rejected, comments);
    expect(feedback).toMatchObject({ kind: "REJECTED", actorName: "Bernd", text: "Bitte genauer" });
    expect(Object.fromEntries(feedback?.dayComments ?? [])).toEqual({
      fr: ["Freitag ergänzen"],
      mo: ["Montag ergänzen"],
    });
    expect(currentFeedback("SUBMITTED", changes.slice(0, 3), comments)).toBeNull();
  });

  it("AK-703 nach Rücknahme: Begründung oben, keine alten Tageskommentare", () => {
    expect(currentFeedback("REJECTED", changes, comments)).toMatchObject({
      kind: "REVOKED",
      actorName: "Clara",
      text: "Mittwoch falsches Datum",
      dayComments: new Map(),
    });
  });

  it("AK-603 Freigabe mit Person und Zeitpunkt; Datum und Uhrzeit in Europe/Berlin", () => {
    expect(currentApproval("APPROVED", changes.slice(0, 4))).toEqual({
      actorName: "Bernd",
      at: new Date("2026-10-07T12:05:00Z"),
    });
    expect(currentApproval("REJECTED", changes)).toBeNull();
    expect(formatDateTime(new Date("2026-10-07T12:05:00Z"))).toBe("07.10.2026, 14:05 Uhr");
  });
});

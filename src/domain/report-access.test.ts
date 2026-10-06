import { describe, expect, it } from "vitest";
import { canEditReport, canManagePeople, canViewReport, reportStatusLabel, type Viewer } from "./report-access";

const anna: Viewer = { id: "anna", role: "TRAINEE", active: true };
const otto: Viewer = { id: "otto", role: "TRAINEE", active: true };
const bernd: Viewer = { id: "bernd", role: "TRAINER", active: true };
const clara: Viewer = { id: "clara", role: "TRAINER", active: true };
const annasDraft = { traineeId: "anna", status: "DRAFT", traineeActive: true } as const;

describe("Zugriff auf Berichte", () => {
  it("AK-103 Azubi sieht nur eigene Berichte", () => {
    expect(canViewReport(anna, annasDraft)).toBe(true);
    expect(canViewReport(otto, annasDraft)).toBe(false);
  });

  it("AK-105 jeder Ausbilder sieht die Berichte aller Azubis, auch ohne Zuordnung", () => {
    expect(canViewReport(bernd, annasDraft)).toBe(true);
    expect(canViewReport(clara, annasDraft)).toBe(true);
  });

  it("AK-204 Berichte deaktivierter Azubis bleiben für Ausbilder lesbar, sind aber nicht änderbar", () => {
    const inactive = { ...annasDraft, traineeActive: false };
    expect(canViewReport(bernd, inactive)).toBe(true);
    expect(canEditReport(anna, inactive)).toBe(false);
    expect(canEditReport(bernd, inactive)).toBe(false);
  });

  it("AK-102 deaktivierte Personen sehen nichts", () => {
    expect(canViewReport({ ...anna, active: false }, annasDraft)).toBe(false);
    expect(canViewReport({ ...bernd, active: false }, annasDraft)).toBe(false);
  });

  it("AK-103 nur der Azubi selbst bearbeitet seinen offenen Bericht", () => {
    expect(canEditReport(anna, annasDraft)).toBe(true);
    expect(canEditReport(anna, { ...annasDraft, status: "REJECTED" })).toBe(true);
    expect(canEditReport(anna, { ...annasDraft, status: "SUBMITTED" })).toBe(false);
    expect(canEditReport(anna, { ...annasDraft, status: "APPROVED" })).toBe(false);
    expect(canEditReport(otto, annasDraft)).toBe(false);
    expect(canEditReport(bernd, annasDraft)).toBe(false);
  });

  it("AK-104 Admin-Funktionen nur für aktive Ausbilder", () => {
    expect(canManagePeople(bernd)).toBe(true);
    expect(canManagePeople(anna)).toBe(false);
    expect(canManagePeople({ ...bernd, active: false })).toBe(false);
    expect(canManagePeople(null)).toBe(false);
  });

  it("Statusbezeichnungen", () => {
    expect(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"].map((s) => reportStatusLabel(s as never))).toEqual([
      "Entwurf",
      "Eingereicht",
      "Freigegeben",
      "Abgelehnt",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { NO_ACCESS_MESSAGE, decideAccess, extractAccountId, homePathFor, roleLabel } from "./access";

describe("Zugangsregeln", () => {
  it("AK-102 Konto ohne Eintrag wird abgewiesen", () => {
    expect(decideAccess(null)).toEqual({ allowed: false, reason: "unknown-account" });
    expect(decideAccess(undefined)).toEqual({ allowed: false, reason: "unknown-account" });
  });

  it("AK-102 deaktivierte Person wird abgewiesen", () => {
    expect(decideAccess({ role: "TRAINEE", active: false })).toEqual({ allowed: false, reason: "inactive" });
    expect(decideAccess({ role: "TRAINER", active: false })).toEqual({ allowed: false, reason: "inactive" });
  });

  it("AK-102 Hinweistext entspricht der Spezifikation", () => {
    expect(NO_ACCESS_MESSAGE).toBe("Kein Zugang – bitte an den Ausbilder wenden");
  });

  it("aktive Personen beider Rollen erhalten Zugang", () => {
    expect(decideAccess({ role: "TRAINEE", active: true })).toEqual({ allowed: true });
    expect(decideAccess({ role: "TRAINER", active: true })).toEqual({ allowed: true });
  });

  it("Konto-ID kommt aus dem konfigurierten Claim, nicht aus Name oder E-Mail", () => {
    const claims = { sub: "kc-123", oid: "entra-456", name: "Anna", email: "anna@example.test" };
    expect(extractAccountId(claims)).toBe("kc-123");
    expect(extractAccountId(claims, "oid")).toBe("entra-456");
    expect(extractAccountId({ name: "Anna" })).toBeNull();
    expect(extractAccountId({ sub: "   " })).toBeNull();
    expect(extractAccountId({ sub: 42 })).toBeNull();
    expect(extractAccountId(null)).toBeNull();
  });

  it("Startseite und Bezeichnung je Rolle", () => {
    expect(homePathFor("TRAINEE")).toBe("/azubi");
    expect(homePathFor("TRAINER")).toBe("/ausbilder");
    expect(roleLabel("TRAINEE")).toBe("Azubi");
    expect(roleLabel("TRAINER")).toBe("Ausbilder");
  });
});

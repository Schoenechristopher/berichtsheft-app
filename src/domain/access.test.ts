import { describe, expect, it } from "vitest";
import {
  NO_ACCESS_MESSAGE,
  decideAccess,
  extractAccountId,
  extractLoginClaims,
  homePathFor,
  matchLogin,
  roleLabel,
} from "./access";

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

describe("Zuordnung beim ersten Login (Entscheidung Anlegen über die Firmen-E-Mail)", () => {
  const unbound = { id: "emil", accountId: null, active: true };
  const verified = { accountId: "kc-emil", email: "emil@firma.test", emailVerified: true };

  it("AK-201 liest Konto-ID und bestätigte E-Mail aus den Claims, E-Mail klein geschrieben", () => {
    expect(extractLoginClaims({ sub: "kc-1", email: "Emil@Firma.TEST", email_verified: true })).toEqual({
      accountId: "kc-1",
      email: "emil@firma.test",
      emailVerified: true,
    });
    expect(extractLoginClaims({ sub: "kc-1", email: "emil@firma.test", email_verified: false }).emailVerified).toBe(
      false,
    );
    expect(extractLoginClaims({ sub: "kc-1", email: "emil@firma.test" }).emailVerified).toBe(false);
    expect(extractLoginClaims({ sub: "kc-1", email_verified: true })).toEqual({
      accountId: "kc-1",
      email: null,
      emailVerified: false,
    });
  });

  it("AK-201 Entra ID: Claims per Konfiguration (oid, xms_edov)", () => {
    const claims = { sub: "pairwise", oid: "entra-1", email: "emil@firma.test", xms_edov: true };
    expect(extractLoginClaims(claims, { accountIdClaim: "oid", emailVerifiedClaim: "xms_edov" })).toEqual({
      accountId: "entra-1",
      email: "emil@firma.test",
      emailVerified: true,
    });
    expect(extractLoginClaims(claims, { accountIdClaim: "oid" }).emailVerified).toBe(false);
  });

  it("AK-201 erster Login: angelegte Person wird über die bestätigte E-Mail gebunden", () => {
    expect(matchLogin(verified, null, unbound)).toEqual({ kind: "bind", personId: "emil", accountId: "kc-emil" });
  });

  it("AK-201 unbestätigte E-Mail wird nie zur Zuordnung verwendet", () => {
    expect(matchLogin({ ...verified, emailVerified: false }, null, unbound)).toEqual({ kind: "none" });
  });

  it("AK-201 danach zählt nur die Konto-ID, auch wenn sich die E-Mail ändert", () => {
    const bound = { id: "emil", accountId: "kc-emil", active: true };
    expect(matchLogin({ ...verified, email: "emil.neu@firma.test" }, bound, null)).toEqual({
      kind: "known",
      personId: "emil",
    });
  });

  it("AK-201 an ein anderes Konto gebundene Person wird nicht über die E-Mail umgebunden", () => {
    const boundElsewhere = { id: "emil", accountId: "kc-anderes", active: true };
    expect(matchLogin(verified, null, boundElsewhere)).toEqual({ kind: "none" });
  });

  it("AK-102 deaktivierte, noch ungebundene Person wird nicht gebunden; ohne Konto-ID keine Zuordnung", () => {
    expect(matchLogin(verified, null, { ...unbound, active: false })).toEqual({ kind: "none" });
    expect(matchLogin({ ...verified, accountId: null }, null, unbound)).toEqual({ kind: "none" });
    expect(matchLogin(verified, null, null)).toEqual({ kind: "none" });
  });
});

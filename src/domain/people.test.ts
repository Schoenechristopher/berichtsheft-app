import { describe, expect, it } from "vitest";
import {
  checkDeactivate,
  checkDelete,
  checkFederalStateSetting,
  checkReactivate,
  checkUpdate,
  confirmsName,
  isLastActiveTrainer,
  isValidDate,
  normalizeEmail,
  validatePerson,
  type PersonSnapshot,
} from "./people";

const bernd: PersonSnapshot = { id: "bernd", name: "Bernd Ausbilder", role: "TRAINER", active: true, trainerId: null };
const clara: PersonSnapshot = {
  id: "clara",
  name: "Clara Ausbilderin",
  role: "TRAINER",
  active: true,
  trainerId: null,
};
const anna: PersonSnapshot = { id: "anna", name: "Anna Azubi", role: "TRAINEE", active: true, trainerId: "bernd" };
const persons = [bernd, clara, anna];

const traineeInput = {
  name: "Emil Neu",
  email: "Emil@Berichtsheft.test ",
  role: "TRAINEE",
  trainerId: "bernd",
  trainingStart: "2026-09-01",
  trainingEnd: "",
};

describe("Personen anlegen und bearbeiten", () => {
  it("AK-201 Person mit Firmen-E-Mail, Name und Rolle Azubi oder Ausbilder", () => {
    expect(validatePerson(traineeInput, { persons })).toEqual({
      ok: true,
      value: {
        name: "Emil Neu",
        email: "emil@berichtsheft.test",
        role: "TRAINEE",
        trainerId: "bernd",
        trainingStart: "2026-09-01",
        trainingEnd: null,
      },
    });
    expect(validatePerson({ name: "Fritz", email: "fritz@x.test", role: "TRAINER" }, { persons })).toEqual({
      ok: true,
      value: {
        name: "Fritz",
        email: "fritz@x.test",
        role: "TRAINER",
        trainerId: null,
        trainingStart: null,
        trainingEnd: null,
      },
    });
  });

  it("AK-201 Name, E-Mail und Rolle sind Pflicht", () => {
    const result = validatePerson({ name: " ", email: "kein-at", role: "ADMIN" }, { persons });
    expect(result).toEqual({
      ok: false,
      fieldErrors: { name: "Name fehlt.", email: "Firmen-E-Mail ist ungültig.", role: "Rolle fehlt." },
    });
    expect(validatePerson({ name: "X", email: "", role: "TRAINER" }, { persons })).toMatchObject({
      fieldErrors: { email: "Firmen-E-Mail fehlt." },
    });
  });

  it("AK-201 E-Mail wird ohne Groß-/Kleinschreibung verglichen und klein gespeichert", () => {
    expect(normalizeEmail("  Anna.Azubi@Firma.DE ")).toBe("anna.azubi@firma.de");
  });

  it("AK-202 Azubi ohne Ausbilder: Fehlermeldung nennt das Feld", () => {
    const result = validatePerson({ ...traineeInput, trainerId: "" }, { persons });
    expect(result).toEqual({ ok: false, fieldErrors: { trainerId: "Zugeordneter Ausbilder fehlt." } });
  });

  it("AK-202 Azubi ohne Ausbildungsbeginn: Fehlermeldung nennt das Feld", () => {
    const result = validatePerson({ ...traineeInput, trainingStart: "" }, { persons });
    expect(result).toEqual({ ok: false, fieldErrors: { trainingStart: "Ausbildungsbeginn fehlt." } });
  });

  it("AK-202 Azubi ohne beides: beide Felder werden genannt", () => {
    const result = validatePerson({ ...traineeInput, trainerId: null, trainingStart: null }, { persons });
    expect(result).toEqual({
      ok: false,
      fieldErrors: { trainerId: "Zugeordneter Ausbilder fehlt.", trainingStart: "Ausbildungsbeginn fehlt." },
    });
  });

  it("AK-202 zugeordneter Ausbilder muss ein aktiver Ausbilder und nicht die Person selbst sein", () => {
    expect(validatePerson({ ...traineeInput, trainerId: "anna" }, { persons })).toMatchObject({
      fieldErrors: { trainerId: "Zugeordneter Ausbilder muss ein Ausbilder sein." },
    });
    expect(validatePerson({ ...traineeInput, trainerId: "unbekannt" }, { persons })).toMatchObject({ ok: false });
    expect(
      validatePerson({ ...traineeInput, trainerId: "bernd" }, { persons, targetId: "bernd", targetActive: true }),
    ).toMatchObject({ fieldErrors: { trainerId: "Zugeordneter Ausbilder muss ein Ausbilder sein." } });

    const withInactive = [{ ...bernd, active: false }, clara, anna];
    expect(validatePerson(traineeInput, { persons: withInactive })).toMatchObject({
      fieldErrors: { trainerId: expect.stringContaining("ist deaktiviert") },
    });
    // Eine deaktivierte Person darf ihren (ebenfalls deaktivierten) Ausbilder behalten.
    expect(validatePerson(traineeInput, { persons: withInactive, targetId: "x", targetActive: false })).toMatchObject({
      ok: true,
    });
  });

  it("AK-203 Ausbildungsende nicht vor dem Beginn, Daten müssen gültig sein", () => {
    expect(validatePerson({ ...traineeInput, trainingEnd: "2026-08-31" }, { persons })).toMatchObject({
      fieldErrors: { trainingEnd: "Ausbildungsende liegt vor dem Ausbildungsbeginn." },
    });
    expect(validatePerson({ ...traineeInput, trainingStart: "2026-02-30" }, { persons })).toMatchObject({
      fieldErrors: { trainingStart: "Ausbildungsbeginn ist kein gültiges Datum." },
    });
    expect(validatePerson({ ...traineeInput, trainingEnd: "2029-08-31" }, { persons })).toMatchObject({
      ok: true,
      value: { trainingEnd: "2029-08-31" },
    });
    expect(isValidDate("2028-02-29")).toBe(true);
    expect(isValidDate("2027-02-29")).toBe(false);
    expect(isValidDate("01.09.2026")).toBe(false);
  });

  it("AK-203 für Ausbilder entfallen Zuordnung und Ausbildungszeitraum", () => {
    const result = validatePerson({ ...traineeInput, role: "TRAINER" }, { persons });
    expect(result).toMatchObject({ ok: true, value: { trainerId: null, trainingStart: null, trainingEnd: null } });
  });

  it("AK-203 Rollenwechsel Azubi → Ausbilder ist erlaubt", () => {
    expect(checkUpdate(persons, "anna", "bernd", { role: "TRAINER" })).toEqual({ allowed: true });
  });

  it("AK-207 letzter aktiver Ausbilder kann nicht zum Azubi herabgestuft werden", () => {
    const onlyBernd = [bernd, { ...clara, active: false }];
    expect(checkUpdate(onlyBernd, "bernd", "clara", { role: "TRAINEE" })).toEqual({
      allowed: false,
      reason: "last-active-trainer",
      field: "role",
      message: "Bernd Ausbilder ist der letzte aktive Ausbilder und kann nicht zum Azubi herabgestuft werden.",
    });
  });

  it("AK-208 Ausbilder mit zugeordneten Azubis wird nicht zum Azubi", () => {
    expect(checkUpdate(persons, "bernd", "clara", { role: "TRAINEE" })).toEqual({
      allowed: false,
      reason: "has-trainees",
      field: "role",
      message:
        "Bernd Ausbilder sind noch Azubis zugeordnet (Anna Azubi). Bitte diese zuerst einem anderen Ausbilder zuordnen.",
    });
    expect(checkUpdate(persons, "clara", "bernd", { role: "TRAINEE" })).toEqual({ allowed: true });
  });

  it("AK-207 eigene Rolle kann man nicht ändern", () => {
    expect(checkUpdate(persons, "clara", "clara", { role: "TRAINEE" })).toMatchObject({
      allowed: false,
      reason: "self",
    });
    expect(checkUpdate(persons, "clara", "clara", { role: "TRAINER" })).toEqual({ allowed: true });
  });
});

describe("Deaktivieren", () => {
  it("AK-204 aktive Person lässt sich deaktivieren", () => {
    expect(checkDeactivate(persons, "anna", "bernd")).toEqual({ allowed: true });
    expect(checkDeactivate(persons, "clara", "bernd")).toEqual({ allowed: true });
  });

  it("AK-207 letzter aktiver Ausbilder kann nicht deaktiviert werden", () => {
    const onlyBernd = [bernd, { ...clara, active: false }, { ...anna, active: false }];
    expect(isLastActiveTrainer(onlyBernd, "bernd")).toBe(true);
    expect(checkDeactivate(onlyBernd, "bernd", "bernd")).toEqual({
      allowed: false,
      reason: "last-active-trainer",
      message: "Bernd Ausbilder ist der letzte aktive Ausbilder und kann nicht deaktiviert werden.",
    });
    expect(isLastActiveTrainer(persons, "bernd")).toBe(false);
  });

  it("AK-208 Ausbilder mit zugeordneten Azubis erst nach Neuzuordnung", () => {
    expect(checkDeactivate(persons, "bernd", "clara")).toEqual({
      allowed: false,
      reason: "has-trainees",
      message:
        "Bernd Ausbilder sind noch Azubis zugeordnet (Anna Azubi). Bitte diese zuerst einem anderen Ausbilder zuordnen.",
    });
    const reassigned = [bernd, clara, { ...anna, trainerId: "clara" }];
    expect(checkDeactivate(reassigned, "bernd", "clara")).toEqual({ allowed: true });
  });

  it("AK-208 deaktivierte Azubis blockieren das Deaktivieren nicht", () => {
    const annaInactive = [bernd, clara, { ...anna, active: false }];
    expect(checkDeactivate(annaInactive, "bernd", "clara")).toEqual({ allowed: true });
  });

  it("AK-207 AK-204 niemand deaktiviert sich selbst, bereits deaktivierte nicht erneut", () => {
    expect(checkDeactivate(persons, "clara", "clara")).toEqual({
      allowed: false,
      reason: "self",
      message: "Sie können sich nicht selbst deaktivieren.",
    });
    expect(checkDeactivate([bernd, clara, { ...anna, active: false }], "anna", "bernd")).toMatchObject({
      allowed: false,
      reason: "already-inactive",
    });
  });

  it("AK-204 Reaktivieren eines Azubis nur mit aktivem Ausbilder", () => {
    const state = [{ ...bernd, active: false }, clara, { ...anna, active: false }];
    expect(checkReactivate(state, "anna")).toMatchObject({
      allowed: false,
      reason: "trainer-inactive",
      message: expect.stringContaining("Bernd Ausbilder ist deaktiviert"),
    });
    expect(checkReactivate(state, "bernd")).toEqual({ allowed: true });
    expect(checkReactivate(persons, "anna")).toMatchObject({ allowed: false, reason: "already-active" });
  });
});

describe("Endgültig löschen", () => {
  const noHistory = { hasForeignHistory: false };

  it("AK-206 Löschen nur nach Eintippen des genauen Namens", () => {
    expect(confirmsName(" Anna Azubi ", "Anna Azubi")).toBe(true);
    expect(confirmsName("anna azubi", "Anna Azubi")).toBe(false);
    expect(confirmsName("", "Anna Azubi")).toBe(false);
    expect(confirmsName(null, "Anna Azubi")).toBe(false);
    expect(checkDelete(persons, "anna", "bernd", noHistory)).toEqual({ allowed: true });
  });

  it("AK-207 letzter aktiver Ausbilder kann nicht gelöscht werden", () => {
    const onlyBernd = [bernd, { ...clara, active: false }];
    expect(checkDelete(onlyBernd, "bernd", "clara", noHistory)).toEqual({
      allowed: false,
      reason: "last-active-trainer",
      message: "Bernd Ausbilder ist der letzte aktive Ausbilder und kann nicht gelöscht werden.",
    });
  });

  it("AK-208 Ausbilder mit zugeordneten Azubis (auch deaktivierten) kann nicht gelöscht werden", () => {
    const annaInactive = [bernd, clara, { ...anna, active: false }];
    expect(checkDelete(annaInactive, "bernd", "clara", noHistory)).toMatchObject({
      allowed: false,
      reason: "has-trainees",
      message: expect.stringContaining("sind noch Azubis zugeordnet (Anna Azubi)"),
    });
  });

  it("AK-206 Person mit Einträgen in fremder Historie nur deaktivierbar (Entscheidung Ausbilder mit Historie)", () => {
    expect(checkDelete(persons, "clara", "bernd", { hasForeignHistory: true })).toEqual({
      allowed: false,
      reason: "foreign-history",
      offerDeactivate: true,
      message:
        "Clara Ausbilderin kommt in der Historie von Berichten anderer Azubis vor (Statuswechsel oder Kommentare). " +
        "Damit diese Historie vollständig bleibt, lässt sich die Person nicht endgültig löschen, sondern nur deaktivieren.",
    });
    const claraInactive = [bernd, { ...clara, active: false }, anna];
    expect(checkDelete(claraInactive, "clara", "bernd", { hasForeignHistory: true })).toEqual({
      allowed: false,
      reason: "foreign-history",
      message: expect.stringContaining("Sie ist bereits deaktiviert."),
    });
  });

  it("AK-207 niemand löscht sich selbst", () => {
    expect(checkDelete(persons, "clara", "clara", noHistory)).toEqual({
      allowed: false,
      reason: "self",
      message: "Sie können sich nicht selbst löschen.",
    });
  });
});

describe("Bundesland der Firma", () => {
  it("AK-209 nur ein aktiver Ausbilder stellt das Bundesland ein, und nur eines der 16", () => {
    const viewer = (person: PersonSnapshot) => ({ id: person.id, role: person.role, active: person.active });
    expect(checkFederalStateSetting(viewer(bernd), "BY")).toEqual({ ok: true, federalState: "BY" });
    expect(checkFederalStateSetting(viewer(anna), "BY")).toEqual({ ok: false, reason: "forbidden" });
    expect(checkFederalStateSetting(viewer({ ...bernd, active: false }), "BY")).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(checkFederalStateSetting(null, "BY")).toEqual({ ok: false, reason: "forbidden" });
    expect(checkFederalStateSetting(viewer(bernd), "AUGSBURG")).toEqual({ ok: false, reason: "unknown-federal-state" });
    expect(checkFederalStateSetting(viewer(bernd), "by")).toEqual({ ok: false, reason: "unknown-federal-state" });
  });
});

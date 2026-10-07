import { describe, expect, it } from "vitest";
import { devMailboxEnabled, notificationConfig, teamsMode } from "./config";

describe("Entwickler-Postfach (simulierter Kanal „Teams“)", () => {
  it("Entwicklung: ohne TEAMS_MODE ist das Entwickler-Postfach aktiv", () => {
    expect(teamsMode({ NODE_ENV: "development" })).toBe("entwickler-postfach");
    expect(devMailboxEnabled({ NODE_ENV: "development" })).toBe(true);
  });

  it("Produktionsmodus: ohne ausdrückliches TEAMS_MODE gibt es kein Entwickler-Postfach", () => {
    expect(teamsMode({ NODE_ENV: "production" })).toBe("graph");
    expect(devMailboxEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(devMailboxEnabled({ NODE_ENV: "production", TEAMS_MODE: " " })).toBe(false);
    expect(notificationConfig({ NODE_ENV: "production" }).teamsMode).toBe("graph");
  });

  it("Produktionsmodus mit TEAMS_MODE=graph: kein Entwickler-Postfach", () => {
    expect(devMailboxEnabled({ NODE_ENV: "production", TEAMS_MODE: "graph" })).toBe(false);
  });

  it("Demo per Docker Compose: Entwickler-Postfach nur, wenn TEAMS_MODE es ausdrücklich nennt", () => {
    expect(devMailboxEnabled({ NODE_ENV: "production", TEAMS_MODE: "entwickler-postfach" })).toBe(true);
  });

  it("unbekannter TEAMS_MODE ist ein Konfigurationsfehler", () => {
    expect(() => teamsMode({ TEAMS_MODE: "slack" })).toThrow("TEAMS_MODE „slack“ ist unbekannt");
  });
});

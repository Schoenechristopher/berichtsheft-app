import { describe, expect, it } from "vitest";
import { bestimmeUmfang, klassifiziere, umfangNachKlassen } from "./pruefumfang.mjs";

describe("klassifiziere (docs/ci-richtlinie.md, Abschnitt 7)", () => {
  it.each([
    ["docs/01-spezifikation.md", "D"],
    ["README.md", "D"],
    ["specs/pruefung/format.md", "D"],
    ["playbooks/liferay-72/P05.md", "D"],
    ["specs/pruefung/M01.json", "P"],
    ["src/domain/weeks.ts", "L"],
    ["src/lib/reports.ts", "L"],
    ["src/auth.ts", "L"],
    ["prisma/migrations/20261006130221_init/migration.sql", "L"],
    ["scripts/pruefumfang/pruefumfang.mjs", "L"],
    ["tests/db/people.test.ts", "L"],
    ["src/app/globals.css", "O"],
    ["src/components/AppShell.tsx", "O"],
    ["e2e/helpers.ts", "O"],
    ["playwright.config.ts", "O"],
    ["package-lock.json", "I"],
    [".github/workflows/ci.yml", "I"],
    [".claude/hooks/session-start.sh", "I"],
    ["docker/start-app.sh", "I"],
    ["liferay-625/portlets/build.xml", "L62"],
    ["liferay-72/modules/report/build.gradle", "L72"],
    ["src/neu.ts", "unbekannt"],
    ["irgendwas.txt", "unbekannt"],
  ])("%s → %s", (pfad, klasse) => {
    expect(klassifiziere(pfad)).toBe(klasse);
  });

  it("ordnet nur ganze Ordner zu, keine Namensanfänge", () => {
    expect(klassifiziere("src/domainx/a.ts")).toBe("unbekannt");
    expect(klassifiziere("docsx/a.txt")).toBe("unbekannt");
  });
});

describe("umfangNachKlassen (CI-32, CI-34)", () => {
  it("Doku allein: nur schnelle Prüfung (CI-12)", () => {
    expect(umfangNachKlassen(["docs/ci-richtlinie.md", "README.md"])).toMatchObject({
      schnell: true,
      e2e: false,
      browserVoll: false,
    });
  });

  it("Logik und Doku: Chromium und 375 px, keine weiteren Browser", () => {
    expect(umfangNachKlassen(["docs/x.md", "src/domain/weeks.ts"])).toMatchObject({
      schnell: true,
      e2e: true,
      browserVoll: false,
    });
  });

  it("Prüffälle: wie Logik, Liferay nicht", () => {
    expect(umfangNachKlassen(["specs/pruefung/M05.json"])).toMatchObject({
      e2e: true,
      browserVoll: false,
      liferay625: false,
      liferay72: false,
    });
  });

  it.each([["src/components/AppShell.tsx"], ["package-lock.json"], ["src/neu.ts"]])(
    "%s: alle Browser, axe und Screenshots",
    (pfad) => {
      expect(umfangNachKlassen([pfad])).toMatchObject({ schnell: true, e2e: true, browserVoll: true });
    },
  );

  it("Liferay: nur der Job der jeweiligen Umsetzung, keine Browser-Tests der TypeScript-App", () => {
    expect(umfangNachKlassen(["liferay-72/modules/a.java"])).toMatchObject({
      e2e: false,
      liferay625: false,
      liferay72: true,
    });
  });

  it("nennt die Klassen im Grund", () => {
    expect(umfangNachKlassen(["src/lib/a.ts", "docs/b.md"]).grund).toBe("Änderungsklassen: D, L");
  });
});

describe("bestimmeUmfang (CI-10 bis CI-14, CI-35)", () => {
  const logik = ["src/domain/weeks.ts"];

  it("Entwurf: nur schnelle Prüfung, auch bei Code-Änderungen (CI-10)", () => {
    expect(bestimmeUmfang({ ereignis: "pull_request", entwurf: true, dateien: ["src/app/page.tsx"] })).toMatchObject({
      schnell: true,
      e2e: false,
    });
  });

  it("bereiter PR: Umfang nach Klassen (CI-11, CI-32)", () => {
    expect(bestimmeUmfang({ ereignis: "pull_request", entwurf: false, dateien: logik })).toMatchObject({
      e2e: true,
      browserVoll: false,
    });
  });

  it("Label volle-pruefung: alles, auch im Entwurf (CI-35)", () => {
    expect(
      bestimmeUmfang({ ereignis: "pull_request", entwurf: true, labels: ["volle-pruefung"], dateien: ["docs/a.md"] }),
    ).toMatchObject({ schnell: true, e2e: true, browserVoll: true, liferay625: true, liferay72: true });
  });

  it("Label automerge: mindestens Chromium und 375 px, auch bei reiner Doku (AM-R08)", () => {
    expect(
      bestimmeUmfang({ ereignis: "pull_request", entwurf: false, labels: ["automerge"], dateien: ["docs/a.md"] }),
    ).toMatchObject({ schnell: true, e2e: true, browserVoll: false });
    expect(
      bestimmeUmfang({ ereignis: "pull_request", entwurf: false, labels: ["automerge"], dateien: ["src/app/x.tsx"] }),
    ).toMatchObject({ e2e: true, browserVoll: true });
  });

  it("main nach dem Merge: nur schnelle Prüfung (CI-13)", () => {
    expect(bestimmeUmfang({ ereignis: "push", dateien: ["src/app/page.tsx"] })).toMatchObject({
      schnell: true,
      e2e: false,
    });
  });

  it("Merge-Warteschlange: Umfang nach Klassen", () => {
    expect(bestimmeUmfang({ ereignis: "merge_group", dateien: ["src/components/a.tsx"] })).toMatchObject({
      e2e: true,
      browserVoll: true,
    });
  });

  it("Wochenlauf mit neuem Commit: alles; ohne neuen Commit seit 7 Tagen: nichts (CI-14)", () => {
    expect(bestimmeUmfang({ ereignis: "schedule", tageSeitLetztemCommit: 2 })).toMatchObject({
      schnell: true,
      e2e: true,
      browserVoll: true,
      liferay625: true,
      liferay72: true,
    });
    expect(bestimmeUmfang({ ereignis: "schedule", tageSeitLetztemCommit: 8 })).toMatchObject({
      schnell: false,
      e2e: false,
    });
  });

  it("Start von Hand: voll als Standard, auf Wunsch nach Klassen (CI-35)", () => {
    expect(bestimmeUmfang({ ereignis: "workflow_dispatch" })).toMatchObject({ e2e: true, browserVoll: true });
    expect(bestimmeUmfang({ ereignis: "workflow_dispatch", auswahl: "klassen", dateien: ["docs/a.md"] })).toMatchObject(
      {
        schnell: true,
        e2e: false,
      },
    );
  });
});

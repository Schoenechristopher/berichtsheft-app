import { describe, expect, it } from "vitest";
import { isTheme, resolveTheme, themeAttribute, themeFromCookie } from "./theme";

describe("Darstellung", () => {
  it("UI-AK-14 die Wahl am Konto gilt vor dem Cookie, damit sie auf einem zweiten Gerät wirkt", () => {
    expect(resolveTheme("DARK", "light")).toBe("DARK");
    expect(resolveTheme("SYSTEM", "dark")).toBe("SYSTEM");
  });

  it("UI-AK-15 ohne Anmeldung zählt das Cookie, sonst „System“", () => {
    expect(resolveTheme(null, "dark")).toBe("DARK");
    expect(resolveTheme(undefined, "LIGHT")).toBe("LIGHT");
    expect(resolveTheme(null, null)).toBe("SYSTEM");
    expect(resolveTheme(null, "lila")).toBe("SYSTEM");
  });

  it("liest nur bekannte Werte und liefert das Attribut für das html-Element", () => {
    expect(themeFromCookie("system")).toBe("SYSTEM");
    expect(themeFromCookie("")).toBeNull();
    expect(isTheme("DARK")).toBe(true);
    expect(isTheme("dark")).toBe(false);
    expect(themeAttribute("DARK")).toBe("dark");
    expect(themeAttribute("SYSTEM")).toBe("system");
  });
});

"use client";

import { useState, useTransition } from "react";
import {
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_LABELS,
  THEMES,
  themeAttribute,
  type Theme,
} from "@/domain/theme";
import { SegmentRadio } from "@/components/ui/segment-radio";
import { useToast } from "@/components/ui/toast";

/**
 * Darstellung „System / Hell / Dunkel“ (UI-AK-14): wirkt sofort (Attribut `data-theme` am
 * html-Element und Cookie) und wird am Konto gespeichert, damit sie auch auf einem zweiten Gerät
 * gilt. „System“ folgt `prefers-color-scheme` (UI-AK-15).
 */
export function ThemeSettings({
  initial,
  save,
}: {
  initial: Theme;
  save: (theme: string) => Promise<{ ok: boolean }>;
}) {
  const [theme, setTheme] = useState<Theme>(initial);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [, startTransition] = useTransition();
  const toast = useToast();

  const choose = (next: Theme) => {
    setTheme(next);
    const value = themeAttribute(next);
    document.documentElement.dataset.theme = value;
    document.cookie = `${THEME_COOKIE}=${value}; path=/; max-age=${THEME_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
    setSaved("saving");
    startTransition(async () => {
      const result = await save(next);
      if (result.ok) {
        setSaved("saved");
      } else {
        setSaved("idle");
        toast.error("Die Darstellung konnte nicht gespeichert werden.");
      }
    });
  };

  return (
    <div className="space-y-2">
      <SegmentRadio
        legend="Farbschema"
        name="theme"
        value={theme}
        options={THEMES.map((value) => ({ value, label: THEME_LABELS[value] }))}
        onChange={choose}
        describedBy="theme-hint"
      />
      <p id="theme-hint" className="text-fg-muted text-sm">
        „System“ folgt der Einstellung Ihres Geräts. Die Wahl gilt sofort und auf allen Geräten.
      </p>
      <p aria-live="polite" className="text-fg-muted text-sm" data-testid="theme-saved">
        {saved === "saving" ? "Wird gespeichert …" : saved === "saved" ? "Darstellung gespeichert." : ""}
      </p>
    </div>
  );
}

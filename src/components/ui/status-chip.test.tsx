import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { REPORT_STATUSES, STATUS_LABELS } from "@/domain/report-status";
import { OverdueChip, STATUS_STYLES, StatusChip } from "./status-chip";

describe("Status-Chip", () => {
  it("UI-AK-13 jeder Status zeigt Symbol und Text; kein Status ist allein an der Farbe zu erkennen", () => {
    const icons = new Set<unknown>();
    for (const status of REPORT_STATUSES) {
      const html = renderToStaticMarkup(<StatusChip status={status} />);
      // Text des Status steht im Chip …
      expect(html).toContain(`>${STATUS_LABELS[status]}<`);
      // … dazu ein Symbol (dekorativ, die Bedeutung trägt der Text).
      expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
      icons.add(STATUS_STYLES[status].Icon);
    }
    // Jeder Status hat ein eigenes Symbol: Auch ohne Farben bleiben die Status unterscheidbar.
    expect(icons.size).toBe(REPORT_STATUSES.length);
    expect(new Set(REPORT_STATUSES.map((status) => STATUS_LABELS[status])).size).toBe(REPORT_STATUSES.length);
  });

  it("UI-AK-13 der Hinweis „Überfällig“ hat ebenfalls Symbol und Text; Screenreader hören auf Wunsch „Status: …“", () => {
    expect(renderToStaticMarkup(<OverdueChip />)).toMatch(/<svg[^>]*aria-hidden="true".*Überfällig/);
    const html = renderToStaticMarkup(<StatusChip status="APPROVED" prefix="Status: " testId="report-status" />);
    expect(html).toContain('<span class="sr-only">Status: </span>Freigegeben');
  });
});

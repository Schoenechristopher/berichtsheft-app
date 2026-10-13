-- AK-1204: Eine Woche, die es nicht gibt, wird abgewiesen. KW 53 nur in Jahren mit 53 ISO-Wochen;
-- ein Jahr hat 53 Wochen genau dann, wenn der 28. Dezember in KW 53 liegt (M01-R08).
ALTER TABLE "weekly_report" DROP CONSTRAINT "weekly_report_iso_week_range";
ALTER TABLE "weekly_report" ADD CONSTRAINT "weekly_report_iso_week_range"
  CHECK (
    "iso_week" BETWEEN 1 AND 52
    OR ("iso_week" = 53 AND EXTRACT(WEEK FROM make_date("iso_year", 12, 28)) = 53)
  );

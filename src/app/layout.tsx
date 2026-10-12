import type { Metadata, Viewport } from "next";
import { themeAttribute } from "@/domain/theme";
import { themeForRequest } from "@/lib/theme";
import { plexSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  // Browser-Titel „<Seite> – Berichtsheft“ (UI-AK-19); Seiten ohne eigenen Titel heißen „Berichtsheft“.
  title: { default: "Berichtsheft", template: "%s – Berichtsheft" },
  description: "Digitales Berichtsheft für Azubis und Ausbilder",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await themeForRequest();
  return (
    <html lang="de" data-theme={themeAttribute(theme)} className={`${plexSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

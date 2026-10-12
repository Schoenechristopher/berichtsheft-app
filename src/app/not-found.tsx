import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";

export const metadata: Metadata = { title: "Seite nicht gefunden" };

export default function NotFound() {
  return (
    <AuthCard title="Seite nicht gefunden">
      <p className="text-fg-muted">Die aufgerufene Adresse gibt es nicht oder nicht mehr.</p>
      <Link href="/" className="text-accent font-medium underline">
        Zur Startseite
      </Link>
    </AuthCard>
  );
}

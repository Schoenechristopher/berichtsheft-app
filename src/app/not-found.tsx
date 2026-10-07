import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";

export const metadata: Metadata = { title: "Seite nicht gefunden" };

export default function NotFound() {
  return (
    <AuthCard title="Seite nicht gefunden">
      <Link href="/" className="text-blue-700 underline">
        Zur Startseite
      </Link>
    </AuthCard>
  );
}

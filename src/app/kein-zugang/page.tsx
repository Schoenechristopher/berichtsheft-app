import type { Metadata } from "next";
import { AuthCard } from "@/components/AuthCard";
import { NO_ACCESS_MESSAGE } from "@/domain/access";
import { switchAccount } from "@/lib/auth/logout";

export const metadata: Metadata = { title: "Kein Zugang" };

/** Hinweis für abgewiesene Konten (AK-102). */
export default function NoAccessPage() {
  return (
    <AuthCard title={NO_ACCESS_MESSAGE}>
      <p className="text-sm text-slate-600">
        Ihr Firmenkonto ist für das Berichtsheft nicht freigeschaltet oder wurde deaktiviert.
      </p>
      <form action={switchAccount}>
        <button
          type="submit"
          className="w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-800 hover:bg-slate-50"
        >
          Mit anderem Konto anmelden
        </button>
      </form>
    </AuthCard>
  );
}

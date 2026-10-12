import type { Metadata } from "next";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui";
import { NO_ACCESS_MESSAGE } from "@/domain/access";
import { switchAccount } from "@/lib/auth/logout";

export const metadata: Metadata = { title: "Kein Zugang" };

/** Hinweis für abgewiesene Konten (AK-102). */
export default function NoAccessPage() {
  return (
    <AuthCard title={NO_ACCESS_MESSAGE}>
      <p className="text-fg-muted">
        Ihr Firmenkonto ist für das Berichtsheft nicht freigeschaltet oder wurde deaktiviert.
      </p>
      <form action={switchAccount}>
        <Button type="submit" variant="secondary" className="w-full">
          Mit anderem Konto anmelden
        </Button>
      </form>
    </AuthCard>
  );
}

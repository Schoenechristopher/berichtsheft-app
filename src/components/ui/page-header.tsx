import Link from "next/link";
import { ArrowLeftIcon } from "./icons";

/** „← Zurück zu <Liste>“ über dem Titel einer Unterseite. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-accent inline-flex min-h-11 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline lg:min-h-8"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      {children}
    </Link>
  );
}

/**
 * Seitentitel (24 px, genau eine h1 je Seite) mit optionaler Aktion rechts, optional darüber der
 * Zurück-Link und darunter eine Zeile in --text-muted.
 */
export function PageHeader({
  title,
  back,
  subtitle,
  meta,
  actions,
}: {
  title: React.ReactNode;
  back?: { href: string; label: string };
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {back ? <BackLink href={back.href}>{back.label}</BackLink> : null}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold break-words">{title}</h1>
          {subtitle ? <div className="text-fg-muted">{subtitle}</div> : null}
          {meta ? <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

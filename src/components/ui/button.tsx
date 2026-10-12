import Link from "next/link";
import { SpinnerIcon } from "./icons";

/**
 * Knopf (UI-Spezifikation, „Komponenten“): Haupt (gefüllt Petrol), Zweitrangig (Rahmen), Text,
 * Gefahr (gefüllt) und Gefahr-zweitrangig (Rahmen, Text in --danger). Höhe 40 px, am Handy 44 px.
 * Beschriftung immer als Verb; während einer Aktion deaktiviert mit Ladekreis und Text.
 */
export type ButtonVariant = "primary" | "secondary" | "text" | "danger" | "danger-secondary";

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-base font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 lg:min-h-10";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "border border-border-strong bg-surface text-fg hover:bg-surface-muted",
  text: "px-2 text-accent underline-offset-4 hover:underline",
  danger: "bg-danger text-on-danger hover:bg-danger-hover",
  "danger-secondary": "border border-danger bg-surface text-danger hover:bg-rejected-bg",
};

export function buttonClass(variant: ButtonVariant = "secondary", extra = ""): string {
  return `${BASE} ${VARIANTS[variant]} ${extra}`.trim();
}

/** Bisherige Namen, damit Formulare nicht doppelt gepflegt werden. */
export const primaryButtonClass = buttonClass("primary");
export const secondaryButtonClass = buttonClass("secondary");
export const dangerButtonClass = buttonClass("danger");

export function Button({
  variant = "secondary",
  pending = false,
  pendingLabel,
  className = "",
  children,
  type = "button",
  disabled,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  /** Aktion läuft: deaktiviert, mit Ladekreis und `pendingLabel` („Wird eingereicht …“). */
  pending?: boolean;
  pendingLabel?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={buttonClass(variant, className)}
      {...props}
    >
      {pending ? <SpinnerIcon /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/** Link im Aussehen eines Knopfs, z. B. „Person anlegen“ im Seitentitel. */
export function ButtonLink({
  href,
  variant = "secondary",
  className = "",
  children,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "className"> & { variant?: ButtonVariant; className?: string }) {
  return (
    <Link href={href} className={buttonClass(variant, className)} {...props}>
      {children}
    </Link>
  );
}

/**
 * Auslassungspunkte hinter Knöpfen, die einen Dialog öffnen („Einreichen …“). Sie gehören nicht
 * zum zugänglichen Namen; der Knopf heißt für Screenreader „Einreichen“.
 */
export function Ellipsis() {
  return <span aria-hidden="true"> …</span>;
}

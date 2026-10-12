"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE_SECONDS, themeAttribute, type Theme } from "@/domain/theme";
import { NotificationBell } from "@/components/ui/bell";
import { ToastProvider } from "@/components/ui/toast";
import {
  BellIcon,
  CalendarIcon,
  ChevronDownIcon,
  ClipboardIcon,
  CloseIcon,
  HomeIcon,
  InboxIcon,
  MailWarningIcon,
  MenuIcon,
  SettingsIcon,
  UserCogIcon,
  UsersIcon,
} from "@/components/ui/icons";

export type NavIcon =
  "home" | "weeks" | "review" | "trainees" | "people" | "notifications" | "settings" | "undeliverable" | "mailbox";

const ICONS: Record<NavIcon, (props: { className?: string }) => React.ReactNode> = {
  home: HomeIcon,
  weeks: CalendarIcon,
  review: ClipboardIcon,
  trainees: UsersIcon,
  people: UserCogIcon,
  notifications: BellIcon,
  settings: SettingsIcon,
  undeliverable: MailWarningIcon,
  mailbox: InboxIcon,
};

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  /** Pfade, unter denen der Punkt aktiv ist (Präfix); ohne Angabe nur `href` genau. */
  match?: string[];
  count?: number;
  countTone?: "neutral" | "danger";
  testId?: string;
  /** Abgesetzt unter einer Trennlinie (Teams-Postfach der Demo). */
  separated?: boolean;
}

function isActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) {
    return true;
  }
  return (item.match ?? []).some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Rahmen nach der Anmeldung (UI-Spezifikation, „Layout und Navigation“): feste Kopfzeile (56 px)
 * mit Burger-Knopf (unter 1024 px), Schriftzug, Glocke und Kontomenü; ab 1024 px feste
 * Seitenleiste (240 px), darunter dieselbe Navigation als Schublade von links (UI-AK-01). Die
 * Schublade schließt per „Schließen“, Escape, Tippen auf den abgedunkelten Bereich und nach Wahl
 * eines Menüpunkts; solange sie offen ist, bleibt der Fokus in ihr (der Rest ist `inert`) und
 * kehrt danach zum Burger-Knopf zurück. „Zum Inhalt springen“ ist der erste Link.
 */
export function AppShell({
  homeHref,
  navLabel,
  items,
  person,
  unread,
  demo,
  theme,
  logout,
  children,
}: {
  homeHref: string;
  navLabel: string;
  items: NavItem[];
  person: { name: string; role: string; settingsHref: string };
  unread: number;
  demo: boolean;
  theme: Theme;
  logout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const navId = useId();

  useThemeCookie(theme);

  // Nach dem Schließen zurück zum Burger-Knopf – erst, wenn die Kopfzeile nicht mehr `inert` ist.
  const returnFocus = useRef(false);
  const closeDrawer = useCallback(() => {
    returnFocus.current = true;
    setDrawerOpen(false);
  }, []);
  useEffect(() => {
    if (!drawerOpen && returnFocus.current) {
      returnFocus.current = false;
      burgerRef.current?.focus();
    }
  }, [drawerOpen]);

  // Ab 1024 px gibt es keine Schublade: beim Vergrößern schließen.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = () => query.matches && setDrawerOpen(false);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }
    drawerRef.current?.querySelector<HTMLElement>("[data-drawer-close]")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, closeDrawer]);

  const regular = items.filter((item) => !item.separated);
  const separated = items.filter((item) => item.separated);

  const navLink = (item: NavItem) => {
    const active = isActive(item, pathname);
    const Icon = ICONS[item.icon];
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          data-testid={item.testId}
          onClick={() => setDrawerOpen(false)}
          className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-base font-medium lg:min-h-10 ${
            active ? "bg-accent-soft text-accent" : "text-fg hover:bg-surface-muted"
          }`}
        >
          <Icon className="h-5 w-5" />
          <span className="min-w-0 flex-1 break-words">{item.label}</span>
          {item.count !== undefined && item.count > 0 ? (
            <>
              <span className="sr-only"> (</span>
              <span
                className={`min-w-6 rounded-full px-1.5 text-center text-xs leading-5 font-semibold tabular-nums ${
                  item.countTone === "danger" ? "bg-danger text-on-danger" : "bg-surface-muted text-fg"
                }`}
              >
                {item.count}
              </span>
              <span className="sr-only">)</span>
            </>
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <ToastProvider>
      <a
        href="#inhalt"
        className="bg-accent text-on-accent fixed top-2 left-2 z-[60] -translate-y-20 rounded-md px-4 py-2 font-medium focus:translate-y-0"
      >
        Zum Inhalt springen
      </a>
      <header
        inert={drawerOpen || undefined}
        className="border-border bg-surface fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b px-2 sm:px-4"
      >
        <button
          ref={burgerRef}
          type="button"
          aria-expanded={drawerOpen}
          aria-controls={navId}
          onClick={() => setDrawerOpen(true)}
          className="text-fg hover:bg-surface-muted inline-flex h-11 w-11 items-center justify-center rounded-md lg:hidden"
        >
          <MenuIcon />
          <span className="sr-only">Menü öffnen</span>
        </button>
        <Link href={homeHref} className="text-fg rounded-md px-2 py-1 text-lg font-semibold">
          Berichtsheft
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell initialUnread={unread} />
          <AccountMenu person={person} logout={logout} />
        </div>
      </header>

      {drawerOpen ? (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={closeDrawer}
          className="bg-backdrop fixed inset-0 z-40 lg:hidden"
        />
      ) : null}
      <nav
        ref={drawerRef}
        id={navId}
        aria-label={navLabel}
        className={`border-border bg-surface fixed bottom-0 left-0 flex-col border-r ${
          drawerOpen ? "top-0 z-50 flex w-80 max-w-[85vw] shadow-xl" : "top-14 z-20 hidden w-60 lg:flex"
        }`}
      >
        {drawerOpen ? (
          <div className="border-border flex h-14 shrink-0 items-center justify-between border-b px-4">
            <span className="text-lg font-semibold">Berichtsheft</span>
            <button
              type="button"
              data-drawer-close=""
              onClick={closeDrawer}
              className="text-fg hover:bg-surface-muted inline-flex min-h-11 items-center gap-1.5 rounded-md px-3"
            >
              <CloseIcon />
              Schließen
            </button>
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
          <ul className="space-y-1">{regular.map(navLink)}</ul>
          {separated.length > 0 ? (
            <ul className="border-border mt-3 space-y-1 border-t pt-3">{separated.map(navLink)}</ul>
          ) : null}
          {demo ? (
            <p className="text-fg-muted mt-auto px-3 pt-6 text-xs">
              <span className="font-medium">Demo</span> – Testdaten, Test-Login bzw. simuliertes Teams-Postfach aktiv.
            </p>
          ) : null}
        </div>
      </nav>

      <div inert={drawerOpen || undefined} className="flex flex-1 flex-col pt-14 lg:pl-60">
        <main id="inhalt" tabIndex={-1} className="flex-1 px-4 py-6 focus:outline-none lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}

/**
 * Kontomenü: Name und Rolle, „Einstellungen“ und „Abmelden“. Öffnet per Klick, schließt mit
 * Escape oder Klick daneben.
 */
function AccountMenu({
  person,
  logout,
}: {
  person: { name: string; role: string; settingsHref: string };
  logout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const initials = person.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  // Seitenwechsel schließt das Menü.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="text-fg hover:bg-surface-muted inline-flex min-h-11 items-center gap-2 rounded-md px-1.5 sm:px-2"
      >
        <span
          aria-hidden="true"
          className="bg-accent-soft text-accent inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
        >
          {initials}
        </span>
        <span className="sr-only">Konto: </span>
        <span className="sr-only sm:not-sr-only sm:max-w-40 sm:truncate sm:text-sm sm:font-medium">{person.name}</span>
        <ChevronDownIcon className="hidden h-4 w-4 sm:block" />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="rounded-card border-border bg-surface text-fg absolute top-full right-0 z-40 mt-2 w-64 max-w-[calc(100vw-1rem)] border p-2 shadow-xl"
      >
        <p className="px-3 py-2 text-sm" data-testid="current-person">
          <span className="block font-medium break-words">{person.name}</span>
          <span className="text-fg-muted block">
            <span className="sr-only"> · </span>
            {person.role}
          </span>
        </p>
        <div className="border-border border-t pt-1">
          <Link
            href={person.settingsHref}
            className="hover:bg-surface-muted flex min-h-11 items-center rounded-md px-3 text-sm font-medium lg:min-h-10"
          >
            Einstellungen
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="hover:bg-surface-muted flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm font-medium lg:min-h-10"
            >
              Abmelden
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Hält das Cookie der Darstellung mit der Wahl am Konto gleich: So zeigt auch die Anmeldeseite
 * nach dem Abmelden das gewählte Farbschema, und ein zweites Gerät übernimmt es (UI-AK-14).
 */
function useThemeCookie(theme: Theme) {
  useEffect(() => {
    const value = themeAttribute(theme);
    if (!document.cookie.split("; ").includes(`${THEME_COOKIE}=${value}`)) {
      document.cookie = `${THEME_COOKIE}=${value}; path=/; max-age=${THEME_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
    }
  }, [theme]);
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertIcon, CheckIcon, CloseIcon } from "./icons";

/**
 * Toast (UI-Spezifikation): Erfolg verschwindet nach 5 s, Fehler bleibt bis zum Schließen.
 * Unten rechts, am Handy unten mittig; über einer festen Fußleiste (`--toast-offset`).
 * Erfolg als `role="status"`, Fehler als `role="alert"`. Der Bereich liegt im Rahmen der App und
 * bleibt beim Seitenwechsel erhalten, damit z. B. „Bericht freigegeben“ nach dem Sprung zum
 * nächsten Bericht stehen bleibt.
 */
export type ToastTone = "success" | "error";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const SUCCESS_DURATION_MS = 5000;

const ToastContext = createContext<ToastApi | null>(null);

const noop: ToastApi = { success: () => {}, error: () => {} };

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? noop;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const show = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      // Dieselbe Meldung nicht doppelt stapeln (z. B. zweimal derselbe Konflikt).
      setItems((current) => [...current.filter((item) => item.message !== message), { id, tone, message }]);
      if (tone === "success") {
        window.setTimeout(() => dismiss(id), SUCCESS_DURATION_MS);
      }
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(
    () => ({ success: (message) => show("success", message), error: (message) => show("error", message) }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4 sm:items-end"
        style={{ bottom: "calc(var(--toast-offset, 0px) + 16px)" }}
      >
        {items.map((item) => (
          <Toast key={item.id} item={item} onClose={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const Icon = item.tone === "success" ? CheckIcon : AlertIcon;
  return (
    <div
      role={item.tone === "success" ? "status" : "alert"}
      data-testid="toast"
      className={`animate-toast-in rounded-card bg-surface pointer-events-auto flex w-full max-w-sm items-start gap-3 border p-3 text-sm shadow-lg ${
        item.tone === "success" ? "border-approved/50" : "border-danger"
      }`}
    >
      <Icon className={`mt-0.5 h-5 w-5 ${item.tone === "success" ? "text-approved" : "text-danger"}`} />
      <p className="text-fg min-w-0 flex-1 break-words">{item.message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Meldung schließen"
        className="text-fg-muted hover:bg-surface-muted -m-1.5 inline-flex h-8 w-8 items-center justify-center rounded-md"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Hebt den Toast-Bereich über eine feste Fußleiste (z. B. „Woche erfassen“), solange sie da ist.
 */
export function useToastOffset(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const element = ref.current;
    if (!active || !element) {
      return;
    }
    const root = document.documentElement;
    const update = () => root.style.setProperty("--toast-offset", `${element.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--toast-offset");
    };
  }, [ref, active]);
}

/** Fehler einer Serveraktion als Fehler-Toast (z. B. AK-508 „Bericht wurde zurückgezogen“). */
export function useErrorToast(state: { ok: boolean; formError?: string; attempt: number } | null) {
  const toast = useToast();
  const shown = useRef(0);
  useEffect(() => {
    if (state && !state.ok && state.formError && shown.current !== state.attempt) {
      shown.current = state.attempt;
      toast.error(state.formError);
    }
  }, [state, toast]);
}

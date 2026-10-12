"use client";

import { useLayoutEffect, useRef } from "react";
import { inputClass } from "./field";

/**
 * Textbereich, der mit dem Inhalt mitwächst (mindestens `rows` Zeilen). `field-sizing` kann noch
 * nicht jeder Browser; deshalb die Höhe aus `scrollHeight`.
 */
export function AutoGrowTextarea({
  value,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight + 2}px`;
  }, [value]);
  return <textarea ref={ref} value={value} className={`${inputClass} resize-none ${className}`} {...props} />;
}

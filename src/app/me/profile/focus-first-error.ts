"use client";

import { useEffect, type RefObject } from "react";

/**
 * After a failed submit, scroll to and focus the first invalid control (in
 * DOM order, so it matches what the volunteer sees). Pass the action's
 * `fieldErrors`: a new object per failed submit re-runs the effect.
 *
 * Radios can't carry aria-invalid, so RadioCard marks them `data-invalid`.
 * They're visually hidden inside their cards, so for those the surrounding
 * fieldset is what gets scrolled into view.
 */
export function useFocusFirstError(
  formRef: RefObject<HTMLFormElement | null>,
  fieldErrors: Record<string, string | undefined> | undefined,
) {
  useEffect(() => {
    if (!fieldErrors || !Object.values(fieldErrors).some(Boolean)) return;
    const form = formRef.current;
    if (!form) return;
    const el = form.querySelector<HTMLElement>(
      '[aria-invalid="true"], [data-invalid]',
    );
    if (!el) return;
    const isRadio = el instanceof HTMLInputElement && el.type === "radio";
    const target = (isRadio && el.closest("fieldset")) || el;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
  }, [formRef, fieldErrors]);
}

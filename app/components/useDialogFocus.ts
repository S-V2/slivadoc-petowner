"use client";

import { useEffect, useRef } from "react";

// Use on a mounted dialog surface. Nested dialogs own focus until they close.
export function useDialogFocus<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const surface = useRef<T>(null);
  const dismiss = useRef(onClose);
  useEffect(() => { dismiss.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open || !surface.current) return;
    const dialog = surface.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const controls = () => [...dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
    )].filter((element) => element.getClientRects().length && !element.closest('[inert], [aria-hidden="true"]'));
    const ownsFocus = () => {
      const dialogs = [...document.querySelectorAll<HTMLElement>('[aria-modal="true"]')].filter((element) => element.getClientRects().length);
      return dialogs.at(-1) === dialog;
    };
    (controls()[0] ?? dialog).focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (!ownsFocus()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        dismiss.current();
      } else if (event.key === "Tab") {
        const items = controls();
        const first = items[0] ?? dialog;
        const last = items.at(-1) ?? dialog;
        if (!dialog.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);
  return surface;
}

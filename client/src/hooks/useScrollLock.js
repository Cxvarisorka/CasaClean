import { useEffect } from "react";

/**
 * Locks body scroll while `locked` is true and restores the previous overflow
 * on cleanup. Used by overlays (Modal, Drawer, MobileMenu) so the page behind
 * them doesn't scroll.
 *
 * @param {boolean} locked
 */
export function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
}

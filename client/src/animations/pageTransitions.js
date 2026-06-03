/*
 * Page transitions
 * ----------------
 * Variants consumed by the route-level <AnimatePresence> wrapper to fade and
 * lift pages as the user navigates. Intentionally subtle — premium products
 * favor calm transitions over flashy ones.
 */

import { EASE_PREMIUM } from "./tokens";

export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_PREMIUM },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.25, ease: EASE_PREMIUM },
  },
};

// Shared viewport config for scroll-reveal sections (whileInView).
export const viewportOnce = { once: true, amount: 0.25, margin: "0px 0px -10% 0px" };

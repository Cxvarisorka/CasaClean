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
//
// `amount` is an IntersectionObserver threshold — a fraction of the OBSERVED
// ELEMENT, never of the screen — so any value above zero is *unsatisfiable* for
// an element taller than the viewport, and the section then stays stuck in its
// `hidden` variant forever (i.e. invisible, not merely un-animated). That is a
// mobile-only trap: multi-column grids collapse to one column on a phone, so
// the services index became a ~3,500px column observed through a ~650px
// viewport — at most ~19% of itself visible, under the old 0.25 threshold, so
// the cards never appeared. "some" (any part visible) is height-independent;
// the negative bottom margin is what holds the reveal back until the element
// has genuinely risen into view.
export const viewportOnce = { once: true, amount: "some", margin: "0px 0px -10% 0px" };

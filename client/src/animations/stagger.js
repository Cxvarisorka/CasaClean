/*
 * Stagger variants
 * ----------------
 * Container/child pairs that cascade children into view. Pair `staggerContainer`
 * on a parent with `staggerItem` on each child for an orchestrated reveal.
 */

import { EASE_PREMIUM } from "./tokens";

export const staggerContainer = (stagger = 0.08, delayChildren = 0.1) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: stagger,
      delayChildren,
    },
  },
});

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_PREMIUM },
  },
};

export const staggerItemScale = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: EASE_PREMIUM },
  },
};

/*
 * Fade variants
 * -------------
 * Framer Motion variant factories for opacity-based entrances. Every helper
 * returns a fresh variant object so callers can tune duration/delay per use
 * without mutating shared state.
 */

import { EASE_PREMIUM } from "./tokens";

export const fadeIn = (duration = 0.6, delay = 0) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration, delay, ease: EASE_PREMIUM },
  },
});

export const fadeInUp = (distance = 24, duration = 0.6, delay = 0) => ({
  hidden: { opacity: 0, y: distance },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration, delay, ease: EASE_PREMIUM },
  },
});

export const fadeInDown = (distance = 24, duration = 0.6, delay = 0) => ({
  hidden: { opacity: 0, y: -distance },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration, delay, ease: EASE_PREMIUM },
  },
});

export const scaleIn = (from = 0.96, duration = 0.5, delay = 0) => ({
  hidden: { opacity: 0, scale: from },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration, delay, ease: EASE_PREMIUM },
  },
});

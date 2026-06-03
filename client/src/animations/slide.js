/*
 * Slide variants
 * --------------
 * Directional entrances for off-canvas elements (drawers, carousels, panels).
 */

import { EASE_PREMIUM } from "./tokens";

export const slideInLeft = (distance = 48, duration = 0.6, delay = 0) => ({
  hidden: { opacity: 0, x: -distance },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration, delay, ease: EASE_PREMIUM },
  },
});

export const slideInRight = (distance = 48, duration = 0.6, delay = 0) => ({
  hidden: { opacity: 0, x: distance },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration, delay, ease: EASE_PREMIUM },
  },
});

// Horizontal carousel transition — direction-aware (1 = next, -1 = prev).
export const carouselSlide = {
  enter: (direction) => ({
    opacity: 0,
    x: direction > 0 ? 64 : -64,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: EASE_PREMIUM },
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction > 0 ? -64 : 64,
    transition: { duration: 0.4, ease: EASE_PREMIUM },
  }),
};

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn — conditional className composer.
 *
 * Combines clsx (conditional class logic) with tailwind-merge (intelligent
 * conflict resolution, e.g. `px-2 px-4` -> `px-4`). This is the single helper
 * every component uses to merge its base styles with caller overrides, which
 * keeps variant styling declarative and override-friendly.
 *
 * @param  {...any} inputs - class values (strings, arrays, conditional objects)
 * @returns {string} merged className string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * Custom font-size utilities defined in styles/typography.css via @utility.
 * They must be registered with tailwind-merge under the `font-size` group;
 * otherwise tailwind-merge mistakes e.g. `text-body-sm` for a text *color* and
 * silently drops a real color like `text-white` when both are present
 * (`text-white text-body-sm` -> `text-body-sm`), turning button labels dark.
 */
const FONT_SIZE_UTILITIES = [
  "display",
  "heading-xl",
  "heading-lg",
  "heading-md",
  "heading-sm",
  "body-lg",
  "body-md",
  "body-sm",
  "caption",
  "eyebrow",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZE_UTILITIES }],
    },
  },
});

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

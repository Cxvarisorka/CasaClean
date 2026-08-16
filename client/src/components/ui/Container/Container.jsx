import { cn } from "@/lib/cn";

/*
 * Container
 * ---------
 * The horizontal rhythm primitive. Centralizes max-width and responsive
 * gutters so every section aligns to the same grid. `size` tunes the max-width
 * for narrow (prose) vs. wide (marketing) contexts.
 */

const SIZES = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

/* Gutter ladder: 16 / 20 / 24 / 32. The `xs` step matters more than it looks —
   on a 320px screen a 20px gutter is an eighth of the viewport, and the content
   inside is usually a card with padding of its own. Anything that pulls itself
   out to the page edge (ProfilePage's section-nav pill row) must mirror all four
   values, or it clips its first item at one width and overflows at another. */
export function Container({ as: Tag = "div", size = "xl", className, children, ...props }) {
  return (
    <Tag
      className={cn("mx-auto w-full px-4 xs:px-5 sm:px-6 lg:px-8", SIZES[size], className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

export default Container;

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

export function Container({ as: Tag = "div", size = "xl", className, children, ...props }) {
  return (
    <Tag
      className={cn("mx-auto w-full px-5 sm:px-6 lg:px-8", SIZES[size], className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

export default Container;

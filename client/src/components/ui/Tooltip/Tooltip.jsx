import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";

/*
 * Tooltip
 * -------
 * Lightweight, CSS-positioned tooltip that responds to hover and focus (so it's
 * keyboard accessible) and wires aria-describedby to its trigger. For a
 * marketing site this hover-card approach is intentionally dependency-free.
 */

const SIDES = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export function Tooltip({ content, side = "top", children, className }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            id={id}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "pointer-events-none absolute z-50 whitespace-nowrap rounded-lg",
              "bg-night px-2.5 py-1.5 text-caption font-medium text-white shadow-large",
              SIDES[side],
              className
            )}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export default Tooltip;

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useScrollLock } from "@/hooks/useScrollLock";
import { EASE_PREMIUM } from "@/animations/tokens";

/*
 * Drawer
 * ------
 * Off-canvas panel that slides in from any edge. Shares the Modal's a11y and
 * scroll-lock behavior. Used for the mobile menu and filter/detail panels.
 */

const SIDE_CONFIG = {
  right: { class: "right-0 top-0 h-full w-full max-w-sm", axis: "x", from: "100%" },
  left: { class: "left-0 top-0 h-full w-full max-w-sm", axis: "x", from: "-100%" },
  bottom: { class: "bottom-0 left-0 w-full max-h-[85vh]", axis: "y", from: "100%" },
  top: { class: "top-0 left-0 w-full max-h-[85vh]", axis: "y", from: "-100%" },
};

export function Drawer({ open, onClose, side = "right", title, children, className }) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const config = SIDE_CONFIG[side];
  const initial =
    config.axis === "x" ? { x: config.from } : { y: config.from };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            className="absolute inset-0 bg-night-soft/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title || "Panel"}
            initial={initial}
            animate={{ x: 0, y: 0 }}
            exit={initial}
            transition={{ duration: 0.35, ease: EASE_PREMIUM }}
            className={cn(
              "absolute flex flex-col bg-surface shadow-premium",
              config.class,
              className
            )}
          >
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <span className="text-heading-sm text-ink-900">{title}</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="grid size-9 place-items-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default Drawer;

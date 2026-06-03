import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useScrollLock } from "@/hooks/useScrollLock";
import { EASE_PREMIUM } from "@/animations/tokens";

/*
 * Modal
 * -----
 * Portaled, accessible dialog. Handles backdrop click, Escape-to-close, body
 * scroll lock and focus semantics (role="dialog", aria-modal). Animated in/out
 * via AnimatePresence so unmount transitions are graceful.
 */

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  closeOnBackdrop = true,
  children,
  footer,
}) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.25, ease: EASE_PREMIUM }}
            className={cn(
              "relative z-10 w-full rounded-2xl bg-white shadow-premium",
              SIZES[size]
            )}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            >
              <X className="size-5" />
            </button>

            {(title || description) && (
              <div className="px-6 pt-6 pr-14">
                {title && (
                  <h2 className="text-heading-sm text-ink-900">{title}</h2>
                )}
                {description && (
                  <p className="mt-1 text-body-sm text-ink-500">{description}</p>
                )}
              </div>
            )}

            <div className="px-6 py-5">{children}</div>

            {footer && (
              <div className="flex justify-end gap-3 border-t border-ink-100 px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default Modal;

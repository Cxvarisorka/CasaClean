import { createContext, useContext, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { EASE_PREMIUM } from "@/animations/tokens";

/*
 * Accordion
 * ---------
 * An accessible disclosure list. State is managed by the root and shared via
 * context (compound component pattern), so items stay dumb and composable.
 * Supports single (default) or multiple open panels.
 */

const AccordionContext = createContext(null);
const useAccordion = () => {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error("Accordion.* must be used within <Accordion>");
  return ctx;
};

export function Accordion({ type = "single", defaultValue, className, children }) {
  const [open, setOpen] = useState(
    defaultValue != null ? [defaultValue] : []
  );

  const toggle = (value) => {
    setOpen((prev) => {
      const isOpen = prev.includes(value);
      if (type === "multiple") {
        return isOpen ? prev.filter((v) => v !== value) : [...prev, value];
      }
      return isOpen ? [] : [value];
    });
  };

  return (
    <AccordionContext.Provider value={{ open, toggle }}>
      <div className={cn("divide-y divide-ink-100", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

Accordion.Item = function AccordionItem({ value, question, children }) {
  const { open, toggle } = useAccordion();
  const id = useId();
  const isOpen = open.includes(value);

  return (
    <div className="py-1">
      <h3>
        <button
          type="button"
          onClick={() => toggle(value)}
          aria-expanded={isOpen}
          aria-controls={`${id}-panel`}
          id={`${id}-trigger`}
          className="group flex w-full items-center justify-between gap-4 py-5 text-left"
        >
          <span className="text-heading-sm font-semibold text-ink-900 transition-colors group-hover:text-brand-700">
            {question}
          </span>
          <motion.span
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.25, ease: EASE_PREMIUM }}
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full border transition-colors",
              isOpen
                ? "border-brand-200 bg-brand-50 text-brand-600"
                : "border-ink-200 text-ink-500 group-hover:border-brand-200"
            )}
          >
            <Plus className="size-4" aria-hidden="true" />
          </motion.span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`${id}-panel`}
            role="region"
            aria-labelledby={`${id}-trigger`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_PREMIUM }}
            className="overflow-hidden"
          >
            <div className="pb-5 pr-12 text-body-md text-ink-600">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Accordion;

import { createContext, useContext, useId, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/*
 * Tabs
 * ----
 * Accessible tabbed interface with an animated active indicator (shared layout
 * animation via layoutId). Compound API: Tabs > Tabs.List > Tabs.Trigger and
 * Tabs.Panel. Controlled or uncontrolled via `defaultValue` / `value`.
 */

const TabsContext = createContext(null);
const useTabs = () => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs.* must be used within <Tabs>");
  return ctx;
};

export function Tabs({ defaultValue, value, onValueChange, className, children }) {
  const [internal, setInternal] = useState(defaultValue);
  const active = value ?? internal;
  const groupId = useId();

  const setActive = (v) => {
    setInternal(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ active, setActive, groupId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

Tabs.List = function TabsList({ className, children }) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-ink-100 bg-ink-50/70 p-1",
        className
      )}
    >
      {children}
    </div>
  );
};

Tabs.Trigger = function TabsTrigger({ value, className, children }) {
  const { active, setActive, groupId } = useTabs();
  const selected = active === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => setActive(value)}
      className={cn(
        "relative rounded-full px-4 py-2 text-body-sm font-semibold transition-colors",
        selected ? "text-ink-900" : "text-ink-500 hover:text-ink-800",
        className
      )}
    >
      {selected && (
        <motion.span
          layoutId={`tab-indicator-${groupId}`}
          className="absolute inset-0 rounded-full bg-white shadow-soft"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
};

Tabs.Panel = function TabsPanel({ value, className, children }) {
  const { active } = useTabs();
  if (active !== value) return null;

  return (
    <motion.div
      role="tabpanel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default Tabs;

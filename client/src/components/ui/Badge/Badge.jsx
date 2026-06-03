import { cn } from "@/lib/cn";

/*
 * Badge
 * -----
 * Compact status/label pill. Variants map to semantic intent rather than raw
 * colors so usage reads clearly at call sites.
 */

const VARIANTS = {
  brand: "bg-brand-50 text-brand-700 border-brand-100",
  accent: "bg-accent-100 text-accent-700 border-accent-200",
  neutral: "bg-ink-100 text-ink-700 border-ink-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-100",
  outline: "bg-transparent text-ink-600 border-ink-200",
  dark: "bg-ink-900 text-white border-ink-900",
};

const SIZES = {
  sm: "text-[0.6875rem] px-2 py-0.5 gap-1",
  md: "text-caption px-2.5 py-1 gap-1.5",
};

export function Badge({
  variant = "brand",
  size = "md",
  dot = false,
  icon: Icon,
  className,
  children,
  ...props
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold tracking-wide",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {dot && <span className="size-1.5 rounded-full bg-current opacity-70" />}
      {Icon && <Icon className="size-3.5" aria-hidden="true" />}
      {children}
    </span>
  );
}

export default Badge;

import { Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * EmptyState
 * ----------
 * A consistent "nothing here yet" surface for empty lists, no-results searches
 * and error fallbacks. An optional `action` slot keeps the user moving forward.
 */

export function EmptyState({
  icon: Icon = Inbox,
  title = "Nothing here yet",
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed",
        "border-ink-200 bg-ink-50/40 px-6 py-14 text-center",
        className
      )}
    >
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-surface shadow-soft">
        <Icon className="size-6 text-brand-500" aria-hidden="true" />
      </span>
      <h3 className="text-heading-sm text-ink-900">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-body-sm text-ink-500">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export default EmptyState;

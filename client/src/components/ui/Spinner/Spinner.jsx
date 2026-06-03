import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * Spinner
 * -------
 * Minimal loading indicator. `label` is rendered for screen readers so async
 * states are announced, not just shown.
 */

const SIZES = { sm: "size-4", md: "size-6", lg: "size-8", xl: "size-10" };

export function Spinner({ size = "md", label = "Loading", className }) {
  return (
    <span role="status" className={cn("inline-flex items-center", className)}>
      <Loader2
        className={cn("animate-spin text-brand-600", SIZES[size])}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export default Spinner;

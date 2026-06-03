import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * StarRating
 * ----------
 * Read-only star display for testimonials and reviews. Accessible label
 * communicates the value to assistive tech rather than relying on icons alone.
 */

export function StarRating({ rating = 5, max = 5, size = "size-4", className }) {
  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${rating} out of ${max} stars`}
    >
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            size,
            i < Math.round(rating)
              ? "fill-accent-400 text-accent-400"
              : "fill-ink-200 text-ink-200"
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export default StarRating;

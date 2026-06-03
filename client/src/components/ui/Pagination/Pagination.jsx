import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * Pagination
 * ----------
 * Accessible page navigation with a windowed page list (ellipses for large
 * ranges). Controlled: parent owns `page` and reacts to `onChange`.
 */

function getPageRange(current, total, siblings = 1) {
  const pages = new Set([1, total]);
  for (let i = current - siblings; i <= current + siblings; i++) {
    if (i > 1 && i < total) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);

  // Insert ellipsis markers where there are gaps.
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}

export function Pagination({ page, total, onChange, className }) {
  if (total <= 1) return null;
  const range = getPageRange(page, total);

  const btn =
    "grid size-10 place-items-center rounded-xl text-body-sm font-semibold transition-colors";

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1.5", className)}
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className={cn(btn, "text-ink-600 hover:bg-ink-100 disabled:opacity-40 disabled:hover:bg-transparent")}
      >
        <ChevronLeft className="size-5" />
      </button>

      {range.map((item, i) =>
        item === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-ink-400">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              btn,
              item === page
                ? "bg-night text-white"
                : "text-ink-600 hover:bg-ink-100"
            )}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === total}
        aria-label="Next page"
        className={cn(btn, "text-ink-600 hover:bg-ink-100 disabled:opacity-40 disabled:hover:bg-transparent")}
      >
        <ChevronRight className="size-5" />
      </button>
    </nav>
  );
}

export default Pagination;

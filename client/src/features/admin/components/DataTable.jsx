import { useDeferredValue, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/cn";

/*
 * DataTable
 * ---------
 * A reusable, accessible table for every admin list. It owns the cross-cutting
 * concerns each resource needs — client-side search, an optional filter slot
 * and pagination — while staying fully data-driven via a `columns` config:
 *
 *   columns: [{ key, header, render?(row), align?, className?, headerClassName? }]
 *
 * The optional `actions(row)` renders a trailing controls cell. Keeping all of
 * this here means each page describes *what* its columns are, never *how* a
 * table behaves.
 *
 * `loading` is the same deal: every admin collection arrives over the network,
 * and a table that renders its empty state in the meantime says "nothing here
 * yet" about data that is merely in flight. Skeleton rows are drawn INSIDE the
 * real table — same header, same column widths, same row height — so the page
 * doesn't jump when the rows land.
 */

const alignClass = { left: "text-left", center: "text-center", right: "text-right" };

// Placeholder rows drawn while a collection loads. Six is enough to read as "a
// list is coming" without inventing a page's worth of fake content; a table
// showing fewer rows than that keeps its own height.
const SKELETON_ROWS = 6;

// Deterministic per-column widths, so the placeholder reads as varied text
// rather than a block of identical bars.
const SKELETON_WIDTHS = ["w-32", "w-24", "w-28", "w-20", "w-24", "w-28"];

export function DataTable({
  columns,
  data,
  rowKey = "_id",
  actions,
  searchable = true,
  searchKeys,
  searchPlaceholder,
  filters,
  pageSize = 10,
  emptyTitle,
  emptyDescription,
  onRowClick,
  loading = false,
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  /*
   * The filter re-scans the whole collection, and admin tables are fed the full
   * unpaginated result set (bookings and users run to hundreds of rows). Two
   * things keep typing smooth: the scan is deferred, so React keeps the input
   * responsive and drops intermediate keystrokes rather than filtering on each
   * one; and it is memoized on a STRING signature of the search keys, because
   * the consumer pages rebuild their `columns` array every render — a raw
   * `columns` dependency would invalidate the memo immediately.
   */
  const deferredQuery = useDeferredValue(query);
  const keysKey = (searchKeys || columns.map((c) => c.key)).join("|");

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return data;

    const keys = keysKey.split("|");
    return data.filter((row) =>
      keys.some((k) => String(row[k] ?? "").toLowerCase().includes(q))
    );
  }, [data, deferredQuery, keysKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  const colCount = columns.length + (actions ? 1 : 0);

  return (
    <div className="space-y-4">
      {(searchable || filters) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {searchable ? (
            <Input
              leftIcon={Search}
              placeholder={searchPlaceholder || t("admin.table.search")}
              value={query}
              // Nothing to filter until the rows arrive, and a query typed
              // against an empty set would read as "no matches". Styled here
              // rather than in the primitive — the shared Input has no disabled
              // look, and this is the only place that needs one.
              disabled={loading}
              className="disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400"
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              containerClassName="sm:max-w-xs"
            />
          ) : (
            <span />
          )}
          {/* The filter slot takes whatever a page hands it — Bookings alone
              passes a status select and two date fields, ~440px of controls.
              That never fit a phone, and an unwrapped row pushed the whole
              admin page sideways instead of the filters folding onto a second
              line. Wrapping is the fix; `flex-1` on the children (below `sm`,
              where the bar owns the full width) lets whichever ones fit share a
              line and the rest stretch across their own. Deliberately no
              `min-w-0`: each control keeps its min-content floor, which is what
              the flex line-breaking reads to decide where to wrap — zero it and
              the row silently shrinks past the controls instead. */}
          {filters && (
            <div className="flex flex-wrap items-center gap-2 *:flex-1 sm:*:flex-none">
              {filters}
            </div>
          )}
        </div>
      )}

      <div
        className="overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-soft"
        aria-busy={loading || undefined}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      "px-4 py-3 text-caption font-semibold uppercase tracking-wide text-ink-500 whitespace-nowrap",
                      alignClass[col.align] || "text-left",
                      col.headerClassName
                    )}
                  >
                    {col.header}
                  </th>
                ))}
                {actions && (
                  <th scope="col" className="px-4 py-3 text-right text-caption font-semibold uppercase tracking-wide text-ink-500">
                    {t("admin.table.actions")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: Math.min(pageSize, SKELETON_ROWS) }).map((_, r) => (
                  <tr key={`skeleton-${r}`} className="border-b border-ink-100 last:border-0">
                    {columns.map((col, c) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 align-middle",
                          alignClass[col.align] || "text-left",
                          col.className
                        )}
                      >
                        <Skeleton
                          className={cn(
                            "h-4 max-w-full",
                            SKELETON_WIDTHS[c % SKELETON_WIDTHS.length],
                            // Right-aligned columns keep their bar on the right,
                            // so the placeholder sits where the value will.
                            col.align === "right" && "ml-auto",
                            col.align === "center" && "mx-auto"
                          )}
                        />
                      </td>
                    ))}
                    {actions && (
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <Skeleton rounded="rounded-lg" className="size-8" />
                          <Skeleton rounded="rounded-lg" className="size-8" />
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="p-0">
                    <EmptyState
                      title={query ? t("admin.table.noMatches") : emptyTitle || t("admin.table.empty")}
                      description={query ? t("admin.table.tryDifferent") : emptyDescription}
                      className="border-0 bg-transparent"
                    />
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr
                    key={row[rowKey]}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "border-b border-ink-100 last:border-0 transition-colors",
                      onRowClick && "cursor-pointer hover:bg-ink-50/70"
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 text-body-sm text-ink-700 align-middle",
                          alignClass[col.align] || "text-left",
                          col.className
                        )}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                    {actions && (
                      <td
                        className="px-4 py-3 text-right align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {actions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* The count line doubles as the loading announcement. `role="status"`
          only while loading — a live region here permanently would re-announce
          the result count on every keystroke in the search box. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-ink-500" role={loading ? "status" : undefined}>
          {loading ? (
            t("admin.table.loading")
          ) : (
            <>
              {filtered.length}{" "}
              {filtered.length === 1 ? t("admin.table.result") : t("admin.table.results")}
            </>
          )}
        </p>
        {!loading && <Pagination page={safePage} total={totalPages} onChange={setPage} />}
      </div>
    </div>
  );
}

export default DataTable;

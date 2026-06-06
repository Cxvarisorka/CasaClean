import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
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
 */

const alignClass = { left: "text-left", center: "text-center", right: "text-right" };

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
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const keys = searchKeys || columns.map((c) => c.key);

  // Cheap enough to derive each render (admin tables are small + paginated).
  const q = query.trim().toLowerCase();
  const filtered = q
    ? data.filter((row) =>
        keys.some((k) => String(row[k] ?? "").toLowerCase().includes(q))
      )
    : data;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

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
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              containerClassName="sm:max-w-xs"
            />
          ) : (
            <span />
          )}
          {filters && <div className="flex items-center gap-2">{filters}</div>}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-soft">
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
              {pageRows.length === 0 ? (
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-ink-500">
          {filtered.length}{" "}
          {filtered.length === 1 ? t("admin.table.result") : t("admin.table.results")}
        </p>
        <Pagination page={safePage} total={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}

export default DataTable;

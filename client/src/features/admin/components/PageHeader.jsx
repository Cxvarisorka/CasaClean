import { cn } from "@/lib/cn";

/*
 * PageHeader
 * ----------
 * Consistent title block for every admin page: an icon-badged title with an
 * optional description on the left and an actions slot (usually the primary
 * "Add" button) on the right.
 */

export function PageHeader({ icon: Icon, title, description, actions, className }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {Icon && (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 sm:size-11 sm:rounded-2xl">
            <Icon className="size-5 sm:size-5.5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-heading-md text-ink-900">{title}</h1>
          {description && (
            <p className="mt-1 max-w-xl text-body-sm text-ink-500">{description}</p>
          )}
        </div>
      </div>
      {/* Actions go full-width on phones so tap targets aren't squeezed. */}
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;

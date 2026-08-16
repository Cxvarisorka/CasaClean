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
      {/* `min-w-0` + `wrap-break-word`: a translated title ("Abonnementen &
          terugkerende diensten") has no break opportunity short enough for a
          360px column, and without them it widens the flex row past the page. */}
      <div className="flex min-w-0 items-start gap-3 xs:gap-4">
        {Icon && (
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 xs:size-11">
            <Icon className="size-5 xs:size-5.5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="wrap-break-word text-heading-md text-ink-900">{title}</h1>
          {description && (
            <p className="mt-1 max-w-xl text-body-sm text-ink-500">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
    </div>
  );
}

export default PageHeader;

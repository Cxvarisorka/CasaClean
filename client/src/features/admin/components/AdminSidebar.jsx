import { NavLink } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/cn";
import { useTranslation } from "@/i18n";
import { ADMIN_NAV } from "../constants";

/*
 * AdminSidebar
 * ------------
 * The fixed navigation rail. Shared markup for both the static desktop column
 * and the mobile drawer (rendered by AdminLayout); `onNavigate` lets the drawer
 * close itself after a selection.
 */

export function AdminSidebar({ onNavigate }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-16 items-center justify-between border-b border-ink-100 px-5">
        <Logo />
        {onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close navigation"
            className="grid size-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100 lg:hidden"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pb-1 pt-2 text-caption font-semibold uppercase tracking-wider text-ink-400">
          {t("admin.manage")}
        </p>
        {ADMIN_NAV.map(({ to, label, labelKey, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
              )
            }
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            {labelKey ? t(labelKey) : label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-ink-100 p-3">
        <NavLink
          to={ROUTES.home}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <ArrowLeft className="size-5 shrink-0" aria-hidden="true" />
          {t("admin.backToSite")}
        </NavLink>
      </div>
    </div>
  );
}

export default AdminSidebar;

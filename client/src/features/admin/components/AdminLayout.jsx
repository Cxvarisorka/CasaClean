import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Seo } from "@/seo";
import { AdminDataProvider } from "../context";
import { ADMIN_NAV } from "../constants";
import { AdminRoute } from "./AdminRoute";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

/*
 * AdminLayout
 * -----------
 * The shell for the whole admin area. It composes the guard (AdminRoute) and
 * the data store (AdminDataProvider) around a classic app frame: a fixed
 * sidebar on desktop, a slide-in drawer on mobile, a sticky topbar and the
 * routed page in the scroll region.
 *
 * It is the single lazy entry point for the admin bundle, so none of this code
 * ships to visitors who never open /admin.
 */

export function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();

  // Tab title reflects the active section, e.g. "Bookings · Admin".
  const active = ADMIN_NAV.find((n) => n.to === pathname);
  const pageTitle = active ? `${active.label} · Admin` : "Admin";

  return (
    <AdminRoute>
      <Seo title={pageTitle} path={pathname} noIndex />
      <AdminDataProvider>
        <div className="min-h-dvh bg-sand-50 lg:flex">
          {/* Desktop sidebar */}
          <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-ink-100 lg:block">
            <AdminSidebar />
          </aside>

          {/* Mobile drawer */}
          <AnimatePresence>
            {drawerOpen && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <motion.div
                  className="absolute inset-0 bg-night-soft/50 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setDrawerOpen(false)}
                />
                <motion.aside
                  className="absolute left-0 top-0 h-full w-72 max-w-[85%] border-r border-ink-100 shadow-large"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", stiffness: 320, damping: 34 }}
                >
                  <AdminSidebar onNavigate={() => setDrawerOpen(false)} />
                </motion.aside>
              </div>
            )}
          </AnimatePresence>

          {/* Main column */}
          <div className="flex min-w-0 flex-1 flex-col">
            <AdminTopbar onOpenSidebar={() => setDrawerOpen(true)} />
            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <div className="mx-auto max-w-6xl">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </AdminDataProvider>
    </AdminRoute>
  );
}

export default AdminLayout;

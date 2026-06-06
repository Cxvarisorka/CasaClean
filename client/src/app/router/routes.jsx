import { Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { MainLayout, EmptyLayout } from "@/app/layouts";
import { PageLoader } from "@/components/shared/PageLoader";
import { ROUTES } from "@/constants/routes";
import { RequireAuth } from "./RequireAuth";
import {
  MAIN_ROUTES,
  FOCUSED_ROUTES,
  BARE_ROUTES,
  ADMIN_LAYOUT,
  ADMIN_ROUTES,
  FALLBACK_ROUTE,
} from "./routeConfig";

const AdminLayout = ADMIN_LAYOUT;

/*
 * AppRoutes
 * ---------
 * Renders the route table from routeConfig. <AnimatePresence> keyed on the
 * location pathname drives page-level enter/exit transitions, and a single
 * <Suspense> boundary handles the loading state for every lazy page chunk.
 */

export function AppRoutes() {
  const location = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
      {/* No `initial={false}`: it would propagate through AnimatePresence's
          context and suppress every nested entrance animation on first load
          (hero stagger, section reveals). We WANT those to play on first visit,
          so we let the initial mount animate. */}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Marketing surfaces */}
          <Route element={<MainLayout />}>
            {MAIN_ROUTES.map(({ path, element: Element, index, protected: isProtected }) => (
              <Route
                key={path}
                path={index ? undefined : path}
                index={index || undefined}
                element={
                  isProtected ? (
                    <RequireAuth>
                      <Element />
                    </RequireAuth>
                  ) : (
                    <Element />
                  )
                }
              />
            ))}
          </Route>

          {/* Focused flows with a minimal branded header */}
          <Route element={<EmptyLayout />}>
            {FOCUSED_ROUTES.map(({ path, element: Element, protected: isProtected }) => (
              <Route
                key={path}
                path={path}
                element={
                  isProtected ? (
                    <RequireAuth>
                      <Element />
                    </RequireAuth>
                  ) : (
                    <Element />
                  )
                }
              />
            ))}
          </Route>

          {/* Standalone full-screen routes (own their chrome) */}
          {BARE_ROUTES.map(({ path, element: Element }) => (
            <Route key={path} path={path} element={<Element />} />
          ))}

          {/* Admin console — guarded shell with nested pages */}
          <Route path={ROUTES.admin.root} element={<AdminLayout />}>
            {ADMIN_ROUTES.map(({ path, element: Element, index }) => (
              <Route
                key={path || "index"}
                path={index ? undefined : path}
                index={index || undefined}
                element={<Element />}
              />
            ))}
          </Route>

          {/* 404 — rendered inside MainLayout for consistent chrome */}
          <Route element={<MainLayout />}>
            <Route path={FALLBACK_ROUTE.path} element={<FALLBACK_ROUTE.element />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default AppRoutes;

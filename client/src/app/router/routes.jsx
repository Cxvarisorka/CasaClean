import { Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { MainLayout, EmptyLayout } from "@/app/layouts";
import { PageLoader } from "@/components/shared/PageLoader";
import {
  MAIN_ROUTES,
  FOCUSED_ROUTES,
  BARE_ROUTES,
  FALLBACK_ROUTE,
} from "./routeConfig";

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
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          {/* Marketing surfaces */}
          <Route element={<MainLayout />}>
            {MAIN_ROUTES.map(({ path, element: Element, index }) => (
              <Route
                key={path}
                path={index ? undefined : path}
                index={index || undefined}
                element={<Element />}
              />
            ))}
          </Route>

          {/* Focused flows with a minimal branded header */}
          <Route element={<EmptyLayout />}>
            {FOCUSED_ROUTES.map(({ path, element: Element }) => (
              <Route key={path} path={path} element={<Element />} />
            ))}
          </Route>

          {/* Standalone full-screen routes (own their chrome) */}
          {BARE_ROUTES.map(({ path, element: Element }) => (
            <Route key={path} path={path} element={<Element />} />
          ))}

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

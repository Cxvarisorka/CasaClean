import { ScrollToTop } from "@/components/shared/ScrollToTop";
import { AppRoutes } from "./routes";

/*
 * AppRouter
 * ---------
 * Router entry point. Mounts ScrollToTop (resets scroll on navigation) and the
 * route tree. Kept separate from AppProviders so routing concerns stay in the
 * router module.
 */

export function AppRouter() {
  return (
    <>
      <ScrollToTop />
      <AppRoutes />
    </>
  );
}

export default AppRouter;

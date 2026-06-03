import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/*
 * MainLayout
 * ----------
 * The marketing shell: persistent Navbar + Footer with the routed page in
 * between. A skip link keeps keyboard/screen-reader users efficient, and the
 * <main> carries the focus target for accessible route changes.
 */

export function MainLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only-focusable fixed left-4 top-4 z-[200] rounded-lg bg-ink-900 px-4 py-2 text-body-sm font-semibold text-white focus:not-sr-only"
      >
        Skip to content
      </a>

      <Navbar />

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

export default MainLayout;

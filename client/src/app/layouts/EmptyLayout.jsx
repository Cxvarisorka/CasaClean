import { Outlet } from "react-router-dom";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/shared/Logo";
import { SITE } from "@/constants/metadata";

/*
 * EmptyLayout
 * -----------
 * A chrome-free shell for focused, single-task flows (e.g. the booking wizard)
 * where the full Navbar/Footer would distract. Keeps only a minimal branded
 * header so the user always has a way home.
 */

export function EmptyLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-sand-50">
      <header className="border-b border-ink-100 bg-surface/80 py-4 backdrop-blur">
        <Container className="flex items-center justify-between">
          <Logo />
          <a
            href={SITE.phoneHref}
            className="text-body-sm font-medium text-ink-600 transition-colors hover:text-ink-900"
          >
            Need help? {SITE.phone}
          </a>
        </Container>
      </header>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default EmptyLayout;

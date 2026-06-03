import { Outlet } from "react-router-dom";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/shared/Logo";

/*
 * DashboardLayout
 * ---------------
 * Scaffold for the authenticated host dashboard (post-MVP surface). It mirrors
 * the structure the product will grow into — a fixed sidebar shell — so future
 * authenticated routes drop in without reworking the layout layer.
 */

export function DashboardLayout() {
  return (
    <div className="min-h-dvh bg-sand-50">
      <header className="border-b border-ink-100 bg-white">
        <Container size="full" className="flex h-16 items-center justify-between">
          <Logo />
          <span className="text-body-sm text-ink-500">Host dashboard</span>
        </Container>
      </header>

      <Container size="full" className="py-8">
        <Outlet />
      </Container>
    </div>
  );
}

export default DashboardLayout;

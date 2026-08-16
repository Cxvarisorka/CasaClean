import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PageLoader } from "@/components/shared/PageLoader";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/admin/context/AuthContext";

/*
 * RequireAuth
 * -----------
 * Route guard for surfaces that only registered users may reach (e.g. the
 * booking flow). Waits for the session check to resolve, then sends guests to
 * sign in — preserving the attempted location so they're returned afterwards.
 *
 * The guard itself mounts immediately, even while the session is still
 * resolving, which makes it the right place to run a route's `warm` hook: work
 * that doesn't depend on who the visitor is can start now rather than queue
 * behind the auth round trip. See routeConfig.js.
 */

export function RequireAuth({ children, warm }) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    warm?.(queryClient);
  }, [warm, queryClient]);

  if (isLoading) return <PageLoader />;

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.signin} state={{ from: location }} replace />;
  }

  return children;
}

export default RequireAuth;

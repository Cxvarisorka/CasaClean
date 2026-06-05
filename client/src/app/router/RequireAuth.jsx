import { Navigate, useLocation } from "react-router-dom";
import { PageLoader } from "@/components/shared/PageLoader";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/admin/context";

/*
 * RequireAuth
 * -----------
 * Route guard for surfaces that only registered users may reach (e.g. the
 * booking flow). Waits for the session check to resolve, then sends guests to
 * sign in — preserving the attempted location so they're returned afterwards.
 */

export function RequireAuth({ children }) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.signin} state={{ from: location }} replace />;
  }

  return children;
}

export default RequireAuth;

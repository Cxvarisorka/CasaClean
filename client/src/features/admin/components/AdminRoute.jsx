import { Navigate, useLocation } from "react-router-dom";
import { PageLoader } from "@/components/shared/PageLoader";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "../context";

/*
 * AdminRoute
 * ----------
 * Gate for the admin area. Waits for the auth check to resolve, then either
 * renders the protected tree or redirects to sign in, preserving the intended
 * destination so the user can be returned after login. Access is governed by
 * `canAccessAdmin` (real admins, plus everyone while the demo fallback is on).
 */

export function AdminRoute({ children }) {
  const { isLoading, canAccessAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!canAccessAdmin) {
    return <Navigate to={ROUTES.signin} state={{ from: location }} replace />;
  }

  return children;
}

export default AdminRoute;

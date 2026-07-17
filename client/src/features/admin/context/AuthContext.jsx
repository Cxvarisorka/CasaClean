import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMe, signOut } from "@/features/auth/api/authApi";

/*
 * AuthContext
 * -----------
 * Exposes the currently authenticated principal to the app. On mount (and via
 * `refresh()` after login) it asks the API who the session belongs to
 * (`GET /auth/me`). Any real session — whatever the role — is preserved as-is.
 *
 * `isAuthenticated` is the gate real, registered users must pass (e.g. to reach
 * the booking flow). It is true only for a genuine session.
 *
 * A now-retired demo mode used to fall back to a local "demo admin" so the panel
 * stayed explorable before a real admin auth flow existed. Now that the
 * dedicated admin login (/admin/login) is in place and a real admin account
 * exists, the fallback is OFF: access is strictly gated on the DB role. Flip
 * DEMO_FALLBACK back to true only to re-open the panel without authentication.
 */

const DEMO_FALLBACK = false;

const DEMO_ADMIN = {
  _id: "demo-admin",
  fullname: "CasaClean Admin",
  email: "admin@casaclean.com",
  role: "admin",
  demo: true,
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | authed | guest

  // Resolve the current session. A real user (any role) wins; otherwise we
  // either drop to the demo admin (panel-only) or mark the visitor a guest.
  const refresh = useCallback(async () => {
    try {
      const data = await getMe();
      const me = data?.user ?? data;
      if (me && (me._id || me.email)) {
        setUser(me);
        setStatus("authed");
        return me;
      }
      throw new Error("no-session");
    } catch {
      setUser(DEMO_FALLBACK ? DEMO_ADMIN : null);
      setStatus(DEMO_FALLBACK ? "authed" : "guest");
      return null;
    }
  }, []);

  useEffect(() => {
    // Async IIFE: state updates land in an awaited continuation, not
    // synchronously in the effect body.
    (async () => {
      await refresh();
    })();
  }, [refresh]);

  // Optimistically merge a patch into the current user (used by profile edits).
  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch {
      /* tolerate a missing/unreachable endpoint in front-end-only mode */
    }
    setUser(DEMO_FALLBACK ? DEMO_ADMIN : null);
    setStatus(DEMO_FALLBACK ? "authed" : "guest");
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isLoading: status === "loading",
      // Real session only — the demo admin is deliberately not "authenticated".
      isAuthenticated: status === "authed" && !user?.demo,
      isAdmin: user?.role === "admin",
      // Who may open the admin panel. Real admins always can; while
      // DEMO_FALLBACK is on, the panel stays explorable for anyone (handy
      // before an admin auth flow exists). Set DEMO_FALLBACK = false to make
      // this strictly admin-only.
      canAccessAdmin: user?.role === "admin" || DEMO_FALLBACK,
      refresh,
      updateUser,
      logout,
    }),
    [user, status, refresh, updateUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

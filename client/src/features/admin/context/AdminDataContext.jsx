import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RESOURCES } from "../api/adminApi";

/*
 * AdminDataContext
 * ----------------
 * The single source of truth for every admin-managed collection (services,
 * cities, special requests, bookings). Everything is read from and written to
 * the real backend (MongoDB) — there is no seed or localStorage.
 * create/update/remove call the matching API endpoint and then patch local
 * state from the server's response.
 *
 * The API is deliberately generic — `create/update/remove(collection, …)` — so
 * pages stay declarative and every collection is wired the same way.
 *
 * Loading is DEMAND-DRIVEN. Opening any admin page used to fetch all nine
 * collections — every booking, user, worker, review and message in the
 * database, paged 100 at a time — when the Cities page needs exactly one of
 * them. Each consumer now declares what it reads (`useCollection` knows its own
 * name; `useAdminData` exposes `stats`, which spans everything, so it asks for
 * all of them), and a collection is fetched at most once per session.
 */

const AdminDataContext = createContext(null);

const EMPTY_DB = {
  cities: [],
  services: [],
  specialRequests: [],
  // Physical tools (mop, vacuum, …) with a surcharge and per-service availability.
  cleaningTools: [],
  bookings: [],
  // Loaded from the admin-only GET /auth/users endpoint (read-only).
  users: [],
  // Cleaning staff, managed via the admin-only /worker endpoints.
  workers: [],
  // Customer reviews, loaded from the admin-only GET /review feed. They're
  // authored by customers, so the panel only reads and moderates them: publish
  // / hide on the public site, or delete.
  reviews: [],
  // Website contact-form submissions. Read-only apart from their triage status
  // (new / handled).
  contactMessages: [],
};

const ALL_COLLECTIONS = Object.keys(EMPTY_DB);

export function AdminDataProvider({ children }) {
  const [db, setDb] = useState(EMPTY_DB);
  const [error, setError] = useState(null);
  // Collections that have finished at least one fetch. A collection nobody has
  // asked for is never "settled", so a page reads `loading` until its own data
  // has actually arrived rather than until some unrelated request finished.
  const [settled, setSettled] = useState(() => new Set());
  // Requested-at-least-once, in a ref so `ensure` can dedupe without re-running.
  const requested = useRef(new Set());

  // `allSettled` so one failing resource (e.g. bookings, which needs the admin
  // role) doesn't blank the whole panel.
  const load = useCallback(async (names) => {
    if (!names.length) return;

    const results = await Promise.allSettled(
      names.map((name) => RESOURCES[name].list())
    );

    setDb((prev) => {
      const next = { ...prev };
      let changed = false;
      results.forEach((res, i) => {
        if (res.status === "fulfilled") {
          next[names[i]] = res.value;
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    const failed = results.find((r) => r.status === "rejected");
    setError(failed ? failed.reason : null);
    setSettled((prev) => {
      const next = new Set(prev);
      names.forEach((n) => next.add(n));
      return next;
    });
  }, []);

  /** Declare that a mounted consumer reads these collections. */
  const ensure = useCallback(
    (names) => {
      const missing = names.filter((n) => !requested.current.has(n));
      if (!missing.length) return;
      missing.forEach((n) => requested.current.add(n));
      void load(missing);
    },
    [load]
  );

  // Re-sync everything already in play (after a failed write, or on demand).
  const refresh = useCallback(
    () => load([...requested.current]),
    [load]
  );

  // Run a mutation against the backend. On failure we surface the server's
  // message and re-sync from the source of truth, then report failure so the
  // caller can keep an edit dialog open. Never throws (safe for fire-and-forget
  // inline toggles).
  const runMutation = useCallback(
    async (fn) => {
      try {
        await fn();
        return true;
      } catch (err) {
        // Guard against a collection that has no backend resource wired up, so a
        // stray call surfaces a clear message instead of an opaque TypeError.
        if (err instanceof TypeError) {
          if (typeof window !== "undefined")
            window.alert("This collection isn't backed by the API.");
          return false;
        }
        // A rejected write is usually a per-field validation failure, and the
        // bare envelope message ("Validation failed!") tells the admin nothing
        // about WHICH field. The API returns the field errors alongside it —
        // append them so the dialog is actionable.
        const message =
          err?.message || "The request failed. Please try again.";
        const details = err?.fields
          ? Object.entries(err.fields)
              .map(([field, msgs]) => `• ${field}: ${[].concat(msgs).join(" ")}`)
              .join("\n")
          : "";
        if (typeof window !== "undefined")
          window.alert(details ? `${message}\n\n${details}` : message);
        await refresh();
        return false;
      }
    },
    [refresh]
  );

  const create = useCallback(
    (collection, item) =>
      runMutation(async () => {
        const record = await RESOURCES[collection].create(item);
        setDb((s) => ({
          ...s,
          [collection]: [record, ...s[collection]],
        }));
      }),
    [runMutation]
  );

  const update = useCallback(
    (collection, id, patch) =>
      runMutation(async () => {
        const record = await RESOURCES[collection].update(id, patch);
        setDb((s) => ({
          ...s,
          [collection]: s[collection].map((row) =>
            row._id === id ? { ...row, ...record } : row
          ),
        }));
      }),
    [runMutation]
  );

  const remove = useCallback(
    (collection, id) =>
      runMutation(async () => {
        await RESOURCES[collection].remove(id);
        setDb((s) => ({
          ...s,
          [collection]: s[collection].filter((row) => row._id !== id),
        }));
      }),
    [runMutation]
  );

  // Lightweight derived metrics for the dashboard.
  const stats = useMemo(() => {
    const revenue = db.bookings
      .filter((b) => b.status === "completed" || b.status === "confirmed")
      .reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);

    const byStatus = db.bookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {});

    // Quality metrics from the review feed: count, mean score and a 1–5
    // distribution the Quality page renders as bars.
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let ratingSum = 0;
    db.reviews.forEach((r) => {
      const score = Number(r.rating) || 0;
      if (score >= 1 && score <= 5) {
        ratingDistribution[score] += 1;
        ratingSum += score;
      }
    });
    const reviewCount = db.reviews.length;
    const avgRating = reviewCount ? ratingSum / reviewCount : 0;

    return {
      bookings: db.bookings.length,
      revenue,
      services: db.services.length,
      activeServices: db.services.filter((s) => s.enabled).length,
      cities: db.cities.length,
      activeCities: db.cities.filter((c) => c.enabled).length,
      specialRequests: db.specialRequests.length,
      cleaningTools: db.cleaningTools.length,
      users: db.users.length,
      byStatus,
      reviews: reviewCount,
      avgRating,
      ratingDistribution,
      contactMessages: db.contactMessages.length,
      // Untriaged messages — what the inbox badge counts.
      newContactMessages: db.contactMessages.filter((m) => m.status !== "handled").length,
    };
  }, [db]);

  const value = useMemo(
    () => ({ ...db, stats, settled, error, ensure, create, update, remove, refresh }),
    [db, stats, settled, error, ensure, create, update, remove, refresh]
  );

  return (
    <AdminDataContext.Provider value={value}>
      {children}
    </AdminDataContext.Provider>
  );
}

// Provider + consumer hooks are co-located (standard context pattern).
function useAdminContext() {
  const ctx = useContext(AdminDataContext);
  if (!ctx)
    throw new Error("useAdminData must be used within <AdminDataProvider>");
  return ctx;
}

/**
 * The whole admin dataset. `stats` is derived from every collection, so asking
 * for this asks for all of them — prefer `useCollection` when a page only needs
 * one or two, so it doesn't pull the entire database down with it.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAdminData() {
  const ctx = useAdminContext();
  const { ensure, settled } = ctx;

  useEffect(() => {
    ensure(ALL_COLLECTIONS);
  }, [ensure]);

  return {
    ...ctx,
    loading: ALL_COLLECTIONS.some((n) => !settled.has(n)),
  };
}

/** Convenience selector for a single collection + its scoped CRUD ops. */
// eslint-disable-next-line react-refresh/only-export-components
export function useCollection(name) {
  const { create, update, remove, refresh, ensure, settled, ...rest } =
    useAdminContext();

  useEffect(() => {
    ensure([name]);
  }, [ensure, name]);

  return {
    items: rest[name] ?? [],
    // Only this collection's arrival matters here.
    loading: !settled.has(name),
    refresh,
    create: (item) => create(name, item),
    update: (id, patch) => update(name, id, patch),
    remove: (id) => remove(name, id),
  };
}

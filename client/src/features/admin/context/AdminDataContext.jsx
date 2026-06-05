import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { buildSeed, uid } from "../data/seed";

/*
 * AdminDataContext
 * ----------------
 * The single source of truth for every admin-managed collection (services,
 * cities, bookings, users, content). State lives in a reducer and is mirrored
 * to localStorage, so edits survive reloads and the panel behaves like a real
 * CRUD app without any backend wiring.
 *
 * The API is deliberately generic — `create/update/remove(collection, …)` —
 * so pages stay declarative and a future swap to real HTTP endpoints touches
 * only this file.
 */

const STORAGE_KEY = "casaclean:admin:db";

const AdminDataContext = createContext(null);

// --- Persistence helpers ---------------------------------------------------
const loadInitial = () => {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge against the seed so a newly-added collection isn't missing for
      // users who already have a persisted (older) database shape.
      return { ...buildSeed(), ...parsed };
    }
  } catch {
    /* corrupt storage — fall back to a fresh seed */
  }
  return buildSeed();
};

// --- Reducer ---------------------------------------------------------------
function reducer(state, action) {
  switch (action.type) {
    case "CREATE": {
      const { collection, item } = action;
      const record = {
        _id: uid(),
        createdAt: new Date().toISOString(),
        ...item,
      };
      return { ...state, [collection]: [record, ...state[collection]] };
    }
    case "UPDATE": {
      const { collection, id, patch } = action;
      return {
        ...state,
        [collection]: state[collection].map((row) =>
          row._id === id ? { ...row, ...patch } : row
        ),
      };
    }
    case "REMOVE": {
      const { collection, id } = action;
      return {
        ...state,
        [collection]: state[collection].filter((row) => row._id !== id),
      };
    }
    case "RESET":
      return buildSeed();
    default:
      return state;
  }
}

export function AdminDataProvider({ children }) {
  const [db, dispatch] = useReducer(reducer, undefined, loadInitial);

  // Persist on every change.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* storage full/unavailable — keep in-memory state only */
    }
  }, [db]);

  const create = useCallback(
    (collection, item) => dispatch({ type: "CREATE", collection, item }),
    []
  );
  const update = useCallback(
    (collection, id, patch) => dispatch({ type: "UPDATE", collection, id, patch }),
    []
  );
  const remove = useCallback(
    (collection, id) => dispatch({ type: "REMOVE", collection, id }),
    []
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  // Lightweight derived metrics for the dashboard.
  const stats = useMemo(() => {
    const revenue = db.bookings
      .filter((b) => b.status === "completed" || b.status === "confirmed")
      .reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);

    const byStatus = db.bookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {});

    return {
      bookings: db.bookings.length,
      revenue,
      services: db.services.length,
      activeServices: db.services.filter((s) => s.enabled).length,
      cities: db.cities.length,
      activeCities: db.cities.filter((c) => c.enabled).length,
      users: db.users.length,
      byStatus,
    };
  }, [db]);

  const value = useMemo(
    () => ({ ...db, stats, create, update, remove, reset }),
    [db, stats, create, update, remove, reset]
  );

  return (
    <AdminDataContext.Provider value={value}>
      {children}
    </AdminDataContext.Provider>
  );
}

// Provider + consumer hooks are co-located (standard context pattern).
// eslint-disable-next-line react-refresh/only-export-components
export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx)
    throw new Error("useAdminData must be used within <AdminDataProvider>");
  return ctx;
}

/** Convenience selector for a single collection + its scoped CRUD ops. */
// eslint-disable-next-line react-refresh/only-export-components
export function useCollection(name) {
  const { create, update, remove, ...rest } = useAdminData();
  return {
    items: rest[name] ?? [],
    create: (item) => create(name, item),
    update: (id, patch) => update(name, id, patch),
    remove: (id) => remove(name, id),
  };
}

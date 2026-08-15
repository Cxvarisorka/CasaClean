import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { BOOKING_STEPS } from "../constants";

/*
 * Booking navigation store
 * ------------------------
 * Owns wizard *navigation* state (current step, direction, furthest reached) —
 * deliberately separate from form *field* state, which RHF owns. This single-
 * responsibility split keeps both concerns simple and independently testable.
 *
 * It also holds the per-step GUARDS (see useStepGuard below). Most validation is
 * the zod schema's, but a rule that spans fields *and* fetched data — "does this
 * start time fit the chosen city's working hours for a booking this long?" —
 * can't be expressed in a flat field schema. Such a step registers a guard, and
 * `next()` refuses to advance while it fails.
 */

const BookingContext = createContext(null);

const LAST_STEP = BOOKING_STEPS.length - 1;

function reducer(state, action) {
  switch (action.type) {
    case "NEXT": {
      const step = Math.min(state.step + 1, LAST_STEP);
      return { ...state, step, direction: 1, maxReached: Math.max(state.maxReached, step) };
    }
    case "PREV":
      return { ...state, step: Math.max(state.step - 1, 0), direction: -1 };
    case "GOTO": {
      // Only allow jumping to a step already unlocked.
      if (action.step > state.maxReached) return state;
      return { ...state, step: action.step, direction: action.step > state.step ? 1 : -1 };
    }
    case "RESET":
      return { step: 0, direction: 1, maxReached: 0 };
    default:
      return state;
  }
}

export function BookingProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, {
    step: 0,
    direction: 1,
    maxReached: 0,
  });

  // Keyed by step id. A ref, not state: a guard is read at the moment the
  // customer presses Continue, and registering one must never re-render.
  const guardsRef = useRef({});

  const setStepGuard = useCallback((stepId, guard) => {
    guardsRef.current[stepId] = guard;
    return () => {
      delete guardsRef.current[stepId];
    };
  }, []);

  // Unguarded steps pass. A guard returning false blocks; it is expected to have
  // already surfaced the reason on the field it belongs to.
  const runStepGuard = useCallback((stepId) => {
    const guard = guardsRef.current[stepId];
    return guard ? guard() !== false : true;
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      steps: BOOKING_STEPS,
      isFirst: state.step === 0,
      isLast: state.step === LAST_STEP,
      next: () => dispatch({ type: "NEXT" }),
      prev: () => dispatch({ type: "PREV" }),
      goTo: (step) => dispatch({ type: "GOTO", step }),
      reset: () => dispatch({ type: "RESET" }),
      setStepGuard,
      runStepGuard,
    }),
    [state, setStepGuard, runStepGuard]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

// Provider + its consumer hook are co-located (standard context pattern).
// eslint-disable-next-line react-refresh/only-export-components
export function useBookingNav() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBookingNav must be used within <BookingProvider>");
  return ctx;
}

/**
 * Let a step veto Continue with a check the schema can't make.
 * `guard` returns false to block. It's held in a ref, refreshed after every
 * render, so the registration is stable while the check always closes over the
 * latest values — a guard reading a stale duration would be worse than none.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useStepGuard(stepId, guard) {
  const { setStepGuard } = useBookingNav();
  const guardRef = useRef(guard);

  useEffect(() => {
    guardRef.current = guard;
  }, [guard]);

  useEffect(
    () => setStepGuard(stepId, () => guardRef.current?.() ?? true),
    [stepId, setStepGuard]
  );
}

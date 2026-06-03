import { createContext, useContext, useMemo, useReducer } from "react";
import { BOOKING_STEPS } from "../constants";

/*
 * Booking navigation store
 * ------------------------
 * Owns wizard *navigation* state (current step, direction, furthest reached) —
 * deliberately separate from form *field* state, which RHF owns. This single-
 * responsibility split keeps both concerns simple and independently testable.
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
    }),
    [state]
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

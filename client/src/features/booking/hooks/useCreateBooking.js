import { useMutation } from "@tanstack/react-query";
import { createBooking } from "../api/bookingApi";

/*
 * useCreateBooking
 * ----------------
 * TanStack Query mutation wrapper for submitting a booking. Components read
 * isPending / isSuccess / error declaratively and receive the created booking
 * (with its id) on success for the confirmation screen.
 */

export function useCreateBooking(options = {}) {
  return useMutation({ mutationFn: createBooking, ...options });
}

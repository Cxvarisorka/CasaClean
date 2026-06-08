import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBooking } from "../api/bookingApi";

/*
 * useCreateBooking
 * ----------------
 * TanStack Query mutation wrapper for submitting a booking. Components read
 * isPending / isSuccess / error declaratively and receive the created booking
 * (with its id) on success for the confirmation screen.
 *
 * On success it invalidates the signed-in user's booking history so the profile
 * page reflects the new booking immediately — no manual page refresh needed.
 */

export function useCreateBooking({ onSuccess, ...options } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBooking,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      onSuccess?.(...args);
    },
    ...options,
  });
}

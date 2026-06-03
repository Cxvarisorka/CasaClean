import { useMutation } from "@tanstack/react-query";
import { submitContact, subscribeNewsletter } from "../api/contactApi";

/*
 * Contact mutations
 * -----------------
 * Thin TanStack Query wrappers so components consume submission state
 * (isPending / isSuccess / error) declaratively without managing it by hand.
 */

export function useSubmitContact(options = {}) {
  return useMutation({ mutationFn: submitContact, ...options });
}

export function useSubscribeNewsletter(options = {}) {
  return useMutation({ mutationFn: subscribeNewsletter, ...options });
}

import { useMutation } from "@tanstack/react-query";
import { signIn, signUp, forgotPassword, resetPassword } from "../api/authApi";

/*
 * Auth mutations
 * --------------
 * TanStack Query wrappers so the auth pages consume submission state
 * (isPending / error) declaratively without hand-rolling it.
 */

export function useSignIn(options = {}) {
  return useMutation({ mutationFn: signIn, ...options });
}

export function useSignUp(options = {}) {
  return useMutation({ mutationFn: signUp, ...options });
}

export function useForgotPassword(options = {}) {
  return useMutation({ mutationFn: forgotPassword, ...options });
}

export function useResetPassword(options = {}) {
  return useMutation({ mutationFn: resetPassword, ...options });
}

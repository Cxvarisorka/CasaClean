import { z } from "zod";

/*
 * Auth validation
 * ---------------
 * Schema *factories* that take the translator `t`, so every validation message
 * is localized in the user's current language. Components build the schema with
 * their `t` and pass it to the resolver.
 */

const phoneRe = /^[+\d][\d\s()-]{6,}$/;

export const makeSignInSchema = (t) =>
  z.object({
    email: z.string().trim().email(t("auth.errors.emailInvalid")),
    password: z.string().min(1, t("auth.errors.passwordMin")),
    remember: z.boolean().optional(),
  });

export const makeSignUpSchema = (t) =>
  z
    .object({
      fullname: z.string().trim().min(2, t("auth.errors.nameMin")),
      email: z.string().trim().email(t("auth.errors.emailInvalid")),
      phone: z.string().trim().regex(phoneRe, t("auth.errors.phoneInvalid")),
      password: z
        .string()
        .min(8, t("auth.errors.passwordMin"))
        .regex(/[A-Z]/, t("auth.errors.passwordUpper"))
        .regex(/[0-9]/, t("auth.errors.passwordNumber")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ["confirmPassword"],
      message: t("auth.errors.passwordMatch"),
    });

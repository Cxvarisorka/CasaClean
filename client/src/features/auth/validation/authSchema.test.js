import { describe, test, expect } from "vitest";
import {
  makeSignInSchema,
  makeSignUpSchema,
  makeResetPasswordSchema,
  makeChangePasswordSchema,
} from "./authSchema";

// The schema factories take the i18n translator; identity is enough for tests
// (the message text itself is owned by the locale files).
const t = (key) => key;

describe("makeSignInSchema", () => {
  const schema = makeSignInSchema(t);

  test("accepts valid credentials", () => {
    expect(schema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });

  test("rejects a malformed email and an empty password", () => {
    expect(schema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
    expect(schema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("makeSignUpSchema", () => {
  const schema = makeSignUpSchema(t);
  const valid = {
    fullname: "Mario Rossi",
    email: "mario@example.com",
    phone: "+393312345678",
    password: "Password1",
    confirmPassword: "Password1",
  };

  test("accepts a valid registration", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  test("enforces password strength: length, uppercase, number", () => {
    expect(schema.safeParse({ ...valid, password: "Pass1", confirmPassword: "Pass1" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, password: "password1", confirmPassword: "password1" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, password: "Password", confirmPassword: "Password" }).success).toBe(false);
  });

  test("rejects mismatched password confirmation on the right field", () => {
    const result = schema.safeParse({ ...valid, confirmPassword: "Different1" });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
  });

  test("rejects an invalid phone number", () => {
    expect(schema.safeParse({ ...valid, phone: "abc" }).success).toBe(false);
  });
});

describe("makeResetPasswordSchema", () => {
  const schema = makeResetPasswordSchema(t);

  test("mirrors the sign-up strength rules so a reset can't weaken the password", () => {
    expect(schema.safeParse({ password: "Password1", confirmPassword: "Password1" }).success).toBe(true);
    expect(schema.safeParse({ password: "weakpass", confirmPassword: "weakpass" }).success).toBe(false);
  });
});

describe("makeChangePasswordSchema", () => {
  const schema = makeChangePasswordSchema(t);

  test("requires the current password and a strong, confirmed new one", () => {
    expect(schema.safeParse({
      currentPassword: "old",
      newPassword: "Password1",
      confirmPassword: "Password1",
    }).success).toBe(true);

    expect(schema.safeParse({
      currentPassword: "",
      newPassword: "Password1",
      confirmPassword: "Password1",
    }).success).toBe(false);

    expect(schema.safeParse({
      currentPassword: "old",
      newPassword: "Password1",
      confirmPassword: "Password2",
    }).success).toBe(false);
  });

  // A Google account setting its FIRST password has no current one to give,
  // but the new one is held to exactly the same strength rules.
  test("with requireCurrent:false, drops the current password only", () => {
    const setSchema = makeChangePasswordSchema(t, { requireCurrent: false });

    expect(setSchema.safeParse({
      newPassword: "Password1",
      confirmPassword: "Password1",
    }).success).toBe(true);

    expect(setSchema.safeParse({
      newPassword: "weakpass",
      confirmPassword: "weakpass",
    }).success).toBe(false);

    expect(setSchema.safeParse({
      newPassword: "Password1",
      confirmPassword: "Password2",
    }).success).toBe(false);
  });
});

const { signupSchema } = require("../../validations/auth.validation");

const signup = {
    fullname: "Mario Rossi",
    email: "mario@example.com",
    phone: "+393312345678",
    password: "password123"
};

describe("signup phone validation", () => {
    test("rejects empty and malformed phone numbers with clear messages", () => {
        const empty = signupSchema.safeParse({ ...signup, phone: "" });
        const malformed = signupSchema.safeParse({ ...signup, phone: "call-me" });
        expect(empty.success).toBe(false);
        expect(empty.error.issues[0].message).toMatch(/phone/i);
        expect(malformed.success).toBe(false);
        expect(malformed.error.issues[0].message).toMatch(/phone/i);
    });
});

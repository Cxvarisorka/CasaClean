const { signupSchema, updateMeSchema } = require("../../validations/auth.validation");

const signup = {
    fullname: "Mario Rossi",
    email: "mario@example.com",
    phone: "+393312345678",
    password: "password123"
};

describe("signup phone validation", () => {
    test("accepts a registration with no phone number at all", () => {
        const { phone, ...withoutPhone } = signup;

        const result = signupSchema.safeParse(withoutPhone);

        expect(result.success).toBe(true);
        expect(result.data.phone).toBeUndefined();
    });

    // The field is offered, not demanded: a customer who tabs past it sends "".
    test("treats an empty phone as 'not given' rather than as an error", () => {
        const result = signupSchema.safeParse({ ...signup, phone: "" });

        expect(result.success).toBe(true);
        expect(result.data.phone).toBe("");
    });

    test("rejects a malformed number, and one typed without its country prefix", () => {
        const malformed = signupSchema.safeParse({ ...signup, phone: "call-me" });
        const noPrefix = signupSchema.safeParse({ ...signup, phone: "3312345678" });

        expect(malformed.success).toBe(false);
        expect(malformed.error.issues[0].message).toMatch(/phone/i);
        expect(noPrefix.success).toBe(false);
        expect(noPrefix.error.issues[0].message).toMatch(/prefix/i);
    });

    // One number, several ways to type it — all reaching the unique index as the
    // same string is the whole point of normalising in the schema.
    test("normalises spacing, dashes and the 00 prefix to one canonical value", () => {
        for (const typed of ["+39 331 234-5678", "0039 331 2345678", "+393312345678"]) {
            const result = signupSchema.safeParse({ ...signup, phone: typed });

            expect(result.success).toBe(true);
            expect(result.data.phone).toBe("+393312345678");
        }
    });

    test("accepts Georgian and other European numbers, not just Italian ones", () => {
        for (const phone of ["+995555123456", "+306912345678", "+33612345678"]) {
            expect(signupSchema.safeParse({ ...signup, phone }).success).toBe(true);
        }
    });
});

describe("updateMe phone validation", () => {
    // "" is the only way to say "remove the number I gave you earlier".
    test("keeps an empty string, which the controller reads as a deletion", () => {
        const result = updateMeSchema.safeParse({ phone: "" });

        expect(result.success).toBe(true);
        expect(result.data.phone).toBe("");
    });

    test("still rejects a malformed replacement", () => {
        expect(updateMeSchema.safeParse({ phone: "12" }).success).toBe(false);
    });
});

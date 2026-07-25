// End-to-end auth flows: signup + email verification, signin (incl. lockout and
// anti-enumeration), password reset, profile self-service, account deletion.
const crypto = require("crypto");

const { api, sendEmailMock } = require("../setup/testEnv");
const {
    createUser,
    cookieFor,
    createService,
    createCity,
    createPaidBooking
} = require("../setup/fixtures");

const User = require("../../models/user.model");
const Review = require("../../models/review.model");
const Booking = require("../../models/booking.model");

const SIGNUP_BODY = {
    fullname: "Mario Rossi",
    email: "mario.rossi@test.casaclean.local",
    phone: "+393312345678",
    password: "password123"
};

describe("POST /api/v1/auth/signup", () => {
    test("creates an unverified account and emails a verification link", async () => {
        const res = await api.post("/api/v1/auth/signup").send(SIGNUP_BODY);

        expect(res.status).toBe(201);
        expect(res.body.message).toMatch(/verify/i);

        const user = await User.findOne({ email: SIGNUP_BODY.email })
            .select("+password +verificationToken +verificationTokenExpires");
        expect(user).not.toBeNull();
        expect(user.isVerified).toBe(false);
        expect(user.role).toBe("user");
        // Password is hashed, never stored raw.
        expect(user.password).not.toBe(SIGNUP_BODY.password);
        // Only the token HASH is stored.
        expect(user.verificationToken).toMatch(/^[a-f0-9]{64}$/);
        expect(user.verificationTokenExpires.getTime()).toBeGreaterThan(Date.now());

        expect(sendEmailMock).toHaveBeenCalledTimes(1);
        expect(sendEmailMock.mock.calls[0][0].email).toBe(SIGNUP_BODY.email);
        // The emailed link carries the RAW token, not the stored hash.
        expect(sendEmailMock.mock.calls[0][0].html).not.toContain(user.verificationToken);
    });

    test("cannot mass-assign role or isVerified (strict schema)", async () => {
        const res = await api.post("/api/v1/auth/signup").send({
            ...SIGNUP_BODY,
            role: "admin",
            isVerified: true
        });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Validation failed/);
    });

    test("rejects empty and malformed phone numbers at validation", async () => {
        const empty = await api.post("/api/v1/auth/signup").send({ ...SIGNUP_BODY, phone: "" });
        const malformed = await api.post("/api/v1/auth/signup").send({ ...SIGNUP_BODY, phone: "call-me" });
        expect(empty.status).toBe(400);
        expect(malformed.status).toBe(400);
    });

    test("returns ONE generic message for duplicate email or phone (anti-enumeration)", async () => {
        await createUser({ email: SIGNUP_BODY.email });

        const dupEmail = await api.post("/api/v1/auth/signup")
            .send({ ...SIGNUP_BODY, phone: "+390000000001" });
        expect(dupEmail.status).toBe(400);
        expect(dupEmail.body.message).toMatch(/email or phone/i);

        const other = await createUser();
        const dupPhone = await api.post("/api/v1/auth/signup")
            .send({ ...SIGNUP_BODY, email: "fresh@test.casaclean.local", phone: other.phone });
        expect(dupPhone.status).toBe(400);
        expect(dupPhone.body.message).toBe(dupEmail.body.message);
    });

    test("rolls back the verification token when the email can't be sent", async () => {
        sendEmailMock.mockRejectedValueOnce(new Error("smtp down"));

        const res = await api.post("/api/v1/auth/signup").send(SIGNUP_BODY);
        expect(res.status).toBe(502);

        const user = await User.findOne({ email: SIGNUP_BODY.email })
            .select("+verificationToken");
        expect(user.verificationToken).toBeUndefined();
    });
});

describe("GET /api/v1/auth/verify-email/:token", () => {
    test("verifies the account, signs the user in and redirects to the client", async () => {
        const user = await createUser({ isVerified: false });
        const rawToken = user.createVerificationToken();
        await user.save({ validateBeforeSave: false });

        const res = await api.get(`/api/v1/auth/verify-email/${rawToken}`);
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe(`${process.env.CLIENT_URL}/`);
        expect(res.headers["set-cookie"].join(";")).toMatch(/lt=/);

        const fresh = await User.findById(user._id).select("+verificationToken");
        expect(fresh.isVerified).toBe(true);
        expect(fresh.verificationToken).toBeUndefined();
    });

    test("redirects to a failure page for an unknown/expired token", async () => {
        const res = await api.get(`/api/v1/auth/verify-email/${crypto.randomBytes(32).toString("hex")}`);
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe(`${process.env.CLIENT_URL}/signin?verified=failed`);
    });
});

describe("POST /api/v1/auth/signin", () => {
    test("signs in a verified user and sets the auth cookie", async () => {
        const user = await createUser();
        const res = await api.post("/api/v1/auth/signin")
            .send({ email: user.email, password: "password123", remember: true });

        expect(res.status).toBe(200);
        const cookie = res.headers["set-cookie"].find((c) => c.startsWith("lt="));
        expect(cookie).toMatch(/HttpOnly/i);
        expect(cookie).toMatch(/Max-Age/i); // remember=true -> persistent cookie
        expect(res.body.data.user.password).toBeUndefined();
        expect(res.body.data.user.tokenVersion).toBeUndefined();
    });

    test("issues a session cookie (no Max-Age) when remember is false", async () => {
        const user = await createUser();
        const res = await api.post("/api/v1/auth/signin")
            .send({ email: user.email, password: "password123", remember: false });
        const cookie = res.headers["set-cookie"].find((c) => c.startsWith("lt="));
        expect(cookie).not.toMatch(/Max-Age/i);
    });

    test("uses ONE generic 401 for unknown email and wrong password", async () => {
        const user = await createUser();

        const wrongPassword = await api.post("/api/v1/auth/signin")
            .send({ email: user.email, password: "wrong-password" });
        const unknownEmail = await api.post("/api/v1/auth/signin")
            .send({ email: "ghost@test.casaclean.local", password: "whatever123" });

        expect(wrongPassword.status).toBe(401);
        expect(unknownEmail.status).toBe(401);
        expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
    });

    test("blocks unverified accounts with a 403", async () => {
        const user = await createUser({ isVerified: false });
        const res = await api.post("/api/v1/auth/signin")
            .send({ email: user.email, password: "password123" });
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/verify/i);
    });

    test("locks the account after too many failed attempts (even with the right password)", async () => {
        const user = await createUser();
        // Fast-forward to one attempt before the limit instead of burning 10 bcrypt rounds.
        await User.updateOne({ _id: user._id }, { failedLoginAttempts: 9 });

        const lastFail = await api.post("/api/v1/auth/signin")
            .send({ email: user.email, password: "wrong-password" });
        expect(lastFail.status).toBe(401);

        // The account is now locked: the CORRECT password is rejected with 429.
        const locked = await api.post("/api/v1/auth/signin")
            .send({ email: user.email, password: "password123" });
        expect(locked.status).toBe(401);
        expect(locked.body.message).toBe(lastFail.body.message);
    });

    test("a successful signin clears accumulated failure state", async () => {
        const user = await createUser();
        await User.updateOne({ _id: user._id }, { failedLoginAttempts: 5 });

        const res = await api.post("/api/v1/auth/signin")
            .send({ email: user.email, password: "password123" });
        expect(res.status).toBe(200);

        const fresh = await User.findById(user._id).select("+failedLoginAttempts");
        expect(fresh.failedLoginAttempts).toBe(0);
    });
});

describe("POST /api/v1/auth/logout", () => {
    test("expires the auth cookie", async () => {
        const user = await createUser();
        const res = await api.post("/api/v1/auth/logout").set("Cookie", cookieFor(user));
        expect(res.status).toBe(200);
        const cookie = res.headers["set-cookie"].find((c) => c.startsWith("lt="));
        expect(cookie).toMatch(/lt=;/);
    });
});

describe("POST /api/v1/auth/resend-verification", () => {
    const GENERIC = /if an unverified account exists/i;

    test("responds identically for unknown emails (no email sent)", async () => {
        const res = await api.post("/api/v1/auth/resend-verification")
            .send({ email: "ghost@test.casaclean.local" });
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(GENERIC);
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    test("responds identically for already-verified users (no email sent)", async () => {
        const user = await createUser();
        const res = await api.post("/api/v1/auth/resend-verification")
            .send({ email: user.email });
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(GENERIC);
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    test("sends a fresh link for an unverified local account", async () => {
        const user = await createUser({ isVerified: false });
        const res = await api.post("/api/v1/auth/resend-verification")
            .send({ email: user.email });
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(GENERIC);
        expect(sendEmailMock).toHaveBeenCalledTimes(1);
    });
});

describe("password reset flow", () => {
    test("forgot-password responds identically for unknown emails (no email sent)", async () => {
        const res = await api.post("/api/v1/auth/forgot-password")
            .send({ email: "ghost@test.casaclean.local" });
        expect(res.status).toBe(200);
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    test("forgot-password stores a hashed token and emails the raw one", async () => {
        const user = await createUser();
        const res = await api.post("/api/v1/auth/forgot-password").send({ email: user.email });
        expect(res.status).toBe(200);
        expect(sendEmailMock).toHaveBeenCalledTimes(1);

        const fresh = await User.findById(user._id).select("+passwordResetToken +passwordResetExpires");
        expect(fresh.passwordResetToken).toMatch(/^[a-f0-9]{64}$/);
        expect(fresh.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());
    });

    test("reset-password consumes the token, revokes old sessions and signs in", async () => {
        const user = await createUser();
        const staleCookie = cookieFor(user); // minted before the reset
        const rawToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        const res = await api.post(`/api/v1/auth/reset-password/${rawToken}`)
            .send({ password: "new-password-456" });
        expect(res.status).toBe(200);
        expect(res.headers["set-cookie"].join(";")).toMatch(/lt=/);

        // New password works…
        const signin = await api.post("/api/v1/auth/signin")
            .send({ email: user.email, password: "new-password-456" });
        expect(signin.status).toBe(200);

        // …the old one doesn't…
        const oldSignin = await api.post("/api/v1/auth/signin")
            .send({ email: user.email, password: "password123" });
        expect(oldSignin.status).toBe(401);

        // …and every session minted before the reset is dead (tokenVersion bump).
        const staleMe = await api.get("/api/v1/auth/me").set("Cookie", staleCookie);
        expect(staleMe.status).toBe(401);

        // The token is single-use.
        const reuse = await api.post(`/api/v1/auth/reset-password/${rawToken}`)
            .send({ password: "another-pass-789" });
        expect(reuse.status).toBe(400);
    });

    test("rejects an unknown reset token", async () => {
        const res = await api.post(`/api/v1/auth/reset-password/${crypto.randomBytes(32).toString("hex")}`)
            .send({ password: "new-password-456" });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/invalid or has expired/i);
    });
});

describe("profile self-service", () => {
    test("PATCH /me updates name and phone", async () => {
        const user = await createUser();
        const res = await api.patch("/api/v1/auth/me")
            .set("Cookie", cookieFor(user))
            .send({ fullname: "Renamed Person", phone: "+393399999999" });
        expect(res.status).toBe(200);
        expect(res.body.data.user.fullname).toBe("Renamed Person");
        expect(res.body.data.user.phone).toBe("+393399999999");
    });

    test("PATCH /me rejects a phone already used by another account", async () => {
        const other = await createUser();
        const user = await createUser();
        const res = await api.patch("/api/v1/auth/me")
            .set("Cookie", cookieFor(user))
            .send({ phone: other.phone });
        expect(res.status).toBe(409);
    });

    test("PATCH /me cannot change role or email (strict schema)", async () => {
        const user = await createUser();
        const res = await api.patch("/api/v1/auth/me")
            .set("Cookie", cookieFor(user))
            .send({ role: "admin" });
        expect(res.status).toBe(400);
    });

    test("PATCH /me/password requires the correct current password", async () => {
        const user = await createUser();
        const res = await api.patch("/api/v1/auth/me/password")
            .set("Cookie", cookieFor(user))
            .send({ currentPassword: "wrong-password", newPassword: "new-password-456" });
        expect(res.status).toBe(401);
    });

    test("PATCH /me/password changes the password and kills other sessions", async () => {
        const user = await createUser();
        const otherSession = cookieFor(user);

        const res = await api.patch("/api/v1/auth/me/password")
            .set("Cookie", cookieFor(user))
            .send({ currentPassword: "password123", newPassword: "new-password-456" });
        expect(res.status).toBe(200);

        const staleMe = await api.get("/api/v1/auth/me").set("Cookie", otherSession);
        expect(staleMe.status).toBe(401);

        const signin = await api.post("/api/v1/auth/signin")
            .send({ email: user.email, password: "new-password-456" });
        expect(signin.status).toBe(200);
    });
});

describe("DELETE /api/v1/auth/me", () => {
    test("requires the correct password for local accounts", async () => {
        const user = await createUser();
        const res = await api.delete("/api/v1/auth/me")
            .set("Cookie", cookieFor(user))
            .send({ password: "wrong-password" });
        expect(res.status).toBe(401);
        expect(await User.findById(user._id)).not.toBeNull();
    });

    test("is blocked while upcoming bookings exist", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        await createPaidBooking(user, service, city, { status: "confirmed" });

        const res = await api.delete("/api/v1/auth/me")
            .set("Cookie", cookieFor(user))
            .send({ password: "password123" });
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/cancel your upcoming bookings/i);
    });

    test("deletes the account, removes reviews and detaches past bookings", async () => {
        const user = await createUser();
        const service = await createService();
        const city = await createCity();
        const pastBooking = await createPaidBooking(user, service, city, { status: "completed" });
        await Review.create({
            booking: pastBooking._id,
            service_id: service._id,
            user: user._id,
            rating: 5,
            review_text: "Great!"
        });

        const res = await api.delete("/api/v1/auth/me")
            .set("Cookie", cookieFor(user))
            .send({ password: "password123" });
        expect(res.status).toBe(200);

        expect(await User.findById(user._id)).toBeNull();
        expect(await Review.countDocuments({ user: user._id })).toBe(0);
        // The financial record survives, detached from the deleted account.
        const kept = await Booking.findById(pastBooking._id);
        expect(kept).not.toBeNull();
        expect(kept.user).toBeUndefined();
    });
});

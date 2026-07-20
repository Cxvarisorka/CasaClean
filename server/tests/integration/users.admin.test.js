// Admin account management (/api/v1/auth/users) — list, create, edit, delete.
const { api } = require("../setup/testEnv");
const { createUser, createAdmin, cookieFor } = require("../setup/fixtures");

const User = require("../../models/user.model");

const NEW_USER = {
    fullname: "Created ByAdmin",
    email: "created@test.casaclean.local",
    phone: "+393320000001",
    password: "password123"
};

describe("GET /api/v1/auth/users", () => {
    test("returns a paginated list without password hashes", async () => {
        const admin = await createAdmin();
        await createUser();
        await createUser();

        const res = await api.get("/api/v1/auth/users?page=1&limit=2")
            .set("Cookie", cookieFor(admin));

        expect(res.status).toBe(200);
        expect(res.body.userCount).toBe(3);
        expect(res.body.data.users).toHaveLength(2);
        for (const u of res.body.data.users) {
            expect(u.password).toBeUndefined();
        }
    });
});

describe("POST /api/v1/auth/users", () => {
    test("creates a user with the admin-chosen role and verification state", async () => {
        const admin = await createAdmin();
        const res = await api.post("/api/v1/auth/users")
            .set("Cookie", cookieFor(admin))
            .send({ ...NEW_USER, role: "admin", isVerified: true });

        expect(res.status).toBe(201);
        expect(res.body.data.user.role).toBe("admin");
        expect(res.body.data.user.isVerified).toBe(true);
        expect(res.body.data.user.password).toBeUndefined();
    });

    test("rejects duplicate email with a field-specific 409", async () => {
        const admin = await createAdmin();
        const existing = await createUser();
        const res = await api.post("/api/v1/auth/users")
            .set("Cookie", cookieFor(admin))
            .send({ ...NEW_USER, email: existing.email });
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/email/i);
    });

    test("rejects duplicate phone with a field-specific 409", async () => {
        const admin = await createAdmin();
        const existing = await createUser();
        const res = await api.post("/api/v1/auth/users")
            .set("Cookie", cookieFor(admin))
            .send({ ...NEW_USER, phone: existing.phone });
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/phone/i);
    });
});

describe("PATCH /api/v1/auth/users/:id", () => {
    test("updates role and verification state", async () => {
        const admin = await createAdmin();
        const user = await createUser({ isVerified: false });

        const res = await api.patch(`/api/v1/auth/users/${user._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ role: "admin", isVerified: true });

        expect(res.status).toBe(200);
        const fresh = await User.findById(user._id);
        expect(fresh.role).toBe("admin");
        expect(fresh.isVerified).toBe(true);
    });

    test("a password change revokes the user's existing sessions", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const userSession = cookieFor(user);

        const res = await api.patch(`/api/v1/auth/users/${user._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ password: "rotated-pass-99" });
        expect(res.status).toBe(200);

        // The old session cookie no longer works…
        const staleMe = await api.get("/api/v1/auth/me").set("Cookie", userSession);
        expect(staleMe.status).toBe(401);

        // …and the new password signs in.
        const signin = await api.post("/api/v1/auth/signin")
            .send({ email: user.email, password: "rotated-pass-99" });
        expect(signin.status).toBe(200);
    });

    test("rejects an email already used by another account", async () => {
        const admin = await createAdmin();
        const a = await createUser();
        const b = await createUser();
        const res = await api.patch(`/api/v1/auth/users/${b._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ email: a.email });
        expect(res.status).toBe(409);
    });

    test("404s for a missing user", async () => {
        const admin = await createAdmin();
        const res = await api.patch(`/api/v1/auth/users/64b000000000000000000000`)
            .set("Cookie", cookieFor(admin))
            .send({ fullname: "Ghost Person" });
        expect(res.status).toBe(404);
    });
});

describe("DELETE /api/v1/auth/users/:id", () => {
    test("deletes another account", async () => {
        const admin = await createAdmin();
        const user = await createUser();
        const res = await api.delete(`/api/v1/auth/users/${user._id}`)
            .set("Cookie", cookieFor(admin));
        expect(res.status).toBe(200);
        expect(await User.findById(user._id)).toBeNull();
    });

    test("an admin cannot delete their own account", async () => {
        const admin = await createAdmin();
        const res = await api.delete(`/api/v1/auth/users/${admin._id}`)
            .set("Cookie", cookieFor(admin));
        expect(res.status).toBe(400);
        expect(await User.findById(admin._id)).not.toBeNull();
    });

    test("404s for a missing user", async () => {
        const admin = await createAdmin();
        const res = await api.delete(`/api/v1/auth/users/64b000000000000000000000`)
            .set("Cookie", cookieFor(admin));
        expect(res.status).toBe(404);
    });
});

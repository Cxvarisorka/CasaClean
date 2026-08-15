// Cross-cutting middleware behaviour: CSRF guard, CORS allow-list, 404 handling,
// auth guard (protect) and session revocation, NoSQL-injection hardening.
const { api, request, app } = require("../setup/testEnv");
const { createUser, createAdmin, cookieFor } = require("../setup/fixtures");

const jwt = require("jsonwebtoken");

describe("CSRF guard", () => {
    test("rejects a state-changing request without X-Requested-With", async () => {
        const res = await request(app)
            .post("/api/v1/auth/logout")
            .send({});
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/required request header/i);
    });

    test("lets safe methods through without the header", async () => {
        const res = await request(app).get("/api/v1/city");
        expect(res.status).toBe(200);
    });
});

describe("CORS allow-list", () => {
    test("rejects an unknown origin", async () => {
        const res = await request(app)
            .get("/api/v1/city")
            .set("Origin", "https://evil.example.com");
        expect(res.status).toBe(403);
    });

    test("allows the configured client origin", async () => {
        const res = await request(app)
            .get("/api/v1/city")
            .set("Origin", process.env.CLIENT_URL);
        expect(res.status).toBe(200);
        expect(res.headers["access-control-allow-origin"]).toBe(process.env.CLIENT_URL);
        expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });
});

describe("unknown routes", () => {
    test("returns a 404 envelope", async () => {
        const res = await api.get("/api/v1/definitely-not-a-route");
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Can't find/);
    });
});

describe("protect middleware", () => {
    test("rejects a request without a cookie", async () => {
        const res = await api.get("/api/v1/auth/me");
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/Authorization is required/);
    });

    test("rejects a garbage token", async () => {
        const res = await api.get("/api/v1/auth/me").set("Cookie", ["lt=not-a-jwt"]);
        expect(res.status).toBe(401);
    });

    test("rejects a token signed with the wrong secret", async () => {
        const user = await createUser();
        const forged = jwt.sign({ id: user._id, v: 0 }, "a".repeat(40), { expiresIn: "1h" });
        const res = await api.get("/api/v1/auth/me").set("Cookie", [`lt=${forged}`]);
        expect(res.status).toBe(401);
    });

    test("rejects a token for a deleted user", async () => {
        const user = await createUser();
        const cookie = cookieFor(user);
        await user.deleteOne();
        const res = await api.get("/api/v1/auth/me").set("Cookie", cookie);
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/no longer exists/);
    });

    test("rejects a token minted before a tokenVersion bump (session revocation)", async () => {
        const user = await createUser();
        const staleCookie = cookieFor(user); // v = 0
        await user.constructor.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
        const res = await api.get("/api/v1/auth/me").set("Cookie", staleCookie);
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/no longer valid/);
    });

    test("accepts a valid cookie and returns the live user", async () => {
        const user = await createUser();
        const res = await api.get("/api/v1/auth/me").set("Cookie", cookieFor(user));
        expect(res.status).toBe(200);
        expect(res.body.data.user.email).toBe(user.email);
        expect(res.body.data.user.password).toBeUndefined();
        expect(res.body.data.user.tokenVersion).toBeUndefined();
    });
});

describe("restrictTo('admin')", () => {
    test("blocks a normal user from an admin route", async () => {
        const user = await createUser();
        const res = await api.get("/api/v1/auth/users").set("Cookie", cookieFor(user));
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/permission/);
    });

    test("authorizes on the LIVE role, not a stale token", async () => {
        // Cookie minted while the user was an admin must stop working the moment
        // the DB role is downgraded (the JWT carries no role claim).
        const admin = await createAdmin();
        const cookie = cookieFor(admin);
        await admin.constructor.updateOne({ _id: admin._id }, { role: "user" });
        const res = await api.get("/api/v1/auth/users").set("Cookie", cookie);
        expect(res.status).toBe(403);
    });

    test("lets an admin through", async () => {
        const admin = await createAdmin();
        const res = await api.get("/api/v1/auth/users").set("Cookie", cookieFor(admin));
        expect(res.status).toBe(200);
    });
});

describe("NoSQL-injection hardening", () => {
    test("operator objects in the signin body are rejected, not executed", async () => {
        const res = await api.post("/api/v1/auth/signin").send({
            email: { $gt: "" },
            password: { $gt: "" }
        });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Validation failed/);
    });
});

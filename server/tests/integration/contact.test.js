const { api, sendEmailMock, waitForEmails } = require("../setup/testEnv");
const { createUser, createAdmin, cookieFor } = require("../setup/fixtures");

const ContactMessage = require("../../models/contactMessage.model");

const validBody = (overrides = {}) => ({
    name: "Jane Cooper",
    email: "jane@example.com",
    phone: "+39 06 1234567",
    topic: "general",
    message: "Hello, I would like to ask about weekly cleaning for my flat.",
    ...overrides
});

describe("POST /api/v1/contact (public)", () => {
    test("stores the message and answers 201", async () => {
        const res = await api.post("/api/v1/contact").send(validBody());

        expect(res.status).toBe(201);
        expect(res.body.status).toBe("success");
        expect(res.body.data.contactMessage._id).toBeDefined();

        const stored = await ContactMessage.findOne({ email: "jane@example.com" });
        expect(stored).not.toBeNull();
        expect(stored.name).toBe("Jane Cooper");
        expect(stored.topic).toBe("general");
        // Server-managed fields are never taken from the request body.
        expect(stored.status).toBe("new");
        expect(stored.handledAt).toBeNull();
        expect(stored.handledBy).toBeNull();
    });

    test("notifies the team, with the sender as the reply address", async () => {
        process.env.CONTACT_NOTIFY_EMAIL = "team@casaclean.test";

        await api.post("/api/v1/contact").send(validBody());

        // The notification is fire-and-forget, so poll rather than read the mock
        // immediately.
        await waitForEmails(1);

        expect(sendEmailMock).toHaveBeenCalledTimes(1);
        const [{ email, subject, replyTo, html }] = sendEmailMock.mock.calls[0];
        expect(email).toBe("team@casaclean.test");
        expect(replyTo).toBe("jane@example.com");
        expect(subject).toContain("New contact message");
        expect(html).toContain("Jane Cooper");

        delete process.env.CONTACT_NOTIFY_EMAIL;
    });

    test("escapes customer-typed HTML in the notification body", async () => {
        await api.post("/api/v1/contact").send(
            validBody({ name: "<script>alert(1)</script>" })
        );
        await waitForEmails(1);

        const [{ html }] = sendEmailMock.mock.calls[0];
        expect(html).not.toContain("<script>");
        expect(html).toContain("&lt;script&gt;");
    });

    test("a failing mail host does not fail the submission", async () => {
        sendEmailMock.mockRejectedValue(new Error("SMTP down"));

        const res = await api.post("/api/v1/contact").send(validBody());

        expect(res.status).toBe(201);
        expect(await ContactMessage.countDocuments()).toBe(1);
    });

    test("a filled honeypot is dropped silently — same 201, nothing stored or sent", async () => {
        const res = await api
            .post("/api/v1/contact")
            .send(validBody({ website: "http://spam.example" }));

        expect(res.status).toBe(201);
        // The response body must match a real acceptance field for field, id
        // included — a bot must not be able to tell it was caught.
        expect(res.body.status).toBe("success");
        expect(res.body.data.contactMessage._id).toBeDefined();
        expect(res.body.data.contactMessage.createdAt).toBeDefined();
        // …while nothing actually happened.
        expect(await ContactMessage.countDocuments()).toBe(0);
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    test("an empty honeypot is a normal submission", async () => {
        const res = await api.post("/api/v1/contact").send(validBody({ website: "" }));

        expect(res.status).toBe(201);
        expect(await ContactMessage.countDocuments()).toBe(1);
    });

    test.each([
        ["a malformed email", { email: "not-an-email" }],
        ["a too-short message", { message: "too short" }],
        ["an unknown topic", { topic: "refunds" }],
        ["a missing name", { name: undefined }],
        ["an unknown field", { status: "handled" }]
    ])("rejects %s with 400", async (_label, patch) => {
        const res = await api.post("/api/v1/contact").send(validBody(patch));

        expect(res.status).toBe(400);
        expect(await ContactMessage.countDocuments()).toBe(0);
    });

    test("phone is optional", async () => {
        const res = await api.post("/api/v1/contact").send(validBody({ phone: undefined }));

        expect(res.status).toBe(201);
        const stored = await ContactMessage.findOne();
        expect(stored.phone).toBe("");
    });

    test("is rejected without the CSRF header, like every other write", async () => {
        // api.post sets X-Requested-With; go around it to exercise csrfGuard.
        const { request, app } = require("../setup/testEnv");
        const res = await request(app).post("/api/v1/contact").send(validBody());

        expect(res.status).toBe(403);
        expect(await ContactMessage.countDocuments()).toBe(0);
    });
});

describe("GET /api/v1/contact (admin inbox)", () => {
    // createdAt is set explicitly and spaced a minute apart: created together,
    // the documents would share a millisecond and "newest first" would have no
    // deterministic order to assert on.
    const seed = async (n) => {
        for (let i = 0; i < n; i += 1) {
            await ContactMessage.create({
                name: `Sender ${i}`,
                email: `sender${i}@example.com`,
                topic: "general",
                message: `Message number ${i} with enough characters.`,
                status: i === 0 ? "handled" : "new",
                createdAt: new Date(Date.UTC(2026, 0, 1, 9, i))
            });
        }
    };

    test("requires an admin", async () => {
        const user = await createUser();
        const admin = await createAdmin();

        expect((await api.get("/api/v1/contact")).status).toBe(401);
        expect(
            (await api.get("/api/v1/contact").set("Cookie", cookieFor(user))).status
        ).toBe(403);
        expect(
            (await api.get("/api/v1/contact").set("Cookie", cookieFor(admin))).status
        ).toBe(200);
    });

    test("paginates, newest first", async () => {
        const admin = await createAdmin();
        await seed(3);

        const res = await api
            .get("/api/v1/contact?page=1&limit=2")
            .set("Cookie", cookieFor(admin));

        expect(res.status).toBe(200);
        expect(res.body.contactMessageCount).toBe(3);
        expect(res.body.data.contactMessages).toHaveLength(2);
        expect(res.body.data.contactMessages[0].name).toBe("Sender 2");
    });

    test("filters by status, and ignores a junk value", async () => {
        const admin = await createAdmin();
        await seed(3);

        const handled = await api
            .get("/api/v1/contact?status=handled")
            .set("Cookie", cookieFor(admin));
        expect(handled.body.contactMessageCount).toBe(1);

        // Not a member of the enum → no filter, not an injected query.
        const junk = await api
            .get("/api/v1/contact?status[$ne]=handled")
            .set("Cookie", cookieFor(admin));
        expect(junk.status).toBe(200);
        expect(junk.body.contactMessageCount).toBe(3);
    });
});

describe("PATCH / DELETE /api/v1/contact/:id (admin)", () => {
    test("marking handled stamps who and when; reopening clears both", async () => {
        const admin = await createAdmin();
        const message = await ContactMessage.create({
            name: "Jane",
            email: "jane@example.com",
            topic: "pricing",
            message: "A question about your monthly plans."
        });

        const handled = await api
            .patch(`/api/v1/contact/${message._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ status: "handled" });

        expect(handled.status).toBe(200);
        expect(handled.body.data.contactMessage.status).toBe("handled");
        expect(handled.body.data.contactMessage.handledAt).not.toBeNull();
        expect(String(handled.body.data.contactMessage.handledBy)).toBe(String(admin._id));

        const reopened = await api
            .patch(`/api/v1/contact/${message._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ status: "new" });

        expect(reopened.body.data.contactMessage.handledAt).toBeNull();
        expect(reopened.body.data.contactMessage.handledBy).toBeNull();
    });

    test("the message text itself is not editable", async () => {
        const admin = await createAdmin();
        const message = await ContactMessage.create({
            name: "Jane",
            email: "jane@example.com",
            topic: "pricing",
            message: "A question about your monthly plans."
        });

        const res = await api
            .patch(`/api/v1/contact/${message._id}`)
            .set("Cookie", cookieFor(admin))
            .send({ status: "handled", message: "rewritten by an admin" });

        expect(res.status).toBe(400);
        const stored = await ContactMessage.findById(message._id);
        expect(stored.message).toBe("A question about your monthly plans.");
    });

    test("deletes a message, and 404s on a second attempt", async () => {
        const admin = await createAdmin();
        const message = await ContactMessage.create({
            name: "Jane",
            email: "jane@example.com",
            topic: "support",
            message: "Following up on my booking from last week."
        });

        const first = await api
            .delete(`/api/v1/contact/${message._id}`)
            .set("Cookie", cookieFor(admin));
        expect(first.status).toBe(200);

        const second = await api
            .delete(`/api/v1/contact/${message._id}`)
            .set("Cookie", cookieFor(admin));
        expect(second.status).toBe(404);
    });

    test("triage, replying and deletion are admin-only", async () => {
        const user = await createUser();
        const message = await ContactMessage.create({
            name: "Jane",
            email: "jane@example.com",
            topic: "general",
            message: "Just a general question about your services."
        });

        const patched = await api
            .patch(`/api/v1/contact/${message._id}`)
            .set("Cookie", cookieFor(user))
            .send({ status: "handled" });
        expect(patched.status).toBe(403);

        const replied = await api
            .post(`/api/v1/contact/${message._id}/reply`)
            .set("Cookie", cookieFor(user))
            .send({ body: "Sure, here is our answer to your question." });
        expect(replied.status).toBe(403);

        const removed = await api
            .delete(`/api/v1/contact/${message._id}`)
            .set("Cookie", cookieFor(user));
        expect(removed.status).toBe(403);

        expect(sendEmailMock).not.toHaveBeenCalled();
    });
});

describe("POST /api/v1/contact/:id/reply (admin)", () => {
    const seedMessage = () =>
        ContactMessage.create({
            name: "Jane Cooper",
            email: "jane@example.com",
            topic: "pricing",
            message: "How much would a weekly clean of a two-bedroom flat cost?"
        });

    const answer = "Happy to help — a weekly clean of that size is 60 EUR.";

    test("emails the customer, records the reply and marks it handled", async () => {
        process.env.CONTACT_NOTIFY_EMAIL = "team@casaclean.test";
        const admin = await createAdmin();
        const message = await seedMessage();

        const res = await api
            .post(`/api/v1/contact/${message._id}/reply`)
            .set("Cookie", cookieFor(admin))
            .send({ body: answer });

        expect(res.status).toBe(200);

        // The send is awaited, not fire-and-forget: it has already happened by
        // the time the response comes back.
        expect(sendEmailMock).toHaveBeenCalledTimes(1);
        const [{ email, subject, html, text, replyTo }] = sendEmailMock.mock.calls[0];
        expect(email).toBe("jane@example.com");
        expect(subject).toBe("Re: your message to CasaClean");
        expect(html).toContain(answer);
        // The original is quoted so the customer has the context.
        expect(text).toContain("How much would a weekly clean");
        // Their answer to our answer comes back to the team.
        expect(replyTo).toBe("team@casaclean.test");

        const stored = await ContactMessage.findById(message._id);
        expect(stored.replies).toHaveLength(1);
        expect(stored.replies[0].body).toBe(answer);
        expect(String(stored.replies[0].sentBy)).toBe(String(admin._id));
        // Replying IS handling — no second click required.
        expect(stored.status).toBe("handled");
        expect(String(stored.handledBy)).toBe(String(admin._id));

        delete process.env.CONTACT_NOTIFY_EMAIL;
    });

    test("a failed send records NOTHING and reports 502", async () => {
        sendEmailMock.mockRejectedValue(new Error("SMTP down"));
        const admin = await createAdmin();
        const message = await seedMessage();

        const res = await api
            .post(`/api/v1/contact/${message._id}/reply`)
            .set("Cookie", cookieFor(admin))
            .send({ body: answer });

        expect(res.status).toBe(502);

        // The whole point: an admin must never see a reply logged as sent when
        // the email never left.
        const stored = await ContactMessage.findById(message._id);
        expect(stored.replies).toHaveLength(0);
        expect(stored.status).toBe("new");
        expect(stored.handledAt).toBeNull();
    });

    test("keeps a thread across several replies", async () => {
        const admin = await createAdmin();
        const message = await seedMessage();

        await api
            .post(`/api/v1/contact/${message._id}/reply`)
            .set("Cookie", cookieFor(admin))
            .send({ body: answer });
        await api
            .post(`/api/v1/contact/${message._id}/reply`)
            .set("Cookie", cookieFor(admin))
            .send({ body: "Following up — that price includes the products." });

        const stored = await ContactMessage.findById(message._id);
        expect(stored.replies).toHaveLength(2);
        expect(stored.replies[1].body).toContain("Following up");
    });

    test.each([
        ["an empty body", {}],
        ["a body under 10 characters", { body: "ok" }],
        ["an extra field that could redirect the email", { body: answer, email: "attacker@evil.test" }]
    ])("rejects %s with 400 and sends nothing", async (_label, payload) => {
        const admin = await createAdmin();
        const message = await seedMessage();

        const res = await api
            .post(`/api/v1/contact/${message._id}/reply`)
            .set("Cookie", cookieFor(admin))
            .send(payload);

        expect(res.status).toBe(400);
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    test("404s for a message that does not exist", async () => {
        const admin = await createAdmin();

        const res = await api
            .post("/api/v1/contact/6a76fd7daf1ca36bf83d8e45/reply")
            .set("Cookie", cookieFor(admin))
            .send({ body: answer });

        expect(res.status).toBe(404);
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    test("escapes admin-typed HTML in the outgoing email", async () => {
        const admin = await createAdmin();
        const message = await seedMessage();

        await api
            .post(`/api/v1/contact/${message._id}/reply`)
            .set("Cookie", cookieFor(admin))
            .send({ body: "<script>alert(1)</script> and the rest of the answer." });

        const [{ html }] = sendEmailMock.mock.calls[0];
        expect(html).not.toContain("<script>");
        expect(html).toContain("&lt;script&gt;");
    });
});

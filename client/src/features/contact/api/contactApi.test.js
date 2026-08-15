import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({
  request: vi.fn(),
  ENDPOINTS: {
    contact: { create: "/contact" },
    newsletter: { subscribe: "/newsletter/subscribe" },
  },
}));

import { request } from "@/services/api";
import { submitContact, subscribeNewsletter } from "./contactApi";

beforeEach(() => {
  request.mockReset();
});

const payload = {
  name: "Jane Cooper",
  email: "jane@example.com",
  phone: "",
  topic: "general",
  message: "I would like a quote for a two-bedroom flat.",
  website: "",
};

describe("submitContact", () => {
  test("posts the form values to the contact endpoint", async () => {
    request.mockResolvedValueOnce({ contactMessage: { _id: "abc" } });

    await submitContact(payload);

    expect(request).toHaveBeenCalledWith({
      method: "POST",
      url: "/contact",
      data: payload,
    });
  });

  /*
   * The regression this file exists for. The endpoint used to be unimplemented,
   * and the api layer turned a 404 (and a dead network) into a fake success —
   * so a customer saw "Message sent" for a message nobody would ever read.
   * Every failure must now reach the caller.
   */
  test.each([
    ["a 404", { status: 404, message: "Not found" }],
    ["a network failure", { status: 0, message: "Network error" }],
    ["a validation error", { status: 400, message: "Validation failed!" }],
  ])("propagates %s instead of faking success", async (_label, err) => {
    request.mockRejectedValueOnce(err);

    await expect(submitContact(payload)).rejects.toEqual(err);
  });
});

describe("subscribeNewsletter", () => {
  // Newsletter has no server implementation yet, so it keeps the optimistic
  // fallback. Delete this test together with the fallback when /newsletter
  // ships.
  test("still simulates acceptance while the endpoint is missing", async () => {
    request.mockRejectedValueOnce({ status: 404, message: "Not found" });

    await expect(subscribeNewsletter({ email: "jane@example.com" })).resolves.toEqual({
      accepted: true,
      simulated: true,
    });
  });

  test("propagates a real error from a live endpoint", async () => {
    const err = { status: 422, message: "Already subscribed" };
    request.mockRejectedValueOnce(err);

    await expect(subscribeNewsletter({ email: "jane@example.com" })).rejects.toEqual(err);
  });
});

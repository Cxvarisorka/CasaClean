import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/services/api", () => ({ request: vi.fn() }));

import { request } from "@/services/api";
import {
  cancelSubscription,
  listMySubscriptions,
  pauseSubscription,
  resumeSubscription,
  updateSubscriptionCard,
} from "./subscriptionApi";

const rawSubscription = {
  _id: "sub_1",
  serviceId: { _id: "service_1", name: "Home cleaning" },
  cityId: { _id: "city_1", name: "Rome" },
  intervalDays: 7,
  status: "active",
  nextServiceDate: "2026-08-08",
  nextChargeAt: "2026-08-07T00:00:00.000Z",
  failedAttempts: 0,
};

describe("subscriptionApi", () => {
  beforeEach(() => request.mockReset());

  test("normalises the signed-in user's subscriptions", async () => {
    request.mockResolvedValue({ subscriptions: [rawSubscription] });

    const [subscription] = await listMySubscriptions();

    expect(request).toHaveBeenCalledWith({ method: "GET", url: "/subscription/my" });
    expect(subscription).toMatchObject({
      _id: "sub_1",
      serviceId: "service_1",
      serviceName: "Home cleaning",
      cityId: "city_1",
      cityName: "Rome",
      intervalDays: 7,
    });
  });

  test("uses the exact customer action routes and whitelists a card update", async () => {
    request.mockResolvedValue({ subscription: rawSubscription });

    await pauseSubscription("sub_1");
    await resumeSubscription("sub_1");
    await cancelSubscription("sub_1");
    await updateSubscriptionCard("sub_1", "pm_123");

    expect(request).toHaveBeenNthCalledWith(1, {
      method: "PATCH",
      url: "/subscription/sub_1/pause",
    });
    expect(request).toHaveBeenNthCalledWith(2, {
      method: "PATCH",
      url: "/subscription/sub_1/resume",
    });
    expect(request).toHaveBeenNthCalledWith(3, {
      method: "PATCH",
      url: "/subscription/sub_1/cancel",
    });
    expect(request).toHaveBeenNthCalledWith(4, {
      method: "PATCH",
      url: "/subscription/sub_1/payment-method",
      data: { paymentMethodId: "pm_123" },
    });
  });
});

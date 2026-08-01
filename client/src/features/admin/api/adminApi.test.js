import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({
  apiClient: { request: vi.fn() },
  request: vi.fn(),
}));

import { apiClient } from "@/services/api";
import { bookingApi, subscriptionApi } from "./adminApi";

/** Build one envelope page exactly as the API returns it. */
const page = (key, countKey, items, total) => ({
  data: {
    status: "success",
    [countKey]: total,
    data: { [key]: items },
  },
});

const bookings = (n, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({
    _id: `booking${offset + i}`,
    customerName: `Customer ${offset + i}`,
  }));

beforeEach(() => {
  apiClient.request.mockReset();
});

describe("admin list pagination", () => {
  test("walks every page instead of silently stopping at the first 100", async () => {
    apiClient.request
      .mockResolvedValueOnce(page("bookings", "bookingCount", bookings(100, 0), 250))
      .mockResolvedValueOnce(page("bookings", "bookingCount", bookings(100, 100), 250))
      .mockResolvedValueOnce(page("bookings", "bookingCount", bookings(50, 200), 250));

    const result = await bookingApi.list();

    expect(apiClient.request).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(250);
    expect(result[0]._id).toBe("booking0");
    expect(result.at(-1)._id).toBe("booking249");
  });

  test("requests successive pages with the documented query shape", async () => {
    apiClient.request
      .mockResolvedValueOnce(page("bookings", "bookingCount", bookings(100, 0), 150))
      .mockResolvedValueOnce(page("bookings", "bookingCount", bookings(50, 100), 150));

    await bookingApi.list();

    expect(apiClient.request).toHaveBeenNthCalledWith(1, {
      method: "GET",
      url: "/booking?page=1&limit=100",
    });
    expect(apiClient.request).toHaveBeenNthCalledWith(2, {
      method: "GET",
      url: "/booking?page=2&limit=100",
    });
  });

  test("stops after a single request when the first page is short", async () => {
    apiClient.request.mockResolvedValueOnce(
      page("bookings", "bookingCount", bookings(7), 7)
    );

    const result = await bookingApi.list();

    expect(apiClient.request).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(7);
  });

  test("stops when the total lands exactly on a page boundary", async () => {
    // A full page whose count says that's everything must NOT trigger a second
    // request that would return an empty page.
    apiClient.request.mockResolvedValueOnce(
      page("bookings", "bookingCount", bookings(100), 100)
    );

    const result = await bookingApi.list();

    expect(apiClient.request).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(100);
  });

  test("appends the pagination params to a url that already has a query string", async () => {
    apiClient.request.mockResolvedValueOnce(
      page("subscriptions", "subscriptionCount", [], 0)
    );

    await subscriptionApi.list({ status: "paused" });

    expect(apiClient.request).toHaveBeenCalledWith({
      method: "GET",
      url: "/subscription?status=paused&page=1&limit=100",
    });
  });

  test("omits the status param entirely when no filter is active", async () => {
    apiClient.request.mockResolvedValueOnce(
      page("subscriptions", "subscriptionCount", [], 0)
    );

    await subscriptionApi.list();

    expect(apiClient.request).toHaveBeenCalledWith({
      method: "GET",
      url: "/subscription?page=1&limit=100",
    });
  });
});

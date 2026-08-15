import { describe, test, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

// Stub the catalogue query so the resolution logic is tested in isolation — the
// network/react-query layer is already covered elsewhere.
vi.mock("./useServices", () => ({ useServices: vi.fn() }));

import { useServices } from "./useServices";
import { useService } from "./useService";

const CATALOGUE = [
  { id: "svc1", slug: "deep-clean", name: "Deep Clean" },
  { id: "svc2", slug: "office-cleaning", name: "Office Cleaning" },
  { id: "svc3", slug: "move-out", name: "Move Out" },
  { id: "svc4", slug: "laundry", name: "Laundry" },
];

const mockCatalogue = (overrides = {}) =>
  useServices.mockReturnValue({
    services: CATALOGUE,
    isLoading: false,
    isError: false,
    ...overrides,
  });

describe("useService", () => {
  test("resolves a service by its slug", () => {
    mockCatalogue();
    const { result } = renderHook(() => useService("office-cleaning"));
    expect(result.current.service).toBe(CATALOGUE[1]);
    expect(result.current.notFound).toBe(false);
  });

  test("falls back to the raw id so id-based links keep working", () => {
    mockCatalogue();
    const { result } = renderHook(() => useService("svc3"));
    expect(result.current.service).toBe(CATALOGUE[2]);
  });

  test("matches the slug case-insensitively", () => {
    mockCatalogue();
    const { result } = renderHook(() => useService("Deep-Clean"));
    expect(result.current.service).toBe(CATALOGUE[0]);
  });

  test("reports notFound for an unknown slug once the catalogue has loaded", () => {
    mockCatalogue();
    const { result } = renderHook(() => useService("nope"));
    expect(result.current.service).toBeNull();
    expect(result.current.notFound).toBe(true);
  });

  test("does not report notFound while the catalogue is still loading", () => {
    mockCatalogue({ services: [], isLoading: true });
    const { result } = renderHook(() => useService("deep-clean"));
    expect(result.current.service).toBeNull();
    expect(result.current.notFound).toBe(false);
  });

  test("suggests up to three related services, excluding the current one", () => {
    mockCatalogue();
    const { result } = renderHook(() => useService("deep-clean"));
    expect(result.current.related.map((s) => s.id)).toEqual([
      "svc2",
      "svc3",
      "svc4",
    ]);
  });
});

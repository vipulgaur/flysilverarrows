import { afterEach, describe, expect, it, vi } from "vitest";
import { restoreDemoData, safelyPersist } from "@/lib/demo-storage";
import { seedData } from "@/lib/seed";

afterEach(() => vi.restoreAllMocks());

describe("Demo storage recovery", () => {
  it.each(["not-json", "null", "[]", "42", '{"users":null}', '{"flights":[null]}', '{"users":[{}]}'])("recovers unreadable data: %s", (raw) => {
    const data = restoreDemoData(raw);
    expect(data.users.length).toBeGreaterThan(0);
    expect(data.users[0]?.name).toBeDefined();
    expect(Array.isArray(data.flights)).toBe(true);
  });

  it("preserves existing demo data and initializes missing approval collections", () => {
    const original = seedData();
    const { profileRequests, readNotificationIds, ...old } = original;
    old.users[0] = { ...original.users[0], id: "kept", name: "Retained admin" } as typeof original.users[number];
    const recovered = restoreDemoData(JSON.stringify(old));
    expect(recovered.users[0]?.name).toBe("Retained admin");
    expect(recovered.profileRequests).toEqual([]);
    expect(recovered.readNotificationIds).toEqual({});
    expect(recovered.flights).toEqual(original.flights);
  });

  it("does not replace deliberately empty collections with seed rows", () => {
    const recovered = restoreDemoData(JSON.stringify({ ...seedData(), subjects: [], classrooms: [] }));
    expect(recovered.subjects).toEqual([]);
    expect(recovered.classrooms).toEqual([]);
  });

  it("handles blocked writes and removals without throwing", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
    expect(safelyPersist("demo-test", "value")).toBe(false);
    expect(safelyPersist("demo-test", null)).toBe(false);
  });

  it("writes and removes data when storage is available", () => {
    expect(safelyPersist("demo-test", "value")).toBe(true);
    expect(localStorage.getItem("demo-test")).toBe("value");
    expect(safelyPersist("demo-test", null)).toBe(true);
    expect(localStorage.getItem("demo-test")).toBeNull();
  });
});
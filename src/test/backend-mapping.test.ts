import { describe, expect, it } from "vitest";
import { seedData } from "@/lib/seed";
import { diffTables, fromTables, toTables } from "@/lib/api/mapping";

const T = "tenant-1";

describe("Database mapping", () => {
  it("round-trips every practice record through the database row shape", () => {
    const seed = seedData();
    const back = fromTables(toTables(seed, T));
    expect(back.users).toEqual(seed.users);
    expect(back.flights).toEqual(seed.flights);
    expect(back.programs).toEqual(seed.programs);
    expect(back.bookings).toEqual(seed.bookings.map((b) => ({ ...b, approvalStatus: b.approvalStatus ?? "approved" })));
    expect(back.lectures).toEqual(seed.lectures);
  });

  it("stores roles in their own table, not on the member record", () => {
    const t = toTables(seedData(), T);
    expect(t.tenant_members[0]).not.toHaveProperty("role");
    expect(t.member_roles.find((r) => r['member_id'] === "u-admin")?.['role']).toBe("admin");
  });

  it("archives removed rows instead of deleting them, and sends only changed rows", () => {
    const a = seedData();
    const b = { ...a, flights: a.flights.slice(1), aircraft: a.aircraft.map((x, i) => (i === 0 ? { ...x, grounded: true } : x)) };
    const c = diffTables(toTables(a, T), toTables(b, T));
    expect(c.archives.flights).toEqual([a.flights[0]!.id]);
    expect(c.upserts.aircraft?.map((r) => r.id)).toEqual([a.aircraft[0]!.id]);
    expect(c.upserts.flights).toBeUndefined();
  });

  it("never updates or archives audit entries", () => {
    const a = seedData();
    const b = { ...a, activity: [] };
    expect(diffTables(toTables(a, T), toTables(b, T)).archives.activity_feed).toBeUndefined();
  });
});

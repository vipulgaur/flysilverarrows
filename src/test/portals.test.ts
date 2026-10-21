import { describe, expect, it } from "vitest";
import { canAccess, ftlStatus, hoursBreakdown, restoreUser, reviewRequest, softDeleteUser, theoryProgress } from "@/lib/logic";
import { seedData } from "@/lib/seed";
import type { AppData } from "@/lib/types";

const user = (d: AppData, id: string) => d.users.find((u) => u.id === id)!;

describe("RBAC portals", () => {
  it("blocks non-admins from other portals and admin tools", () => {
    expect(canAccess("student", "/portal/cfi")).toBe(false);
    expect(canAccess("student", "/admin/create")).toBe(false);
    expect(canAccess("instructor", "/portal/admin")).toBe(false);
    expect(canAccess("ground", "/flights")).toBe(false);
    expect(canAccess("student", "/portal/student")).toBe(true);
    expect(canAccess("admin", "/portal/ground")).toBe(true);
  });

  it("soft-deletes a user while preserving their flights, and can restore", () => {
    const d = seedData();
    const admin = user(d, "u-admin");
    const flights = d.flights.filter((f) => f.pilotId === "u-arp").length;
    const after = softDeleteUser(d, "u-arp", admin) as AppData;
    const u = user(after, "u-arp");
    expect(u.status).toBe("deleted");
    expect(u.deletedBy).toBe("u-admin");
    expect(after.flights.filter((f) => f.pilotId === "u-arp").length).toBe(flights);
    expect(user(restoreUser(after, "u-arp", admin) as AppData, "u-arp").status).toBe("active");
  });

  it("only admins can soft-delete", () => {
    const d = seedData();
    expect(typeof softDeleteUser(d, "u-arp", user(d, "u-vpl"))).toBe("string");
  });

  it("approving a reschedule moves the booking to the proposed time", () => {
    const d = seedData();
    const req = d.requests[0]!;
    const after = reviewRequest(d, req.id, user(d, "u-vpl"), "approved") as AppData;
    const b = after.bookings.find((x) => x.id === req.bookingId)!;
    expect(b.start).toBe(req.proposedStart);
    expect(after.requests[0]!.status).toBe("approved");
  });

  it("another instructor cannot review a request not assigned to them", () => {
    const d = seedData();
    expect(typeof reviewRequest(d, d.requests[0]!.id, user(d, "u-prn"), "approved")).toBe("string");
  });

  it("theory progress counts passed subjects only (pass mark 75%)", () => {
    const d = seedData();
    expect(theoryProgress("u-lnl", d).passed).toBe(1);
    expect(theoryProgress("u-ana", d).passed).toBe(6);
  });

  it("FTL duty limit is 10 hours and flight limit 8 hours", () => {
    const d = seedData();
    d.duty = [{ id: "x", instructorId: "u-vpl", start: new Date(Date.now() - 4 * 3600000).toISOString() }];
    const f = ftlStatus("u-vpl", d);
    expect(f.dutyLeft).toBeGreaterThanOrEqual(359);
    expect(f.dutyLeft).toBeLessThanOrEqual(360);
    expect(f.flightLeft).toBe(480 - f.flightMin);
  });

  it("splits logbook hours by dual, solo and sim", () => {
    const h = hoursBreakdown("u-ana", seedData());
    expect(h.dual + h.solo + h.sim).toBe(h.total);
  });
});

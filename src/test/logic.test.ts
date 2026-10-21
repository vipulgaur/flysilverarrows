import { describe, expect, it } from "vitest";
import { blockMinutes, bookingProblem, maintenanceState, studentProgress } from "@/lib/logic";
import { seedData } from "@/lib/seed";
import type { Booking } from "@/lib/types";

describe("flight school rules", () => {
  it("computes block time, including past midnight", () => {
    expect(blockMinutes("09:10", "10:25")).toBe(75);
    expect(blockMinutes("23:30", "00:15")).toBe(45);
  });

  it("rejects double-booking the same aircraft", () => {
    const d = seedData();
    const existing = d.bookings[0]!;
    const b: Booking = { id: "x", start: existing.start, end: existing.end, type: "solo", status: "scheduled", aircraftId: existing.aircraftId, studentId: "u-lnl" };
    expect(bookingProblem(b, d)).toMatch(/Aircraft/);
  });

  it("blocks booking a grounded aircraft", () => {
    const d = seedData();
    d.aircraft[2]!.grounded = true;
    const b: Booking = { id: "x", start: "2030-01-01T10:00:00Z", end: "2030-01-01T11:00:00Z", type: "solo", status: "scheduled", aircraftId: d.aircraft[2]!.id, studentId: "u-lnl" };
    expect(bookingProblem(b, d)).toMatch(/grounded/);
  });

  it("flags maintenance overdue once airframe hours pass due hours", () => {
    const ac = { id: "a", reg: "X", type: "t", hourlyRate: 0, totalHours: 100, tachHours: 100, grounded: false };
    expect(maintenanceState({ id: "m", aircraftId: "a", title: "50h", dueHours: 100 }, ac)).toBe("overdue");
    expect(maintenanceState({ id: "m", aircraftId: "a", title: "50h", dueHours: 105 }, ac)).toBe("soon");
  });

  it("counts student progress from sign-offs", () => {
    const p = studentProgress("u-ana", seedData());
    expect(p.total).toBe(10);
    expect(p.completed).toBe(p.done.size);
  });
});

import { canAccess as canAccessDash } from "@/lib/logic";
import { describe as d2, it as i2, expect as e2 } from "vitest";
d2("dashboard tab", () => {
  i2("is open to every role", () => {
    for (const r of ["admin", "instructor", "ground", "student"] as const) e2(canAccessDash(r, "/dashboard")).toBe(true);
  });
});

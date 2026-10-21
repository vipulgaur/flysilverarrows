import { describe, expect, it } from "vitest";
import { cumulativeHours, demoHourEntries, HOUR_PERIODS, type HourEntry } from "@/lib/logic";

const now = new Date(2026, 9, 18, 12);
const student = { id: "student-a", role: "student" as const };
const instructor = { id: "instructor-a", role: "instructor" as const };
const flight = (date: string, minutes = 60, pilotId = student.id, instructorId: string | undefined = instructor.id): HourEntry => ({ date, minutes, pilotId, instructorId, kind: "dual" });

describe("cumulative flight hour periods", () => {
  it.each([
    ["1 day", "2026-10-18"], ["7 days", "2026-10-12"], ["14 days", "2026-10-05"],
    ["21 days", "2026-09-28"], ["28 days", "2026-09-21"], ["1 month", "2026-09-19"],
    ["3 months", "2026-07-19"], ["6 months", "2026-04-19"], ["12 months", "2025-10-19"],
  ])("counts the inclusive %s window and excludes future flights", (label, start) => {
    const previous = new Date(`${start}T12:00:00`);
    previous.setDate(previous.getDate() - 1);
    const date = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}-${String(previous.getDate()).padStart(2, "0")}`;
    const rows = cumulativeHours(student, [flight(start), flight("2026-10-18", 30), flight(date, 120), flight("2026-10-19", 240)], now);
    expect(rows.find((r) => r.label === label)).toMatchObject({ start, end: "2026-10-18", total: 90 });
  });

  it("only counts the student's own flights", () => {
    const rows = cumulativeHours(student, [flight("2026-10-18", 60), flight("2026-10-18", 120, "other-student")], now);
    expect(rows[0]?.total).toBe(60);
  });

  it("counts instructor teaching and own flying once each", () => {
    const rows = cumulativeHours(instructor, [
      flight("2026-10-18", 60), { ...flight("2026-10-18", 30, instructor.id), instructorId: undefined, kind: "solo" },
      flight("2026-10-18", 45, instructor.id, instructor.id), flight("2026-10-18", 120, "other", "other-instructor"),
    ], now);
    expect(rows[0]).toMatchObject({ total: 135, instructed: 105, pic: 75 });
  });

  it("handles month ends as calendar months", () => {
    const rows = cumulativeHours(student, [], new Date(2026, 2, 31));
    expect(rows.find((r) => r.label === "1 month")?.start).toBe("2026-03-01");
  });

  it.each([student, instructor])("provides stable, increasing demo totals for $role across all nine periods", (person) => {
    const entries = demoHourEntries(person, now);
    expect(demoHourEntries(person, now)).toEqual(entries);
    const rows = cumulativeHours(person, entries, now);
    expect(rows.map((r) => r.label)).toEqual(HOUR_PERIODS.map((p) => p.label));
    expect(rows).toHaveLength(9);
    expect(rows[0]?.total).toBeGreaterThan(0);
    rows.slice(1).forEach((row, i) => expect(row.total).toBeGreaterThanOrEqual(rows[i]?.total ?? Infinity));
    rows.forEach((row) => expect(row.total).toBe(row.dual + row.solo + row.sim));
  });
});
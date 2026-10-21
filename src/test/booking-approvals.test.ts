import { describe, expect, it } from "vitest";
import { bookingApproved, bookingPending, memberNotifications, prepareBooking, reviewBooking } from "@/lib/logic";
import { diffTables, fromTables, mergePending, toTables } from "@/lib/api/mapping";
import { seedData } from "@/lib/seed";
import type { Booking } from "@/lib/types";

function fixture() {
  const data = seedData();
  const student = data.users.find((u) => u.id === "u-arp");
  const admin = data.users.find((u) => u.role === "admin");
  const instructor = data.users.find((u) => u.role === "instructor");
  if (!student || !admin || !instructor) throw new Error("Missing fixture member");
  const booking: Booking = { id: "approval-test", start: "2030-01-01T10:00:00.000Z", end: "2030-01-01T11:00:00.000Z", aircraftId: "a-1", studentId: student.id, status: "scheduled", type: "solo" };
  return { data, student, admin, instructor, booking };
}

describe("Student booking approval", () => {
  it("student bookings await admin approval and cannot be dispatched", () => {
    const { data, student, booking } = fixture();
    const result = prepareBooking(booking, student, data);
    if (typeof result === "string") throw new Error(result);
    expect(result.approvalStatus).toBe("pending");
    expect(bookingApproved(result)).toBe(false);
    expect(bookingPending(result)).toBe(true);
  });
  it("only an admin can approve a student's booking", () => {
    const { data, student, instructor, booking } = fixture();
    data.bookings.push({ ...booking, approvalStatus: "pending" });
    expect(reviewBooking(data, booking.id, student, "approved")).toBe("Only administrators can review student bookings.");
    expect(reviewBooking(data, booking.id, instructor, "approved")).toBe("Only administrators can review student bookings.");
  });
  it("a student's edit to an approved booking requires renewed administrator approval", () => {
    const { data, student, booking } = fixture();
    data.bookings.push({ ...booking, approvalStatus: "approved", requestedBy: student.id, requestedAt: "2026-10-19T10:00:00Z", reviewedBy: "u-admin", decisionNotes: "Cleared" });
    const result = prepareBooking({ ...booking, end: "2030-01-01T12:00:00.000Z" }, student, data);
    expect(result).toMatchObject({ approvalStatus: "pending", end: "2030-01-01T12:00:00.000Z" });
    if (typeof result === "string") throw new Error(result);
    expect(result.reviewedBy).toBeUndefined();
  });
  it("an administrator cannot approve a conflicting pending booking", () => {
    const { data, admin, booking } = fixture();
    data.bookings.push({ ...booking, approvalStatus: "pending" }, { ...booking, id: "conflict", approvalStatus: "approved" });
    expect(reviewBooking(data, booking.id, admin, "approved")).toBe("Aircraft is already booked at that time.");
  });
  it("approval retains the booking and records who reviewed it", () => {
    const { data, admin, booking } = fixture();
    data.bookings.push({ ...booking, approvalStatus: "pending" });
    const result = reviewBooking(data, booking.id, admin, "approved", "Cleared", new Date("2026-10-20T07:00:00Z"));
    expect(result).toMatchObject({ id: booking.id, status: "scheduled", approvalStatus: "approved", reviewedBy: admin.id, reviewedAt: "2026-10-20T07:00:00.000Z", decisionNotes: "Cleared" });
  });
  it("declining releases the slot but retains the booking history", () => {
    const { data, admin, booking } = fixture();
    data.bookings.push({ ...booking, approvalStatus: "pending" });
    expect(reviewBooking(data, booking.id, admin, "declined", "Weather")).toMatchObject({ id: booking.id, status: "cancelled", approvalStatus: "declined", decisionNotes: "Weather" });
  });
  it("a cancelled request cannot be approved", () => {
    const { data, admin, booking } = fixture();
    data.bookings.push({ ...booking, approvalStatus: "pending", status: "cancelled" });
    expect(reviewBooking(data, booking.id, admin, "approved")).toBe("Booking already reviewed or cancelled.");
  });
  it("admins receive pending bookings and students receive all saved outcomes", () => {
    const { data, admin, student, booking } = fixture();
    data.bookings.push({ ...booking, approvalStatus: "pending", requestedAt: "2026-10-20T07:00:00Z" });
    expect(memberNotifications(data, admin).some((n) => n.id.startsWith(`${booking.id}:pending`))).toBe(true);
    for (const action of ["booking_approved", "booking_declined", "booking_cancelled"]) {
      data.activity.push({ id: action, at: "2026-10-20T07:01:00Z", actorId: admin.id, actorName: admin.name, actorRole: "admin", action, entityType: "booking", entityId: booking.id, details: "Decision" });
    }
    expect(memberNotifications(data, student).filter((n) => n.id.startsWith("booking:")).map((n) => n.status).sort()).toEqual(["approved", "cancelled", "declined"]);
  });
  it("a fresh live read preserves unsaved local rows without reverting a remote decision", () => {
    const { data, booking } = fixture();
    data.bookings.push({ ...booking, approvalStatus: "pending" });
    const baseline = toTables(data, "tenant");
    const local = toTables({ ...data, users: data.users.map((u, i) => i === 0 ? { ...u, phone: "12345" } : u) }, "tenant");
    const remote = toTables({ ...data, bookings: data.bookings.map((b) => b.id === booking.id ? { ...b, approvalStatus: "approved" } : b) }, "tenant");
    const merged = fromTables(mergePending(remote, diffTables(baseline, local)));
    expect(merged.bookings.find((b) => b.id === booking.id)?.approvalStatus).toBe("approved");
    expect(merged.users[0]?.phone).toBe("12345");
  });
});
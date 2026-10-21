import { describe, expect, it } from "vitest";
import { canAccess, memberNotifications, reviewProfileRequest, submitProfileRequest } from "@/lib/logic";
import { seedData } from "@/lib/seed";
import type { AppData, ProfileChanges } from "@/lib/types";

function member(d: AppData, id: string) {
  const u = d.users.find((u) => u.id === id);
  if (!u) throw new Error("Missing test member");
  return u;
}
function result(value: AppData | string): AppData {
  if (typeof value === "string") throw new Error(value);
  return value;
}
function pending(id = "u-ana") {
  const data = seedData();
  const after = result(submitProfileRequest(data, member(data, id), id, { name: "Requested Name", phone: "123456" }));
  const request = after.profileRequests[0];
  if (!request) throw new Error("Missing request");
  return { data, after, request };
}
describe("profile edit approval rules", () => {
  it.each(["student", "instructor", "ground", "admin"] as const)("allows %s to access their profile", (role) => {
    expect(canAccess(role, "/profile")).toBe(true);
  });
  it.each(["u-ana", "u-vpl", "u-anj"])("keeps %s changes pending without changing the actual profile", (id) => {
    const { data, after, request } = pending(id);
    expect(request.status).toBe("pending");
    expect(member(after, id)).toEqual(member(data, id));
    expect(request.changes).toMatchObject({ name: "Requested Name", phone: "123456" });
    expect(memberNotifications(after, member(after, "u-admin")).some((n) => n.id === `${request.id}:pending`)).toBe(true);
  });
  it("applies changes only on admin approval and notifies the applicant", () => {
    const { after, request } = pending();
    const approved = result(reviewProfileRequest(after, request.id, member(after, "u-admin"), "approved", "Verified"));
    expect(member(approved, "u-ana").name).toBe("Requested Name");
    expect(member(approved, "u-ana").phone).toBe("123456");
    expect(memberNotifications(approved, member(approved, "u-ana"))).toContainEqual(expect.objectContaining({ id: `${request.id}:approved`, status: "approved", detail: "Verified", read: false }));
    expect(memberNotifications(approved, member(approved, "u-arp"))).toEqual([]);
  });
  it("declines without changing the profile and sends the admin's reason", () => {
    const { data, after, request } = pending();
    const declined = result(reviewProfileRequest(after, request.id, member(after, "u-admin"), "declined", "Please verify your details"));
    expect(member(declined, "u-ana")).toEqual(member(data, "u-ana"));
    expect(memberNotifications(declined, member(declined, "u-ana"))).toContainEqual(expect.objectContaining({ status: "declined", detail: "Please verify your details" }));
  });
  it.each(["u-ana", "u-vpl", "u-anj"])("prevents %s from reviewing profile requests", (id) => {
    const { after, request } = pending();
    expect(reviewProfileRequest(after, request.id, member(after, id), "approved")).toBe("Only administrators can review profile changes.");
  });
  it("prevents editing another member and changing roles via profile edits", () => {
    const d = seedData();
    expect(submitProfileRequest(d, member(d, "u-vpl"), "u-ana", { name: "Wrong" })).toBe("You can only edit your own profile.");
    expect(submitProfileRequest(d, member(d, "u-ana"), "u-ana", { role: "admin" } as ProfileChanges)).toBe("This profile field cannot be edited.");
  });
  it("approves admin profile edits immediately with a notification", () => {
    const d = seedData();
    const updated = result(submitProfileRequest(d, member(d, "u-admin"), "u-admin", { phone: "987654" }));
    expect(member(updated, "u-admin").phone).toBe("987654");
    expect(updated.profileRequests[0]?.status).toBe("approved");
    expect(memberNotifications(updated, member(updated, "u-admin"))[0]?.status).toBe("approved");
  });
  it("prevents duplicate pending requests and repeated reviews", () => {
    const { after, request } = pending();
    expect(submitProfileRequest(after, member(after, "u-ana"), "u-ana", { phone: "777" })).toBe("This profile already has a pending request.");
    const approved = result(reviewProfileRequest(after, request.id, member(after, "u-admin"), "approved"));
    expect(reviewProfileRequest(approved, request.id, member(approved, "u-admin"), "declined", "Reason")).toBe("This request has already been reviewed.");
  });
  it("tracks read status separately for each member", () => {
    const { after, request } = pending();
    const approved = result(reviewProfileRequest(after, request.id, member(after, "u-admin"), "approved"));
    approved.readNotificationIds["u-ana"] = [`${request.id}:approved`];
    expect(memberNotifications(approved, member(approved, "u-ana"))[0]?.read).toBe(true);
    expect(approved.readNotificationIds["u-admin"]).toBeUndefined();
  });
  it("requires a decline reason and revalidates duplicate emails on approval", () => {
    const { after, request } = pending();
    expect(reviewProfileRequest(after, request.id, member(after, "u-admin"), "declined")).toBe("Add a reason for declining the request.");
    request.changes.email = member(after, "u-arp").email;
    expect(reviewProfileRequest(after, request.id, member(after, "u-admin"), "approved")).toBe("This email is already used by another member.");
  });
  it("rejects stale approvals rather than overwriting subsequent profile changes", () => {
    const { after, request } = pending();
    member(after, "u-ana").name = "Newer Name";
    expect(reviewProfileRequest(after, request.id, member(after, "u-admin"), "approved")).toBe("The profile has changed since this request. Decline it and ask for a new request.");
  });
});
import { profileProblem as pp2, submitProfileRequest as spr2 } from "@/lib/logic";
import { seedData as seed2 } from "@/lib/seed";
describe("student registration details", () => {
  it("students cannot edit admin or instructor notes", () => {
    const d = seed2(); const s = d.users.find((u) => u.role === "student")!;
    expect(spr2(d, s, s.id, { adminNote: "x" })).toBe("Only staff can edit admin and instructor notes.");
  });
  it("rejects future date of birth and unknown gender", () => {
    const d = seed2(); const s = d.users.find((u) => u.role === "student")!;
    expect(pp2({ dateOfBirth: "2999-01-01" }, s, d)).toBe("Enter a valid date of birth.");
    expect(pp2({ gender: "X" }, s, d)).toBe("Choose a gender from the list.");
    expect(pp2({ dateOfBirth: "2001-05-04", gender: "Female", caaRef: "CAA-1" }, s, d)).toBeNull();
  });
});

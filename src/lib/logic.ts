import type { AppData, Booking, MaintenanceItem, Aircraft, Role, User, ProfileChanges } from "./types";
import { addDays, format, startOfDay, subMonths } from "date-fns";

export const HOUR_PERIODS = [
  { label: "1 day", days: 1 },
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "21 days", days: 21 },
  { label: "28 days", days: 28 },
  { label: "1 month", months: 1 },
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "12 months", months: 12 },
] as const;

export type HourEntry = Pick<import("./types").Flight, "date" | "minutes" | "kind" | "ifrMinutes" | "pilotId" | "instructorId">;

/** Inclusive rolling calendar-date windows; months use calendar arithmetic, not 30-day approximations. */
export function cumulativeHours(person: Pick<User, "id" | "role">, entries: HourEntry[], now = new Date()) {
  const today = startOfDay(now);
  const end = format(today, "yyyy-MM-dd");
  const own = entries.filter((f) => person.role === "instructor"
    ? f.instructorId === person.id || f.pilotId === person.id
    : f.pilotId === person.id);
  return HOUR_PERIODS.map((period) => {
    const from = "days" in period ? addDays(today, 1 - period.days) : addDays(subMonths(today, period.months), 1);
    const start = format(from, "yyyy-MM-dd");
    const flights = own.filter((f) => f.date >= start && f.date <= end);
    const sum = (predicate: (f: HourEntry) => boolean) => flights.filter(predicate).reduce((total, f) => total + f.minutes, 0);
    return {
      label: period.label, start, end,
      total: sum(() => true),
      dual: sum((f) => flightKind(f) === "dual"),
      solo: sum((f) => flightKind(f) === "solo"),
      instructed: sum((f) => f.instructorId === person.id && flightKind(f) !== "sim"),
      pic: sum((f) => f.pilotId === person.id && flightKind(f) !== "sim"),
      sim: sum((f) => flightKind(f) === "sim"),
      ifr: flights.reduce((total, f) => total + (f.ifrMinutes ?? 0), 0),
      flights: flights.filter((f) => flightKind(f) !== "sim").length,
    };
  });
}

/** Synthetic reporting records only: never insert these into the operational flight log or duty limits. */
export function demoHourEntries(person: Pick<User, "id" | "role">, now = new Date()): HourEntry[] {
  const seed = Array.from(person.id).reduce((total, letter) => total + letter.charCodeAt(0), 0);
  const today = startOfDay(now);
  const first = addDays(subMonths(today, 12), 1);
  const entries: HourEntry[] = [];
  for (let date = first, day = 0; date <= today; date = addDays(date, 1), day++) {
    const age = Math.round((today.getTime() - date.getTime()) / 86400000);
    if (age !== 0 && (age + seed) % 7 > (person.role === "instructor" ? 3 : 2)) continue;
    const kind = day % 9 === 0 ? "sim" : day % 4 === 0 ? "solo" : "dual";
    const minutes = 45 + ((day + seed) % 6) * 15;
    const teaches = person.role === "instructor" && kind !== "solo";
    entries.push({
      date: format(date, "yyyy-MM-dd"), kind, minutes,
      pilotId: teaches ? `demo-student-${person.id}` : person.id,
      instructorId: teaches ? person.id : kind === "dual" ? "demo-cfi" : undefined,
      ifrMinutes: day % 3 === 0 ? Math.floor(minutes / 3) : 0,
    });
  }
  return entries;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

/** Minutes between two HH:mm times; wraps past midnight. */
export function blockMinutes(off: string, on: string): number {
  const [oh = NaN, om = NaN] = off.split(":").map(Number);
  const [nh = NaN, nm = NaN] = on.split(":").map(Number);
  if ([oh, om, nh, nm].some((n) => Number.isNaN(n))) return 0;
  let diff = nh * 60 + nm - (oh * 60 + om);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

export function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}
export const fmtDec = (minutes: number) => (minutes / 60).toFixed(1);

export const activeUsers = (d: AppData, role?: Role) =>
  d.users.filter((u) => u.status !== "deleted" && (!role || u.role === role));

const overlaps = (a: { start: string; end: string }, b: { start: string; end: string }) =>
  new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end);

/** Returns a human-readable reason a booking is not allowed, or null. */
export function bookingProblem(candidate: Booking, data: AppData): string | null {
  if (!Number.isFinite(Date.parse(candidate.start)) || !Number.isFinite(Date.parse(candidate.end))) return "Enter valid booking times.";
  if (new Date(candidate.end) <= new Date(candidate.start)) return "End time must be after start time.";
  if (candidate.type === "lesson" && !candidate.studentId) return "A lesson needs a student.";
  if (candidate.aircraftId && candidate.type !== "maintenance") {
    const ac = data.aircraft.find((a) => a.id === candidate.aircraftId);
    if (ac && aircraftUnavailable(ac, data.maintenance)) return `${ac.reg} is grounded or has overdue maintenance.`;
  }
  for (const id of [candidate.studentId, candidate.instructorId]) {
    const u = data.users.find((x) => x.id === id);
    if (u?.status === "deleted") return `${u.name} is no longer active.`;
  }
  for (const b of data.bookings) {
    if (b.id === candidate.id || b.status === "cancelled" || !overlaps(b, candidate)) continue;
    if (candidate.aircraftId && b.aircraftId === candidate.aircraftId) return "Aircraft is already booked at that time.";
    if (candidate.instructorId && b.instructorId === candidate.instructorId) return "Instructor is already booked at that time.";
    if (candidate.studentId && b.studentId === candidate.studentId) return "Student is already booked at that time.";
  }
  return null;
}

export const bookingApproved = (b: Booking) => (b.approvalStatus ?? "approved") === "approved";
export const bookingPending = (b: Booking) => b.approvalStatus === "pending" && b.status === "scheduled";

export function prepareBooking(candidate: Booking, actor: User, data: AppData, now = new Date()): Booking | string {
  const previous = data.bookings.find((b) => b.id === candidate.id);
  if (!can.bookFor(actor, candidate.studentId)) return "You cannot book for this member.";
  if (actor.role === "student" && candidate.type === "maintenance") return "Students cannot book maintenance.";
  if (previous?.status === "completed" || previous?.status === "cancelled") return "This booking is no longer editable.";
  if (!candidate.aircraftId) return "Choose an aircraft.";
  const problem = bookingProblem(candidate, data);
  if (problem && candidate.status !== "cancelled") return problem;
  const changed = previous && ["start", "end", "type", "aircraftId", "studentId", "instructorId", "lessonId", "route", "notes"].some((key) => candidate[key as keyof Booking] !== previous[key as keyof Booking]);
  const rerequest = actor.role === "student" && changed && candidate.status === "scheduled";
  return { ...candidate,
    approvalStatus: rerequest ? "pending" : previous?.approvalStatus ?? (actor.role === "student" ? "pending" : "approved"),
    requestedBy: previous?.requestedBy ?? actor.id,
    requestedAt: rerequest ? now.toISOString() : previous?.requestedAt ?? now.toISOString(),
    reviewedBy: rerequest ? undefined : previous?.reviewedBy, reviewedAt: rerequest ? undefined : previous?.reviewedAt, decisionNotes: rerequest ? undefined : previous?.decisionNotes,
  };
}

export function reviewBooking(data: AppData, id: string, actor: User, decision: "approved" | "declined", notes = "", now = new Date()): Booking | string {
  if (actor.role !== "admin") return "Only administrators can review student bookings.";
  const b = data.bookings.find((x) => x.id === id);
  if (!b || !bookingPending(b)) return "Booking already reviewed or cancelled.";
  if (decision === "approved") { const problem = bookingProblem(b, data); if (problem) return problem; }
  return { ...b, approvalStatus: decision, status: decision === "declined" ? "cancelled" : "scheduled", reviewedBy: actor.id, reviewedAt: now.toISOString(), decisionNotes: notes.trim() };
}

export type MxState = "ok" | "soon" | "overdue" | "done";

export function maintenanceState(item: MaintenanceItem, ac: Aircraft, now = new Date()): MxState {
  if (item.completedAt) return "done";
  let state: MxState = "ok";
  if (item.dueHours !== undefined) {
    const left = item.dueHours - ac.totalHours;
    if (left <= 0) return "overdue";
    if (left <= 10) state = "soon";
  }
  if (item.dueDate) {
    const days = (new Date(item.dueDate).getTime() - now.getTime()) / 86400000;
    if (days < 0) return "overdue";
    if (days <= 14) state = "soon";
  }
  return state;
}

export function aircraftUnavailable(ac: Aircraft, mx: MaintenanceItem[]): boolean {
  return ac.grounded || mx.some((m) => m.aircraftId === ac.id && maintenanceState(m, ac) === "overdue");
}

/** Hours remaining until the next hour-based inspection, or null if none scheduled. */
export function hoursToService(ac: Aircraft, mx: MaintenanceItem[]): number | null {
  const due = mx.filter((m) => m.aircraftId === ac.id && !m.completedAt && m.dueHours !== undefined).map((m) => m.dueHours! - ac.totalHours);
  return due.length ? Math.round(Math.min(...due) * 10) / 10 : null;
}

export function studentProgress(studentId: string, data: AppData) {
  const student = data.users.find((u) => u.id === studentId);
  const program = data.programs.find((p) => p.id === student?.programId);
  const done = new Set(data.completions.filter((c) => c.studentId === studentId).map((c) => c.lessonId));
  const total = program?.lessons.length ?? 0;
  const completed = program ? program.lessons.filter((l) => done.has(l.id)).length : 0;
  const minutes = data.flights.filter((f) => f.pilotId === studentId).reduce((s, f) => s + f.minutes, 0);
  const next = program?.lessons.find((l) => !done.has(l.id));
  return { program, done, total, completed, pct: total ? Math.round((completed / total) * 100) : 0, minutes, next };
}

export function flightKind(f: { kind?: string | undefined; instructorId?: string | undefined }) {
  return f.kind ?? (f.instructorId ? "dual" : "solo");
}

export function hoursBreakdown(pilotId: string, data: AppData, now = new Date()) {
  const fl = data.flights.filter((f) => f.pilotId === pilotId);
  const sum = (pred: (f: (typeof fl)[number]) => boolean) => fl.filter(pred).reduce((s, f) => s + f.minutes, 0);
  const since90 = new Date(now.getTime() - 90 * 86400000);
  return {
    total: sum(() => true),
    dual: sum((f) => flightKind(f) === "dual"),
    solo: sum((f) => flightKind(f) === "solo"),
    sim: sum((f) => flightKind(f) === "sim"),
    ifr: fl.reduce((s, f) => s + (f.ifrMinutes ?? 0), 0),
    landings: fl.reduce((s, f) => s + f.landings, 0),
    nightLandings: fl.reduce((s, f) => s + (f.nightLandings ?? 0), 0),
    landings90: fl.filter((f) => new Date(f.date) >= since90 && flightKind(f) !== "sim").reduce((s, f) => s + f.landings, 0),
  };
}

export type ExpiryState = "ok" | "soon" | "expired" | "none";
export function expiryState(date?: string, now = new Date(), warnDays = 60): { state: ExpiryState; days: number } {
  if (!date) return { state: "none", days: 0 };
  const days = Math.ceil((new Date(date).getTime() - now.getTime()) / 86400000);
  return { state: days < 0 ? "expired" : days <= warnDays ? "soon" : "ok", days };
}

export const PASS_MARK = 75;

export function theoryProgress(studentId: string, data: AppData) {
  const results = data.exams.filter((e) => e.studentId === studentId);
  const best = new Map<string, (typeof results)[number]>();
  for (const r of results) {
    const prev = best.get(r.subjectId);
    if (!prev || r.score > prev.score) best.set(r.subjectId, r);
  }
  const passed = data.subjects.filter((s) => best.get(s.id)?.passed).length;
  const total = data.subjects.length;
  return { best, passed, total, pct: total ? Math.round((passed / total) * 100) : 0 };
}

export const FTL = { flightMin: 8 * 60, dutyMin: 10 * 60, restMin: 12 * 60 };

export function ftlStatus(instructorId: string, data: AppData, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const flightMin = data.flights.filter((f) => f.instructorId === instructorId && f.date === today).reduce((s, f) => s + f.minutes, 0);
  const logs = data.duty.filter((d) => d.instructorId === instructorId && d.start.slice(0, 10) === today);
  const dutyMin = Math.round(logs.reduce((s, d) => s + ((d.end ? new Date(d.end) : now).getTime() - new Date(d.start).getTime()), 0) / 60000);
  const open = data.duty.find((d) => d.instructorId === instructorId && !d.end);
  return {
    flightMin,
    dutyMin,
    open,
    flightLeft: Math.max(0, FTL.flightMin - flightMin),
    dutyLeft: Math.max(0, FTL.dutyMin - dutyMin),
    exceeded: flightMin > FTL.flightMin || dutyMin > FTL.dutyMin,
  };
}

/** Approve or decline a reschedule request. Returns new data or an error message. */
export function reviewRequest(
  data: AppData,
  requestId: string,
  reviewer: User,
  decision: "approved" | "declined",
  notes = "",
  now = new Date(),
): AppData | string {
  const req = data.requests.find((r) => r.id === requestId);
  if (!req) return "Request not found.";
  if (req.status !== "pending") return "Request was already reviewed.";
  if (reviewer.role !== "admin" && !(reviewer.role === "instructor" && req.instructorId === reviewer.id))
    return "Only the assigned instructor or an administrator can review this request.";
  let bookings = data.bookings;
  if (decision === "approved") {
    const booking = data.bookings.find((b) => b.id === req.bookingId);
    if (!booking) return "Booking no longer exists.";
    const moved = { ...booking, start: req.proposedStart, end: req.proposedEnd };
    const problem = bookingProblem(moved, data);
    if (problem) return `Cannot move booking: ${problem}`;
    bookings = data.bookings.map((b) => (b.id === moved.id ? moved : b));
  }
  return {
    ...data,
    bookings,
    requests: data.requests.map((r) =>
      r.id === requestId ? { ...r, status: decision, reviewerId: reviewer.id, notes, reviewedAt: now.toISOString() } : r,
    ),
  };
}

export function softDeleteUser(data: AppData, userId: string, admin: User, now = new Date()): AppData | string {
  if (admin.role !== "admin") return "Only administrators can delete users.";
  if (userId === admin.id) return "You cannot delete your own account.";
  const u = data.users.find((x) => x.id === userId);
  if (!u) return "User not found.";
  if (u.status === "deleted") return "User is already deleted.";
  return {
    ...data,
    users: data.users.map((x) =>
      x.id === userId
        ? { ...x, status: "deleted", deletedBy: admin.id, deletedAt: now.toISOString(), statusReason: `Soft-deleted by Admin ${admin.name}` }
        : x,
    ),
    bookings: data.bookings.map((b) =>
      b.status === "scheduled" && new Date(b.start) > now && (b.studentId === userId || b.instructorId === userId)
        ? { ...b, status: "cancelled" }
        : b,
    ),
  };
}

export function restoreUser(data: AppData, userId: string, admin: User): AppData | string {
  if (admin.role !== "admin") return "Only administrators can restore users.";
  return {
    ...data,
    users: data.users.map((x) =>
      x.id === userId ? { ...x, status: "active", deletedBy: undefined, deletedAt: undefined, statusReason: undefined } : x,
    ),
  };
}

export const can = {
  manageUsers: (r: Role) => r === "admin",
  manageFleet: (r: Role) => r === "admin",
  groundAircraft: (r: Role) => r === "admin" || r === "instructor",
  managePrograms: (r: Role) => r === "admin",
  signOff: (r: Role) => r === "admin" || r === "instructor",
  logFlight: (r: Role) => r === "admin" || r === "instructor",
  manageLectures: (r: Role) => r === "admin" || r === "ground",
  bookFor: (me: User, studentId?: string) => me.role === "admin" || me.role === "instructor" || (me.role === "student" && studentId === me.id),
  book: (r: Role) => r !== "ground",
};

export const homeFor: Record<Role, string> = {
  admin: "/portal/admin",
  instructor: "/portal/cfi",
  ground: "/portal/ground",
  student: "/portal/student",
};

const access: Record<Role, string[]> = {
  admin: ["*"],
  instructor: ["/dashboard", "/learning", "/profile", "/portal/cfi", "/schedule", "/flights", "/people", "/training", "/fleet"],
  ground: ["/dashboard", "/learning", "/profile", "/portal/ground", "/people", "/training", "/fleet"],
  student: ["/dashboard", "/learning", "/profile", "/portal/student", "/schedule", "/flights", "/training", "/fleet", "/people/"],
};

/** Route-level RBAC. "/people/" prefix grants detail pages only (students see their own). */
export function canAccess(role: Role, path: string): boolean {
  const allowed = access[role];
  if (allowed.includes("*")) return true;
  return allowed.some((p) => (p.endsWith("/") ? path.startsWith(p) : path === p || path.startsWith(p + "/")));
}

/** Flights/bookings visible to a user. */
export function visibleTo<T extends { pilotId?: string | undefined; studentId?: string | undefined; instructorId?: string | undefined }>(
  me: User,
  items: T[],
): T[] {
  if (me.role === "admin") return items;
  if (me.role === "instructor") {
    return items.filter((i) => i.instructorId === me.id);
  }
  if (me.role === "ground") return [];
  return items.filter((i) => (i.pilotId ?? i.studentId) === me.id);
}

export const PROFILE_FIELDS = {
  name: "Full name", email: "Email", phone: "Phone", callsign: "Call sign", licence: "Licence / ratings",
  speciality: "Speciality", medicalClass: "Medical class", medicalExpiry: "Medical expiry", ratingExpiry: "Rating expiry", icaoLevel: "ICAO English level",
  address: "Address", postCode: "Post code", city: "City", country: "Country", dateOfBirth: "Date of birth", gender: "Gender",
  placeOfBirth: "Place of birth", userReference: "User reference", caaRef: "CAA Ref. number",
  emergencyName: "Emergency contact name", emergencyPhone: "Emergency contact phone", emergencyRelation: "Emergency contact relation",
  publicNote: "Public note", adminNote: "Admin note", instructorNote: "Instructor note",
} as const;

export const NOTE_FIELDS = ["publicNote", "adminNote", "instructorNote"] as const;
/** Fields only staff may set or see (never shown to or edited by the student). */
export const STAFF_ONLY_FIELDS = ["adminNote", "instructorNote"] as const;
export const GENDERS = ["Female", "Male", "Other", "Prefer not to say"] as const;

const isIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;

export function profileProblem(changes: ProfileChanges, target: User, data: AppData): string | null {
  if (Object.keys(changes).some((key) => !(key in PROFILE_FIELDS))) return "This profile field cannot be edited.";
  const next = { ...target, ...changes };
  if (typeof next.name !== "string" || !next.name.trim()) return "Enter a full name.";
  if (typeof next.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) return "Enter a valid email address.";
  if (data.users.some((u) => u.id !== target.id && u.email.toLowerCase() === next.email.toLowerCase())) return "This email is already used by another member.";
  for (const key of Object.keys(PROFILE_FIELDS) as (keyof ProfileChanges)[]) {
    const value = changes[key];
    if (value === undefined) continue;
    if (key === "medicalClass") {
      if (value !== 1 && value !== 2) return "Medical class must be 1 or 2.";
    } else if (key === "icaoLevel") {
      if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 6) return "ICAO English level must be 1 to 6.";
    } else if (typeof value !== "string" || value.length > ((NOTE_FIELDS as readonly string[]).includes(key) ? 2000 : 200)) return (NOTE_FIELDS as readonly string[]).includes(key) ? "Notes must be no longer than 2000 characters." : "Profile text must be no longer than 200 characters.";
    if ((key === "medicalExpiry" || key === "ratingExpiry") && value && (typeof value !== "string" || !isIsoDate(value))) return "Enter a valid expiry date.";
    if (key === "dateOfBirth" && value && (typeof value !== "string" || !isIsoDate(value) || value > new Date().toISOString().slice(0, 10))) return "Enter a valid date of birth.";
    if (key === "gender" && value && !(GENDERS as readonly string[]).includes(String(value))) return "Choose a gender from the list.";
  }
  return null;
}

export function submitProfileRequest(data: AppData, actor: User, userId: string, input: ProfileChanges, now = new Date()): AppData | string {
  const member = data.users.find((u) => u.id === actor.id && u.status === "active");
  const target = data.users.find((u) => u.id === userId && u.status === "active");
  if (!member || !target) return "Active member not found.";
  if (member.role !== "admin" && member.id !== userId) return "You can only edit your own profile.";
  if (member.role !== "admin" && STAFF_ONLY_FIELDS.some((key) => key in input)) return "Only staff can edit admin and instructor notes.";
  const problem = profileProblem(input, target, data);
  if (problem) return problem;
  if (data.profileRequests.some((r) => r.userId === userId && r.status === "pending")) return "This profile already has a pending request.";
  const changes: ProfileChanges = {};
  const before: ProfileChanges = {};
  for (const key of Object.keys(PROFILE_FIELDS) as (keyof ProfileChanges)[]) {
    if (!(key in input)) continue;
    const value = typeof input[key] === "string" ? String(input[key]).trim() : input[key];
    if ((target[key] ?? "") === (value ?? "")) continue;
    Object.assign(changes, { [key]: value });
    Object.assign(before, { [key]: target[key] });
  }
  if (!Object.keys(changes).length) return "No profile changes to submit.";
  const approved = member.role === "admin";
  return {
    ...data,
    users: approved ? data.users.map((u) => u.id === userId ? { ...u, ...changes } : u) : data.users,
    profileRequests: [{ id: `PR-${uid()}`, userId, submittedBy: member.id, changes, before, status: approved ? "approved" : "pending", createdAt: now.toISOString(),
      ...(approved ? { reviewerId: member.id, reviewedAt: now.toISOString(), notes: "Updated by administrator" } : {}),
    }, ...data.profileRequests],
  };
}

export function reviewProfileRequest(data: AppData, requestId: string, actor: User, decision: "approved" | "declined", notes = "", now = new Date()): AppData | string {
  const member = data.users.find((u) => u.id === actor.id && u.status === "active");
  if (member?.role !== "admin") return "Only administrators can review profile changes.";
  const request = data.profileRequests.find((r) => r.id === requestId);
  if (!request) return "Profile request not found.";
  if (request.status !== "pending") return "This request has already been reviewed.";
  if (decision === "declined" && !notes.trim()) return "Add a reason for declining the request.";
  const target = data.users.find((u) => u.id === request.userId);
  if (!target) return "Member not found.";
  if (decision === "approved") {
    if (target.status !== "active") return "An archived member's profile cannot be updated.";
    const problem = profileProblem(request.changes, target, data);
    if (problem) return problem;
    if ((Object.keys(request.before) as (keyof ProfileChanges)[]).some((key) => (target[key] ?? "") !== (request.before[key] ?? ""))) return "The profile has changed since this request. Decline it and ask for a new request.";
  }
  return { ...data,
    users: decision === "approved" ? data.users.map((u) => u.id === target.id ? { ...u, ...request.changes } : u) : data.users,
    profileRequests: data.profileRequests.map((r) => r.id === requestId ? { ...r, status: decision, reviewerId: member.id, reviewedAt: now.toISOString(), notes: notes.trim() } : r),
  };
}

export function memberNotifications(data: AppData, me: User) {
  const read = data.readNotificationIds[me.id] ?? [];
  const profile = data.profileRequests.flatMap<{ id: string; title: string; detail: string; at: string; to: "/portal/admin" | "/profile"; status: string }>((r) => {
    const user = data.users.find((u) => u.id === r.userId);
    if (r.status === "pending" && me.role === "admin") return [{ id: `${r.id}:pending`, title: "Profile approval requested", detail: `${user?.name ?? "Member"} · ${Object.keys(r.changes).length} changes`, at: r.createdAt, to: "/portal/admin" as const, status: "pending" }];
    if (r.status !== "pending" && (r.userId === me.id || r.submittedBy === me.id)) return [{ id: `${r.id}:${r.status}`, title: `Profile changes ${r.status}`, detail: r.notes || (r.status === "approved" ? "Your profile has been updated." : "Your profile remains unchanged."), at: r.reviewedAt ?? r.createdAt, to: "/profile" as const, status: r.status }];
    return [];
  });
  const reschedules = data.requests.filter((r) => r.status !== "pending" && (r.studentId === me.id || r.instructorId === me.id)).map((r) => ({ id: `${r.id}:${r.status}`, title: `Reschedule ${r.status}`, detail: `${r.bookingId}${r.notes ? ` · ${r.notes}` : ""}`, at: r.reviewedAt ?? r.createdAt, to: "/schedule" as const, status: r.status }));
  const bookingRequests = me.role === "admin" ? data.bookings.filter(bookingPending).map((b) => ({ id: `${b.id}:pending:${b.requestedAt}`, title: "Booking approval requested", detail: `${data.users.find((u) => u.id === b.studentId)?.name ?? "Student"} · ${b.id} · ${format(new Date(b.start), "dd MMM HH:mm")}`, at: b.requestedAt ?? b.start, to: "/portal/admin" as const, status: "pending" })) : [];
  const outcomes = data.activity.filter((a) => ["booking_approved", "booking_declined", "booking_cancelled"].includes(a.action) && data.bookings.some((b) => b.id === a.entityId && b.studentId === me.id)).map((a) => ({ id: `booking:${a.id}`, title: a.action.replace("_", " ").replace(/^b/, "B"), detail: a.details, at: a.at, to: "/schedule" as const, status: a.action.replace("booking_", "") }));
  return [...profile, ...reschedules, ...bookingRequests, ...outcomes].map((n) => ({ ...n, read: read.includes(n.id) })).sort((a, b) => b.at.localeCompare(a.at));
}

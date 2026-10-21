/**
 * Documentation of the academy database for the admin "Database" page.
 * Describes every application table, its primary key, foreign keys and
 * which in-app activity writes to it. Keep in sync with the migrations.
 */

export type TableLink = { table: string; column: string; references: string };

export type TableDoc = {
  name: string;
  label: string;
  description: string;
  primaryKey: string;
  links: TableLink[];
};

const T = (name: string, label: string, description: string, primaryKey: string, links: TableLink[] = []): TableDoc =>
  ({ name, label, description, primaryKey, links });

export const DB_TABLES: TableDoc[] = [
  T("tenants", "Academies", "One row per flight academy. Every other table belongs to an academy through its tenant id.", "id"),
  T("profiles", "Sign-in accounts", "One row per sign-in account (email + password). Created automatically when someone signs up.", "id"),
  T("tenant_members", "Members", "People of the academy: students, instructors, staff. Holds personal details, licence, medical and notes. Links to a sign-in account by email.", "id", [
    { table: "tenant_members", column: "tenant_id", references: "tenants.id" },
    { table: "tenant_members", column: "profile_id", references: "profiles.id" },
    { table: "tenant_members", column: "program_id", references: "programs.id" },
  ]),
  T("member_roles", "Member roles", "The role of each member (admin, instructor, ground, student). Kept separate from the member record so permissions cannot be self-granted.", "id", [
    { table: "member_roles", column: "tenant_id", references: "tenants.id" },
    { table: "member_roles", column: "member_id", references: "tenant_members.id" },
  ]),
  T("aircraft", "Aircraft", "The fleet: registration, type, hourly rate, hours flown and grounded status.", "id", [
    { table: "aircraft", column: "tenant_id", references: "tenants.id" },
  ]),
  T("maintenance_items", "Maintenance items", "Service tasks per aircraft with due hours or due dates.", "id", [
    { table: "maintenance_items", column: "tenant_id", references: "tenants.id" },
    { table: "maintenance_items", column: "aircraft_id", references: "aircraft.id" },
  ]),
  T("programs", "Training programs", "Syllabi such as PPL(A) or Night Rating.", "id", [
    { table: "programs", column: "tenant_id", references: "tenants.id" },
  ]),
  T("program_lessons", "Program lessons", "The lessons inside a training program, in order.", "id", [
    { table: "program_lessons", column: "tenant_id", references: "tenants.id" },
    { table: "program_lessons", column: "program_id", references: "programs.id" },
  ]),
  T("theory_subjects", "Theory subjects", "Ground-school subjects with their codes.", "id", [
    { table: "theory_subjects", column: "tenant_id", references: "tenants.id" },
  ]),
  T("classrooms", "Classrooms", "Rooms used for lectures, with capacity.", "id", [
    { table: "classrooms", column: "tenant_id", references: "tenants.id" },
  ]),
  T("bookings", "Bookings", "The diary: flight, ground and simulator bookings. Overlaps on the same aircraft are rejected by the database.", "id", [
    { table: "bookings", column: "tenant_id", references: "tenants.id" },
    { table: "bookings", column: "aircraft_id", references: "aircraft.id" },
  ]),
  T("flights", "Flights", "The logbook: every recorded flight with times, route, landings and grade.", "id", [
    { table: "flights", column: "tenant_id", references: "tenants.id" },
    { table: "flights", column: "aircraft_id", references: "aircraft.id" },
    { table: "flights", column: "pilot_id", references: "tenant_members.id" },
  ]),
  T("completions", "Lesson completions", "Which syllabus lessons a student has finished, with grade and instructor.", "id", [
    { table: "completions", column: "tenant_id", references: "tenants.id" },
  ]),
  T("change_requests", "Reschedule requests", "Student requests to move a booking, and the instructor/admin decision.", "id", [
    { table: "change_requests", column: "tenant_id", references: "tenants.id" },
  ]),
  T("exam_results", "Exam results", "Theory exam scores per student and subject, signed by an instructor.", "id", [
    { table: "exam_results", column: "tenant_id", references: "tenants.id" },
  ]),
  T("lectures", "Lectures", "Scheduled ground-school lectures with enrolment, attendance and sign-off.", "id", [
    { table: "lectures", column: "tenant_id", references: "tenants.id" },
  ]),
  T("duty_records", "Duty records", "Instructor duty periods used for flight-time limitation checks.", "id", [
    { table: "duty_records", column: "tenant_id", references: "tenants.id" },
  ]),
  T("profile_requests", "Profile change requests", "Profile edits waiting for admin approval, with before/after values and the outcome.", "id", [
    { table: "profile_requests", column: "tenant_id", references: "tenants.id" },
  ]),
  T("learning_records", "E-Learning progress", "Per-member chapter completion, bookmarks, notes and practice answers.", "id", [
    { table: "learning_records", column: "tenant_id", references: "tenants.id" },
  ]),
  T("notification_reads", "Read notifications", "Which outcome notifications each member has already seen.", "id", [
    { table: "notification_reads", column: "tenant_id", references: "tenants.id" },
  ]),
  T("activity_feed", "Activity feed", "Append-only timeline of everything that happens, shown on dashboards and the audit log.", "id", [
    { table: "activity_feed", column: "tenant_id", references: "tenants.id" },
  ]),
  T("audit_log", "Audit log", "Automatic, tamper-proof record of every insert and update on the tables above. Written by the database itself, never by the app.", "id", [
    { table: "audit_log", column: "tenant_id", references: "tenants.id" },
  ]),
];

export type ActivityDoc = { activity: string; tables: string[]; description: string };

export const DB_ACTIVITIES: ActivityDoc[] = [
  { activity: "Create an account (sign up)", tables: ["profiles", "tenant_members"], description: "A sign-in account is created in profiles. If the email matches a member record, the member is automatically linked to that account." },
  { activity: "Add a member (admin)", tables: ["tenant_members", "member_roles", "activity_feed", "audit_log"], description: "A member row is stored, their role is stored separately in member_roles, and the action appears in the activity feed and audit log." },
  { activity: "Edit own profile", tables: ["profile_requests", "activity_feed", "audit_log"], description: "The change is stored as a pending request — the member record itself is not touched until an admin approves." },
  { activity: "Approve / decline a profile request (admin)", tables: ["profile_requests", "tenant_members", "notification_reads", "activity_feed", "audit_log"], description: "On approval the new values are written to the member record; either way the request keeps its outcome and everyone gets a notification." },
  { activity: "Create a booking", tables: ["bookings", "activity_feed", "audit_log"], description: "Student bookings are stored with approval_status pending and appear in the administrator approval queue. Aircraft, student and instructor slots are reserved while pending; conflicting requests are rejected." },
  { activity: "Approve / decline / cancel a booking", tables: ["bookings", "activity_feed", "audit_log"], description: "Only an administrator can approve a student booking. The saved booking retains the decision, reviewer, time and note; decline or cancellation releases the slot. An atomic activity record supplies the student's notification, and live subscriptions refresh the calendar and table viewer." },
  { activity: "Request a reschedule (student)", tables: ["change_requests", "activity_feed", "audit_log"], description: "The proposed new time is stored as a pending request against the original booking." },
  { activity: "Approve a reschedule (instructor/admin)", tables: ["change_requests", "bookings", "activity_feed", "audit_log"], description: "The request is marked approved and the booking itself is moved to the new time." },
  { activity: "Log a flight", tables: ["flights", "aircraft", "activity_feed", "audit_log"], description: "The flight enters the logbook and the aircraft's total hours increase by the flight time." },
  { activity: "Mark a syllabus lesson complete", tables: ["completions", "activity_feed", "audit_log"], description: "A completion row records the lesson, date, grade and instructor for that student." },
  { activity: "Record an exam result", tables: ["exam_results", "activity_feed", "audit_log"], description: "The score, pass/fail and signing instructor are stored per student and subject." },
  { activity: "Schedule a lecture", tables: ["lectures", "activity_feed", "audit_log"], description: "The lecture is stored with its room and enrolment; the database rejects double-booked rooms." },
  { activity: "Take attendance / sign off a lecture", tables: ["lectures", "audit_log"], description: "The attended list and sign-off flag are updated on the lecture row." },
  { activity: "Start / end instructor duty", tables: ["duty_records", "activity_feed", "audit_log"], description: "A duty period is opened, then closed with an end time; used for flight-time limitation checks." },
  { activity: "Add aircraft / maintenance item", tables: ["aircraft", "maintenance_items", "activity_feed", "audit_log"], description: "Fleet rows and their service tasks are stored per aircraft." },
  { activity: "Complete maintenance", tables: ["maintenance_items", "aircraft", "activity_feed", "audit_log"], description: "The item is marked done and a grounded aircraft can return to service." },
  { activity: "E-Learning: finish chapter, bookmark, notes, practice", tables: ["learning_records", "activity_feed", "audit_log"], description: "One row per member per chapter holds completion, bookmark, notes and answers." },
  { activity: "Read a notification", tables: ["notification_reads"], description: "A small row remembers that this member has seen that notification." },
  { activity: "Remove any record", tables: ["(same table)", "audit_log"], description: "Records are never truly deleted — they are archived with a timestamp so history survives for regulatory audits." },
];

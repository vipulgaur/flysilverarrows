/**
 * Bridge between the in-app data shape (AppData) and the database tables.
 * Pure functions only, so the mapping and change detection are testable.
 */
import type { AppData, Lesson, Program, Role, User } from "@/lib/types";

export type Row = Record<string, unknown> & { id: string; tenant_id: string };
export type Tables = Record<TableName, Row[]>;

interface TableSpec {
  /** Columns written by the app (snake_case). `id` and `tenant_id` are implicit. */
  columns: string[];
  /** App field -> column renames where the camel→snake rule would hit a reserved word. */
  rename?: Record<string, string>;
  /** Rows are never updated or archived by the app (append-only records). */
  appendOnly?: boolean;
}

const s = (...cols: string[]) => cols;

export const TABLES = {
  tenant_members: { columns: s("name", "email", "phone", "photo_url", "callsign", "program_id", "instructor_id", "licence", "stage", "speciality", "medical_class", "medical_expiry", "rating_expiry", "icao_level", "prior_minutes", "status", "deleted_by", "deleted_at", "status_reason", "address", "post_code", "city", "country", "date_of_birth", "gender", "place_of_birth", "user_reference", "caa_ref", "emergency_name", "emergency_phone", "emergency_relation", "public_note", "admin_note", "instructor_note") },
  member_roles: { columns: s("member_id", "role") },
  aircraft: { columns: s("reg", "type", "hourly_rate", "total_hours", "tach_hours", "last_service", "grounded") },
  maintenance_items: { columns: s("aircraft_id", "title", "due_hours", "due_date", "interval_hours", "completed_at") },
  programs: { columns: s("name") },
  program_lessons: { columns: s("program_id", "name", "kind", "minutes", "position") },
  theory_subjects: { columns: s("code", "name") },
  classrooms: { columns: s("name", "capacity") },
  bookings: { columns: s("starts_at", "ends_at", "type", "status", "aircraft_id", "instructor_id", "student_id", "lesson_id", "route", "notes", "approval_status", "requested_by", "requested_at", "reviewed_by", "reviewed_at", "decision_notes"), rename: { start: "starts_at", end: "ends_at" } },
  flights: { columns: s("date", "off_block", "on_block", "minutes", "kind", "ifr_minutes", "night_landings", "tach_start", "tach_end", "aircraft_id", "pilot_id", "instructor_id", "lesson_id", "booking_id", "landings", "from_icao", "to_icao", "grade", "remarks"), rename: { from: "from_icao", to: "to_icao" } },
  completions: { columns: s("student_id", "lesson_id", "date", "instructor_id", "grade", "flight_id") },
  change_requests: { columns: s("booking_id", "student_id", "instructor_id", "reason", "details", "proposed_start", "proposed_end", "status", "reviewer_id", "notes", "reviewed_at", "created_at") },
  exam_results: { columns: s("student_id", "subject_id", "score", "passed", "signed_by", "date") },
  lectures: { columns: s("subject_id", "title", "starts_at", "ends_at", "room_id", "instructor_id", "enrolled", "attended", "signed_off"), rename: { start: "starts_at", end: "ends_at" } },
  duty_records: { columns: s("instructor_id", "starts_at", "ends_at"), rename: { start: "starts_at", end: "ends_at" } },
  profile_requests: { columns: s("user_id", "submitted_by", "changes", "before_values", "status", "created_at", "reviewed_at", "reviewer_id", "notes"), rename: { before: "before_values" } },
  learning_records: { columns: s("user_id", "chapter_id", "completed", "bookmarked", "notes", "answers") },
  notification_reads: { columns: s("member_id", "notification_id") },
  activity_feed: { columns: s("occurred_at", "actor_id", "actor_name", "actor_role", "action", "entity_type", "entity_id", "details"), rename: { at: "occurred_at" }, appendOnly: true },
} satisfies Record<string, TableSpec>;

export type TableName = keyof typeof TABLES;
/** Write order respects foreign keys; archiving runs in reverse. */
export const TABLE_ORDER = Object.keys(TABLES) as TableName[];

const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)$/;

function encode(table: TableName, obj: object, tenantId: string, extra: Record<string, unknown> = {}): Row {
  const spec: TableSpec = TABLES[table];
  const row: Record<string, unknown> = { tenant_id: tenantId };
  const src = { ...obj, ...extra } as Record<string, unknown>;
  for (const col of ["id", ...spec.columns]) row[col] = null;
  for (const [k, v] of Object.entries(src)) {
    const col = spec.rename?.[k] ?? toSnake(k);
    if (col === "id" || spec.columns.includes(col)) row[col] = v === undefined ? null : v;
  }
  return row as Row;
}

function decode(table: TableName, row: Record<string, unknown>): Record<string, unknown> {
  const spec: TableSpec = TABLES[table];
  const back = Object.fromEntries(Object.entries(spec.rename ?? {}).map(([a, b]) => [b, a]));
  const out: Record<string, unknown> = {};
  for (const col of ["id", ...spec.columns]) {
    let v = row[col];
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && ISO_TS.test(v)) v = new Date(v).toISOString();
    if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) && /hours|rate|score|tach/.test(col)) v = Number(v);
    out[back[col] ?? toCamel(col)] = v;
  }
  return out;
}

export function toTables(d: AppData, tenantId: string): Tables {
  const t = Object.fromEntries(TABLE_ORDER.map((n) => [n, [] as Row[]])) as unknown as Tables;
  for (const u of d.users) {
    const { role, ...rest } = u;
    t.tenant_members.push(encode("tenant_members", rest, tenantId));
    t.member_roles.push(encode("member_roles", { id: u.id, memberId: u.id, role }, tenantId));
  }
  for (const p of d.programs) {
    t.programs.push(encode("programs", { id: p.id, name: p.name }, tenantId));
    p.lessons.forEach((l, i) => t.program_lessons.push(encode("program_lessons", { ...l, programId: p.id, position: i }, tenantId)));
  }
  const simple: [TableName, object[]][] = [
    ["aircraft", d.aircraft], ["maintenance_items", d.maintenance], ["theory_subjects", d.subjects], ["classrooms", d.classrooms],
    ["bookings", d.bookings], ["flights", d.flights], ["completions", d.completions], ["change_requests", d.requests],
    ["exam_results", d.exams], ["lectures", d.lectures], ["duty_records", d.duty], ["profile_requests", d.profileRequests],
    ["activity_feed", d.activity],
  ];
  for (const [name, list] of simple) for (const o of list) t[name].push(encode(name, o, tenantId, name === "bookings" ? { approvalStatus: (o as AppData["bookings"][number]).approvalStatus ?? "approved" } : {}));
  for (const r of d.learningRecords) t.learning_records.push(encode("learning_records", r, tenantId, { id: `${r.userId}:${r.chapterId}` }));
  for (const [memberId, ids] of Object.entries(d.readNotificationIds))
    for (const n of ids) t.notification_reads.push(encode("notification_reads", { memberId, notificationId: n }, tenantId, { id: `${memberId}:${n}` }));
  return t;
}

export function fromTables(t: Partial<Record<TableName, Record<string, unknown>[]>>): AppData {
  const list = <T>(n: TableName) => (t[n] ?? []).map((r) => decode(n, r) as T);
  const roles = new Map(list<{ memberId: string; role: Role }>("member_roles").map((r) => [r.memberId, r.role]));
  const lessons = list<Lesson & { programId: string; position?: number }>("program_lessons").sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const reads: Record<string, string[]> = {};
  for (const r of list<{ memberId: string; notificationId: string }>("notification_reads")) (reads[r.memberId] ??= []).push(r.notificationId);
  return {
    users: list<Omit<User, "role">>("tenant_members").map((u) => ({ ...u, role: roles.get(u.id) ?? "student" }) as User),
    programs: list<Omit<Program, "lessons">>("programs").map((p) => ({
      ...p,
      lessons: lessons.filter((l) => l.programId === p.id).map(({ programId: _p, position: _i, ...l }) => l as Lesson),
    })),
    aircraft: list("aircraft"), maintenance: list("maintenance_items"), subjects: list("theory_subjects"), classrooms: list("classrooms"),
    bookings: list("bookings"), flights: list("flights"), completions: list("completions"), requests: list("change_requests"),
    exams: list("exam_results"), lectures: list("lectures"), duty: list("duty_records"), profileRequests: list("profile_requests"),
    activity: list<AppData["activity"][number]>("activity_feed").sort((a, b) => b.at.localeCompare(a.at)),
    learningRecords: list<AppData["learningRecords"][number]>("learning_records").map((r) => ({ ...r, answers: r.answers ?? {} })),
    readNotificationIds: reads,
  };
}

export interface Changes { upserts: Partial<Record<TableName, Row[]>>; archives: Partial<Record<TableName, string[]>> }

/** Rows that differ from the last synced snapshot. Missing rows are archived, never hard-deleted. */
export function diffTables(prev: Tables, next: Tables): Changes {
  const out: Changes = { upserts: {}, archives: {} };
  for (const n of TABLE_ORDER) {
    const before = new Map(prev[n].map((r) => [r.id, JSON.stringify(r)]));
    const after = new Set(next[n].map((r) => r.id));
    const ups = next[n].filter((r) => (TABLES[n] as TableSpec).appendOnly ? !before.has(r.id) : before.get(r.id) !== JSON.stringify(r));
    const gone = (TABLES[n] as TableSpec).appendOnly ? [] : [...before.keys()].filter((id) => !after.has(id));
    if (ups.length) out.upserts[n] = ups;
    if (gone.length) out.archives[n] = gone;
  }
  return out;
}

export const hasChanges = (c: Changes) => Object.keys(c.upserts).length > 0 || Object.keys(c.archives).length > 0;

/** Rebase local dirty rows over fresh remote rows, retaining edits made during a read. */
export function mergePending(remote: Tables, pending: Changes): Tables {
  return Object.fromEntries(TABLE_ORDER.map((name) => {
    const archived = new Set(pending.archives[name] ?? []);
    const rows = new Map(remote[name].filter((r) => !archived.has(r.id)).map((r) => [r.id, r]));
    for (const row of pending.upserts[name] ?? []) rows.set(row.id, row);
    return [name, [...rows.values()]];
  })) as Tables;
}

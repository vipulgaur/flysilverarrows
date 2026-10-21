/** Reads and writes the academy's records in Lovable Cloud. Row-level security decides what each member may see or change. */
import { supabase } from "@/integrations/supabase/client";
import type { AppData } from "@/lib/types";
import { TABLE_ORDER, fromTables, toTables, type Changes, type TableName } from "./mapping";

// Generated table types are strict; this layer writes rows already shaped by the mapping module.
const db = supabase as unknown as { from: (t: string) => any };

export interface Loaded { data: AppData; tenantId: string; meId: string }

export async function loadAcademy(userId: string): Promise<Loaded | null> {
  const { data: membership, error } = await db.from("tenant_members")
    .select("tenant_id, id").eq("profile_id", userId).eq("status", "active").is("archived_at", null).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!membership) return null;
  const tenantId = membership.tenant_id as string;
  const results = await Promise.all(TABLE_ORDER.map(async (t) => {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from(t).select("*").eq("tenant_id", tenantId).is("archived_at", null).range(from, from + 999);
      if (error) throw new Error(`${t}: ${error.message}`);
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return [t, rows] as const;
  }));
  return { data: fromTables(Object.fromEntries(results) as Record<TableName, Record<string, unknown>[]>), tenantId, meId: membership.id as string };
}

/** Archive removed rows first (frees booking slots), then upsert in foreign-key order. */
export async function pushChanges(c: Changes, tenantId: string): Promise<void> {
  for (const t of [...TABLE_ORDER].reverse()) {
    const ids = c.archives[t];
    if (!ids?.length) continue;
    const { error } = await db.from(t).update({ archived_at: new Date().toISOString() }).eq("tenant_id", tenantId).in("id", ids);
    if (error) throw new Error(friendly(error));
  }
  for (const t of TABLE_ORDER) {
    const rows = c.upserts[t];
    if (!rows?.length) continue;
    const payload: Record<string, unknown>[] = rows.map((r) => ({ ...r, archived_at: null }));
    if (t === "bookings") {
      for (const row of payload) {
        const { requested_at: _requestedAt, requested_by: _requestedBy, ...updateRow } = row;
        const { error } = await db.from(t).update(updateRow).eq("tenant_id", tenantId).eq("id", row['id']);
        if (error) throw new Error(friendly(error));
      }
      continue;
    }
    const { error } = t === "activity_feed"
      ? await db.from(t).upsert(payload, { onConflict: "tenant_id,id", ignoreDuplicates: true })
      : await db.from(t).upsert(payload, { onConflict: "tenant_id,id" });
    if (error) throw new Error(friendly(error));
  }
}

/** Save a single booking and return the canonical row after database approval guards. */
export async function persistBooking(booking: AppData["bookings"][number], tenantId: string, data: AppData) {
  const row = toTables({ ...data, bookings: [booking] }, tenantId).bookings[0];
  if (!row) throw new Error("Booking not found.");
  const exists = data.bookings.some((b) => b.id === booking.id);
  // Student edits retain protected metadata in the submitted row; the trigger resets it to pending.
  const previous = data.bookings.find((b) => b.id === booking.id);
  const safeRow = previous ? { ...row, requested_by: previous.requestedBy ?? null, requested_at: previous.requestedAt ?? null } : row;
  if (previous && data.users.find((u) => u.id === booking.requestedBy)?.role === "student" && booking.approvalStatus === "pending" && previous.approvalStatus !== "pending" && !booking.reviewedBy) {
    safeRow['approval_status'] = previous.approvalStatus;
    safeRow['reviewed_by'] = previous.reviewedBy ?? null;
    safeRow['reviewed_at'] = previous.reviewedAt ?? null;
    safeRow['decision_notes'] = previous.decisionNotes ?? null;
  }
  const { requested_at: _requestedAt, requested_by: _requestedBy, ...updateRow } = safeRow;
  if (previous && safeRow['approval_status'] === previous.approvalStatus) {
    delete updateRow['reviewed_at'];
    delete updateRow['reviewed_by'];
    delete updateRow['decision_notes'];
  }
  const query = exists
    ? db.from("bookings").update({ ...updateRow, archived_at: null }).eq("tenant_id", tenantId).eq("id", booking.id)
    : db.from("bookings").insert({ ...row, archived_at: null });
  const { data: saved, error } = await query.select("*").single();
  if (error) throw new Error(friendly(error));
  return fromTables({ bookings: [saved] }).bookings[0];
}

function friendly(e: { message: string; details?: string | null; code?: string }) {
  if (e.code === "23P01") return "That time slot is already taken for this aircraft, instructor, student or room.";
  if (e.code === "42501") return "You don't have permission to make that change.";
  if (e.code === "23505") return "That record already exists (duplicate email, registration or open duty period).";
  if (e.code === "23514") return "Some values are outside the allowed range.";
  return e.details || e.message;
}

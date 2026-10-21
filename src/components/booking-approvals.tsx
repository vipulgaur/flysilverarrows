import { useState } from "react";
import { format } from "date-fns";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bookingPending, reviewBooking } from "@/lib/logic";
import { useLookup, useMe } from "@/lib/store";

export function BookingApprovals() {
  const { data, me, saveBooking } = useMe();
  const lookup = useLookup();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  if (me.role !== "admin") return null;
  const pending = data.bookings.filter(bookingPending).sort((a, b) => (a.requestedAt ?? a.start).localeCompare(b.requestedAt ?? b.start));
  async function decide(id: string, decision: "approved" | "declined") {
    const result = reviewBooking(data, id, me, decision, notes[id]);
    if (typeof result === "string") return void toast.error(result);
    setBusy(id);
    try { await saveBooking(result); toast.success(decision === "approved" ? "Booking approved — student notified" : "Booking declined — student notified"); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }
  return (
    <section className="my-6" aria-label="Student booking approvals">
      <div className="mb-3 flex items-center justify-between border-b pb-3"><h2 className="text-lg font-semibold">Student booking approvals ({pending.length})</h2></div>
      {!pending.length ? <p className="text-sm text-muted-foreground">No bookings awaiting approval.</p> : <div className="divide-y">
        {pending.map((b) => <div key={b.id} className="flex flex-wrap items-center gap-3 py-4" data-booking-id={b.id}>
          <div className="min-w-0 flex-1 basis-64 text-sm">
            <p className="font-semibold">{lookup.user(b.studentId)?.name} · {lookup.aircraft(b.aircraftId)?.reg}</p>
            <p>{format(new Date(b.start), "EEE d MMM yyyy HH:mm")}–{format(new Date(b.end), "HH:mm")} · {b.type === "lesson" ? "Dual lesson" : "Solo flight"}</p>
            <p className="text-muted-foreground">{b.id} · {lookup.user(b.instructorId)?.name ?? "No instructor"}{b.route ? ` · ${b.route}` : ""}</p>
            {b.notes && <p className="break-words text-muted-foreground">{b.notes}</p>}
          </div>
          <Input className="w-56" aria-label={`Note for booking ${b.id}`} placeholder="Note to student" value={notes[b.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [b.id]: e.target.value }))} />
          <Button size="sm" disabled={busy !== null} onClick={() => void decide(b.id, "approved")}><Check className="h-4 w-4" /> Approve</Button>
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void decide(b.id, "declined")}><X className="h-4 w-4" /> Decline</Button>
        </div>)}
      </div>}
    </section>
  );
}
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/app-ui";
import { useMe } from "@/lib/store";
import { activeUsers, bookingApproved, prepareBooking, can, uid } from "@/lib/logic";
import type { Booking, BookingType } from "@/lib/types";

export function BookingDialog({
  open,
  onOpenChange,
  initial,
  onLogFlight,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Partial<Booking>;
  onLogFlight?: (b: Booking) => void;
}) {
  const { data, me, saveBooking } = useMe();
  const [busy, setBusy] = useState(false);
  const [b, setB] = useState<Partial<Booking>>(initial);
  const [date, setDate] = useState("");
  const [t1, setT1] = useState("09:00");
  const [t2, setT2] = useState("11:00");

  useEffect(() => {
    if (!open) return;
    const s = initial.start ? new Date(initial.start) : new Date();
    const e = initial.end ? new Date(initial.end) : new Date(s.getTime() + 2 * 3600000);
    setB({
      type: "lesson",
      status: "scheduled",
      ...(me.role === "student" ? { studentId: me.id } : {}),
      ...(me.role === "instructor" ? { instructorId: me.id } : {}),
      ...initial,
    });
    setDate(format(s, "yyyy-MM-dd"));
    setT1(format(s, "HH:mm"));
    setT2(format(e, "HH:mm"));
  }, [open, initial, me.id, me.role]);

  const isNew = !initial.id;
  const editable = can.bookFor(me, b.studentId) && b.status !== "completed" && b.status !== "cancelled" && !(me.role === "instructor" && b.approvalStatus === "pending");
  const students = activeUsers(data, "student");
  const instructors = activeUsers(data, "instructor");
  const student = data.users.find((u) => u.id === b.studentId);
  const lessons = data.programs.find((p) => p.id === student?.programId)?.lessons ?? [];
  const set = (k: keyof Booking) => (e: { target: { value: string } }) =>
    setB((x) => ({ ...x, [k]: e.target.value || undefined }));

  async function save() {
    if (!date || !t1 || !t2) return void toast.error("Enter date and times.");
    const candidate: Booking = {
      id: b.id ?? uid(),
      type: (b.type ?? "lesson") as BookingType,
      status: b.status ?? "scheduled",
      start: new Date(`${date}T${t1}`).toISOString(),
      end: new Date(`${date}T${t2}`).toISOString(),
      aircraftId: b.aircraftId,
      instructorId: b.type === "lesson" ? b.instructorId : undefined,
      studentId: b.type === "maintenance" ? undefined : b.studentId,
      lessonId: b.type === "lesson" ? b.lessonId : undefined,
      route: b.route,
      notes: b.notes,
    };
    const prepared = prepareBooking(candidate, me, data);
    if (typeof prepared === "string") return void toast.error(prepared);
    setBusy(true);
    try {
      await saveBooking(prepared);
      toast.success(me.role === "student" ? "Booking sent for administrator approval" : isNew ? "Booking created" : "Booking updated");
      onOpenChange(false);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  async function cancelBooking() {
    if (!b.id) return;
    const current = data.bookings.find((x) => x.id === b.id);
    if (!current) return;
    setBusy(true);
    try { await saveBooking({ ...current, status: "cancelled" }); toast.success("Booking cancelled"); onOpenChange(false); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? "New booking" : "Booking details"}</DialogTitle>
        </DialogHeader>
        <fieldset disabled={!editable || busy} className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <NativeSelect value={b.type} onChange={set("type")}>
              <option value="lesson">Dual lesson</option>
              <option value="solo">Solo flight</option>
              {me.role !== "student" && <option value="maintenance">Maintenance</option>}
            </NativeSelect>
          </Field>
          <Field label="Aircraft">
            <NativeSelect value={b.aircraftId ?? ""} onChange={set("aircraftId")}>
              <option value="">Select…</option>
              {data.aircraft.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.reg} · {a.type}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="From">
              <Input type="time" value={t1} onChange={(e) => setT1(e.target.value)} />
            </Field>
            <Field label="To">
              <Input type="time" value={t2} onChange={(e) => setT2(e.target.value)} />
            </Field>
          </div>
          {b.type !== "maintenance" && (
            <Field label="Student">
              <NativeSelect value={b.studentId ?? ""} onChange={set("studentId")} disabled={me.role === "student"}>
                <option value="">Select…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          {b.type === "lesson" && (
            <>
              <Field label="Instructor">
                <NativeSelect value={b.instructorId ?? ""} onChange={set("instructorId")}>
                  <option value="">Select…</option>
                  {instructors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Lesson" className="col-span-2">
                <NativeSelect value={b.lessonId ?? ""} onChange={set("lessonId")}>
                  <option value="">—</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </>
          )}
          {b.type !== "maintenance" && (
            <Field label="Route" className="col-span-2">
              <Input value={b.route ?? ""} onChange={set("route")} placeholder="EKAH → EKAH" />
            </Field>
          )}
          <Field label="Notes" className="col-span-2">
            <Textarea value={b.notes ?? ""} onChange={set("notes")} rows={2} />
          </Field>
        </fieldset>
        {b.approvalStatus === "pending" && b.status === "scheduled" && <p className="text-sm text-warning-foreground">Awaiting administrator approval</p>}
        {b.decisionNotes && <p className="text-sm text-muted-foreground">Administrator: {b.decisionNotes}</p>}
        {b.status && b.status !== "scheduled" && (
          <p className="text-sm text-muted-foreground">
            Status: <span className="font-medium capitalize">{b.status}</span>
          </p>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            {!isNew && editable && b.status === "scheduled" && (
              <Button variant="outline" disabled={busy} onClick={() => void cancelBooking()}>
                Cancel booking
              </Button>
            )}
            {!isNew && b.status === "scheduled" && bookingApproved(b as Booking) && b.type !== "maintenance" && can.logFlight(me.role) && onLogFlight && (
              <Button variant="secondary" onClick={() => onLogFlight(b as Booking)}>
                Log flight
              </Button>
            )}
          </div>
          {editable && b.status !== "cancelled" && <Button disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : me.role === "student" ? "Request approval" : "Save"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/app-ui";
import { useMe } from "@/lib/store";
import { activeUsers, blockMinutes, fmtHours, uid } from "@/lib/logic";
import type { Flight } from "@/lib/types";

export function FlightDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Partial<Flight>;
}) {
  const { data, me, saveFlight, log, update } = useMe();
  const [f, setF] = useState<Partial<Flight>>({});

  useEffect(() => {
    if (open)
      setF({
        date: format(new Date(), "yyyy-MM-dd"),
        offBlock: "09:00",
        onBlock: "10:00",
        landings: 1,
        from: "EKAH",
        to: "EKAH",
        ...(me.role === "instructor" ? { instructorId: me.id } : {}),
        ...initial,
      });
  }, [open, initial, me]);

  const set = (k: keyof Flight) => (e: { target: { value: string } }) =>
    setF((x) => ({ ...x, [k]: e.target.value || undefined }));
  const minutes = blockMinutes(f.offBlock ?? "", f.onBlock ?? "");
  const pilot = data.users.find((u) => u.id === f.pilotId);
  const lessons = data.programs.find((p) => p.id === pilot?.programId)?.lessons ?? [];

  function save() {
    if (!f.aircraftId || !f.pilotId || !f.date) return void toast.error("Date, aircraft and pilot are required.");
    if (minutes <= 0) return void toast.error("Block times are invalid.");
    const flight: Flight = {
      id: f.id ?? uid(),
      date: f.date,
      offBlock: f.offBlock!,
      onBlock: f.onBlock!,
      minutes,
      aircraftId: f.aircraftId,
      pilotId: f.pilotId,
      instructorId: f.instructorId,
      lessonId: f.lessonId,
      bookingId: f.bookingId,
      landings: Math.max(0, Number(f.landings) || 0),
      kind: f.kind ?? (f.instructorId ? "dual" : "solo"),
      ifrMinutes: f.ifrMinutes ? Number(f.ifrMinutes) : undefined,
      nightLandings: f.nightLandings ? Number(f.nightLandings) : undefined,
      tachStart: f.tachStart ? Number(f.tachStart) : undefined,
      tachEnd: f.tachEnd ? Number(f.tachEnd) : undefined,
      from: (f.from ?? "").toUpperCase(),
      to: (f.to ?? "").toUpperCase(),
      grade: f.grade ? Number(f.grade) : undefined,
      remarks: f.remarks,
    };
    if (flight.tachStart !== undefined && flight.tachEnd !== undefined && flight.tachEnd < flight.tachStart)
      return void toast.error("Landing tach must be greater than airborne tach.");
    saveFlight(flight);
    if (flight.tachEnd !== undefined)
      update((d) => ({ ...d, aircraft: d.aircraft.map((a) => (a.id === flight.aircraftId ? { ...a, tachHours: Math.max(a.tachHours, flight.tachEnd!) } : a)) }));
    const reg = data.aircraft.find((a) => a.id === flight.aircraftId)?.reg;
    const pilotName = data.users.find((u) => u.id === flight.pilotId)?.name;
    log(flight.bookingId ? "debrief_completed" : initial.id ? "flight_updated" : "flight_logged", "flight", `${flight.bookingId ? "Post-flight debrief" : "Flight"} for ${pilotName} on ${reg} (${fmtHours(minutes)}${flight.grade ? `, grade ${flight.grade}` : ""}${flight.tachEnd ? `, tach ${flight.tachEnd} h` : ""})`, flight.id);
    toast.success(
      flight.lessonId && (flight.grade ?? 0) >= 3 ? "Flight logged — lesson signed off" : "Flight logged",
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{f.id && initial.id ? "Edit flight" : "Log flight"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Date">
            <Input type="date" value={f.date ?? ""} onChange={set("date")} />
          </Field>
          <Field label="Off block">
            <Input type="time" value={f.offBlock ?? ""} onChange={set("offBlock")} />
          </Field>
          <Field label="On block">
            <Input type="time" value={f.onBlock ?? ""} onChange={set("onBlock")} />
          </Field>
          <Field label="Aircraft">
            <NativeSelect value={f.aircraftId ?? ""} onChange={set("aircraftId")}>
              <option value="">Select…</option>
              {data.aircraft.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.reg}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Pilot (student)">
            <NativeSelect value={f.pilotId ?? ""} onChange={set("pilotId")}>
              <option value="">Select…</option>
              {activeUsers(data, "student")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          <Field label="Instructor">
            <NativeSelect value={f.instructorId ?? ""} onChange={set("instructorId")}>
              <option value="">Solo</option>
              {activeUsers(data, "instructor")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          <Field label="From">
            <Input value={f.from ?? ""} onChange={set("from")} maxLength={4} className="uppercase" />
          </Field>
          <Field label="To">
            <Input value={f.to ?? ""} onChange={set("to")} maxLength={4} className="uppercase" />
          </Field>
          <Field label="Landings">
            <Input type="number" min={0} value={f.landings ?? 0} onChange={set("landings")} />
          </Field>
          <Field label="Flight type">
            <NativeSelect value={f.kind ?? (f.instructorId ? "dual" : "solo")} onChange={set("kind")}>
              <option value="dual">Dual instruction</option>
              <option value="solo">Solo PIC</option>
              <option value="sim">Simulator (FSTD)</option>
            </NativeSelect>
          </Field>
          <Field label="IFR minutes">
            <Input type="number" min={0} value={f.ifrMinutes ?? ""} onChange={set("ifrMinutes")} />
          </Field>
          <Field label="Night landings">
            <Input type="number" min={0} value={f.nightLandings ?? ""} onChange={set("nightLandings")} />
          </Field>
          <Field label="Tach airborne">
            <Input type="number" step="0.1" value={f.tachStart ?? ""} onChange={set("tachStart")} />
          </Field>
          <Field label="Tach landing">
            <Input type="number" step="0.1" value={f.tachEnd ?? ""} onChange={set("tachEnd")} />
          </Field>
          <div />
          <Field label="Lesson" className="col-span-2">
            <NativeSelect value={f.lessonId ?? ""} onChange={set("lessonId")}>
              <option value="">—</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="CBTA grade (1–5)">
            <NativeSelect value={f.grade ?? ""} onChange={set("grade")}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Remarks" className="col-span-3">
            <Textarea rows={2} value={f.remarks ?? ""} onChange={set("remarks")} />
          </Field>
        </div>
        <DialogFooter className="items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Block time <span className="num font-semibold text-foreground">{fmtHours(minutes)}</span>
            {f.lessonId && " · grade 3+ signs off the lesson"}
          </p>
          <Button onClick={save}>Save flight</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

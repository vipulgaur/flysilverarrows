import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { addDays, addWeeks, format, isSameDay, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, NativeSelect } from "@/components/app-ui";
import { BookingDialog } from "@/components/booking-dialog";
import { FlightDialog } from "@/components/flight-dialog";
import { useLookup, useMe } from "@/lib/store";
import type { Booking, Flight } from "@/lib/types";
import { bookingPending } from "@/lib/logic";

export const Route = createFileRoute("/_shell/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — SilverArrows" },
      { name: "description", content: "Weekly booking calendar for aircraft, instructors and students." },
      { property: "og:title", content: "Schedule — SilverArrows" },
      { property: "og:description", content: "Weekly booking calendar for aircraft, instructors and students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Schedule,
});

const START = 7;
const END = 21;
const ROW = 44;
const typeClass = {
  lesson: "bg-booking-lesson",
  solo: "bg-booking-solo",
  maintenance: "bg-booking-maintenance",
} as const;

function Schedule() {
  const { data } = useMe();
  const lk = useLookup();
  const [week, setWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [filter, setFilter] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; initial: Partial<Booking> }>({ open: false, initial: {} });
  const [flight, setFlight] = useState<{ open: boolean; initial: Partial<Flight> }>({ open: false, initial: {} });
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const hours = Array.from({ length: END - START }, (_, i) => START + i);

  const bookings = data.bookings.filter(
    (b) =>
      (showCancelled || b.status !== "cancelled") &&
      (!filter || b.aircraftId === filter || b.instructorId === filter || b.studentId === filter),
  );

  function openNew(day: Date, hour: number) {
    const s = new Date(day);
    s.setHours(hour, 0, 0, 0);
    setDialog({ open: true, initial: { start: s.toISOString(), end: new Date(s.getTime() + 7200000).toISOString(), aircraftId: data.aircraft.some((a) => a.id === filter) ? filter : undefined } });
  }

  function logFromBooking(b: Booking) {
    setDialog((d) => ({ ...d, open: false }));
    setFlight({
      open: true,
      initial: {
        bookingId: b.id,
        date: format(new Date(b.start), "yyyy-MM-dd"),
        offBlock: format(new Date(b.start), "HH:mm"),
        onBlock: format(new Date(b.end), "HH:mm"),
        ...(b.aircraftId ? { aircraftId: b.aircraftId } : {}),
        ...(b.studentId ? { pilotId: b.studentId } : {}),
        ...(b.instructorId ? { instructorId: b.instructorId } : {}),
        ...(b.lessonId ? { lessonId: b.lessonId } : {}),
      },
    });
  }

  return (
    <div>
      <PageHeader title="Schedule" subtitle={`Week of ${format(week, "d MMMM yyyy")}`}>
        <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value)} className="w-52" aria-label="Filter">
          <option value="">All resources</option>
          <optgroup label="Aircraft">
            {data.aircraft.map((a) => (
              <option key={a.id} value={a.id}>{a.reg}</option>
            ))}
          </optgroup>
          <optgroup label="People">
            {data.users.filter((u) => u.role === "student" || u.role === "instructor").filter((u) => u.status !== "deleted").map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </optgroup>
        </NativeSelect>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> Cancelled
        </label>
        <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => setWeek((w) => addWeeks(w, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => setWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
        <Button variant="outline" size="icon" aria-label="Next week" onClick={() => setWeek((w) => addWeeks(w, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button onClick={() => openNew(new Date(), Math.min(Math.max(new Date().getHours() + 1, START), END - 2))}>
          <Plus className="h-4 w-4" /> New booking
        </Button>
      </PageHeader>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <div className="grid min-w-[900px]" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          <div className="border-b" />
          {days.map((d) => (
            <div key={d.toISOString()} className={`border-b border-l px-2 py-2 text-center text-sm ${isSameDay(d, new Date()) ? "bg-accent/20 font-semibold" : ""}`}>
              {format(d, "EEE")} <span className="num">{format(d, "d")}</span>
            </div>
          ))}
          <div>
            {hours.map((h) => (
              <div key={h} className="num border-b pr-2 text-right text-xs text-muted-foreground" style={{ height: ROW }}>
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {days.map((d) => (
            <div key={d.toISOString()} className="relative border-l">
              {hours.map((h) => (
                <button key={h} aria-label={`Book ${format(d, "EEE d")} ${h}:00`} onClick={() => openNew(d, h)} className="block w-full border-b transition hover:bg-muted" style={{ height: ROW }} />
              ))}
              {bookings
                .filter((b) => isSameDay(new Date(b.start), d))
                .map((b) => {
                  const s = new Date(b.start);
                  const e = new Date(b.end);
                  const top = ((s.getHours() + s.getMinutes() / 60 - START) * ROW);
                  const height = Math.max(((e.getTime() - s.getTime()) / 3600000) * ROW - 2, 18);
                  return (
                    <button
                      key={b.id}
                      onClick={() => setDialog({ open: true, initial: b })}
                      className={`absolute inset-x-1 overflow-hidden rounded px-2 py-1 text-left text-xs text-primary-foreground shadow-sm ${typeClass[b.type]} ${b.status === "cancelled" ? "opacity-40 line-through" : ""} ${b.status === "completed" ? "opacity-60" : ""}`}
                      style={{ top, height }}
                    >
                      <div className="font-semibold">{lk.aircraft(b.aircraftId)?.reg} {b.status === "completed" && "✓"}{bookingPending(b) && " · Pending approval"}</div>
                      <div className="truncate">{b.type === "maintenance" ? b.notes || "Maintenance" : lk.user(b.studentId)?.name}</div>
                      <div className="truncate opacity-80">{lk.lesson(b.lessonId)?.name}</div>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        {(["lesson", "solo", "maintenance"] as const).map((t) => (
          <span key={t} className="flex items-center gap-1.5 capitalize">
            <span className={`h-3 w-3 rounded-sm ${typeClass[t]}`} /> {t}
          </span>
        ))}
      </div>

      <BookingDialog open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} initial={dialog.initial} onLogFlight={logFromBooking} />
      <FlightDialog open={flight.open} onOpenChange={(o) => setFlight((d) => ({ ...d, open: o }))} initial={flight.initial} />
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarClock, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Chip, Empty, Field, KV, NativeSelect, PageHeader, Section } from "@/components/app-ui";
import { BookingDialog } from "@/components/booking-dialog";
import { CumulativeHours } from "@/components/cumulative-hours";
import { ProfileEditor } from "@/components/profile-editor";
import { useViewAs, ViewAsPicker, viewAsSearch } from "@/components/view-as";
import { useLookup, useMe } from "@/lib/store";
import { aircraftUnavailable, bookingPending, expiryState, fmtDec, hoursBreakdown, hoursToService, studentProgress, theoryProgress, uid } from "@/lib/logic";
import { reasonLabel, type Booking, type RescheduleReason } from "@/lib/types";

export const Route = createFileRoute("/_shell/portal/student")({
  validateSearch: viewAsSearch,
  head: () => ({
    meta: [
      { title: "Student portal — SilverArrows" },
      { name: "description", content: "Training progress, theory exams, logbook hours, upcoming flights and aircraft status for student pilots." },
      { property: "og:title", content: "Student portal — SilverArrows" },
      { property: "og:description", content: "Training progress, theory exams, logbook hours, upcoming flights and aircraft status for student pilots." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentPortal,
});

const expTone = (s: string) => (s === "ok" ? "ok" : s === "soon" ? "soon" : s === "expired" ? "expired" : "none") as "ok";

function StudentPortal() {
  const { id } = Route.useSearch();
  const { data, me, update, log } = useMe();
  const lk = useLookup();
  const s = useViewAs("student", id);
  const [req, setReq] = useState<{ booking: Booking; reason: RescheduleReason; details: string; date: string; t1: string; t2: string } | null>(null);
  const [book, setBook] = useState<{ open: boolean; initial: Partial<Booking> }>({ open: false, initial: {} });

  if (!s) return <Empty>No active students.</Empty>;
  const prog = studentProgress(s.id, data);
  const theory = theoryProgress(s.id, data);
  const hrs = hoursBreakdown(s.id, data);
  const med = expiryState(s.medicalExpiry);
  const now = new Date();
  const upcoming = data.bookings
    .filter((b) => b.studentId === s.id && b.status === "scheduled" && new Date(b.end) > now)
    .sort((a, b) => a.start.localeCompare(b.start));
  const requests = data.requests.filter((r) => r.studentId === s.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const lectures = data.lectures.filter((l) => l.enrolled.includes(s.id) && new Date(l.end) > now).sort((a, b) => a.start.localeCompare(b.start));
  const grades = data.flights.filter((f) => f.pilotId === s.id && f.grade).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const isSelf = me.id === s.id;

  function openReq(b: Booking) {
    const st = new Date(new Date(b.start).getTime() + 86400000);
    const en = new Date(new Date(b.end).getTime() + 86400000);
    setReq({ booking: b, reason: "weather", details: "", date: format(st, "yyyy-MM-dd"), t1: format(st, "HH:mm"), t2: format(en, "HH:mm") });
  }

  function submitReq() {
    if (!req || !s) return;
    if (req.details.trim().length < 5) return void toast.error("Please describe the reason.");
    const proposedStart = new Date(`${req.date}T${req.t1}`);
    const proposedEnd = new Date(`${req.date}T${req.t2}`);
    if (proposedEnd <= proposedStart) return void toast.error("End must be after start.");
    if (proposedStart < new Date()) return void toast.error("Proposed time must be in the future.");
    if (data.requests.some((r) => r.bookingId === req.booking.id && r.status === "pending"))
      return void toast.error("A request for this flight is already pending.");
    const rq = {
      id: `RQ-${uid().slice(0, 4).toUpperCase()}`,
      bookingId: req.booking.id,
      studentId: s.id,
      instructorId: req.booking.instructorId,
      reason: req.reason,
      details: req.details.trim(),
      proposedStart: proposedStart.toISOString(),
      proposedEnd: proposedEnd.toISOString(),
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };
    update((d) => ({ ...d, requests: [rq, ...d.requests] }));
    log("reschedule_requested", "booking", `Requested reschedule for ${req.booking.id} (reason: ${req.reason}) to ${format(proposedStart, "dd.MM.yyyy HH:mm")}`, req.booking.id);
    toast.success("Reschedule request sent to your instructor");
    setReq(null);
  }

  function selectAircraft(acId: string) {
    const ac = lk.aircraft(acId);
    log("plane_selected", "aircraft", `Selected ${ac?.reg} for next lesson`, acId);
    const st = new Date();
    st.setDate(st.getDate() + 1);
    st.setHours(10, 0, 0, 0);
    setBook({ open: true, initial: { aircraftId: acId, studentId: s!.id, instructorId: s!.instructorId, lessonId: prog.next?.id, start: st.toISOString(), end: new Date(st.getTime() + 7200000).toISOString() } });
  }

  return (
    <div>
      <PageHeader title="Student portal" subtitle={`${s.name} (${s.callsign ?? "—"}) · ${prog.program?.name ?? "No program"}`}>
        <ViewAsPicker role="student" current={s} to="/portal/student" />
        <ProfileEditor person={s} />
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Profile">
          <KV k="Call sign" v={<span className="num">{s.callsign ?? "—"}</span>} />
          <KV k="Licence" v={<span className="num">{s.licence ?? "—"}</span>} />
          <KV k="Stage" v={s.stage ?? "—"} />
          <KV k="Instructor" v={lk.user(s.instructorId)?.name ?? "—"} />
          <KV k="Next lesson" v={prog.next?.name ?? "Program complete"} />
        </Section>
        <Section title="E-learning & theory">
          <div className="mb-1 flex justify-between text-sm"><span>Theory exams passed</span><span className="num font-semibold">{theory.passed}/{theory.total} · {theory.pct}%</span></div>
          <Progress value={theory.pct} className="mb-4 h-2" />
          <div className="mb-1 flex justify-between text-sm"><span>Flight syllabus</span><span className="num font-semibold">{prog.completed}/{prog.total} · {prog.pct}%</span></div>
          <Progress value={prog.pct} className="mb-4 h-2" />
          <div className="flex flex-wrap gap-1">
            {data.subjects.map((sub) => {
              const r = theory.best.get(sub.id);
              return (
                <span key={sub.id} title={`${sub.name}${r ? ` — ${r.score}%` : ""}`}>
                  <Chip tone={r?.passed ? "ok" : r ? "expired" : "none"}>{sub.code}{r ? ` ${r.score}%` : ""}</Chip>
                </span>
              );
            })}
          </div>
        </Section>
        <Section title="Medical & currency">
          <KV k={`Class ${s.medicalClass ?? 2} medical`} v={<Chip tone={expTone(med.state)}>{med.state === "none" ? "Not on file" : med.state === "expired" ? `Expired ${-med.days} d ago` : `Valid · ${med.days} days`}</Chip>} />
          <KV k="ICAO English" v={s.icaoLevel ? <Chip tone={s.icaoLevel >= 4 ? "ok" : "expired"}>Level {s.icaoLevel}</Chip> : "—"} />
          <KV k="90-day landings" v={<Chip tone={hrs.landings90 >= 3 ? "ok" : "expired"}>{hrs.landings90} {hrs.landings90 >= 3 ? "· compliant" : "· need 3"}</Chip>} />
          <KV k="Medical expiry" v={<span className="num">{s.medicalExpiry ? format(new Date(s.medicalExpiry), "dd.MM.yyyy") : "—"}</span>} />
        </Section>
      </div>

      <Section title="Flight hours (logbook breakdown)" className="mt-4">
        <div className="grid grid-cols-3 gap-4 md:grid-cols-7">
          {[
            ["Total", fmtDec(hrs.total)], ["Dual", fmtDec(hrs.dual)], ["Solo PIC", fmtDec(hrs.solo)], ["Simulator", fmtDec(hrs.sim)],
            ["IFR", fmtDec(hrs.ifr)], ["Landings", hrs.landings], ["Night ldg", hrs.nightLandings],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{k}</p>
              <p className="num text-2xl font-semibold">{v}</p>
            </div>
          ))}
        </div>
      </Section>

      <CumulativeHours person={s} />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Upcoming scheduled flights" action={<Link to="/schedule" className="text-xs text-primary hover:underline">Calendar →</Link>}>
          {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">Nothing scheduled.</p> : (
            <ul className="divide-y">
              {upcoming.map((b) => {
                const pend = data.requests.find((r) => r.bookingId === b.id && r.status === "pending");
                return (
                  <li key={b.id} className="flex items-center gap-3 py-3 text-sm">
                    <div className="flex-1">
                      <div className="num font-medium">{format(new Date(b.start), "dd.MM.yyyy HH:mm")}–{format(new Date(b.end), "HH:mm")} · {lk.aircraft(b.aircraftId)?.reg}</div>
                      <div className="text-muted-foreground">
                        {lk.lesson(b.lessonId)?.name ?? "Flight"} · CFI {lk.user(b.instructorId)?.name ?? "—"} · {b.route ?? "EKAH → EKAH"}
                      </div>
                    </div>
                    {bookingPending(b) ? <Button size="sm" variant="outline" onClick={() => setBook({ open: true, initial: b })}>Awaiting admin approval</Button> : pend ? <Chip tone="soon">Reschedule pending</Chip> : isSelf || me.role === "admin" ? (
                      <Button size="sm" variant="outline" onClick={() => openReq(b)}><CalendarClock className="h-4 w-4" /> Request reschedule</Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
        <Section title="My reschedule requests">
          {requests.length === 0 ? <p className="text-sm text-muted-foreground">No requests yet.</p> : (
            <ul className="divide-y">
              {requests.map((r) => (
                <li key={r.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.bookingId} · {reasonLabel[r.reason]}</span>
                    <Chip tone={r.status === "approved" ? "ok" : r.status === "declined" ? "expired" : "soon"}>{r.status}</Chip>
                  </div>
                  <p className="text-muted-foreground">“{r.details}” → proposed <span className="num">{format(new Date(r.proposedStart), "dd.MM HH:mm")}</span></p>
                  {r.notes && <p className="mt-1 text-xs">Instructor note: {r.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Aircraft available for training" className="mt-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.aircraft.map((a) => {
            const left = hoursToService(a, data.maintenance);
            const down = aircraftUnavailable(a, data.maintenance);
            return (
              <div key={a.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="num text-lg font-semibold">{a.reg}</span>
                  <Chip tone={down ? "expired" : left !== null && left <= 15 ? "soon" : "ok"}>{down ? "Unavailable" : "Airworthy"}</Chip>
                </div>
                <p className="text-xs text-muted-foreground">{a.type}</p>
                <div className="mt-2">
                  <KV k="To next service" v={<span className="num">{left === null ? "—" : `${left} h`}</span>} />
                  <KV k="Airframe" v={<span className="num">{a.totalHours.toFixed(1)} h</span>} />
                  <KV k="Tach" v={<span className="num">{a.tachHours.toFixed(1)} h</span>} />
                  <KV k="Last service" v={<span className="num">{a.lastService ? format(new Date(a.lastService), "dd.MM.yyyy") : "—"}</span>} />
                </div>
                <Button size="sm" className="mt-3 w-full" disabled={down || !(isSelf || me.role === "admin")} onClick={() => selectAircraft(a.id)}>
                  <Plane className="h-4 w-4" /> Select for next lesson
                </Button>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Ground school lectures">
          {lectures.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming lectures.</p> : lectures.map((l) => (
            <div key={l.id} className="py-2 text-sm">
              <div className="font-medium">{l.title}</div>
              <div className="num text-muted-foreground">{format(new Date(l.start), "dd.MM.yyyy HH:mm")} · {data.classrooms.find((c) => c.id === l.roomId)?.name}</div>
            </div>
          ))}
        </Section>
        <Section title="Recent CBTA grades">
          {grades.length === 0 ? <p className="text-sm text-muted-foreground">No graded flights yet.</p> : grades.map((f) => (
            <div key={f.id} className="flex items-center justify-between py-2 text-sm">
              <span>{lk.lesson(f.lessonId)?.name ?? "Flight"} <span className="num text-muted-foreground">· {format(new Date(f.date), "dd.MM")}</span></span>
              <Chip tone={(f.grade ?? 0) >= 3 ? "ok" : "expired"}>Grade {f.grade}/5</Chip>
            </div>
          ))}
        </Section>
      </div>

      <Dialog open={!!req} onOpenChange={(o) => !o && setReq(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request reschedule — {req?.booking.id}</DialogTitle></DialogHeader>
          {req && (
            <div className="grid grid-cols-3 gap-4">
              <Field label="Reason" className="col-span-3">
                <NativeSelect value={req.reason} onChange={(e) => setReq({ ...req, reason: e.target.value as RescheduleReason })}>
                  {Object.entries(reasonLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Details" className="col-span-3">
                <Textarea rows={3} value={req.details} onChange={(e) => setReq({ ...req, details: e.target.value })} placeholder="e.g. Crosswind forecast exceeds solo limit" />
              </Field>
              <Field label="New date"><Input type="date" value={req.date} onChange={(e) => setReq({ ...req, date: e.target.value })} /></Field>
              <Field label="From"><Input type="time" value={req.t1} onChange={(e) => setReq({ ...req, t1: e.target.value })} /></Field>
              <Field label="To"><Input type="time" value={req.t2} onChange={(e) => setReq({ ...req, t2: e.target.value })} /></Field>
            </div>
          )}
          <DialogFooter><Button onClick={submitReq}>Send request</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <BookingDialog open={book.open} onOpenChange={(o) => setBook((b) => ({ ...b, open: o }))} initial={book.initial} />
    </div>
  );
}

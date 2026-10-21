import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { format, isSameDay } from "date-fns";
import { toast } from "sonner";
import { Check, Play, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Chip, Empty, KV, PageHeader, Section } from "@/components/app-ui";
import { FlightDialog } from "@/components/flight-dialog";
import { CumulativeHours } from "@/components/cumulative-hours";
import { ProfileEditor } from "@/components/profile-editor";
import { useViewAs, ViewAsPicker, viewAsSearch } from "@/components/view-as";
import { useLookup, useMe } from "@/lib/store";
import { activeUsers, bookingApproved, expiryState, fmtDec, fmtHours, ftlStatus, FTL, hoursBreakdown, reviewRequest, studentProgress, uid } from "@/lib/logic";
import { reasonLabel, type Flight } from "@/lib/types";

export const Route = createFileRoute("/_shell/portal/cfi")({
  validateSearch: viewAsSearch,
  head: () => ({
    meta: [
      { title: "CFI operations hub — SilverArrows" },
      { name: "description", content: "Flight duty limits, reschedule approvals, student cohort readiness and post-flight debriefing for flight instructors." },
      { property: "og:title", content: "CFI operations hub — SilverArrows" },
      { property: "og:description", content: "Flight duty limits, reschedule approvals, student cohort readiness and post-flight debriefing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CfiPortal,
});

function CfiPortal() {
  const { id } = Route.useSearch();
  const { data, me, update, log, commit } = useMe();
  const lk = useLookup();
  const cfi = useViewAs("instructor", id);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [debrief, setDebrief] = useState<{ open: boolean; initial: Partial<Flight> }>({ open: false, initial: {} });

  if (!cfi) return <Empty>No active instructors.</Empty>;
  const ftl = ftlStatus(cfi.id, data);
  const med = expiryState(cfi.medicalExpiry);
  const rating = expiryState(cfi.ratingExpiry, new Date(), 90);
  const instructed = data.flights.filter((f) => f.instructorId === cfi.id).reduce((s, f) => s + f.minutes, 0);
  const cohort = activeUsers(data, "student").filter((u) => u.instructorId === cfi.id);
  const pending = data.requests.filter((r) => r.status === "pending" && (r.instructorId === cfi.id));
  const today = data.bookings
    .filter((b) => b.instructorId === cfi.id && bookingApproved(b) && isSameDay(new Date(b.start), new Date()) && b.status !== "cancelled")
    .sort((a, b) => a.start.localeCompare(b.start));
  const canAct = me.id === cfi.id || me.role === "admin";

  function toggleDuty() {
    if (!canAct) return;
    if (ftl.open) {
      update((d) => ({ ...d, duty: d.duty.map((x) => (x.id === ftl.open!.id ? { ...x, end: new Date().toISOString() } : x)) }));
      log("duty_ended", "duty", `${cfi!.name} ended duty period`);
      toast("Duty ended — minimum 12 h rest required");
    } else {
      update((d) => ({ ...d, duty: [...d.duty, { id: uid(), instructorId: cfi!.id, start: new Date().toISOString() }] }));
      log("duty_started", "duty", `${cfi!.name} started duty period`);
      toast.success("Duty started");
    }
  }

  function review(reqId: string, decision: "approved" | "declined") {
    const r = data.requests.find((x) => x.id === reqId)!;
    const note = notes[reqId] ?? "";
    if (decision === "declined" && !note.trim()) return void toast.error("Add a note explaining the decline.");
    const err = commit(reviewRequest(data, reqId, me, decision, note));
    if (err) return void toast.error(err);
    log(decision === "approved" ? "reschedule_approved" : "reschedule_declined", "booking", `${decision === "approved" ? "Approved" : "Declined"} reschedule ${r.id} for ${lk.user(r.studentId)?.name} (${r.bookingId})${note ? ` — ${note}` : ""}`, r.bookingId);
    toast.success(decision === "approved" ? "Approved — booking moved" : "Request declined");
  }

  return (
    <div>
      <PageHeader title="CFI operations hub" subtitle={`${cfi.name} (${cfi.callsign ?? "—"}) · ${cfi.stage ?? "Flight Instructor"}`}>
        <ViewAsPicker role="instructor" current={cfi} to="/portal/cfi" />
        <ProfileEditor person={cfi} />
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Instructor status">
          <KV k="Ratings" v={cfi.licence ?? "—"} />
          <KV k="Total flight time" v={<span className="num">{fmtDec((cfi.priorMinutes ?? 0) + instructed)} h</span>} />
          <KV k="Instructed in SilverArrows" v={<span className="num">{fmtDec(instructed)} h</span>} />
          <KV k="Active students" v={<span className="num">{cohort.length}</span>} />
        </Section>
        <Section title="EASA Part-FTL duty limits" action={canAct && (
          <Button size="sm" variant={ftl.open ? "outline" : "default"} onClick={toggleDuty}>
            {ftl.open ? <><Square className="h-3.5 w-3.5" /> End duty</> : <><Play className="h-3.5 w-3.5" /> Start duty</>}
          </Button>
        )}>
          <div className="mb-1 flex justify-between text-sm"><span>Duty today</span><span className="num">{fmtHours(ftl.dutyMin)} / {fmtHours(FTL.dutyMin)}</span></div>
          <Progress value={Math.min(100, (ftl.dutyMin / FTL.dutyMin) * 100)} className="mb-3 h-2" />
          <div className="mb-1 flex justify-between text-sm"><span>Flight time today</span><span className="num">{fmtHours(ftl.flightMin)} / {fmtHours(FTL.flightMin)}</span></div>
          <Progress value={Math.min(100, (ftl.flightMin / FTL.flightMin) * 100)} className="mb-3 h-2" />
          <KV k="Remaining duty allowed" v={<Chip tone={ftl.dutyLeft < 60 ? "expired" : ftl.dutyLeft < 180 ? "soon" : "ok"}>{fmtHours(ftl.dutyLeft)}</Chip>} />
          <KV k="Mandatory rest after duty" v={<span className="num">12:00</span>} />
          <KV k="Status" v={ftl.open ? <Chip tone="ok">On duty since {format(new Date(ftl.open.start), "HH:mm")}</Chip> : <Chip tone="none">Off duty</Chip>} />
        </Section>
        <Section title="Rating & medical currency">
          <KV k={`Class ${cfi.medicalClass ?? 1} medical`} v={<Chip tone={med.state === "none" ? "none" : med.state}>{med.state === "expired" ? "Expired" : med.state === "none" ? "Not on file" : `${med.days} days`}</Chip>} />
          <KV k="FI rating expiry" v={<Chip tone={rating.state === "none" ? "none" : rating.state}>{cfi.ratingExpiry ? format(new Date(cfi.ratingExpiry), "dd.MM.yyyy") : "—"}</Chip>} />
          <KV k="Pending approvals" v={<Chip tone={pending.length ? "soon" : "ok"}>{pending.length}</Chip>} />
        </Section>
      </div>

      <CumulativeHours person={cfi} />
      <Section title={`Pending student reschedule requests (${pending.length})`} className="mt-4">
        {pending.length === 0 ? <p className="text-sm text-muted-foreground">No action required.</p> : (
          <ul className="divide-y">
            {pending.map((r) => {
              const b = data.bookings.find((x) => x.id === r.bookingId);
              return (
                <li key={r.id} className="grid gap-3 py-4 text-sm md:grid-cols-[1fr_auto]">
                  <div>
                    <div className="font-medium">{lk.user(r.studentId)?.name} — {r.bookingId} ({lk.aircraft(b?.aircraftId)?.reg}, <span className="num">{b ? format(new Date(b.start), "dd.MM.yyyy HH:mm") : "—"}</span>)</div>
                    <div className="text-muted-foreground"><span className="font-medium text-foreground">{reasonLabel[r.reason]}:</span> “{r.details}”</div>
                    <div className="num mt-1">Proposed: {format(new Date(r.proposedStart), "dd.MM.yyyy HH:mm")}–{format(new Date(r.proposedEnd), "HH:mm")}</div>
                  </div>
                  {canAct && (
                    <div className="flex items-center gap-2">
                      <Input placeholder="Note to student" className="w-48" value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                      <Button size="sm" onClick={() => review(r.id, "approved")}><Check className="h-4 w-4" /> Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => review(r.id, "declined")}><X className="h-4 w-4" /> Decline</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Assigned students — progress & stage check readiness" className="mt-4">
        {cohort.length === 0 ? <p className="text-sm text-muted-foreground">No students assigned.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Stage</TableHead><TableHead className="w-44">Syllabus</TableHead><TableHead>Dual</TableHead><TableHead>Solo</TableHead><TableHead>Solo readiness</TableHead><TableHead>Next check</TableHead></TableRow></TableHeader>
            <TableBody>
              {cohort.map((s) => {
                const p = studentProgress(s.id, data);
                const h = hoursBreakdown(s.id, data);
                const soloDone = data.completions.some((c) => c.studentId === s.id && c.lessonId === "l-7");
                const circuits = data.completions.some((c) => c.studentId === s.id && c.lessonId === "l-6");
                return (
                  <TableRow key={s.id}>
                    <TableCell><Link to="/people/$id" params={{ id: s.id }} className="font-medium text-primary hover:underline">{s.name}</Link> <span className="num text-xs text-muted-foreground">{s.callsign}</span></TableCell>
                    <TableCell className="text-muted-foreground">{s.stage ?? "—"}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><Progress value={p.pct} className="h-2" /><span className="num text-xs">{p.pct}%</span></div></TableCell>
                    <TableCell className="num">{fmtDec(h.dual)}</TableCell>
                    <TableCell className="num">{fmtDec(h.solo)}</TableCell>
                    <TableCell>{soloDone ? <Chip tone="ok">Solo endorsed</Chip> : circuits ? <Chip tone="soon">Ready for check</Chip> : <Chip tone="none">Pending</Chip>}</TableCell>
                    <TableCell>{p.next?.name ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Today's dispatch & debriefing roster" className="mt-4">
        {today.length === 0 ? <p className="text-sm text-muted-foreground">No flights today.</p> : (
          <ul className="divide-y">
            {today.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="num w-28 font-medium">{format(new Date(b.start), "HH:mm")}–{format(new Date(b.end), "HH:mm")}</span>
                <span className="flex-1">{b.id} · {lk.user(b.studentId)?.name} · {lk.aircraft(b.aircraftId)?.reg} · {lk.lesson(b.lessonId)?.name ?? "Flight"}</span>
                {b.status === "completed" ? <Chip tone="ok">Debriefed</Chip> : canAct && (
                  <Button size="sm" onClick={() => {
                    const ac = lk.aircraft(b.aircraftId);
                    setDebrief({ open: true, initial: {
                      bookingId: b.id, date: format(new Date(b.start), "yyyy-MM-dd"), offBlock: format(new Date(b.start), "HH:mm"), onBlock: format(new Date(b.end), "HH:mm"),
                      ...(b.aircraftId ? { aircraftId: b.aircraftId } : {}), ...(b.studentId ? { pilotId: b.studentId } : {}),
                      instructorId: cfi.id, ...(b.lessonId ? { lessonId: b.lessonId } : {}), ...(ac ? { tachStart: ac.tachHours } : {}),
                    } });
                  }}>Open post-flight debrief</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <FlightDialog open={debrief.open} onOpenChange={(o) => setDebrief((d) => ({ ...d, open: o }))} initial={debrief.initial} />
    </div>
  );
}

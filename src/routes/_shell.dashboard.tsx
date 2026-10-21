import { createFileRoute, Link } from "@tanstack/react-router";
import { format, isAfter, isSameDay, startOfMonth } from "date-fns";
import { AlertTriangle, Bell, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader, Stat, Empty, Section, KV } from "@/components/app-ui";
import { Badge } from "@/components/ui/badge";
import { CumulativeHours } from "@/components/cumulative-hours";
import { DashboardInsights } from "@/components/dashboard-insights";
import { useLookup, useMe } from "@/lib/store";
import {
  activeUsers, aircraftUnavailable, expiryState, fmtHours, ftlStatus, FTL, hoursBreakdown, maintenanceState,
  memberNotifications, studentProgress, theoryProgress, visibleTo, bookingApproved, bookingPending,
} from "@/lib/logic";
import { courseProgress } from "@/lib/learning-state";
import { roleLabel, type AppData, type User } from "@/lib/types";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SilverArrows" },
      { name: "description", content: "Your role-based overview of bookings, hours, training, currency and alerts." },
      { property: "og:title", content: "Dashboard — SilverArrows" },
      { property: "og:description", content: "Your role-based overview of bookings, hours, training, currency and alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function ExpiryBadge({ date }: { date?: string | undefined }) {
  const e = expiryState(date);
  if (e.state === "none") return <span className="text-muted-foreground">Not set</span>;
  const v = e.state === "expired" ? "destructive" : e.state === "soon" ? "secondary" : "muted";
  return <Badge variant={v as "muted"}>{format(new Date(date!), "d MMM yyyy")} · {e.state === "expired" ? "expired" : `${e.days} d`}</Badge>;
}

function Dashboard() {
  const { data, me } = useMe();
  const now = new Date();
  const prog = courseProgress(data.learningRecords, me.id);
  const notes = memberNotifications(data, me).slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good ${now.getHours() < 12 ? "morning" : now.getHours() < 18 ? "afternoon" : "evening"}, ${me.name.split(" ")[0]}`}
        subtitle={`${roleLabel[me.role]} · ${format(now, "EEEE d MMMM yyyy")}`}
      />
      <DashboardInsights data={data} me={me} />

      {me.role === "admin" && <AdminView data={data} />}
      {me.role === "instructor" && <InstructorView data={data} me={me} />}
      {me.role === "ground" && <GroundView data={data} me={me} />}
      {me.role === "student" && <StudentView data={data} me={me} />}




      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="E-Learning" action={<Link to="/learning" className="text-sm text-primary hover:underline">Open →</Link>}>
          <div className="mb-2 flex justify-between text-sm"><span>Chapters completed</span><span className="num">{prog.completed}/{prog.total}</span></div>
          <Bar pct={prog.percent} />
        </Section>
        <Section title="Latest notifications" action={<Bell className="h-4 w-4 text-muted-foreground" />}>
          {notes.length === 0 ? <p className="text-sm text-muted-foreground">Nothing new.</p> : (
            <ul className="space-y-2 text-sm">
              {notes.map((n) => <li key={n.id} className="rounded-md border p-2">{n.title}<div className="text-xs text-muted-foreground">{n.detail}</div></li>)}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function Upcoming({ me, data, title = "Upcoming bookings" }: { me: User; data: AppData; title?: string }) {
  const lk = useLookup();
  const now = new Date();
  const list = visibleTo(me, data.bookings)
    .filter((b) => b.status === "scheduled" && bookingApproved(b) && isAfter(new Date(b.end), now))
    .sort((a, b) => a.start.localeCompare(b.start)).slice(0, 6);
  return (
    <Section title={title} action={<Link to="/schedule" className="text-sm text-primary hover:underline">Calendar →</Link>}>
      {list.length === 0 ? <Empty>No upcoming bookings.</Empty> : (
        <div className="divide-y">
          {list.map((b) => (
            <div key={b.id} className="flex items-center gap-4 py-2.5">
              <div className="num w-24 text-sm">
                <div className="font-semibold">{format(new Date(b.start), "EEE d MMM")}</div>
                <div className="text-muted-foreground">{format(new Date(b.start), "HH:mm")}–{format(new Date(b.end), "HH:mm")}</div>
              </div>
              <div className="flex-1 text-sm">
                <div className="font-medium">{lk.lesson(b.lessonId)?.name ?? b.notes ?? (b.type === "solo" ? "Solo flight" : "Booking")}</div>
                <div className="text-muted-foreground">{[lk.aircraft(b.aircraftId)?.reg, lk.user(b.studentId)?.name, lk.user(b.instructorId)?.name].filter(Boolean).join(" · ")}</div>
              </div>
              <Badge variant="muted" className="capitalize">{b.type}</Badge>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function FleetAlerts({ data }: { data: AppData }) {
  const lk = useLookup();
  const alerts = data.maintenance
    .map((m) => ({ m, ac: lk.aircraft(m.aircraftId), st: "ok" as string }))
    .map((x) => ({ ...x, st: x.ac ? maintenanceState(x.m, x.ac) : "ok" }))
    .filter((x) => x.ac && (x.st === "overdue" || x.st === "soon"));
  return (
    <Section title="Fleet alerts" action={<Link to="/fleet" className="text-sm text-primary hover:underline">Fleet →</Link>}>
      {alerts.length === 0 ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4" /> All aircraft within limits.</p> : (
        <div className="space-y-2">
          {alerts.map(({ m, ac, st }) => (
            <div key={m.id} className="flex items-start gap-3 text-sm">
              <AlertTriangle className={`mt-0.5 h-4 w-4 ${st === "overdue" ? "text-destructive" : "text-warning"}`} />
              <div><div className="font-medium">{ac!.reg} — {m.title}</div>
                <div className="text-muted-foreground">
                  {m.dueHours !== undefined && `Due at ${m.dueHours} h (${(m.dueHours - ac!.totalHours).toFixed(1)} left)`}
                  {m.dueDate && `Due ${format(new Date(m.dueDate), "d MMM")}`}
                </div></div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

const Grid4 = ({ children }: { children: ReactNode }) => <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;

function AdminView({ data }: { data: AppData }) {
  const now = new Date();
  const monthMin = data.flights.filter((f) => new Date(f.date) >= startOfMonth(now)).reduce((s, f) => s + f.minutes, 0);
  const pending = data.requests.filter((r) => r.status === "pending").length + data.profileRequests.filter((r) => r.status === "pending").length + data.bookings.filter(bookingPending).length;
  const avail = data.aircraft.filter((a) => !aircraftUnavailable(a, data.maintenance)).length;
  const people = activeUsers(data);
  const expiring = people
    .flatMap((u) => [{ u, what: "Medical", d: u.medicalExpiry }, { u, what: "Rating", d: u.ratingExpiry }])
    .filter((x) => ["soon", "expired"].includes(expiryState(x.d).state));
  const students = activeUsers(data, "student");
  return (
    <>
      <Grid4>
        <Link to="/portal/admin"><Stat label="Pending approvals" value={pending} hint="Bookings + reschedules + profile changes" /></Link>
        <Stat label="Hours flown this month" value={fmtHours(monthMin)} />
        <Stat label="Aircraft available" value={`${avail}/${data.aircraft.length}`} />
        <Stat label="Active members" value={people.length} hint={`${students.length} students`} />
      </Grid4>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><Upcoming me={{ role: "admin" } as User} data={data} /></div>
        <FleetAlerts data={data} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Student training progress">
          <div className="space-y-3">
            {students.slice(0, 8).map((s) => { const p = studentProgress(s.id, data); return (
              <Link key={s.id} to="/people/$id" params={{ id: s.id }} className="block text-sm hover:text-primary">
                <div className="mb-1 flex justify-between"><span>{s.name}</span><span className="num text-muted-foreground">{p.pct}%</span></div><Bar pct={p.pct} />
              </Link>); })}
          </div>
        </Section>
        <Section title="Medicals & ratings expiring">
          {expiring.length === 0 ? <p className="text-sm text-muted-foreground">Everyone is current.</p> :
            expiring.slice(0, 8).map((x) => <KV key={x.u.id + x.what} k={`${x.u.name} · ${x.what}`} v={<ExpiryBadge date={x.d} />} />)}
        </Section>
      </div>
    </>
  );
}

function InstructorView({ data, me }: { data: AppData; me: User }) {
  const ftl = ftlStatus(me.id, data);
  const mine = activeUsers(data, "student").filter((s) => s.instructorId === me.id);
  const pending = data.requests.filter((r) => r.status === "pending" && r.instructorId === me.id).length;
  const today = visibleTo(me, data.bookings).filter((b) => b.status === "scheduled" && bookingApproved(b) && isSameDay(new Date(b.start), new Date())).length;
  return (
    <>
      <Grid4>
        <Stat label="Bookings today" value={today} />
        <Stat label="Flight time left today" value={fmtHours(ftl.flightLeft)} hint={`Limit ${fmtHours(FTL.flightMin)}`} />
        <Stat label="Duty time left today" value={fmtHours(ftl.dutyLeft)} hint={ftl.open ? "On duty now" : "Off duty"} />
        <Stat label="Pending reschedules" value={pending} />
      </Grid4>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><Upcoming me={me} data={data} title="My upcoming lessons" /></div>
        <Section title="My currency">
          <KV k="Medical" v={<ExpiryBadge date={me.medicalExpiry} />} />
          <KV k="Instructor rating" v={<ExpiryBadge date={me.ratingExpiry} />} />
          <KV k="Students assigned" v={mine.length} />
        </Section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="My students">
          {mine.length === 0 ? <p className="text-sm text-muted-foreground">No students assigned.</p> : (
            <div className="space-y-3">{mine.map((s) => { const p = studentProgress(s.id, data); return (
              <div key={s.id} className="text-sm"><div className="mb-1 flex justify-between"><span>{s.name}</span><span className="num text-muted-foreground">{p.next ? `Next: ${p.next.name}` : "Complete"} · {p.pct}%</span></div><Bar pct={p.pct} /></div>); })}</div>
          )}
        </Section>
        <FleetAlerts data={data} />
      </div>
      <CumulativeHours person={me} />
    </>
  );
}

function GroundView({ data, me }: { data: AppData; me: User }) {
  const lk = useLookup();
  const now = new Date();
  const mine = data.lectures.filter((l) => l.instructorId === me.id);
  const upcoming = mine.filter((l) => isAfter(new Date(l.end), now)).sort((a, b) => a.start.localeCompare(b.start));
  const toSign = mine.filter((l) => !l.signedOff && !isAfter(new Date(l.end), now));
  const students = activeUsers(data, "student");
  const avgTheory = students.length ? Math.round(students.reduce((s, u) => s + theoryProgress(u.id, data).pct, 0) / students.length) : 0;
  return (
    <>
      <Grid4>
        <Stat label="Upcoming lectures" value={upcoming.length} />
        <Stat label="Awaiting sign-off" value={toSign.length} />
        <Stat label="Students" value={students.length} />
        <Stat label="Average theory progress" value={`${avgTheory}%`} />
      </Grid4>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Next lectures" action={<Link to="/portal/ground" className="text-sm text-primary hover:underline">Ground school →</Link>}>
          {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">No lectures scheduled.</p> : upcoming.slice(0, 6).map((l) => (
            <KV key={l.id} k={`${format(new Date(l.start), "EEE d MMM HH:mm")} · ${l.title}`} v={`${data.classrooms.find((c) => c.id === l.roomId)?.name ?? ""} · ${l.enrolled.length} enrolled`} />
          ))}
        </Section>
        <Section title="Theory exam progress">
          <div className="space-y-3">{students.slice(0, 8).map((s) => { const t = theoryProgress(s.id, data); return (
            <div key={s.id} className="text-sm"><div className="mb-1 flex justify-between"><span>{lk.user(s.id)?.name}</span><span className="num text-muted-foreground">{t.passed}/{t.total}</span></div><Bar pct={t.pct} /></div>); })}</div>
        </Section>
      </div>
    </>
  );
}

function StudentView({ data, me }: { data: AppData; me: User }) {
  const p = studentProgress(me.id, data);
  const t = theoryProgress(me.id, data);
  const h = hoursBreakdown(me.id, data);
  const lk = useLookup();
  return (
    <>
      <Grid4>
        <Stat label="Training progress" value={`${p.pct}%`} hint={p.program?.name} />
        <Stat label="Total flight time" value={fmtHours(h.total)} hint={`Dual ${fmtHours(h.dual)} · Solo ${fmtHours(h.solo)}`} />
        <Stat label="Theory exams passed" value={`${t.passed}/${t.total}`} />
        <Stat label="Landings (90 days)" value={h.landings90} />
      </Grid4>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><Upcoming me={me} data={data} title="My upcoming flights" /></div>
        <Section title="My training">
          <KV k="Next lesson" v={p.next?.name ?? "Syllabus complete"} />
          <KV k="Lessons done" v={`${p.completed}/${p.total}`} />
          <KV k="Instructor" v={lk.user(me.instructorId)?.name ?? "—"} />
          <KV k="Medical" v={<ExpiryBadge date={me.medicalExpiry} />} />
          <div className="mt-3"><Bar pct={p.pct} /></div>
        </Section>
      </div>
      <CumulativeHours person={me} />
    </>
  );
}

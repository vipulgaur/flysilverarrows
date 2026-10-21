import { addDays, format, isAfter, startOfWeek, subWeeks } from "date-fns";
import { CalendarClock, History, Plane, BookOpen } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Section } from "@/components/app-ui";
import { bookingApproved, visibleTo } from "@/lib/logic";
import type { AppData, User } from "@/lib/types";

const COLORS = ["var(--primary)", "var(--foreground)", "var(--muted-foreground)", "var(--destructive)"];
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)" } };

function weeks(n: number) {
  const start = startOfWeek(subWeeks(new Date(), n - 1), { weekStartsOn: 1 });
  return Array.from({ length: n }, (_, i) => addDays(start, i * 7));
}

export function DashboardInsights({ data, me }: { data: AppData; me: User }) {
  const ground = me.role === "ground";
  const flights = me.role === "student" ? data.flights.filter((f) => f.pilotId === me.id) : visibleTo(me, data.flights);
  const lectures = me.role === "admin" ? data.lectures : data.lectures.filter((l) => l.instructorId === me.id || l.enrolled.includes(me.id));
  const wk = weeks(12);

  const weekly = wk.map((w) => {
    const end = addDays(w, 7);
    const inWeek = (d: string) => { const t = new Date(d); return t >= w && t < end; };
    return {
      week: format(w, "d MMM"),
      hours: +(flights.filter((f) => inWeek(f.date)).reduce((s, f) => s + f.minutes, 0) / 60).toFixed(1),
      flights: flights.filter((f) => inWeek(f.date)).length,
      lectures: lectures.filter((l) => inWeek(l.start)).length,
    };
  });
  let run = 0;
  const cumulative = weekly.map((w) => ({ week: w.week, total: +(run += ground ? w.lectures : w.hours).toFixed(1) }));

  const kinds = ["dual", "solo", "sim"].map((k) => ({ name: k, value: +(flights.filter((f) => (f.kind ?? "dual") === k).reduce((s, f) => s + f.minutes, 0) / 60).toFixed(1) })).filter((k) => k.value > 0);
  const exams = data.exams.filter((e) => me.role === "student" ? (e as { studentId?: string }).studentId === me.id : true);
  const passed = exams.filter((e) => (e as { passed?: boolean }).passed).length;
  const pie = ground ? [{ name: "Passed", value: passed }, { name: "Not passed", value: exams.length - passed }].filter((x) => x.value > 0) : kinds;

  const now = new Date();
  const bookings = (me.role === "student" ? data.bookings.filter((b) => b.studentId === me.id) : visibleTo(me, data.bookings));
  const upcoming = [
    ...bookings.filter((b) => isAfter(new Date(b.start), now) && b.status === "scheduled" && bookingApproved(b)).map((b) => ({ id: b.id, at: b.start, title: `${b.type === "maintenance" ? "Maintenance" : b.type === "solo" ? "Solo flight" : "Flight lesson"}${b.route ? ` · ${b.route}` : ""}`, icon: Plane })),
    ...lectures.filter((l) => isAfter(new Date(l.start), now)).map((l) => ({ id: l.id, at: l.start, title: `Lecture · ${l.title}`, icon: BookOpen })),
  ].sort((a, b) => a.at.localeCompare(b.at)).slice(0, 6);
  const recent = data.activity.filter((a) => me.role === "admin" || a.actorId === me.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);

  const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title={ground ? "Lectures per week" : "Flight hours per week"}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="week" {...axis} />
                  <YAxis {...axis} width={32} allowDecimals={!ground} />
                  <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey={ground ? "lectures" : "hours"} name={ground ? "Lectures" : "Hours"} fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>
        <Section title={ground ? "Exam results" : "Time by flight type"}>
          {pie.length === 0 ? <p className="text-sm text-muted-foreground">No records yet.</p> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3} stroke="var(--card)">
                    {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tip} />
                </PieChart>
              </ResponsiveContainer>
              <div className="-mt-2 flex flex-wrap justify-center gap-3 text-xs capitalize">
                {pie.map((p, i) => <span key={p.name} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{p.name} · {p.value}</span>)}
              </div>
            </div>
          )}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title={ground ? "Cumulative lectures (12 weeks)" : "Cumulative hours (12 weeks)"}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulative}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" {...axis} />
                <YAxis {...axis} width={32} />
                <Tooltip {...tip} />
                <Line type="monotone" dataKey="total" name="Total" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Coming up" action={<CalendarClock className="h-4 w-4 text-muted-foreground" />}>
          <Timeline items={upcoming.map((u) => ({ id: u.id, when: format(new Date(u.at), "EEE d MMM · HH:mm"), title: u.title }))} empty="Nothing scheduled." />
        </Section>
        <Section title="Recent activity" action={<History className="h-4 w-4 text-muted-foreground" />}>
          <Timeline items={recent.map((a) => ({ id: a.id, when: format(new Date(a.at), "d MMM · HH:mm"), title: a.details || a.action.replace(/_/g, " "), sub: me.role === "admin" ? a.actorName : undefined }))} empty="No activity yet." />
        </Section>
      </div>
    </div>
  );
}

function Timeline({ items, empty }: { items: { id: string; when: string; title: string; sub?: string | undefined }[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ol className="relative ml-2 space-y-4 border-l border-border pl-5">
      {items.map((i) => (
        <li key={i.id} className="relative">
          <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-card bg-primary" />
          <div className="text-xs text-muted-foreground num">{i.when}</div>
          <div className="text-sm line-clamp-2">{i.title}</div>
          {i.sub && <div className="text-xs text-muted-foreground">{i.sub}</div>}
        </li>
      ))}
    </ol>
  );
}

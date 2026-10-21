import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowLeft, Check, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Empty, PageHeader, Stat } from "@/components/app-ui";
import { CumulativeHours } from "@/components/cumulative-hours";
import { ProfileEditor } from "@/components/profile-editor";
import { useLookup, useMe } from "@/lib/store";
import { can, fmtDec, fmtHours, hoursBreakdown, studentProgress, theoryProgress, uid } from "@/lib/logic";

export const Route = createFileRoute("/_shell/people/$id")({
  head: () => ({
    meta: [
      { title: "Student profile — SilverArrows" },
      { name: "description", content: "Training record, lesson sign-offs and flights for a student." },
      { property: "og:title", content: "Student profile — SilverArrows" },
      { property: "og:description", content: "Training record, lesson sign-offs and flights for a student." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentPage,
});

function StudentPage() {
  const { id } = Route.useParams();
  const { data, me, update, log } = useMe();
  const lk = useLookup();
  const s = lk.user(id);
  if (!s || s.role !== "student" || (me.role === "student" && me.id !== id)) return <Empty>Student not found.</Empty>;
  const p = studentProgress(id, data);
  const flights = data.flights.filter((f) => f.pilotId === id).sort((a, b) => b.date.localeCompare(a.date));
  const hb = hoursBreakdown(id, data);
  const soloMin = hb.solo;
  const theory = theoryProgress(id, data);

  function signOff(lessonId: string) {
    update((d) => ({ ...d, completions: [...d.completions, { id: uid(), studentId: id, lessonId, date: format(new Date(), "yyyy-MM-dd"), instructorId: me.id }] }));
    log("lesson_signed_off", "lesson", `Signed off ${lk.lesson(lessonId)?.name} for ${s!.name}`, lessonId);
    toast.success("Lesson signed off");
  }
  function undo(lessonId: string) {
    update((d) => ({ ...d, completions: d.completions.filter((c) => !(c.studentId === id && c.lessonId === lessonId)) }));
    log("lesson_signoff_removed", "lesson", `Removed sign-off of ${lk.lesson(lessonId)?.name} for ${s!.name}`, lessonId);
    toast("Sign-off removed");
  }

  return (
    <div>
      <Link to="/people" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> People</Link>
      <PageHeader title={s.name} subtitle={`${s.email} · ${p.program?.name ?? "No program"} · Instructor: ${lk.user(s.instructorId)?.name ?? "—"}`}><ProfileEditor person={s} /></PageHeader>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Progress" value={`${p.pct}%`} hint={`${p.completed} of ${p.total} lessons`} />
        <Stat label="Total hours" value={fmtHours(p.minutes)} />
        <Stat label="Solo hours" value={fmtHours(soloMin)} />
        <Stat label="Theory exams" value={`${theory.passed}/${theory.total}`} hint={`Dual ${fmtDec(hb.dual)} h · SIM ${fmtDec(hb.sim)} h · ${hb.landings} landings`} />
      </div>

      <CumulativeHours person={s} />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Syllabus</h2>
          <Progress value={p.pct} className="mb-4 h-2" />
          {!p.program ? <Empty>No program assigned.</Empty> : (
            <ol className="divide-y rounded-lg border bg-card">
              {p.program.lessons.map((l, i) => {
                const c = data.completions.find((x) => x.studentId === id && x.lessonId === l.id);
                return (
                  <li key={l.id} className="flex items-center gap-3 p-3 text-sm">
                    <span className={`num flex h-7 w-7 items-center justify-center rounded-full text-xs ${c ? "bg-success text-primary-foreground" : "bg-muted"}`}>{c ? <Check className="h-4 w-4" /> : i + 1}</span>
                    <div className="flex-1">
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.kind} · {l.minutes} min
                        {c && ` · signed off ${format(new Date(c.date), "d MMM")} by ${lk.user(c.instructorId)?.name ?? "—"}${c.grade ? ` · grade ${c.grade}` : ""}`}
                      </div>
                    </div>
                    {can.signOff(me.role) && (c ? (
                      <Button size="sm" variant="ghost" onClick={() => undo(l.id)}><Undo2 className="h-4 w-4" /></Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => signOff(l.id)}>Sign off</Button>
                    ))}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Flights</h2>
          {flights.length === 0 ? <Empty>No flights yet.</Empty> : (
            <div className="divide-y rounded-lg border bg-card">
              {flights.map((f) => (
                <div key={f.id} className="p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="num font-medium">{format(new Date(f.date), "dd MMM yy")} · {lk.aircraft(f.aircraftId)?.reg}</span>
                    <span className="num">{fmtHours(f.minutes)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                    {lk.lesson(f.lessonId)?.name ?? "Free flight"} {f.grade && <Badge variant={f.grade >= 3 ? "success" : "danger"}>Grade {f.grade}</Badge>}
                  </div>
                  {f.remarks && <p className="mt-1 italic text-muted-foreground">“{f.remarks}”</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

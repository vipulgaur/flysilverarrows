import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ClipboardCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Chip, Empty, Field, KV, NativeSelect, PageHeader, Section } from "@/components/app-ui";
import { useViewAs, ViewAsPicker, viewAsSearch } from "@/components/view-as";
import { useLookup, useMe } from "@/lib/store";
import { activeUsers, PASS_MARK, theoryProgress, uid } from "@/lib/logic";
import type { Lecture } from "@/lib/types";
import { ProfileEditor } from "@/components/profile-editor";

export const Route = createFileRoute("/_shell/portal/ground")({
  validateSearch: viewAsSearch,
  head: () => ({
    meta: [
      { title: "Ground school portal — SilverArrows" },
      { name: "description", content: "Classrooms, theory lectures, attendance and EASA PPL theory exam sign-off for ground instructors." },
      { property: "og:title", content: "Ground school portal — SilverArrows" },
      { property: "og:description", content: "Classrooms, theory lectures, attendance and exam sign-off for ground instructors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GroundPortal,
});

type Draft = { subjectId: string; title: string; date: string; t1: string; t2: string; roomId: string; enrolled: string[] };

function GroundPortal() {
  const { id } = Route.useSearch();
  const { data, me, update, log } = useMe();
  const lk = useLookup();
  const gi = useViewAs("ground", id);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [att, setAtt] = useState<{ lecture: Lecture; present: string[] } | null>(null);
  const [exam, setExam] = useState<{ studentId: string; subjectId: string; score: string } | null>(null);

  if (!gi) return <Empty>No active ground instructors.</Empty>;
  const students = activeUsers(data, "student");
  const now = new Date();
  const lectures = [...data.lectures].sort((a, b) => a.start.localeCompare(b.start));
  const upcoming = lectures.filter((l) => new Date(l.end) > now);
  const past = lectures.filter((l) => new Date(l.end) <= now).reverse();
  const subj = (sid: string) => data.subjects.find((s) => s.id === sid);
  const canAct = me.id === gi.id || me.role === "admin";

  function saveLecture() {
    if (!draft || !gi) return;
    if (!draft.title.trim()) return void toast.error("Enter a lecture title.");
    const start = new Date(`${draft.date}T${draft.t1}`);
    const end = new Date(`${draft.date}T${draft.t2}`);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return void toast.error("Enter a valid date and time.");
    if (end <= start) return void toast.error("End must be after start.");
    const room = data.classrooms.find((r) => r.id === draft.roomId);
    if (!room) return void toast.error("Select an available classroom.");
    if (!data.subjects.some((s) => s.id === draft.subjectId)) return void toast.error("Select an available subject.");
    if (draft.enrolled.length > room.capacity) return void toast.error(`${room.name} holds ${room.capacity} students.`);
    const clash = data.lectures.find((l) => l.roomId === room.id && new Date(l.start) < end && start < new Date(l.end));
    if (clash) return void toast.error(`${room.name} is booked for “${clash.title}”.`);
    const l: Lecture = { id: `LC-${uid().slice(0, 4).toUpperCase()}`, subjectId: draft.subjectId, title: draft.title.trim(), start: start.toISOString(), end: end.toISOString(), roomId: room.id, instructorId: gi.id, enrolled: draft.enrolled, attended: [], signedOff: false };
    update((d) => ({ ...d, lectures: [...d.lectures, l] }));
    log("lecture_scheduled", "lecture", `Scheduled ${l.title} in ${room.name} on ${format(start, "dd.MM.yyyy HH:mm")} (${l.enrolled.length} students)`, l.id);
    toast.success("Lecture scheduled");
    setDraft(null);
  }

  function saveAttendance() {
    if (!att) return;
    update((d) => ({ ...d, lectures: d.lectures.map((l) => (l.id === att.lecture.id ? { ...l, attended: att.present, signedOff: true } : l)) }));
    log("attendance_signed", "lecture", `Signed off attendance for ${att.lecture.title}: ${att.present.length}/${att.lecture.enrolled.length} present`, att.lecture.id);
    toast.success("Attendance recorded");
    setAtt(null);
  }

  function saveExam() {
    if (!exam || !gi) return;
    if (!data.subjects.some((s) => s.id === exam.subjectId)) return void toast.error("Select an available subject.");
    const score = Number(exam.score);
    if (!exam.studentId || Number.isNaN(score) || score < 0 || score > 100) return void toast.error("Enter a score from 0 to 100.");
    const passed = score >= PASS_MARK;
    update((d) => ({ ...d, exams: [...d.exams, { id: uid(), studentId: exam.studentId, subjectId: exam.subjectId, score, passed, signedBy: me.id, date: format(new Date(), "yyyy-MM-dd") }] }));
    log(passed ? "theory_exam_passed" : "theory_exam_failed", "exam", `${passed ? "Signed off" : "Recorded fail for"} ${subj(exam.subjectId)?.name} exam for ${lk.user(exam.studentId)?.name} (${score}%)`, exam.studentId);
    toast.success(passed ? "Exam passed — student progress updated" : `Below pass mark (${PASS_MARK}%) — recorded`);
    setExam(null);
  }

  return (
    <div>
      <PageHeader title="Ground school portal" subtitle={`${gi.name} (${gi.callsign ?? "—"}) · ${gi.stage ?? "Ground Instructor"}`}>
        <ViewAsPicker role="ground" current={gi} to="/portal/ground" />
        <ProfileEditor person={gi} />
        {canAct && <Button disabled={!data.subjects.length || !data.classrooms.length} onClick={() => {
          const subject = data.subjects[0];
          const room = data.classrooms[0];
          if (!subject || !room) return;
          setDraft({ subjectId: subject.id, title: "", date: format(new Date(Date.now() + 86400000), "yyyy-MM-dd"), t1: "09:00", t2: "11:00", roomId: room.id, enrolled: [] });
        }}><Plus className="h-4 w-4" /> Schedule lecture</Button>}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Instructor profile">
          <KV k="Role" v="Ground Instructor" />
          <KV k="Speciality" v={gi.speciality ?? "—"} />
          <KV k="Lectures delivered" v={<span className="num">{past.filter((l) => l.signedOff).length}</span>} />
          <KV k="Exams signed" v={<span className="num">{data.exams.filter((e) => e.signedBy === gi.id).length}</span>} />
        </Section>
        <Section title="Classrooms">
          {data.classrooms.map((r) => {
            const next = upcoming.find((l) => l.roomId === r.id);
            return (
              <div key={r.id} className="py-1.5 text-sm">
                <div className="flex justify-between"><span className="font-medium">{r.name}</span><span className="num text-muted-foreground">cap. {r.capacity}</span></div>
                <div className="text-xs text-muted-foreground">{next ? `Next: ${next.title} · ${format(new Date(next.start), "dd.MM HH:mm")}` : "Free"}</div>
              </div>
            );
          })}
        </Section>
        <Section title="Ground school syllabus">
          <KV k="Course" v="EASA PPL(A) 9-subject theory" />
          <KV k="Pass mark" v={<span className="num">{PASS_MARK}%</span>} />
          <KV k="Students enrolled" v={<span className="num">{students.length}</span>} />
          <KV k="Upcoming lectures" v={<span className="num">{upcoming.length}</span>} />
        </Section>
      </div>

      <Section title="Scheduled lectures & attendance sign-off" className="mt-4">
        {lectures.length === 0 ? <p className="text-sm text-muted-foreground">No lectures.</p> : (
          <ul className="divide-y">
            {[...upcoming, ...past].map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-3 text-sm">
                <div className="flex-1">
                  <div className="font-medium">{l.title} <span className="text-muted-foreground">· {subj(l.subjectId)?.name}</span></div>
                  <div className="num text-muted-foreground">{format(new Date(l.start), "dd.MM.yyyy HH:mm")}–{format(new Date(l.end), "HH:mm")} · {data.classrooms.find((c) => c.id === l.roomId)?.name} · {l.enrolled.length} enrolled</div>
                </div>
                {l.signedOff ? <Chip tone="ok">Signed off · {l.attended.length}/{l.enrolled.length} present</Chip> : canAct && (
                  <Button size="sm" variant="outline" onClick={() => setAtt({ lecture: l, present: [...l.enrolled] })}><ClipboardCheck className="h-4 w-4" /> Take attendance</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Theoretical exam validation ledger" className="mt-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                {data.subjects.map((s) => <TableHead key={s.id} title={s.name} className="text-center">{s.code}</TableHead>)}
                <TableHead>Progress</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((st) => {
                const t = theoryProgress(st.id, data);
                return (
                  <TableRow key={st.id}>
                    <TableCell className="font-medium">{st.name}</TableCell>
                    {data.subjects.map((s) => {
                      const r = t.best.get(s.id);
                      return <TableCell key={s.id} className="text-center">{r ? <Chip tone={r.passed ? "ok" : "expired"}>{r.score}%{r.passed ? " P" : ""}</Chip> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>;
                    })}
                    <TableCell className="num">{t.passed}/{t.total}</TableCell>
                    <TableCell>{canAct && <Button disabled={!data.subjects.length} size="sm" variant="ghost" onClick={() => {
                      const subject = data.subjects.find((s) => !t.best.get(s.id)?.passed) ?? data.subjects[0];
                      if (!subject) return;
                      setExam({ studentId: st.id, subjectId: subject.id, score: "" });
                    }}>Sign</Button>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Schedule lecture</DialogTitle></DialogHeader>
          {draft && (
            <div className="grid grid-cols-3 gap-4">
              <Field label="Subject" className="col-span-3">
                <NativeSelect value={draft.subjectId} onChange={(e) => setDraft({ ...draft, subjectId: e.target.value })}>
                  {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Title" className="col-span-3"><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="MET-02 Clouds & precipitation" /></Field>
              <Field label="Date"><Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
              <Field label="From"><Input type="time" value={draft.t1} onChange={(e) => setDraft({ ...draft, t1: e.target.value })} /></Field>
              <Field label="To"><Input type="time" value={draft.t2} onChange={(e) => setDraft({ ...draft, t2: e.target.value })} /></Field>
              <Field label="Room" className="col-span-3">
                <NativeSelect value={draft.roomId} onChange={(e) => setDraft({ ...draft, roomId: e.target.value })}>
                  {data.classrooms.map((r) => <option key={r.id} value={r.id}>{r.name} (capacity {r.capacity})</option>)}
                </NativeSelect>
              </Field>
              <Field label="Enrol students" className="col-span-3">
                <div className="grid grid-cols-2 gap-2">
                  {students.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={draft.enrolled.includes(s.id)} onCheckedChange={(v) => setDraft({ ...draft, enrolled: v ? [...draft.enrolled, s.id] : draft.enrolled.filter((x) => x !== s.id) })} /> {s.name}
                    </label>
                  ))}
                </div>
              </Field>
            </div>
          )}
          <DialogFooter><Button onClick={saveLecture}>Schedule</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!att} onOpenChange={(o) => !o && setAtt(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Attendance — {att?.lecture.title}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {att?.lecture.enrolled.map((sid) => (
              <label key={sid} className="flex items-center gap-2 text-sm">
                <Checkbox checked={att.present.includes(sid)} onCheckedChange={(v) => setAtt({ ...att, present: v ? [...att.present, sid] : att.present.filter((x) => x !== sid) })} />
                {lk.user(sid)?.name ?? "Unknown"}
              </label>
            ))}
          </div>
          <DialogFooter><Button onClick={saveAttendance}>Sign off attendance</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!exam} onOpenChange={(o) => !o && setExam(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record theory exam — {lk.user(exam?.studentId)?.name}</DialogTitle></DialogHeader>
          {exam && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Subject">
                <NativeSelect value={exam.subjectId} onChange={(e) => setExam({ ...exam, subjectId: e.target.value })}>
                  {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                </NativeSelect>
              </Field>
              <Field label={`Score % (pass ${PASS_MARK})`}><Input type="number" min={0} max={100} value={exam.score} onChange={(e) => setExam({ ...exam, score: e.target.value })} /></Field>
            </div>
          )}
          <DialogFooter><Button onClick={saveExam}>Sign off</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

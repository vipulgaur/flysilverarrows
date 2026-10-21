import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Field, NativeSelect, PageHeader } from "@/components/app-ui";
import { useLookup, useMe } from "@/lib/store";
import { can, fmtHours, softDeleteUser, studentProgress, theoryProgress, submitProfileRequest, uid } from "@/lib/logic";
import type { Role, User } from "@/lib/types";

export const Route = createFileRoute("/_shell/people/")({
  head: () => ({
    meta: [
      { title: "People — SilverArrows" },
      { name: "description", content: "Students and instructors at your flight school." },
      { property: "og:title", content: "People — SilverArrows" },
      { property: "og:description", content: "Students and instructors at your flight school." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: People,
});

function People() {
  const { data, me, update, log, commit } = useMe();
  const lk = useLookup();
  const [edit, setEdit] = useState<Partial<User> | null>(null);
  const admin = can.manageUsers(me.role);
  const live = data.users.filter((u) => u.status !== "deleted");
  const students = live.filter((u) => u.role === "student" && (me.role !== "student" || u.id === me.id));
  const instructors = live.filter((u) => u.role === "instructor");
  const grounds = live.filter((u) => u.role === "ground");

  function save() {
    if (!admin) return void toast.error("Only administrators can manage users.");
    if (!edit?.name?.trim() || !edit.email?.trim()) return void toast.error("Name and email are required.");
    const u = { status: "active", ...edit, id: edit.id ?? uid() } as User;
    if (edit.id) {
      const result = submitProfileRequest(data, me, u.id, { name: u.name, email: u.email, callsign: u.callsign, medicalExpiry: u.medicalExpiry, licence: u.licence, speciality: u.speciality });
      if (typeof result === "string" && result !== "No profile changes to submit.") return void toast.error(result);
      const base = typeof result === "string" ? data : result;
      commit({ ...base, users: base.users.map((x) => x.id === u.id ? { ...x, programId: u.programId, instructorId: u.instructorId } : x) });
      log("profile_updated_by_admin", "user", `Updated profile for ${u.name}`, u.id);
      toast.success("Saved");
      setEdit(null);
      return;
    }
    log(edit.id ? "user_updated" : "user_created", "user", `${edit.id ? "Updated" : "Created"} ${u.name} (${u.role})`, u.id);
    update((d) => ({ ...d, users: d.users.some((x) => x.id === u.id) ? d.users.map((x) => (x.id === u.id ? u : x)) : [...d.users, u] }));
    toast.success(edit.id ? "Saved" : `${u.name} added`);
    setEdit(null);
  }

  function remove(u: User) {
    if (!confirm(`Soft-delete ${u.name}? History is preserved and an admin can restore them.`)) return;
    const err = commit(softDeleteUser(data, u.id, me));
    if (err) return void toast.error(err);
    log("user_soft_deleted", "user", `Soft-deleted ${u.name} (${u.role})`, u.id);
    toast("Moved to deleted archive");
  }

  const actions = (u: User) =>
    admin && (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEdit(u)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove(u)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    );

  const add = (role: Role) => setEdit({ role, ...(role === "student" ? { programId: data.programs[0]?.id } : {}) });

  return (
    <div>
      <PageHeader title="People" subtitle="Students, instructors and training status" />
      <Tabs defaultValue="students">
        <div className="mb-4 flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
            <TabsTrigger value="instructors">Flight instructors ({instructors.length})</TabsTrigger>
            <TabsTrigger value="ground">Ground instructors ({grounds.length})</TabsTrigger>
          </TabsList>
          {admin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => add("ground")}><Plus className="h-4 w-4" /> Ground instructor</Button>
              <Button variant="outline" onClick={() => add("instructor")}><Plus className="h-4 w-4" /> CFI</Button>
              <Button onClick={() => add("student")}><Plus className="h-4 w-4" /> Student</Button>
            </div>
          )}
        </div>
        <TabsContent value="students">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Program</TableHead><TableHead>Instructor</TableHead><TableHead className="w-48">Flight syllabus</TableHead><TableHead>Theory</TableHead><TableHead>Hours</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {students.map((s) => {
                  const p = studentProgress(s.id, data);
                  return (
                    <TableRow key={s.id}>
                      <TableCell><Link to="/people/$id" params={{ id: s.id }} className="font-medium text-primary hover:underline">{s.name}</Link><div className="text-xs text-muted-foreground">{s.email}</div></TableCell>
                      <TableCell>{p.program?.name ?? "—"}</TableCell>
                      <TableCell>{lk.user(s.instructorId)?.name ?? "—"}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><Progress value={p.pct} className="h-2" /><span className="num text-xs">{p.completed}/{p.total}</span></div></TableCell>
                      <TableCell className="num text-xs">{theoryProgress(s.id, data).passed}/{data.subjects.length}</TableCell>
                      <TableCell className="num">{fmtHours(p.minutes)}</TableCell>
                      <TableCell>{actions(s)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="instructors">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Licence</TableHead><TableHead>Students</TableHead><TableHead>Hours instructed</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {instructors.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell><span className="font-medium">{i.name}</span><div className="text-xs text-muted-foreground">{i.email}</div></TableCell>
                    <TableCell>{i.licence ?? "—"}</TableCell>
                    <TableCell className="num">{data.users.filter((u) => u.instructorId === i.id).length}</TableCell>
                    <TableCell className="num">{fmtHours(data.flights.filter((f) => f.instructorId === i.id).reduce((s, f) => s + f.minutes, 0))}</TableCell>
                    <TableCell>{actions(i)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="ground">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Speciality</TableHead><TableHead>Lectures</TableHead><TableHead>Exams signed</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {grounds.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell><span className="font-medium">{g.name}</span><div className="text-xs text-muted-foreground">{g.email}</div></TableCell>
                    <TableCell>{g.speciality ?? "—"}</TableCell>
                    <TableCell className="num">{data.lectures.filter((l) => l.instructorId === g.id).length}</TableCell>
                    <TableCell className="num">{data.exams.filter((e) => e.signedBy === g.id).length}</TableCell>
                    <TableCell>{actions(g)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Edit" : "Add"} {edit?.role === "instructor" ? "flight instructor" : edit?.role === "ground" ? "ground instructor" : edit?.role}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-4">
              <Field label="Full name"><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={edit.email ?? ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Call sign"><Input maxLength={3} className="uppercase" value={edit.callsign ?? ""} onChange={(e) => setEdit({ ...edit, callsign: e.target.value.toUpperCase() })} /></Field>
                <Field label="Medical expiry"><Input type="date" value={edit.medicalExpiry ?? ""} onChange={(e) => setEdit({ ...edit, medicalExpiry: e.target.value || undefined })} /></Field>
              </div>
              {edit.role === "ground" ? (
                <Field label="Subject speciality"><Input value={edit.speciality ?? ""} onChange={(e) => setEdit({ ...edit, speciality: e.target.value })} /></Field>
              ) : edit.role === "instructor" ? (
                <Field label="Licence / ratings"><Input value={edit.licence ?? ""} onChange={(e) => setEdit({ ...edit, licence: e.target.value })} /></Field>
              ) : (
                <>
                  <Field label="Training program">
                    <NativeSelect value={edit.programId ?? ""} onChange={(e) => setEdit({ ...edit, programId: e.target.value || undefined })}>
                      <option value="">—</option>
                      {data.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label="Primary instructor">
                    <NativeSelect value={edit.instructorId ?? ""} onChange={(e) => setEdit({ ...edit, instructorId: e.target.value || undefined })}>
                      <option value="">—</option>
                      {instructors.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </NativeSelect>
                  </Field>
                </>
              )}
            </div>
          )}
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

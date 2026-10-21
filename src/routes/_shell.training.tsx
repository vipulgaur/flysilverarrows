import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, PageHeader } from "@/components/app-ui";
import { useMe } from "@/lib/store";
import { can, uid } from "@/lib/logic";
import type { Lesson } from "@/lib/types";

export const Route = createFileRoute("/_shell/training")({
  head: () => ({
    meta: [
      { title: "Training programs — SilverArrows" },
      { name: "description", content: "Training programs and lesson syllabi for your school." },
      { property: "og:title", content: "Training programs — SilverArrows" },
      { property: "og:description", content: "Training programs and lesson syllabi for your school." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Training,
});

function Training() {
  const { data, me, update, log } = useMe();
  const admin = can.managePrograms(me.role);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState<Record<string, Partial<Lesson>>>({});

  function addProgram() {
    if (!name.trim()) return void toast.error("Enter a program name.");
    update((d) => ({ ...d, programs: [...d.programs, { id: uid(), name: name.trim(), lessons: [] }] }));
    setName("");
    log("program_created", "program", `Created program ${name.trim()}`);
    toast.success("Program created");
  }
  function addLesson(pid: string) {
    const l = draft[pid];
    if (!l?.name?.trim()) return void toast.error("Enter a lesson name.");
    const lesson: Lesson = { id: uid(), name: l.name.trim(), kind: l.kind ?? "flight", minutes: Number(l.minutes) || 60 };
    update((d) => ({ ...d, programs: d.programs.map((p) => (p.id === pid ? { ...p, lessons: [...p.lessons, lesson] } : p)) }));
    setDraft((x) => ({ ...x, [pid]: {} }));
    log("lesson_added", "program", `Added lesson ${lesson.name}`);
  }
  function removeLesson(pid: string, lid: string) {
    update((d) => ({
      ...d,
      programs: d.programs.map((p) => (p.id === pid ? { ...p, lessons: p.lessons.filter((l) => l.id !== lid) } : p)),
      completions: d.completions.filter((c) => c.lessonId !== lid),
    }));
  }
  function removeProgram(pid: string) {
    if (data.users.some((u) => u.programId === pid)) return void toast.error("Students are enrolled in this program.");
    if (!confirm("Delete program?")) return;
    update((d) => ({ ...d, programs: d.programs.filter((p) => p.id !== pid) }));
  }

  return (
    <div>
      <PageHeader title="Training programs" subtitle="Syllabi used for lesson booking and sign-off">
        {admin && (
          <>
            <Input placeholder="New program name" value={name} onChange={(e) => setName(e.target.value)} className="w-56" />
            <Button onClick={addProgram}><Plus className="h-4 w-4" /> Program</Button>
          </>
        )}
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        {data.programs.map((p) => (
          <section key={p.id} className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {p.lessons.length} lessons · {data.users.filter((u) => u.programId === p.id).length} students enrolled
                </p>
              </div>
              {admin && <Button variant="ghost" size="icon" aria-label="Delete program" onClick={() => removeProgram(p.id)}><Trash2 className="h-4 w-4" /></Button>}
            </div>
            <ol className="divide-y">
              {p.lessons.map((l, i) => (
                <li key={l.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="num w-6 text-muted-foreground">{i + 1}</span>
                  <span className="flex-1">{l.name}</span>
                  <span className="text-xs capitalize text-muted-foreground">{l.kind} · {l.minutes}m</span>
                  {admin && <Button variant="ghost" size="icon" aria-label="Remove lesson" onClick={() => removeLesson(p.id, l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </li>
              ))}
            </ol>
            {admin && (
              <div className="flex gap-2 border-t p-3">
                <Input placeholder="Lesson name" value={draft[p.id]?.name ?? ""} onChange={(e) => setDraft((x) => ({ ...x, [p.id]: { ...x[p.id], name: e.target.value } }))} />
                <NativeSelect className="w-28" value={draft[p.id]?.kind ?? "flight"} onChange={(e) => setDraft((x) => ({ ...x, [p.id]: { ...x[p.id], kind: e.target.value as Lesson["kind"] } }))}>
                  <option value="flight">Flight</option><option value="ground">Ground</option>
                </NativeSelect>
                <Input type="number" className="w-20" placeholder="min" value={draft[p.id]?.minutes ?? ""} onChange={(e) => setDraft((x) => ({ ...x, [p.id]: { ...x[p.id], minutes: Number(e.target.value) } }))} />
                <Button variant="secondary" onClick={() => addLesson(p.id)}>Add</Button>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

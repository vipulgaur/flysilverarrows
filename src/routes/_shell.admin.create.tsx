import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, PageHeader, Section } from "@/components/app-ui";
import { useMe } from "@/lib/store";
import { NewStudentForm } from "@/components/new-student-form";
import { activeUsers, uid } from "@/lib/logic";
import { roleLabel, type Aircraft, type Role, type User } from "@/lib/types";

export const Route = createFileRoute("/_shell/admin/create")({
  head: () => ({
    meta: [
      { title: "Master entity creation — SilverArrows" },
      { name: "description", content: "Batch-create aircraft and users across all roles." },
      { property: "og:title", content: "Master entity creation — SilverArrows" },
      { property: "og:description", content: "Batch-create aircraft and users across all roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreateEntities,
});

type AcRow = { reg: string; type: string; rate: string; hours: string };
type UserRow = { name: string; email: string; role: Role; callsign: string; programId: string; instructorId: string; medicalExpiry: string };

const emptyAc = (): AcRow => ({ reg: "", type: "Cessna 172S", rate: "220", hours: "0" });
const emptyUser = (): UserRow => ({ name: "", email: "", role: "student", callsign: "", programId: "p-ppl", instructorId: "", medicalExpiry: "" });

function CreateEntities() {
  const { data, update, log } = useMe();
  const [acs, setAcs] = useState<AcRow[]>([emptyAc()]);
  const [users, setUsers] = useState<UserRow[]>([emptyUser()]);
  const cfis = activeUsers(data, "instructor");

  function createAll() {
    const acFilled = acs.filter((a) => a.reg.trim());
    const usFilled = users.filter((u) => u.name.trim());
    if (!acFilled.length && !usFilled.length) return void toast.error("Fill at least one row.");
    const regs = new Set(data.aircraft.map((a) => a.reg));
    for (const a of acFilled) {
      const reg = a.reg.trim().toUpperCase();
      if (regs.has(reg)) return void toast.error(`${reg} already exists.`);
      regs.add(reg);
    }
    const emails = new Set(data.users.map((u) => u.email.toLowerCase()));
    for (const u of usFilled) {
      if (!/^\S+@\S+\.\S+$/.test(u.email)) return void toast.error(`Valid email needed for ${u.name}.`);
      if (emails.has(u.email.toLowerCase())) return void toast.error(`${u.email} is already used.`);
      emails.add(u.email.toLowerCase());
    }
    const newAc: Aircraft[] = acFilled.map((a) => ({ id: uid(), reg: a.reg.trim().toUpperCase(), type: a.type, hourlyRate: Number(a.rate) || 0, totalHours: Number(a.hours) || 0, tachHours: Number(a.hours) || 0, grounded: false }));
    const newUsers: User[] = usFilled.map((u) => ({
      id: uid(), name: u.name.trim(), email: u.email.trim(), role: u.role, status: "active",
      callsign: u.callsign.trim().toUpperCase() || u.name.trim().slice(0, 3).toUpperCase(),
      ...(u.role === "student" ? { programId: u.programId || undefined, instructorId: u.instructorId || undefined, medicalClass: 2 as const } : {}),
      ...(u.role === "instructor" ? { medicalClass: 1 as const } : {}),
      medicalExpiry: u.medicalExpiry || undefined,
    }));
    update((d) => ({ ...d, aircraft: [...d.aircraft, ...newAc], users: [...d.users, ...newUsers] }));
    log("batch_entities_created", "user", `Created ${newAc.length} aircraft${newAc.length ? ` (${newAc.map((a) => a.reg).join(", ")})` : ""} and ${newUsers.length} users${newUsers.length ? ` (${newUsers.map((u) => u.name).join(", ")})` : ""} via batch tool`);
    toast.success(`Created ${newAc.length} aircraft and ${newUsers.length} users`);
    setAcs([emptyAc()]);
    setUsers([emptyUser()]);
  }

  const setA = (i: number, k: keyof AcRow, v: string) => setAcs(acs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const setU = (i: number, k: keyof UserRow, v: string) => setUsers(users.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  return (
    <div>
      <PageHeader title="Master entity creation" subtitle="Add aircraft and users in one batch. Blank rows are ignored.">
        <Button onClick={createAll}>Create all</Button>
      </PageHeader>

      <NewStudentForm />

      <Section title="Aircraft" className="mt-4" action={<Button size="sm" variant="outline" onClick={() => setAcs([...acs, emptyAc()])}><Plus className="h-4 w-4" /> Row</Button>}>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_40px] gap-2 text-xs text-muted-foreground"><span>Registration</span><span>Type</span><span>Rate €/h</span><span>Airframe hours</span><span /></div>
          {acs.map((a, i) => (
            <div key={i} className="grid grid-cols-[1fr_1.5fr_1fr_1fr_40px] gap-2">
              <Input aria-label="Registration" placeholder="OY-DDD" className="uppercase" value={a.reg} onChange={(e) => setA(i, "reg", e.target.value)} />
              <Input aria-label="Type" value={a.type} onChange={(e) => setA(i, "type", e.target.value)} />
              <Input type="number" value={a.rate} onChange={(e) => setA(i, "rate", e.target.value)} />
              <Input type="number" step="0.1" value={a.hours} onChange={(e) => setA(i, "hours", e.target.value)} />
              <Button variant="ghost" size="icon" aria-label="Remove row" onClick={() => setAcs(acs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Users" className="mt-4" action={<Button size="sm" variant="outline" onClick={() => setUsers([...users, emptyUser()])}><Plus className="h-4 w-4" /> Row</Button>}>
        <div className="space-y-2">
          <div className="grid grid-cols-[1.4fr_1.4fr_1.2fr_0.6fr_1.2fr_1.2fr_1fr_40px] gap-2 text-xs text-muted-foreground"><span>Full name</span><span>Email</span><span>Role</span><span>Call sign</span><span>Program</span><span>Instructor</span><span>Medical expiry</span><span /></div>
          {users.map((u, i) => (
            <div key={i} className="grid grid-cols-[1.4fr_1.4fr_1.2fr_0.6fr_1.2fr_1.2fr_1fr_40px] gap-2">
              <Input aria-label="Full name" value={u.name} onChange={(e) => setU(i, "name", e.target.value)} />
              <Input aria-label="Email" type="email" value={u.email} onChange={(e) => setU(i, "email", e.target.value)} />
              <NativeSelect aria-label="Role" value={u.role} onChange={(e) => setU(i, "role", e.target.value)}>
                {(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
              </NativeSelect>
              <Input maxLength={3} className="uppercase" value={u.callsign} onChange={(e) => setU(i, "callsign", e.target.value)} />
              <NativeSelect disabled={u.role !== "student"} value={u.programId} onChange={(e) => setU(i, "programId", e.target.value)}>
                <option value="">—</option>
                {data.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </NativeSelect>
              <NativeSelect disabled={u.role !== "student"} value={u.instructorId} onChange={(e) => setU(i, "instructorId", e.target.value)}>
                <option value="">—</option>
                {cfis.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </NativeSelect>
              <Input type="date" value={u.medicalExpiry} onChange={(e) => setU(i, "medicalExpiry", e.target.value)} />
              <Button variant="ghost" size="icon" aria-label="Remove row" onClick={() => setUsers(users.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

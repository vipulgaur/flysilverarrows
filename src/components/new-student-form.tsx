import { useState } from "react";
import { Siren, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect, Section } from "@/components/app-ui";
import { ProfileFieldInput } from "@/components/profile-editor";
import { activeUsers, PROFILE_FIELDS, profileProblem, uid } from "@/lib/logic";
import { useMe } from "@/lib/store";
import type { ProfileChanges, User } from "@/lib/types";

const LEFT: (keyof ProfileChanges)[] = ["phone", "address", "postCode", "city", "country", "dateOfBirth", "gender", "placeOfBirth", "userReference", "caaRef"];
const NOTES: (keyof ProfileChanges)[] = ["publicNote", "adminNote", "instructorNote"];
const EMERGENCY: (keyof ProfileChanges)[] = ["emergencyName", "emergencyPhone", "emergencyRelation"];

export function NewStudentForm() {
  const { data, update, log } = useMe();
  const [f, setF] = useState<Record<string, string>>({ programId: "p-ppl" });
  const [emergency, setEmergency] = useState(false);
  const set = (k: string) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const cfis = activeUsers(data, "instructor");

  function create() {
    const first = (f["firstName"] ?? "").trim(), last = (f["lastName"] ?? "").trim(), callsign = (f["callsign"] ?? "").trim().toUpperCase();
    if (!first || !last) return void toast.error("Enter first and last name.");
    if (!callsign) return void toast.error("Enter a call sign.");
    const details: ProfileChanges = { email: (f["email"] ?? "").trim(), name: `${first} ${last}` };
    for (const k of [...LEFT, ...NOTES, ...(emergency ? EMERGENCY : [])]) if (f[k]?.trim()) Object.assign(details, { [k]: f[k]?.trim() });
    const draft: User = { id: uid(), name: "", email: "", role: "student", status: "active" };
    const problem = profileProblem(details, draft, data);
    if (problem) return void toast.error(problem);
    const user: User = { ...draft, ...details, callsign, medicalClass: 2, programId: f["programId"] || undefined, instructorId: f["instructorId"] || undefined } as User;
    update((d) => ({ ...d, users: [...d.users, user] }));
    log("student_created", "user", `Created student ${user.name} (${callsign})`, user.id);
    toast.success(`Student ${user.name} created`);
    setF({ programId: "p-ppl" });
    setEmergency(false);
  }

  const row = (k: string, label: string, node: React.ReactNode) => (
    <div key={k} className="grid items-center gap-1.5 sm:grid-cols-[150px_1fr] sm:gap-3">
      <Label htmlFor={`ns-${k}`} className="sm:text-right">{label}</Label>{node}
    </div>
  );
  const field = (k: keyof ProfileChanges) => row(k, PROFILE_FIELDS[k], <ProfileFieldInput id={`ns-${k}`} field={k} value={f[k] ?? ""} onChange={set(k)} />);
  const text = (k: string, label: string, type = "text") => row(k, `* ${label}`, <Input id={`ns-${k}`} type={type} required maxLength={200} className={k === "callsign" ? "uppercase" : ""} value={f[k] ?? ""} onChange={(e) => set(k)(e.target.value)} />);

  return (
    <Section title="New student" className="mt-4" action={<Button size="sm" onClick={create}><UserPlus className="h-4 w-4" /> Create student</Button>}>
      <form onSubmit={(e) => { e.preventDefault(); create(); }} className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {text("email", "Email", "email")}
          {text("callsign", "Call sign")}
          {text("firstName", "First name")}
          {text("lastName", "Last name")}
          {LEFT.map(field)}
          {row("programId", "Program", <NativeSelect id="ns-programId" value={f["programId"] ?? ""} onChange={(e) => set("programId")(e.target.value)}><option value="">—</option>{data.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</NativeSelect>)}
          {row("instructorId", "Instructor", <NativeSelect id="ns-instructorId" value={f["instructorId"] ?? ""} onChange={(e) => set("instructorId")(e.target.value)}><option value="">—</option>{cfis.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect>)}
          <div className="sm:pl-[162px]">
            <Button type="button" variant="outline" className="w-full" onClick={() => setEmergency(!emergency)}><Siren className="h-4 w-4" /> {emergency ? "Remove emergency contact" : "Add emergency contact"}</Button>
          </div>
          {emergency && EMERGENCY.map(field)}
        </div>
        <div className="space-y-3">{NOTES.map(field)}</div>
        <button type="submit" hidden />
      </form>
    </Section>
  );
}

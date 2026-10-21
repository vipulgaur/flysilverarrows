import { useState } from "react";
import { Pencil, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/app-ui";
import { GENDERS, NOTE_FIELDS, PROFILE_FIELDS, STAFF_ONLY_FIELDS, submitProfileRequest } from "@/lib/logic";
import { useMe } from "@/lib/store";
import { STUDENT_DETAIL_KEYS, type ProfileChanges, type User } from "@/lib/types";

export const COUNTRIES = ["India", "Denmark", "United Kingdom", "United States", "Germany", "France", "Sweden", "Norway", "Spain", "Italy", "Netherlands", "Australia", "Canada", "United Arab Emirates", "Other"];

/** One input for a profile field; shared by the edit dialog and the new-student form. */
export function ProfileFieldInput({ id, field, value, onChange, required }: { id: string; field: keyof ProfileChanges; value: string; onChange: (v: string) => void; required?: boolean }) {
  if (field === "medicalClass" || field === "icaoLevel") return (
    <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Not on file</option>
      {(field === "medicalClass" ? [1, 2] : [1, 2, 3, 4, 5, 6]).map((n) => <option key={n} value={n}>{n}</option>)}
    </NativeSelect>
  );
  if (field === "gender" || field === "country") return (
    <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {(field === "gender" ? GENDERS : COUNTRIES).map((o) => <option key={o} value={o}>{o}</option>)}
    </NativeSelect>
  );
  if ((NOTE_FIELDS as readonly string[]).includes(field)) return <Textarea id={id} rows={3} maxLength={2000} value={value} onChange={(e) => onChange(e.target.value)} />;
  const type = field.endsWith("Expiry") || field === "dateOfBirth" ? "date" : field === "email" ? "email" : field === "phone" || field === "emergencyPhone" ? "tel" : "text";
  return <Input id={id} type={type} maxLength={200} required={required} value={value} onChange={(e) => onChange(e.target.value)} />;
}

export function ProfileEditor({ person }: { person: User }) {
  const { data, me, commit, log } = useMe();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  if (me.id !== person.id && me.role !== "admin") return null;
  const pending = data.profileRequests.some((r) => r.userId === person.id && r.status === "pending");
  const fields = (Object.keys(PROFILE_FIELDS) as (keyof ProfileChanges)[]).filter((key) => {
    if (person.role === "admin") return ["name", "email", "phone", "callsign"].includes(key);
    if ((STUDENT_DETAIL_KEYS as readonly string[]).includes(key)) {
      if (person.role !== "student") return false;
      return me.role === "admin" || !(STAFF_ONLY_FIELDS as readonly string[]).includes(key);
    }
    if (key === "speciality") return person.role === "ground";
    if (key === "ratingExpiry") return person.role === "instructor";
    return true;
  });
  function save() {
    const changes: ProfileChanges = {};
    for (const key of fields) {
      const value = draft[key] ?? "";
      Object.assign(changes, { [key]: key === "medicalClass" || key === "icaoLevel" ? (value ? Number(value) : undefined) : value });
    }
    const result = submitProfileRequest(data, me, person.id, changes);
    const error = commit(result);
    if (error) return void toast.error(error);
    log(me.role === "admin" ? "profile_updated_by_admin" : "profile_change_requested", "user", `${me.role === "admin" ? "Updated" : "Requested changes to"} profile for ${person.name}`, person.id);
    toast.success(me.role === "admin" ? "Profile updated" : "Request sent to admin — profile unchanged until approved");
    setOpen(false);
  }
  return (
    <>
      <Button variant="outline" size="sm" disabled={pending} onClick={() => {
        setDraft(Object.fromEntries(fields.map((key) => [key, String(person[key] ?? "")])));
        setOpen(true);
      }}><Pencil className="h-4 w-4" /> {pending ? "Profile change pending" : "Edit profile"}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit profile — {person.name}</DialogTitle>
            <DialogDescription>{me.role === "admin" ? "Administrator changes are approved immediately." : "Changes appear on your profile only after administrator approval."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((key) => (
                <div key={key} className={`space-y-1.5 ${(NOTE_FIELDS as readonly string[]).includes(key) ? "sm:col-span-2" : ""}`}>
                  <Label htmlFor={`profile-${key}`}>{PROFILE_FIELDS[key]}</Label>
                  <ProfileFieldInput id={`profile-${key}`} field={key} value={draft[key] ?? ""} required={key === "name" || key === "email"} onChange={(v) => setDraft({ ...draft, [key]: v })} />
                </div>
              ))}
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit"><Send className="h-4 w-4" /> {me.role === "admin" ? "Save profile" : "Submit for approval"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

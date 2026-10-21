import { useRef, useState } from "react";
import { Camera, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect, Section } from "@/components/app-ui";
import { useMe } from "@/lib/store";

/** Resize an image file to a small square data URL so it can live on the member record. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Couldn't read that image"));
    img.src = URL.createObjectURL(file);
  });
}

/** First-login setup: profile photo and training program. Writes directly to the member record. */
export function ProfileSetup() {
  const { data, me, update, log } = useMe();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Choose an image file."); return; }
    setBusy(true);
    try {
      const url = await fileToDataUrl(file);
      update((d) => ({ ...d, users: d.users.map((u) => (u.id === me.id ? { ...u, photoUrl: url } : u)) }));
      log("profile_photo_updated", "user", `Updated profile photo for ${me.name}`, me.id);
      toast.success("Profile photo saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function setProgram(programId: string) {
    update((d) => ({ ...d, users: d.users.map((u) => (u.id === me.id ? { ...u, programId: programId || undefined } : u)) }));
    log("profile_program_updated", "user", `Set program for ${me.name}`, me.id);
    toast.success("Program saved");
  }

  return (
    <Section title="Complete your profile" className="mt-4">
      <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border bg-muted">
            {me.photoUrl ? (
              <img src={me.photoUrl} alt={me.name} className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Camera className="h-4 w-4" /> {me.photoUrl ? "Change photo" : "Upload photo"}
          </Button>
        </div>
        <div className="space-y-3">
          <div className="grid items-center gap-1.5 sm:grid-cols-[150px_1fr] sm:gap-3">
            <Label htmlFor="setup-program" className="sm:text-right">Program</Label>
            <NativeSelect id="setup-program" value={me.programId ?? ""} onChange={(e) => setProgram(e.target.value)}>
              <option value="">—</option>
              {data.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </NativeSelect>
          </div>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <GraduationCap className="mt-0.5 h-4 w-4 shrink-0" />
            Choose the training program you are enrolling in (for example PPL or Night Rating). Use Edit profile below for the rest of your details — those changes go to the administrator for approval.
          </p>
        </div>
      </div>
    </Section>
  );
}

import { useState } from "react";
import { format } from "date-fns";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Chip } from "@/components/app-ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PROFILE_FIELDS, reviewProfileRequest } from "@/lib/logic";
import { useMe } from "@/lib/store";
import type { ProfileChanges } from "@/lib/types";

export function ProfileRequests({ review = false, userId }: { review?: boolean; userId?: string }) {
  const { data, me, commit, log } = useMe();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const requests = data.profileRequests.filter((r) => review && me.role === "admin" ? r.status === "pending" : r.userId === (userId ?? me.id));
  function decide(id: string, decision: "approved" | "declined") {
    const request = data.profileRequests.find((r) => r.id === id);
    if (!request) return;
    const error = commit(reviewProfileRequest(data, id, me, decision, notes[id] ?? ""));
    if (error) return void toast.error(error);
    log(`profile_change_${decision}`, "user", `${decision === "approved" ? "Approved" : "Declined"} profile request ${id} for ${data.users.find((u) => u.id === request.userId)?.name}${notes[id] ? ` — ${notes[id]}` : ""}`, request.userId);
    toast.success(`Profile request ${decision} — member notified`);
  }
  return (
    <section aria-label={review ? "Profile approval requests" : "Profile request history"} className="my-6">
      <h2 className="mb-3 text-lg font-semibold">{review ? `Profile approval requests (${requests.length})` : "Profile change requests"}</h2>
      {!requests.length ? <p className="text-sm text-muted-foreground">{review ? "No profile changes awaiting approval." : "No profile changes requested yet."}</p> : (
        <div className="divide-y">
          {requests.map((r) => (
            <article key={r.id} aria-label={`Profile request ${r.id}`} className="py-4 first:pt-0">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div><span className="font-medium">{data.users.find((u) => u.id === r.userId)?.name}</span><span className="ml-2 text-xs text-muted-foreground">{format(new Date(r.createdAt), "dd MMM yyyy HH:mm")} · {r.id}</span></div>
                <Chip tone={r.status === "approved" ? "ok" : r.status === "declined" ? "expired" : "soon"}>{r.status}</Chip>
              </div>
              <Table><TableHeader><TableRow><TableHead>Field</TableHead><TableHead>Previous</TableHead><TableHead>Requested</TableHead></TableRow></TableHeader>
                <TableBody>{(Object.keys(r.changes) as (keyof ProfileChanges)[]).map((key) => <TableRow key={key}><TableCell>{PROFILE_FIELDS[key]}</TableCell><TableCell className="break-all text-muted-foreground">{String(r.before[key] ?? "—")}</TableCell><TableCell className="break-all font-medium">{String(r.changes[key] ?? "—")}</TableCell></TableRow>)}</TableBody>
              </Table>
              {r.notes && <p className="mt-2 text-sm text-muted-foreground">Admin note: {r.notes}</p>}
              {review && me.role === "admin" && r.status === "pending" && <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="min-w-48 flex-1 space-y-1"><Label htmlFor={`review-${r.id}`}>Admin note (required for decline)</Label><Input id={`review-${r.id}`} value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} /></div>
                <Button size="sm" onClick={() => decide(r.id, "approved")}><Check className="h-4 w-4" /> Approve profile</Button>
                <Button size="sm" variant="outline" onClick={() => decide(r.id, "declined")}><X className="h-4 w-4" /> Decline profile</Button>
              </div>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
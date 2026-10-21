import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarDays, ClipboardList, Eye, LayoutDashboard, PlusSquare, RotateCcw, Trash2, Users, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Chip, NativeSelect, PageHeader, Section, Stat } from "@/components/app-ui";
import { useLookup, useMe } from "@/lib/store";
import { ProfileEditor } from "@/components/profile-editor";
import { ProfileRequests } from "@/components/profile-requests";
import { BookingApprovals } from "@/components/booking-approvals";
import { aircraftUnavailable, expiryState, restoreUser, reviewRequest, softDeleteUser } from "@/lib/logic";
import { reasonLabel, roleLabel, type Role } from "@/lib/types";

export const Route = createFileRoute("/_shell/portal/admin")({
  head: () => ({
    meta: [
      { title: "Administrator master control — SilverArrows" },
      { name: "description", content: "Super-admin hub: portal switcher, live multi-role activity feed, user soft-deletion console and audit trail." },
      { property: "og:title", content: "Administrator master control — SilverArrows" },
      { property: "og:description", content: "Super-admin hub with live activity feed, user console and audit trail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPortal,
});

const quick = [
  { to: "/admin/create", label: "Master creation", icon: PlusSquare },
  { to: "/portal/student", label: "Student view", icon: Eye },
  { to: "/portal/cfi", label: "CFI view", icon: Eye },
  { to: "/portal/ground", label: "Ground instructor view", icon: Eye },
  { to: "/dashboard", label: "Operations dashboard", icon: LayoutDashboard },
  { to: "/fleet", label: "Fleet maintenance", icon: Wrench },
  { to: "/schedule", label: "Bookings calendar", icon: CalendarDays },
  { to: "/admin/audit", label: "Full audit log", icon: ClipboardList },
] as const;

function AdminPortal() {
  const { data, me, commit, log } = useMe();
  const lk = useLookup();
  const [feedRole, setFeedRole] = useState<"" | Role>("");
  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState<"" | Role>("");

  const active = data.users.filter((u) => u.status !== "deleted");
  const deleted = data.users.filter((u) => u.status === "deleted");
  const pending = data.requests.filter((r) => r.status === "pending");
  const feed = data.activity.filter((a) => !feedRole || a.actorRole === feedRole).slice(0, 12);
  const adminTrail = data.activity.filter((a) => a.actorRole === "admin").slice(0, 10);
  const filt = (list: typeof data.users) =>
    list.filter((u) => (!roleF || u.role === roleF) && (!q || `${u.name} ${u.email} ${u.callsign ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  function del(uid: string) {
    const u = lk.user(uid)!;
    if (!confirm(`Soft-delete ${u.name}? Their records are kept and they can be restored.`)) return;
    const err = commit(softDeleteUser(data, uid, me));
    if (err) return void toast.error(err);
    log("user_soft_deleted", "user", `Soft-deleted ${u.name} (${roleLabel[u.role]}); future bookings cancelled, history preserved`, uid);
    toast.success(`${u.name} moved to archive`);
  }
  function restore(uid: string) {
    const u = lk.user(uid)!;
    const err = commit(restoreUser(data, uid, me));
    if (err) return void toast.error(err);
    log("user_restored", "user", `Restored ${u.name}`, uid);
    toast.success(`${u.name} restored`);
  }
  function override(id: string, decision: "approved" | "declined") {
    const r = data.requests.find((x) => x.id === id)!;
    const err = commit(reviewRequest(data, id, me, decision, "Administrator override"));
    if (err) return void toast.error(err);
    log(`reschedule_${decision}_override`, "booking", `Super-override: ${decision} ${r.id} for ${lk.user(r.studentId)?.name}`, r.bookingId);
    toast.success(`Request ${decision}`);
  }

  const medChip = (d?: string) => {
    const e = expiryState(d);
    return <Chip tone={e.state === "none" ? "none" : e.state}>{e.state === "none" ? "—" : e.state === "expired" ? "Expired" : e.state === "soon" ? "Expiring" : "Valid"}</Chip>;
  };

  return (
    <div>
      <PageHeader title="Administrator master control" subtitle={`${me.name} (${me.callsign ?? "—"}) · Super admin`}><ProfileEditor person={me} /></PageHeader>
      <ProfileRequests review />
      <BookingApprovals />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {quick.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium transition hover:border-primary">
            <Icon className="h-4 w-4 text-primary" /> {label}
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-5">
        <Stat label="Active users" value={active.length} />
        <Stat label="Archived users" value={deleted.length} />
        <Stat label="Pending reschedules" value={pending.length} />
        <Stat label="Aircraft available" value={`${data.aircraft.filter((a) => !aircraftUnavailable(a, data.maintenance)).length}/${data.aircraft.length}`} />
        <Stat label="Audit entries" value={data.activity.length} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Real-time activity feed" action={
          <NativeSelect className="h-8 w-40" value={feedRole} onChange={(e) => setFeedRole(e.target.value as Role | "")} aria-label="Filter feed">
            <option value="">All roles</option>
            {(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
          </NativeSelect>
        }>
          <ul className="space-y-2">
            {feed.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="num w-24 shrink-0 text-xs text-muted-foreground">{format(new Date(a.at), "dd.MM HH:mm")}</span>
                <span><span className="font-medium">{roleLabel[a.actorRole].split(" ")[0]} {a.actorName}</span> — {a.details}</span>
              </li>
            ))}
            {feed.length === 0 && <li className="text-sm text-muted-foreground">No activity.</li>}
          </ul>
        </Section>
        <Section title={`Reschedule requests — super-override (${pending.length})`}>
          {pending.length === 0 ? <p className="text-sm text-muted-foreground">Nothing pending.</p> : pending.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border-b py-3 text-sm last:border-0">
              <div className="flex-1">
                <div className="font-medium">{lk.user(r.studentId)?.name} · {r.bookingId}</div>
                <div className="text-muted-foreground">{reasonLabel[r.reason]} → <span className="num">{format(new Date(r.proposedStart), "dd.MM HH:mm")}</span> · CFI {lk.user(r.instructorId)?.name ?? "—"}</div>
              </div>
              <Button size="sm" onClick={() => override(r.id, "approved")}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => override(r.id, "declined")}>Decline</Button>
            </div>
          ))}
        </Section>
      </div>

      <Section title="User management & soft-deletion console" className="mt-4">
        <Tabs defaultValue="active">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <TabsList>
              <TabsTrigger value="active"><Users className="mr-1 h-3.5 w-3.5" /> Active ({active.length})</TabsTrigger>
              <TabsTrigger value="deleted"><Trash2 className="mr-1 h-3.5 w-3.5" /> Deleted archive ({deleted.length})</TabsTrigger>
            </TabsList>
            <Input className="w-56" placeholder="Search name, email, call sign" value={q} onChange={(e) => setQ(e.target.value)} />
            <NativeSelect className="w-44" value={roleF} onChange={(e) => setRoleF(e.target.value as Role | "")} aria-label="Role filter">
              <option value="">All roles</option>
              {(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
            </NativeSelect>
          </div>
          <TabsContent value="active">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Medical</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {filt(active).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell><span className="font-medium">{u.name}</span> <span className="num text-xs text-muted-foreground">{u.callsign}</span><div className="text-xs text-muted-foreground">{u.email}</div></TableCell>
                    <TableCell>{roleLabel[u.role]}</TableCell>
                    <TableCell>{medChip(u.medicalExpiry)}</TableCell>
                    <TableCell><Chip tone="ok">Active</Chip></TableCell>
                    <TableCell className="text-right"><div className="flex flex-wrap justify-end gap-2"><ProfileEditor person={u} />{u.id !== me.id && <Button size="sm" variant="outline" onClick={() => del(u.id)}><Trash2 className="h-3.5 w-3.5" /> Soft delete</Button>}</div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="deleted">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Records kept</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {filt(deleted).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{roleLabel[u.role]}</TableCell>
                    <TableCell className="num text-xs">{data.flights.filter((f) => f.pilotId === u.id || f.instructorId === u.id).length} flights · {data.exams.filter((e) => e.studentId === u.id).length} exams</TableCell>
                    <TableCell className="text-sm text-muted-foreground">Deleted by Admin: {lk.user(u.deletedBy)?.name ?? "—"} on <span className="num">{u.deletedAt ? format(new Date(u.deletedAt), "dd.MM.yyyy HH:mm") : "—"}</span></TableCell>
                    <TableCell className="text-right"><Button size="sm" onClick={() => restore(u.id)}><RotateCcw className="h-3.5 w-3.5" /> Restore user</Button></TableCell>
                  </TableRow>
                ))}
                {filt(deleted).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Archive is empty.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Administrator activity audit trail" className="mt-4" action={<Link to="/admin/audit" className="text-xs text-primary hover:underline">Full log →</Link>}>
        <Table>
          <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Admin</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
          <TableBody>
            {adminTrail.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="num text-xs">{format(new Date(a.at), "dd.MM.yyyy HH:mm:ss")}</TableCell>
                <TableCell>{a.actorName}</TableCell>
                <TableCell className="num text-xs">{a.action}</TableCell>
                <TableCell className="text-xs capitalize">{a.entityType}{a.entityId ? ` #${a.entityId}` : ""}</TableCell>
                <TableCell className="text-sm">{a.details}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, NativeSelect, PageHeader } from "@/components/app-ui";
import { useMe } from "@/lib/store";
import { roleLabel, type Role } from "@/lib/types";

export const Route = createFileRoute("/_shell/admin/audit")({
  head: () => ({
    meta: [
      { title: "System audit log — SilverArrows" },
      { name: "description", content: "Immutable, system-wide log of every action by students, instructors and administrators." },
      { property: "og:title", content: "System audit log — SilverArrows" },
      { property: "og:description", content: "Immutable, system-wide log of every action across all roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Audit,
});

function Audit() {
  const { data } = useMe();
  const [role, setRole] = useState<"" | Role>("");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const actions = [...new Set(data.activity.map((a) => a.action))].sort();
  const rows = data.activity.filter(
    (a) => (!role || a.actorRole === role) && (!action || a.action === action) && (!q || `${a.actorName} ${a.details} ${a.entityId ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );

  function exportCsv() {
    const head = ["Timestamp", "Actor", "Role", "Action", "Entity", "Entity ID", "Details"];
    const lines = rows.map((a) => [a.at, a.actorName, a.actorRole, a.action, a.entityType, a.entityId ?? "", a.details].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const el = document.createElement("a");
    el.href = URL.createObjectURL(blob);
    el.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    el.click();
  }

  return (
    <div>
      <PageHeader title="System audit log" subtitle={`${rows.length} of ${data.activity.length} entries · records are append-only`}>
        <Input className="w-52" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <NativeSelect className="w-44" value={role} onChange={(e) => setRole(e.target.value as Role | "")} aria-label="Role">
          <option value="">All roles</option>
          {(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
        </NativeSelect>
        <NativeSelect className="w-52" value={action} onChange={(e) => setAction(e.target.value)} aria-label="Action">
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </NativeSelect>
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> CSV</Button>
      </PageHeader>
      {rows.length === 0 ? <Empty>No matching entries.</Empty> : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Actor</TableHead><TableHead>Role</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="num whitespace-nowrap text-xs">{format(new Date(a.at), "dd.MM.yyyy HH:mm:ss")}</TableCell>
                  <TableCell className="font-medium">{a.actorName}</TableCell>
                  <TableCell className="text-xs">{roleLabel[a.actorRole]}</TableCell>
                  <TableCell className="num text-xs">{a.action}</TableCell>
                  <TableCell className="text-xs capitalize">{a.entityType}{a.entityId ? ` #${a.entityId}` : ""}</TableCell>
                  <TableCell className="text-sm">{a.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

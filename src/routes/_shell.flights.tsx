import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Empty, NativeSelect } from "@/components/app-ui";
import { FlightDialog } from "@/components/flight-dialog";
import { CumulativeHours } from "@/components/cumulative-hours";
import { useLookup, useMe } from "@/lib/store";
import { activeUsers, can, flightKind, fmtHours, visibleTo } from "@/lib/logic";
import type { Flight } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_shell/flights")({
  head: () => ({
    meta: [
      { title: "Flight log — SilverArrows" },
      { name: "description", content: "Every logged flight with block times, landings and grades." },
      { property: "og:title", content: "Flight log — SilverArrows" },
      { property: "og:description", content: "Every logged flight with block times, landings and grades." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Flights,
});

function Flights() {
  const { data, me, deleteFlight, log } = useMe();
  const lk = useLookup();
  const [q, setQ] = useState("");
  const [ac, setAc] = useState("");
  const [hoursId, setHoursId] = useState("");
  const hourPeople = activeUsers(data).filter((u) => u.role === "student" || u.role === "instructor");
  const hourPerson = me.role === "admin" ? hourPeople.find((u) => u.id === hoursId) ?? hourPeople[0] : me;
  const [dialog, setDialog] = useState<{ open: boolean; initial: Partial<Flight> }>({ open: false, initial: {} });

  const rows = visibleTo(me, data.flights)
    .filter((f) => !ac || f.aircraftId === ac)
    .filter((f) => {
      if (!q) return true;
      const hay = [lk.user(f.pilotId)?.name, lk.user(f.instructorId)?.name, lk.aircraft(f.aircraftId)?.reg, lk.lesson(f.lessonId)?.name, f.from, f.to, f.remarks].join(" ").toLowerCase();
      return hay.includes(q.toLowerCase());
    })
    .sort((a, b) => (b.date + b.offBlock).localeCompare(a.date + a.offBlock));
  const total = rows.reduce((s, f) => s + f.minutes, 0);
  const landings = rows.reduce((s, f) => s + f.landings, 0);

  function exportCsv() {
    const head = ["Date", "Aircraft", "Pilot", "Instructor", "From", "To", "Off", "On", "Block", "Landings", "Lesson", "Grade", "Remarks"];
    const lines = rows.map((f) =>
      [f.date, lk.aircraft(f.aircraftId)?.reg, lk.user(f.pilotId)?.name, lk.user(f.instructorId)?.name ?? "", f.from, f.to, f.offBlock, f.onBlock, fmtHours(f.minutes), f.landings, lk.lesson(f.lessonId)?.name ?? "", f.grade ?? "", f.remarks ?? ""]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `flight-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  }

  return (
    <div>
      <PageHeader title="Flight log" subtitle={`${rows.length} flights · ${fmtHours(total)} block · ${landings} landings`}>
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="w-48" />
        <NativeSelect value={ac} onChange={(e) => setAc(e.target.value)} className="w-36" aria-label="Aircraft filter">
          <option value="">All aircraft</option>
          {data.aircraft.map((a) => <option key={a.id} value={a.id}>{a.reg}</option>)}
        </NativeSelect>
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> CSV</Button>
        {can.logFlight(me.role) && (
          <Button onClick={() => setDialog({ open: true, initial: {} })}><Plus className="h-4 w-4" /> Log flight</Button>
        )}
      </PageHeader>
      {me.role === "admin" && (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="hour-person" className="text-sm text-muted-foreground">Hours for</label>
          <NativeSelect id="hour-person" aria-label="Hours for" className="max-w-80" value={hourPerson?.id ?? ""} onChange={(e) => {
            setHoursId(e.target.value);
            log("hours_viewed", "user", `Viewed cumulative demo hours for ${lk.user(e.target.value)?.name}`, e.target.value);
          }}>
            {hourPeople.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.role === "student" ? "Student" : "Instructor"}</option>)}
          </NativeSelect>
        </div>
      )}
      {hourPerson && (hourPerson.role === "student" || hourPerson.role === "instructor") && <CumulativeHours person={hourPerson} />}
      {rows.length === 0 ? (
        <Empty>No flights logged yet.</Empty>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Aircraft</TableHead><TableHead>Pilot</TableHead><TableHead>Instructor</TableHead>
                <TableHead>Route</TableHead><TableHead>Type</TableHead><TableHead>Block</TableHead><TableHead>Ldg</TableHead><TableHead>Lesson</TableHead><TableHead>Grade</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="num">{format(new Date(f.date), "dd MMM yy")}</TableCell>
                  <TableCell className="num font-medium">{lk.aircraft(f.aircraftId)?.reg}</TableCell>
                  <TableCell>{lk.user(f.pilotId)?.name}</TableCell>
                  <TableCell className="text-muted-foreground">{lk.user(f.instructorId)?.name ?? "Solo"}</TableCell>
                  <TableCell className="num">{f.from}→{f.to}</TableCell>
                  <TableCell className="text-xs uppercase">{flightKind(f)}{f.ifrMinutes ? ` · IFR ${f.ifrMinutes}m` : ""}</TableCell>
                  <TableCell className="num">{f.offBlock}–{f.onBlock} <span className="font-semibold">{fmtHours(f.minutes)}</span></TableCell>
                  <TableCell className="num">{f.landings}</TableCell>
                  <TableCell className="max-w-40 truncate" title={f.remarks}>{lk.lesson(f.lessonId)?.name ?? "—"}</TableCell>
                  <TableCell className="num">{f.grade ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {can.logFlight(me.role) && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Edit flight" onClick={() => setDialog({ open: true, initial: f })}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" aria-label="Delete flight" onClick={() => { if (confirm("Delete this flight?")) { deleteFlight(f.id); log("flight_deleted", "flight", `Deleted flight ${f.date} ${lk.aircraft(f.aircraftId)?.reg} for ${lk.user(f.pilotId)?.name}`, f.id); toast("Flight deleted"); } }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <FlightDialog open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} initial={dialog.initial} />
    </div>
  );
}

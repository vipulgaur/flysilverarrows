import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, PageHeader } from "@/components/app-ui";
import { useMe } from "@/lib/store";
import { aircraftUnavailable, can, maintenanceState, uid } from "@/lib/logic";
import type { Aircraft, MaintenanceItem } from "@/lib/types";

export const Route = createFileRoute("/_shell/fleet")({
  head: () => ({
    meta: [
      { title: "Fleet & maintenance — SilverArrows" },
      { name: "description", content: "Aircraft hours, availability and upcoming maintenance." },
      { property: "og:title", content: "Fleet & maintenance — SilverArrows" },
      { property: "og:description", content: "Aircraft hours, availability and upcoming maintenance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Fleet,
});

const mxBadge = { ok: "success", soon: "warning", overdue: "danger", done: "muted" } as const;

function Fleet() {
  const { data, me, update, log } = useMe();
  const grounder = can.groundAircraft(me.role);
  const admin = can.manageFleet(me.role);
  const [ac, setAc] = useState<Partial<Aircraft> | null>(null);
  const [mx, setMx] = useState<Partial<MaintenanceItem> | null>(null);
  const [showDone, setShowDone] = useState(false);

  function saveAc() {
    if (!ac?.reg?.trim() || !ac.type?.trim()) return void toast.error("Registration and type are required.");
    const a: Aircraft = { id: ac.id ?? uid(), reg: ac.reg.toUpperCase(), type: ac.type, hourlyRate: Number(ac.hourlyRate) || 0, totalHours: Number(ac.totalHours) || 0, tachHours: Number(ac.tachHours ?? ac.totalHours) || 0, lastService: ac.lastService, grounded: !!ac.grounded };
    update((d) => ({ ...d, aircraft: d.aircraft.some((x) => x.id === a.id) ? d.aircraft.map((x) => (x.id === a.id ? a : x)) : [...d.aircraft, a] }));
    log(ac.id ? "aircraft_updated" : "aircraft_created", "aircraft", `${ac.id ? "Updated" : "Added"} ${a.reg} (${a.type})`, a.id);
    toast.success("Aircraft saved");
    setAc(null);
  }
  function removeAc(a: Aircraft) {
    if (data.flights.some((f) => f.aircraftId === a.id)) return void toast.error("Aircraft has logged flights — ground it instead.");
    if (!confirm(`Remove ${a.reg}?`)) return;
    update((d) => ({ ...d, aircraft: d.aircraft.filter((x) => x.id !== a.id), maintenance: d.maintenance.filter((m) => m.aircraftId !== a.id), bookings: d.bookings.filter((b) => b.aircraftId !== a.id) }));
  }
  function saveMx() {
    if (!mx?.title?.trim()) return void toast.error("Enter a title.");
    if (mx.dueHours === undefined && !mx.dueDate) return void toast.error("Set due hours or a due date.");
    const m = { ...mx, id: mx.id ?? uid() } as MaintenanceItem;
    update((d) => ({ ...d, maintenance: d.maintenance.some((x) => x.id === m.id) ? d.maintenance.map((x) => (x.id === m.id ? m : x)) : [...d.maintenance, m] }));
    toast.success("Maintenance item saved");
    setMx(null);
  }
  function complete(m: MaintenanceItem, a: Aircraft) {
    log("maintenance_completed", "maintenance", `Completed ${m.title} on ${a.reg} at ${a.totalHours.toFixed(1)} h`, a.id);
    update((d) => {
      const done = { ...m, completedAt: new Date().toISOString() };
      const next: MaintenanceItem[] = m.intervalHours ? [{ id: uid(), aircraftId: m.aircraftId, title: m.title, intervalHours: m.intervalHours, dueHours: Math.round((a.totalHours + m.intervalHours) * 10) / 10 }] : [];
      return { ...d, aircraft: d.aircraft.map((x) => (x.id === a.id ? { ...x, lastService: new Date().toISOString().slice(0, 10) } : x)), maintenance: [...d.maintenance.map((x) => (x.id === m.id ? done : x)), ...next] };
    });
    toast.success(m.intervalHours ? `Done — next due at ${(a.totalHours + m.intervalHours).toFixed(1)} h` : "Marked complete");
  }

  return (
    <div>
      <PageHeader title="Fleet" subtitle="Aircraft are blocked from booking when grounded or maintenance is overdue">
        <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show completed</label>
        {admin && <Button onClick={() => setAc({ grounded: false })}><Plus className="h-4 w-4" /> Aircraft</Button>}
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {data.aircraft.map((a) => {
          const items = data.maintenance.filter((m) => m.aircraftId === a.id && (showDone || !m.completedAt));
          const down = aircraftUnavailable(a, data.maintenance);
          return (
            <section key={a.id} className="flex flex-col rounded-lg border bg-card">
              <div className="flex items-start justify-between border-b p-4">
                <div>
                  <h2 className="num text-2xl font-semibold">{a.reg}</h2>
                  <p className="text-sm text-muted-foreground">{a.type} · €{a.hourlyRate}/h</p>
                </div>
                <Badge variant={down ? "danger" : "success"}>{down ? "Unavailable" : "Available"}</Badge>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-muted-foreground">Airframe hours</span>
                <span className="num text-lg font-semibold">{a.totalHours.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between px-4 pb-1 text-sm">
                <span className="text-muted-foreground">Tach hours</span>
                <span className="num font-medium">{a.tachHours.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between px-4 pb-3 text-sm">
                <span className="text-muted-foreground">Last service</span>
                <span className="num font-medium">{a.lastService ? format(new Date(a.lastService), "dd.MM.yyyy") : "—"}</span>
              </div>
              {grounder && (
                <div className="flex items-center justify-between border-t px-4 py-2 text-sm">
                  <span>Grounded</span>
                  <Switch checked={a.grounded} onCheckedChange={(v) => { update((d) => ({ ...d, aircraft: d.aircraft.map((x) => (x.id === a.id ? { ...x, grounded: v } : x)) })); log(v ? "aircraft_grounded" : "aircraft_released", "aircraft", `${v ? "Grounded" : "Released to service"} ${a.reg}`, a.id); }} aria-label={`Ground ${a.reg}`} />
                </div>
              )}
              <div className="flex-1 border-t">
                <div className="flex items-center justify-between px-4 pt-3 text-xs uppercase tracking-wider text-muted-foreground">
                  Maintenance
                  {admin && <button className="text-primary hover:underline" onClick={() => setMx({ aircraftId: a.id })}>+ Add</button>}
                </div>
                <ul className="divide-y">
                  {items.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">Nothing scheduled.</li>}
                  {items.map((m) => {
                    const st = maintenanceState(m, a);
                    return (
                      <li key={m.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                        <div className="flex-1">
                          <div className={m.completedAt ? "line-through text-muted-foreground" : "font-medium"}>{m.title}</div>
                          <div className="num text-xs text-muted-foreground">
                            {m.dueHours !== undefined && `@ ${m.dueHours} h (${(m.dueHours - a.totalHours).toFixed(1)} left)`}
                            {m.dueDate && ` ${format(new Date(m.dueDate), "d MMM yyyy")}`}
                          </div>
                        </div>
                        <Badge variant={mxBadge[st]} className="capitalize">{st}</Badge>
                        {admin && !m.completedAt && (
                          <>
                            <Button variant="ghost" size="icon" aria-label="Mark complete" onClick={() => complete(m, a)}><Check className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" aria-label="Edit maintenance" onClick={() => setMx(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
              {admin && (
                <div className="flex justify-end gap-1 border-t p-2">
                  <Button variant="ghost" size="sm" onClick={() => setAc(a)}><Pencil className="h-4 w-4" /> Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => removeAc(a)}><Trash2 className="h-4 w-4" /> Remove</Button>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <Dialog open={!!ac} onOpenChange={(o) => !o && setAc(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ac?.id ? "Edit aircraft" : "Add aircraft"}</DialogTitle></DialogHeader>
          {ac && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Registration"><Input value={ac.reg ?? ""} onChange={(e) => setAc({ ...ac, reg: e.target.value })} className="uppercase" /></Field>
              <Field label="Type"><Input value={ac.type ?? ""} onChange={(e) => setAc({ ...ac, type: e.target.value })} /></Field>
              <Field label="Hourly rate (€)"><Input type="number" value={ac.hourlyRate ?? ""} onChange={(e) => setAc({ ...ac, hourlyRate: Number(e.target.value) })} /></Field>
              <Field label="Airframe hours"><Input type="number" step="0.1" value={ac.totalHours ?? ""} onChange={(e) => setAc({ ...ac, totalHours: Number(e.target.value) })} /></Field>
            </div>
          )}
          <DialogFooter><Button onClick={saveAc}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!mx} onOpenChange={(o) => !o && setMx(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{mx?.id ? "Edit maintenance" : "Add maintenance"}</DialogTitle></DialogHeader>
          {mx && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Title" className="col-span-2"><Input value={mx.title ?? ""} onChange={(e) => setMx({ ...mx, title: e.target.value })} /></Field>
              <Field label="Due at airframe hours"><Input type="number" step="0.1" value={mx.dueHours ?? ""} onChange={(e) => setMx({ ...mx, dueHours: e.target.value ? Number(e.target.value) : undefined })} /></Field>
              <Field label="Due date"><Input type="date" value={mx.dueDate ?? ""} onChange={(e) => setMx({ ...mx, dueDate: e.target.value || undefined })} /></Field>
              <Field label="Repeat every (hours)" className="col-span-2"><Input type="number" value={mx.intervalHours ?? ""} onChange={(e) => setMx({ ...mx, intervalHours: e.target.value ? Number(e.target.value) : undefined })} /></Field>
            </div>
          )}
          <DialogFooter><Button onClick={saveMx}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

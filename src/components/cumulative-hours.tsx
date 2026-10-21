import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cumulativeHours, demoHourEntries, fmtHours } from "@/lib/logic";
import type { User } from "@/lib/types";

export function CumulativeHours({ person }: { person: User }) {
  const asOf = format(new Date(), "yyyy-MM-dd");
  const rows = useMemo(() => {
    const now = parseISO(asOf);
    return cumulativeHours(person, demoHourEntries(person, now), now);
  }, [person.id, person.role, asOf]);
  const instructor = person.role === "instructor";
  return (
    <section aria-label="Cumulative flight hours" className="my-6 min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Clock3 className="h-5 w-5 text-primary" /> Cumulative flight hours</h2>
          <p className="mt-1 text-xs text-muted-foreground">{person.name} · Rolling totals through {format(parseISO(asOf), "dd MMM yyyy")} · Hours:minutes</p>
        </div>
        <Badge variant="secondary">Demo values</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead><TableHead className="min-w-40">Date range</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">{instructor ? "Instructed" : "Dual"}</TableHead>
            <TableHead className="text-right">{instructor ? "Own PIC" : "Solo PIC"}</TableHead>
            <TableHead className="text-right">Simulator</TableHead><TableHead className="text-right">IFR*</TableHead><TableHead className="text-right">Flights</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="whitespace-nowrap font-medium">{row.label}</TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{format(parseISO(row.start), "dd MMM yy")} – {format(parseISO(row.end), "dd MMM yy")}</TableCell>
              <TableCell className="num text-right font-semibold text-primary">{fmtHours(row.total)}</TableCell>
              <TableCell className="num text-right">{fmtHours(instructor ? row.instructed : row.dual)}</TableCell>
              <TableCell className="num text-right">{fmtHours(instructor ? row.pic : row.solo)}</TableCell>
              <TableCell className="num text-right">{fmtHours(row.sim)}</TableCell>
              <TableCell className="num text-right">{fmtHours(row.ifr)}</TableCell>
              <TableCell className="num text-right">{row.flights}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-2 text-xs text-muted-foreground">Synthetic hours, separate from logged flights and duty limits. Total includes simulator time. *IFR is included in the other hour categories.</p>
    </section>
  );
}
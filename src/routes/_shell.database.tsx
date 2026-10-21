import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Database, GitBranch, Loader2, Table2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { DB_ACTIVITIES, DB_TABLES } from "@/lib/db-schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_shell/database")({
  head: () => ({
    meta: [
      { title: "Database — SilverArrows" },
      { name: "description", content: "Admin view of the academy database: table relationships, live records and which activity writes where." },
      { property: "og:title", content: "Database — SilverArrows" },
      { property: "og:description", content: "Academy table relationships, live records and activity destinations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DatabasePage,
});

/** Simple layered layout for the relationship graph. */
const LAYERS: string[][] = [
  ["tenants", "profiles"],
  ["tenant_members", "programs", "aircraft"],
  ["member_roles", "program_lessons", "maintenance_items", "bookings", "flights"],
  ["completions", "change_requests", "exam_results", "lectures", "duty_records"],
  ["profile_requests", "learning_records", "notification_reads", "activity_feed", "audit_log", "theory_subjects", "classrooms"],
];

const NODE_W = 150;
const NODE_H = 44;
const GAP_X = 24;
const GAP_Y = 56;

function nodePositions() {
  const pos = new Map<string, { x: number; y: number }>();
  const maxW = Math.max(...LAYERS.map((l) => l.length)) * (NODE_W + GAP_X);
  LAYERS.forEach((layer, li) => {
    const w = layer.length * (NODE_W + GAP_X) - GAP_X;
    const startX = (maxW - GAP_X - w) / 2;
    layer.forEach((name, i) => pos.set(name, { x: startX + i * (NODE_W + GAP_X), y: li * (NODE_H + GAP_Y) }));
  });
  return { pos, width: maxW - GAP_X, height: LAYERS.length * (NODE_H + GAP_Y) - GAP_Y };
}

function SchemaGraph() {
  const { pos, width, height } = nodePositions();
  const edges = DB_TABLES.flatMap((t) =>
    t.links.map((l) => {
      const from = pos.get(l.references.split(".")[0] ?? "");
      const to = pos.get(t.name);
      return from && to ? { from, to, key: `${t.name}.${l.column}` } : null;
    }).filter((e): e is NonNullable<typeof e> => e !== null),
  );
  return (
    <div className="overflow-x-auto rounded-lg border bg-card p-4">
      <svg width={width} height={height} className="mx-auto block" role="img" aria-label="Table relationship graph">
        {edges.map((e) => (
          <line
            key={e.key}
            x1={e.from.x + NODE_W / 2} y1={e.from.y + NODE_H}
            x2={e.to.x + NODE_W / 2} y2={e.to.y}
            stroke="currentColor" strokeOpacity={0.25} strokeWidth={1.5}
          />
        ))}
        {DB_TABLES.map((t) => {
          const p = pos.get(t.name);
          if (!p) return null;
          return (
            <g key={t.name}>
              <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={22} className="fill-muted stroke-border" />
              <text x={p.x + NODE_W / 2} y={p.y + 19} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
                {t.name.length > 20 ? t.name.slice(0, 19) + "…" : t.name}
              </text>
              <text x={p.x + NODE_W / 2} y={p.y + 34} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                key: {t.primaryKey}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Each line is a foreign key: the lower table's column points at the upper table's primary key. Every table also carries a tenant id linking it to the academy.
      </p>
    </div>
  );
}

function TableBrowser() {
  const [table, setTable] = useState(DB_TABLES[0]?.name ?? "bookings");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let sequence = 0;
    setLoading(true);
    setError(null);
    const fetchRows = async () => {
      const request = ++sequence;
      const { data, error: err, count: c } = await supabase
        .from(table as never)
        .select("*", { count: "exact" })
        .order((table === "audit_log" ? "at" : table === "tenants" || table === "profiles" ? "created_at" : "inserted_at") as never, { ascending: false } as never)
        .limit(100);
      if (cancelled || request !== sequence) return;
      setLoading(false);
      if (err) { setError(err.message); setRows([]); setCount(null); return; }
      setRows((data as unknown as Record<string, unknown>[]) ?? []);
      setCount(c);
    };
    void fetchRows();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => { clearTimeout(timer); timer = setTimeout(() => void fetchRows(), 300); };
    const channel = supabase.channel(`table-browser:${table}`).on("postgres_changes", { event: "*", schema: "public", table }, refresh).subscribe();
    const fallback = setInterval(refresh, 15000);
    return () => { cancelled = true; clearTimeout(timer); clearInterval(fallback); void supabase.removeChannel(channel); };
  }, [table]);

  const doc = DB_TABLES.find((t) => t.name === table);
  const columns = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={table} onValueChange={setTable}>
          <SelectTrigger className="w-72 rounded-full"><SelectValue placeholder="Choose a table" /></SelectTrigger>
          <SelectContent>
            {DB_TABLES.map((t) => <SelectItem key={t.name} value={t.name}>{t.label} ({t.name})</SelectItem>)}
          </SelectContent>
        </Select>
        {count !== null && <span className="num text-sm text-muted-foreground">{count} record{count === 1 ? "" : "s"}{count > 100 ? " — showing newest 100" : ""}</span>}
      </div>
      {doc && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{doc.label}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">{doc.description}</p>
            <p><span className="font-medium">Primary key:</span> <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{doc.primaryKey}</code></p>
            {doc.links.length > 0 && (
              <div>
                <p className="font-medium">Connected to:</p>
                <ul className="mt-1 list-inside list-disc text-muted-foreground">
                  {doc.links.map((l) => <li key={l.column}><code className="text-xs">{l.column}</code> → <code className="text-xs">{l.references}</code></li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading records…</div>
      ) : error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">{error}</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No records in this table yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted">
              <tr>{columns.map((c) => <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold">{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  {columns.map((c) => (
                    <td key={c} className="max-w-56 truncate whitespace-nowrap px-3 py-1.5 align-top text-muted-foreground" title={String(r[c] ?? "")}>
                      {r[c] === null ? <span className="italic opacity-50">null</span> : typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ActivityMap() {
  return (
    <div className="space-y-3">
      {DB_ACTIVITIES.map((a) => (
        <Card key={a.activity}>
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="sm:w-64 sm:shrink-0">
              <p className="font-medium">{a.activity}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {a.tables.map((t) => (
                  <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{t}</span>
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{a.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DatabasePage() {
  const { me } = useStore();
  if (me?.role !== "admin") {
    return <p className="py-20 text-center text-muted-foreground">This page is for administrators only.</p>;
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold"><Database className="h-7 w-7 text-primary" /> Database</h1>
        <p className="mt-1 text-muted-foreground">Testing view: how the {DB_TABLES.length} tables connect, what's inside them, and which activity writes where.</p>
      </div>
      <Tabs defaultValue="graph">
        <TabsList>
          <TabsTrigger value="graph"><GitBranch className="mr-1.5 h-4 w-4" /> Table linkage</TabsTrigger>
          <TabsTrigger value="browse"><Table2 className="mr-1.5 h-4 w-4" /> Browse records</TabsTrigger>
          <TabsTrigger value="activity"><Zap className="mr-1.5 h-4 w-4" /> Activity → tables</TabsTrigger>
        </TabsList>
        <TabsContent value="graph" className="mt-4"><SchemaGraph /></TabsContent>
        <TabsContent value="browse" className="mt-4"><TableBrowser /></TabsContent>
        <TabsContent value="activity" className="mt-4"><ActivityMap /></TabsContent>
      </Tabs>
    </div>
  );
}

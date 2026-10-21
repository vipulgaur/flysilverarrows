import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ActivityLog, AppData, Booking, Flight, User } from "./types";
import { seedData } from "./seed";
import { uid } from "./logic";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { diffTables, fromTables, hasChanges, mergePending, TABLE_ORDER, toTables, type Tables } from "./api/mapping";
import { loadAcademy, persistBooking, pushChanges } from "./api/sync";

interface Store {
  data: AppData;
  hydrated: boolean;
  me: User | null;
  /** Signed in to an account that is not linked to any academy member. */
  noAccess: boolean;
  signOut: () => Promise<void>;
  /** Re-read everything from the server. */
  reload: () => Promise<void>;
  update: (fn: (d: AppData) => AppData) => void;
  reset: () => void;
  saveFlight: (f: Flight) => void;
  deleteFlight: (id: string) => void;
  saveBooking: (b: Booking) => Promise<void>;
  /** Append an audit entry attributed to the signed-in user. */
  log: (action: string, entityType: ActivityLog["entityType"], details: string, entityId?: string) => void;
  /** Apply a pure transition; returns false (and does nothing) if it produced an error string. */
  commit: (result: AppData | string) => string | null;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(seedData);
  const [meId, setMeId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [noAccess, setNoAccess] = useState(false);
  const tenant = useRef<string | null>(null);
  const synced = useRef<Tables | null>(null);
  const pushing = useRef(false);
  const refreshPromise = useRef<Promise<void> | null>(null);
  const authUser = useRef<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const latest = useRef(data);
  latest.current = data;

  const applyLoad = useCallback(async (userId: string | null) => {
    authUser.current = userId;
    if (!userId) {
      setTenantId(null);
      tenant.current = null; synced.current = null;
      setMeId(null); setNoAccess(false); setHydrated(true);
      return;
    }
    try {
      const loaded = await loadAcademy(userId);
      if (authUser.current !== userId) return;
      if (!loaded) { tenant.current = null; setTenantId(null); synced.current = null; setMeId(null); setNoAccess(true); }
      else {
        tenant.current = loaded.tenantId;
        setTenantId(loaded.tenantId);
        synced.current = toTables(loaded.data, loaded.tenantId);
        latest.current = loaded.data;
        setData(loaded.data); setMeId(loaded.meId); setNoAccess(false);
      }
    } catch (e) {
      toast.error(`Couldn't load academy records: ${(e as Error).message}`, { id: "load-failed" });
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    let current: string | null | undefined;
    supabase.auth.getUser().then(({ data: u }) => { current = u.user?.id ?? null; void applyLoad(current); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      const id = session?.user.id ?? null;
      if (id === current) return;
      current = id;
      setHydrated(false);
      void applyLoad(id);
    });
    return () => sub.subscription.unsubscribe();
  }, [applyLoad]);

  // Every change is written to the server; if the server rejects it, the screen reverts to the server's records.
  const flush = useCallback(async () => {
    if (pushing.current || refreshPromise.current || !tenant.current || !synced.current) return;
    pushing.current = true;
    try {
      for (let i = 0; i < 5; i++) {
        const next = toTables(latest.current, tenant.current);
        const changes = diffTables(synced.current, next);
        if (!hasChanges(changes)) break;
        try {
          await pushChanges(changes, tenant.current);
          synced.current = next;
        } catch (e) {
          toast.error(`Change not saved: ${(e as Error).message}`);
          const { data: u } = await supabase.auth.getUser();
          await applyLoad(u.user?.id ?? null);
          break;
        }
      }
    } finally {
      pushing.current = false;
    }
  }, [applyLoad]);

  const refreshLive = useCallback(async () => {
    if (refreshPromise.current) return refreshPromise.current;
    if (pushing.current || !authUser.current || !tenant.current || !synced.current) return;
    const userId = authUser.current;
    const school = tenant.current;
    const run = (async () => {
      try {
        const loaded = await loadAcademy(userId);
        if (!loaded || authUser.current !== userId || !synced.current) return;
        const pending = diffTables(synced.current, toTables(latest.current, school));
        const remote = toTables(loaded.data, school);
        synced.current = remote;
        const merged = fromTables(mergePending(remote, pending));
        latest.current = merged;
        setData(merged);
      } catch (e) { toast.error(`Live update unavailable: ${(e as Error).message}`, { id: "live-update" }); }
    })();
    refreshPromise.current = run;
    try { await run; } finally { refreshPromise.current = null; }
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (disposed) return;
        if (pushing.current || refreshPromise.current) { schedule(); return; }
        void refreshLive();
      }, 300);
    };
    const channel = supabase.channel(`academy:${tenantId}`);
    for (const table of TABLE_ORDER) channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `tenant_id=eq.${tenantId}` }, schedule);
    channel.subscribe((status) => { if (status === "SUBSCRIBED") schedule(); });
    // Reconcile after reconnect/focus, with a bounded fallback if the live connection is unavailable.
    window.addEventListener("focus", schedule);
    const fallback = setInterval(schedule, 15000);
    return () => { disposed = true; clearTimeout(timer); clearInterval(fallback); window.removeEventListener("focus", schedule); void supabase.removeChannel(channel); };
  }, [tenantId, refreshLive]);

  useEffect(() => {
    if (!hydrated || !synced.current) return;
    const t = setTimeout(() => void flush(), 250);
    return () => clearTimeout(t);
  }, [data, hydrated, flush]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => { const next = fn(d); latest.current = next; return next; }), []);

  const saveFlight = useCallback((f: Flight) => {
    setData((d) => {
      const prev = d.flights.find((x) => x.id === f.id);
      const delta = (f.minutes - (prev?.minutes ?? 0)) / 60;
      const acDelta = (id: string, h: number) => (a: AppData["aircraft"][number]) =>
        a.id === id ? { ...a, totalHours: Math.round((a.totalHours + h) * 10) / 10 } : a;
      let aircraft = d.aircraft;
      if (prev && prev.aircraftId !== f.aircraftId) {
        aircraft = aircraft.map(acDelta(prev.aircraftId, -prev.minutes / 60)).map(acDelta(f.aircraftId, f.minutes / 60));
      } else aircraft = aircraft.map(acDelta(f.aircraftId, delta));
      const flights = prev ? d.flights.map((x) => (x.id === f.id ? f : x)) : [f, ...d.flights];
      let completions = d.completions.filter((c) => c.flightId !== f.id);
      if (f.lessonId && (f.grade ?? 0) >= 3) {
        completions = [
          ...completions,
          { id: uid(), studentId: f.pilotId, lessonId: f.lessonId, date: f.date, instructorId: f.instructorId, grade: f.grade, flightId: f.id },
        ];
      }
      const bookings = f.bookingId
        ? d.bookings.map((b) => (b.id === f.bookingId ? { ...b, status: "completed" as const } : b))
        : d.bookings;
      return { ...d, aircraft, flights, completions, bookings };
    });
  }, []);

  const deleteFlight = useCallback((id: string) => {
    setData((d) => {
      const f = d.flights.find((x) => x.id === id);
      if (!f) return d;
      return {
        ...d,
        flights: d.flights.filter((x) => x.id !== id),
        completions: d.completions.filter((c) => c.flightId !== id),
        aircraft: d.aircraft.map((a) =>
          a.id === f.aircraftId ? { ...a, totalHours: Math.round((a.totalHours - f.minutes / 60) * 10) / 10 } : a,
        ),
        bookings: d.bookings.map((b) => (b.id === f.bookingId ? { ...b, status: "scheduled" } : b)),
      };
    });
  }, []);

  const saveBooking = useCallback(async (b: Booking) => {
    if (refreshPromise.current) await refreshPromise.current;
    if (pushing.current) throw new Error("Another change is being saved. Please try again.");
    await flush();
    const school = tenant.current;
    if (!school || !synced.current) throw new Error("Sign in before saving a booking.");
    pushing.current = true;
    try {
      const saved = await persistBooking(b, school, latest.current);
      if (!saved) throw new Error("Booking was not saved.");
      const row = toTables({ ...latest.current, bookings: [saved] }, school).bookings[0];
      if (row) synced.current.bookings = [...synced.current.bookings.filter((x) => x.id !== saved.id), row];
      const next = { ...latest.current, bookings: [...latest.current.bookings.filter((x) => x.id !== saved.id), saved] };
      latest.current = next;
      setData(next);
    } finally { pushing.current = false; }
    await refreshLive();
  }, [flush, refreshLive]);

  const me = data.users.find((u) => u.id === meId && u.status !== "deleted") ?? null;

  const log = useCallback(
    (action: string, entityType: ActivityLog["entityType"], details: string, entityId?: string) => {
      if (!me) return;
      const entry: ActivityLog = { id: uid(), at: new Date().toISOString(), actorId: me.id, actorName: me.name, actorRole: me.role, action, entityType, entityId, details };
      setData((d) => ({ ...d, activity: [entry, ...d.activity] }));
    },
    [me],
  );

  const commit = useCallback((result: AppData | string) => {
    if (typeof result === "string") return result;
    setData(result);
    return null;
  }, []);

  const value = useMemo<Store>(
    () => ({
      data,
      hydrated,
      me,
      log,
      commit,
      noAccess,
      signOut: async () => {
        await supabase.auth.signOut();
      },
      reload: async () => {
        const { data: u } = await supabase.auth.getUser();
        await applyLoad(u.user?.id ?? null);
      },
      update,
      reset: () => setData(seedData()),
      saveFlight,
      deleteFlight,
      saveBooking,
    }),
    [data, hydrated, me, noAccess, applyLoad, log, commit, update, saveFlight, deleteFlight, saveBooking],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

/** For pages under the signed-in shell, where `me` is guaranteed. */
export function useMe() {
  const s = useStore();
  return { ...s, me: s.me as User };
}

export function useLookup() {
  const { data } = useStore();
  return {
    user: (id?: string) => data.users.find((u) => u.id === id),
    aircraft: (id?: string) => data.aircraft.find((a) => a.id === id),
    lesson: (id?: string) => data.programs.flatMap((p) => p.lessons).find((l) => l.id === id),
  };
}

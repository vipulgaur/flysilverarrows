import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  BookOpen, ChevronDown, CalendarDays, ClipboardList, Database, Gauge, GraduationCap, LayoutDashboard, LogOut, NotebookPen,
  PlusSquare, RotateCcw, School, ShieldAlert, ShieldCheck, UserRound, Users, Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { canAccess, homeFor } from "@/lib/logic";
import { roleLabel, type Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { MemberNotifications } from "@/components/member-notifications";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_shell")({
  ssr: false,
  component: Shell,
});

type NavItem = { to: string; label: string; icon: typeof Gauge; badge?: number };

function navFor(role: Role, pending: number): { section: string; items: NavItem[] }[] {
  const ops: NavItem[] = [
    { to: "/schedule", label: "Bookings calendar", icon: CalendarDays },
    { to: "/flights", label: role === "student" ? "My logbook" : "Flight log", icon: NotebookPen },
    { to: "/people", label: "People", icon: Users },
    { to: "/training", label: "Syllabus", icon: BookOpen },
    { to: "/learning", label: "E-Learning", icon: GraduationCap },
    { to: "/fleet", label: "Fleet & maintenance", icon: Wrench },
  ].filter((i) => canAccess(role, i.to));
  if (role === "admin")
    return [
      {
        section: "Master control",
        items: [
          { to: "/portal/admin", label: "Admin hub", icon: ShieldCheck, badge: pending },
          { to: "/admin/create", label: "Create entities", icon: PlusSquare },
          { to: "/admin/audit", label: "Audit log", icon: ClipboardList },
          { to: "/database", label: "Database", icon: Database },
        ],
      },
      {
        section: "Portal views",
        items: [
          { to: "/portal/student", label: "Student portal", icon: GraduationCap },
          { to: "/portal/cfi", label: "CFI portal", icon: UserRound },
          { to: "/portal/ground", label: "Ground school portal", icon: School },
        ],
      },
      { section: "Operations", items: ops },
    ];
  const home: Record<Exclude<Role, "admin">, NavItem> = {
    student: { to: "/portal/student", label: "My portal", icon: GraduationCap },
    instructor: { to: "/portal/cfi", label: "CFI hub", icon: UserRound, badge: pending },
    ground: { to: "/portal/ground", label: "Ground school", icon: School },
  };
  return [{ section: roleLabel[role], items: [home[role], ...ops] }];
}

function Shell() {
  const { me, hydrated, signOut, reset, data } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (hydrated && !me) navigate({ to: "/", replace: true });
  }, [hydrated, me, navigate]);

  if (!hydrated || !me) return <div className="min-h-screen bg-background" />;

  const pending = data.requests.filter(
    (r) => r.status === "pending" && (me.role === "admin" || r.instructorId === me.id),
  ).length + (me.role === "admin" ? data.profileRequests.filter((r) => r.status === "pending").length : 0);
  const allowed = canAccess(me.role, pathname);

  const groups = navFor(me.role, pending);
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");
  const pill = "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition";
  const pillIdle = "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
  const pillOn = "bg-sidebar-primary text-sidebar-primary-foreground shadow";
  const Badge = ({ n }: { n?: number | undefined }) =>
    n ? <span className="rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">{n}</span> : null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-6 py-3 xl:flex-nowrap">
          <Link to={homeFor[me.role]} aria-label="Silver Arrows home" className="flex shrink-0 items-center">
            <BrandLogo className="h-14 w-[120px]" />
          </Link>
          <nav className="order-last mx-auto flex w-full min-w-0 items-center gap-1 overflow-x-auto rounded-full bg-sidebar p-1.5 shadow-lg xl:order-none xl:w-auto">
            <Link to="/dashboard" className={`${pill} ${isActive("/dashboard") ? pillOn : pillIdle}`}>
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
            {groups.length === 1
              ? groups[0]?.items.map(({ to, label, icon: Icon, badge }) => (
                  <Link key={to} to={to} className={`${pill} ${isActive(to) ? pillOn : pillIdle}`}>
                    <Icon className="h-4 w-4" /> {label} <Badge n={badge} />
                  </Link>
                ))
              : groups.map((g) => {
                  const on = g.items.some((i) => isActive(i.to));
                  const total = g.items.reduce((t, i) => t + (i.badge ?? 0), 0);
                  return (
                    <DropdownMenu key={g.section}>
                      <DropdownMenuTrigger className={`${pill} group outline-none ${on ? pillOn : pillIdle}`}>
                        <span>{g.section}</span>
                        <Badge n={total} />
                        <ChevronDown aria-hidden="true" className="-mr-1 h-4 w-4 shrink-0 opacity-80 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="w-60 rounded-2xl p-1.5">
                        {g.items.map(({ to, label, icon: Icon, badge }) => (
                          <DropdownMenuItem key={to} asChild className={`rounded-xl px-3 py-2 ${isActive(to) ? "bg-accent/30 font-medium" : ""}`}>
                            <Link to={to}>
                              <Icon className="h-4 w-4" /> <span className="flex-1">{label}</span> <Badge n={badge} />
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                })}
          </nav>
          <ThemeToggle />
          <MemberNotifications />
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Account menu" className="flex shrink-0 items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-sm outline-none transition hover:border-primary">
              <span className="num flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {me.callsign ?? me.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden text-left leading-tight xl:block">
                <span className="block font-medium">{me.name}</span>
                <span className="block text-[11px] text-muted-foreground">{roleLabel[me.role]}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
              <DropdownMenuLabel>{me.name}<div className="text-xs font-normal text-muted-foreground">{me.email}</div></DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/profile"><UserRound className="h-4 w-4" /> My profile</Link></DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl" onClick={() => navigate({ to: homeFor[me.role] })}>
                <Gauge className="h-4 w-4" /> My portal
              </DropdownMenuItem>
              {me.role === "admin" && (
                <DropdownMenuItem
                  className="rounded-xl"
                  onClick={() => {
                    if (confirm("Reset all demo data?")) {
                      reset();
                      toast.success("Demo data reset");
                    }
                  }}
                >
                  <RotateCcw className="h-4 w-4" /> Reset demo data
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="rounded-xl"
                onClick={() => {
                  void signOut();
                  navigate({ to: "/", replace: true });
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-6 py-8">
        {allowed ? (
          <Outlet />
        ) : (
          <div className="mx-auto mt-24 max-w-md rounded-lg border bg-card p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <p className="num mt-3 text-sm text-muted-foreground">403 — ACCESS DENIED</p>
            <h1 className="mt-2 text-2xl font-bold">This area isn't part of your portal</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your role ({roleLabel[me.role]}) doesn't have access to this page.
            </p>
            <Button className="mt-6" onClick={() => navigate({ to: homeFor[me.role] })}>Go to my portal</Button>
          </div>
        )}
      </main>
    </div>
  );
}

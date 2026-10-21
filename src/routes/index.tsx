import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { homeFor } from "@/lib/logic";
import { roleLabel, type Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/app-ui";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — SilverArrows Aviation OS" },
      { name: "description", content: "Sign in to SilverArrows: role-based portals for students, flight instructors, ground instructors and administrators." },
      { property: "og:title", content: "SilverArrows — Aviation operating system for flight academies" },
      { property: "og:description", content: "Bookings, logbooks, CBTA training, ground school, fleet maintenance and audit logging in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignIn,
});

const DEMO_PASSWORD = "demo12345";
const QUICK_ROLES = [
  { label: "Administrator", email: "admin@silverarrows.aero" },
  { label: "Flight instructor", email: "priya@silverarrows.aero" },
  { label: "Ground instructor", email: "anujay@silverarrows.aero" },
  { label: "Student", email: "aarav@mail.com" },
] as const;

const db = supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };

function SignIn() {
  const { me, hydrated, noAccess, signOut, reload } = useStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [verify, setVerify] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [master, setMaster] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hydrated && me) navigate({ to: homeFor[me.role], replace: true });
  }, [hydrated, me, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean) || clean.length > 255) { toast.error("Enter a valid email address."); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (mode === "signup") {
      if (!firstName.trim() || !lastName.trim()) { toast.error("Enter your first and last name."); return; }
      if (password !== verify) { toast.error("Passwords do not match."); return; }
    }
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: clean, password });
      setBusy(false);
      if (error) toast.error(error.message);
      return;
    }
    const { data, error } = await supabase.auth.signUp({ email: clean, password, options: { emailRedirectTo: window.location.origin } });
    if (error) { setBusy(false); toast.error(error.message); return; }
    if (!data.session) { setBusy(false); toast.success("Account created. Sign in to continue."); setMode("signin"); return; }
    const { error: regErr } = await db.rpc("register_member", { p_first: firstName.trim(), p_last: lastName.trim(), p_role: role, p_master: role === "admin" ? master : null });
    if (regErr) {
      setBusy(false);
      toast.error(regErr.message);
      await supabase.auth.signOut();
      return;
    }
    await reload();
    setBusy(false);
    toast.success("Account created — welcome! Please complete your profile.");
    navigate({ to: "/profile", replace: true });
  }

  async function quickSignIn(demoEmail: string) {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: demoEmail, password: DEMO_PASSWORD });
    if (error) {
      const { data, error: upErr } = await supabase.auth.signUp({ email: demoEmail, password: DEMO_PASSWORD, options: { emailRedirectTo: window.location.origin } });
      setBusy(false);
      if (upErr) { toast.error(upErr.message); return; }
      if (!data.session) { toast.error("Account created — now sign in with the demo password."); return; }
    } else {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="absolute right-6 top-6 z-10"><ThemeToggle /></div>
      <div className="bg-hero relative hidden flex-col justify-between p-12 text-sidebar-foreground lg:flex">
        <BrandLogo className="h-[108px] w-[230px]" />
        <div>
          <h1 className="text-5xl font-bold leading-tight">
            Your Personal Logger
            <br />
            <span className="text-sidebar-primary">for your flight academy.</span>
          </h1>
          <p className="mt-6 max-w-md text-sidebar-foreground/70">
            Dedicated portals for student pilots, flight instructors, ground instructors and administrators — with every action recorded in a live audit trail.
          </p>
          <ul className="mt-8 grid max-w-md grid-cols-2 gap-3 text-sm text-sidebar-foreground/80">
            <li>{"\n"}</li>
            <li>{"\n"}</li>
            <li>{"\n"}</li>
            <li>{"\n"}</li>
            <li>{"\n"}</li>
            <li>{"\n"}</li>
          </ul>
        </div>
        <p className="num text-xs text-sidebar-foreground/50">Copyright @ SilverArrows AI Studio</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <BrandLogo className="mb-8 h-[85px] w-[180px] lg:hidden" />
          <h2 className="text-3xl font-bold">{mode === "signin" ? "Sign in" : "Create account"}</h2>
          {noAccess ? (
            <div className="mt-6 rounded-lg border bg-card p-5 text-sm">
              <p className="font-medium">This account isn't part of an academy yet.</p>
              <p className="mt-1 text-muted-foreground">Ask your administrator to add your email address to your member record, then sign in again.</p>
              <Button variant="outline" className="mt-4" onClick={() => void signOut()}>Sign out</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} required />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
              </div>
              {mode === "signup" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="verify">Verify password</Label>
                    <Input id="verify" type="password" autoComplete="new-password" value={verify} onChange={(e) => setVerify(e.target.value)} minLength={8} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="role">Register as</Label>
                    <NativeSelect id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                      {(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                    </NativeSelect>
                  </div>
                  {role === "admin" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="master">Master password (administrators only)</Label>
                      <Input id="master" type="password" value={master} onChange={(e) => setMaster(e.target.value)} required />
                      <p className="text-xs text-muted-foreground">Administrator accounts require the academy master password.</p>
                    </div>
                  )}
                </>
              )}
              <Button type="submit" className="w-full" disabled={busy || !hydrated}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</Button>
              <button type="button" className="w-full text-center text-sm text-primary hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
                {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
              </button>
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Quick sign-in (testing)</p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ROLES.map((r) => (
                    <Button key={r.email} type="button" variant="outline" size="sm" disabled={busy || !hydrated} onClick={() => void quickSignIn(r.email)}>
                      {r.label}
                    </Button>
                  ))}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

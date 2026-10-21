import { useNavigate } from "@tanstack/react-router";
import { useMe } from "@/lib/store";
import { activeUsers } from "@/lib/logic";
import { NativeSelect } from "@/components/app-ui";
import type { Role, User } from "@/lib/types";

export const viewAsSearch = (s: Record<string, unknown>): { id?: string } => (typeof s["id"] === "string" ? { id: s["id"] as string } : {});

/** Resolves whose portal is shown: yourself, or (for admins) the selected user. */
export function useViewAs(role: Role, id?: string): User | undefined {
  const { data, me } = useMe();
  if (me.role === role) return me;
  if (me.role !== "admin") return undefined;
  const list = activeUsers(data, role);
  return list.find((u) => u.id === id) ?? list[0];
}

export function ViewAsPicker({ role, current, to }: { role: Role; current?: User | undefined; to: "/portal/student" | "/portal/cfi" | "/portal/ground" }) {
  const { data, me } = useMe();
  const navigate = useNavigate();
  if (me.role !== "admin") return null;
  return (
    <div className="flex items-center gap-2 rounded-md border border-accent bg-accent/15 px-3 py-1.5 text-sm">
      <span className="font-medium">Super-admin view as</span>
      <NativeSelect className="h-8 w-48" value={current?.id ?? ""} onChange={(e) => navigate({ to, search: { id: e.target.value } })}>
        {activeUsers(data, role).map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </NativeSelect>
    </div>
  );
}

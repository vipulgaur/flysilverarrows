import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, KV } from "@/components/app-ui";
import { ProfileEditor } from "@/components/profile-editor";
import { ProfileRequests } from "@/components/profile-requests";
import { ProfileSetup } from "@/components/profile-setup";
import { PROFILE_FIELDS, STAFF_ONLY_FIELDS } from "@/lib/logic";
import { useMe } from "@/lib/store";
import { roleLabel, type ProfileChanges } from "@/lib/types";

export const Route = createFileRoute("/_shell/profile")({
  head: () => ({ meta: [
    { title: "My profile — SilverArrows" },
    { name: "description", content: "Your approved member profile and profile change request history." },
    { property: "og:title", content: "My profile — SilverArrows" },
    { property: "og:description", content: "Member profile, administrator approvals and change request history." },
    { property: "og:type", content: "profile" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ProfilePage,
});
function ProfilePage() {
  const { me } = useMe();
  return <div>
    <PageHeader title="My profile" subtitle={`${me.name} · ${roleLabel[me.role]}`}><ProfileEditor person={me} /></PageHeader>
    <ProfileSetup />
    <section aria-label="Approved profile" className="mt-6 max-w-2xl">
      <h2 className="mb-3 text-lg font-semibold">Current profile</h2>
      {(Object.keys(PROFILE_FIELDS) as (keyof ProfileChanges)[]).filter((key) => !(me.role === "student" && (STAFF_ONLY_FIELDS as readonly string[]).includes(key))).filter((key) => me[key] !== undefined || ["name", "email", "phone", "callsign"].includes(key)).map((key) => <KV key={key} k={PROFILE_FIELDS[key]} v={<span className="break-all">{String(me[key] ?? "—")}</span>} />)}
    </section>
    <ProfileRequests />
  </div>;
}
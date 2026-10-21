-- The app's upsert does not send profile_id, so the previous insert check could never pass.
-- The account-derived id alone is sufficient: one row per account, no role escalation
-- (roles live in member_roles, admin-only), and guard_member_update still protects
-- privileged fields on later edits.

drop policy "members insert own" on public.tenant_members;

create policy "members insert own"
on public.tenant_members
for insert
to authenticated
with check (id = 'm-' || auth.uid()::text);
-- Upserts from the app need an INSERT path: allow an account to create only its own
-- member row (id derived from the account id, linked to its own profile). Roles live in
-- member_roles, which stays admin-only, so this cannot grant privileges.

create policy "members insert own"
on public.tenant_members
for insert
to authenticated
with check (id = 'm-' || auth.uid()::text and profile_id = auth.uid());
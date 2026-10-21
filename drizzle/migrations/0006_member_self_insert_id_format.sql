-- register_member builds the member id without dashes ('m-' || replace(uid, '-', '')),
-- so the insert check must use the same format.

drop policy "members insert own" on public.tenant_members;

create policy "members insert own"
on public.tenant_members
for insert
to authenticated
with check (id = 'm-' || replace(auth.uid()::text, '-', ''));
-- Members may update their own record (program choice, photo, contact details).
-- Privileged fields stay admin-only via the guard trigger.

create or replace function public.guard_member_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.profile_id is distinct from old.profile_id and auth.uid() is not null then
    raise exception using errcode = 'P0001', message = 'FSA-403', detail = 'Account links are managed by sign-up only.';
  end if;
  if new.status = 'deleted' and old.status = 'active' and old.profile_id = auth.uid() then
    raise exception using errcode = 'P0001', message = 'FSA-409', detail = 'You cannot delete your own account.';
  end if;
  -- Non-admins editing their own record cannot change identity, status or instructor assignment.
  if auth.uid() is not null and not public.is_tenant_admin(old.tenant_id) then
    if new.id is distinct from old.id
       or new.tenant_id is distinct from old.tenant_id
       or new.name is distinct from old.name
       or new.email is distinct from old.email
       or new.status is distinct from old.status
       or new.instructor_id is distinct from old.instructor_id
       or new.deleted_by is distinct from old.deleted_by
       or new.deleted_at is distinct from old.deleted_at
       or new.status_reason is distinct from old.status_reason then
      raise exception using errcode = 'P0001', message = 'FSA-403', detail = 'Only an administrator can change those details.';
    end if;
  end if;
  return new;
end $$;

create policy "members update own"
on public.tenant_members
for update
to authenticated
using (id = public.current_member_id(tenant_id))
with check (id = public.current_member_id(tenant_id));
alter table public.tenant_members add column if not exists photo_url text;

create or replace function public.register_member(p_first text, p_last text, p_role public.app_role, p_master text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_tenant uuid := '5a0e0000-0000-4000-8000-000000000001';
  v_member text;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;
  select email into v_email from auth.users where id = v_uid;
  if v_email is null then
    raise exception 'Account not found';
  end if;

  -- Existing member record with this email: just link the account.
  select id into v_member from public.tenant_members
   where tenant_id = v_tenant and lower(email) = lower(v_email) and status <> 'deleted'
   limit 1;
  if v_member is not null then
    update public.tenant_members set profile_id = v_uid where id = v_member;
    return v_member;
  end if;

  -- New administrators must know the master password (checked here, server-side).
  if p_role = 'admin' and (p_master is null or p_master <> 'Vipul@1011') then
    raise exception 'Master password incorrect — administrator registration refused';
  end if;

  v_member := 'm-' || replace(v_uid::text, '-', '');
  insert into public.tenant_members (tenant_id, id, profile_id, name, email, status)
  values (v_tenant, v_member, v_uid, trim(p_first || ' ' || p_last), v_email, 'active');
  insert into public.member_roles (tenant_id, id, member_id, role)
  values (v_tenant, v_member, v_member, p_role);
  return v_member;
end;
$$;

grant execute on function public.register_member(text, text, public.app_role, text) to authenticated;
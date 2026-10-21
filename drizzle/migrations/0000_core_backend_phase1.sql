-- Phase 1 core backend: identity, tenancy, fleet, training, scheduling, operations, audit.
create extension if not exists btree_gist;

create type public.app_role as enum ('admin','instructor','ground','student');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name text not null,
  time_zone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_members (
  tenant_id uuid not null references public.tenants(id),
  id text not null,
  profile_id uuid references public.profiles(id),
  name text not null check (length(trim(name)) between 1 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text, callsign text, program_id text, instructor_id text, licence text, stage text, speciality text,
  medical_class int check (medical_class in (1,2)),
  medical_expiry date, rating_expiry date,
  icao_level int check (icao_level between 1 and 6),
  prior_minutes int check (prior_minutes >= 0),
  status text not null default 'active' check (status in ('active','deleted')),
  deleted_by text, deleted_at text, status_reason text,
  address text, post_code text, city text, country text, date_of_birth text, gender text, place_of_birth text,
  user_reference text, caa_ref text, emergency_name text, emergency_phone text, emergency_relation text,
  public_note text, admin_note text, instructor_note text,
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  unique (tenant_id, profile_id)
);
create unique index uq_member_email on public.tenant_members (tenant_id, lower(email)) where archived_at is null;

create table public.member_roles (
  tenant_id uuid not null references public.tenants(id), id text not null, member_id text not null, role public.app_role not null,
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id), unique (tenant_id, member_id),
  foreign key (tenant_id, member_id) references public.tenant_members(tenant_id, id)
);

create table public.aircraft (
  tenant_id uuid not null references public.tenants(id), id text not null,
  reg text not null, type text not null,
  hourly_rate numeric(12,2) not null default 0 check (hourly_rate >= 0),
  total_hours numeric(10,1) not null default 0 check (total_hours >= 0),
  tach_hours numeric(10,1) not null default 0 check (tach_hours >= 0),
  last_service text, grounded boolean not null default false,
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create unique index uq_aircraft_reg on public.aircraft (tenant_id, upper(reg)) where archived_at is null;

create table public.maintenance_items (
  tenant_id uuid not null references public.tenants(id), id text not null, aircraft_id text not null,
  title text not null, due_hours numeric(10,1), due_date date, interval_hours numeric(10,1) check (interval_hours > 0), completed_at text,
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id), foreign key (tenant_id, aircraft_id) references public.aircraft(tenant_id, id)
);

create table public.programs (
  tenant_id uuid not null references public.tenants(id), id text not null, name text not null,
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table public.program_lessons (
  tenant_id uuid not null references public.tenants(id), id text not null, program_id text not null,
  name text not null, kind text not null check (kind in ('flight','ground')), minutes int not null check (minutes > 0), position int not null default 0,
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id), foreign key (tenant_id, program_id) references public.programs(tenant_id, id)
);

create table public.theory_subjects (
  tenant_id uuid not null references public.tenants(id), id text not null, code text not null, name text not null,
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table public.classrooms (
  tenant_id uuid not null references public.tenants(id), id text not null, name text not null, capacity int not null check (capacity > 0),
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table public.bookings (
  tenant_id uuid not null references public.tenants(id), id text not null,
  starts_at timestamptz not null, ends_at timestamptz not null,
  type text not null check (type in ('lesson','solo','maintenance')),
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  aircraft_id text, instructor_id text, student_id text, lesson_id text, route text, notes text,
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, aircraft_id) references public.aircraft(tenant_id, id),
  check (ends_at > starts_at),
  constraint ex_aircraft_overlap exclude using gist (tenant_id with =, aircraft_id with =, tstzrange(starts_at, ends_at) with &&)
    where (archived_at is null and status <> 'cancelled' and aircraft_id is not null),
  constraint ex_instructor_overlap exclude using gist (tenant_id with =, instructor_id with =, tstzrange(starts_at, ends_at) with &&)
    where (archived_at is null and status <> 'cancelled' and instructor_id is not null),
  constraint ex_student_overlap exclude using gist (tenant_id with =, student_id with =, tstzrange(starts_at, ends_at) with &&)
    where (archived_at is null and status <> 'cancelled' and student_id is not null)
);

create table public.flights (
  tenant_id uuid not null references public.tenants(id), id text not null,
  date date not null, off_block text not null, on_block text not null,
  minutes int not null check (minutes > 0 and minutes <= 1440),
  kind text check (kind in ('dual','solo','sim')),
  ifr_minutes int check (ifr_minutes >= 0), night_landings int check (night_landings >= 0),
  tach_start numeric(10,1), tach_end numeric(10,1),
  aircraft_id text not null, pilot_id text not null, instructor_id text, lesson_id text, booking_id text,
  landings int not null default 0 check (landings >= 0),
  from_icao text not null, to_icao text not null,
  grade int check (grade between 1 and 5), remarks text,
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, aircraft_id) references public.aircraft(tenant_id, id),
  foreign key (tenant_id, pilot_id) references public.tenant_members(tenant_id, id),
  check (tach_end is null or tach_start is null or tach_end >= tach_start)
);

create table public.completions (
  tenant_id uuid not null references public.tenants(id), id text not null,
  student_id text not null, lesson_id text not null, date date not null, instructor_id text, grade int check (grade between 1 and 5), flight_id text,
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table public.change_requests (
  tenant_id uuid not null references public.tenants(id), id text not null,
  booking_id text not null, student_id text not null, instructor_id text,
  reason text not null check (reason in ('weather','medical','academic','personal')), details text not null default '',
  proposed_start timestamptz not null, proposed_end timestamptz not null,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  reviewer_id text, notes text, reviewed_at timestamptz, created_at timestamptz not null default now(),
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id), check (proposed_end > proposed_start)
);

create table public.exam_results (
  tenant_id uuid not null references public.tenants(id), id text not null,
  student_id text not null, subject_id text not null, score numeric(5,1) not null check (score between 0 and 100),
  passed boolean not null, signed_by text not null, date date not null,
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table public.lectures (
  tenant_id uuid not null references public.tenants(id), id text not null,
  subject_id text not null, title text not null, starts_at timestamptz not null, ends_at timestamptz not null,
  room_id text not null, instructor_id text not null,
  enrolled text[] not null default '{}', attended text[] not null default '{}', signed_off boolean not null default false,
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id), check (ends_at > starts_at),
  constraint ex_room_overlap exclude using gist (tenant_id with =, room_id with =, tstzrange(starts_at, ends_at) with &&) where (archived_at is null)
);

create table public.duty_records (
  tenant_id uuid not null references public.tenants(id), id text not null,
  instructor_id text not null, starts_at timestamptz not null, ends_at timestamptz,
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id), check (ends_at is null or ends_at > starts_at)
);
create unique index uq_open_duty on public.duty_records (tenant_id, instructor_id) where ends_at is null and archived_at is null;

create table public.profile_requests (
  tenant_id uuid not null references public.tenants(id), id text not null,
  user_id text not null, submitted_by text not null, changes jsonb not null default '{}', before_values jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now(), reviewed_at timestamptz, reviewer_id text, notes text,
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create unique index uq_one_pending_profile_request on public.profile_requests (tenant_id, user_id) where status = 'pending' and archived_at is null;

create table public.learning_records (
  tenant_id uuid not null references public.tenants(id), id text not null,
  user_id text not null, chapter_id text not null, completed boolean not null default false, bookmarked boolean not null default false,
  notes text not null default '', answers jsonb not null default '{}',
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id), unique (tenant_id, user_id, chapter_id)
);

create table public.notification_reads (
  tenant_id uuid not null references public.tenants(id), id text not null, member_id text not null, notification_id text not null,
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table public.activity_feed (
  tenant_id uuid not null references public.tenants(id), id text not null,
  occurred_at timestamptz not null default now(), actor_id text not null, actor_name text not null, actor_role public.app_role not null,
  action text not null, entity_type text not null, entity_id text, details text not null default '',
  archived_at timestamptz, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid, table_name text not null, row_id text, action text not null,
  actor_id uuid, old_data jsonb, new_data jsonb, at timestamptz not null default now()
);

create or replace function public.current_member_id(_tenant uuid) returns text
language sql stable security definer set search_path = public as $$
  select id from public.tenant_members where tenant_id = _tenant and profile_id = auth.uid() and status = 'active' and archived_at is null
$$;

create or replace function public.is_tenant_member(_tenant uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_member_id(_tenant) is not null
$$;

create or replace function public.is_tenant_admin(_tenant uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.member_roles r where r.tenant_id = _tenant and r.archived_at is null and r.role = 'admin'
                 and r.member_id = public.current_member_id(_tenant))
$$;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

create or replace function public.forbid_delete() returns trigger language plpgsql set search_path = public as $$
begin raise exception using errcode = 'P0001', message = 'FSA-403', detail = format('Records in %s are never deleted; they are archived instead.', tg_table_name); end $$;

create or replace function public.forbid_mutation() returns trigger language plpgsql set search_path = public as $$
begin raise exception using errcode = 'P0001', message = 'FSA-423', detail = format('%s entries cannot be changed.', tg_table_name); end $$;

create or replace function public.audit_trigger() returns trigger language plpgsql security definer set search_path = public as $$
declare v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
        v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  insert into public.audit_log (tenant_id, table_name, row_id, action, actor_id, old_data, new_data)
  values (coalesce((v_new->>'tenant_id')::uuid, (v_old->>'tenant_id')::uuid), tg_table_name,
          coalesce(v_new->>'id', v_old->>'id'), tg_op, auth.uid(), v_old, v_new);
  return coalesce(new, old);
end $$;

create or replace function public.guard_member_update() returns trigger language plpgsql set search_path = public as $$
begin
  if new.profile_id is distinct from old.profile_id and auth.uid() is not null then
    raise exception using errcode = 'P0001', message = 'FSA-403', detail = 'Account links are managed by sign-up only.';
  end if;
  if new.status = 'deleted' and old.status = 'active' and old.profile_id = auth.uid() then
    raise exception using errcode = 'P0001', message = 'FSA-409', detail = 'You cannot delete your own account.';
  end if;
  return new;
end $$;

create or replace function public.link_member_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.profile_id is null and new.status = 'active' then
    select p.id into new.profile_id from public.profiles p
    where lower(p.email) = lower(new.email)
      and not exists (select 1 from public.tenant_members m where m.tenant_id = new.tenant_id and m.profile_id = p.id)
    limit 1;
  end if;
  return new;
end $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare v_tenant uuid; v_member text;
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  update public.tenant_members set profile_id = new.id
   where lower(email) = lower(new.email) and profile_id is null and status = 'active' and archived_at is null;
  if not found then
    select m.tenant_id, m.id into v_tenant, v_member
      from public.tenant_members m join public.member_roles r on r.tenant_id = m.tenant_id and r.member_id = m.id and r.role = 'admin'
     where m.profile_id is null and m.status = 'active' and m.archived_at is null
       and not exists (select 1 from public.tenant_members m2 join public.member_roles r2 on r2.tenant_id = m2.tenant_id and r2.member_id = m2.id
                        where m2.tenant_id = m.tenant_id and r2.role = 'admin' and m2.profile_id is not null)
     order by m.inserted_at limit 1;
    if v_member is not null then
      update public.tenant_members set profile_id = new.id, email = new.email where tenant_id = v_tenant and id = v_member;
    end if;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

grant select on public.tenants to authenticated;
grant select on public.profiles to authenticated;
grant select on public.audit_log to authenticated;
grant all on public.tenants, public.profiles, public.audit_log to service_role;
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;
create policy "members read their academy" on public.tenants for select to authenticated using (public.is_tenant_member(id));
create policy "read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admins read audit" on public.audit_log for select to authenticated using (public.is_tenant_admin(tenant_id));
create trigger trg_immutable before update or delete on public.audit_log for each row execute function public.forbid_mutation();

do $$
declare t text;
  admin_write text[] := array['tenant_members','member_roles','programs','program_lessons','theory_subjects','classrooms'];
  own_write text[] := array['learning_records','notification_reads'];
  all_tables text[] := array['tenant_members','member_roles','aircraft','maintenance_items','programs','program_lessons','theory_subjects','classrooms',
    'bookings','flights','completions','change_requests','exam_results','lectures','duty_records','profile_requests','learning_records','notification_reads','activity_feed'];
begin
  foreach t in array all_tables loop
    execute format('grant select, insert, update on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_tenant_member(tenant_id))', t);
    if t = any(admin_write) then
      execute format('create policy "admins insert" on public.%I for insert to authenticated with check (public.is_tenant_admin(tenant_id))', t);
      execute format('create policy "admins update" on public.%I for update to authenticated using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id))', t);
    elsif t = any(own_write) then
      execute format('create policy "own or admin insert" on public.%1$I for insert to authenticated with check (public.is_tenant_admin(tenant_id) or %2$I = public.current_member_id(tenant_id))', t, case when t = 'learning_records' then 'user_id' else 'member_id' end);
      execute format('create policy "own or admin update" on public.%1$I for update to authenticated using (public.is_tenant_admin(tenant_id) or %2$I = public.current_member_id(tenant_id)) with check (public.is_tenant_admin(tenant_id) or %2$I = public.current_member_id(tenant_id))', t, case when t = 'learning_records' then 'user_id' else 'member_id' end);
    elsif t = 'activity_feed' then
      execute 'create policy "log own actions" on public.activity_feed for insert to authenticated with check (actor_id = public.current_member_id(tenant_id))';
      execute 'create trigger trg_immutable before update or delete on public.activity_feed for each row execute function public.forbid_mutation()';
    else
      execute format('create policy "members insert" on public.%I for insert to authenticated with check (public.is_tenant_member(tenant_id))', t);
      execute format('create policy "members update" on public.%I for update to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id))', t);
    end if;
    execute format('create trigger trg_touch before update on public.%I for each row execute function public.touch_updated_at()', t);
    execute format('create trigger trg_nodelete before delete on public.%I for each row execute function public.forbid_delete()', t);
    execute format('create trigger trg_audit after insert or update on public.%I for each row execute function public.audit_trigger()', t);
  end loop;
end $$;

create trigger trg_member_guard before update on public.tenant_members for each row execute function public.guard_member_update();
create trigger trg_member_link before insert or update of email on public.tenant_members for each row execute function public.link_member_profile();
create trigger trg_touch before update on public.tenants for each row execute function public.touch_updated_at();
create trigger trg_touch before update on public.profiles for each row execute function public.touch_updated_at();
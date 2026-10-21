# SilverArrows database

- `../drizzle/migrations/*.sql` — the full schema: tables, keys, security rules, triggers and demo seed. Apply them in numeric order to a fresh PostgreSQL (Supabase) database.
- `data/*.csv` — a snapshot of every table's records taken on 2026-10-21.

## Restore the snapshot
1. Apply the migrations in order (`psql -f 0000_... .sql`, then 0001, ...).
2. Empty the demo rows the seed inserted if you want an exact copy, then load each CSV, parents first:
   tenants, profiles, programs, program_lessons, theory_subjects, classrooms, aircraft, tenant_members, member_roles, then the rest.
   `\copy public.<table> FROM 'data/<table>.csv' WITH CSV HEADER`
3. `profiles.id` must match accounts in `auth.users`. Sign-in accounts and passwords are not exported; recreate accounts with the same emails and members re-link by email on sign-up.

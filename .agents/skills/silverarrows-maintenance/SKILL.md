---
name: silverarrows-maintenance
description: Modify, troubleshoot, or verify the SilverArrows flight-school app in Antigravity. Use for changes to scheduling, roles, profiles, approvals, logbooks, demo storage, or local startup. No required inputs beyond the requested change or observed failure.
---

# SilverArrows maintenance

1. Read root `AGENTS.md` and `README.md`, then inspect the affected files before
   editing. Preserve the TanStack Start file-based routes and shared shell.
2. Reproduce the reported issue with the current local app or a focused test.
   Use `node run.mjs --check` for initial dependency setup and regressions;
   start the UI with `npm run dev:local` when interaction is needed.
3. Keep rule changes in the pure logic module and add concrete regression
   tests beside existing tests. Read `references/invariants.md` before editing
   permissions, approvals, hour reports, or persisted demo data.
4. Make the smallest complete change. Preserve approved values, retained audit
   history and user data. Never silently change demo mode into a backend app.
5. Run `npm test`; if dependencies, startup or server rendering changed, also
   run `npm run build:local` and exercise the built app with
   `npm run start:local`. In a Lovable-managed checkout, follow its automatic
   build constraints instead of manually building there.
6. Exercise the changed flow in the real UI, selecting the appropriate demo
   account and checking that results survive reload when persistence applies.
   For approval changes, submit as a member, review as an admin, then return to
   the member and read the outcome notification. Check the audit entry.
7. Report only observed outcomes: passing tests, exercised flow, and remaining
   limitations. Do not promise crash-free operation or production security.

## Recovery

- If storage is blocked or full, retain the in-memory session and warn that
  changes will not persist. Do not remove unrelated site storage.
- If dependencies cannot install, inspect the first error and public-registry
  connectivity. Preserve the lockfile; avoid broad dependency upgrades.
- If saved demo data is incompatible, migrate missing collections. A reset is
  destructive: ask before discarding a user's records.
- If a route fails only after building, inspect SSR imports and defer browser
  APIs to effects or event handlers; do not replace the router/framework.
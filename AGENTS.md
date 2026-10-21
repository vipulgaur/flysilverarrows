<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Student booking approval is enforced by database triggers, with atomic outcome activity and audit records; booking writes await the canonical saved row before reporting success.
- One tenant-scoped Realtime subscription reconciles remote rows with unsaved local diffs; retain pending edits during reads and clean subscriptions up on sign-out.
- Academy records live in Lovable Cloud tables; `src/lib/store.tsx` keeps the same in-memory AppData API for screens and syncs diffs through `src/lib/api/{mapping,sync}.ts` — keeps the UI unchanged while the server (RLS, constraints, triggers) is the authority.
- Database rows are never hard-deleted: removed records get `archived_at`, audit/activity rows are immutable — regulatory history must survive.
- Roles live in `member_roles`, never on the member row; accounts link to members by email on sign-up — prevents privilege escalation.
- Backend work follows the user's phased plan (uploaded OneGoTechnical spec); later phases add invoicing, safety reports, file storage and messaging.
- Business rules (booking conflicts, maintenance status, progress, role permissions) live as pure functions in `src/lib/logic.ts` with tests in `src/test/logic.test.ts` — keeps rules testable and shared across pages.
- Signed-in pages sit under the pathless `_shell` layout (client-only); it enforces route RBAC via `canAccess` in `src/lib/logic.ts` and shows a 403 panel — add every new route to that access map.
- Every user action calls the store `log()` so it appears in the audit log; users are never hard-deleted (soft-delete keeps history for regulatory audits).
- Cumulative-hour reports share one component and pure date-window logic; synthetic reporting entries stay separate from stored flights so demonstration totals never affect logbook edits or duty-limit calculations.
- Profile editors submit allowlisted changes through pure approval transitions; pending requests do not mutate users, admin edits are immediately approved, and notification/read state is derived from retained request records to preserve review history.
- Normalize newly added demo-store collections when reading older localStorage records so feature additions preserve existing user data.
- Keep portable local execution in `vite.local.ts` using public plugins; the Lovable preview retains its own config so local packaging does not break hosted execution.
- Route browser-storage writes through guarded persistence and migrate snapshots before using them; blocked storage must leave an in-memory session usable.
- The source handoff uses `run.mjs` and a public-registry lockfile; its launcher validates dependencies and tests before serving the app to catch startup regressions.
- Learning keeps manually supplied Markdown verbatim and authorized expanded lessons in separate Markdown, parses figure metadata separately, and uses a PDF-derived chapter catalogue with empty unauthorised chapters; progress counts available chapters only so old-course records and placeholders cannot affect current learning.
- Learning illustrations use original generated artwork imported as project assets in a shared static hotspot viewer that keeps each asset’s aspect ratio; part explanations appear on hover/focus/tap (no animations) and hotspot coordinates follow the artwork so explanations stay aligned.
- Style fenced lesson tables and text diagrams through shared `.learning-prose pre` rules, not per-chapter overrides, so source spacing survives consistently without changing supplied Markdown.
- Shared brand imagery uses the BrandLogo component across sign-in and the page shell; the favicon is derived from the same arrow asset so branding stays consistent.
- Appearance uses a shared root ThemeProvider with guarded browser persistence and semantic CSS tokens; sign-in and signed-in pages share the same toggle so appearance survives navigation without affecting demo records.

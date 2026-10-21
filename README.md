# SilverArrows — Antigravity source handoff

Complete source for the flight-school demo: administrator, flight instructor,
ground instructor and student portals; scheduling; flight logbooks; cumulative
demo hours; training; fleet maintenance; attendance; exams; profile approvals;
notifications; and audit history. Existing workflows are retained.

## Run in one go

1. Install **Node.js 24 LTS** (or Node.js **22.12+**) from https://nodejs.org.
   npm is included. No API keys, Cloud account or database setup is needed.
2. Extract the ZIP into a writable folder. Open **the extracted SilverArrows
   folder**, not the ZIP, in Antigravity.
3. Open Antigravity's terminal in that folder and run:

   ```sh
   node run.mjs
   ```

The launcher installs dependencies on first use, runs regression tests, then
starts the app and requests opening your browser. If the browser does not open,
visit **http://localhost:8080**. Stop with **Ctrl+C**. Repeat the same command
for subsequent sessions; unchanged dependencies are not reinstalled.

Windows alternative: double-click **run.bat**. macOS/Linux alternative:
`sh run.sh`. Keep the terminal open while using the application.

Internet is required for the first dependency install. Fonts use Google Fonts;
when unavailable the app uses fallback fonts. This is a web app, not an Electron
desktop application. Do not open a HTML file directly.

## Sign in and try the workflows

- Select a role, then a demo account. There are no passwords or real authentication.
- Student/crew: **My profile → Edit profile → Submit request**. Your existing
  profile remains unchanged until an administrator approves it.
- Administrator: open the administrator portal's profile requests, approve or
  decline (with a reason), then return to the applicant's account to see the
  notification. Administrator edits apply immediately.
- Student/instructor logbooks and hour details include 1, 7, 14, 21, 28 days and
  1, 3, 6, 12 calendar months. Cumulative numbers are labeled demo values and
  do not change logged flights or duty calculations.

## Data and limitations

Data is stored **only in this browser on this origin**, not online. The exported
source includes sample seed records, **not your current preview's browser data**.
Different browsers, computers or ports have separate data. Clearing site data
or using the administrator's reset restores the samples and removes local edits.
If browser storage is blocked/full, a warning appears and the app keeps working
in memory; changes disappear after refresh or closing the page. Unreadable or
structurally invalid saved snapshots fall back to sample data.

Role restrictions and audit records are for demonstration, not secure access
control or regulatory compliance. Do not use this demo for live flight-school
operations, real personal information, or operational flight decisions. Tests
reduce regressions but cannot guarantee zero crashes on every device.

## Commands

| Command | Result |
| --- | --- |
| `node run.mjs` | Install if needed, test, and launch |
| `node run.mjs --check` | Install if needed and run tests without a server |
| `npm test` | Run all regression tests |
| `npm run dev:local` | Start local development without setup checks |
| `npm run build:local` | Build the portable Node server |
| `npm run start:local` | Run the built server, normally on port 3000 |

For a production-mode local check, run `npm run build:local` then
`npm run start:local` and open http://localhost:3000. This is still demo mode.
The ZIP maps `npm run dev`, `npm run build`, and `npm start` to these portable
commands as well. Keep the included public `package-lock.json`; use `npm ci`
for repeatable fresh installs. Dependencies are pinned to the exported versions.
The exported `.npmrc` uses a scoped peer-resolution compatibility setting for
the bundled toolchain; required test peers are declared explicitly.

## Antigravity maintenance skill

The package includes a **SilverArrows maintenance** skill for modifying,
troubleshooting or verifying this app. Ask Antigravity: “Use the SilverArrows
maintenance skill to check this change.” Follow the installation instructions
in the included **SKILLS.md** if your Antigravity version needs manual loading.
It is agent guidance, not a plugin or extra application dependency.

## Troubleshooting

- **Node/npm not found:** install Node.js, close and reopen Antigravity, then
  check `node --version` and `npm --version`.
- **Port 8080 in use:** stop the other app or run
  `npm run dev:local -- --port 8081` and open http://localhost:8081. Changing
  ports means different browser data.
- **Install fails:** check internet/proxy access to https://registry.npmjs.org,
  writable-folder permissions and free disk space. Retry `node run.mjs` after
  resolving the reported error. No Lovable private registry access is required.
- **Tests fail:** startup intentionally stops; read the failing test, fix the
  problem, and retry rather than bypassing checks.
- **Stale dependencies:** delete `node_modules`, keep `package-lock.json`, then
  rerun the launcher. Do not delete browser data to fix an install problem.
- **Saved demo data is damaged:** the app recovers invalid top-level snapshots;
  for other malformed rows, use the administrator reset only if losing local
  edits is acceptable. Export flight CSV first when possible.

## Source layout

- `src/routes/`: TanStack pages and shared shell.
- `src/components/`: reusable application and UI controls.
- `src/lib/logic.ts`: shared business rules.
- `src/lib/store.tsx`, `demo-storage.ts`, `seed.ts`: demo state and recovery.
- `src/test/`: regression tests.
- `vite.local.ts`: public-package local development and Node build configuration.
- `run.mjs`, `run.bat`, `run.sh`: cross-platform launchers.
- `AGENTS.md`: architecture rules for coding agents.

React 19, TanStack Start/Router, TypeScript, Vite, Tailwind CSS and Nitro.
The live Lovable checkout retains `vite.config.ts`; the download replaces it
with the portable entry and omits private packages, Git metadata, secrets,
dependencies and generated build output.

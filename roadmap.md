# Cumulative flight hours
# Student booking approvals and live updates
- [x] Enforce student booking approval in the database and shared rules.
- [x] Show admin approval queue and notify students of approval/decline/cancellation.
- [x] Synchronize live records and table browser without overwriting unsaved changes.
- [x] Test rules and verify student submission, admin decision, notification and saved records.

# Cumulative flight hours
- [x] Add tested rolling-period calculations and stable demo hour records.
- [x] Show all nine periods in student/instructor logbooks and hour details.
- [x] Verify both roles and existing logbook controls.

# Profile change approvals
- [x] Add profile editing for every role with pending changes hidden until admin approval.
- [x] Add admin approval/decline review and audit records.
- [x] Add notification bell for every member with approval/decline outcomes.
- [x] Test approval permissions and verify the complete request/review/notification flow.

# Antigravity handoff
- [x] Add public-package local setup, a one-command launcher, and README instructions.
- [x] Harden browser storage and empty ground-school actions; run regression checks.
- [x] Include and activate the approved SilverArrows maintenance skill.
- [x] Verify the exported app, inspect the clean source archive, and deliver it.

# E-learning
- [x] Extract and expand Chapter 2 with hotspots and hover animation.
- [x] Replace both PDF image crops with original concept-based illustrations and verify interactions.
- [x] Verify Chapter 2 reading, image interactions, saved notes and updated course progress.
- [x] Replace the old course with the PDF contents and the exact supplied Aircraft Familiarisation chapter.
- [x] Put book contents on the left and chapter content on the right; leave unsupplied chapters empty.
- [x] Generate all nine illustrations with clickable labels and concept-specific hover animation.
- [x] Verify chapter reading, interactions, notes and progress; remove superseded course code.

# Animated learning illustrations
- [x] Replace the previous wind clip with the current chapter's interactive stills and moving concept diagrams.
- [x] Verify hover, touch controls, reduced motion and logged actions.

# Appearance refresh
- [x] Apply black/yellow tokens and Google Sans across the app.
- [x] Add a persistent light/dark toggle and verify both appearances.

# Dashboard
- [x] Add role-specific dashboard with charts, timelines and key counts.
- [x] Show charts and timelines first, above the role panels, for every role.

# Lesson table alignment
- [x] Apply shared preformatted styling to all current and future lesson tables without changing chapter text.
- [x] Verify aligned tables on desktop and narrow screens.
## Backend (phased plan)
- [x] Phase 1: real sign-in, database for people/roles, fleet, syllabus, bookings, flights, completions, reschedules, exams, lectures, duty, profile requests, e-learning progress, notifications, activity + audit log
- [ ] Phase 2: invoicing and payments (blocked: needs Stripe account)
- [ ] Phase 3: safety reports, document/file storage, messaging, email/SMS alerts (blocked: SendGrid/Twilio keys), live tracking (blocked: RadarBox)
- [ ] Move remaining business rules (flight registration, reschedule approval, batch creation) into server-side atomic functions

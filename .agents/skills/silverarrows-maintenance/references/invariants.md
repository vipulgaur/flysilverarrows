# SilverArrows workflow invariants

- This app is demo-only with browser-local data. Demo account selection is not
  real authentication. Do not claim client role checks provide production security.
- Students, flight instructors and ground instructors may submit changes to
  their own profiles. Pending/declined values never mutate approved profiles.
  Only administrators review requests; administrator edits apply immediately.
- Every member has the notification bell. Preserve approval/decline outcomes,
  decline reasons, review history and per-member read tracking.
- Student and instructor cumulative reports retain all nine windows: 1, 7, 14,
  21, 28 days; 1, 3, 6, 12 calendar months. Keep clearly labeled synthetic totals
  separate from stored flights and duty-limit calculations.
- Preserve conflict checks, lecture capacity, training progress, duty rules,
  soft-delete/restore and audit history. Read their existing tests before edits.
- Extend `canAccess` for new routes. Keep shared logic testable, use guarded
  browser persistence, and migrate older saved collections without overwriting
  existing user rows.
- Keep the portable local configuration on public packages and the lockfile
  repeatable. Never include secrets, Git metadata, dependencies or generated
  output in source handoffs.
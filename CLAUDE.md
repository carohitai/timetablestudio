# Timetable Studio — project notes for Claude

Single-file React-in-browser app for The World School ICSE (Kolte Foundation),
Bhusawal. Everything lives in `index.html`; `sw.js` is a kill-switch, and the
rest is PWA plumbing.

## Hard rule: keep the in-app docs in sync with the code

Every time you change behaviour, constants, constraints, or the data shape,
**also update the two in-app documentation surfaces in the same commit**:

1. **User Manual** — the `HOW_TO` array and `HowToAccordion` component
   (search `===== User Manual`). Shown in the Overview tab. Answers staff
   FAQs in plain English.
2. **Rules page** — the `RulesPage` component (tab id `rules`, nav item
   `11 · Rules`). Enumerates every constraint the solver enforces plus the
   limits the live timetable watches for, with live numbers pulled from
   `data`.

When either of these drifts from the code, teachers ask the admin, the admin
asks Claude, and the cycle repeats. Treat docs-in-app as part of the feature,
not an afterthought. Before you declare a task complete:

- Re-read the relevant `HOW_TO` category and fix any entry whose answer is
  no longer true.
- Re-read `RulesPage` and update any rule whose wording, constant, or live
  stat no longer matches `data` or the solver.
- If you added a new surface (button, flow, state chip, keyboard shortcut),
  add a `HOW_TO` entry answering "how do I …?" and a `RulesPage` line if the
  change introduces or relaxes a constraint.
- If you removed a feature (e.g. a panel), grep the manual and Rules for
  references and purge them — stale docs are worse than no docs.

## Where things live

- `getSupabase()`, `cloudPullRow`, `cloudPushRow`, `cloudInsertBackup`,
  `cloudListBackups`, `cloudFetchBackup`, `cloudSubscribeRow` — all the
  Supabase plumbing, top of the React script block.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SCHOOL_EMAIL_DOMAIN` — constants near
  the top of `index.html`. Domain guard is enforced on every auth state
  change; any email outside the domain is immediately signed out.
- `App()` — owns `data`, `authUser`, `syncState`, undo/redo refs
  (`pastRef` / `futureRef`, 50-step cap), and the three ambient-sync effects
  (auto-pull on first load, debounced 2 s auto-push, realtime apply with
  conflict guard).
- `SyncStatusChip` — the only visible sync surface in the sidebar. Clicking
  opens `BackupsModal`. There is no Push / Pull button.
- `LoginGate` / `SplashLoader` — rendered before the main UI when
  `authReady` or `authUser` is missing.
- `migrateData()` — upgrades older data shapes. Always run on anything read
  from the cloud or imported from JSON before handing it to `setData`.
- Day-category data model: `school.dayCategories` +
  `school.categoryPeriods` (three categories: Weekdays, Activity Days, Bag
  Less Day; three groups: Pre-Primary, Primary, Upper — nine period grids
  total).
- Timetable cell shape: `{day,start,end,subjectId,teacherId,roomId}` stored
  per class in `data.timetables[classId]`.

## Constraints the solver actually enforces

Mirror these in `RulesPage` when they change:

- Allocated-subject pool per class.
- `floor(totalTeachingSlots / numSubjects)` quota per subject with
  remainder distributed from the top of the allocation list.
- No teacher double-booking across classes at overlapping times.
- Weekly max periods per teacher (non-Principal default 42, Principal per
  their own `maxPeriods`).
- First-period priority: class default first subject → class teacher's
  subject → next from shuffled pool.
- `teacherType='lecture_based'` availability window.
- Non-teaching rows (Recess/Break/Lunch/Interval/Tiffin/Assembly/Prayer/
  Orientation/Homeroom detection + explicit Type dropdown) are never filled.

## House style

- No build step. Babel compiles JSX in the browser. Don't introduce imports.
- No new files unless unavoidable; prefer extending existing helpers in
  `index.html`.
- Match existing terseness — single-line handlers, short arrow functions,
  co-located state where it's small.
- Don't add comments that describe WHAT the code does. Only write a comment
  when the WHY is non-obvious (an invariant, a quirk, a Supabase-specific
  constraint).
- When running locally: `python3 -m http.server 8000`. The service worker
  won't register off `file://`, but the app otherwise works.

## Deploy

`main` auto-deploys to GitHub Pages via `.github/workflows/pages.yml`.
Vercel also mirrors it. The user opens the live site, not a local dev
server, so your changes only matter once pushed to `main`.

# Timetable Studio

A self-contained, browser-based timetable builder for **The World School ICSE**, Bhusawal.

Built as a single static HTML file — no backend, no install, no database. Hosted free on GitHub Pages and works offline once loaded.

## Live site

After GitHub Pages is enabled, the app lives at:

```
https://carohitai.github.io/timetablestudio/
```

## What it does

- **Day Structure** — three session presets (Summer / Normal / Winter), separate Primary and Upper period grids, working-day picker, time-overlap validation.
- **Classes & Sections** — 19 ICSE classes pre-loaded, group (Primary/Upper), strength, class teacher.
- **Faculty Roster** — 27 default teachers, photos, qualifications, designation, OLD/NEW status, max periods/week, assigned classes.
- **Qualification Master** — degrees + professional courses, auto-mapped to subjects.
- **Subjects** — 15 ICSE-aligned subjects, custom colors.
- **Allocations** — searchable Class × Subject → Teacher matrix, filtered by qualification.
- **Timetable Builder** — per-class day × period grid, click-to-assign with room picker, **constraint-respecting auto-fill** (backtracking solver), live conflict detection.
- **Teacher Workload** — per-teacher load bars, OK / FULL / OVER badges, breakdown by subject / class / day.
- **Proxy Management** — mark absent teachers, see their day's schedule, assign free substitutes (clash-checked), **download proxy slips as PDF**.
- **Branding** — upload your school logo and customize name + tagline; appears in sidebar and on every export.
- **Export** — every section exports to Print / PDF, Excel (.xls), and Word (.doc).
- **Offline / PWA** — installable to phone or desktop, works without internet after first visit.

## Auto-fill solver

The auto-fill on the Timetable tab uses a backtracking solver that respects:

- Subject quota balanced from the Allocations tab (with a deterministic remainder distribution).
- **No teacher double-booking** across all classes at the same time slot.
- **Teacher max periods / week** (global cap, summed across every class).
- **Same-subject-per-day cap** (default: 2 of any subject per day).

If the solver cannot satisfy all constraints, it leaves the grid untouched and explains what to relax.

## Storage & data flow

- All data lives in the browser's `localStorage` under the key `tws_timetable_v8`.
- **Save as File** (sidebar) downloads a standalone `.html` file with the data embedded — share it, email it, open it on another machine, no setup needed.
- **Export JSON** / **Import JSON** for plain-data interchange.
- **☁ Cloud Sync** (sidebar panel) uses a shared **Supabase** row so multiple devices can Push/Pull the same workspace with a passcode.
- The auto-migration pipeline upgrades data from any prior version.

## Sign-in — Microsoft 365 single tenant

Access is gated by a full-screen **Sign in with Microsoft** page. Only members of The World School ICSE's Microsoft 365 / Entra ID tenant can get in. Email and password sign-up is disabled.

The client-side guard also checks that `user.email` ends with the domain in the `SCHOOL_EMAIL_DOMAIN` constant near the top of `index.html` (default `@theworldschool.in`). If you change school domains, update that one line.

### One-time Azure AD app registration

1. Azure portal → **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Name: `Timetable Studio`. Account type: **"Accounts in this organizational directory only (single tenant)"**.
3. Redirect URI: **Web**, value `https://vxjamffecdskypqvwrfq.supabase.co/auth/v1/callback`. Register.
4. Copy **Application (client) ID** and **Directory (tenant) ID** from the Overview page.
5. **Certificates & secrets** → **New client secret** → copy the **Value** (shown once).
6. **Authentication** → tick **ID tokens**.
7. **API permissions** → Microsoft Graph → Delegated → add `openid`, `email`, `profile`, `User.Read` → click **Grant admin consent**.

### One-time Supabase provider config

1. Supabase dashboard → **Authentication → Providers → Azure (Microsoft)** → Enable.
2. **Client ID** = Application (client) ID from step 4.
3. **Client Secret** = the Value from step 5.
4. **Azure Tenant URL** = `https://login.microsoftonline.com/<DIRECTORY_TENANT_ID>` — paste the Directory (tenant) ID from step 4. **Do not append `/v2.0`** — Supabase appends `/oauth2/v2.0/authorize` itself, and adding `/v2.0` on your end produces a 404 at `/v2.0/oauth2/v2.0/authorize`. Using `common` here would let any Microsoft account in — single-tenant lock requires the tenant ID.
5. **Authentication → URL Configuration** → **Site URL** = the live site URL (e.g. `https://carohitai.github.io/timetablestudio/`). Add the same URL to **Redirect URLs**.
6. **Authentication → Providers → Email** → **disable** (prevents anyone bypassing SSO via the email/password API directly).

### How sign-out is enforced

Session lives in Supabase Auth + the browser's localStorage (key `tws_supabase_auth`). The sidebar has a sign-out icon next to the collapse toggle; it calls `supabase.auth.signOut()` which wipes both, and the LoginGate reappears. Closing the tab does not sign out — use the button (or clear site data) to revoke a device.

## Cloud tables

Run the SQL below in Supabase → **SQL Editor**. It creates the sync table, the backups history table, and anon-read/write policies.

```sql
-- Main workspace row (one per install)
create table if not exists public.tws_timetables (
  id text primary key,
  data jsonb not null,
  passcode_hash text not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.tws_timetables enable row level security;
create policy "anon read"   on public.tws_timetables for select using (true);
create policy "anon write"  on public.tws_timetables for insert with check (true);
create policy "anon update" on public.tws_timetables for update using (true) with check (true);

-- Realtime broadcast for the main row (enables the "someone pushed — Pull"
-- banner in the Cloud Sync panel).
alter publication supabase_realtime add table public.tws_timetables;

-- Daily backups history. Auto-populated on Push (rate-limited to ~12 hours
-- between snapshots) so you always have a recent restore point.
create table if not exists public.tws_backups (
  id bigserial primary key,
  workspace_id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by text
);
create index if not exists tws_backups_ws_created_idx
  on public.tws_backups (workspace_id, created_at desc);

alter table public.tws_backups enable row level security;
create policy "anon read backups"  on public.tws_backups for select using (true);
create policy "anon write backups" on public.tws_backups for insert with check (true);
```

### How the cloud features work

- **Identity.** Every Push automatically tags `updated_by` with the signed-in user's school email (from Microsoft SSO). There's no anonymous path anymore — the app itself requires sign-in.
- **Real-time.** The Cloud Sync panel subscribes to the shared row via Supabase Realtime. When someone else pushes, you get an amber "↻ X pushed Ys ago — Pull to apply" banner with a one-click Pull button. Your own pushes are suppressed so you don't nag yourself.
- **Auto-backup.** Every successful Push also inserts a snapshot into `tws_backups`, capped at one per ~12 hours to keep the table small. Click the `⋯` button next to Push/Pull to open the **Cloud Backups** modal — pick any past snapshot and Restore overwrites your local copy (Push again if you want cloud restored too).

### Security notes

- The passcode is hashed (SHA-256) client-side; the raw passcode never leaves the browser. Pull refuses to apply a row whose `passcode_hash` doesn't match yours.
- The anon key + open RLS is a **shared-secret** model. Anyone with the Supabase URL + anon key can query the raw row. This is fine for internal school schedule data; **do not put student PII** in the timetable payload.
- For proper per-user access control (different permissions per teacher role), switch the RLS policies from `using (true)` to `using (auth.role() = 'authenticated')` — that requires every client to sign in before they can touch the tables.

## Deployment

This repo auto-deploys to GitHub Pages on every push to `main` via `.github/workflows/pages.yml`.

### One-time setup

1. Go to repo **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main`; the workflow runs and the site goes live in about a minute.

### Custom domain

1. Add a `CNAME` file at the repo root containing your domain (e.g. `timetable.theworldschool.in`).
2. In the domain DNS, add a `CNAME` record pointing to `carohitai.github.io`.
3. Repo **Settings → Pages → Custom domain** — enter the domain, tick **Enforce HTTPS**.

## Local development

It's just a static file. Any local server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

Or simply open `index.html` in a browser (the service worker won't register from `file://`, but everything else works).

## Tech stack

- **React 18** + **Babel standalone** (loaded from CDN for JSX-in-browser).
- **jsPDF** + **html2canvas** for proxy slip PDF generation.
- **Service Worker** + **Web App Manifest** for offline / installable PWA.
- No build step, no `node_modules`. The whole app is one file plus a few static assets.

## File layout

```
.
├── index.html               # the entire app
├── manifest.webmanifest     # PWA manifest
├── icon.svg                 # app icon
├── sw.js                    # service worker (caches app shell + CDN libs)
├── .github/workflows/
│   └── pages.yml            # GitHub Actions auto-deploy
├── Timetable_Studio_Teacher_Manual.docx
└── README.md
```

## Privacy

The app never sends your data anywhere — no analytics, no telemetry, no remote API. Everything stays in the browser. Don't commit screenshots or exports containing student personal data to a public repo.

---

Maintained for **The World School, ICSE — Bhusawal | Kolte Foundation Educational Institution**.

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

- All data lives in the browser's `localStorage` under the key `tws_timetable_v7`.
- **Save as File** (sidebar) downloads a standalone `.html` file with the data embedded — share it, email it, open it on another machine, no setup needed.
- **Export JSON** / **Import JSON** for plain-data interchange.
- The auto-migration pipeline upgrades data from any prior version (v1 → v7).

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

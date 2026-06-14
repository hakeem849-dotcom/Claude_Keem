# AGENTS.md — PharmaDesk

Context and working agreement for AI coding agents (Codex, etc.) and humans.

## What this is
**PharmaDesk** is a self-contained, browser-based **mock** management app for an
**independent community pharmacy**. It demonstrates the day-to-day
responsibilities a pharmacist juggles. It is a front-end-only demo — no backend,
no database, no network calls.

> ⚠️ All data is fictional. This is NOT a clinical tool and must not be used for
> real patient care, dispensing, or billing decisions. Do not add real PHI.

## Tech stack & hard constraints
- **Vanilla HTML + CSS + JavaScript only.** No frameworks, no bundler, no
  package manager, no transpiler. There is **no `node_modules`** and there must
  not be one.
- Runs by opening `index.html` in a browser, or via any static file server.
- Browser features used: ES2020+, `localStorage` (with in-memory fallback),
  service worker (PWA).
- Keep it dependency-free. Do not introduce npm packages or a build framework
  without an explicit request.

## Run it
```bash
# simplest
open index.html            # macOS  (xdg-open on Linux)

# or serve (recommended; required for the service worker / PWA)
python3 -m http.server 8000   # -> http://localhost:8000

# single-file build (everything inlined, works offline by double-click)
open dist/pharmadesk.html
```

## Commands
```bash
node build.js      # regenerate dist/pharmadesk.html from the source files
node test/smoke.js # headless smoke test: storage fallback + every view renders
```
There is no lint config; match the existing style (see Conventions).

## Project layout
```
index.html                  # layout shell + <head> (PWA meta) + script tags
css/styles.css              # ALL styles; CSS variables in :root; mobile nav in @media
js/data.js                  # SEED mock data + Store (localStorage w/ in-memory fallback)
js/app.js                   # everything else: helpers, Views, router, event wiring, boot
data/seed.json              # static, human-readable copy of the seed (keep in sync w/ js/data.js)
manifest.webmanifest        # PWA manifest
sw.js                       # service worker (cache-first app shell)
icon.svg                    # app icon
dist/pharmadesk.html        # GENERATED single-file build — do not hand-edit; run build.js
.github/workflows/pages.yml # GitHub Pages deploy (manual: workflow_dispatch)
build.js                    # bundler that produces dist/pharmadesk.html
test/smoke.js               # headless tests
```

## Architecture (how it works)
- **State/data** lives in `js/data.js`:
  - `SEED` is the initial dataset (patients, inventory, prescriptions, claims,
    mtmTasks, immunizations, interactionRules).
  - `Store` is an IIFE that loads/persists state. It persists to `localStorage`
    under key `pharmadesk.v1`, and **falls back to an in-memory copy when
    `localStorage` throws** (e.g. `file://` or private mode). Access data via
    getters (`Store.patients`, `Store.inventory`, …) and persist mutations with
    `Store.commit()`. `Store.reset()` restores the seed.
- **UI** lives in `js/app.js`:
  - `Views` is an object of functions, one per screen
    (`Views.dashboard`, `Views.prescriptions`, `Views.patients`,
    `Views.inventory`, `Views.interactions`, `Views.claims`,
    `Views.reimbursement`, `Views.refills`, `Views.controlled`,
    `Views.immunizations`, `Views.audits`, `Views.compliance`,
    `Views.reportcenter`, `Views.reports`). Each returns an **HTML string**.
  - `render()` sets `#view`'s innerHTML to `Views[currentView]()` then calls
    `wireView()` to attach event handlers (via `data-*` attributes).
  - `navigate(view)` switches the active view; nav buttons in `index.html` carry
    `data-view="..."`.
  - Boot is wrapped in try/catch and renders a visible error on failure.
- **Rendering pattern:** template literals returning HTML strings; handlers are
  wired after injection by querying `data-*` attributes in `wireView()`. There is
  no virtual DOM and no reactivity — after mutating state, call `render()`.

## Domain model / key logic
- **Dispensing workflow** (`STATUS_FLOW`): intake → verification → pmp-review →
  filling → ready → dispensed. `advanceRx()` moves a script forward; a **Drug
  Utilization Review** gate (`showDUR`) runs interaction + allergy checks before
  leaving verification/intake. Dispensing decrements `drug.stock` and refills.
- **Interactions:** `checkInteractions(drugs)` cross-references `interactionRules`
  by drug `class`; `allergyConflict(patient, drug)` maps allergies to drug
  keywords.
- **Controlled substances:** drugs with `schedule > 0` (DEA C-II…C-V) get badges
  and a dedicated register.
- **Claims:** adjudication records with status `paid|rejected|reversed` and NCPDP
  reject codes; `readjudicate()` resolves a rejection.
- **PBM economics (the survival math):** `claimEconomics(claim)` returns
  `acquisitionCost` (`rx.qty * drug.cost`), `reimbursement` (`paid + copay`),
  `dirFee` (retroactive clawback), and `net` (reimbursement − cost − DIR +
  recovered). `underwater` = net < 0; `macEligible` = reimbursement < cost.
  MAC appeals: `fileMacAppeal()` / `resolveMacAppeal()`. These feed the
  Reimbursement view and the dashboard "survival signals" row.
- **Audits:** `audits` (active/closed with `amountAtRisk`/`recouped`) and
  `auditReadiness` (control checklist; `resolveAuditGap()` closes a gap).
- **Compliance:** `credentials` with `expires`; `renewCredential()` pushes the
  date out one year. Expiry coloring keyed off `daysUntil()`.
- **Projected margin / below-cost guard:** `projectedEconomics(drug, qty)` uses
  the drug's `expReimb` and `dirRate` to return `{reimbursement, cost, dir, net,
  perUnit, belowCost, underwater}`. `commitAdvance()` routes a dispense through
  `showBelowCostWarning()` when `net < 0`, then `doDispense()`.
- **Report Center:** `REPORTS` is a map of `{ico, title, desc, build()}` where
  `build()` returns `{cols, rows, summary}`. `previewReport`/`downloadReportCSV`
  (`toCSV`) / `downloadReportHTML` (`reportHTML`) render & export. `buildPacket()`
  + `packetHTML()` + `packetAction()` produce the reimbursement submission packet.
  Add a report by adding one entry to `REPORTS` — the card grid is generated.
- **Detail modals:** `detailModal(title, kvObject, extraHtml)` is the shared
  drill-in. `drugDetail`/`claimDetail`/`auditDetail`/`credentialDetail` use it;
  rows expose them via `class="lk" data-drug|claim|audit|cred`. `statCard(...,
  goView)` makes a KPI clickable (navigates to `goView`).
- **Downloads:** `downloadFile(name, content, mime)` (Blob + anchor) — works from
  http(s) and `file://`.
- **Refills/Adherence:** refill-due dates derived from `dispensedOn + daysSupply`;
  `pdc` (Proportion of Days Covered) per maintenance med; MTM task list.

## Conventions
- 2-space indent; semicolons; double quotes in JS.
- Use the existing tiny DOM helpers `$`, `$$` (in `js/app.js`). Escape any
  user/string content interpolated into HTML with `escapeHtml()`.
- Currency via `money()`, dates via `fmtDate()`. "Today" is pinned to the
  constant `TODAY` for deterministic demo output — use it, don't call
  `new Date()` directly for relative dates.
- Reuse the CSS component classes (`.card`, `.badge .green/.amber/.red/...`,
  `.btn`, `.stat`, `.alert`, `.table-wrap`) instead of inventing new styles.

## Adding a new screen (recipe)
1. Add `Views.myview = () => \`...HTML...\`;` in `js/app.js`.
2. Add a nav button in `index.html`: `<button class="nav-item" data-view="myview">…</button>`.
3. If it has interactive elements, wire them in `wireView()` using `data-*` hooks.
4. Mutate through `Store` + `Store.commit()`, then call `render()`.

## Gotchas
- **Keep `js/data.js` (SEED) and `data/seed.json` in sync** if you change seed
  data — they are intentionally duplicated (the app can't `fetch()` JSON from a
  `file://` page).
- **`dist/pharmadesk.html` is generated.** Edit the source files, then run
  `node build.js`. Don't hand-edit the bundle.
- The PWA service worker only registers over http/https, not `file://`. Bump the
  `CACHE` version in `sw.js` when you change cached assets.
- GitHub Pages deploy is **manual** (`workflow_dispatch`) and requires the repo
  to be public (or a paid plan for private repos).

## Definition of done for a change
- `node test/smoke.js` passes (exit 0).
- `node build.js` runs and `dist/pharmadesk.html` updated if source changed.
- Seed JSON kept in sync if seed data changed.
- App still opens and navigates with no console errors.

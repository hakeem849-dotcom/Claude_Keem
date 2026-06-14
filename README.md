# PharmaDesk — Independent Pharmacy Manager (mock app)

A self-contained, browser-based mock application that demonstrates the day-to-day
responsibilities an **independent community pharmacist** juggles. No backend, no
build step, no dependencies — just open the file in a browser.

> ⚠️ **Demonstration only.** All patients, drugs, prices, and interaction data
> are fictional. This is not a clinical tool and must not be used for real
> patient care or dispensing decisions.

## What it covers

| Module | Pharmacist responsibility it models |
| --- | --- |
| **Dashboard** | At-a-glance view of the queue, clinical alerts, low stock, and revenue |
| **Dispensing Queue** | Full Rx workflow: Intake → DUR/Verification → PMP Review → Filling → Ready → Dispensed. Dispensing decrements live inventory and decrements refills |
| **Patients** | Patient charts: demographics, conditions, allergies, full medication profile, and per-patient clinical alerts |
| **Inventory** | Formulary & stock levels, reorder-point alerts, expiry tracking, receiving stock, and inventory valuation |
| **Interaction Checker** | Drug Utilization Review — screen a patient's whole profile or run an ad-hoc multi-drug check against an interaction knowledge base; allergy cross-checks |
| **Claims & Billing** | Third-party claim adjudication (BIN/PCN, billed/paid/copay), NCPDP reject codes, and re-adjudication of rejected claims |
| **Reimbursement / PBM** | Per-claim net after acquisition cost **and DIR clawbacks**; flags **underwater claims** (paid below cost); MAC appeal workflow — the economics that actually close pharmacies |
| **Audit Center** | Active PBM/DEA audits with $ at risk, due dates & recoupment, plus an audit-readiness scorecard to close documentation gaps before they cost money |
| **Compliance** | License / registration / insurance renewals (permit, DEA, PIC license, liability, PMP) with expiry alerts and renewal tracking |
| **Refills & Adherence** | Refill-due tracking with reminders, medication adherence (PDC) scoring, and an MTM / patient-counseling task list |
| **Controlled Log** | Perpetual inventory + dispensing register for DEA C-II through C-V scheduled drugs |
| **Immunizations** | Record and review vaccine administrations (vaccine, lot, site, date) |
| **Business Reports** | Revenue, cost of goods, gross margin, top medications, and payer mix |

### Clinical safety features (simulated)
- **Automatic DUR gate** — advancing a prescription past verification triggers an
  interaction + allergy screen; major findings require a documented override.
- **Allergy cross-checking** between a patient's recorded allergies and prescribed drugs.
- **Controlled-substance awareness** with schedule badges and a dedicated register.

## Running it

```bash
# Option 1 — just open it
open index.html            # macOS
xdg-open index.html        # Linux

# Option 2 — serve locally (any static server works)
python3 -m http.server 8000
# then visit http://localhost:8000

# Option 3 — single self-contained file (no folder needed)
# open dist/pharmadesk.html directly in any browser (works offline)
```

## Mobile / installable app (PWA)

PharmaDesk is a **Progressive Web App** — when served over HTTPS it can be
installed to a phone's home screen and launches full-screen like a native app,
with offline support via a service worker.

- On phones the navigation becomes a fixed bottom tab bar.
- To install: open the hosted URL on your phone → browser menu →
  **"Add to Home Screen"** (iOS Safari) / **"Install app"** (Android Chrome).
- A GitHub Actions workflow (`.github/workflows/pages.yml`) publishes the app to
  **GitHub Pages** at `https://<owner>.github.io/<repo>/`. PWA install requires
  HTTPS, so use the hosted URL (not `file://`) to install on a device.

## Data

- Live app state is seeded from `js/data.js` and persisted in the browser's
  `localStorage`. Use **"Reset demo data"** in the sidebar to restore the original
  state at any time.
- A static, human-readable copy of the same seed lives in
  [`data/seed.json`](data/seed.json) for inspection or reuse.

## Project structure

```
index.html        # markup + layout shell
css/styles.css    # styling
js/data.js        # mock data + localStorage store
js/app.js         # views, routing, and pharmacy logic
data/seed.json    # static copy of the seed data
```

## Tech

Vanilla HTML, CSS, and JavaScript — intentionally framework-free so it runs
anywhere with zero setup.

<!-- pages redeploy 2026-06-14T01:46:51Z -->

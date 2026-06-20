# PharmaDesk — project memory

## ⚠️ Session handover rule (always follow)
Whenever you are about to run out of session space or are approaching the
context/usage limit: **stop all work immediately and produce a handover
briefing** before doing anything else. The briefing must cover:
- What you were working on (the task and why).
- Exactly where you left off (last action completed, current state).
- Anything uncommitted/unpushed and how to resume.
- Open risks, decisions pending, and the next concrete step.
Finish the briefing even if it means leaving the current edit incomplete —
a clean handover takes priority over one more change.

## Always share the live link
When reporting any update, **always include the live GitHub Pages link** so it
can be tried immediately: https://hakeem849-dotcom.github.io/Claude_Keem/
(After a deploy, note it may take ~1 min and to hard-refresh.)

## What this project is
A dependency-free, browser-based mock pharmacy app. There is **one** app:
the black-and-white **Noir operator edition**, served from the repo root and
published to GitHub Pages. Do not reintroduce alternate variants.

- Entry: `index.html` (forces light theme; loads the v3 layer).
- Foundation: `css/styles.css`, `js/data.js`, `js/app.js` (base views/logic).
- Operator layer (`v3/`): `noir.css` (monochrome design system, loaded last),
  `v3.css`, and JS `v3.js`, `operator-upgrades.js`, `view-mode.js`,
  `import-center.js`, `streamline.js` (hub views), `final-router.js`
  (`window.navigate = show`; 6-hub nav), `command.js` (⌘K palette).
- Data seeds from `js/data.js` → `localStorage`; reset via the sidebar.

## Working rules
- Verify changes: `node test/smoke.js` (renders every view headlessly).
- Build single-file: `node build.js` → `dist/pharmadesk.html` (inlines local CSS/JS).
- Deploy: push to `main` → `.github/workflows/pages.yml`. Bump `CACHE` in
  `sw.js` on any asset change so phones get the new build.
- A PostToolUse hook (`.claude/hooks/check-edit.js`) runs `node --check` on edited JS.
- **No browser here:** this container can't run Chrome (network blocks install),
  so UI cannot be screenshotted from the agent side. Rely on the user for
  visual confirmation; verify logic headlessly.

Live: https://hakeem849-dotcom.github.io/Claude_Keem/

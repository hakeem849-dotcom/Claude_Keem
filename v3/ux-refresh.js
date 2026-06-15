/* PharmaDesk UX Refresh — modern product aesthetic + hard behavior fixes.
   Inspired by disciplined product UIs: restrained tokens, inset sidebar, crisp cards,
   mobile-first bottom navigation, and explicit event-level Home/Tour handling. */
(function () {
  const NAV = [
    { view: "dashboard", icon: "⌂", label: "Home" },
    { view: "dispensinghub", icon: "℞", label: "Dispense" },
    { view: "patienthub", icon: "◉", label: "Patients" },
    { view: "inventoryhub", icon: "□", label: "Inventory" },
    { view: "pbmhub", icon: "$", label: "PBM" },
    { view: "toolshub", icon: "⋯", label: "Tools" }
  ];
  const GROUP = {
    dashboard: "dashboard", workqueue: "dashboard",
    dispensinghub: "dispensinghub", clinicalops: "dispensinghub", prescriptions: "dispensinghub",
    patienthub: "patienthub", careplans: "patienthub", medsync: "patienthub", patients: "patienthub",
    inventoryhub: "inventoryhub", purchasing: "inventoryhub", inventory: "inventoryhub",
    pbmhub: "pbmhub", claimsops: "pbmhub",
    toolshub: "toolshub", dailyclose: "toolshub", auditdefense: "toolshub", importcenter: "toolshub", sop: "toolshub", reportcenter: "toolshub"
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  function current() { return window.__pharmadeskCurrentView || window.currentView || "dashboard"; }
  function primary() { return GROUP[current()] || "toolshub"; }
  function go(view) {
    window.__pharmadeskCurrentView = view || "dashboard";
    if (typeof window.navigate === "function") window.navigate(view || "dashboard");
    requestAnimationFrame(() => { installNav(); setTitle(); bindTour(); });
  }

  function installStyle() {
    if (document.getElementById("pdUxRefreshStyles")) return;
    const st = document.createElement("style");
    st.id = "pdUxRefreshStyles";
    st.textContent = `
      :root {
        --ux-bg:#f6f7f8;
        --ux-panel:#ffffff;
        --ux-panel-2:#fbfbfc;
        --ux-ink:#101418;
        --ux-muted:#69737d;
        --ux-faint:#8b949e;
        --ux-line:#d8dee4;
        --ux-line-soft:#eaedf0;
        --ux-brand:#0a7c66;
        --ux-brand-2:#075f4e;
        --ux-danger:#cf222e;
        --ux-warn:#9a6700;
        --ux-success:#1a7f37;
        --ux-blue:#0969da;
        --ux-radius:14px;
        --ux-radius-lg:18px;
        --ux-shadow:0 1px 2px rgba(16,20,24,.05),0 8px 24px rgba(16,20,24,.06);
        --ux-font:-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter","Segoe UI",Roboto,Helvetica,Arial,sans-serif;
      }
      body.theme-dark {
        --ux-bg:#0d1117;
        --ux-panel:#161b22;
        --ux-panel-2:#0f141b;
        --ux-ink:#e6edf3;
        --ux-muted:#8b949e;
        --ux-faint:#6e7681;
        --ux-line:#30363d;
        --ux-line-soft:#21262d;
        --ux-brand:#2fbf9f;
        --ux-brand-2:#63e6ca;
        --ux-shadow:none;
      }
      body.ux-refresh {
        font-family:var(--ux-font) !important;
        background:var(--ux-bg) !important;
        color:var(--ux-ink) !important;
        letter-spacing:-.01em;
      }
      body.ux-refresh #app { background:var(--ux-bg) !important; }
      body.ux-refresh .sidebar {
        background:var(--ux-panel) !important;
        color:var(--ux-ink) !important;
        border-right:1px solid var(--ux-line) !important;
        box-shadow:none !important;
        padding:18px 12px !important;
      }
      body.ux-refresh .brand { margin-bottom:18px; }
      body.ux-refresh .brand-mark {
        background:var(--ux-ink) !important;
        color:var(--ux-panel) !important;
        box-shadow:none !important;
        border-radius:12px !important;
      }
      body.ux-refresh .brand-name { color:var(--ux-ink); font-weight:800; letter-spacing:-.02em; }
      body.ux-refresh .brand-sub, body.ux-refresh .sidebar-foot, body.ux-refresh .muted { color:var(--ux-muted) !important; }
      body.ux-refresh .nav { gap:4px !important; }
      body.ux-refresh .nav-item {
        margin:0 !important;
        border-radius:10px !important;
        color:var(--ux-muted) !important;
        font-weight:650 !important;
        font-size:13px !important;
        padding:9px 10px !important;
        background:transparent !important;
        transform:none !important;
      }
      body.ux-refresh .nav-item:hover { background:var(--ux-panel-2) !important; color:var(--ux-ink) !important; }
      body.ux-refresh .nav-item.active {
        background:var(--ux-ink) !important;
        color:var(--ux-panel) !important;
      }
      body.theme-dark.ux-refresh .nav-item.active { background:#e6edf3 !important; color:#0d1117 !important; }
      body.ux-refresh .ni-ico { opacity:.9; font-weight:900; }
      body.ux-refresh .topbar {
        background:rgba(246,247,248,.82) !important;
        backdrop-filter:blur(18px) saturate(150%) !important;
        border-bottom:1px solid var(--ux-line) !important;
        box-shadow:none !important;
      }
      body.theme-dark.ux-refresh .topbar { background:rgba(13,17,23,.82) !important; }
      body.ux-refresh #viewTitle { color:var(--ux-ink); font-size:17px; font-weight:800; letter-spacing:-.02em; }
      body.ux-refresh .search { background:var(--ux-panel) !important; color:var(--ux-ink) !important; border:1px solid var(--ux-line) !important; border-radius:12px !important; box-shadow:none !important; }
      body.ux-refresh .user-chip { background:transparent !important; border:0 !important; }
      body.ux-refresh .avatar { background:var(--ux-ink) !important; color:var(--ux-panel) !important; }
      body.ux-refresh .view { max-width:1160px; margin:0 auto; padding:24px !important; }
      body.ux-refresh .simple-hero, body.ux-refresh .ops-card, body.ux-refresh .card, body.ux-refresh .simple-kpi, body.ux-refresh .tool-link, body.ux-refresh .pbm-card, body.ux-refresh .import-panel {
        background:var(--ux-panel) !important;
        border:1px solid var(--ux-line) !important;
        color:var(--ux-ink) !important;
        border-radius:var(--ux-radius-lg) !important;
        box-shadow:var(--ux-shadow) !important;
        backdrop-filter:none !important;
      }
      body.ux-refresh .simple-hero { padding:22px !important; background:linear-gradient(180deg,var(--ux-panel),var(--ux-panel-2)) !important; }
      body.ux-refresh .simple-hero h2 { font-size:28px !important; line-height:1.05 !important; letter-spacing:-.045em !important; color:var(--ux-ink); }
      body.ux-refresh .simple-hero p { color:var(--ux-muted) !important; font-size:14px !important; }
      body.ux-refresh .simple-kpis { gap:12px !important; }
      body.ux-refresh .simple-kpi { padding:16px !important; text-align:left !important; }
      body.ux-refresh .simple-kpi span { font-size:28px !important; font-weight:850 !important; color:var(--ux-ink) !important; }
      body.ux-refresh .simple-kpi b { color:var(--ux-muted) !important; font-size:11px !important; letter-spacing:.04em !important; }
      body.ux-refresh .simple-row { background:var(--ux-panel) !important; border:1px solid var(--ux-line-soft) !important; border-radius:14px !important; }
      body.ux-refresh .simple-row:hover, body.ux-refresh .tool-link:hover, body.ux-refresh .ops-card:hover { border-color:var(--ux-line) !important; }
      body.ux-refresh .badge { border-radius:999px !important; font-weight:750 !important; border:1px solid transparent; }
      body.ux-refresh .badge.red { background:#ffebe9 !important; color:#cf222e !important; }
      body.ux-refresh .badge.green { background:#dafbe1 !important; color:#116329 !important; }
      body.ux-refresh .badge.amber { background:#fff8c5 !important; color:#7d4e00 !important; }
      body.ux-refresh .badge.blue { background:#ddf4ff !important; color:#0969da !important; }
      body.ux-refresh .badge.gray { background:#f6f8fa !important; color:#59636e !important; border-color:var(--ux-line); }
      body.theme-dark.ux-refresh .badge.red { background:#490202 !important; color:#ffb4ad !important; }
      body.theme-dark.ux-refresh .badge.green { background:#092f17 !important; color:#7ee787 !important; }
      body.theme-dark.ux-refresh .badge.amber { background:#352407 !important; color:#f2cc60 !important; }
      body.theme-dark.ux-refresh .badge.blue { background:#0b2742 !important; color:#79c0ff !important; }
      body.theme-dark.ux-refresh .badge.gray { background:#21262d !important; color:#8b949e !important; }
      body.ux-refresh .btn { border-radius:10px !important; font-weight:750 !important; box-shadow:none !important; border:1px solid var(--ux-line) !important; background:var(--ux-panel) !important; color:var(--ux-ink) !important; }
      body.ux-refresh .btn.primary, body.ux-refresh #startTour, body.ux-refresh .btn.sm.primary { background:var(--ux-ink) !important; color:var(--ux-panel) !important; border-color:var(--ux-ink) !important; }
      body.theme-dark.ux-refresh .btn.primary, body.theme-dark.ux-refresh #startTour, body.theme-dark.ux-refresh .btn.sm.primary { background:#e6edf3 !important; color:#0d1117 !important; border-color:#e6edf3 !important; }
      body.ux-refresh table { border-collapse:separate !important; border-spacing:0 !important; }
      body.ux-refresh table th { background:var(--ux-panel-2) !important; color:var(--ux-muted) !important; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
      body.ux-refresh table td { border-color:var(--ux-line-soft) !important; }
      body.ux-refresh .view-mode-switch { background:var(--ux-panel) !important; border:1px solid var(--ux-line) !important; box-shadow:var(--ux-shadow) !important; }
      body.ux-refresh .view-mode-switch button.active, body.ux-refresh .theme-chip.active { background:var(--ux-ink) !important; color:var(--ux-panel) !important; }
      body.theme-dark.ux-refresh .view-mode-switch button.active, body.theme-dark.ux-refresh .theme-chip.active { background:#e6edf3 !important; color:#0d1117 !important; }

      body.view-mobile.ux-refresh .main { padding-bottom:128px !important; }
      body.view-mobile.ux-refresh .topbar { padding:12px 14px !important; }
      body.view-mobile.ux-refresh #viewTitle { font-size:16px !important; }
      body.view-mobile.ux-refresh .topbar-right { gap:8px !important; padding-bottom:4px; }
      body.view-mobile.ux-refresh .search { flex:1 0 170px !important; min-width:170px !important; height:38px; }
      body.view-mobile.ux-refresh .sidebar {
        left:12px !important; right:12px !important; bottom:calc(12px + env(safe-area-inset-bottom,0px)) !important;
        height:76px !important; border-radius:28px !important; padding:8px !important;
        background:rgba(255,255,255,.86) !important; border:1px solid var(--ux-line) !important;
        backdrop-filter:blur(22px) saturate(160%) !important; box-shadow:0 18px 50px rgba(16,20,24,.18) !important;
      }
      body.theme-dark.view-mobile.ux-refresh .sidebar { background:rgba(22,27,34,.86) !important; }
      body.view-mobile.ux-refresh .nav { gap:4px !important; padding:0 !important; overflow-x:auto; }
      body.view-mobile.ux-refresh .nav-item {
        flex:1 0 62px !important; width:62px !important; height:58px !important;
        border-radius:20px !important; font-size:9.5px !important; line-height:1.05 !important;
        padding:6px 3px !important; color:var(--ux-muted) !important;
      }
      body.view-mobile.ux-refresh .nav-item.active { color:var(--ux-panel) !important; background:var(--ux-ink) !important; }
      body.theme-dark.view-mobile.ux-refresh .nav-item.active { color:#0d1117 !important; background:#e6edf3 !important; }
      body.view-mobile.ux-refresh .ni-ico { display:block; font-size:17px !important; margin:0 0 4px !important; }
      body.view-mobile.ux-refresh .view { padding:14px 12px 138px !important; max-width:100% !important; }
      body.view-mobile.ux-refresh .simple-hero { padding:18px !important; border-radius:22px !important; }
      body.view-mobile.ux-refresh .simple-hero h2 { font-size:24px !important; }
      body.view-mobile.ux-refresh .simple-kpis { grid-template-columns:repeat(2,minmax(0,1fr)) !important; gap:10px !important; }
      body.view-mobile.ux-refresh .simple-kpi { border-radius:18px !important; padding:14px !important; }
      body.view-mobile.ux-refresh .simple-layout, body.view-mobile.ux-refresh .pbm-grid, body.view-mobile.ux-refresh .pbm-flow, body.view-mobile.ux-refresh .import-grid { grid-template-columns:1fr !important; }
      body.view-mobile.ux-refresh .ops-grid-3, body.view-mobile.ux-refresh .ops-grid, body.view-mobile.ux-refresh .grid-3, body.view-mobile.ux-refresh .grid-2 { grid-template-columns:1fr !important; }
      body.view-mobile.ux-refresh .simple-row { grid-template-columns:auto 1fr !important; border-radius:18px !important; }
      body.view-mobile.ux-refresh .simple-row .btn { grid-column:2; width:max-content; }
      body.view-mobile.ux-refresh .tour-step { left:12px !important; right:12px !important; bottom:calc(104px + env(safe-area-inset-bottom,0px)) !important; width:auto !important; }
    `;
    document.head.appendChild(st);
  }

  function installNav() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const active = primary();
    nav.innerHTML = NAV.map(x => `<button class="nav-item ${x.view === active ? "active" : ""}" data-view="${x.view}"><span class="ni-ico">${x.icon}</span> ${x.label}</button>`).join("");
    nav.querySelectorAll(".nav-item").forEach(btn => btn.onclick = e => {
      e.preventDefault(); e.stopPropagation(); go(btn.dataset.view);
    });
  }

  function setTitle() {
    const h = document.getElementById("viewTitle");
    if (!h) return;
    const found = NAV.find(x => x.view === primary()) || NAV[0];
    h.textContent = `${found.icon} ${found.label}`;
  }

  function tourSteps() {
    return [
      ["dashboard", "Home", "The home view is the daily operating surface: prioritized work, risk counts, and the owner brief."],
      ["dispensinghub", "Dispensing", "Dispensing brings queue and clinical review together so verification and documentation happen in one flow."],
      ["patienthub", "Patients", "Patients focuses on adherence, Med Sync, and follow-up work."],
      ["inventoryhub", "Inventory", "Inventory turns purchasing into simple decisions: buy, hold, return, or substitute."],
      ["pbmhub", "PBM", "PBM explains the reimbursement mechanics that matter to the pharmacist: spread pricing, clawbacks, DIR fees, networks, and appeals."],
      ["toolshub", "Tools", "Tools contains CSV upload/integrate, reports, audit defense, SOPs, and daily close."],
    ];
  }

  function runTour(i) {
    const steps = tourSteps();
    const idx = Math.max(0, Math.min(i || 0, steps.length - 1));
    const [view, title, body] = steps[idx];
    go(view);
    const root = document.getElementById("modalRoot");
    if (!root) return;
    root.innerHTML = `<div class="tour-backdrop" id="uxTourBackdrop" style="position:fixed;inset:0;background:rgba(13,17,23,.42);z-index:300"></div><div class="tour-step" role="dialog" aria-modal="true" style="position:fixed;right:22px;bottom:22px;width:min(430px,calc(100vw - 44px));background:var(--ux-panel);color:var(--ux-ink);border:1px solid var(--ux-line);border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,.25);z-index:301;padding:20px"><div style="color:var(--ux-muted);font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;margin-bottom:8px">Step ${idx + 1} of ${steps.length}</div><h3 style="font-size:20px;margin:0 0 8px;letter-spacing:-.03em">${esc(title)}</h3><p style="color:var(--ux-muted);line-height:1.55;margin:0 0 16px">${esc(body)}</p><div class="row" style="justify-content:flex-end"><button class="btn" id="uxTourEnd">End</button><button class="btn" id="uxTourBack" ${idx === 0 ? "disabled" : ""}>Back</button><button class="btn primary" id="uxTourNext">${idx === steps.length - 1 ? "Finish" : "Next"}</button></div></div>`;
    document.getElementById("uxTourBackdrop").onclick = () => root.innerHTML = "";
    document.getElementById("uxTourEnd").onclick = () => root.innerHTML = "";
    document.getElementById("uxTourBack").onclick = () => runTour(idx - 1);
    document.getElementById("uxTourNext").onclick = () => idx === steps.length - 1 ? root.innerHTML = "" : runTour(idx + 1);
  }

  function bindTour() {
    const btn = document.getElementById("startTour");
    if (btn) btn.onclick = e => { e.preventDefault(); e.stopPropagation(); runTour(0); };
  }

  function interceptClicks() {
    if (window.__pdUxClickIntercepted) return;
    window.__pdUxClickIntercepted = true;
    document.addEventListener("click", e => {
      const tour = e.target.closest && e.target.closest("#startTour");
      if (tour) { e.preventDefault(); e.stopPropagation(); runTour(0); return; }
      const navBtn = e.target.closest && e.target.closest(".nav-item[data-view]");
      if (navBtn) { e.preventDefault(); e.stopPropagation(); go(navBtn.dataset.view); return; }
      const goBtn = e.target.closest && e.target.closest("[data-go]");
      if (goBtn) { e.preventDefault(); e.stopPropagation(); go(goBtn.dataset.go); }
    }, true);
  }

  const oldNavigate = window.navigate;
  if (typeof oldNavigate === "function" && !window.__pdUxNavigateWrapped) {
    window.__pdUxNavigateWrapped = true;
    window.navigate = function(view) { window.__pharmadeskCurrentView = view || "dashboard"; return oldNavigate.apply(this, arguments); };
  }
  const oldRender = window.render;
  if (typeof oldRender === "function" && !window.__pdUxRenderWrapped) {
    window.__pdUxRenderWrapped = true;
    window.render = function() {
      const res = oldRender.apply(this, arguments);
      document.body.classList.add("ux-refresh", "final-polish", "streamlined");
      installStyle(); installNav(); setTitle(); bindTour(); interceptClicks();
      return res;
    };
  }
  try {
    document.body.classList.add("ux-refresh", "final-polish", "streamlined");
    installStyle(); installNav(); setTitle(); bindTour(); interceptClicks();
  } catch (err) { console.error("UX refresh failed", err); }
})();

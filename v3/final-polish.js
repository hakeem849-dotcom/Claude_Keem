/* PharmaDesk final polish layer.
   Fixes streamlined navigation, mobile UX, tour, dark mode, Tools import section, and PBM education. */
(function () {
  const NAV = [
    { view: "dashboard", icon: "🏠", label: "Home" },
    { view: "dispensinghub", icon: "℞", label: "Dispensing" },
    { view: "patienthub", icon: "👥", label: "Patients" },
    { view: "inventoryhub", icon: "📦", label: "Inventory" },
    { view: "pbmhub", icon: "🧾", label: "PBM" },
    { view: "toolshub", icon: "🧰", label: "Tools" }
  ];

  const GROUP = {
    dashboard: "dashboard",
    workqueue: "dashboard",
    dispensinghub: "dispensinghub",
    clinicalops: "dispensinghub",
    prescriptions: "dispensinghub",
    claimsops: "pbmhub",
    patienthub: "patienthub",
    careplans: "patienthub",
    medsync: "patienthub",
    patients: "patienthub",
    inventoryhub: "inventoryhub",
    purchasing: "inventoryhub",
    inventory: "inventoryhub",
    pbmhub: "pbmhub",
    toolshub: "toolshub",
    dailyclose: "toolshub",
    auditdefense: "toolshub",
    importcenter: "toolshub",
    sop: "toolshub",
    reportcenter: "toolshub"
  };

  const TOOL_LINKS = [
    ["importcenter", "CSV Import Center", "Full staging, validation, and integration workflow."],
    ["dailyclose", "Daily close", "Close checklist and packet export."],
    ["auditdefense", "Audit defense", "Audit packet builder."],
    ["reportcenter", "Reports", "Exportable reporting library."],
    ["sop", "SOP guide", "Workflow training cards."],
    ["workqueue", "Full work queue", "All exceptions in one detailed list."],
    ["clinicalops", "Clinical review detail", "Detailed pharmacist review cards."],
    ["claimsops", "Claims desk detail", "Claim lifecycle and economics."],
    ["purchasing", "Purchasing detail", "Full order recommendation table."],
    ["careplans", "Patient care detail", "Care notes and adherence cards."],
    ["medsync", "Med Sync detail", "Maintenance-med sync candidates."]
  ];

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} };
  const moneySafe = n => { try { return money(Number(n) || 0); } catch (e) { return `$${(Number(n) || 0).toFixed(2)}`; } };
  const currentView = () => window.__pharmadeskCurrentView || window.currentView || "dashboard";
  const primaryView = () => GROUP[currentView()] || "toolshub";

  function injectStyles() {
    if (document.getElementById("pharmadeskFinalPolishStyles")) return;
    const style = document.createElement("style");
    style.id = "pharmadeskFinalPolishStyles";
    style.textContent = `
      :root {
        --pd-bg: #f5f7f6;
        --pd-surface: rgba(255,255,255,.92);
        --pd-surface-solid: #ffffff;
        --pd-ink: #12201d;
        --pd-muted: #647672;
        --pd-line: rgba(15,45,38,.10);
        --pd-brand: #087967;
        --pd-brand-2: #0ea58c;
        --pd-shadow: 0 18px 50px rgba(11,35,31,.10);
        --pd-radius: 22px;
      }
      body.final-polish {
        background:
          radial-gradient(circle at top left, rgba(14,165,140,.12), transparent 34rem),
          linear-gradient(180deg, #f8fbfa, var(--pd-bg));
        color: var(--pd-ink);
      }
      body.theme-dark {
        --pd-bg: #07110f;
        --pd-surface: rgba(17,32,29,.88);
        --pd-surface-solid: #101f1c;
        --pd-ink: #edf7f4;
        --pd-muted: #a2b8b2;
        --pd-line: rgba(188,227,217,.13);
        --pd-brand: #30d5b7;
        --pd-brand-2: #7af1d9;
        --pd-shadow: 0 18px 60px rgba(0,0,0,.38);
        background:
          radial-gradient(circle at top left, rgba(48,213,183,.18), transparent 31rem),
          linear-gradient(180deg, #06110f, #050a09);
      }
      body.final-polish .topbar { background: var(--pd-surface); backdrop-filter: blur(22px) saturate(150%); border-bottom: 1px solid var(--pd-line); }
      body.final-polish .sidebar { background: linear-gradient(180deg,#073a33,#05241f); border: 0; box-shadow: 12px 0 40px rgba(4,28,24,.16); }
      body.final-polish .brand-mark { background: linear-gradient(135deg,var(--pd-brand),var(--pd-brand-2)); box-shadow: 0 14px 30px rgba(0,0,0,.18); }
      body.final-polish .nav-item { border-radius: 14px; margin: 3px 10px; transition: transform .16s ease, background .16s ease; }
      body.final-polish .nav-item:hover { transform: translateX(2px); }
      body.final-polish .nav-item.active { background: rgba(255,255,255,.14); color: #fff; }
      body.final-polish .main, body.final-polish .view { color: var(--pd-ink); }
      body.final-polish .ops-card, body.final-polish .card, body.final-polish .simple-hero, body.final-polish .simple-kpi, body.final-polish .tool-link, body.final-polish .import-panel, body.final-polish .pbm-card {
        background: var(--pd-surface);
        color: var(--pd-ink);
        border: 1px solid var(--pd-line);
        border-radius: var(--pd-radius);
        box-shadow: var(--pd-shadow);
        backdrop-filter: blur(14px) saturate(130%);
      }
      body.final-polish .simple-hero { background: linear-gradient(135deg, var(--pd-surface), rgba(14,165,140,.10)); }
      body.final-polish .muted, body.final-polish .small, body.final-polish .action-note, body.final-polish .tool-link span { color: var(--pd-muted) !important; }
      body.final-polish .btn.primary, body.final-polish .btn.sm.primary, body.final-polish #startTour { background: linear-gradient(135deg,var(--pd-brand),var(--pd-brand-2)); color:#fff; border:0; box-shadow: 0 10px 24px rgba(8,121,103,.22); }
      body.final-polish .btn { border-radius: 12px; }
      body.final-polish .search { background: var(--pd-surface-solid); color: var(--pd-ink); border:1px solid var(--pd-line); }
      body.theme-dark .sidebar { background: linear-gradient(180deg,#041614,#020c0b); }
      body.theme-dark .topbar, body.theme-dark .view-mode-switch { color: var(--pd-ink); }
      body.theme-dark table th { background: rgba(255,255,255,.06); color: var(--pd-ink); }
      body.theme-dark table td { border-color: var(--pd-line); }
      body.theme-dark input, body.theme-dark select, body.theme-dark textarea { background:#0d1d1a; color:var(--pd-ink); border:1px solid var(--pd-line); }

      .pbm-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
      .pbm-card { padding:18px; }
      .pbm-card h3 { margin:0 0 8px; font-size:17px; }
      .pbm-card p { margin:0; color:var(--pd-muted); line-height:1.55; }
      .pbm-flow { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin:16px 0; }
      .pbm-flow .step { padding:14px; border-radius:18px; background:var(--pd-surface); border:1px solid var(--pd-line); }
      .pbm-flow .step b { display:block; margin-bottom:6px; }
      .import-panel { padding:18px; margin-bottom:16px; }
      .import-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:12px; }
      .import-tile { border:1px dashed var(--pd-line); border-radius:16px; padding:14px; background:rgba(255,255,255,.35); }
      .import-tile label { display:block; font-weight:800; margin-bottom:8px; }
      .import-tile input { width:100%; font-size:12px; }
      .integrate-row { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:14px; padding-top:14px; border-top:1px solid var(--pd-line); }
      .theme-chip { border:0; border-radius:999px; padding:8px 12px; cursor:pointer; font-weight:800; background:rgba(8,121,103,.12); color:var(--pd-brand); }
      .theme-chip.active { background:linear-gradient(135deg,var(--pd-brand),var(--pd-brand-2)); color:#fff; }

      body.view-mobile.final-polish #app { padding-bottom: 96px; }
      body.view-mobile.final-polish .sidebar {
        left: 10px; right: 10px; bottom: calc(10px + env(safe-area-inset-bottom,0px));
        width: auto; height: 74px; padding: 8px; border-radius: 26px;
        background: rgba(3,28,24,.88); backdrop-filter: blur(22px) saturate(160%);
        box-shadow: 0 -14px 42px rgba(0,0,0,.28);
      }
      body.view-mobile.final-polish .nav { gap: 4px; }
      body.view-mobile.final-polish .nav-item { flex: 1 0 68px; width: 68px; height: 58px; margin:0; border-radius:18px; font-size:10px; padding:6px 4px; }
      body.view-mobile.final-polish .nav-item .ni-ico { font-size:18px; margin-bottom:3px; }
      body.view-mobile.final-polish .topbar { padding: 12px; gap: 10px; border-radius:0 0 22px 22px; }
      body.view-mobile.final-polish .topbar-right { gap: 8px; }
      body.view-mobile.final-polish #startTour, body.view-mobile.final-polish #printBrief { min-width:max-content; }
      body.view-mobile.final-polish .view { padding: 12px 12px 132px; }
      body.view-mobile.final-polish .simple-hero { border-radius:24px; padding:18px; }
      body.view-mobile.final-polish .simple-hero h2 { font-size:24px; letter-spacing:-.03em; }
      body.view-mobile.final-polish .simple-kpis { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
      body.view-mobile.final-polish .simple-kpi { padding:14px; border-radius:20px; }
      body.view-mobile.final-polish .simple-kpi span { font-size:28px; }
      body.view-mobile.final-polish .simple-layout, body.view-mobile.final-polish .pbm-grid, body.view-mobile.final-polish .pbm-flow, body.view-mobile.final-polish .import-grid { grid-template-columns:1fr !important; }
      body.view-mobile.final-polish .simple-row { border-radius:20px; padding:14px; grid-template-columns:auto 1fr; }
      body.view-mobile.final-polish .simple-row .btn { grid-column:2; width:max-content; }
      body.view-mobile.final-polish .integrate-row { flex-direction:column; align-items:stretch; }
      body.view-mobile.final-polish .integrate-row .btn { width:100%; }
      body.view-mobile.final-polish .view-mode-switch { bottom: calc(92px + env(safe-area-inset-bottom,0px)); transform: translateX(-50%) scale(.92); }
    `;
    document.head.appendChild(style);
  }

  function installDarkToggle() {
    const switcher = document.getElementById("viewModeSwitch");
    if (!switcher || document.getElementById("themeToggleChip")) return;
    const btn = document.createElement("button");
    btn.id = "themeToggleChip";
    btn.type = "button";
    btn.className = "theme-chip";
    btn.textContent = localStorage.getItem("pharmadesk.v3.theme") === "dark" ? "Dark" : "Light";
    btn.onclick = () => {
      const isDark = document.body.classList.toggle("theme-dark");
      localStorage.setItem("pharmadesk.v3.theme", isDark ? "dark" : "light");
      btn.classList.toggle("active", isDark);
      btn.textContent = isDark ? "Dark" : "Light";
    };
    switcher.appendChild(btn);
    const isDark = localStorage.getItem("pharmadesk.v3.theme") === "dark";
    document.body.classList.toggle("theme-dark", isDark);
    btn.classList.toggle("active", isDark);
  }

  function navInstall() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const active = primaryView();
    nav.innerHTML = NAV.map(x => `<button class="nav-item ${x.view === active ? "active" : ""}" data-view="${x.view}"><span class="ni-ico">${x.icon}</span> ${x.label}</button>`).join("");
    nav.querySelectorAll(".nav-item").forEach(btn => btn.onclick = () => {
      window.__pharmadeskCurrentView = btn.dataset.view;
      if (typeof navigate === "function") navigate(btn.dataset.view);
    });
  }

  function titleInstall() {
    const h = document.getElementById("viewTitle");
    if (!h) return;
    const found = NAV.find(x => x.view === primaryView()) || NAV[0];
    h.textContent = `${found.icon} ${found.label}`;
  }

  function uploadSummary() {
    const stage = read("pharmadesk.final.quickImport", {});
    const count = Object.values(stage).filter(Boolean).length;
    return { stage, count };
  }

  function quickImportPanel() {
    const sections = [
      ["patients", "Patients"],
      ["inventory", "Inventory / Drugs"],
      ["prescriptions", "Prescriptions"],
      ["claims", "Claims"],
      ["audits", "Audits"]
    ];
    const { stage, count } = uploadSummary();
    return `<div class="import-panel"><div class="section-head"><div><h2>Upload CSV & integrate</h2><p class="muted">Stage demo CSV sections here, then integrate. For full validation, open the complete CSV Import Center below.</p></div><span class="badge ${count ? "green" : "blue"}">${count} staged</span></div><div class="import-grid">${sections.map(([key,label]) => `<div class="import-tile"><label>${esc(label)}</label><input type="file" accept=".csv,text/csv" data-quick-import="${key}"><div class="muted small">${stage[key] ? `Staged: ${esc(stage[key])}` : "No file staged"}</div></div>`).join("")}</div><div class="integrate-row"><div><b>Integration workflow</b><p class="muted">Upload → stage → clean/validate → integrate into demo data.</p></div><div class="row"><button class="btn" data-go="importcenter">Full Import Center</button><button class="btn primary" id="quickIntegrateBtn">Integrate staged files</button></div></div></div>`;
  }

  const baseTools = Views.toolshub;
  Views.toolshub = () => {
    const cards = `
      <div class="ops-grid-3">
        <div class="ops-card simplified-card"><div class="section-head"><h3>Daily close</h3><button class="btn sm" data-go="dailyclose">Open</button></div><p class="muted">Checklist, packet, and handoff.</p></div>
        <div class="ops-card simplified-card"><div class="section-head"><h3>Audit defense</h3><button class="btn sm" data-go="auditdefense">Open</button></div><p class="muted">Generate audit packets.</p></div>
        <div class="ops-card simplified-card"><div class="section-head"><h3>Reports</h3><button class="btn sm" data-go="reportcenter">Open</button></div><p class="muted">Exportable reporting library.</p></div>
      </div>`;
    return `<div class="simple-hero"><div><h2>Tools & close</h2><p>CSV imports, reports, audit packets, SOPs, and daily close live here so daily work stays clean.</p></div><button class="btn primary" data-go="dailyclose">Start close</button></div>${quickImportPanel()}${cards}<div class="ops-card" style="margin-top:16px"><div class="section-head"><h2>Detailed views</h2></div><div class="ops-grid-3">${TOOL_LINKS.map(([view,label,desc]) => `<button class="tool-link" data-go="${view}"><b>${esc(label)}</b><span>${esc(desc)}</span></button>`).join("")}</div></div>`;
  };

  Views.pbmhub = () => {
    const under = Store.claims.map(c => ({ c, e: (() => { try { return claimEconomics(c); } catch (err) { return { net: 0, drug: null }; } })() })).filter(x => (x.e.net || 0) < 0);
    return `<div class="simple-hero"><div><h2>PBM & DIR command room</h2><p>A pharmacist-owner needs to understand the money path behind each claim: payer, PBM, reimbursement, spread pricing, clawbacks, DIR fees, network steering, and appeal work.</p></div><button class="btn primary" data-go="claimsops">Open claims desk</button></div>
      <div class="pbm-flow"><div class="step"><b>1. Patient plan</b><span class="muted">Plan design decides covered drugs, copay, network, and prior auth rules.</span></div><div class="step"><b>2. PBM adjudicates</b><span class="muted">The PBM processes the claim and controls many formulary and payment rules.</span></div><div class="step"><b>3. Pharmacy paid</b><span class="muted">Paid does not always mean profitable once cost and fees are considered.</span></div><div class="step"><b>4. Post-sale risk</b><span class="muted">DIR fees, audits, reversals, or clawbacks can change the economics later.</span></div></div>
      <div class="simple-kpis"><button class="simple-kpi" data-go="claimsops"><span>${rejectedClaimsCount()}</span><b>Rejected claims</b></button><button class="simple-kpi" data-go="claimsops"><span>${under.length}</span><b>Underwater fills</b></button><button class="simple-kpi" data-go="auditdefense"><span>${Store.audits.length}</span><b>Audit items</b></button><button class="simple-kpi" data-go="purchasing"><span>${moneySafe(under.reduce((a,x)=>a+(x.e.net||0),0)).replace("$-","−$")}</span><b>Known loss</b></button></div>
      <div class="pbm-grid">
        ${pbmCard("Spread pricing", "The PBM may charge a plan more than it reimburses the pharmacy. The difference is the spread. Your app should help identify where the pharmacy gets squeezed.")}
        ${pbmCard("Clawbacks", "A claim can look acceptable at fill time, then later be reduced by recoupment or audit findings. That is why the daily close and audit defense workflows matter.")}
        ${pbmCard("DIR fees", "Direct and Indirect Remuneration fees are especially painful because they can be opaque, delayed, and difficult to account for at the point of sale.")}
        ${pbmCard("Network steering", "Preferred networks can push loyal patients toward chain or mail-order pharmacies. Patient education and relationship workflows are part of the defense.")}
        ${pbmCard("MAC appeals", "When reimbursement falls below acquisition cost, the pharmacy needs a clean appeal workflow with notes, dates, payer contacts, and proof of cost.")}
        ${pbmCard("Owner action", "Work red rejects first. Track underpaid claims. Watch payer patterns. Avoid restocking drugs that repeatedly lose money after reimbursement and fees.")}
      </div>`;
  };

  function pbmCard(title, body) {
    return `<div class="pbm-card"><h3>${esc(title)}</h3><p>${esc(body)}</p></div>`;
  }
  function rejectedClaimsCount() {
    try { return Store.claims.filter(c => c.status === "rejected").length; } catch (e) { return 0; }
  }

  function finalTour() {
    return [
      { view: "dashboard", title: "Home", body: "Start here. Home is the daily operating view: urgent work, clinical risk, claim pressure, inventory actions, and the owner brief." },
      { view: "dispensinghub", title: "Dispensing", body: "Dispensing combines queue and clinical review so the pharmacist can verify, document, and move prescriptions forward." },
      { view: "patienthub", title: "Patients", body: "Patients combines adherence, Med Sync, care notes, and relationship work." },
      { view: "inventoryhub", title: "Inventory", body: "Inventory turns purchasing into simple actions: buy, hold, return, or substitute." },
      { view: "pbmhub", title: "PBM & DIR", body: "This tab explains the payer/PBM mechanics that affect independent pharmacy survival: spread pricing, clawbacks, DIR fees, networks, and appeals." },
      { view: "toolshub", title: "Tools", body: "Tools now includes CSV upload and integrate directly, plus reports, audit defense, SOPs, and daily close." }
    ];
  }

  function runTour(index) {
    const list = finalTour();
    const step = list[index || 0];
    window.__pharmadeskCurrentView = step.view;
    if (typeof navigate === "function") navigate(step.view);
    const root = document.getElementById("modalRoot");
    if (!root) return;
    root.innerHTML = `<div class="tour-backdrop" id="finalTourBackdrop" style="position:fixed;inset:0;background:rgba(4,12,10,.42);z-index:200"></div><div class="tour-step" style="position:fixed;right:22px;bottom:22px;width:min(430px,calc(100vw - 44px));background:var(--pd-surface-solid,#fff);color:var(--pd-ink,#12201d);border:1px solid var(--pd-line,rgba(0,0,0,.1));border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.25);z-index:201;padding:20px"><div style="color:var(--pd-brand,#087967);font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;margin-bottom:8px">Step ${(index || 0) + 1} of ${list.length}</div><h3 style="margin:0 0 8px;font-size:20px">${esc(step.title)}</h3><p style="color:var(--pd-muted,#647672);line-height:1.55;margin:0 0 16px">${esc(step.body)}</p><div class="row" style="justify-content:flex-end"><button class="btn" id="finalTourClose">End tour</button><button class="btn" id="finalTourBack" ${(index || 0) === 0 ? "disabled" : ""}>Back</button><button class="btn primary" id="finalTourNext">${(index || 0) === list.length - 1 ? "Finish" : "Next"}</button></div></div>`;
    document.getElementById("finalTourClose").onclick = () => root.innerHTML = "";
    document.getElementById("finalTourBackdrop").onclick = () => root.innerHTML = "";
    document.getElementById("finalTourBack").onclick = () => runTour(Math.max(0, (index || 0) - 1));
    document.getElementById("finalTourNext").onclick = () => ((index || 0) >= list.length - 1 ? root.innerHTML = "" : runTour((index || 0) + 1));
  }

  function bindInteractions() {
    const tour = document.getElementById("startTour");
    if (tour) tour.onclick = () => runTour(0);
    document.querySelectorAll("[data-quick-import]").forEach(input => {
      input.onchange = () => {
        const stage = read("pharmadesk.final.quickImport", {});
        stage[input.dataset.quickImport] = input.files && input.files[0] ? input.files[0].name : "";
        write("pharmadesk.final.quickImport", stage);
        if (typeof toast === "function") toast("CSV staged for integration");
        if (typeof render === "function") render();
      };
    });
    const qi = document.getElementById("quickIntegrateBtn");
    if (qi) qi.onclick = () => {
      const stage = read("pharmadesk.final.quickImport", {});
      const count = Object.values(stage).filter(Boolean).length;
      if (!count) return typeof toast === "function" ? toast("Upload a CSV first") : alert("Upload a CSV first");
      const log = read("pharmadesk.final.quickImportLog", []);
      log.unshift({ date: new Date().toISOString(), files: stage });
      write("pharmadesk.final.quickImportLog", log.slice(0, 5));
      localStorage.removeItem("pharmadesk.final.quickImport");
      if (typeof toast === "function") toast(`Integrated ${count} staged CSV section(s)`);
      if (typeof render === "function") render();
    };
  }

  const oldNavigate = window.navigate;
  if (typeof oldNavigate === "function" && !window.__pharmadeskFinalNavigateWrapped) {
    window.__pharmadeskFinalNavigateWrapped = true;
    window.navigate = function (view) {
      window.__pharmadeskCurrentView = view || "dashboard";
      return oldNavigate.apply(this, arguments);
    };
  }

  const oldRender = window.render;
  if (typeof oldRender === "function" && !window.__pharmadeskFinalRenderWrapped) {
    window.__pharmadeskFinalRenderWrapped = true;
    window.render = function () {
      const result = oldRender.apply(this, arguments);
      document.body.classList.add("final-polish", "streamlined");
      document.body.classList.toggle("theme-dark", localStorage.getItem("pharmadesk.v3.theme") === "dark");
      injectStyles();
      navInstall();
      titleInstall();
      installDarkToggle();
      bindInteractions();
      return result;
    };
  }

  try {
    document.body.classList.add("final-polish", "streamlined");
    injectStyles();
    navInstall();
    titleInstall();
    installDarkToggle();
    bindInteractions();
  } catch (e) {
    console.error("Final polish failed", e);
  }
})();

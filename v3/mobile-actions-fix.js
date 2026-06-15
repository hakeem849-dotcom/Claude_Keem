/* Final mobile interaction fix.
   Owns Home and Take-a-tour taps at capture phase so mobile bottom-nav/tour clicks cannot be swallowed by older wrappers. */
(function () {
  const LABELS = {
    dashboard: "⌂ Home",
    dispensinghub: "℞ Dispense",
    patienthub: "◉ Patients",
    inventoryhub: "□ Inventory",
    pbmhub: "$ PBM",
    toolshub: "⋯ Tools"
  };
  const PRIMARY = {
    dashboard: "dashboard", workqueue: "dashboard",
    dispensinghub: "dispensinghub", clinicalops: "dispensinghub", prescriptions: "dispensinghub",
    patienthub: "patienthub", careplans: "patienthub", medsync: "patienthub", patients: "patienthub",
    inventoryhub: "inventoryhub", purchasing: "inventoryhub", inventory: "inventoryhub",
    pbmhub: "pbmhub", claimsops: "pbmhub", reimbursement: "pbmhub",
    toolshub: "toolshub", dailyclose: "toolshub", auditdefense: "toolshub", importcenter: "toolshub", sop: "toolshub", reportcenter: "toolshub", audits: "toolshub", compliance: "toolshub"
  };
  const esc = s => String(s || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function setCurrent(view) {
    window.__pdView = view || "dashboard";
    window.__pharmadeskCurrentView = window.__pdView;
    try { currentView = window.__pdView; } catch (e) {}
  }

  function primary(view) {
    return PRIMARY[view || window.__pdView || "dashboard"] || "dashboard";
  }

  function renderNav(activeView) {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const active = primary(activeView);
    const items = [
      ["dashboard", "⌂", "Home"],
      ["dispensinghub", "℞", "Dispense"],
      ["patienthub", "◉", "Patients"],
      ["inventoryhub", "□", "Inventory"],
      ["pbmhub", "$", "PBM"],
      ["toolshub", "⋯", "Tools"]
    ];
    nav.innerHTML = items.map(([view, icon, label]) => `<button class="nav-item ${view === active ? "active" : ""}" data-view="${view}"><span class="ni-ico">${icon}</span> ${label}</button>`).join("");
  }

  function renderView(view) {
    const target = view || "dashboard";
    setCurrent(target);
    const root = document.getElementById("view");
    if (!root || !window.Views || !Views[target]) return false;
    root.innerHTML = Views[target]();
    const title = document.getElementById("viewTitle");
    if (title) title.textContent = LABELS[primary(target)] || LABELS.dashboard;
    if (typeof wireView === "function") wireView();
    if (typeof animateCounts === "function") animateCounts(root);
    renderNav(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  const TOUR = [
    ["dashboard", "Home", "Daily priorities, risk counts, and owner brief."],
    ["dispensinghub", "Dispensing", "Prescription queue and pharmacist review in one workflow."],
    ["patienthub", "Patients", "Adherence, Med Sync, follow-up, and patient relationship work."],
    ["inventoryhub", "Inventory", "Stock and purchasing decisions: buy, hold, return, or substitute."],
    ["pbmhub", "PBM", "Reimbursement, DIR fees, PBM networks, audits, and appeals."],
    ["toolshub", "Tools", "CSV upload, reports, daily close, SOPs, and audit packets."]
  ];

  function startTour(index) {
    const i = Math.max(0, Math.min(index || 0, TOUR.length - 1));
    const [view, title, body] = TOUR[i];
    renderView(view);
    const modal = document.getElementById("modalRoot");
    if (!modal) return;
    modal.innerHTML = `<div id="mobileTourBackdrop" style="position:fixed;inset:0;background:rgba(10,16,22,.48);z-index:500"></div>
      <div class="tour-step" role="dialog" aria-modal="true" style="position:fixed;left:14px;right:14px;bottom:calc(104px + env(safe-area-inset-bottom,0px));background:var(--ux-panel,#fff);color:var(--ux-ink,#101418);border:1px solid var(--ux-line,#d8dee4);border-radius:20px;box-shadow:0 20px 70px rgba(0,0,0,.28);z-index:501;padding:18px">
        <div style="color:var(--ux-muted,#69737d);font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;margin-bottom:8px">Step ${i + 1} of ${TOUR.length}</div>
        <h3 style="font-size:20px;margin:0 0 8px;letter-spacing:-.03em">${esc(title)}</h3>
        <p style="color:var(--ux-muted,#69737d);line-height:1.55;margin:0 0 16px">${esc(body)}</p>
        <div class="row" style="justify-content:flex-end;gap:8px;flex-wrap:wrap">
          <button class="btn" id="mobileTourEnd">End</button>
          <button class="btn" id="mobileTourBack" ${i === 0 ? "disabled" : ""}>Back</button>
          <button class="btn primary" id="mobileTourNext">${i === TOUR.length - 1 ? "Finish" : "Next"}</button>
        </div>
      </div>`;
    document.getElementById("mobileTourBackdrop").onclick = () => modal.innerHTML = "";
    document.getElementById("mobileTourEnd").onclick = () => modal.innerHTML = "";
    document.getElementById("mobileTourBack").onclick = () => startTour(i - 1);
    document.getElementById("mobileTourNext").onclick = () => i === TOUR.length - 1 ? modal.innerHTML = "" : startTour(i + 1);
  }

  function intercept(event) {
    const tourButton = event.target.closest && event.target.closest("#startTour");
    if (tourButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      startTour(0);
      return;
    }
    const navButton = event.target.closest && event.target.closest(".nav-item[data-view]");
    if (navButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderView(navButton.dataset.view || "dashboard");
    }
  }

  document.addEventListener("click", intercept, true);
  document.addEventListener("touchend", intercept, true);
  window.__pharmadeskMobileRenderView = renderView;
  window.__pharmadeskMobileTour = startTour;
  renderNav(window.__pdView || "dashboard");
})();

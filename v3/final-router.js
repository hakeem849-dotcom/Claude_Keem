/* Final deterministic router. Loaded last. */
(function () {
  // Theme-colored wrench (inherits the nav text color via currentColor).
  const WRENCH = '<svg class="ni-svg" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';
  const nav = [
    ["dashboard", "⌂", "Home"], ["dispensinghub", "℞", "Dispense"],
    ["patienthub", "◉", "Patients"], ["inventoryhub", "□", "Inventory"],
    ["pbmhub", "$", "PBM"], ["toolshub", WRENCH, "Tools"]
  ];
  const group = {
    dashboard:"dashboard", workqueue:"dashboard",
    dispensinghub:"dispensinghub", prescriptions:"dispensinghub", clinicalops:"dispensinghub",
    patienthub:"patienthub", patients:"patienthub", careplans:"patienthub", medsync:"patienthub",
    inventoryhub:"inventoryhub", inventory:"inventoryhub", purchasing:"inventoryhub",
    pbmhub:"pbmhub", reimbursement:"pbmhub", claimsops:"pbmhub",
    toolshub:"toolshub", reportcenter:"toolshub", importcenter:"toolshub", dailyclose:"toolshub", auditdefense:"toolshub", sop:"toolshub", audits:"toolshub", compliance:"toolshub"
  };
  const fallback = { dispensinghub:"prescriptions", patienthub:"patients", inventoryhub:"inventory", pbmhub:"reimbursement", toolshub:"reportcenter" };
  const tour = [
    ["dashboard", "Home", "Daily priorities, risk counts, and owner brief."],
    ["dispensinghub", "Dispensing", "Prescription queue and pharmacist review in one workflow."],
    ["patienthub", "Patients", "Adherence, Med Sync, follow-up, and patient relationship work."],
    ["inventoryhub", "Inventory", "Stock and purchasing decisions: buy, hold, return, or substitute."],
    ["pbmhub", "PBM", "Reimbursement, DIR fees, PBM networks, audits, and appeals."],
    ["toolshub", "Tools", "CSV upload, reports, daily close, SOPs, and audit packets."]
  ];
  const esc = s => String(s || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const hasViews = () => typeof Views !== "undefined";
  const primary = v => group[v || window.__pdView || "dashboard"] || "dashboard";
  const actual = v => hasViews() && Views[v] ? v : hasViews() && fallback[v] && Views[fallback[v]] ? fallback[v] : v;
  const label = v => nav.find(x => x[0] === primary(v)) || nav[0];

  // Capture the full render pipeline (streamline → import-center → view-mode →
  // operator-upgrades → v3 → base) BEFORE we install our own router, so that
  // navigating re-runs every layer's view wiring instead of bypassing it.
  const pipelineRender = (typeof window.render === "function") ? window.render : null;
  function clearModal() { const m = document.getElementById("modalRoot"); if (m) m.innerHTML = ""; }

  function drawNav(activeView) {
    const el = document.getElementById("nav");
    if (!el) return;
    const active = primary(activeView);
    el.innerHTML = nav.map(([view, ico, text]) => `<button class="nav-item ${view === active ? "active" : ""}" data-view="${view}"><span class="ni-ico">${ico}</span> ${text}</button>`).join("");
  }

  function show(view) {
    const requested = view || "dashboard";
    const target = actual(requested);
    if (!hasViews() || !Views[target]) return false;
    const root = document.getElementById("view");
    if (!root) return false;
    window.__pdView = requested;
    window.__pharmadeskCurrentView = requested;
    // render the view that actually exists so the pipeline never throws
    try { currentView = target; } catch (e) { try { window.currentView = target; } catch (e2) {} }
    clearModal(); // never let a leftover modal/backdrop trap taps (esp. mobile nav)
    // Run the full render pipeline so every layer re-wires its buttons.
    if (pipelineRender) {
      try { pipelineRender(); }
      catch (e) {
        console.error("pipeline render failed, using fallback", e);
        root.innerHTML = Views[target]();
        if (typeof wireView === "function") wireView();
        if (typeof animateCounts === "function") animateCounts(root);
      }
    } else {
      root.innerHTML = Views[target]();
      if (typeof wireView === "function") wireView();
      if (typeof animateCounts === "function") animateCounts(root);
    }
    // Own the primary bottom nav + title so they stay consistent across views.
    drawNav(requested);
    const l = label(requested);
    const title = document.getElementById("viewTitle");
    if (title) title.textContent = `${l[1]} ${l[2]}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  function runTour(idx) {
    const i = Math.max(0, Math.min(idx || 0, tour.length - 1));
    const [view, title, body] = tour[i];
    show(view);
    const root = document.getElementById("modalRoot");
    if (!root) return;
    root.innerHTML = `<div id="frBg" style="position:fixed;inset:0;background:rgba(10,16,22,.48);z-index:500"></div><div class="tour-step" role="dialog" aria-modal="true" style="position:fixed;left:14px;right:14px;bottom:calc(104px + env(safe-area-inset-bottom,0px));background:var(--ux-panel,#fff);color:var(--ux-ink,#101418);border:1px solid var(--ux-line,#d8dee4);border-radius:20px;box-shadow:0 20px 70px rgba(0,0,0,.28);z-index:501;padding:18px"><div style="color:var(--ux-muted,#69737d);font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;margin-bottom:8px">Step ${i + 1} of ${tour.length}</div><h3 style="font-size:20px;margin:0 0 8px;letter-spacing:-.03em">${esc(title)}</h3><p style="color:var(--ux-muted,#69737d);line-height:1.55;margin:0 0 16px">${esc(body)}</p><div class="row" style="justify-content:flex-end;gap:8px;flex-wrap:wrap"><button class="btn" id="frEnd">End</button><button class="btn" id="frBack" ${i === 0 ? "disabled" : ""}>Back</button><button class="btn primary" id="frNext">${i === tour.length - 1 ? "Finish" : "Next"}</button></div></div>`;
    document.getElementById("frBg").onclick = () => root.innerHTML = "";
    document.getElementById("frEnd").onclick = () => root.innerHTML = "";
    document.getElementById("frBack").onclick = () => runTour(i - 1);
    document.getElementById("frNext").onclick = () => i === tour.length - 1 ? root.innerHTML = "" : runTour(i + 1);
  }

  function onClick(e) {
    const tourBtn = e.target.closest && e.target.closest("#startTour");
    if (tourBtn) { e.preventDefault(); e.stopImmediatePropagation(); runTour(0); return; }
    const navBtn = e.target.closest && e.target.closest(".nav-item[data-view]");
    if (navBtn) { e.preventDefault(); e.stopImmediatePropagation(); show(navBtn.dataset.view); return; }
    const routeBtn = e.target.closest && e.target.closest("[data-go]");
    if (routeBtn && show(routeBtn.dataset.go)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }

  function boot(tries) {
    if (!hasViews() || !Views.dashboard) { if ((tries || 0) < 100) setTimeout(() => boot((tries || 0) + 1), 50); return; }
    document.addEventListener("click", onClick, true);
    window.navigate = show;
    window.render = () => show(window.__pdView || "dashboard");
    window.__pharmadeskShow = show;
    window.__pharmadeskTour = runTour;
    drawNav(window.__pdView || "dashboard");
  }
  boot(0);
})();

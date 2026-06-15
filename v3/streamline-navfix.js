/* PharmaDesk hard router: fixes Home and Tour after streamlined nav. */
(function () {
  const NAV = [
    ["dashboard", "⌂", "Home"],
    ["dispensinghub", "℞", "Dispense"],
    ["patienthub", "◉", "Patients"],
    ["inventoryhub", "□", "Inventory"],
    ["pbmhub", "$", "PBM"],
    ["toolshub", "⋯", "Tools"]
  ];
  const GROUP = {
    dashboard:"dashboard", workqueue:"dashboard",
    dispensinghub:"dispensinghub", clinicalops:"dispensinghub", prescriptions:"dispensinghub",
    patienthub:"patienthub", careplans:"patienthub", medsync:"patienthub", patients:"patienthub",
    inventoryhub:"inventoryhub", purchasing:"inventoryhub", inventory:"inventoryhub",
    pbmhub:"pbmhub", claimsops:"pbmhub", reimbursement:"pbmhub",
    toolshub:"toolshub", dailyclose:"toolshub", auditdefense:"toolshub", importcenter:"toolshub", sop:"toolshub", reportcenter:"toolshub", audits:"toolshub", compliance:"toolshub"
  };
  const esc = s => String(s || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const primary = v => GROUP[v || getView()] || "dashboard";
  function getView() { try { return currentView || "dashboard"; } catch(e) { return window.__pdView || "dashboard"; } }
  function label(v) { return NAV.find(x => x[0] === primary(v)) || NAV[0]; }
  function setView(v) { window.__pdView = v || "dashboard"; try { currentView = window.__pdView; } catch(e) {} }
  function drawNav(v) {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const active = primary(v);
    nav.innerHTML = NAV.map(x => `<button class="nav-item ${x[0]===active?"active":""}" data-view="${x[0]}"><span class="ni-ico">${x[1]}</span> ${x[2]}</button>`).join("");
  }
  function draw(v) {
    const target = v || "dashboard";
    setView(target);
    const root = document.getElementById("view");
    if (!root || !Views[target]) return;
    root.innerHTML = Views[target]();
    const l = label(target);
    const title = document.getElementById("viewTitle");
    if (title) title.textContent = `${l[1]} ${l[2]}`;
    if (typeof wireView === "function") wireView();
    if (typeof animateCounts === "function") animateCounts(root);
    drawNav(target);
    bind();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  const steps = [
    ["dashboard","Home","Daily priorities, risk counts, and owner brief."],
    ["dispensinghub","Dispensing","Queue and pharmacist review in one workflow."],
    ["patienthub","Patients","Adherence, Med Sync, follow-up, and care work."],
    ["inventoryhub","Inventory","Buy, hold, return, or substitute."],
    ["pbmhub","PBM","Reimbursement, DIR, networks, audits, and appeals."],
    ["toolshub","Tools","CSV upload, reports, close, SOPs, and audit packets."]
  ];
  function tour(i=0) {
    const idx = Math.max(0, Math.min(i, steps.length-1));
    const s = steps[idx];
    draw(s[0]);
    const root = document.getElementById("modalRoot");
    if (!root) return;
    root.innerHTML = `<div id="pdTourBg" style="position:fixed;inset:0;background:rgba(13,17,23,.46);z-index:300"></div><div class="tour-step" style="position:fixed;right:22px;bottom:22px;width:min(430px,calc(100vw - 44px));background:var(--ux-panel,#fff);color:var(--ux-ink,#101418);border:1px solid var(--ux-line,#d8dee4);border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,.25);z-index:301;padding:20px"><div style="color:var(--ux-muted,#69737d);font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;margin-bottom:8px">Step ${idx+1} of ${steps.length}</div><h3 style="font-size:20px;margin:0 0 8px">${esc(s[1])}</h3><p style="color:var(--ux-muted,#69737d);line-height:1.55;margin:0 0 16px">${esc(s[2])}</p><div class="row" style="justify-content:flex-end"><button class="btn" id="pdTourEnd">End</button><button class="btn" id="pdTourBack" ${idx===0?"disabled":""}>Back</button><button class="btn primary" id="pdTourNext">${idx===steps.length-1?"Finish":"Next"}</button></div></div>`;
    document.getElementById("pdTourBg").onclick = () => root.innerHTML = "";
    document.getElementById("pdTourEnd").onclick = () => root.innerHTML = "";
    document.getElementById("pdTourBack").onclick = () => tour(idx-1);
    document.getElementById("pdTourNext").onclick = () => idx===steps.length-1 ? root.innerHTML="" : tour(idx+1);
  }
  function bind() {
    document.querySelectorAll(".nav-item[data-view]").forEach(b => b.onclick = e => { e.preventDefault(); draw(b.dataset.view); });
    document.querySelectorAll("[data-go]").forEach(b => b.onclick = e => { e.preventDefault(); draw(b.dataset.go); });
    const t = document.getElementById("startTour");
    if (t) t.onclick = e => { e.preventDefault(); tour(0); };
  }
  window.navigate = draw;
  window.render = () => draw(getView());
  function load(file, flag) {
    if (window[flag]) return;
    window[flag] = true;
    const src = (document.currentScript && document.currentScript.src || "v3/streamline-navfix.js").replace(/streamline-navfix\.js(?:\?.*)?$/, file);
    const s = document.createElement("script");
    s.src = src;
    document.body.appendChild(s);
  }
  drawNav(getView());
  bind();
  load("final-polish.js", "__pharmadeskFinalPolishLoaded");
  load("ux-refresh.js", "__pharmadeskUxRefreshLoaded");
})();

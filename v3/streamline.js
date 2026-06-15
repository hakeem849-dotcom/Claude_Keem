/* PharmaDesk V3 — streamlined operator experience.
   Goal: simplicity, elegance, functionality.
   Consolidates the app into five primary sections while preserving detailed workflows behind Tools. */
(function () {
  const PRIMARY_NAV = [
    { view: "dashboard", icon: "🏥", label: "Home" },
    { view: "dispensinghub", icon: "℞", label: "Dispensing" },
    { view: "patienthub", icon: "👥", label: "Patients" },
    { view: "inventoryhub", icon: "📦", label: "Inventory" },
    { view: "toolshub", icon: "🧰", label: "Tools" }
  ];

  const LEGACY_LINKS = [
    { view: "workqueue", label: "Full work queue", desc: "All exceptions in one long operating list." },
    { view: "clinicalops", label: "Clinical review detail", desc: "Detailed review cards and note capture." },
    { view: "claimsops", label: "Claims desk detail", desc: "Payer follow-up lifecycle and claim economics." },
    { view: "purchasing", label: "Purchasing detail", desc: "Full purchasing recommendation table." },
    { view: "careplans", label: "Patient care detail", desc: "Care notes and adherence cards." },
    { view: "medsync", label: "Med Sync detail", desc: "Maintenance-med sync candidates." },
    { view: "dailyclose", label: "Daily close", desc: "End-of-day checklist and packet export." },
    { view: "auditdefense", label: "Audit defense", desc: "Audit packet builder." },
    { view: "importcenter", label: "CSV Import Center", desc: "Upload, stage, clean, and integrate demo CSV files." },
    { view: "sop", label: "SOP guide", desc: "Training cards for key workflows." },
    { view: "reportcenter", label: "Report center", desc: "Exportable report library." }
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function dollars(n) {
    const v = Number(n) || 0;
    return (v < 0 ? "−" : "") + money(Math.abs(v));
  }
  function safeEco(c) {
    try { return claimEconomics(c); }
    catch (e) {
      const rx = Store.prescriptions.find(r => r.id === c.rxId);
      const drug = rx ? Store.findDrug(rx.drugId) : null;
      const reimbursement = (c.paid || 0) + (c.copay || 0);
      const acquisitionCost = drug && rx ? drug.cost * rx.qty : 0;
      const dirFee = c.dirFee || 0;
      const net = reimbursement - acquisitionCost - dirFee + (c.recovered || 0);
      return { rx, drug, reimbursement, acquisitionCost, dirFee, net, underwater: net < 0, macEligible: reimbursement < acquisitionCost };
    }
  }
  function riskBadge(label, tone) {
    return `<span class="badge ${tone || "gray"}">${esc(label)}</span>`;
  }
  function sectionCard(title, body, view, tone) {
    return `<div class="ops-card simplified-card ${tone || ""}"><div class="section-head"><h3>${esc(title)}</h3>${view ? `<button class="btn sm" data-go="${view}">Open</button>` : ""}</div><p class="muted">${esc(body)}</p></div>`;
  }

  function openTasks() {
    const done = readDoneTasks();
    return taskItems().filter(t => !done.includes(t.id));
  }
  function readDoneTasks() {
    try { return JSON.parse(localStorage.getItem("pharmadesk.v3.doneTasks")) || []; }
    catch (e) { return []; }
  }
  function rejectedClaims() {
    return Store.claims.filter(c => c.status === "rejected");
  }
  function underwaterClaims() {
    return Store.claims.map(c => ({ c, e: safeEco(c) })).filter(x => x.e.underwater);
  }
  function clinicalHoldRows() {
    return Store.prescriptions.filter(r => ["intake", "verification", "pmp-review"].includes(r.status)).map(r => {
      const p = Store.findPatient(r.patientId);
      const d = Store.findDrug(r.drugId);
      const allergy = allergyConflict(p, d);
      const interactions = checkInteractions(patientActiveDrugs(p.id));
      const needs = Boolean(allergy || interactions.length || d.schedule > 0 || r.status === "pmp-review");
      return { r, p, d, allergy, interactions, needs };
    }).filter(x => x.needs).slice(0, 6);
  }
  function reorderRows() {
    return Store.inventory.map(d => {
      let pe;
      try { pe = projectedEconomics(d, 1); }
      catch (e) { pe = { net: (d.expReimb || 0) - (d.cost || 0) - ((d.expReimb || 0) * (d.dirRate || 0)) }; }
      const exp = daysUntil(d.expiry);
      let rec = "Monitor", tone = "gray";
      if (exp <= 45) { rec = "Return"; tone = "red"; }
      else if (d.stock <= d.reorder && pe.net < 0) { rec = "Hold"; tone = "amber"; }
      else if (d.stock <= d.reorder) { rec = "Buy"; tone = "green"; }
      else if (pe.net < 0) { rec = "Substitute"; tone = "amber"; }
      return { d, pe, exp, rec, tone };
    }).filter(x => x.rec !== "Monitor").slice(0, 8);
  }
  function patientRows() {
    return Store.patients.map(p => {
      const rxs = Store.prescriptions.filter(r => r.patientId === p.id);
      const maintenance = rxs.filter(r => r.maintenance);
      const pdc = maintenance.map(r => r.pdc).filter(Boolean);
      const avg = pdc.length ? Math.round((pdc.reduce((a, b) => a + b, 0) / pdc.length) * 100) : null;
      let status = avg != null && avg < 80 ? "Follow up" : maintenance.length >= 2 ? "Sync candidate" : "Monitor";
      let tone = status === "Follow up" ? "red" : status === "Sync candidate" ? "blue" : "green";
      return { p, rxs, maintenance, avg, status, tone };
    }).sort((a, b) => (a.status === "Follow up" ? -1 : b.status === "Follow up" ? 1 : b.rxs.length - a.rxs.length)).slice(0, 8);
  }

  function kpiStrip() {
    const tasks = openTasks();
    const rejects = rejectedClaims();
    const underwater = underwaterClaims();
    const holds = clinicalHoldRows();
    return `<div class="simple-kpis">
      <button class="simple-kpi" data-go="toolshub"><span>${tasks.length}</span><b>Open tasks</b></button>
      <button class="simple-kpi" data-go="dispensinghub"><span>${holds.length}</span><b>Clinical holds</b></button>
      <button class="simple-kpi" data-go="toolshub"><span>${rejects.length}</span><b>Rejected claims</b></button>
      <button class="simple-kpi" data-go="inventoryhub"><span>${reorderRows().length}</span><b>Inventory actions</b></button>
    </div>`;
  }

  function simpleTaskList(limit) {
    const tasks = openTasks().slice(0, limit || 6);
    if (!tasks.length) return `<div class="empty">No urgent work is open.</div>`;
    return `<div class="simple-list">${tasks.map(t => `<div class="simple-row"><span class="priority-dot ${t.priority || "amber"}"></span><div><b>${esc(t.title)}</b><p>${esc(t.detail || "")}</p><small>${esc(t.next || "")}</small></div><button class="btn sm" data-go="${t.view || "workqueue"}">Open</button></div>`).join("")}</div>`;
  }

  const originalDashboard = Views.dashboard;
  Views.dashboard = () => {
    return `<div class="simple-hero"><div><h2>Today’s operating view</h2><p>One place for the work that matters: patient safety, payer issues, inventory decisions, and end-of-day controls.</p></div><button class="btn primary" data-go="toolshub">Close the day</button></div>
      ${kpiStrip()}
      <div class="simple-layout"><section class="ops-card"><div class="section-head"><h2>Do first</h2><button class="btn sm" data-go="workqueue">Full queue</button></div>${simpleTaskList(6)}</section><aside class="ops-card"><h2>Owner brief</h2><p class="muted">Start with clinical holds. Work rejected and underwater claims. Order only what makes economic sense. Finish with close and audit checks.</p><div class="chip-row">${riskBadge("Clinical first", "red")}${riskBadge("Payer loss", "amber")}${riskBadge("Inventory", "blue")}${riskBadge("Close", "green")}</div></aside></div>`;
  };

  Views.dispensinghub = () => {
    const holds = clinicalHoldRows();
    const queue = Store.prescriptions.filter(r => !["dispensed"].includes(r.status)).slice(0, 10);
    return `<div class="simple-hero"><div><h2>Dispensing</h2><p>Verify, document, and move prescriptions forward without jumping between queue screens.</p></div><button class="btn" data-go="clinicalops">Detailed review</button></div>
      <div class="simple-layout"><section class="ops-card"><div class="section-head"><h2>Needs pharmacist review</h2>${riskBadge(`${holds.length} hold(s)`, holds.length ? "red" : "green")}</div>${holds.length ? `<div class="simple-list">${holds.map(x => `<div class="simple-row"><span class="priority-dot red"></span><div><b>${esc(x.r.id)} · ${esc(x.p.first)} ${esc(x.p.last)}</b><p>${esc(x.d.name)} ${esc(x.d.strength)}</p><small>${x.allergy ? "Allergy conflict" : x.interactions.length ? `${x.interactions.length} interaction finding(s)` : x.d.schedule ? `Controlled schedule C-${x.d.schedule}` : "Review required"}</small></div><button class="btn sm" data-go="clinicalops">Review</button></div>`).join("")}</div>` : `<div class="empty">No clinical holds.</div>`}</section>
      <aside class="ops-card"><h2>Active dispensing queue</h2><div class="simple-list compact">${queue.map(r => { const p = Store.findPatient(r.patientId), d = Store.findDrug(r.drugId); return `<div class="simple-row"><div><b>${esc(r.id)}</b><p>${esc(p.first)} ${esc(p.last)} · ${esc(d.name)}</p><small>${esc(r.status)}</small></div><button class="btn sm" data-rx="${r.id}">Details</button></div>`; }).join("")}</div></aside></div>`;
  };

  Views.patienthub = () => {
    const rows = patientRows();
    return `<div class="simple-hero"><div><h2>Patients</h2><p>Focus on the patients who need adherence, sync, or follow-up work today.</p></div><button class="btn" data-go="careplans">All care notes</button></div>
      <div class="ops-grid-3 simple-patient-grid">${rows.map(x => `<div class="ops-card"><div class="section-head"><h3>${esc(x.p.first)} ${esc(x.p.last)}</h3>${riskBadge(x.status, x.tone)}</div><p class="muted">${esc(x.p.insurance || "No plan listed")}</p><div class="chip-row">${riskBadge(`${x.rxs.length} active`, "blue")}${x.avg != null ? riskBadge(`PDC ${x.avg}%`, x.avg < 80 ? "red" : "green") : riskBadge("PDC n/a", "gray")}${x.maintenance.length >= 2 ? riskBadge("Med sync", "blue") : ""}</div><button class="btn sm" data-go="careplans">Open care view</button></div>`).join("")}</div>`;
  };

  Views.inventoryhub = () => {
    const rows = reorderRows();
    return `<div class="simple-hero"><div><h2>Inventory</h2><p>Buy, hold, return, or substitute based on stock, expiry, and reimbursement economics.</p></div><button class="btn" data-go="purchasing">Full purchasing</button></div>
      <div class="ops-card"><div class="section-head"><h2>Recommended actions</h2>${riskBadge(`${rows.length} item(s)`, rows.length ? "amber" : "green")}</div>${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Medication</th><th>Stock</th><th>Expiry</th><th>Action</th><th>Net/unit</th></tr></thead><tbody>${rows.map(x => `<tr><td><b>${esc(x.d.name)} ${esc(x.d.strength)}</b><div class="muted small">${esc(x.d.ndc || "")}</div></td><td>${x.d.stock}<div class="muted small">reorder ${x.d.reorder}</div></td><td>${fmtDate(x.d.expiry)}<div class="muted small">${x.exp}d</div></td><td>${riskBadge(x.rec, x.tone)}</td><td>${riskBadge(dollars(x.pe.net), x.pe.net < 0 ? "red" : "green")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">No inventory actions right now.</div>`}</div>`;
  };

  Views.toolshub = () => {
    return `<div class="simple-hero"><div><h2>Tools & close</h2><p>Reports, imports, audit packets, SOPs, and the daily close live here so daily work stays uncluttered.</p></div><button class="btn primary" data-go="dailyclose">Start close</button></div>
      <div class="ops-grid-3">${sectionCard("Daily close", "Finish checklist, controlled count snapshot, and close packet.", "dailyclose", "")}${sectionCard("CSV Import Center", "Upload CSV sections, stage, clean, validate, then integrate.", "importcenter", "")}${sectionCard("Audit defense", "Build a fictional audit response packet from open audit items.", "auditdefense", "")}${sectionCard("Reports", "Export reimbursement, inventory, controlled, and compliance reports.", "reportcenter", "")}${sectionCard("SOP Guide", "Plain-language workflow cards for training and consistency.", "sop", "")}${sectionCard("Detailed screens", "Open the deeper workflow views when needed, not during routine triage.", "", "")}</div>
      <div class="ops-card" style="margin-top:16px"><div class="section-head"><h2>Detailed views</h2></div><div class="ops-grid-3">${LEGACY_LINKS.map(x => `<button class="tool-link" data-go="${x.view}"><b>${esc(x.label)}</b><span>${esc(x.desc)}</span></button>`).join("")}</div></div>`;
  };

  function injectStyles() {
    if (document.getElementById("streamlineStyles")) return;
    const style = document.createElement("style");
    style.id = "streamlineStyles";
    style.textContent = `
      body.streamlined .muted-nav { display:none !important; }
      .simple-hero { display:flex; align-items:center; justify-content:space-between; gap:18px; background:linear-gradient(135deg,#ffffff,#eefaf7); border:1px solid var(--line); border-radius:20px; padding:22px; margin-bottom:16px; box-shadow:var(--shadow); }
      .simple-hero h2 { margin:0 0 8px; font-size:26px; letter-spacing:-.02em; }
      .simple-hero p { margin:0; color:var(--muted); max-width:760px; line-height:1.55; }
      .simple-kpis { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin-bottom:16px; }
      .simple-kpi { background:#fff; border:1px solid var(--line); border-radius:16px; padding:16px; text-align:left; cursor:pointer; box-shadow:var(--shadow); }
      .simple-kpi span { display:block; font-size:30px; font-weight:900; color:var(--ink); }
      .simple-kpi b { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.06em; }
      .simple-layout { display:grid; grid-template-columns:minmax(0,2fr) minmax(280px,1fr); gap:16px; }
      .simple-list { display:flex; flex-direction:column; gap:10px; }
      .simple-list.compact { gap:8px; }
      .simple-row { display:grid; grid-template-columns:auto 1fr auto; gap:12px; align-items:center; border:1px solid var(--line); border-radius:14px; padding:12px; background:#fff; }
      .simple-row p { margin:3px 0; color:var(--muted); }
      .simple-row small { color:var(--muted); }
      .simplified-card h3 { margin:0; }
      .tool-link { display:flex; flex-direction:column; gap:6px; text-align:left; background:#fff; border:1px solid var(--line); border-radius:14px; padding:14px; cursor:pointer; color:var(--ink); }
      .tool-link span { color:var(--muted); font-size:12px; line-height:1.4; }
      body.view-mobile .simple-hero { flex-direction:column; align-items:flex-start; padding:16px; border-radius:16px; }
      body.view-mobile .simple-hero h2 { font-size:22px; }
      body.view-mobile .simple-kpis { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
      body.view-mobile .simple-layout { grid-template-columns:1fr; }
      body.view-mobile .simple-row { grid-template-columns:auto 1fr; }
      body.view-mobile .simple-row .btn { grid-column:2; width:max-content; }
    `;
    document.head.appendChild(style);
  }

  function installNav() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const current = window.currentView || "dashboard";
    nav.innerHTML = PRIMARY_NAV.map(x => `<button class="nav-item ${x.view === current ? "active" : ""}" data-view="${x.view}"><span class="ni-ico">${x.icon}</span> ${x.label}</button>`).join("");
    nav.querySelectorAll(".nav-item").forEach(btn => btn.onclick = () => navigate(btn.dataset.view));
  }

  function updateTitle() {
    const h = document.getElementById("viewTitle");
    if (!h) return;
    const found = PRIMARY_NAV.find(x => x.view === (window.currentView || "dashboard"));
    if (found) h.textContent = `${found.icon} ${found.label}`;
  }

  function installTour() {
    if (window.__pharmadeskStreamlinedTourInstalled) return;
    window.__pharmadeskStreamlinedTourInstalled = true;
    window.__pharmadeskTourSteps = [
      { view: "dashboard", title: "Home", body: "Start here. The app now focuses on one operating view: open tasks, clinical holds, claims risk, inventory actions, and the owner brief." },
      { view: "dispensinghub", title: "Dispensing", body: "Dispensing combines the queue and clinical review into one practical workflow: verify, document, then move the prescription forward." },
      { view: "patienthub", title: "Patients", body: "Patients combines care notes and Med Sync so adherence and follow-up live in one patient-centered area." },
      { view: "inventoryhub", title: "Inventory", body: "Inventory combines stock and purchasing decisions. The question is simple: buy, hold, return, or substitute." },
      { view: "toolshub", title: "Tools", body: "Imports, reports, audit defense, SOPs, and daily close are grouped here so they do not clutter the daily workflow." }
    ];
  }

  const baseRender = render;
  render = function () {
    const result = baseRender.apply(this, arguments);
    document.body.classList.add("streamlined");
    injectStyles();
    installNav();
    updateTitle();
    installTour();
    return result;
  };

  try {
    document.body.classList.add("streamlined");
    injectStyles();
    installNav();
    installTour();
    render();
  } catch (e) {
    console.error("Streamline layer failed", e);
  }
})();

/* PharmaDesk V3 operator upgrades — fictional demo workflows only. */
(function () {
  const KEYS = {
    reviews: "pharmadesk.v3.reviewNotes",
    claimFlow: "pharmadesk.v3.claimFlow",
    medSync: "pharmadesk.v3.medSync",
    orderReviews: "pharmadesk.v3.orderReviews"
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) || f; } catch (e) { return f; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const today = () => TODAY.toISOString().slice(0, 10);
  const addDays = (date, days) => { const d = new Date(date + "T12:00:00"); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
  const signedMoney = n => (Number(n) < 0 ? "−" : "") + money(Math.abs(Number(n) || 0));

  function addNavItem(view, icon, label, afterView) {
    const nav = document.getElementById("nav");
    if (!nav || document.querySelector(`[data-view="${view}"]`)) return;
    const btn = document.createElement("button");
    btn.className = "nav-item";
    btn.dataset.view = view;
    btn.innerHTML = `<span class="ni-ico">${icon}</span> ${label}`;
    const after = document.querySelector(`[data-view="${afterView}"]`);
    if (after && after.nextSibling) nav.insertBefore(btn, after.nextSibling); else nav.appendChild(btn);
    btn.onclick = () => navigate(view);
  }
  function wireNav() {
    addNavItem("medsync", "🗓️", "Med Sync", "careplans");
    addNavItem("auditdefense", "🛡️", "Audit Defense", "dailyclose");
  }

  function eco(c) {
    try { return claimEconomics(c); }
    catch (e) {
      const rx = Store.prescriptions.find(r => r.id === c.rxId);
      const drug = rx ? Store.findDrug(rx.drugId) : null;
      const reimbursement = (c.paid || 0) + (c.copay || 0);
      const acquisitionCost = drug && rx ? drug.cost * rx.qty : 0;
      const dirFee = c.dirFee || 0;
      const net = reimbursement - acquisitionCost - dirFee;
      return { rx, drug, reimbursement, acquisitionCost, dirFee, net, underwater: net < 0, macEligible: reimbursement < acquisitionCost };
    }
  }
  function econMini(e) {
    return `<div class="chip-row"><span class="badge ${e.net < 0 ? "red" : "green"}">Net ${signedMoney(e.net)}</span><span class="badge gray">Cost ${money(e.acquisitionCost || 0)}</span><span class="badge gray">DIR ${money(e.dirFee || 0)}</span></div>`;
  }

  function reviews() { return read(KEYS.reviews, {}); }
  function saveReview(rxId, reason, note) {
    const all = reviews();
    all[rxId] = { reason, note, date: today(), by: "K. Adeyemi, PharmD" };
    write(KEYS.reviews, all);
    toast(`Review note saved for ${rxId}`);
    render();
  }
  function reviewModal(rxId) {
    const rx = Store.prescriptions.find(r => r.id === rxId); if (!rx) return;
    const p = Store.findPatient(rx.patientId), d = Store.findDrug(rx.drugId);
    const body = `<p class="muted">Demo-only documentation note for a workflow review item.</p><dl class="kvs"><dt>Rx</dt><dd>${rx.id}</dd><dt>Profile</dt><dd>${p.first} ${p.last}</dd><dt>Item</dt><dd>${d.name} ${d.strength}</dd></dl><label class="field">Review reason<select id="rvReason"><option>Profile reviewed</option><option>Follow-up needed</option><option>Plan or payer issue</option><option>Documentation completed</option></select></label><label class="field" style="margin-top:10px">Note<textarea id="rvNote" rows="4" placeholder="Fictional demo note."></textarea></label>`;
    const m = openModal({ title: "Workflow review note", body, footer: `<button class="btn" id="rvCancel">Cancel</button><button class="btn primary" id="rvSave">Save</button>`, size: "lg" });
    $("#rvCancel").onclick = m.close;
    $("#rvSave").onclick = () => { saveReview(rxId, $("#rvReason").value, $("#rvNote").value || "Reviewed in demo workflow."); m.close(); };
  }

  const baseClinical = Views.clinicalops;
  Views.clinicalops = () => {
    const all = reviews();
    return `${baseClinical()}<div class="ops-card" style="margin-top:16px"><div class="section-head"><h2>Review documentation</h2><span class="badge blue">demo workflow</span></div><p class="muted">Adds a practical note layer to the review queue so exceptions do not simply disappear after being viewed.</p><div class="protocol-list">${Store.prescriptions.filter(r => ["intake", "verification", "pmp-review"].includes(r.status)).map(r => { const p = Store.findPatient(r.patientId), d = Store.findDrug(r.drugId), note = all[r.id]; return `<div class="queue-row"><span class="priority-dot ${note ? "green" : "amber"}"></span><div><b>${r.id} · ${p.first} ${p.last}</b><span class="action-note">${d.name} ${d.strength} · ${r.status}</span>${note ? `<span class="action-note">${esc(note.reason)} · ${fmtDate(note.date)}</span>` : `<span class="action-note">No review note saved</span>`}</div><button class="btn sm ${note ? "" : "primary"}" data-review-rx="${r.id}">${note ? "Update note" : "Add note"}</button></div>`; }).join("")}</div></div>`;
  };

  function claimFlow() { return read(KEYS.claimFlow, {}); }
  function getClaimFlow(id) { return claimFlow()[id] || { status: "new", due: addDays(today(), 2), note: "" }; }
  function saveClaimFlow(id, status, due, note) {
    const all = claimFlow();
    all[id] = { status, due, note, updated: today() };
    write(KEYS.claimFlow, all);
    toast(`${id} follow-up updated`);
    render();
  }
  function claimFlowModal(id) {
    const st = getClaimFlow(id);
    const body = `<label class="field">Follow-up status<select id="cfStatus"><option ${st.status === "new" ? "selected" : ""}>new</option><option ${st.status === "worked" ? "selected" : ""}>worked</option><option ${st.status === "payer contacted" ? "selected" : ""}>payer contacted</option><option ${st.status === "submitted" ? "selected" : ""}>submitted</option><option ${st.status === "resolved" ? "selected" : ""}>resolved</option><option ${st.status === "denied" ? "selected" : ""}>denied</option></select></label><label class="field" style="margin-top:10px">Due date<input id="cfDue" type="date" value="${esc(st.due)}"></label><label class="field" style="margin-top:10px">Note<textarea id="cfNote" rows="4">${esc(st.note || "")}</textarea></label>`;
    const m = openModal({ title: `Claim follow-up · ${id}`, body, footer: `<button class="btn" id="cfCancel">Cancel</button><button class="btn primary" id="cfSave">Save</button>`, size: "lg" });
    $("#cfCancel").onclick = m.close;
    $("#cfSave").onclick = () => { saveClaimFlow(id, $("#cfStatus").value, $("#cfDue").value, $("#cfNote").value); m.close(); };
  }
  Views.claimsops = () => {
    const rows = Store.claims.map(c => ({ c, e: eco(c), flow: getClaimFlow(c.id) })).sort((a, b) => a.e.net - b.e.net);
    return `<div class="ops-hero"><h2>Claims desk lifecycle</h2><p>Tracks rejected, underwater, and follow-up claims through a practical owner workflow: new, worked, payer contacted, submitted, resolved, or denied.</p></div><div class="ops-card"><div class="table-wrap"><table><thead><tr><th>Claim</th><th>Issue</th><th>Economics</th><th>Follow-up</th><th></th></tr></thead><tbody>${rows.map(x => { const issue = x.c.status === "rejected" ? `Reject ${x.c.rejectCode || ""}` : x.e.underwater ? "Underwater" : "Monitor"; return `<tr><td><b class="lk" data-claim="${x.c.id}">${x.c.id}</b><div class="muted small">${x.e.drug ? x.e.drug.name : x.c.rxId}</div></td><td><span class="badge ${x.c.status === "rejected" || x.e.underwater ? "red" : "green"}">${esc(issue)}</span><div class="muted small">${esc(x.c.payer)}</div></td><td>${econMini(x.e)}</td><td><span class="badge ${x.flow.status === "resolved" ? "green" : x.flow.status === "denied" ? "red" : x.flow.status === "submitted" ? "blue" : "amber"}">${esc(x.flow.status)}</span><div class="muted small">Due ${fmtDate(x.flow.due)}</div>${x.flow.note ? `<div class="muted small">${esc(x.flow.note)}</div>` : ""}</td><td><button class="btn sm primary" data-claim-flow="${x.c.id}">Update</button></td></tr>`; }).join("")}</tbody></table></div></div>`;
  };

  function medState() { return read(KEYS.medSync, {}); }
  function setMedState(pid, status) { const s = medState(); s[pid] = { status, date: today() }; write(KEYS.medSync, s); toast(`Med Sync ${status}`); render(); }
  function medRows() {
    return Store.patients.map(p => {
      const meds = Store.prescriptions.filter(r => r.patientId === p.id && r.maintenance);
      const due = meds.filter(r => r.dispensedOn).map(r => ({ rx: r, drug: Store.findDrug(r.drugId), due: addDays(r.dispensedOn, r.daysSupply || 30) }));
      const pdcVals = meds.map(r => r.pdc).filter(Boolean);
      const pdc = pdcVals.length ? Math.round(pdcVals.reduce((a, b) => a + b, 0) / pdcVals.length * 100) : null;
      return { p, meds, due, pdc, suggested: due[0]?.due || addDays(today(), 14) };
    }).filter(x => x.meds.length || (x.p.conditions || []).length > 1);
  }
  Views.medsync = () => {
    const state = medState();
    return `<div class="ops-hero"><h2>Med Sync & adherence</h2><p>Demo workspace for identifying maintenance-med profiles, outreach opportunities, suggested sync dates, and adherence risk.</p></div><div class="ops-grid-3">${medRows().map(x => `<div class="ops-card"><div class="section-head"><h2>${x.p.first} ${x.p.last}</h2><span class="badge ${x.pdc != null && x.pdc < 80 ? "red" : "green"}">${x.pdc != null ? `PDC ${x.pdc}%` : "review"}</span></div><div class="muted small">${esc(x.p.insurance)}</div><div class="chip-row"><span class="badge blue">Suggested ${fmtDate(x.suggested)}</span><span class="badge gray">${x.meds.length} maintenance med(s)</span></div><div class="note-list">${x.due.map(d => `<div class="note-item"><b>${d.drug.name}</b><div class="muted small">Due ${fmtDate(d.due)}</div></div>`).join("") || `<div class="empty">Review manually.</div>`}</div><div class="row" style="margin-top:10px"><button class="btn sm primary" data-medsync="${x.p.id}:enrolled">Enroll</button><button class="btn sm" data-medsync="${x.p.id}:outreach">Outreach</button><button class="btn sm" data-medsync="${x.p.id}:declined">Declined</button></div>${state[x.p.id] ? `<div class="muted small" style="margin-top:8px">Status: ${esc(state[x.p.id].status)} · ${fmtDate(state[x.p.id].date)}</div>` : ""}</div>`).join("")}</div>`;
  };

  function purchaseRec(d) {
    const pe = projectedEconomics(d, 1);
    const exp = daysUntil(d.expiry);
    if (exp <= 45) return { label: "Return / reduce", color: "red", why: "Expiry is close.", pe };
    if (d.stock <= d.reorder && pe.net < 0) return { label: "Hold / review", color: "amber", why: "Low stock but projected economics are negative.", pe };
    if (d.stock <= d.reorder) return { label: "Buy now", color: "green", why: "Low stock and economics are positive.", pe };
    if (pe.net < 0) return { label: "Substitute / payer review", color: "amber", why: "Current economics are poor.", pe };
    return { label: "Monitor", color: "gray", why: "No immediate action.", pe };
  }
  Views.purchasing = () => `<div class="ops-hero"><h2>Purchasing decision engine</h2><p>Ordering now considers stock, reorder point, expiry, and projected unit economics.</p></div><div class="ops-card"><div class="table-wrap"><table><thead><tr><th>Medication</th><th>Stock</th><th>Recommendation</th><th>Economics</th></tr></thead><tbody>${Store.inventory.map(d => ({ d, r: purchaseRec(d) })).map(x => `<tr><td><b>${x.d.name} ${x.d.strength}</b><div class="muted small">Expires ${fmtDate(x.d.expiry)}</div></td><td>${x.d.stock}<div class="muted small">Reorder ${x.d.reorder}</div></td><td><span class="badge ${x.r.color}">${x.r.label}</span><div class="muted small">${esc(x.r.why)}</div></td><td><span class="badge ${x.r.pe.net < 0 ? "red" : "green"}">${signedMoney(x.r.pe.net)}</span></td></tr>`).join("")}</tbody></table></div></div>`;

  function dailyPacket() {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Daily Close Packet</title><style>body{font-family:Arial;margin:32px;color:#16202b}h1{color:#0a5f54}li{margin:6px 0}</style></head><body><h1>Daily Close Packet</h1><p>Prepared ${fmtDate(TODAY)} · fictional demo data.</p><h2>Claim follow-ups</h2><ul>${Store.claims.map(c => `<li>${c.id}: ${getClaimFlow(c.id).status} · due ${fmtDate(getClaimFlow(c.id).due)}</li>`).join("")}</ul><h2>Review notes</h2><ul>${Store.prescriptions.map(r => `<li>${r.id}: ${reviews()[r.id] ? "documented" : "open"}</li>`).join("")}</ul></body></html>`;
    downloadFile("pharmadesk-daily-close-packet.html", html, "text/html");
    toast("Daily close packet downloaded");
  }
  const baseClose = Views.dailyclose;
  Views.dailyclose = () => `${baseClose()}<div class="ops-card" style="margin-top:16px"><div class="section-head"><h2>Daily close packet</h2><button class="btn primary" id="dailyPacket">Export packet</button></div><p class="muted">Printable handoff of claim follow-ups and open review items.</p></div>`;

  function auditPacket(id) {
    const a = Store.audits.find(x => x.id === id); if (!a) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Audit Packet ${esc(id)}</title><style>body{font-family:Arial;margin:32px;color:#16202b}h1{color:#0a5f54}.box{background:#f4f7f9;padding:14px;border-radius:8px}</style></head><body><h1>Audit Defense Packet</h1><div class="box">${esc(a.pbm)} · ${esc(a.id)} · due ${fmtDate(a.due)} · risk ${money(a.amountAtRisk - a.recouped)}</div><ul><li>Prescription record</li><li>Dispensing record</li><li>Signature or delivery support</li><li>Days-supply support</li><li>Response note</li></ul><p>Fictional demo packet.</p></body></html>`;
    downloadFile(`pharmadesk-audit-${id}.html`, html, "text/html");
    toast("Audit packet downloaded");
  }
  Views.auditdefense = () => `<div class="ops-hero"><h2>Audit defense</h2><p>Build a fictional audit response packet from open audit items.</p></div><div class="ops-card"><div class="table-wrap"><table><thead><tr><th>Audit</th><th>PBM</th><th>Risk</th><th>Due</th><th></th></tr></thead><tbody>${Store.audits.map(a => `<tr><td><b>${a.id}</b></td><td>${esc(a.pbm)}</td><td>${money(a.amountAtRisk - a.recouped)}</td><td>${fmtDate(a.due)}</td><td><button class="btn sm primary" data-audit-packet="${a.id}">Packet</button></td></tr>`).join("")}</tbody></table></div></div>`;

  const baseDashboard = Views.dashboard;
  Views.dashboard = () => `${baseDashboard()}<div class="ops-card" style="margin-top:16px"><div class="section-head"><h2>Implemented upgrades</h2><span class="badge green">active</span></div><p class="muted">Clinical review notes, claim follow-up lifecycle, Med Sync, purchasing recommendations, daily close packet, and audit packets are now active in the demo.</p><div class="row"><button class="btn" data-go="medsync">Open Med Sync</button><button class="btn" data-go="auditdefense">Open Audit Defense</button></div></div>`;

  const baseRender = render;
  render = function () {
    const result = baseRender.apply(this, arguments);
    wireNav();
    document.querySelectorAll("[data-review-rx]").forEach(b => b.onclick = () => reviewModal(b.dataset.reviewRx));
    document.querySelectorAll("[data-claim-flow]").forEach(b => b.onclick = () => claimFlowModal(b.dataset.claimFlow));
    document.querySelectorAll("[data-medsync]").forEach(b => b.onclick = () => { const [id, status] = b.dataset.medsync.split(":"); setMedState(id, status); });
    document.querySelectorAll("[data-audit-packet]").forEach(b => b.onclick = () => auditPacket(b.dataset.auditPacket));
    const dp = document.getElementById("dailyPacket"); if (dp) dp.onclick = dailyPacket;
    return result;
  };

  try { wireNav(); render(); } catch (e) { console.error("Operator upgrades failed", e); }
})();

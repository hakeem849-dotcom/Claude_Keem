/* PharmaDesk V3 — Operator Edition
   Production-minded workflows for a fictional independent pharmacy demo.
   Keeps the original app intact and adds realistic operating screens. */
(function () {
  const KEYS = {
    done: "pharmadesk.v3.doneTasks",
    notes: "pharmadesk.v3.careNotes",
    claims: "pharmadesk.v3.claimActions",
    orders: "pharmadesk.v3.orders",
    close: "pharmadesk.v3.dailyClose"
  };

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const getJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } };
  const setJson = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} };
  const absMoney = n => money(Math.abs(Number(n) || 0));
  const signedMoney = n => (n < 0 ? "−" : "") + absMoney(n);

  function safeClaimEconomics(claim) {
    try { return claimEconomics(claim); }
    catch (e) {
      const rx = Store.prescriptions.find(r => r.id === claim.rxId);
      const drug = rx ? Store.findDrug(rx.drugId) : null;
      const reimbursement = (claim.paid || 0) + (claim.copay || 0);
      const acquisitionCost = drug && rx ? drug.cost * rx.qty : 0;
      const dirFee = claim.dirFee || 0;
      const net = reimbursement - acquisitionCost - dirFee + (claim.recovered || 0);
      return { rx, drug, reimbursement, acquisitionCost, dirFee, net, underwater: net < 0, macEligible: reimbursement < acquisitionCost };
    }
  }

  function wf(e) {
    const paid = e.paid != null ? e.paid : (e.reimbursement - (e.copay || 0));
    const copay = e.copay || 0;
    return `<div class="waterfall">
      <div class="wf plus"><span>Plan paid</span><b>${money(paid)}</b></div>
      <div class="wf plus"><span>Patient copay</span><b>${money(copay)}</b></div>
      <div class="wf minus"><span>Acquisition cost</span><b>−${money(e.acquisitionCost || 0)}</b></div>
      <div class="wf minus"><span>DIR / price concession</span><b>−${money(e.dirFee || 0)}</b></div>
      <div class="wf total ${e.net < 0 ? "bad" : "good"}"><span>Final net</span><b>${signedMoney(e.net || 0)}</b></div>
    </div>`;
  }

  function claimRows() { return Store.claims.map(c => ({ c, e: safeClaimEconomics(c) })); }
  function doneSet() { return new Set(getJson(KEYS.done, [])); }
  function toggleDone(id) {
    const s = doneSet();
    s.has(id) ? s.delete(id) : s.add(id);
    setJson(KEYS.done, [...s]);
    toast(s.has(id) ? "Task completed" : "Task reopened");
    render();
  }

  function notes() { return getJson(KEYS.notes, []); }
  function addNote(patientId, type, text) {
    const p = Store.findPatient(patientId);
    if (!p || !text.trim()) return;
    const next = notes();
    next.unshift({ id: "N-" + Date.now(), patientId, type, text: text.trim(), date: TODAY.toISOString().slice(0, 10), by: "K. Adeyemi, PharmD" });
    setJson(KEYS.notes, next);
    toast("Care note saved");
    render();
  }

  function claimActions() { return getJson(KEYS.claims, {}); }
  function setClaimAction(id, status) {
    const actions = claimActions();
    actions[id] = { status, updated: TODAY.toISOString().slice(0, 10) };
    setJson(KEYS.claims, actions);
    toast(`${id} marked ${status}`);
    render();
  }

  function orders() { return getJson(KEYS.orders, []); }
  function placeOrder(drugId, qty) {
    const d = Store.findDrug(drugId);
    if (!d) return;
    const next = orders();
    next.unshift({ id: "PO-" + Math.floor(1000 + Math.random() * 9000), drugId, qty, date: TODAY.toISOString().slice(0, 10), status: "draft" });
    setJson(KEYS.orders, next);
    toast(`Draft PO created: ${qty} × ${d.name}`);
    render();
  }

  const closeItems = [
    { id: "controlled", label: "Controlled substance counts reconciled", detail: "C-II through C-V perpetual inventory reviewed and variance documented." },
    { id: "cash", label: "Cash drawer and deposits balanced", detail: "Cash, checks, and POS tender totals reviewed." },
    { id: "claims", label: "Rejected claims worked", detail: "Rejects assigned, reversed, or queued for follow-up." },
    { id: "cold", label: "Cold chain log checked", detail: "Fridge/freezer temps documented and excursion response ready." },
    { id: "orders", label: "Ordering exceptions reviewed", detail: "Low stock, expiring, and underwater reorder items reviewed." },
    { id: "handoff", label: "Tomorrow handoff written", detail: "Open clinical, payer, audit, and inventory issues summarized." }
  ];
  function closeState() { return getJson(KEYS.close, {}); }
  function toggleClose(id) {
    const s = closeState(); s[id] = !s[id]; setJson(KEYS.close, s); render();
  }

  function taskItems() {
    const out = [];
    Store.prescriptions.filter(r => r.status === "verification" || r.status === "intake").forEach(r => {
      const p = Store.findPatient(r.patientId), d = Store.findDrug(r.drugId);
      const allergen = allergyConflict(p, d);
      const interactions = checkInteractions(patientActiveDrugs(r.patientId));
      if (allergen || interactions.length) {
        out.push({ id: `clinical-${r.id}`, area: "Clinical", priority: "red", title: `${r.id}: DUR / allergy review`, detail: `${p.first} ${p.last} · ${d.name} ${d.strength}`, action: allergen ? `Allergy conflict: ${allergen}` : `${interactions.length} interaction finding(s)`, go: "clinicalops" });
      } else {
        out.push({ id: `verify-${r.id}`, area: "Clinical", priority: "blue", title: `${r.id}: verify prescription`, detail: `${p.first} ${p.last} · ${d.name} ${d.strength}`, action: "Complete verification and counseling plan", go: "prescriptions" });
      }
    });
    Store.claims.filter(c => c.status === "rejected").forEach(c => out.push({ id: `reject-${c.id}`, area: "Claims", priority: "red", title: `${c.id}: rejected claim`, detail: `${c.payer} · code ${c.rejectCode || "unknown"}`, action: "Resolve reject, reverse, or call plan", go: "claimsops" }));
    claimRows().filter(x => x.e.underwater).forEach(({ c, e }) => out.push({ id: `loss-${c.id}`, area: "Claims", priority: "amber", title: `${c.id}: underwater paid claim`, detail: `${e.drug ? e.drug.name : c.rxId} · ${signedMoney(e.net)} net`, action: e.macEligible ? "Queue MAC appeal" : "Review DIR impact", go: "claimsops" }));
    Store.inventory.filter(d => d.stock <= d.reorder).forEach(d => out.push({ id: `stock-${d.id}`, area: "Inventory", priority: projectedEconomics(d, 1).net < 0 ? "amber" : "blue", title: `${d.name}: low stock`, detail: `${d.stock} on hand · reorder at ${d.reorder}`, action: projectedEconomics(d, 1).net < 0 ? "Review before buying — underwater economics" : "Create purchase order", go: "purchasing" }));
    Store.inventory.filter(d => daysUntil(d.expiry) <= 60).forEach(d => out.push({ id: `exp-${d.id}`, area: "Inventory", priority: "amber", title: `${d.name}: expires soon`, detail: `${fmtDate(d.expiry)} · ${daysUntil(d.expiry)} days`, action: "Return, transfer, discount, or reduce reorder", go: "purchasing" }));
    Store.audits.filter(a => a.status !== "closed").forEach(a => out.push({ id: `audit-${a.id}`, area: "Audit", priority: daysUntil(a.due) <= 7 ? "red" : "amber", title: `${a.id}: ${a.pbm} audit`, detail: `${money(a.amountAtRisk - a.recouped)} at risk · due ${fmtDate(a.due)}`, action: a.action, go: "dailyclose" }));
    Store.credentials.filter(c => daysUntil(c.expires) <= 45).forEach(c => out.push({ id: `cred-${c.id}`, area: "Compliance", priority: daysUntil(c.expires) < 0 ? "red" : "amber", title: `${c.name}: renewal due`, detail: `${c.holder} · ${daysUntil(c.expires)} days`, action: "Renew or document submission", go: "dailyclose" }));
    const rank = { red: 1, amber: 2, blue: 3, green: 4 };
    return out.sort((a, b) => rank[a.priority] - rank[b.priority] || a.area.localeCompare(b.area));
  }
  // Expose for other layers (e.g. streamline.js) that live in separate IIFEs.
  window.taskItems = taskItems;

  function kpis() {
    const tasks = taskItems();
    const done = doneSet();
    const active = tasks.filter(t => !done.has(t.id));
    const rejected = Store.claims.filter(c => c.status === "rejected").length;
    const underwater = claimRows().filter(x => x.e.underwater);
    const atRisk = Store.audits.filter(a => a.status !== "closed").reduce((s, a) => s + (a.amountAtRisk - a.recouped), 0);
    return { tasks, active, rejected, underwater, atRisk };
  }

  function taskTable(limit) {
    const done = doneSet();
    const items = taskItems().slice(0, limit || 999);
    return `<div class="protocol-list">${items.map(t => `<div class="queue-row ${done.has(t.id) ? "done" : ""}"><span class="priority-dot ${t.priority}"></span><div><b>${esc(t.title)}</b><span class="action-note">${esc(t.area)} · ${esc(t.detail)}</span><span class="action-note"><b>Next:</b> ${esc(t.action)}</span></div><div class="row"><button class="btn sm" data-go="${t.go}">Open</button><button class="btn sm ${done.has(t.id) ? "" : "primary"}" data-task-done="${t.id}">${done.has(t.id) ? "Reopen" : "Done"}</button></div></div>`).join("") || `<div class="empty">No exceptions. Keep monitoring the queue.</div>`}</div>`;
  }

  Views.dashboard = () => {
    const { tasks, active, rejected, underwater, atRisk } = kpis();
    const netLoss = underwater.reduce((s, x) => s + x.e.net, 0);
    return `<div class="ops-hero"><h2>Operator command center</h2><p>Designed from the pharmacist-owner view: start with exceptions, protect patient safety, defend reimbursement, order intelligently, and close the day cleanly. This is still a fictional demo, but the workflow is production-minded.</p><div class="ops-banner"><b>Realistic operating principle:</b> do not make the pharmacist hunt through screens. Surface the highest-risk clinical, payer, inventory, audit, and compliance exceptions first.</div></div>
    <div class="stats">
      ${statCard("Open exceptions", active.length, "✅", `${tasks.length - active.length} completed`, active.some(t => t.priority === "red") ? "red" : active.length ? "amber" : "green", "workqueue")}
      ${statCard("Rejected claims", rejected, "💳", "needs payer action", rejected ? "red" : "green", "claimsops")}
      ${statCard("Underwater fills", underwater.length, "🔻", `${signedMoney(netLoss)} net`, underwater.length ? "amber" : "green", "claimsops")}
      ${statCard("Audit exposure", money(atRisk), "📋", "open recoupment risk", atRisk ? "amber" : "green", "dailyclose")}
    </div>
    <div class="ops-grid"><div class="ops-card"><div class="section-head"><h2>Today's prioritized work</h2><button class="btn sm primary" data-go="workqueue">Open full queue</button></div>${taskTable(8)}</div><div class="ops-card"><h3>Owner brief</h3><p>Before opening: verify clinical holds, work red claim rejects, check low-stock medications that lose money after reimbursement, and confirm audit/compliance deadlines.</p><div class="chip-row"><span class="badge red">Clinical first</span><span class="badge amber">Payer loss review</span><span class="badge blue">Ordering discipline</span><span class="badge gray">Daily close</span></div><hr style="border:0;border-top:1px solid var(--line);margin:14px 0"><button class="btn primary" data-go="dailyclose">Start daily close checklist</button></div></div>`;
  };

  Views.workqueue = () => `<div class="ops-hero"><h2>Prioritized work queue</h2><p>One operating list across dispensing, claims, inventory, audits, and compliance. A real pharmacy does not experience these as separate problems; they hit the same team at the same time.</p></div><div class="ops-card">${taskTable()}</div>`;

  Views.clinicalops = () => {
    const reviews = Store.prescriptions.filter(r => ["intake", "verification", "pmp-review"].includes(r.status)).map(r => {
      const p = Store.findPatient(r.patientId), d = Store.findDrug(r.drugId);
      const allergies = allergyConflict(p, d);
      const interactions = checkInteractions(patientActiveDrugs(p.id));
      return { r, p, d, allergies, interactions };
    });
    return `<div class="ops-hero"><h2>Clinical review</h2><p>Focused verification queue for the pharmacist: allergies, interactions, controlled-substance status, counseling needs, and documented decisions.</p></div><div class="ops-grid">${reviews.map(x => `<div class="ops-card"><div class="section-head"><h2>${x.r.id}</h2><span class="badge ${x.allergies || x.interactions.length ? "red" : "green"}">${x.allergies || x.interactions.length ? "review" : "clear"}</span></div><dl class="kvs"><dt>Patient</dt><dd>${x.p.first} ${x.p.last}</dd><dt>Drug</dt><dd>${x.d.name} ${x.d.strength}${x.d.schedule ? ` · <span class="badge red">C-${x.d.schedule}</span>` : ""}</dd><dt>Sig</dt><dd>${esc(x.r.sig)}</dd><dt>Allergies</dt><dd>${x.p.allergies.length ? x.p.allergies.join(", ") : "none documented"}</dd></dl>${x.allergies ? `<div class="alert red" style="margin-top:10px"><span>🚫</span><div>Potential allergy conflict: ${esc(x.allergies)}</div></div>` : ""}${x.interactions.length ? `<div class="alert warn" style="margin-top:10px"><span>⚠️</span><div>${x.interactions.length} interaction finding(s). Review before release.</div></div>` : ""}<div class="row" style="margin-top:12px"><button class="btn primary" data-note-patient="${x.p.id}" data-note-type="Clinical intervention">Document note</button><button class="btn" data-rx="${x.r.id}">Rx details</button></div></div>`).join("")}</div>`;
  };

  Views.claimsops = () => {
    const actions = claimActions();
    const rows = claimRows().sort((a, b) => (a.e.net - b.e.net));
    return `<div class="ops-hero"><h2>Claims desk</h2><p>Realistic payer workbench: rejected claims, paid-but-underwater claims, MAC appeal candidates, and documentation for follow-up. The goal is not just billing visibility; it is recoverable action.</p></div><div class="ops-card"><div class="table-wrap"><table><thead><tr><th>Claim</th><th>Patient / drug</th><th>Payer issue</th><th>Economics</th><th>Next action</th></tr></thead><tbody>${rows.map(({ c, e }) => { const rx = e.rx, p = rx ? Store.findPatient(rx.patientId) : null; const st = actions[c.id]?.status || c.appealStatus || "not-started"; const payerIssue = c.status === "rejected" ? `Reject ${c.rejectCode || ""}` : e.underwater ? (e.macEligible ? "MAC below cost" : "DIR margin loss") : "Paid / monitor"; return `<tr><td><b class="lk" data-claim="${c.id}">${c.id}</b><div class="muted small">${c.status}</div></td><td>${p ? p.first + " " + p.last : "—"}<div class="muted small">${e.drug ? e.drug.name + " " + e.drug.strength : c.rxId}</div></td><td><span class="badge ${c.status === "rejected" || e.underwater ? "red" : "green"}">${esc(payerIssue)}</span><div class="muted small">${esc(c.payer)}</div></td><td>${wf(e)}</td><td><div class="chip-row"><span class="badge ${st === "won" ? "green" : st === "lost" ? "red" : st === "submitted" ? "blue" : "amber"}">${esc(st)}</span></div><div class="row" style="margin-top:8px"><button class="btn sm" data-claim-action="${c.id}:queued">Queue</button><button class="btn sm primary" data-claim-action="${c.id}:submitted">Submit</button><button class="btn sm" data-claim-action="${c.id}:won">Won</button><button class="btn sm danger" data-claim-action="${c.id}:lost">Lost</button></div></td></tr>`; }).join("")}</tbody></table></div></div>`;
  };

  Views.purchasing = () => {
    const currentOrders = orders();
    const suggestions = Store.inventory.map(d => {
      const pe = projectedEconomics(d, 1);
      const days = daysUntil(d.expiry);
      let rec = "Monitor";
      let color = "gray";
      if (d.stock <= d.reorder && pe.net >= 0 && days > 90) { rec = "Order"; color = "green"; }
      if (d.stock <= d.reorder && pe.net < 0) { rec = "Review before reorder"; color = "amber"; }
      if (days <= 60) { rec = "Do not overbuy / expiry risk"; color = "red"; }
      const qty = Math.max(0, d.reorder * 2 - d.stock);
      return { d, pe, days, rec, color, qty };
    }).sort((a, b) => (a.d.stock <= a.d.reorder ? -1 : 1) || a.pe.net - b.pe.net);
    return `<div class="ops-hero"><h2>Purchasing discipline</h2><p>Ordering is not just “low stock = buy.” Independent pharmacies need to consider reorder point, expiry, cash tied up, payer reimbursement, and whether the item is underwater after DIR.</p></div><div class="ops-grid"><div class="ops-card"><div class="section-head"><h2>Reorder recommendations</h2></div>${suggestions.map(x => `<div class="order-suggestion"><div><b>${x.d.name} ${x.d.strength}</b> <span class="badge ${x.color}">${x.rec}</span><div class="muted small">On hand ${x.d.stock} · reorder ${x.d.reorder} · expires ${fmtDate(x.d.expiry)} · net/unit ${signedMoney(x.pe.net)}</div></div><div>${x.qty > 0 ? `<button class="btn sm ${x.color === "green" ? "primary" : ""}" data-order="${x.d.id}:${x.qty}">${x.color === "red" ? "Review" : "Draft PO"}</button>` : `<span class="muted small">No order</span>`}</div></div>`).join("")}</div><div class="ops-card"><div class="section-head"><h2>Draft purchase orders</h2></div>${currentOrders.length ? currentOrders.map(o => { const d = Store.findDrug(o.drugId); return `<div class="note-item"><b>${o.id}</b> · ${o.qty} × ${d ? d.name : o.drugId}<div class="muted small">${fmtDate(o.date)} · ${o.status}</div></div>`; }).join("") : `<div class="empty">No draft purchase orders.</div>`}</div></div>`;
  };

  function patientSummary(p) {
    const meds = Store.prescriptions.filter(r => r.patientId === p.id);
    const active = meds.filter(r => r.status !== "dispensed");
    const pdc = meds.map(r => r.pdc).filter(Boolean);
    const avgPdc = pdc.length ? Math.round(pdc.reduce((a, b) => a + b, 0) / pdc.length * 100) : null;
    const patientNotes = notes().filter(n => n.patientId === p.id).slice(0, 3);
    return `<div class="ops-card patient-card" data-open-patient="${p.id}"><div class="section-head"><h2>${p.first} ${p.last}</h2><span class="badge ${active.length ? "blue" : "gray"}">${active.length} active</span></div><div class="muted small">${esc(p.insurance)}</div><div class="chip-row"><span class="badge gray">${p.conditions.join(" · ") || "No conditions"}</span>${avgPdc != null ? `<span class="badge ${avgPdc < 80 ? "red" : "green"}">PDC ${avgPdc}%</span>` : ""}</div>${patientNotes.length ? `<div class="note-list">${patientNotes.map(n => `<div class="note-item"><b>${esc(n.type)}</b><div>${esc(n.text)}</div><div class="muted small">${fmtDate(n.date)} · ${esc(n.by)}</div></div>`).join("")}</div>` : `<p class="muted small">No care notes yet.</p>`}<button class="btn sm primary" data-note-patient="${p.id}" data-note-type="Care plan" style="margin-top:10px">Add note</button></div>`;
  }

  Views.careplans = () => `<div class="ops-hero"><h2>Patient care workspace</h2><p>For real use, patient care must connect medication profile, adherence signals, interventions, and follow-up notes. This demo keeps data fictional while showing the workflow pattern.</p></div><div class="ops-grid-3">${Store.patients.map(patientSummary).join("")}</div>`;

  Views.dailyclose = () => {
    const st = closeState();
    const completed = closeItems.filter(i => st[i.id]).length;
    const controlled = Store.inventory.filter(d => d.schedule > 0);
    return `<div class="ops-hero"><h2>Daily close</h2><p>A realistic independent pharmacy day ends with open exceptions, controlled counts, claim rejects, temperature logs, deposits, audits, and tomorrow's handoff. This screen turns it into a repeatable checklist.</p></div><div class="ops-grid"><div class="ops-card"><div class="section-head"><h2>Close checklist</h2><span class="badge ${completed === closeItems.length ? "green" : "amber"}">${completed}/${closeItems.length}</span></div>${closeItems.map(i => `<div class="close-row ${st[i.id] ? "complete" : ""}"><div><b>${esc(i.label)}</b><div class="muted small">${esc(i.detail)}</div></div><button class="btn sm ${st[i.id] ? "" : "primary"}" data-close="${i.id}">${st[i.id] ? "Reopen" : "Complete"}</button></div>`).join("")}</div><div class="ops-card"><div class="section-head"><h2>Controlled count snapshot</h2></div><div class="table-wrap"><table><thead><tr><th>Drug</th><th>Expected</th><th>Physical</th><th>Variance</th></tr></thead><tbody>${controlled.map((d, idx) => { const physical = idx === 0 ? d.stock - 1 : d.stock; const variance = physical - d.stock; return `<tr><td>${d.name} ${d.strength}</td><td>${d.stock}</td><td>${physical}</td><td><span class="badge ${variance ? "red" : "green"}">${variance}</span></td></tr>`; }).join("")}</tbody></table></div><div class="alert warn" style="margin-top:12px"><span>⚠️</span><div>Demo only: a real controlled-substance reconciliation would require immutable audit logs, user identity, timestamps, and policy-specific documentation.</div></div></div></div>`;
  };

  Views.sop = () => `<div class="ops-hero"><h2>SOP guide</h2><p>Production-minded workflows need clear operating standards. These SOP cards make the app informational and usable for training, not just viewing dashboards.</p></div><div class="ops-grid-3"><div class="ops-card sop-section"><h3>Clinical hold protocol</h3><div class="protocol-list"><div class="protocol-step"><span class="protocol-num">1</span><div>Confirm patient, drug, strength, sig, prescriber, allergies, and active profile.</div></div><div class="protocol-step"><span class="protocol-num">2</span><div>Assess interaction or allergy severity and document rationale.</div></div><div class="protocol-step"><span class="protocol-num">3</span><div>Contact prescriber or counsel patient when needed before release.</div></div></div></div><div class="ops-card sop-section"><h3>Rejected claim protocol</h3><div class="protocol-list"><div class="protocol-step"><span class="protocol-num">1</span><div>Read reject code, plan message, eligibility, refill timing, and NDC coverage.</div></div><div class="protocol-step"><span class="protocol-num">2</span><div>Resolve, reverse, call plan, or create patient/prescriber follow-up.</div></div><div class="protocol-step"><span class="protocol-num">3</span><div>Track unresolved rejects before daily close.</div></div></div></div><div class="ops-card sop-section"><h3>Underwater fill protocol</h3><div class="protocol-list"><div class="protocol-step"><span class="protocol-num">1</span><div>Compare reimbursement against acquisition cost and expected DIR.</div></div><div class="protocol-step"><span class="protocol-num">2</span><div>If below cost, evaluate MAC appeal, alternative NDC, or prescriber alternative.</div></div><div class="protocol-step"><span class="protocol-num">3</span><div>Document decision if dispensing at a loss to preserve access.</div></div></div></div></div>`;

  function openNoteModal(patientId, type) {
    const p = Store.findPatient(patientId); if (!p) return;
    const body = `<p class="muted">Add a fictional ${esc(type).toLowerCase()} note for <b>${p.first} ${p.last}</b>.</p><label class="field">Note type<select id="v3NoteType"><option>${esc(type)}</option><option>Prescriber call</option><option>Patient counseling</option><option>Adherence outreach</option><option>Insurance follow-up</option></select></label><label class="field" style="margin-top:10px">Note<textarea id="v3NoteText" rows="5" placeholder="Example: Prescriber contacted; patient counseled; follow-up scheduled."></textarea></label>`;
    const footer = `<button class="btn" id="v3NoteCancel">Cancel</button><button class="btn primary" id="v3NoteSave">Save note</button>`;
    const m = openModal({ title: "Document care note", body, footer, size: "lg" });
    $("#v3NoteCancel").onclick = m.close;
    $("#v3NoteSave").onclick = () => { addNote(patientId, $("#v3NoteType").value, $("#v3NoteText").value); m.close(); };
  }

  function patientModal(patientId) {
    const p = Store.findPatient(patientId); if (!p) return;
    const meds = Store.prescriptions.filter(r => r.patientId === p.id).map(r => { const d = Store.findDrug(r.drugId); return `<tr><td>${r.id}</td><td>${d.name} ${d.strength}</td><td>${r.status}</td><td>${r.pdc ? Math.round(r.pdc * 100) + "%" : "—"}</td></tr>`; }).join("");
    const patientNotes = notes().filter(n => n.patientId === p.id).map(n => `<div class="note-item"><b>${esc(n.type)}</b><div>${esc(n.text)}</div><div class="muted small">${fmtDate(n.date)} · ${esc(n.by)}</div></div>`).join("") || `<div class="empty">No notes yet.</div>`;
    openModal({ title: `${p.first} ${p.last} · care profile`, size: "lg", body: `<dl class="kvs"><dt>Insurance</dt><dd>${esc(p.insurance)}</dd><dt>Allergies</dt><dd>${p.allergies.join(", ") || "none documented"}</dd><dt>Conditions</dt><dd>${p.conditions.join(", ")}</dd><dt>Notes</dt><dd>${esc(p.notes || "—")}</dd></dl><h3>Medication profile</h3><div class="table-wrap"><table><thead><tr><th>Rx</th><th>Drug</th><th>Status</th><th>PDC</th></tr></thead><tbody>${meds}</tbody></table></div><h3 style="margin-top:14px">Care notes</h3><div class="note-list">${patientNotes}</div>`, footer: `<button class="btn" onclick="document.getElementById('modalRoot').innerHTML=''">Close</button><button class="btn primary" id="addProfileNote">Add note</button>` });
    $("#addProfileNote").onclick = () => { document.getElementById("modalRoot").innerHTML = ""; openNoteModal(patientId, "Care plan"); };
  }

  function printBrief() {
    const { active, rejected, underwater, atRisk } = kpis();
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>PharmaDesk V3 Owner Brief</title><style>body{font-family:Arial;margin:32px;color:#16202b}h1{color:#0a5f54}li{margin:7px 0}</style></head><body><h1>PharmaDesk V3 Owner Brief</h1><p><b>Generated:</b> ${fmtDate(TODAY)} · DEMO DATA</p><ul><li>Open exceptions: ${active.length}</li><li>Rejected claims: ${rejected}</li><li>Underwater fills: ${underwater.length}</li><li>Audit exposure: ${money(atRisk)}</li></ul><h2>Top work</h2><ol>${active.slice(0, 10).map(t => `<li><b>${esc(t.title)}</b> — ${esc(t.action)}</li>`).join("")}</ol></body></html>`;
    downloadFile("pharmadesk-v3-owner-brief.html", html, "text/html");
    toast("Owner brief downloaded");
  }

  const baseRender = render;
  render = function () { baseRender(); wireV3(); };

  function wireV3() {
    document.querySelectorAll("[data-task-done]").forEach(b => b.onclick = () => toggleDone(b.dataset.taskDone));
    document.querySelectorAll("[data-note-patient]").forEach(b => b.onclick = e => { e.stopPropagation(); openNoteModal(b.dataset.notePatient, b.dataset.noteType || "Care note"); });
    document.querySelectorAll("[data-open-patient]").forEach(c => c.onclick = () => patientModal(c.dataset.openPatient));
    document.querySelectorAll("[data-claim-action]").forEach(b => b.onclick = () => { const [id, status] = b.dataset.claimAction.split(":"); setClaimAction(id, status); });
    document.querySelectorAll("[data-order]").forEach(b => b.onclick = () => { const [id, qty] = b.dataset.order.split(":"); placeOrder(id, Number(qty)); });
    document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => toggleClose(b.dataset.close));
    const pb = document.getElementById("printBrief"); if (pb) pb.onclick = printBrief;
    const reset = document.getElementById("resetData");
    if (reset && !reset.dataset.v3Reset) {
      reset.dataset.v3Reset = "1";
      reset.onclick = () => {
        if (confirm("Restore source demo data and clear V3 workflow notes/statuses?")) {
          Store.reset();
          Object.values(KEYS).forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
          toast("V3 demo reset");
          render();
        }
      };
    }
  }

  try { render(); } catch (err) { console.error("V3 failed", err); }
})();

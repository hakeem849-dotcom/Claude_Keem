/* ============================================================
   PharmaDesk — application logic & views (vanilla JS)
   ============================================================ */

/* ---------- tiny helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const money = n => "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const TODAY = new Date("2026-06-13T12:00:00");

function age(dob) {
  const d = new Date(dob);
  let a = TODAY.getFullYear() - d.getFullYear();
  const m = TODAY.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && TODAY.getDate() < d.getDate())) a--;
  return a;
}
function daysUntil(dateStr) {
  return Math.round((new Date(dateStr) - TODAY) / 86400000);
}
function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function toast(msg, type = "ok") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  const icon = { ok: "✓", warn: "⚠", err: "✕" }[type] || "•";
  t.innerHTML = `<span>${icon}</span><span>${escapeHtml(msg)}</span>`;
  $("#toastRoot").appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; }, 2600);
  setTimeout(() => t.remove(), 3000);
}

/* ---------- modal ---------- */
function openModal({ title, body, footer, size = "" }) {
  const root = $("#modalRoot");
  root.innerHTML = `
    <div class="modal-backdrop" id="backdrop">
      <div class="modal ${size}" role="dialog" aria-modal="true">
        <div class="modal-head"><h3>${title}</h3><button class="x-btn" id="modalX">×</button></div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ""}
      </div>
    </div>`;
  const close = () => { root.innerHTML = ""; };
  $("#modalX").onclick = close;
  $("#backdrop").onclick = e => { if (e.target.id === "backdrop") close(); };
  return { close, root };
}

/* ---------- clinical helpers ---------- */
const STATUS_FLOW = ["intake", "verification", "pmp-review", "filling", "ready", "dispensed"];
const STATUS_META = {
  intake: { label: "Intake", badge: "gray" },
  verification: { label: "DUR / Verification", badge: "blue" },
  "pmp-review": { label: "PMP Review", badge: "purple" },
  filling: { label: "Filling", badge: "amber" },
  ready: { label: "Ready for pickup", badge: "green" },
  dispensed: { label: "Dispensed", badge: "gray" }
};

// returns interaction findings for a list of drug objects
function checkInteractions(drugs) {
  const rules = Store.interactionRules;
  const findings = [];
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const c1 = drugs[i].class, c2 = drugs[j].class;
      const r = rules.find(r =>
        (matchClass(r.a, c1) && matchClass(r.b, c2)) ||
        (matchClass(r.a, c2) && matchClass(r.b, c1)));
      if (r) findings.push({ pair: [drugs[i], drugs[j]], rule: r });
    }
  }
  return findings;
}
function matchClass(ruleClass, drugClass) {
  // loose matching: "NSAID" should match "NSAIDs", class strings contain keyword
  const rc = ruleClass.toLowerCase();
  const dc = drugClass.toLowerCase();
  return dc.includes(rc) || rc.includes(dc.split(" ")[0]);
}

// allergy cross-check between a patient and a drug
function allergyConflict(patient, drug) {
  if (!patient || !patient.allergies) return null;
  const map = {
    "Penicillin": ["penicillin"],
    "Sulfa": ["sulfa", "sulfamethoxazole"],
    "Aspirin": ["aspirin", "salicylate"],
    "NSAIDs": ["nsaid", "ibuprofen", "naproxen"],
    "Codeine": ["codeine", "opioid"]
  };
  for (const al of patient.allergies) {
    const keys = map[al] || [al.toLowerCase()];
    const hay = (drug.name + " " + drug.class).toLowerCase();
    if (keys.some(k => hay.includes(k))) return al;
  }
  return null;
}

function patientMeds(patientId) {
  return Store.prescriptions
    .filter(rx => rx.patientId === patientId && rx.status !== "dispensed")
    .concat(Store.prescriptions.filter(rx => rx.patientId === patientId && rx.status === "dispensed"))
    .map(rx => ({ rx, drug: Store.findDrug(rx.drugId) }));
}
// active drug objects for a patient (for interaction scan)
function patientActiveDrugs(patientId) {
  const seen = new Set();
  const out = [];
  Store.prescriptions.filter(rx => rx.patientId === patientId).forEach(rx => {
    if (!seen.has(rx.drugId)) { seen.add(rx.drugId); out.push(Store.findDrug(rx.drugId)); }
  });
  return out.filter(Boolean);
}

/* ============================================================
   VIEWS
   ============================================================ */
const Views = {};

/* ---------- Dashboard ---------- */
Views.dashboard = () => {
  const rx = Store.prescriptions;
  const queue = rx.filter(r => r.status !== "dispensed");
  const ready = rx.filter(r => r.status === "ready").length;
  const lowStock = Store.inventory.filter(d => d.stock <= d.reorder);
  const expiringSoon = Store.inventory.filter(d => daysUntil(d.expiry) <= 120);
  const dispensedThisMonth = rx.filter(r => r.status === "dispensed");
  const revenue = dispensedThisMonth.reduce((s, r) => s + r.qty * (Store.findDrug(r.drugId)?.price || 0), 0);

  // interaction / allergy alerts across the active queue
  const alerts = [];
  Store.patients.forEach(p => {
    const drugs = patientActiveDrugs(p.id);
    checkInteractions(drugs).forEach(f => alerts.push({ type: "interaction", patient: p, f }));
    drugs.forEach(d => { const a = allergyConflict(p, d); if (a) alerts.push({ type: "allergy", patient: p, drug: d, allergen: a }); });
  });

  // Survival signals — the economics & red tape that close pharmacies
  const econ = Store.claims.filter(c => c.status !== "rejected").map(claimEconomics);
  const netAfterDir = econ.reduce((s, e) => s + e.net, 0);
  const underwater = econ.filter(e => e.underwater);
  const dirTotal = econ.reduce((s, e) => s + e.dirFee, 0);
  const openAudits = Store.audits.filter(a => a.status !== "closed");
  const auditAtRisk = openAudits.reduce((s, a) => s + (a.amountAtRisk - a.recouped), 0);
  const credSoon = Store.credentials.filter(c => daysUntil(c.expires) <= 60);
  const credExpired = Store.credentials.filter(c => daysUntil(c.expires) < 0);

  return `
    <div class="stats">
      ${statCard("Rx in queue", queue.length, "℞", `${ready} ready for pickup`, "green")}
      ${statCard("Low stock items", lowStock.length, "📦", lowStock.length ? "Reorder needed" : "Stock healthy", lowStock.length ? "amber" : "green")}
      ${statCard("Clinical alerts", alerts.length, "⚠️", "Interactions & allergies", alerts.length ? "red" : "green")}
      ${statCard("Revenue (dispensed)", money(revenue), "💵", `${dispensedThisMonth.length} scripts`, "blue")}
    </div>

    <div class="section-head"><h2 style="font-size:14px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em">Business health · survival signals</h2></div>
    <div class="stats">
      ${statCard("Net after cost + DIR", (netAfterDir < 0 ? "−" : "") + money(Math.abs(netAfterDir)), "💸", `${money(dirTotal)} DIR drag`, netAfterDir >= 0 ? "green" : "red")}
      ${statCard("Underwater claims", underwater.length, "🔻", "dispensed below cost", underwater.length ? "red" : "green")}
      ${statCard("$ at risk in audits", money(auditAtRisk), "📋", `${openAudits.length} open audit(s)`, auditAtRisk ? "amber" : "green")}
      ${statCard("Compliance due ≤60d", credSoon.length, "📂", credExpired.length ? `${credExpired.length} expired!` : "renewals", credExpired.length ? "red" : credSoon.length ? "amber" : "green")}
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="section-head"><h2>Dispensing queue</h2>
          <button class="btn sm" data-go="prescriptions">View all →</button></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Rx</th><th>Patient</th><th>Drug</th><th>Status</th></tr></thead>
          <tbody>
            ${queue.slice(0, 6).map(r => {
              const p = Store.findPatient(r.patientId), d = Store.findDrug(r.drugId);
              const m = STATUS_META[r.status];
              return `<tr><td><b>${r.id}</b></td><td>${p.first} ${p.last}</td>
                <td>${d.name} ${d.strength}</td>
                <td><span class="badge ${m.badge}">${m.label}</span></td></tr>`;
            }).join("")}
          </tbody></table></div>
      </div>

      <div class="card">
        <div class="section-head"><h2>Clinical alerts</h2>
          <button class="btn sm" data-go="interactions">Open checker →</button></div>
        ${alerts.length === 0 ? `<div class="empty">No active interaction or allergy alerts 🎉</div>` :
          alerts.slice(0, 6).map(a => a.type === "interaction"
            ? `<div class="alert ${a.f.rule.severity === "major" ? "red" : "warn"}" style="margin-bottom:10px">
                 <span>${a.f.rule.severity === "major" ? "🛑" : "⚠️"}</span>
                 <div><b>${a.patient.first} ${a.patient.last}</b> — ${a.f.pair[0].name} + ${a.f.pair[1].name}
                 <div class="small">${escapeHtml(a.f.rule.effect)}</div></div></div>`
            : `<div class="alert red" style="margin-bottom:10px"><span>🚫</span>
                 <div><b>${a.patient.first} ${a.patient.last}</b> — allergy to ${a.allergen}
                 <div class="small">Prescribed ${a.drug.name} (${a.drug.class})</div></div></div>`
          ).join("")}
      </div>
    </div>

    <div class="grid-2" style="margin-top:16px">
      <div class="card">
        <div class="section-head"><h2>Inventory attention</h2>
          <button class="btn sm" data-go="inventory">Manage →</button></div>
        ${[...lowStock.map(d => ({ d, kind: "low" })), ...expiringSoon.map(d => ({ d, kind: "exp" }))]
          .slice(0, 6).map(({ d, kind }) => kind === "low"
            ? `<div class="spread" style="padding:8px 0;border-bottom:1px solid var(--line)">
                 <div>${d.name} ${d.strength} <span class="muted small">· ${d.stock} on hand</span></div>
                 <span class="badge amber">Reorder (≤${d.reorder})</span></div>`
            : `<div class="spread" style="padding:8px 0;border-bottom:1px solid var(--line)">
                 <div>${d.name} ${d.strength} <span class="muted small">· exp ${fmtDate(d.expiry)}</span></div>
                 <span class="badge ${daysUntil(d.expiry) < 60 ? "red" : "amber"}">${daysUntil(d.expiry)}d to expiry</span></div>`
          ).join("") || `<div class="empty">Everything looks good.</div>`}
      </div>

      <div class="card">
        <div class="section-head"><h2>Today at a glance</h2></div>
        <dl class="kvs">
          <dt>Date</dt><dd>${fmtDate(TODAY)}</dd>
          <dt>Pharmacist</dt><dd>K. Adeyemi, PharmD</dd>
          <dt>Active patients</dt><dd>${Store.patients.length}</dd>
          <dt>Formulary items</dt><dd>${Store.inventory.length}</dd>
          <dt>Controlled scripts (mo.)</dt><dd>${dispensedThisMonth.filter(r => Store.findDrug(r.drugId)?.schedule > 0).length} dispensed</dd>
          <dt>Rejected claims</dt><dd>${Store.claims.filter(c => c.status === "rejected").length} to resolve</dd>
          <dt>Underwater claims</dt><dd>${underwater.length} below cost</dd>
          <dt>Open audits</dt><dd>${openAudits.length} · ${money(auditAtRisk)} at risk</dd>
          <dt>Credentials due</dt><dd>${credSoon.length} ≤60 days${credExpired.length ? ` (${credExpired.length} expired)` : ""}</dd>
          <dt>Open MTM tasks</dt><dd>${Store.mtmTasks.filter(t => !t.done).length}</dd>
          <dt>Immunizations on file</dt><dd>${Store.immunizations.length}</dd>
        </dl>
      </div>
    </div>`;
};

function statCard(label, value, ico, delta, color) {
  return `<div class="stat"><span class="ico">${ico}</span>
    <div class="label">${label}</div>
    <div class="value">${value}</div>
    <div class="delta"><span class="badge ${color}">${delta}</span></div></div>`;
}

/* ---------- Prescriptions / Dispensing queue ---------- */
Views.prescriptions = () => {
  const rows = Store.prescriptions.map(r => {
    const p = Store.findPatient(r.patientId), d = Store.findDrug(r.drugId);
    const m = STATUS_META[r.status];
    const controlled = d.schedule > 0;
    const next = nextStatus(r.status);
    return `<tr>
      <td><b>${r.id}</b>${controlled ? ` <span class="badge red" title="Schedule ${d.schedule}">C-${d.schedule}</span>` : ""}</td>
      <td>${p.first} ${p.last}<div class="muted small">${p.insurance}</div></td>
      <td>${d.name} ${d.strength}<div class="muted small">${escapeHtml(r.sig)}</div></td>
      <td>${r.qty} <span class="muted small">/ ${r.daysSupply}d</span></td>
      <td>${r.refills} left</td>
      <td><span class="badge ${m.badge}">${m.label}</span></td>
      <td style="text-align:right;white-space:nowrap">
        ${next ? `<button class="btn sm primary" data-advance="${r.id}">${next === "dispensed" ? "Dispense" : "Advance →"}</button>` :
          `<span class="muted small">${fmtDate(r.dispensedOn)}</span>`}
        <button class="btn sm" data-rx="${r.id}">Details</button>
      </td></tr>`;
  }).join("");

  return `
    <div class="card">
      <div class="section-head">
        <h2>Dispensing queue</h2>
        <button class="btn primary" id="newRx">+ New prescription</button>
      </div>
      <div class="alert info" style="margin-bottom:14px">
        <span>ℹ️</span><div>Workflow: <b>Intake → DUR/Verification → PMP Review → Filling → Ready → Dispensed</b>.
        Drug Utilization Review (interactions & allergies) runs automatically before you advance.</div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Rx</th><th>Patient</th><th>Drug & Sig</th><th>Qty</th><th>Refills</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>`;
};

function nextStatus(status) {
  const i = STATUS_FLOW.indexOf(status);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
}

function advanceRx(rxId) {
  const rx = Store.prescriptions.find(r => r.id === rxId);
  if (!rx) return;
  const next = nextStatus(rx.status);
  if (!next) return;
  const drug = Store.findDrug(rx.drugId);
  const patient = Store.findPatient(rx.patientId);

  // DUR gate before leaving verification
  if (rx.status === "verification" || rx.status === "intake") {
    const drugs = patientActiveDrugs(rx.patientId);
    const findings = checkInteractions(drugs);
    const allergen = allergyConflict(patient, drug);
    if (findings.length || allergen) {
      return showDUR(rx, findings, allergen, () => commitAdvance(rx, next));
    }
  }
  commitAdvance(rx, next);
}

function commitAdvance(rx, next) {
  const drug = Store.findDrug(rx.drugId);
  if (next === "dispensed") {
    if (drug.stock < rx.qty) { toast(`Not enough ${drug.name} on hand (need ${rx.qty}, have ${drug.stock})`, "err"); return; }
    drug.stock -= rx.qty;
    rx.dispensedOn = TODAY.toISOString().slice(0, 10);
    if (rx.refills > 0) rx.refills -= 1;
  }
  rx.status = next;
  Store.commit();
  toast(next === "dispensed" ? `Dispensed ${drug.name} — inventory updated` : `${rx.id} → ${STATUS_META[next].label}`);
  render();
}

function showDUR(rx, findings, allergen, onProceed) {
  const drug = Store.findDrug(rx.drugId);
  const patient = Store.findPatient(rx.patientId);
  const body = `
    <div class="alert red" style="margin-bottom:14px"><span>🛑</span>
      <div><b>Drug Utilization Review flagged ${rx.id}</b><br>
      ${patient.first} ${patient.last} · ${drug.name} ${drug.strength}</div></div>
    ${allergen ? `<div class="alert red" style="margin-bottom:10px"><span>🚫</span>
      <div><b>Allergy alert:</b> patient is allergic to <b>${allergen}</b>, which conflicts with ${drug.name} (${drug.class}).</div></div>` : ""}
    ${findings.map(f => `<div class="alert ${f.rule.severity === "major" ? "red" : "warn"}" style="margin-bottom:10px">
      <span>${f.rule.severity === "major" ? "🛑" : "⚠️"}</span>
      <div><b>${f.rule.severity.toUpperCase()}:</b> ${f.pair[0].name} + ${f.pair[1].name}
      <div class="small">${escapeHtml(f.rule.effect)}</div>
      <div class="small"><b>Action:</b> ${escapeHtml(f.rule.action)}</div></div></div>`).join("")}
    <p class="muted small">Document your clinical judgment before overriding. Contact prescriber if appropriate.</p>`;
  const footer = `<button class="btn" id="durCancel">Cancel</button>
    <button class="btn danger" id="durOverride">Override & proceed</button>`;
  const m = openModal({ title: "Clinical review required", body, footer });
  $("#durCancel").onclick = m.close;
  $("#durOverride").onclick = () => { m.close(); onProceed(); toast("Override documented", "warn"); };
}

function rxDetails(rxId) {
  const rx = Store.prescriptions.find(r => r.id === rxId);
  const p = Store.findPatient(rx.patientId), d = Store.findDrug(rx.drugId);
  const m = STATUS_META[rx.status];
  const body = `
    <dl class="kvs">
      <dt>Prescription</dt><dd>${rx.id}</dd>
      <dt>Status</dt><dd><span class="badge ${m.badge}">${m.label}</span></dd>
      <dt>Patient</dt><dd>${p.first} ${p.last} (${age(p.dob)} y/o ${p.sex})</dd>
      <dt>Drug</dt><dd>${d.name} ${d.strength} ${d.form}${d.schedule ? ` · <span class="badge red">C-${d.schedule}</span>` : ""}</dd>
      <dt>NDC</dt><dd>${d.ndc}</dd>
      <dt>Sig</dt><dd>${escapeHtml(rx.sig)}</dd>
      <dt>Quantity</dt><dd>${rx.qty} (${rx.daysSupply}-day supply)</dd>
      <dt>Refills</dt><dd>${rx.refills} remaining</dd>
      <dt>Prescriber</dt><dd>${rx.prescriber}</dd>
      <dt>Written</dt><dd>${fmtDate(rx.written)}</dd>
      <dt>Patient pay</dt><dd>${money(rx.qty * d.price)}</dd>
      ${rx.dispensedOn ? `<dt>Dispensed</dt><dd>${fmtDate(rx.dispensedOn)}</dd>` : ""}
    </dl>`;
  openModal({ title: `Prescription ${rx.id}`, body, footer: `<button class="btn" onclick="document.getElementById('modalRoot').innerHTML=''">Close</button>` });
}

function newRxForm() {
  const patientOpts = Store.patients.map(p => `<option value="${p.id}">${p.first} ${p.last}</option>`).join("");
  const drugOpts = Store.inventory.map(d => `<option value="${d.id}">${d.name} ${d.strength}</option>`).join("");
  const body = `
    <form id="rxForm" class="form-grid">
      <label class="field">Patient<select name="patientId" required>${patientOpts}</select></label>
      <label class="field">Drug<select name="drugId" required>${drugOpts}</select></label>
      <label class="field">Sig (directions)<input name="sig" placeholder="Take 1 tablet by mouth daily" required></label>
      <label class="field">Prescriber<input name="prescriber" placeholder="Dr. Smith" required></label>
      <label class="field">Quantity<input name="qty" type="number" min="1" value="30" required></label>
      <label class="field">Days supply<input name="daysSupply" type="number" min="1" value="30" required></label>
      <label class="field">Refills<input name="refills" type="number" min="0" value="0" required></label>
      <label class="field">Date written<input name="written" type="date" value="${TODAY.toISOString().slice(0,10)}" required></label>
    </form>`;
  const footer = `<button class="btn" id="rxCancel">Cancel</button><button class="btn primary" id="rxSave">Add to queue</button>`;
  const m = openModal({ title: "New prescription", body, footer, size: "lg" });
  $("#rxCancel").onclick = m.close;
  $("#rxSave").onclick = () => {
    const f = $("#rxForm");
    if (!f.reportValidity()) return;
    const fd = Object.fromEntries(new FormData(f));
    const id = "RX-" + Math.floor(50240 + Math.random() * 9000);
    Store.prescriptions.unshift({
      id, patientId: fd.patientId, drugId: fd.drugId, sig: fd.sig, prescriber: fd.prescriber,
      qty: +fd.qty, daysSupply: +fd.daysSupply, refills: +fd.refills, written: fd.written, status: "intake"
    });
    Store.commit();
    m.close();
    toast(`${id} added to queue`);
    render();
  };
}

/* ---------- Patients ---------- */
Views.patients = (q = "") => {
  const list = Store.patients.filter(p =>
    (p.first + " " + p.last).toLowerCase().includes(q.toLowerCase()));
  const rows = list.map(p => {
    const meds = Store.prescriptions.filter(rx => rx.patientId === p.id && rx.status !== "dispensed").length;
    return `<tr>
      <td><b>${p.first} ${p.last}</b><div class="muted small">${p.id}</div></td>
      <td>${age(p.dob)} <span class="muted small">${p.sex}</span></td>
      <td>${p.insurance}</td>
      <td>${p.allergies.length ? p.allergies.map(a => `<span class="badge red">${a}</span>`).join(" ") : `<span class="muted small">NKDA</span>`}</td>
      <td>${meds} active</td>
      <td style="text-align:right"><button class="btn sm" data-patient="${p.id}">Open chart</button></td>
    </tr>`;
  }).join("");
  return `
    <div class="card">
      <div class="section-head"><h2>Patients (${list.length})</h2>
        <input class="search" id="patientSearch" placeholder="Filter by name…" value="${escapeHtml(q)}"></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Age</th><th>Coverage</th><th>Allergies</th><th>Meds</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6" class="empty">No patients match.</td></tr>`}</tbody>
      </table></div>
    </div>`;
};

function patientChart(id) {
  const p = Store.findPatient(id);
  const meds = patientMeds(id);
  const drugs = patientActiveDrugs(id);
  const findings = checkInteractions(drugs);
  const allergyHits = drugs.map(d => ({ d, a: allergyConflict(p, d) })).filter(x => x.a);
  const imm = Store.immunizations.filter(i => i.patientId === id);

  const body = `
    <dl class="kvs" style="margin-bottom:18px">
      <dt>MRN</dt><dd>${p.id}</dd>
      <dt>DOB</dt><dd>${fmtDate(p.dob)} (${age(p.dob)} y/o ${p.sex})</dd>
      <dt>Phone</dt><dd>${p.phone}</dd>
      <dt>Coverage</dt><dd>${p.insurance}</dd>
      <dt>Conditions</dt><dd>${p.conditions.join(", ") || "—"}</dd>
      <dt>Allergies</dt><dd>${p.allergies.length ? p.allergies.map(a => `<span class="badge red">${a}</span>`).join(" ") : "NKDA"}</dd>
      ${p.notes ? `<dt>Notes</dt><dd>${escapeHtml(p.notes)}</dd>` : ""}
    </dl>

    ${(findings.length || allergyHits.length) ? `
      <h4 style="margin:4px 0 8px">⚠️ Clinical alerts</h4>
      ${allergyHits.map(x => `<div class="alert red" style="margin-bottom:8px"><span>🚫</span>
        <div>Allergy to <b>${x.a}</b> vs ${x.d.name} (${x.d.class})</div></div>`).join("")}
      ${findings.map(f => `<div class="alert ${f.rule.severity === "major" ? "red" : "warn"}" style="margin-bottom:8px">
        <span>${f.rule.severity === "major" ? "🛑" : "⚠️"}</span>
        <div><b>${f.rule.severity}</b>: ${f.pair[0].name} + ${f.pair[1].name}<div class="small">${escapeHtml(f.rule.effect)}</div></div></div>`).join("")}
    ` : `<div class="alert info" style="margin-bottom:14px"><span>✓</span><div>No interaction or allergy alerts on current medications.</div></div>`}

    <h4 style="margin:14px 0 8px">Medication profile</h4>
    <div class="table-wrap"><table>
      <thead><tr><th>Drug</th><th>Sig</th><th>Status</th><th>Refills</th></tr></thead>
      <tbody>${meds.map(({ rx, drug }) => {
        const m = STATUS_META[rx.status];
        return `<tr><td>${drug.name} ${drug.strength}</td><td class="small">${escapeHtml(rx.sig)}</td>
          <td><span class="badge ${m.badge}">${m.label}</span></td><td>${rx.refills}</td></tr>`;
      }).join("") || `<tr><td colspan="4" class="empty">No medications.</td></tr>`}</tbody>
    </table></div>

    <h4 style="margin:18px 0 8px">Immunizations</h4>
    ${imm.length ? imm.map(i => `<div class="spread" style="padding:6px 0;border-bottom:1px solid var(--line)">
      <div>${i.vaccine}</div><span class="muted small">${fmtDate(i.date)} · ${i.site}</span></div>`).join("")
      : `<div class="muted small">None on file.</div>`}
  `;
  openModal({ title: `${p.first} ${p.last}`, body, size: "lg",
    footer: `<button class="btn" onclick="document.getElementById('modalRoot').innerHTML=''">Close</button>` });
}

/* ---------- Inventory ---------- */
Views.inventory = (q = "") => {
  const list = Store.inventory.filter(d =>
    (d.name + d.class + d.ndc).toLowerCase().includes(q.toLowerCase()));
  const totalValue = Store.inventory.reduce((s, d) => s + d.stock * d.cost, 0);
  const rows = list.map(d => {
    const low = d.stock <= d.reorder;
    const exp = daysUntil(d.expiry);
    return `<tr>
      <td><b>${d.name}</b> ${d.strength}<div class="muted small">${d.class} · NDC ${d.ndc}</div></td>
      <td>${d.form}${d.schedule ? ` <span class="badge red">C-${d.schedule}</span>` : ""}</td>
      <td>${d.stock}${low ? ` <span class="badge amber">low</span>` : ""}
        <div class="progress" style="margin-top:4px;width:90px"><span style="width:${Math.min(100, d.stock / (d.reorder * 2) * 100)}%"></span></div></td>
      <td>${d.reorder}</td>
      <td>${fmtDate(d.expiry)}${exp <= 120 ? ` <span class="badge ${exp < 60 ? "red" : "amber"}">${exp}d</span>` : ""}</td>
      <td>${money(d.price)}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn sm" data-receive="${d.id}">Receive</button>
        ${low ? `<button class="btn sm primary" data-reorder="${d.id}">Reorder</button>` : ""}
      </td></tr>`;
  }).join("");
  return `
    <div class="stats" style="grid-template-columns:repeat(3,1fr)">
      ${statCard("Inventory value (cost)", money(totalValue), "💰", `${Store.inventory.length} items`, "blue")}
      ${statCard("Below reorder point", Store.inventory.filter(d => d.stock <= d.reorder).length, "📉", "Action needed", "amber")}
      ${statCard("Expiring ≤120 days", Store.inventory.filter(d => daysUntil(d.expiry) <= 120).length, "⏳", "Check shelves", "red")}
    </div>
    <div class="card">
      <div class="section-head"><h2>Formulary & stock</h2>
        <input class="search" id="invSearch" placeholder="Search drug, class, NDC…" value="${escapeHtml(q)}"></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Drug</th><th>Form</th><th>On hand</th><th>Reorder pt</th><th>Expiry</th><th>Price</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="7" class="empty">No items match.</td></tr>`}</tbody>
      </table></div>
    </div>`;
};

function receiveStock(drugId) {
  const d = Store.findDrug(drugId);
  const body = `<p>Receiving stock for <b>${d.name} ${d.strength}</b> (current: ${d.stock}).</p>
    <label class="field">Quantity received<input id="recQty" type="number" min="1" value="100"></label>`;
  const footer = `<button class="btn" id="recCancel">Cancel</button><button class="btn primary" id="recSave">Add to stock</button>`;
  const m = openModal({ title: "Receive inventory", body, footer });
  $("#recCancel").onclick = m.close;
  $("#recSave").onclick = () => {
    const qty = parseInt($("#recQty").value, 10);
    if (!qty || qty < 1) return;
    d.stock += qty; Store.commit(); m.close();
    toast(`Received ${qty} × ${d.name} (now ${d.stock})`);
    render();
  };
}
function reorder(drugId) {
  const d = Store.findDrug(drugId);
  const suggested = d.reorder * 2 - d.stock;
  d.stock += suggested; Store.commit();
  toast(`Reorder placed: +${suggested} ${d.name} received`);
  render();
}

/* ---------- Interaction checker ---------- */
Views.interactions = () => {
  const patientOpts = `<option value="">— choose patient —</option>` +
    Store.patients.map(p => `<option value="${p.id}">${p.first} ${p.last}</option>`).join("");
  const drugChecks = Store.inventory.map(d =>
    `<label class="badge gray" style="cursor:pointer;padding:6px 10px">
      <input type="checkbox" class="drugChk" value="${d.id}" style="margin-right:6px">${d.name} ${d.strength}</label>`).join(" ");
  return `
    <div class="grid-2">
      <div class="card">
        <div class="section-head"><h2>Screen a patient's profile</h2></div>
        <label class="field">Patient<select id="durPatient">${patientOpts}</select></label>
        <div id="patientDurResult" style="margin-top:14px"></div>
      </div>
      <div class="card">
        <div class="section-head"><h2>Ad-hoc drug interaction check</h2></div>
        <p class="muted small">Select two or more drugs to screen for interactions.</p>
        <div class="tag-list" style="margin:10px 0">${drugChecks}</div>
        <button class="btn primary" id="runCheck">Check interactions</button>
        <div id="adhocResult" style="margin-top:14px"></div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="section-head"><h2>Interaction knowledge base</h2></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Class A</th><th>Class B</th><th>Severity</th><th>Effect</th></tr></thead>
        <tbody>${Store.interactionRules.map(r => `<tr>
          <td>${r.a}</td><td>${r.b}</td>
          <td><span class="badge ${r.severity === "major" ? "red" : r.severity === "moderate" ? "amber" : "gray"}">${r.severity}</span></td>
          <td class="small">${escapeHtml(r.effect)}</td></tr>`).join("")}</tbody>
      </table></div>
    </div>`;
};

function renderFindings(findings, allergyHits = []) {
  if (!findings.length && !allergyHits.length)
    return `<div class="alert info"><span>✓</span><div>No interactions found in the knowledge base.</div></div>`;
  return allergyHits.map(x => `<div class="alert red" style="margin-bottom:8px"><span>🚫</span>
      <div>Allergy to <b>${x.a}</b> vs ${x.d.name}</div></div>`).join("") +
    findings.map(f => `<div class="alert ${f.rule.severity === "major" ? "red" : "warn"}" style="margin-bottom:8px">
      <span>${f.rule.severity === "major" ? "🛑" : "⚠️"}</span>
      <div><b>${f.rule.severity.toUpperCase()}:</b> ${f.pair[0].name} + ${f.pair[1].name}
      <div class="small">${escapeHtml(f.rule.effect)}</div>
      <div class="small"><b>Action:</b> ${escapeHtml(f.rule.action)}</div></div></div>`).join("");
}

/* ---------- Controlled substances log ---------- */
Views.controlled = () => {
  const controlled = Store.inventory.filter(d => d.schedule > 0);
  const dispensed = Store.prescriptions
    .filter(r => r.status === "dispensed" && Store.findDrug(r.drugId)?.schedule > 0)
    .sort((a, b) => (b.dispensedOn || "").localeCompare(a.dispensedOn || ""));
  return `
    <div class="alert info" style="margin-bottom:16px"><span>🔒</span>
      <div>Perpetual inventory for DEA scheduled drugs. All dispensing of C-II through C-V is logged here.
      Reconcile physical counts against this register regularly.</div></div>

    <div class="card" style="margin-bottom:16px">
      <div class="section-head"><h2>Scheduled drug stock</h2></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Drug</th><th>Schedule</th><th>On hand</th><th>NDC</th></tr></thead>
        <tbody>${controlled.map(d => `<tr>
          <td><b>${d.name}</b> ${d.strength}</td>
          <td><span class="badge red">C-${d.schedule}</span></td>
          <td>${d.stock}</td><td class="small">${d.ndc}</td></tr>`).join("")}</tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="section-head"><h2>Dispensing register</h2></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Rx</th><th>Patient</th><th>Drug</th><th>Sched.</th><th>Qty</th><th>Prescriber</th></tr></thead>
        <tbody>${dispensed.map(r => {
          const p = Store.findPatient(r.patientId), d = Store.findDrug(r.drugId);
          return `<tr><td>${fmtDate(r.dispensedOn)}</td><td><b>${r.id}</b></td>
            <td>${p.first} ${p.last}</td><td>${d.name} ${d.strength}</td>
            <td><span class="badge red">C-${d.schedule}</span></td><td>${r.qty}</td><td>${r.prescriber}</td></tr>`;
        }).join("") || `<tr><td colspan="7" class="empty">No controlled substances dispensed yet.</td></tr>`}</tbody>
      </table></div>
    </div>`;
};

/* ---------- Immunizations ---------- */
Views.immunizations = () => {
  const rows = [...Store.immunizations].sort((a, b) => b.date.localeCompare(a.date)).map(i => {
    const p = Store.findPatient(i.patientId);
    return `<tr><td>${fmtDate(i.date)}</td><td>${p.first} ${p.last}</td>
      <td>${i.vaccine}</td><td>${i.lot}</td><td>${i.site}</td></tr>`;
  }).join("");
  return `
    <div class="card">
      <div class="section-head"><h2>Immunization records</h2>
        <button class="btn primary" id="newImm">+ Record immunization</button></div>
      <div class="alert info" style="margin-bottom:14px"><span>💉</span>
        <div>As an immunizing pharmacist, document vaccine, lot, site and date for each administration and report to the state IIS registry.</div></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Patient</th><th>Vaccine</th><th>Lot #</th><th>Site</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5" class="empty">No immunizations recorded.</td></tr>`}</tbody>
      </table></div>
    </div>`;
};

function newImmForm() {
  const patientOpts = Store.patients.map(p => `<option value="${p.id}">${p.first} ${p.last}</option>`).join("");
  const vaccines = ["Influenza (quadrivalent)", "COVID-19 (2025-26 formula)", "Pneumococcal (PCV20)",
    "Shingles (Shingrix)", "Tdap", "Hepatitis B", "RSV"];
  const body = `<form id="immForm" class="form-grid">
    <label class="field">Patient<select name="patientId">${patientOpts}</select></label>
    <label class="field">Vaccine<select name="vaccine">${vaccines.map(v => `<option>${v}</option>`).join("")}</select></label>
    <label class="field">Lot #<input name="lot" placeholder="LOT-0000" required></label>
    <label class="field">Site<select name="site"><option>L deltoid</option><option>R deltoid</option></select></label>
    <label class="field">Date<input name="date" type="date" value="${TODAY.toISOString().slice(0,10)}"></label>
  </form>`;
  const footer = `<button class="btn" id="immCancel">Cancel</button><button class="btn primary" id="immSave">Save record</button>`;
  const m = openModal({ title: "Record immunization", body, footer, size: "lg" });
  $("#immCancel").onclick = m.close;
  $("#immSave").onclick = () => {
    const f = $("#immForm");
    if (!f.reportValidity()) return;
    const fd = Object.fromEntries(new FormData(f));
    Store.immunizations.unshift({ id: "IZ-" + Math.floor(7100 + Math.random() * 900), ...fd });
    Store.commit(); m.close(); toast("Immunization recorded"); render();
  };
}

/* ---------- Business reports ---------- */
Views.reports = () => {
  const dispensed = Store.prescriptions.filter(r => r.status === "dispensed");
  const revenue = dispensed.reduce((s, r) => s + r.qty * (Store.findDrug(r.drugId)?.price || 0), 0);
  const cogs = dispensed.reduce((s, r) => s + r.qty * (Store.findDrug(r.drugId)?.cost || 0), 0);
  const margin = revenue ? ((revenue - cogs) / revenue * 100) : 0;

  // top drugs by script count across all rx
  const counts = {};
  Store.prescriptions.forEach(r => { counts[r.drugId] = (counts[r.drugId] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([id, n]) => ({ drug: Store.findDrug(id), n }));
  const maxN = Math.max(...top.map(t => t.n), 1);

  // payer mix
  const payers = {};
  Store.patients.forEach(p => {
    const key = p.insurance.includes("Medicare") ? "Medicare" :
      p.insurance.toLowerCase().includes("cash") ? "Cash/Self-pay" : "Commercial";
    payers[key] = (payers[key] || 0) + 1;
  });

  return `
    <div class="stats" style="grid-template-columns:repeat(4,1fr)">
      ${statCard("Revenue", money(revenue), "💵", "dispensed scripts", "green")}
      ${statCard("Cost of goods", money(cogs), "📦", "acquisition cost", "gray")}
      ${statCard("Gross profit", money(revenue - cogs), "📈", `${margin.toFixed(1)}% margin`, "blue")}
      ${statCard("Scripts dispensed", dispensed.length, "℞", "this period", "purple")}
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="section-head"><h2>Top medications (by scripts)</h2></div>
        <div class="bars">${top.map(t => `<div class="bar-col">
          <div class="bar" style="height:${t.n / maxN * 130}px" title="${t.n} scripts"></div>
          <div class="bar-lbl">${t.drug.name.split(" ")[0]}</div></div>`).join("")}</div>
      </div>
      <div class="card">
        <div class="section-head"><h2>Payer mix</h2></div>
        ${Object.entries(payers).map(([k, v]) => {
          const pct = Math.round(v / Store.patients.length * 100);
          return `<div style="margin-bottom:12px"><div class="spread"><span>${k}</span><span class="muted">${v} patients · ${pct}%</span></div>
            <div class="progress" style="margin-top:4px"><span style="width:${pct}%"></span></div></div>`;
        }).join("")}
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="section-head"><h2>Operational summary</h2></div>
      <dl class="kvs">
        <dt>Active queue</dt><dd>${Store.prescriptions.filter(r => r.status !== "dispensed").length} prescriptions</dd>
        <dt>Avg. patient pay / script</dt><dd>${money(dispensed.length ? revenue / dispensed.length : 0)}</dd>
        <dt>Inventory on hand (cost)</dt><dd>${money(Store.inventory.reduce((s, d) => s + d.stock * d.cost, 0))}</dd>
        <dt>Controlled scripts dispensed</dt><dd>${dispensed.filter(r => Store.findDrug(r.drugId)?.schedule > 0).length}</dd>
        <dt>Immunizations administered</dt><dd>${Store.immunizations.length}</dd>
        ${(() => {
          const econ = Store.claims.filter(c => c.status !== "rejected").map(claimEconomics);
          const dir = econ.reduce((s, e) => s + e.dirFee, 0);
          const netDir = econ.reduce((s, e) => s + e.net, 0);
          const under = econ.filter(e => e.underwater).length;
          return `<dt>DIR fee clawbacks</dt><dd style="color:var(--danger)">−${money(dir)}</dd>
            <dt>Net margin after DIR</dt><dd style="color:var(--${netDir >= 0 ? "ok" : "danger"})">${netDir < 0 ? "−" : ""}${money(Math.abs(netDir))}</dd>
            <dt>Claims dispensed below cost</dt><dd>${under}</dd>`;
        })()}
      </dl>
    </div>`;
};

/* ---------- Claims & billing ---------- */
Views.claims = () => {
  const claims = Store.claims;
  const billed = claims.reduce((s, c) => s + c.billed, 0);
  const paid = claims.reduce((s, c) => s + c.paid, 0);
  const copay = claims.reduce((s, c) => s + c.copay, 0);
  const rejected = claims.filter(c => c.status === "rejected").length;
  const rows = claims.map(c => {
    const rx = Store.prescriptions.find(r => r.id === c.rxId);
    const p = rx ? Store.findPatient(rx.patientId) : null;
    const d = rx ? Store.findDrug(rx.drugId) : null;
    const badge = c.status === "paid" ? "green" : c.status === "rejected" ? "red" : "gray";
    return `<tr>
      <td><b>${c.id}</b><div class="muted small">${c.rxId}</div></td>
      <td>${p ? p.first + " " + p.last : "—"}<div class="muted small">${d ? d.name + " " + d.strength : ""}</div></td>
      <td>${c.payer}<div class="muted small">BIN ${c.bin} · PCN ${c.pcn}</div></td>
      <td>${money(c.billed)}</td>
      <td>${money(c.paid)}</td>
      <td>${money(c.copay)}</td>
      <td><span class="badge ${badge}">${c.status}</span>${c.rejectCode ? `<div class="small" style="color:var(--danger)">${escapeHtml(c.rejectCode)}</div>` : ""}</td>
      <td style="text-align:right">${c.status === "rejected" ? `<button class="btn sm primary" data-readjudicate="${c.id}">Re-adjudicate</button>` : ""}</td>
    </tr>`;
  }).join("");
  return `
    <div class="stats" style="grid-template-columns:repeat(4,1fr)">
      ${statCard("Total billed", money(billed), "💳", `${claims.length} claims`, "blue")}
      ${statCard("Plan paid", money(paid), "🏦", "third-party reimbursement", "green")}
      ${statCard("Patient copay", money(copay), "👛", "collected at counter", "gray")}
      ${statCard("Rejections", rejected, "🚫", rejected ? "needs resolution" : "all clear", rejected ? "red" : "green")}
    </div>
    <div class="card">
      <div class="section-head"><h2>Third-party claim adjudication</h2></div>
      <div class="alert info" style="margin-bottom:14px"><span>ℹ️</span>
        <div>Each dispensed claim is adjudicated against the patient's plan (BIN/PCN). Rejected claims show the
        NCPDP reject code — resolve a prior-auth or formulary issue and re-adjudicate to get the claim paid.</div></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Claim</th><th>Patient / Drug</th><th>Payer</th><th>Billed</th><th>Paid</th><th>Copay</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>`;
};

function readjudicate(claimId) {
  const c = Store.claims.find(x => x.id === claimId);
  if (!c) return;
  // simulate a successful resolution: plan now pays ~72% with a copay
  c.paid = +(c.billed * 0.72).toFixed(2);
  c.copay = +(c.billed - c.paid).toFixed(2);
  c.status = "paid";
  c.rejectCode = "";
  Store.commit();
  toast(`${c.id} re-adjudicated — paid ${money(c.paid)}`);
  render();
}

/* ---------- Refills & adherence (MTM) ---------- */
function addDays(dateStr, n) {
  const d = new Date(dateStr); d.setDate(d.getDate() + n); return d;
}
Views.refills = () => {
  // refills due: dispensed maintenance meds with refills remaining
  const due = Store.prescriptions
    .filter(r => r.status === "dispensed" && r.refills > 0 && r.dispensedOn)
    .map(r => {
      const next = addDays(r.dispensedOn, r.daysSupply);
      return { r, next, days: Math.round((next - TODAY) / 86400000) };
    })
    .sort((a, b) => a.days - b.days);

  // adherence per patient (avg PDC across maintenance meds with a pdc value)
  const byPatient = {};
  Store.prescriptions.filter(r => r.pdc != null).forEach(r => {
    (byPatient[r.patientId] = byPatient[r.patientId] || []).push(r.pdc);
  });
  const adherence = Object.entries(byPatient).map(([pid, arr]) => ({
    p: Store.findPatient(pid), pdc: arr.reduce((s, x) => s + x, 0) / arr.length
  })).sort((a, b) => a.pdc - b.pdc);

  const pdcBadge = v => v >= 0.8 ? "green" : v >= 0.6 ? "amber" : "red";

  return `
    <div class="grid-2">
      <div class="card">
        <div class="section-head"><h2>Refills due</h2></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Patient</th><th>Drug</th><th>Due</th><th>Refills</th><th></th></tr></thead>
          <tbody>${due.map(({ r, next, days }) => {
            const p = Store.findPatient(r.patientId), d = Store.findDrug(r.drugId);
            const badge = days < 0 ? "red" : days <= 7 ? "amber" : "gray";
            const lbl = days < 0 ? `${-days}d overdue` : days === 0 ? "today" : `in ${days}d`;
            return `<tr><td>${p.first} ${p.last}<div class="muted small">${p.phone}</div></td>
              <td>${d.name} ${d.strength}</td>
              <td>${fmtDate(next)} <span class="badge ${badge}">${lbl}</span></td>
              <td>${r.refills}</td>
              <td style="text-align:right"><button class="btn sm" data-remind="${r.id}">Send reminder</button></td></tr>`;
          }).join("") || `<tr><td colspan="5" class="empty">No refills due.</td></tr>`}</tbody>
        </table></div>
      </div>
      <div class="card">
        <div class="section-head"><h2>Medication adherence (PDC)</h2></div>
        <p class="muted small">Proportion of Days Covered across maintenance medications. Below 80% is a quality-measure gap.</p>
        ${adherence.map(({ p, pdc }) => `<div style="margin:12px 0">
          <div class="spread"><span>${p.first} ${p.last}</span>
            <span class="badge ${pdcBadge(pdc)}">${Math.round(pdc * 100)}% PDC</span></div>
          <div class="progress" style="margin-top:4px"><span style="width:${Math.round(pdc * 100)}%;background:var(--${pdc >= 0.8 ? 'ok' : pdc >= 0.6 ? 'warn' : 'danger'})"></span></div>
        </div>`).join("")}
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="section-head"><h2>MTM &amp; counseling tasks</h2></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Task</th><th>Patient</th><th>Due</th><th>Note</th><th>Status</th><th></th></tr></thead>
        <tbody>${Store.mtmTasks.map(t => {
          const p = Store.findPatient(t.patientId);
          const overdue = !t.done && daysUntil(t.due) < 0;
          return `<tr>
            <td><b>${t.type}</b><div class="muted small">${t.id}</div></td>
            <td>${p.first} ${p.last}</td>
            <td>${fmtDate(t.due)}${overdue ? ` <span class="badge red">overdue</span>` : ""}</td>
            <td class="small">${escapeHtml(t.note)}</td>
            <td>${t.done ? `<span class="badge green">done</span>` : `<span class="badge gray">open</span>`}</td>
            <td style="text-align:right">${t.done ? "" : `<button class="btn sm primary" data-mtm="${t.id}">Mark complete</button>`}</td></tr>`;
        }).join("")}</tbody>
      </table></div>
    </div>`;
};

function sendReminder(rxId) {
  const rx = Store.prescriptions.find(r => r.id === rxId);
  const p = Store.findPatient(rx.patientId), d = Store.findDrug(rx.drugId);
  toast(`Refill reminder sent to ${p.first} ${p.last} for ${d.name}`);
}
function completeMtm(id) {
  const t = Store.mtmTasks.find(x => x.id === id);
  if (!t) return;
  t.done = true; Store.commit();
  toast("MTM task marked complete");
  render();
}

/* ---------- PBM economics helpers ---------- */
// Net reality of a claim: what the plan paid + patient copay, minus what the
// drug cost to buy, minus the retroactive DIR clawback.
function claimEconomics(c) {
  const rx = Store.prescriptions.find(r => r.id === c.rxId);
  const drug = rx ? Store.findDrug(rx.drugId) : null;
  const acquisitionCost = rx && drug ? rx.qty * drug.cost : 0;
  const reimbursement = (c.paid || 0) + (c.copay || 0);
  const dirFee = c.dirFee || 0;
  const paid = c.status !== "rejected";
  const net = paid ? reimbursement - acquisitionCost - dirFee + (c.recovered || 0) : 0;
  return {
    rx, drug, acquisitionCost, reimbursement, dirFee, net,
    underwater: paid && net < 0,
    macEligible: paid && reimbursement < acquisitionCost
  };
}

/* ---------- Reimbursement / PBM economics ---------- */
Views.reimbursement = () => {
  const paid = Store.claims.filter(c => c.status !== "rejected");
  const econ = paid.map(c => ({ c, e: claimEconomics(c) }));
  const net = econ.reduce((s, x) => s + x.e.net, 0);
  const dirTotal = econ.reduce((s, x) => s + x.e.dirFee, 0);
  const under = econ.filter(x => x.e.underwater);
  const lost = under.reduce((s, x) => s + x.e.net, 0);
  const openAppeals = Store.claims.filter(c => c.appealStatus === "submitted").length;

  const rows = econ.map(({ c, e }) => {
    const badge = e.underwater ? "red" : "green";
    let action = "";
    if (c.appealStatus === "submitted") {
      action = `<span class="badge amber">appeal submitted</span>
        <button class="btn sm" data-appeal-win="${c.id}">Won</button>
        <button class="btn sm" data-appeal-lose="${c.id}">Lost</button>`;
    } else if (c.appealStatus === "won") {
      action = `<span class="badge green">appeal won +${money(c.recovered)}</span>`;
    } else if (c.appealStatus === "lost") {
      action = `<span class="badge gray">appeal lost</span>`;
    } else if (e.macEligible) {
      action = `<button class="btn sm primary" data-appeal="${c.id}">File MAC appeal</button>`;
    } else {
      action = `<span class="muted small">—</span>`;
    }
    return `<tr>
      <td><b>${e.drug ? e.drug.name + " " + e.drug.strength : c.rxId}</b><div class="muted small">${c.payer}</div></td>
      <td>${money(e.reimbursement)}</td>
      <td>${money(e.acquisitionCost)}</td>
      <td style="color:var(--danger)">−${money(e.dirFee)}</td>
      <td><b style="color:var(--${e.underwater ? "danger" : "ok"})">${e.net < 0 ? "−" : ""}${money(Math.abs(e.net))}</b></td>
      <td><span class="badge ${badge}">${e.underwater ? "underwater" : "profit"}</span></td>
      <td style="text-align:right;white-space:nowrap">${action}</td>
    </tr>`;
  }).join("");

  return `
    <div class="stats" style="grid-template-columns:repeat(4,1fr)">
      ${statCard("Net after cost + DIR", (net < 0 ? "−" : "") + money(Math.abs(net)), "💸",
        `${money(dirTotal)} DIR clawbacks`, net >= 0 ? "green" : "red")}
      ${statCard("Underwater claims", under.length, "🔻",
        `${money(Math.abs(lost))} below cost`, under.length ? "red" : "green")}
      ${statCard("DIR fee drag", money(dirTotal), "🩸", "retroactive clawbacks", dirTotal ? "amber" : "green")}
      ${statCard("Open MAC appeals", openAppeals, "⚖️", "pricing disputes", openAppeals ? "blue" : "green")}
    </div>
    <div class="card">
      <div class="section-head"><h2>Per-claim profitability (PBM reality check)</h2></div>
      <div class="alert ${under.length ? "red" : "info"}" style="margin-bottom:14px"><span>${under.length ? "🛑" : "ℹ️"}</span>
        <div>This is the number that closes pharmacies: <b>reimbursement − acquisition cost − DIR fee</b>.
        A claim can look "paid" yet lose money once the PBM claws back a DIR fee months later. Underwater claims where
        the plan paid <em>below your cost</em> are eligible for a <b>MAC appeal</b>.</div></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Drug / Payer</th><th>Reimbursed</th><th>Drug cost</th><th>DIR fee</th><th>Net</th><th>Status</th><th>MAC appeal</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>`;
};

function fileMacAppeal(id) {
  const c = Store.claims.find(x => x.id === id);
  if (!c) return;
  c.appealStatus = "submitted";
  Store.commit();
  toast(`MAC appeal filed for ${id}`);
  render();
}
function resolveMacAppeal(id, won) {
  const c = Store.claims.find(x => x.id === id);
  if (!c) return;
  if (won) {
    const e = claimEconomics(c);
    // a successful appeal trues up reimbursement to at least acquisition cost + small margin
    c.recovered = +(e.acquisitionCost - e.reimbursement + 0.50).toFixed(2);
    c.appealStatus = "won";
    toast(`Appeal won — recovered ${money(c.recovered)} on ${id}`);
  } else {
    c.appealStatus = "lost";
    toast(`Appeal lost for ${id}`, "warn");
  }
  Store.commit();
  render();
}

/* ---------- Audit Center ---------- */
Views.audits = () => {
  const open = Store.audits.filter(a => a.status !== "closed");
  const atRisk = open.reduce((s, a) => s + (a.amountAtRisk - a.recouped), 0);
  const recoupedTotal = Store.audits.reduce((s, a) => s + a.recouped, 0);
  const ready = Store.auditReadiness;
  const readyPct = Math.round(ready.filter(r => r.ok).length / ready.length * 100);

  const auditRows = Store.audits.map(a => {
    const sb = a.status === "open" ? "red" : a.status === "responded" ? "amber" : "gray";
    const due = daysUntil(a.due);
    return `<tr>
      <td><b>${a.id}</b><div class="muted small">${a.pbm} · ${a.type}</div></td>
      <td>${escapeHtml(a.reason)}<div class="muted small">${escapeHtml(a.action)}</div></td>
      <td>${a.claims}</td>
      <td>${money(a.amountAtRisk - a.recouped)}<div class="muted small">${money(a.recouped)} recouped</div></td>
      <td>${fmtDate(a.due)}${a.status !== "closed" && due <= 7 ? ` <span class="badge red">${due}d</span>` : ""}</td>
      <td><span class="badge ${sb}">${a.status}</span></td>
    </tr>`;
  }).join("");

  return `
    <div class="stats" style="grid-template-columns:repeat(4,1fr)">
      ${statCard("Open audits", open.length, "📋", "in progress", open.length ? "amber" : "green")}
      ${statCard("$ at risk", money(atRisk), "⚠️", "potential recoupment", atRisk ? "red" : "green")}
      ${statCard("Recouped to date", money(recoupedTotal), "📉", "lost to clawbacks", "gray")}
      ${statCard("Audit readiness", readyPct + "%", "✅", `${ready.filter(r => r.ok).length}/${ready.length} controls`, readyPct >= 80 ? "green" : "amber")}
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="section-head"><h2>Active & past audits</h2></div>
      <div class="alert info" style="margin-bottom:14px"><span>🛡️</span>
        <div>PBM audits can recoup payments months after dispensing over technicalities (a missing
        signature, a days-supply rounding). Respond before the due date and appeal findings — money left
        unappealed is money gone.</div></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Audit</th><th>Reason / next step</th><th>Claims</th><th>At risk</th><th>Due</th><th>Status</th></tr></thead>
        <tbody>${auditRows}</tbody>
      </table></div>
    </div>
    <div class="card">
      <div class="section-head"><h2>Audit-readiness scorecard</h2></div>
      ${ready.map(r => `<div class="spread" style="padding:9px 0;border-bottom:1px solid var(--line)">
        <div><span class="badge ${r.ok ? "green" : "red"}">${r.ok ? "✓" : "gap"}</span>
          &nbsp;${escapeHtml(r.item)}<div class="muted small">${escapeHtml(r.detail)}</div></div>
        ${r.ok ? "" : `<button class="btn sm primary" data-audit-fix="${r.id}">Resolve</button>`}
      </div>`).join("")}
    </div>`;
};

function resolveAuditGap(id) {
  const r = Store.auditReadiness.find(x => x.id === id);
  if (!r) return;
  r.ok = true;
  r.detail = "Resolved and documented.";
  Store.commit();
  toast("Audit gap resolved");
  render();
}

/* ---------- Compliance / credentials ---------- */
Views.compliance = () => {
  const creds = [...Store.credentials].sort((a, b) => a.expires.localeCompare(b.expires));
  const expired = creds.filter(c => daysUntil(c.expires) < 0);
  const soon = creds.filter(c => daysUntil(c.expires) >= 0 && daysUntil(c.expires) <= 60);
  const annualCost = creds.reduce((s, c) => s + (c.renewalCost || 0), 0);

  const rows = creds.map(c => {
    const d = daysUntil(c.expires);
    const badge = d < 0 ? "red" : d <= 30 ? "red" : d <= 60 ? "amber" : "green";
    const lbl = d < 0 ? `expired ${-d}d ago` : `${d}d left`;
    return `<tr>
      <td><b>${c.name}</b><div class="muted small">${c.holder}</div></td>
      <td>${c.authority}</td>
      <td class="small">${c.number}</td>
      <td>${fmtDate(c.expires)} <span class="badge ${badge}">${lbl}</span></td>
      <td>${c.renewalCost ? money(c.renewalCost) : "—"}</td>
      <td style="text-align:right">${d <= 60 ? `<button class="btn sm primary" data-renew="${c.id}">Renew</button>`
        : `<button class="btn sm" data-renew="${c.id}">Renew</button>`}</td>
    </tr>`;
  }).join("");

  return `
    <div class="stats" style="grid-template-columns:repeat(4,1fr)">
      ${statCard("Expired", expired.length, "🚨", "act immediately", expired.length ? "red" : "green")}
      ${statCard("Expiring ≤60 days", soon.length, "📂", "renew soon", soon.length ? "amber" : "green")}
      ${statCard("Annual renewal cost", money(annualCost), "💵", "licenses & insurance", "blue")}
      ${statCard("Credentials tracked", creds.length, "🗂️", "permits & registrations", "gray")}
    </div>
    <div class="card">
      <div class="section-head"><h2>Licenses, registrations & insurance</h2></div>
      <div class="alert ${expired.length ? "red" : "info"}" style="margin-bottom:14px"><span>${expired.length ? "🚨" : "🗓️"}</span>
        <div>A lapsed permit, DEA registration, or liability policy can shut a pharmacy down overnight or void
        insurance. Track every renewal in one place so nothing slips.</div></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Credential</th><th>Authority</th><th>Number</th><th>Expires</th><th>Renewal</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>`;
};

function renewCredential(id) {
  const c = Store.credentials.find(x => x.id === id);
  if (!c) return;
  const d = new Date(c.expires);
  d.setFullYear(d.getFullYear() + 1);
  c.expires = d.toISOString().slice(0, 10);
  Store.commit();
  toast(`${c.name} renewed → ${fmtDate(c.expires)}`);
  render();
}

/* ============================================================
   Router & event wiring
   ============================================================ */
let currentView = "dashboard";

function render() {
  $("#view").innerHTML = Views[currentView]();
  $("#viewTitle").textContent = $(`.nav-item[data-view="${currentView}"]`).textContent.trim();
  wireView();
}

function wireView() {
  // navigation shortcuts inside cards
  $$("[data-go]").forEach(b => b.onclick = () => navigate(b.dataset.go));
  // prescriptions
  $$("[data-advance]").forEach(b => b.onclick = () => advanceRx(b.dataset.advance));
  $$("[data-rx]").forEach(b => b.onclick = () => rxDetails(b.dataset.rx));
  if ($("#newRx")) $("#newRx").onclick = newRxForm;
  // patients
  $$("[data-patient]").forEach(b => b.onclick = () => patientChart(b.dataset.patient));
  if ($("#patientSearch")) $("#patientSearch").oninput = e => { const v = e.target.value; $("#view").innerHTML = Views.patients(v); wireView(); restoreFocus("patientSearch", v); };
  // inventory
  $$("[data-receive]").forEach(b => b.onclick = () => receiveStock(b.dataset.receive));
  $$("[data-reorder]").forEach(b => b.onclick = () => reorder(b.dataset.reorder));
  if ($("#invSearch")) $("#invSearch").oninput = e => { const v = e.target.value; $("#view").innerHTML = Views.inventory(v); wireView(); restoreFocus("invSearch", v); };
  // interactions
  if ($("#durPatient")) $("#durPatient").onchange = e => {
    const id = e.target.value;
    if (!id) { $("#patientDurResult").innerHTML = ""; return; }
    const p = Store.findPatient(id);
    const drugs = patientActiveDrugs(id);
    const findings = checkInteractions(drugs);
    const allergyHits = drugs.map(d => ({ d, a: allergyConflict(p, d) })).filter(x => x.a);
    $("#patientDurResult").innerHTML =
      `<p class="muted small">Active meds: ${drugs.map(d => d.name).join(", ") || "none"}</p>` +
      renderFindings(findings, allergyHits);
  };
  if ($("#runCheck")) $("#runCheck").onclick = () => {
    const ids = $$(".drugChk:checked").map(c => c.value);
    const drugs = ids.map(id => Store.findDrug(id));
    if (drugs.length < 2) { $("#adhocResult").innerHTML = `<div class="alert warn"><span>⚠️</span><div>Select at least two drugs.</div></div>`; return; }
    $("#adhocResult").innerHTML = renderFindings(checkInteractions(drugs));
  };
  // immunizations
  if ($("#newImm")) $("#newImm").onclick = newImmForm;
  // claims & billing
  $$("[data-readjudicate]").forEach(b => b.onclick = () => readjudicate(b.dataset.readjudicate));
  // refills & adherence
  $$("[data-remind]").forEach(b => b.onclick = () => sendReminder(b.dataset.remind));
  $$("[data-mtm]").forEach(b => b.onclick = () => completeMtm(b.dataset.mtm));
  // reimbursement / PBM
  $$("[data-appeal]").forEach(b => b.onclick = () => fileMacAppeal(b.dataset.appeal));
  $$("[data-appeal-win]").forEach(b => b.onclick = () => resolveMacAppeal(b.dataset.appealWin, true));
  $$("[data-appeal-lose]").forEach(b => b.onclick = () => resolveMacAppeal(b.dataset.appealLose, false));
  // audits
  $$("[data-audit-fix]").forEach(b => b.onclick = () => resolveAuditGap(b.dataset.auditFix));
  // compliance
  $$("[data-renew]").forEach(b => b.onclick = () => renewCredential(b.dataset.renew));
}

function restoreFocus(id, val) {
  const el = $("#" + id);
  if (el) { el.focus(); el.setSelectionRange(val.length, val.length); }
}

function navigate(view) {
  currentView = view;
  $$(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.view === view));
  render();
}

/* global search → jump to relevant view */
function wireChrome() {
  $$(".nav-item").forEach(n => n.onclick = () => navigate(n.dataset.view));
  $("#resetData").onclick = () => {
    if (confirm("Restore all demo data to its original state? This clears your changes.")) {
      Store.reset(); toast("Demo data restored"); render();
    }
  };
  $("#globalSearch").oninput = e => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) return;
    // naive: if matches a patient name go to patients, drug -> inventory
    if (Store.patients.some(p => (p.first + " " + p.last).toLowerCase().includes(q))) {
      navigate("patients"); $("#view").innerHTML = Views.patients(q); wireView();
    } else if (Store.inventory.some(d => d.name.toLowerCase().includes(q))) {
      navigate("inventory"); $("#view").innerHTML = Views.inventory(q); wireView();
    }
  };
  document.addEventListener("keydown", e => { if (e.key === "Escape") $("#modalRoot").innerHTML = ""; });
}

/* boot */
try {
  wireChrome();
  render();
} catch (err) {
  console.error("PharmaDesk failed to start", err);
  const v = document.getElementById("view");
  if (v) v.innerHTML = `<div class="alert red"><span>🛑</span><div>
    <b>The app failed to start.</b><div class="small">${String(err && err.message || err)}</div>
    <div class="small">Try the "Reset demo data" button, or reload the page.</div></div></div>`;
}

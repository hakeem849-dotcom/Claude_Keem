/* PharmaDesk V2 — comparison layer. Keeps v1 intact and adds V2 views. */
(function () {
  const SURVIVAL_KEY = "pharmadesk.v2.survival";

  const v2Esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
  const signedMoney = n => (n < 0 ? "−" : "") + money(Math.abs(n));

  const baseDashboard = Views.dashboard;
  const baseClaimDetail = claimDetail;

  const survivalEvents = [
    {
      time: "8:10 AM",
      title: "Morning queue spike",
      body: "The store opens with 14 prescriptions waiting, 3 verification holds, 2 ready calls, and one patient already at the counter.",
      choices: [
        { label: "Prioritize clinical holds", hint: "Catch risk first, queue slows", safety: 10, finance: -12, trust: 3, audit: 4, time: -32, result: "You catch a serious DUR issue early, but the wait time grows." },
        { label: "Clear easy refills first", hint: "Move volume, defer complexity", safety: -4, finance: 18, trust: 2, audit: -2, time: -18, result: "The queue moves, but a clinical hold sits longer than ideal." },
        { label: "Pull technician to triage", hint: "Balance workflow", safety: 5, finance: 8, trust: 5, audit: 2, time: -24, result: "The day starts organized, but staffing capacity is now tight." }
      ]
    },
    {
      time: "8:43 AM",
      title: "Paid claim, losing fill",
      body: "A chronic medication claim is paid, but after acquisition cost and estimated DIR fee, the pharmacy loses money. The patient needs it today.",
      choices: [
        { label: "Dispense and document the loss", hint: "Protect access", safety: 4, finance: -42, trust: 8, audit: 2, time: -14, result: "The patient leaves cared for, but the pharmacy absorbs the loss." },
        { label: "Start MAC appeal before pickup", hint: "Fight reimbursement", safety: 1, finance: 12, trust: -2, audit: 6, time: -28, result: "You preserve appeal rights, but the patient waits longer." },
        { label: "Call prescriber for alternative", hint: "Clinical/business review", safety: 6, finance: 6, trust: 1, audit: 3, time: -35, result: "The prescriber call helps, but it consumes scarce pharmacist time." }
      ]
    },
    {
      time: "9:20 AM",
      title: "PBM audit notice",
      body: "A PBM audit requests signature logs and days-supply support. The due date is close and recoupment exposure is material.",
      choices: [
        { label: "Generate audit packet now", hint: "Defend revenue", safety: 0, finance: 20, trust: 0, audit: 14, time: -38, result: "Audit exposure drops because documentation is organized early." },
        { label: "Defer until afternoon", hint: "Keep filling", safety: 2, finance: 6, trust: 3, audit: -10, time: -10, result: "The queue improves, but audit risk grows." },
        { label: "Assign tech to collect signatures", hint: "Partial control", safety: 1, finance: 10, trust: 1, audit: 7, time: -20, result: "You reduce risk without fully stopping workflow." }
      ]
    },
    {
      time: "10:05 AM",
      title: "DUR alert at verification",
      body: "A patient on anticoagulation has a flagged medication profile. The system requires clinical judgment before the prescription can move forward.",
      choices: [
        { label: "Hold and contact prescriber", hint: "Safest path", safety: 15, finance: -8, trust: 4, audit: 8, time: -34, result: "You protect the patient and document intervention." },
        { label: "Override with counseling note", hint: "Proceed carefully", safety: 5, finance: 8, trust: 3, audit: 3, time: -18, result: "The fill proceeds with documentation and counseling." },
        { label: "Proceed without documentation", hint: "Fast but risky", safety: -12, finance: 12, trust: -4, audit: -15, time: -8, result: "The queue moves, but clinical and audit risk spike." }
      ]
    },
    {
      time: "11:30 AM",
      title: "Controlled count variance",
      body: "The expected count for a scheduled medication does not match the physical count. The difference is small but cannot be ignored.",
      choices: [
        { label: "Stop and reconcile immediately", hint: "Hard control", safety: 4, finance: -6, trust: 0, audit: 14, time: -30, result: "You close the loop before the discrepancy gets worse." },
        { label: "Document variance, investigate later", hint: "Balanced", safety: 1, finance: 4, trust: 0, audit: 5, time: -12, result: "The variance is documented but remains open." },
        { label: "Assume data entry error", hint: "Dangerous shortcut", safety: -6, finance: 8, trust: 0, audit: -18, time: -5, result: "The day moves faster, but accountability weakens." }
      ]
    },
    {
      time: "1:15 PM",
      title: "Patient cannot afford copay",
      body: "A patient with multiple maintenance meds says they cannot afford today’s copay. Skipping therapy could hurt adherence.",
      choices: [
        { label: "Find lower-cost alternative", hint: "Intervene clinically", safety: 8, finance: -10, trust: 10, audit: 2, time: -30, result: "The patient feels supported and stays on therapy." },
        { label: "Offer partial fill", hint: "Short-term access", safety: 4, finance: -4, trust: 6, audit: 1, time: -16, result: "You bridge the patient for now, but the problem remains." },
        { label: "Tell patient to call insurance", hint: "Deflect", safety: -5, finance: 4, trust: -12, audit: 0, time: -6, result: "The store saves time, but patient trust drops." }
      ]
    }
  ];

  function defaultSurvival() {
    return { i: 0, safety: 74, finance: 0, trust: 70, audit: 66, minutes: 480, completed: false, history: [] };
  }
  function getSurvival() {
    try { return JSON.parse(localStorage.getItem(SURVIVAL_KEY)) || defaultSurvival(); }
    catch (e) { return defaultSurvival(); }
  }
  function saveSurvival(s) {
    try { localStorage.setItem(SURVIVAL_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function resetSurvival() { saveSurvival(defaultSurvival()); render(); toast("Survival Mode reset"); }

  function band(score) {
    if (score >= 85) return { label: "Excellent", color: "green" };
    if (score >= 70) return { label: "Stable", color: "green" };
    if (score >= 50) return { label: "At risk", color: "amber" };
    return { label: "Critical", color: "red" };
  }
  function scoreRow(label, value, sub) {
    const b = band(value);
    return `<div class="score-row">
      <div class="spread"><b>${label}</b><span class="badge ${b.color}">${b.label} · ${value}%</span></div>
      <div class="score-bar ${b.color}"><span style="width:${clamp(value)}%"></span></div>
      <div class="muted small" style="margin-top:5px">${sub}</div>
    </div>`;
  }
  function applySurvivalChoice(idx) {
    const s = getSurvival();
    const event = survivalEvents[s.i];
    const choice = event.choices[idx];
    if (!event || !choice) return;
    s.safety = clamp(s.safety + choice.safety);
    s.finance += choice.finance;
    s.trust = clamp(s.trust + choice.trust);
    s.audit = clamp(s.audit + choice.audit);
    s.minutes = Math.max(0, s.minutes + choice.time);
    s.history.unshift({ time: event.time, event: event.title, choice: choice.label, result: choice.result });
    s.i += 1;
    s.completed = s.i >= survivalEvents.length;
    saveSurvival(s);
    toast(choice.result, choice.finance < -20 || choice.safety < 0 || choice.audit < 0 ? "warn" : "ok");
    render();
  }

  function finalOutcome(s) {
    const avg = Math.round((s.safety + s.trust + s.audit) / 3);
    const financeLine = s.finance < 0 ? `absorbed ${money(Math.abs(s.finance))} in losses or time-cost` : `created ${money(s.finance)} in recoverable value`;
    if (avg >= 80 && s.finance >= -50) return `You protected patients, defended the business, and kept trust high. The pharmacy survived the day with discipline.`;
    if (avg >= 70) return `You protected the core mission, but the day exposed the tradeoff: ${financeLine}.`;
    return `The pharmacy stayed open, but risk accumulated. Clinical, audit, or trust issues need attention tomorrow.`;
  }

  Views.survival = () => {
    const s = getSurvival();
    const event = survivalEvents[s.i];
    const history = s.history.slice(0, 5).map(h => `<div class="history-item"><b>${h.time} · ${v2Esc(h.choice)}</b><div>${v2Esc(h.result)}</div><div class="muted small">${v2Esc(h.event)}</div></div>`).join("") || `<div class="empty">No decisions yet.</div>`;
    const scorePanel = `<div class="score-stack">
      ${scoreRow("Patient safety", s.safety, "Clinical decisions, DUR handling, and access")}
      <div class="score-row"><div class="spread"><b>Financial survival</b><span class="badge ${s.finance < 0 ? "red" : "green"}">${signedMoney(s.finance)}</span></div><div class="muted small">Net effect of losses, appeals, and operational decisions</div></div>
      ${scoreRow("Patient trust", s.trust, "Access, counseling, wait time, and empathy")}
      ${scoreRow("Audit readiness", s.audit, "Documentation, controlled counts, and PBM response")}
      <div class="score-row"><div class="spread"><b>Time remaining</b><span class="badge blue">${Math.floor(s.minutes / 60)}h ${s.minutes % 60}m</span></div><div class="muted small">Time pressure is part of the simulation.</div></div>
      <button class="btn" id="resetSurvival">Reset Survival Mode</button>
    </div>`;

    if (s.completed) {
      return `<div class="v2-banner"><div class="v2-kicker">Simulation complete</div><h2>End-of-day owner scorecard</h2><p>${v2Esc(finalOutcome(s))}</p><div class="row"><button class="btn light" id="resetSurvival">Run again</button><button class="btn ghost" data-go="explainer">Review PBM economics</button></div></div>
      <div class="survival-shell"><div class="card"><div class="section-head"><h2>Decision log</h2></div><div class="history-list">${history}</div></div>${scorePanel}</div>`;
    }

    return `<div class="survival-shell">
      <div>
        <div class="survival-event">
          <div class="survival-time">${event.time} · Event ${s.i + 1} of ${survivalEvents.length}</div>
          <h2>${v2Esc(event.title)}</h2>
          <p class="muted">${v2Esc(event.body)}</p>
          <div class="choice-grid">
            ${event.choices.map((c, idx) => `<button class="btn choice-card" data-survival-choice="${idx}"><span><b>${v2Esc(c.label)}</b><span class="muted small">${v2Esc(c.hint)}</span></span></button>`).join("")}
          </div>
        </div>
        <div class="card" style="margin-top:16px"><div class="section-head"><h2>Recent decisions</h2></div><div class="history-list">${history}</div></div>
      </div>
      ${scorePanel}
    </div>`;
  };

  function claimRows() {
    return Store.claims.map(c => ({ c, e: claimEconomics(c) }));
  }
  function waterfall(e) {
    return `<div class="waterfall">
      <div class="wf-row positive"><span>Plan paid</span><b>${money(e.paid || 0)}</b></div>
      <div class="wf-row positive"><span>Patient copay</span><b>${money(e.copay || 0)}</b></div>
      <div class="wf-row negative"><span>Acquisition cost</span><b>−${money(e.acquisitionCost || 0)}</b></div>
      <div class="wf-row negative"><span>Estimated DIR clawback</span><b>−${money(e.dirFee || 0)}</b></div>
      <div class="wf-total ${e.net < 0 ? "bad" : "good"}"><span>Final net</span><b>${e.net < 0 ? "−" : ""}${money(Math.abs(e.net || 0))}</b></div>
    </div>`;
  }

  Views.explainer = () => {
    const rows = claimRows();
    const underwater = rows.filter(x => x.e.underwater);
    const dirTotal = rows.reduce((s, x) => s + x.e.dirFee, 0);
    const netTotal = rows.reduce((s, x) => s + x.e.net, 0);
    const featured = underwater[0] || rows[0];
    return `<div class="v2-banner"><div class="v2-kicker">PBM / DIR Fee Explainer</div><h2>Paid does not mean profitable.</h2><p>This view turns reimbursement into a plain-English waterfall so non-pharmacy users can see why a claim can pay and still lose money after acquisition cost and DIR fees.</p><div class="v2-pill-row"><span class="v2-pill">Underwater claims: ${underwater.length}</span><span class="v2-pill">DIR drag: ${money(dirTotal)}</span><span class="v2-pill">Net across claims: ${signedMoney(netTotal)}</span></div></div>
    <div class="grid-2">
      <div class="card"><div class="section-head"><h2>Example claim waterfall</h2><span class="badge ${featured.e.net < 0 ? "red" : "green"}">${featured.c.id}</span></div>${waterfall(featured.e)}<div class="alert ${featured.e.net < 0 ? "red" : "info"}"><span>${featured.e.net < 0 ? "🛑" : "ℹ️"}</span><div>${featured.e.net < 0 ? "This claim is underwater after cost and DIR. Script volume alone does not guarantee survival." : "This claim remains profitable after cost and DIR."}</div></div></div>
      <div class="card"><div class="section-head"><h2>Why it matters</h2></div><p class="muted">Independent pharmacies can appear busy while losing money on specific fills. PharmaDesk V2 makes that invisible pressure visible: acquisition cost, payer reimbursement, patient copay, retroactive price concessions, and appeal opportunities.</p><div class="row"><button class="btn primary" data-go="appeals">Open appeal queue</button><button class="btn" data-go="reimbursement">Compare reimbursement screen</button></div></div>
    </div>
    <div class="card" style="margin-top:16px"><div class="section-head"><h2>Claim economics table</h2></div><div class="table-wrap"><table><thead><tr><th>Claim</th><th>Drug</th><th>Payer</th><th>Reimb.</th><th>Cost</th><th>DIR</th><th>Net</th><th></th></tr></thead><tbody>${rows.map(({ c, e }) => `<tr><td><b>${c.id}</b></td><td>${e.drug ? e.drug.name : c.rxId}</td><td>${v2Esc(c.payer)}</td><td>${money(e.reimbursement)}</td><td>${money(e.acquisitionCost)}</td><td>${money(e.dirFee)}</td><td><span class="badge ${e.net < 0 ? "red" : "green"}">${signedMoney(e.net)}</span></td><td><button class="btn sm" data-claim="${c.id}">Details</button></td></tr>`).join("")}</tbody></table></div></div>`;
  };

  Views.appeals = () => {
    const appealable = claimRows().filter(x => x.e.underwater || x.e.macEligible);
    const recovered = Store.claims.reduce((s, c) => s + (c.recovered || 0), 0);
    const exposure = appealable.reduce((s, x) => s + Math.abs(Math.min(0, x.e.net)), 0);
    return `<div class="v2-banner"><div class="v2-kicker">MAC Appeal Workflow</div><h2>Turn margin loss into an action queue.</h2><p>V2 separates appealable claims, shows the basis for appeal, and lets the pharmacist-owner draft, submit, win, lose, or export a packet.</p><div class="v2-pill-row"><span class="v2-pill">Appealable: ${appealable.length}</span><span class="v2-pill">Loss exposure: ${money(exposure)}</span><span class="v2-pill">Recovered: ${money(recovered)}</span></div></div>
    <div class="card"><div class="section-head"><h2>Appeal queue</h2><button class="btn" data-appeal-export="all">Download queue CSV</button></div><div class="table-wrap"><table><thead><tr><th>Claim</th><th>Basis</th><th>Economics</th><th>Status</th><th>Actions</th></tr></thead><tbody>${appealable.map(({ c, e }) => {
      const st = c.appealStatus && c.appealStatus !== "none" ? c.appealStatus : "not-started";
      const basis = e.macEligible ? "MAC below acquisition cost" : "DIR erodes margin";
      return `<tr><td><b class="lk" data-claim="${c.id}">${c.id}</b><div class="muted small">${e.drug ? e.drug.name + " " + e.drug.strength : c.rxId}</div></td><td>${basis}<div class="muted small">${v2Esc(c.payer)}</div></td><td>${waterfall(e)}</td><td><span class="badge ${st === "won" ? "green" : st === "lost" ? "red" : st === "submitted" ? "blue" : "amber"}">${st}</span>${c.recovered ? `<div class="small">Recovered ${money(c.recovered)}</div>` : ""}</td><td style="white-space:nowrap"><button class="btn sm" data-appeal-stage="${c.id}:drafted">Draft</button> <button class="btn sm primary" data-appeal-stage="${c.id}:submitted">Submit</button> <button class="btn sm" data-appeal-stage="${c.id}:won">Won</button> <button class="btn sm danger" data-appeal-stage="${c.id}:lost">Lost</button> <button class="btn sm" data-appeal-packet="${c.id}">Packet</button></td></tr>`;
    }).join("") || `<tr><td colspan="5" class="empty">No appealable claims right now.</td></tr>`}</tbody></table></div></div>`;
  };

  function setAppealStage(payload) {
    const [id, stage] = payload.split(":");
    const c = Store.claims.find(x => x.id === id);
    if (!c) return;
    const e = claimEconomics(c);
    c.appealStatus = stage;
    if (stage === "won") c.recovered = +(Math.max(0.5, Math.abs(Math.min(0, e.net)) + 0.5)).toFixed(2);
    if (stage === "lost") c.recovered = 0;
    Store.commit();
    toast(`${id} appeal marked ${stage}`);
    render();
  }
  function appealPacket(id) {
    const c = Store.claims.find(x => x.id === id);
    if (!c) return;
    const e = claimEconomics(c);
    const body = `<!doctype html><html><head><meta charset="utf-8"><title>Appeal Packet ${v2Esc(id)}</title><style>body{font-family:Arial,Helvetica,sans-serif;margin:32px;color:#16202b;line-height:1.5}h1{color:#0a5f54}.box{background:#f4f7f9;padding:14px;border-radius:8px;margin:12px 0}table{border-collapse:collapse;width:100%;font-size:12px}td{border:1px solid #d8dee5;padding:7px}</style></head><body><h1>MAC / Reimbursement Appeal Packet</h1><div class="box"><b>DEMONSTRATION DATA ONLY</b><br>Claim ${v2Esc(c.id)} · ${v2Esc(c.payer)} · Prepared ${fmtDate(TODAY)}</div><table><tbody><tr><td>Drug</td><td>${e.drug ? v2Esc(e.drug.name + " " + e.drug.strength) : v2Esc(c.rxId)}</td></tr><tr><td>Reimbursement</td><td>${money(e.reimbursement)}</td></tr><tr><td>Acquisition cost</td><td>${money(e.acquisitionCost)}</td></tr><tr><td>DIR fee</td><td>${money(e.dirFee)}</td></tr><tr><td>Net</td><td>${signedMoney(e.net)}</td></tr><tr><td>Appeal basis</td><td>${e.macEligible ? "MAC reimbursed below acquisition cost" : "DIR clawback eliminates margin"}</td></tr></tbody></table><p>Request: Please review the reimbursement and adjust payment to cover documented acquisition cost and a sustainable dispensing margin.</p><p>K. Adeyemi, PharmD<br>Pharmacist in Charge</p></body></html>`;
    downloadFile(`pharmadesk-appeal-${id}.html`, body, "text/html");
    toast(`Appeal packet downloaded for ${id}`);
  }
  function exportAppeals() {
    const rows = claimRows().filter(x => x.e.underwater || x.e.macEligible).map(({ c, e }) => [c.id, c.payer, e.drug ? e.drug.name : c.rxId, money(e.reimbursement), money(e.acquisitionCost), money(e.dirFee), signedMoney(e.net), c.appealStatus || "not-started"]);
    downloadFile("pharmadesk-v2-appeal-queue.csv", toCSV(["Claim", "Payer", "Drug", "Reimbursement", "Acquisition Cost", "DIR", "Net", "Status"], rows), "text/csv");
    toast("Appeal queue CSV downloaded");
  }

  Views.mission = () => `<div class="mission-hero"><div class="v2-kicker">Why this exists</div><h2>Independent pharmacies are more than transaction counters.</h2><p>They are clinical safety nets, insurance translators, inventory managers, compliance operators, small businesses, and trusted community relationships. PharmaDesk V2 is a fictional demo, but the pressure it shows is real: patient access, drug safety, PBM reimbursement pressure, audits, controlled substance accountability, renewal deadlines, and the daily fight to keep a local pharmacy open.</p><div class="row"><button class="btn primary" data-go="survival">Run Survival Mode</button><button class="btn" data-go="explainer">See why paid claims can lose money</button></div></div>
  <div class="v2-card-grid" style="margin-top:16px"><div class="card"><div class="big">🩺</div><h3>Clinical judgment</h3><p class="muted">DUR checks, allergy flags, counseling, overrides, and prescriber calls.</p></div><div class="card"><div class="big">💸</div><h3>Financial survival</h3><p class="muted">A claim can pay while still losing money after cost and retroactive fees.</p></div><div class="card"><div class="big">🛡️</div><h3>Regulatory pressure</h3><p class="muted">Audits, licenses, controlled counts, documentation, and deadlines never stop.</p></div></div>`;

  Views.dashboard = () => `<div class="v2-banner"><div class="v2-kicker">V2 comparison build</div><h2>Independent Pharmacy Survival Simulator</h2><p>This version adds guided storytelling on top of the original app: Survival Mode, PBM/DIR economics, appeal workflow, mission framing, and a short demo tour.</p><div class="row"><button class="btn light" data-go="survival">Run Survival Mode</button><button class="btn ghost" data-go="explainer">PBM/DIR Explainer</button><button class="btn ghost" data-go="appeals">Appeal Queue</button><button class="btn ghost" data-go="mission">Mission</button></div><div class="v2-pill-row"><span class="v2-pill">v1 preserved at root</span><span class="v2-pill">V2 route: /v2/</span><span class="v2-pill">Fictional demo data</span></div></div>${baseDashboard()}`;

  claimDetail = function (id) {
    const c = Store.claims.find(x => x.id === id);
    if (!c) return baseClaimDetail(id);
    const e = claimEconomics(c);
    const p = e.rx ? Store.findPatient(e.rx.patientId) : null;
    const body = `<dl class="kvs"><dt>Prescription</dt><dd>${c.rxId}</dd><dt>Patient</dt><dd>${p ? p.first + " " + p.last : "—"}</dd><dt>Drug</dt><dd>${e.drug ? e.drug.name + " " + e.drug.strength : "—"}</dd><dt>Payer</dt><dd>${v2Esc(c.payer)}</dd><dt>Status</dt><dd><span class="badge ${c.status === "paid" ? "green" : c.status === "rejected" ? "red" : "gray"}">${c.status}</span></dd><dt>Appeal status</dt><dd>${c.appealStatus || "not-started"}</dd></dl>${waterfall(e)}<div class="alert ${e.net < 0 ? "red" : "info"}"><span>${e.net < 0 ? "🛑" : "ℹ️"}</span><div>${e.net < 0 ? "This paid claim is underwater after acquisition cost and DIR." : "This claim remains positive after cost and DIR."}</div></div>`;
    const footer = `<button class="btn" onclick="document.getElementById('modalRoot').innerHTML=''">Close</button><button class="btn primary" data-appeal-packet="${c.id}">Download appeal packet</button>`;
    openModal({ title: `Claim ${c.id} · V2 economics`, body, footer, size: "lg" });
    wireV2();
  };

  const TOUR = [
    { view: "dashboard", title: "V2 command center", body: "The dashboard now introduces the survival story before showing the original operational dashboard." },
    { view: "survival", title: "Survival Mode", body: "Make real tradeoff decisions: safety, trust, audit readiness, time pressure, and financial survival." },
    { view: "explainer", title: "Paid is not always profitable", body: "The waterfall view explains how a paid claim can still lose money after cost and DIR." },
    { view: "appeals", title: "Appeal queue", body: "Underwater claims become an action queue with draft, submit, win, lose, and packet export actions." },
    { view: "mission", title: "Mission framing", body: "This gives the app emotional weight and explains why independent pharmacies matter." }
  ];
  let tourIdx = 0;
  function showTour() {
    const step = TOUR[tourIdx];
    navigate(step.view);
    document.getElementById("modalRoot").innerHTML = `<div class="tour-step"><div class="tour-count">Step ${tourIdx + 1} of ${TOUR.length}</div><h3>${v2Esc(step.title)}</h3><p>${v2Esc(step.body)}</p><div class="row"><button class="btn" id="tourClose">End tour</button><button class="btn" id="tourBack" ${tourIdx === 0 ? "disabled" : ""}>Back</button><button class="btn primary" id="tourNext">${tourIdx === TOUR.length - 1 ? "Finish" : "Next"}</button></div></div>`;
    wireV2();
  }
  function startTour() { tourIdx = 0; showTour(); }

  const baseRender = render;
  render = function () {
    baseRender();
    wireV2();
  };

  function wireV2() {
    const st = document.getElementById("startTour");
    if (st) st.onclick = startTour;
    const reset = document.getElementById("resetData");
    if (reset && !reset.dataset.v2Reset) {
      reset.dataset.v2Reset = "1";
      reset.onclick = () => {
        if (confirm("Restore all demo data and reset V2 Survival Mode?")) {
          Store.reset();
          try { localStorage.removeItem(SURVIVAL_KEY); } catch (e) {}
          toast("Demo data restored");
          render();
        }
      };
    }
    document.querySelectorAll("[data-survival-choice]").forEach(b => b.onclick = () => applySurvivalChoice(Number(b.dataset.survivalChoice)));
    const rs = document.getElementById("resetSurvival");
    if (rs) rs.onclick = resetSurvival;
    document.querySelectorAll("[data-appeal-stage]").forEach(b => b.onclick = () => setAppealStage(b.dataset.appealStage));
    document.querySelectorAll("[data-appeal-packet]").forEach(b => b.onclick = () => appealPacket(b.dataset.appealPacket));
    document.querySelectorAll("[data-appeal-export]").forEach(b => b.onclick = exportAppeals);
    const next = document.getElementById("tourNext");
    if (next) next.onclick = () => { if (tourIdx >= TOUR.length - 1) { document.getElementById("modalRoot").innerHTML = ""; } else { tourIdx += 1; showTour(); } };
    const back = document.getElementById("tourBack");
    if (back) back.onclick = () => { tourIdx = Math.max(0, tourIdx - 1); showTour(); };
    const close = document.getElementById("tourClose");
    if (close) close.onclick = () => { document.getElementById("modalRoot").innerHTML = ""; };
  }

  try { render(); } catch (e) { console.error("V2 layer failed", e); }
})();

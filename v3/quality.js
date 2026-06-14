/* PharmaDesk V3 — Pharmacist review + constructive feedback matrix.
   Adds a living quality/readiness layer without replacing the operator workflow. */
(function () {
  const MATRIX = [
    {
      area: "Patient safety",
      grade: "Strong",
      priority: "High",
      insight: "Clinical Review surfaces allergy/DUR exceptions and lets the pharmacist document care notes, but the operator still needs a compact sign-off view.",
      improvement: "Use Clinical Review for verification, then document a note before closing high-risk issues.",
      screen: "clinicalops"
    },
    {
      area: "Workflow usability",
      grade: "Strong",
      priority: "High",
      insight: "The Work Queue is the most realistic part because independent pharmacies operate by exception, not by browsing separate modules.",
      improvement: "Keep the Work Queue as the daily home base; avoid burying urgent issues in original tables.",
      screen: "workqueue"
    },
    {
      area: "Claims / reimbursement",
      grade: "Strong",
      priority: "High",
      insight: "Claims Desk correctly distinguishes paid claims, rejected claims, underwater claims, and MAC/DIR review candidates.",
      improvement: "Add payer follow-up status and export owner brief when reviewing unresolved claims.",
      screen: "claimsops"
    },
    {
      area: "Purchasing realism",
      grade: "Improved",
      priority: "High",
      insight: "Purchasing now considers reorder point, expiry, and unit economics instead of blindly reordering low stock.",
      improvement: "Use 'Review before reorder' when the item is underwater or expiring soon.",
      screen: "purchasing"
    },
    {
      area: "Patient relationship",
      grade: "Good",
      priority: "Medium",
      insight: "Patient Care shows adherence indicators and care notes, which is closer to real independent pharmacy value than a simple patient table.",
      improvement: "Add notes after counseling, prescriber calls, adherence outreach, and payer follow-up.",
      screen: "careplans"
    },
    {
      area: "Daily controls",
      grade: "Good",
      priority: "High",
      insight: "Daily Close is realistic because the pharmacist-owner needs controlled counts, rejected claims, ordering exceptions, and handoff discipline.",
      improvement: "Treat close checklist as the end-of-day control process, not a cosmetic checklist.",
      screen: "dailyclose"
    },
    {
      area: "Training / SOP clarity",
      grade: "Strong",
      priority: "Medium",
      insight: "SOP Guide makes the app informational and teachable. This matters because a realistic system needs to explain why each action exists.",
      improvement: "Use SOP Guide to orient new users before they work the queue.",
      screen: "sop"
    },
    {
      area: "Production readiness",
      grade: "Prototype",
      priority: "Critical",
      insight: "The demo is workflow-realistic, but it is not real production software: no auth, immutable audit log, backend, integrations, role permissions, or PHI safeguards.",
      improvement: "Position this as an operator prototype, not a real dispensing or patient-care system.",
      screen: "dashboard"
    }
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function gradeColor(grade) {
    return grade === "Strong" ? "green" : grade === "Improved" || grade === "Good" ? "blue" : grade === "Prototype" ? "amber" : "gray";
  }

  function priorityColor(priority) {
    return priority === "Critical" ? "red" : priority === "High" ? "amber" : "blue";
  }

  function addMatrixNav() {
    const nav = document.getElementById("nav");
    if (!nav || document.querySelector('[data-view="feedbackmatrix"]')) return;
    const btn = document.createElement("button");
    btn.className = "nav-item";
    btn.dataset.view = "feedbackmatrix";
    btn.innerHTML = '<span class="ni-ico">🧪</span> Quality Matrix';
    const sop = document.querySelector('[data-view="sop"]');
    if (sop && sop.nextSibling) nav.insertBefore(btn, sop.nextSibling);
    else nav.appendChild(btn);
    btn.onclick = () => navigate("feedbackmatrix");
  }

  function readinessStats() {
    const strong = MATRIX.filter(x => x.grade === "Strong").length;
    const critical = MATRIX.filter(x => x.priority === "Critical").length;
    const high = MATRIX.filter(x => x.priority === "High").length;
    const score = Math.round((strong / MATRIX.length) * 100);
    return { strong, critical, high, score };
  }

  function exportMatrix() {
    const cols = ["Area", "Grade", "Priority", "Pharmacist insight", "Recommended improvement", "Screen"];
    const rows = MATRIX.map(m => [m.area, m.grade, m.priority, m.insight, m.improvement, m.screen]);
    downloadFile("pharmadesk-quality-matrix.csv", toCSV(cols, rows), "text/csv");
    toast("Quality matrix downloaded");
  }

  function openAgentReview() {
    const { score, strong, high, critical } = readinessStats();
    const body = `<div class="alert info" style="margin-bottom:12px"><span>🧪</span><div><b>Three-agent review complete:</b> pharmacist/operator review, feedback matrix, and product improvement layer.</div></div>
      <dl class="kvs"><dt>Operator realism score</dt><dd>${score}%</dd><dt>Strong areas</dt><dd>${strong} of ${MATRIX.length}</dd><dt>High-priority workflow areas</dt><dd>${high}</dd><dt>Production caveats</dt><dd>${critical}</dd></dl>
      <p class="muted">The app is now strongest as an independent-pharmacy operations prototype: it prioritizes exceptions, explains payer economics, supports documentation, and gives an owner a daily close process. It should still be described as fictional demo software, not a real patient-care or dispensing system.</p>`;
    openModal({ title: "Pharmacist + product review", body, footer: `<button class="btn" onclick="document.getElementById('modalRoot').innerHTML=''">Close</button><button class="btn primary" id="matrixExportModal">Export matrix</button>`, size: "lg" });
    const ex = document.getElementById("matrixExportModal");
    if (ex) ex.onclick = exportMatrix;
  }

  Views.feedbackmatrix = () => {
    const { score, strong, high, critical } = readinessStats();
    return `<div class="ops-hero"><h2>Quality Matrix</h2><p>This is the constructive feedback layer from a pharmacist/operator perspective. It shows what is realistic, what is weak, what matters most, and what to do next.</p><div class="ops-banner"><b>Verdict:</b> Strong workflow prototype. Best fit: independent pharmacy operator demo, staff training concept, workflow discovery, and product strategy—not real dispensing or PHI use.</div></div>
      <div class="stats">
        ${statCard("Readiness score", score + "%", "🧪", `${strong}/${MATRIX.length} strong`, score >= 60 ? "green" : "amber")}
        ${statCard("High-priority areas", high, "⚠️", "operator-critical", "amber")}
        ${statCard("Critical caveats", critical, "🚫", "not production software", "red")}
        ${statCard("Screens reviewed", MATRIX.length, "📋", "pharmacist matrix", "blue")}
      </div>
      <div class="ops-card" style="margin-bottom:16px"><div class="section-head"><h2>Constructive feedback matrix</h2><div class="row"><button class="btn sm" id="agentReview">Review summary</button><button class="btn sm primary" id="matrixExport">Export CSV</button></div></div><div class="table-wrap"><table><thead><tr><th>Area</th><th>Grade</th><th>Priority</th><th>Pharmacist insight</th><th>Recommended improvement</th><th></th></tr></thead><tbody>${MATRIX.map(m => `<tr><td><b>${esc(m.area)}</b></td><td><span class="badge ${gradeColor(m.grade)}">${esc(m.grade)}</span></td><td><span class="badge ${priorityColor(m.priority)}">${esc(m.priority)}</span></td><td>${esc(m.insight)}</td><td>${esc(m.improvement)}</td><td><button class="btn sm" data-go="${m.screen}">Open</button></td></tr>`).join("")}</tbody></table></div></div>
      <div class="ops-grid-3"><div class="ops-card"><h3>Agent 1 · Pharmacist/operator</h3><p>The app is strongest when it mirrors a real day: prioritize clinical holds, rejected claims, reimbursement losses, ordering exceptions, audit deadlines, and end-of-day controls.</p></div><div class="ops-card"><h3>Agent 2 · Feedback matrix</h3><p>The matrix converts subjective review into actionable categories: safety, workflow, claims, purchasing, patient care, daily controls, SOP clarity, and production caveats.</p></div><div class="ops-card"><h3>Agent 3 · Builder</h3><p>The app now includes a permanent quality layer, tour, owner brief export, operator workflows, care notes, claim statuses, purchasing discipline, and daily close.</p></div></div>`;
  };

  const baseDashboard = Views.dashboard;
  Views.dashboard = () => {
    const { score, critical } = readinessStats();
    return `${baseDashboard()}<div class="ops-card" style="margin-top:16px"><div class="section-head"><h2>Pharmacist review layer</h2><span class="badge ${critical ? "amber" : "green"}">${score}% workflow readiness</span></div><p class="muted">A pharmacist/operator review has been added as a living quality matrix. Use it to understand what is realistic, what needs attention, and why this remains a prototype rather than real patient-care software.</p><div class="row"><button class="btn primary" data-go="feedbackmatrix">Open Quality Matrix</button><button class="btn" id="agentReviewDash">Review summary</button></div></div>`;
  };

  const baseRender = render;
  render = function () {
    const result = baseRender.apply(this, arguments);
    addMatrixNav();
    const exp = document.getElementById("matrixExport");
    if (exp) exp.onclick = exportMatrix;
    const review = document.getElementById("agentReview");
    if (review) review.onclick = openAgentReview;
    const dashReview = document.getElementById("agentReviewDash");
    if (dashReview) dashReview.onclick = openAgentReview;
    return result;
  };

  try {
    addMatrixNav();
    render();
  } catch (e) {
    console.error("Quality matrix layer failed", e);
  }
})();

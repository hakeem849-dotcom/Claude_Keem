/* PharmaDesk Operator Tour — reusable for app.html, /app/, and /v3/. */
(function () {
  const steps = [
    {
      view: "dashboard",
      title: "Command Center",
      body: "Start here. This is the pharmacist-owner view: clinical risk, rejected claims, underwater fills, audit exposure, inventory exceptions, and the work that matters today."
    },
    {
      view: "workqueue",
      title: "Prioritized Work Queue",
      body: "A real independent pharmacy does not experience clinical, billing, inventory, and compliance as separate problems. This queue combines them into one ranked operating list."
    },
    {
      view: "clinicalops",
      title: "Clinical Review",
      body: "This screen focuses the pharmacist on verification, allergies, DUR findings, controlled-substance status, counseling needs, and documentation."
    },
    {
      view: "claimsops",
      title: "Claims Desk",
      body: "Paid does not always mean profitable. This view separates rejected claims, below-cost claims, MAC appeal candidates, and payer follow-up actions."
    },
    {
      view: "purchasing",
      title: "Purchasing Discipline",
      body: "Ordering should not be just low-stock equals buy. The app considers reorder points, expiry risk, cash tied up, and whether reimbursement makes the item worth restocking."
    },
    {
      view: "careplans",
      title: "Patient Care Workspace",
      body: "This is where patient relationships live: adherence signals, chronic conditions, insurance context, interventions, counseling, and follow-up notes."
    },
    {
      view: "dailyclose",
      title: "Daily Close",
      body: "The day ends with controls: controlled counts, rejected claims, ordering exceptions, cold chain, deposits, audit follow-up, and tomorrow’s handoff."
    },
    {
      view: "sop",
      title: "SOP Guide",
      body: "The app is informational too. SOP cards explain what to do when a clinical hold, payer reject, or underwater fill appears."
    }
  ];

  let i = 0;

  function escapeText(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function ensureTourButton() {
    if (document.getElementById("startTour")) return;
    const topbar = document.querySelector(".topbar-right");
    if (!topbar) return;
    const btn = document.createElement("button");
    btn.className = "btn sm primary";
    btn.id = "startTour";
    btn.type = "button";
    btn.textContent = "Take a tour";
    topbar.insertBefore(btn, topbar.firstChild);
  }

  function renderTour() {
    const step = steps[i];
    if (typeof navigate === "function") navigate(step.view);
    const root = document.getElementById("modalRoot");
    if (!root) return;
    root.innerHTML = `
      <div class="tour-backdrop" id="tourBackdrop" style="position:fixed;inset:0;background:rgba(15,23,42,.25);z-index:130"></div>
      <div class="tour-step" role="dialog" aria-modal="true" aria-label="PharmaDesk tour"
        style="position:fixed;right:22px;bottom:22px;width:min(430px,calc(100vw - 44px));background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.25);z-index:131;padding:18px">
        <div style="color:var(--brand);font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;margin-bottom:6px">Step ${i + 1} of ${steps.length}</div>
        <h3 style="margin:0 0 8px;font-size:18px">${escapeText(step.title)}</h3>
        <p style="color:var(--muted);line-height:1.5;margin:0 0 14px">${escapeText(step.body)}</p>
        <div class="row" style="justify-content:flex-end">
          <button class="btn" id="tourClose" type="button">End tour</button>
          <button class="btn" id="tourBack" type="button" ${i === 0 ? "disabled" : ""}>Back</button>
          <button class="btn primary" id="tourNext" type="button">${i === steps.length - 1 ? "Finish" : "Next"}</button>
        </div>
      </div>`;
    wireTourControls();
  }

  function closeTour() {
    const root = document.getElementById("modalRoot");
    if (root) root.innerHTML = "";
  }

  function wireTourControls() {
    const next = document.getElementById("tourNext");
    const back = document.getElementById("tourBack");
    const close = document.getElementById("tourClose");
    const backdrop = document.getElementById("tourBackdrop");
    if (next) next.onclick = () => {
      if (i >= steps.length - 1) return closeTour();
      i += 1;
      renderTour();
    };
    if (back) back.onclick = () => {
      i = Math.max(0, i - 1);
      renderTour();
    };
    if (close) close.onclick = closeTour;
    if (backdrop) backdrop.onclick = closeTour;
  }

  function startTour() {
    i = 0;
    renderTour();
  }

  function initTour() {
    ensureTourButton();
    const btn = document.getElementById("startTour");
    if (btn) btn.onclick = startTour;
  }

  const originalRender = window.render;
  if (typeof originalRender === "function" && !window.__pharmadeskTourWrapped) {
    window.__pharmadeskTourWrapped = true;
    window.render = function () {
      const result = originalRender.apply(this, arguments);
      initTour();
      return result;
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTour);
  } else {
    initTour();
  }
})();

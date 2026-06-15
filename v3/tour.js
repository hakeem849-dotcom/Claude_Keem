/* PharmaDesk streamlined tour — reusable for app.html, /app/, and /v3/. */
(function () {
  const defaultSteps = [
    {
      view: "dashboard",
      title: "Home",
      body: "Start here. The app now has one operating view for the work that matters today: open tasks, clinical holds, claims risk, inventory actions, and the owner brief."
    },
    {
      view: "dispensinghub",
      title: "Dispensing",
      body: "Dispensing combines queue and clinical review. Verify, document, and move the prescription forward without hunting through separate screens."
    },
    {
      view: "patienthub",
      title: "Patients",
      body: "Patients combines care notes and Med Sync. This keeps adherence, follow-up, and relationship work in one patient-centered area."
    },
    {
      view: "inventoryhub",
      title: "Inventory",
      body: "Inventory combines stock and purchasing. The app reduces the decision to what matters: buy, hold, return, or substitute."
    },
    {
      view: "toolshub",
      title: "Tools",
      body: "Imports, reports, audit defense, SOPs, and daily close live here so the main workflow stays simple and uncluttered."
    }
  ];

  let i = 0;

  function steps() {
    return Array.isArray(window.__pharmadeskTourSteps) && window.__pharmadeskTourSteps.length ? window.__pharmadeskTourSteps : defaultSteps;
  }

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
    const list = steps();
    const step = list[i];
    if (step && typeof navigate === "function") navigate(step.view);
    const root = document.getElementById("modalRoot");
    if (!root || !step) return;
    root.innerHTML = `
      <div class="tour-backdrop" id="tourBackdrop" style="position:fixed;inset:0;background:rgba(15,23,42,.25);z-index:130"></div>
      <div class="tour-step" role="dialog" aria-modal="true" aria-label="PharmaDesk tour"
        style="position:fixed;right:22px;bottom:22px;width:min(430px,calc(100vw - 44px));background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.25);z-index:131;padding:18px">
        <div style="color:var(--brand);font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;margin-bottom:6px">Step ${i + 1} of ${list.length}</div>
        <h3 style="margin:0 0 8px;font-size:18px">${escapeText(step.title)}</h3>
        <p style="color:var(--muted);line-height:1.5;margin:0 0 14px">${escapeText(step.body)}</p>
        <div class="row" style="justify-content:flex-end">
          <button class="btn" id="tourClose" type="button">End tour</button>
          <button class="btn" id="tourBack" type="button" ${i === 0 ? "disabled" : ""}>Back</button>
          <button class="btn primary" id="tourNext" type="button">${i === list.length - 1 ? "Finish" : "Next"}</button>
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
      const list = steps();
      if (i >= list.length - 1) return closeTour();
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

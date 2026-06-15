/* PharmaDesk V3 — navigation stabilizer for streamlined five-section app. */
(function () {
  const NAV = [
    { view: "dashboard", icon: "🏥", label: "Home" },
    { view: "dispensinghub", icon: "℞", label: "Dispensing" },
    { view: "patienthub", icon: "👥", label: "Patients" },
    { view: "inventoryhub", icon: "📦", label: "Inventory" },
    { view: "toolshub", icon: "🧰", label: "Tools" }
  ];
  const GROUP = {
    dashboard: "dashboard",
    workqueue: "dashboard",
    dispensinghub: "dispensinghub",
    clinicalops: "dispensinghub",
    prescriptions: "dispensinghub",
    claimsops: "dispensinghub",
    patienthub: "patienthub",
    careplans: "patienthub",
    medsync: "patienthub",
    patients: "patienthub",
    inventoryhub: "inventoryhub",
    purchasing: "inventoryhub",
    inventory: "inventoryhub",
    toolshub: "toolshub",
    dailyclose: "toolshub",
    auditdefense: "toolshub",
    importcenter: "toolshub",
    sop: "toolshub",
    reportcenter: "toolshub"
  };

  function currentPrimary() {
    const current = window.__pharmadeskCurrentView || "dashboard";
    return GROUP[current] || "toolshub";
  }

  function installNav() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const active = currentPrimary();
    nav.innerHTML = NAV.map(x => `<button class="nav-item ${x.view === active ? "active" : ""}" data-view="${x.view}"><span class="ni-ico">${x.icon}</span> ${x.label}</button>`).join("");
    nav.querySelectorAll(".nav-item").forEach(btn => {
      btn.onclick = () => {
        window.__pharmadeskCurrentView = btn.dataset.view;
        navigate(btn.dataset.view);
      };
    });
  }

  function updateTitle() {
    const h = document.getElementById("viewTitle");
    if (!h) return;
    const found = NAV.find(x => x.view === currentPrimary());
    if (found) h.textContent = `${found.icon} ${found.label}`;
  }

  const baseNavigate = window.navigate;
  if (typeof baseNavigate === "function" && !window.__pharmadeskNavFixNavigateWrapped) {
    window.__pharmadeskNavFixNavigateWrapped = true;
    window.navigate = function (view) {
      window.__pharmadeskCurrentView = view || "dashboard";
      return baseNavigate.apply(this, arguments);
    };
  }

  const baseRender = window.render;
  if (typeof baseRender === "function" && !window.__pharmadeskNavFixRenderWrapped) {
    window.__pharmadeskNavFixRenderWrapped = true;
    window.render = function () {
      const result = baseRender.apply(this, arguments);
      document.body.classList.add("streamlined");
      installNav();
      updateTitle();
      return result;
    };
  }

  try {
    installNav();
    updateTitle();
  } catch (e) {
    console.error("Streamline navigation stabilizer failed", e);
  }
})();

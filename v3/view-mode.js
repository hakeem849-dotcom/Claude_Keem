/* PharmaDesk V3 — desktop/mobile view switcher.
   Adds a bottom selector and applies an optimized layout for the selected view. */
(function () {
  const KEY = "pharmadesk.v3.viewMode";
  const modes = ["desktop", "mobile"];

  function savedMode() {
    try {
      const raw = localStorage.getItem(KEY);
      return modes.includes(raw) ? raw : "desktop";
    } catch (e) {
      return "desktop";
    }
  }

  function saveMode(mode) {
    try { localStorage.setItem(KEY, mode); } catch (e) {}
  }

  function injectStyles() {
    if (document.getElementById("viewModeStyles")) return;
    const style = document.createElement("style");
    style.id = "viewModeStyles";
    style.textContent = `
      .view-mode-switch {
        position: fixed;
        left: 50%;
        bottom: calc(14px + env(safe-area-inset-bottom, 0px));
        transform: translateX(-50%);
        z-index: 160;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px;
        border: 1px solid rgba(15, 23, 42, .12);
        border-radius: 999px;
        background: rgba(255,255,255,.94);
        box-shadow: 0 18px 45px rgba(15,23,42,.18);
        backdrop-filter: blur(14px) saturate(170%);
      }
      .view-mode-switch button {
        border: 0;
        border-radius: 999px;
        padding: 8px 13px;
        background: transparent;
        color: var(--muted);
        font: 700 12px/1 var(--sans);
        cursor: pointer;
        white-space: nowrap;
      }
      .view-mode-switch button.active {
        background: var(--brand);
        color: #fff;
        box-shadow: 0 8px 18px rgba(14,124,107,.24);
      }
      .view-mode-switch .mode-label {
        padding: 0 8px 0 10px;
        color: var(--muted);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      body.view-desktop #app { grid-template-columns: 256px 1fr; }
      body.view-desktop .sidebar { position: sticky; top: 0; height: 100vh; }
      body.view-desktop .main { padding-bottom: 72px; }

      body.view-mobile {
        font-size: 13px;
        overflow-x: hidden;
      }
      body.view-mobile #app {
        display: block;
        min-height: 100vh;
        padding-bottom: calc(82px + env(safe-area-inset-bottom, 0px));
      }
      body.view-mobile .main {
        min-height: 100vh;
        padding-bottom: 88px;
      }
      body.view-mobile .sidebar {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        top: auto;
        height: calc(72px + env(safe-area-inset-bottom, 0px));
        z-index: 130;
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 7px 8px calc(7px + env(safe-area-inset-bottom, 0px));
        border-right: 0;
        border-top: 1px solid rgba(255,255,255,.1);
        box-shadow: 0 -12px 35px rgba(15,23,42,.24);
      }
      body.view-mobile .brand,
      body.view-mobile .sidebar-foot {
        display: none;
      }
      body.view-mobile .nav {
        display: flex;
        flex: 1;
        flex-direction: row;
        align-items: center;
        gap: 6px;
        overflow-x: auto;
        overflow-y: hidden;
        height: 100%;
        padding: 0 4px;
        -webkit-overflow-scrolling: touch;
        scroll-snap-type: x proximity;
      }
      body.view-mobile .nav::-webkit-scrollbar { display: none; }
      body.view-mobile .nav-item {
        flex: 0 0 76px;
        width: 76px;
        height: 56px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        gap: 2px;
        padding: 6px 6px;
        border-radius: 13px;
        font-size: 10.5px;
        line-height: 1.1;
        scroll-snap-align: center;
      }
      body.view-mobile .nav-item.active::before { display: none; }
      body.view-mobile .ni-ico {
        width: auto;
        font-size: 17px;
      }
      body.view-mobile .topbar {
        position: sticky;
        top: 0;
        z-index: 90;
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding: 10px 12px;
      }
      body.view-mobile .topbar h1 {
        font-size: 18px;
      }
      body.view-mobile .topbar-right {
        width: 100%;
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 2px;
        -webkit-overflow-scrolling: touch;
      }
      body.view-mobile .topbar-right::-webkit-scrollbar { display: none; }
      body.view-mobile .topbar-right .btn {
        flex: 0 0 auto;
        min-height: 36px;
      }
      body.view-mobile .search {
        flex: 1 0 190px;
        width: auto;
        min-width: 190px;
      }
      body.view-mobile .user-chip {
        display: none;
      }
      body.view-mobile .view {
        padding: 12px;
      }
      body.view-mobile .stats,
      body.view-mobile .ops-grid,
      body.view-mobile .ops-grid-3,
      body.view-mobile .ops-grid-4,
      body.view-mobile .grid-2,
      body.view-mobile .grid-3,
      body.view-mobile .grid-4 {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
      body.view-mobile .ops-hero,
      body.view-mobile .ops-card,
      body.view-mobile .card,
      body.view-mobile .panel {
        border-radius: 14px;
        padding: 14px;
      }
      body.view-mobile .ops-hero h2 {
        font-size: 21px;
        line-height: 1.15;
      }
      body.view-mobile .section-head {
        align-items: flex-start;
        gap: 8px;
      }
      body.view-mobile .section-head .row,
      body.view-mobile .row {
        flex-wrap: wrap;
      }
      body.view-mobile .table-wrap {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      body.view-mobile table {
        min-width: 680px;
      }
      body.view-mobile .queue-row,
      body.view-mobile .close-row,
      body.view-mobile .order-suggestion {
        grid-template-columns: auto 1fr;
        align-items: start;
      }
      body.view-mobile .queue-row > .row,
      body.view-mobile .close-row > .row,
      body.view-mobile .order-suggestion > .row {
        grid-column: 2;
      }
      body.view-mobile .modal-card,
      body.view-mobile .modal,
      body.view-mobile [role="dialog"] {
        max-width: calc(100vw - 20px) !important;
      }
      body.view-mobile .tour-step {
        left: 10px !important;
        right: 10px !important;
        bottom: calc(96px + env(safe-area-inset-bottom, 0px)) !important;
        width: auto !important;
      }
      body.view-mobile .view-mode-switch {
        bottom: calc(82px + env(safe-area-inset-bottom, 0px));
      }
      body.view-mobile .view-mode-switch .mode-label {
        display: none;
      }

      @media (max-width: 760px) {
        body.view-desktop .view-mode-switch {
          bottom: calc(12px + env(safe-area-inset-bottom, 0px));
        }
      }
    `;
    document.head.appendChild(style);
  }

  function applyMode(mode) {
    const selected = modes.includes(mode) ? mode : "desktop";
    document.body.classList.toggle("view-desktop", selected === "desktop");
    document.body.classList.toggle("view-mobile", selected === "mobile");
    document.documentElement.dataset.viewMode = selected;
    saveMode(selected);
    document.querySelectorAll("[data-view-mode]").forEach(btn => {
      const active = btn.dataset.viewMode === selected;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function ensureSwitch() {
    if (document.getElementById("viewModeSwitch")) return;
    const wrap = document.createElement("div");
    wrap.id = "viewModeSwitch";
    wrap.className = "view-mode-switch";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "View mode selector");
    wrap.innerHTML = `
      <span class="mode-label">View</span>
      <button type="button" data-view-mode="desktop" aria-pressed="false">Desktop</button>
      <button type="button" data-view-mode="mobile" aria-pressed="false">Mobile</button>
    `;
    document.body.appendChild(wrap);
    wrap.querySelectorAll("[data-view-mode]").forEach(btn => {
      btn.addEventListener("click", () => applyMode(btn.dataset.viewMode));
    });
  }

  function init() {
    injectStyles();
    ensureSwitch();
    applyMode(savedMode());
  }

  const baseRender = window.render;
  if (typeof baseRender === "function" && !window.__pharmadeskViewModeWrapped) {
    window.__pharmadeskViewModeWrapped = true;
    window.render = function () {
      const result = baseRender.apply(this, arguments);
      init();
      return result;
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

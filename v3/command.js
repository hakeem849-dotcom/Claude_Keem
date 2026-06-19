/* ============================================================
   PharmaDesk — Noir command palette
   A minimal, monochrome quick-switcher. Opens with Cmd/Ctrl+K,
   "/", or by tapping the top-bar search (the mobile entry point).
   Searches every page, action, and record, then routes via the
   app's own navigate()/detail handlers. Self-contained; loaded last.
   ============================================================ */
(function () {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const has = fn => typeof fn === "function";
  const go = view => { if (has(window.navigate)) window.navigate(view); };
  const clickById = id => { const b = document.getElementById(id); if (b) b.click(); };

  // Pages reachable through the operator router (hubs + the deeper views).
  const PAGES = [
    ["dashboard", "Home", "Today’s operating view"],
    ["dispensinghub", "Dispense", "Queue & clinical review"],
    ["patienthub", "Patients", "Adherence, sync, follow-up"],
    ["inventoryhub", "Inventory", "Buy / hold / return / substitute"],
    ["pbmhub", "PBM", "Reimbursement, DIR, appeals"],
    ["toolshub", "Tools", "Reports, import, close, SOP"],
    ["workqueue", "Full work queue", "All open exceptions"],
    ["clinicalops", "Clinical review detail", "Review & note capture"],
    ["claimsops", "Claims desk", "Payer follow-up lifecycle"],
    ["purchasing", "Purchasing detail", "Full reorder table"],
    ["careplans", "Patient care detail", "Care notes & adherence"],
    ["medsync", "Med Sync", "Maintenance-med sync"],
    ["dailyclose", "Daily close", "End-of-day checklist & packet"],
    ["auditdefense", "Audit defense", "Audit response packet"],
    ["importcenter", "CSV Import Center", "Upload, clean, integrate"],
    ["reportcenter", "Report center", "Exportable reports"],
    ["reimbursement", "Reimbursement detail", "Per-claim economics"],
    ["controlled", "Controlled log", "C-II–C-V register"],
    ["immunizations", "Immunizations", "Vaccine records"],
    ["compliance", "Compliance", "Licenses & renewals"],
    ["sop", "SOP guide", "Workflow training cards"]
  ];

  function buildIndex() {
    const items = [];
    PAGES.forEach(([view, title, sub]) => items.push({ group: "Pages", icon: "→", title, sub, run: () => go(view) }));

    items.push(
      { group: "Actions", icon: "+", title: "New prescription", sub: "Add an Rx to the queue", run: () => { go("dispensinghub"); if (has(window.newRxForm)) newRxForm(); } },
      { group: "Actions", icon: "+", title: "Record immunization", sub: "Log a vaccine", run: () => { go("immunizations"); if (has(window.newImmForm)) newImmForm(); } },
      { group: "Actions", icon: "?", title: "Take a tour", sub: "Guided walkthrough", run: () => clickById("startTour") },
      { group: "Actions", icon: "⎙", title: "Print brief", sub: "Owner brief print view", run: () => clickById("printBrief") },
      { group: "Actions", icon: "↺", title: "Reset demo data", sub: "Restore the original dataset", run: () => clickById("resetData") }
    );

    try {
      Store.patients.forEach(p => items.push({ group: "Patients", icon: "◉", title: `${p.first} ${p.last}`,
        sub: `${p.id} · ${typeof age === "function" ? age(p.dob) + " y/o · " : ""}${p.insurance || "No plan"}`,
        run: () => { if (has(window.patientChart)) patientChart(p.id); else go("patienthub"); } }));
      Store.inventory.forEach(d => items.push({ group: "Drugs", icon: "℞", title: `${d.name} ${d.strength}`,
        sub: `${d.class} · NDC ${d.ndc}${d.schedule ? " · C-" + d.schedule : ""}`,
        run: () => { if (has(window.drugDetail)) drugDetail(d.id); else go("inventoryhub"); } }));
      Store.prescriptions.forEach(r => { const p = Store.findPatient(r.patientId), d = Store.findDrug(r.drugId);
        items.push({ group: "Prescriptions", icon: "℞", title: `${r.id} — ${d ? d.name : ""}`,
          sub: `${p ? p.first + " " + p.last : ""} · ${r.status}`,
          run: () => { if (has(window.rxDetails)) rxDetails(r.id); else go("dispensinghub"); } }); });
      Store.claims.forEach(c => items.push({ group: "Claims", icon: "$", title: `${c.id} — ${c.payer}`,
        sub: `${c.status}${c.rejectCode ? " · " + c.rejectCode : ""}`,
        run: () => { if (has(window.claimDetail)) claimDetail(c.id); else go("pbmhub"); } }));
      (Store.audits || []).forEach(a => items.push({ group: "Audits", icon: "▣", title: `${a.id} — ${a.pbm}`,
        sub: `${a.type} · ${a.status}`, run: () => { if (has(window.auditDetail)) auditDetail(a.id); else go("auditdefense"); } }));
      (Store.credentials || []).forEach(c => items.push({ group: "Compliance", icon: "▤", title: c.name,
        sub: `${c.authority} · expires ${typeof fmtDate === "function" ? fmtDate(c.expires) : c.expires}`,
        run: () => { if (has(window.credentialDetail)) credentialDetail(c.id); else go("compliance"); } }));
    } catch (e) { /* data not ready — pages + actions still work */ }
    return items;
  }

  function score(it, terms) {
    const t = it.title.toLowerCase(), s = (it.sub || "").toLowerCase();
    let sc = 0;
    for (const q of terms) {
      if (t.startsWith(q)) sc += 100;
      else if (t.includes(q)) sc += 50;
      else if (s.includes(q)) sc += 20;
      else return -1;
    }
    return sc;
  }
  function mark(text, terms) {
    let out = esc(text);
    const q = [...terms].sort((a, b) => b.length - a.length)[0];
    if (q) { const i = out.toLowerCase().indexOf(q); if (i >= 0) out = out.slice(0, i) + '<span class="cmd-mark">' + out.slice(i, i + q.length) + "</span>" + out.slice(i + q.length); }
    return out;
  }

  let state = null;
  function openPalette() {
    if (state) return;
    const root = document.getElementById("paletteRoot") || (() => { const d = document.createElement("div"); d.id = "paletteRoot"; document.body.appendChild(d); return d; })();
    const last = document.activeElement;
    const index = buildIndex();
    root.innerHTML =
      '<div class="cmd-backdrop" id="cmdBackdrop"><div class="cmd" role="dialog" aria-modal="true" aria-label="Command palette">' +
      '<div class="cmd-search"><span class="cmd-search-ico" aria-hidden="true">⌕</span>' +
      '<input id="cmdInput" type="text" placeholder="Search pages, patients, drugs, Rx, claims…" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="cmdResults" aria-autocomplete="list" /></div>' +
      '<div class="cmd-results" id="cmdResults" role="listbox"></div>' +
      '<div class="cmd-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>' +
      "</div></div>";
    const input = document.getElementById("cmdInput"), results = document.getElementById("cmdResults");
    let filtered = [], sel = 0;

    const close = () => { root.innerHTML = ""; state = null; document.removeEventListener("keydown", onKey, true); if (last && last.focus) last.focus(); };
    const update = () => {
      const q = input.value.trim().toLowerCase(), terms = q ? q.split(/\s+/) : [];
      filtered = !terms.length
        ? index.filter(i => i.group === "Pages" || i.group === "Actions")
        : index.map(i => ({ i, s: score(i, terms) })).filter(x => x.s >= 0).sort((a, b) => b.s - a.s).slice(0, 40).map(x => x.i);
      sel = 0; draw(terms);
    };
    const draw = terms => {
      if (!filtered.length) { results.innerHTML = '<div class="cmd-empty">No matches for “' + esc(input.value) + '”.</div>'; return; }
      let html = "", g = null;
      filtered.forEach((it, i) => {
        if (it.group !== g) { html += '<div class="cmd-group">' + esc(it.group) + "</div>"; g = it.group; }
        html += '<div class="cmd-item" role="option" id="cmd-' + i + '" data-i="' + i + '" aria-selected="' + (i === sel) + '">' +
          '<span class="cmd-ico">' + it.icon + "</span><span class=\"cmd-text\"><span class=\"cmd-title\">" + mark(it.title, terms) + "</span>" +
          (it.sub ? '<span class="cmd-sub">' + mark(it.sub, terms) + "</span>" : "") + '</span><span class="cmd-hint">↵</span></div>';
      });
      results.innerHTML = html;
      results.querySelectorAll(".cmd-item").forEach(el => { el.onmouseenter = () => setSel(+el.dataset.i); el.onclick = () => run(+el.dataset.i); });
      into();
    };
    const setSel = i => { sel = i; results.querySelectorAll(".cmd-item").forEach(el => el.setAttribute("aria-selected", +el.dataset.i === sel)); into(); };
    const into = () => { const el = document.getElementById("cmd-" + sel); if (el) el.scrollIntoView({ block: "nearest" }); };
    const run = i => { const it = filtered[i]; if (!it) return; close(); try { it.run(); } catch (e) { console.error("command failed", e); } };
    const onKey = e => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); if (filtered.length) setSel((sel + 1) % filtered.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (filtered.length) setSel((sel - 1 + filtered.length) % filtered.length); }
      else if (e.key === "Enter") { e.preventDefault(); run(sel); }
    };

    document.addEventListener("keydown", onKey, true);
    input.addEventListener("input", update);
    document.getElementById("cmdBackdrop").onclick = e => { if (e.target.id === "cmdBackdrop") close(); };
    state = { close };
    update();
    setTimeout(() => input.focus(), 0);
  }
  window.__pharmadeskPalette = openPalette;

  function wire() {
    // global shortcuts
    document.addEventListener("keydown", e => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); openPalette(); return; }
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || "");
      if (e.key === "/" && !typing && !state) { e.preventDefault(); openPalette(); }
    });
    // repurpose the top-bar search as the (mobile-friendly) palette trigger
    const search = document.getElementById("globalSearch");
    if (search) {
      search.readOnly = true;
      search.setAttribute("aria-label", "Open command palette");
      search.placeholder = "Search…  ⌘K";
      const trigger = e => { e.preventDefault(); search.blur(); openPalette(); };
      search.addEventListener("focus", trigger);
      search.addEventListener("click", trigger);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();

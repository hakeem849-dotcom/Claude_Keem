/* PharmaDesk V3 — CSV Import Center.
   Demo-only import workflow: upload CSVs, validate/clean into app schema, then integrate into Store. */
(function () {
  const STAGE_KEY = "pharmadesk.v3.import.stage";
  const HISTORY_KEY = "pharmadesk.v3.import.history";

  const TABLES = {
    patients: {
      label: "Patients",
      icon: "👥",
      required: ["id", "first", "last"],
      fields: {
        id: ["id", "patientid", "patient_id", "patient", "profileid"],
        first: ["first", "firstname", "first_name", "givenname"],
        last: ["last", "lastname", "last_name", "surname", "familyname"],
        dob: ["dob", "dateofbirth", "birthdate"],
        sex: ["sex", "gender"],
        phone: ["phone", "telephone", "mobile"],
        insurance: ["insurance", "payer", "plan", "planname"],
        allergies: ["allergies", "allergy"],
        conditions: ["conditions", "diagnoses", "condition"],
        notes: ["notes", "note", "comment"]
      },
      template: "id,first,last,dob,sex,phone,insurance,allergies,conditions,notes\nP-2001,Example,Patient,1960-01-01,F,(555) 100-0000,Medicare Part D,Penicillin;Sulfa,Diabetes;Hypertension,Demo only"
    },
    inventory: {
      label: "Inventory / Drugs",
      icon: "📦",
      required: ["id", "name"],
      fields: {
        id: ["id", "drugid", "drug_id", "itemid", "sku"],
        name: ["name", "drug", "drugname", "item", "medication"],
        strength: ["strength"],
        form: ["form", "dosageform"],
        ndc: ["ndc", "ndc11"],
        class: ["class", "drugclass", "therapeuticclass"],
        stock: ["stock", "onhand", "on_hand", "qtyonhand", "quantity"],
        reorder: ["reorder", "reorderpoint", "min", "par"],
        cost: ["cost", "acquisitioncost", "unitcost", "awp_cost"],
        price: ["price", "cashprice", "usualcustomary", "uc"],
        expReimb: ["expreimb", "expectedreimbursement", "reimbursement", "paidperunit"],
        dirRate: ["dirrate", "dir", "concessionrate"],
        expiry: ["expiry", "expiration", "expirationdate", "expdate"],
        schedule: ["schedule", "dea", "controlschedule"]
      },
      template: "id,name,strength,form,ndc,class,stock,reorder,cost,price,expReimb,dirRate,expiry,schedule\nD-2001,Lisinopril,10 mg,tablet,00000-0000-00,ACE inhibitor,300,100,0.04,0.18,0.11,0.12,2027-04-30,0"
    },
    prescriptions: {
      label: "Prescriptions",
      icon: "℞",
      required: ["id", "patientId", "drugId"],
      fields: {
        id: ["id", "rx", "rxnumber", "rx_number", "prescriptionid"],
        patientId: ["patientid", "patient_id", "patient", "profileid"],
        drugId: ["drugid", "drug_id", "itemid", "ndcid"],
        sig: ["sig", "directions", "instructions"],
        qty: ["qty", "quantity", "dispensedqty"],
        daysSupply: ["dayssupply", "days_supply", "ds"],
        refills: ["refills", "refillsremaining"],
        prescriber: ["prescriber", "doctor", "provider"],
        written: ["written", "writtendate", "datewritten"],
        status: ["status", "rxstatus", "workflowstatus"],
        dispensedOn: ["dispensedon", "filldate", "dispenseddate"],
        maintenance: ["maintenance", "maint"],
        pdc: ["pdc", "adherence"]
      },
      template: "id,patientId,drugId,sig,qty,daysSupply,refills,prescriber,written,status,dispensedOn,maintenance,pdc\nRX-7001,P-2001,D-2001,Take 1 tablet daily,30,30,5,Dr Demo,2026-06-01,verification,,true,0.92"
    },
    claims: {
      label: "Claims",
      icon: "💳",
      required: ["id", "rxId", "payer"],
      fields: {
        id: ["id", "claimid", "claim_id"],
        rxId: ["rxid", "rx_id", "rx", "rxnumber"],
        payer: ["payer", "plan", "insurance", "pbm"],
        bin: ["bin"],
        pcn: ["pcn"],
        billed: ["billed", "submitted", "submittedamount", "gross"],
        paid: ["paid", "planpaid", "paidamount"],
        copay: ["copay", "patientpay", "patientpaid"],
        status: ["status", "claimstatus"],
        rejectCode: ["rejectcode", "reject", "rejectreason"],
        dirFee: ["dirfee", "dir", "priceconcession"],
        appealStatus: ["appealstatus", "appeal"],
        recovered: ["recovered", "recovery", "appealrecovered"]
      },
      template: "id,rxId,payer,bin,pcn,billed,paid,copay,status,rejectCode,dirFee,appealStatus,recovered\nCLM-7001,RX-7001,Demo Plan,610000,DEMO,10.00,8.00,2.00,paid,,1.00,none,0"
    },
    audits: {
      label: "Audits",
      icon: "🛡️",
      required: ["id", "pbm"],
      fields: {
        id: ["id", "auditid", "audit_id"],
        pbm: ["pbm", "payer", "plan"],
        type: ["type", "audittype"],
        status: ["status"],
        started: ["started", "startdate"],
        due: ["due", "duedate", "deadline"],
        claims: ["claims", "claimcount", "count"],
        amountAtRisk: ["amountatrisk", "risk", "dollarsatrisk"],
        recouped: ["recouped", "clawback", "recovered"],
        reason: ["reason", "finding", "auditreason"],
        action: ["action", "nextaction", "notes"]
      },
      template: "id,pbm,type,status,started,due,claims,amountAtRisk,recouped,reason,action\nAUD-7001,Demo PBM,Desk audit,open,2026-06-01,2026-06-30,12,2500,0,Documentation review,Collect packet"
    }
  };

  const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], next = text[i + 1];
      if (ch === '"' && quoted && next === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === "," && !quoted) { row.push(cell.trim()); cell = ""; }
      else if ((ch === "\n" || ch === "\r") && !quoted) {
        if (ch === "\r" && next === "\n") i++;
        row.push(cell.trim());
        if (row.some(v => v !== "")) rows.push(row);
        row = []; cell = "";
      } else cell += ch;
    }
    row.push(cell.trim());
    if (row.some(v => v !== "")) rows.push(row);
    return rows;
  }

  function toNumber(v, fallback = 0) {
    if (v == null || v === "") return fallback;
    const n = Number(String(v).replace(/[$,%]/g, ""));
    return Number.isFinite(n) ? n : fallback;
  }
  function toBool(v) {
    return ["true", "yes", "y", "1", "maintenance", "maint"].includes(norm(v));
  }
  function toList(v) {
    if (!v) return [];
    return String(v).split(/[;|]/).map(x => x.trim()).filter(Boolean);
  }
  function cleanStatus(v) {
    const s = norm(v);
    if (["intake", "verification", "pmpreview", "filling", "ready", "dispensed"].includes(s)) return s === "pmpreview" ? "pmp-review" : s;
    if (["sold", "complete", "completed"].includes(s)) return "dispensed";
    return v || "intake";
  }

  function mapRows(type, csvText) {
    const spec = TABLES[type];
    const matrix = parseCSV(csvText);
    if (matrix.length < 2) return { rows: [], errors: ["CSV needs a header row and at least one data row."], headers: [] };
    const headers = matrix[0];
    const lookup = {};
    headers.forEach((h, idx) => lookup[norm(h)] = idx);
    const fieldIndex = {};
    Object.entries(spec.fields).forEach(([field, aliases]) => {
      const hit = aliases.map(norm).find(a => lookup[a] != null);
      if (hit) fieldIndex[field] = lookup[hit];
    });
    const missing = spec.required.filter(f => fieldIndex[f] == null);
    const errors = missing.length ? [`Missing required field(s): ${missing.join(", ")}.`] : [];
    const rows = matrix.slice(1).map((raw, i) => cleanRow(type, raw, fieldIndex, i + 2)).filter(Boolean);
    const idSet = new Set();
    rows.forEach((r, i) => { if (r.id && idSet.has(r.id)) errors.push(`Duplicate id ${r.id} on cleaned row ${i + 1}.`); idSet.add(r.id); });
    return { rows, errors, headers };
  }

  function val(raw, index, field) { return index[field] == null ? "" : raw[index[field]]; }
  function cleanRow(type, raw, index, rowNum) {
    if (type === "patients") return {
      id: val(raw, index, "id") || `P-UP-${rowNum}`,
      first: val(raw, index, "first") || "Unknown",
      last: val(raw, index, "last") || "Patient",
      dob: val(raw, index, "dob"), sex: val(raw, index, "sex"), phone: val(raw, index, "phone"),
      insurance: val(raw, index, "insurance"), allergies: toList(val(raw, index, "allergies")), conditions: toList(val(raw, index, "conditions")), notes: val(raw, index, "notes")
    };
    if (type === "inventory") return {
      id: val(raw, index, "id") || `D-UP-${rowNum}`, name: val(raw, index, "name") || "Unknown item", strength: val(raw, index, "strength"), form: val(raw, index, "form"), ndc: val(raw, index, "ndc"), class: val(raw, index, "class"),
      stock: toNumber(val(raw, index, "stock")), reorder: toNumber(val(raw, index, "reorder")), cost: toNumber(val(raw, index, "cost")), price: toNumber(val(raw, index, "price")), expReimb: toNumber(val(raw, index, "expReimb")), dirRate: toNumber(val(raw, index, "dirRate")), expiry: val(raw, index, "expiry"), schedule: toNumber(val(raw, index, "schedule"))
    };
    if (type === "prescriptions") return {
      id: val(raw, index, "id") || `RX-UP-${rowNum}`, patientId: val(raw, index, "patientId"), drugId: val(raw, index, "drugId"), sig: val(raw, index, "sig"), qty: toNumber(val(raw, index, "qty")), daysSupply: toNumber(val(raw, index, "daysSupply")), refills: toNumber(val(raw, index, "refills")), prescriber: val(raw, index, "prescriber"), written: val(raw, index, "written"), status: cleanStatus(val(raw, index, "status")), dispensedOn: val(raw, index, "dispensedOn"), maintenance: toBool(val(raw, index, "maintenance")), pdc: toNumber(val(raw, index, "pdc"), null)
    };
    if (type === "claims") return {
      id: val(raw, index, "id") || `CLM-UP-${rowNum}`, rxId: val(raw, index, "rxId"), payer: val(raw, index, "payer") || "Unknown payer", bin: val(raw, index, "bin"), pcn: val(raw, index, "pcn"), billed: toNumber(val(raw, index, "billed")), paid: toNumber(val(raw, index, "paid")), copay: toNumber(val(raw, index, "copay")), status: val(raw, index, "status") || "paid", rejectCode: val(raw, index, "rejectCode"), dirFee: toNumber(val(raw, index, "dirFee")), appealStatus: val(raw, index, "appealStatus") || "none", recovered: toNumber(val(raw, index, "recovered"))
    };
    if (type === "audits") return {
      id: val(raw, index, "id") || `AUD-UP-${rowNum}`, pbm: val(raw, index, "pbm") || "Unknown PBM", type: val(raw, index, "type"), status: val(raw, index, "status") || "open", started: val(raw, index, "started"), due: val(raw, index, "due"), claims: toNumber(val(raw, index, "claims")), amountAtRisk: toNumber(val(raw, index, "amountAtRisk")), recouped: toNumber(val(raw, index, "recouped")), reason: val(raw, index, "reason"), action: val(raw, index, "action")
    };
  }

  function stage(type, parsed, fileName) {
    const all = read(STAGE_KEY, {});
    all[type] = { type, fileName, importedAt: new Date().toISOString(), rows: parsed.rows, errors: parsed.errors, headers: parsed.headers };
    write(STAGE_KEY, all);
  }
  function staged() { return read(STAGE_KEY, {}); }
  function history() { return read(HISTORY_KEY, []); }

  function templateDownload(type) {
    downloadFile(`pharmadesk-${type}-template.csv`, TABLES[type].template, "text/csv");
    toast(`${TABLES[type].label} template downloaded`);
  }
  function handleFile(type, input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = mapRows(type, String(reader.result || ""));
      stage(type, parsed, file.name);
      toast(parsed.errors.length ? `${TABLES[type].label}: staged with warnings` : `${TABLES[type].label}: staged successfully`);
      render();
      navigate("importcenter");
    };
    reader.readAsText(file);
  }

  function integrate() {
    const s = staged();
    const types = Object.keys(s).filter(t => TABLES[t] && s[t].rows && s[t].rows.length && !s[t].errors.length);
    if (!types.length) { toast("No clean staged files to integrate"); return; }
    types.forEach(t => { Store.all[t] = s[t].rows; });
    Store.all.meta = Store.all.meta || {};
    Store.all.meta.lastCsvImport = { date: new Date().toISOString(), tables: types };
    Store.commit();
    const h = history();
    h.unshift({ date: new Date().toISOString(), tables: types, counts: Object.fromEntries(types.map(t => [t, s[t].rows.length])) });
    write(HISTORY_KEY, h.slice(0, 10));
    localStorage.removeItem(STAGE_KEY);
    toast(`Integrated ${types.length} CSV section(s)`);
    render();
    navigate("dashboard");
  }
  function clearStage() { localStorage.removeItem(STAGE_KEY); toast("Import staging cleared"); render(); }

  function addNav() {
    const nav = document.getElementById("nav");
    if (!nav || document.querySelector('[data-view="importcenter"]')) return;
    const btn = document.createElement("button");
    btn.className = "nav-item";
    btn.dataset.view = "importcenter";
    btn.innerHTML = '<span class="ni-ico">⬆️</span> Import Center';
    const firstMuted = document.querySelector(".muted-nav");
    if (firstMuted) nav.insertBefore(btn, firstMuted); else nav.appendChild(btn);
    btn.onclick = () => navigate("importcenter");
  }

  Views.importcenter = () => {
    const s = staged();
    const h = history();
    const clean = Object.values(s).filter(x => x.rows?.length && !x.errors?.length).length;
    const blocked = Object.values(s).filter(x => x.errors?.length).length;
    return `<div class="ops-hero"><h2>CSV Import Center</h2><p>Demo-only workflow for importing pharmacy CSV sections into staging, cleaning/mapping fields, previewing validation, and integrating clean sections into the app data.</p><div class="ops-banner"><b>Demo warning:</b> do not upload real PHI, real patient identifiers, or real claim files into this public/static demo.</div></div>
      <div class="stats">${statCard("Staged sections", Object.keys(s).length, "⬆️", "waiting to integrate", "blue")}${statCard("Clean sections", clean, "✅", "ready", "green")}${statCard("Blocked sections", blocked, "⚠️", "needs cleanup", blocked ? "red" : "green")}${statCard("Import history", h.length, "🧾", "local browser", "gray")}</div>
      <div class="ops-grid">${Object.entries(TABLES).map(([type, spec]) => `<div class="ops-card"><div class="section-head"><h2>${spec.icon} ${spec.label}</h2><button class="btn sm" data-template="${type}">Template</button></div><p class="muted small">Required: ${spec.required.join(", ")}. Extra columns are ignored; common column names are mapped automatically.</p><input class="file-input" type="file" accept=".csv,text/csv" data-import-file="${type}">${s[type] ? `<div class="note-item" style="margin-top:10px"><b>${esc(s[type].fileName)}</b><div>${s[type].rows.length} cleaned row(s)</div>${s[type].errors.length ? `<div class="badge red">${s[type].errors.length} issue(s)</div>` : `<div class="badge green">Ready to integrate</div>`}</div>` : `<div class="muted small">No file staged.</div>`}</div>`).join("")}</div>
      <div class="ops-card" style="margin-top:16px"><div class="section-head"><h2>Staging review</h2><div class="row"><button class="btn" id="clearImportStage">Clear staging</button><button class="btn primary" id="integrateImports">Integrate clean files</button></div></div>${Object.entries(s).length ? Object.entries(s).map(([type, item]) => `<div class="queue-row"><span class="priority-dot ${item.errors.length ? "red" : "green"}"></span><div><b>${TABLES[type]?.label || type}</b><span class="action-note">${item.rows.length} row(s) · ${esc(item.fileName)}</span>${item.errors.map(e => `<span class="action-note" style="color:var(--danger)">${esc(e)}</span>`).join("")}</div><span class="badge ${item.errors.length ? "red" : "green"}">${item.errors.length ? "blocked" : "ready"}</span></div>`).join("") : `<div class="empty">No staged files. Upload a CSV above to start the cleaning workflow.</div>`}</div>
      <div class="ops-card" style="margin-top:16px"><div class="section-head"><h2>Recent local imports</h2></div>${h.length ? h.map(x => `<div class="note-item"><b>${new Date(x.date).toLocaleString()}</b><div>${x.tables.join(", ")} · ${Object.entries(x.counts).map(([k,v]) => `${k}:${v}`).join(" · ")}</div></div>`).join("") : `<div class="empty">No integration history yet.</div>`}</div>`;
  };

  const baseDash = Views.dashboard;
  Views.dashboard = () => `${baseDash()}<div class="ops-card" style="margin-top:16px"><div class="section-head"><h2>CSV import workflow</h2><span class="badge blue">demo data pipeline</span></div><p class="muted">Use Import Center to upload CSV sections, stage/clean them, then integrate successful files into the app data model.</p><button class="btn primary" data-go="importcenter">Open Import Center</button></div>`;

  const baseRender = render;
  render = function () {
    const result = baseRender.apply(this, arguments);
    addNav();
    document.querySelectorAll("[data-import-file]").forEach(input => input.onchange = () => handleFile(input.dataset.importFile, input));
    document.querySelectorAll("[data-template]").forEach(btn => btn.onclick = () => templateDownload(btn.dataset.template));
    const integrateBtn = document.getElementById("integrateImports"); if (integrateBtn) integrateBtn.onclick = integrate;
    const clearBtn = document.getElementById("clearImportStage"); if (clearBtn) clearBtn.onclick = clearStage;
    return result;
  };

  try { addNav(); render(); } catch (e) { console.error("Import Center failed", e); }
})();

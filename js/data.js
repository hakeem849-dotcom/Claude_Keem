/* ============================================================
   PharmaDesk — Mock data + storage layer
   All data is fictional and for demonstration only.
   Persisted in localStorage; restore anytime via "Reset demo data".
   A static copy of the seed also lives in /data/seed.json.
   ============================================================ */

const SEED = {
  meta: { generatedFor: "Independent community pharmacy demo", currency: "USD" },

  patients: [
    { id: "P-1001", first: "Maria", last: "Gonzalez", dob: "1958-03-12", sex: "F",
      phone: "(555) 201-4488", insurance: "Medicare Part D — Humana", allergies: ["Penicillin", "Sulfa"],
      conditions: ["Type 2 Diabetes", "Hypertension"], notes: "Prefers generic. Bubble-pack adherence packaging." },
    { id: "P-1002", first: "James", last: "O'Brien", dob: "1974-11-30", sex: "M",
      phone: "(555) 332-9090", insurance: "BlueCross PPO", allergies: [],
      conditions: ["Hyperlipidemia"], notes: "" },
    { id: "P-1003", first: "Aisha", last: "Khan", dob: "1991-07-22", sex: "F",
      phone: "(555) 778-1212", insurance: "Aetna HMO", allergies: ["Codeine"],
      conditions: ["Asthma"], notes: "Counsel on inhaler technique." },
    { id: "P-1004", first: "Robert", last: "Chen", dob: "1949-01-08", sex: "M",
      phone: "(555) 660-7733", insurance: "Medicare Part D — WellCare", allergies: ["Aspirin"],
      conditions: ["Atrial Fibrillation", "CKD Stage 3"], notes: "On warfarin — INR monitoring." },
    { id: "P-1005", first: "Latoya", last: "Williams", dob: "1986-09-17", sex: "F",
      phone: "(555) 414-5566", insurance: "Cash / Self-pay", allergies: [],
      conditions: ["Depression", "Migraine"], notes: "Enrolled in $4 generic program." },
    { id: "P-1006", first: "Henry", last: "Schmidt", dob: "1962-05-03", sex: "M",
      phone: "(555) 909-2231", insurance: "Cigna PPO", allergies: ["NSAIDs"],
      conditions: ["GERD", "Chronic Pain"], notes: "PMP reviewed — opioid therapy." }
  ],

  // Inventory / formulary. schedule: 0 = non-controlled, 2-5 = DEA schedule.
  // expReimb = expected third-party reimbursement per unit; dirRate = typical
  // DIR / price-concession clawback as a fraction of reimbursement. Together
  // they drive the projected margin and below-cost dispensing warnings.
  inventory: [
    { id: "D-001", name: "Lisinopril", strength: "10 mg", form: "tablet", ndc: "00093-1036-01",
      class: "ACE inhibitor", stock: 420, reorder: 150, cost: 0.04, price: 0.18, expReimb: 0.11, dirRate: 0.12, expiry: "2027-04-30", schedule: 0 },
    { id: "D-002", name: "Metformin", strength: "500 mg", form: "tablet", ndc: "00378-0221-05",
      class: "Biguanide", stock: 95, reorder: 200, cost: 0.03, price: 0.12, expReimb: 0.025, dirRate: 0.10, expiry: "2026-09-30", schedule: 0 },
    { id: "D-003", name: "Atorvastatin", strength: "20 mg", form: "tablet", ndc: "00071-0156-23",
      class: "Statin", stock: 610, reorder: 200, cost: 0.06, price: 0.22, expReimb: 0.13, dirRate: 0.12, expiry: "2027-01-31", schedule: 0 },
    { id: "D-004", name: "Amoxicillin", strength: "500 mg", form: "capsule", ndc: "65862-0418-01",
      class: "Penicillin antibiotic", stock: 240, reorder: 100, cost: 0.07, price: 0.30, expReimb: 0.17, dirRate: 0.10, expiry: "2026-07-15", schedule: 0 },
    { id: "D-005", name: "Warfarin", strength: "5 mg", form: "tablet", ndc: "00056-0176-70",
      class: "Anticoagulant", stock: 80, reorder: 60, cost: 0.10, price: 0.35, expReimb: 0.15, dirRate: 0.10, expiry: "2026-08-31", schedule: 0 },
    { id: "D-006", name: "Albuterol HFA", strength: "90 mcg", form: "inhaler", ndc: "00173-0682-20",
      class: "SABA bronchodilator", stock: 34, reorder: 25, cost: 18.50, price: 42.00, expReimb: 17.80, dirRate: 0.06, expiry: "2026-10-31", schedule: 0 },
    { id: "D-007", name: "Sertraline", strength: "50 mg", form: "tablet", ndc: "00071-0156-40",
      class: "SSRI", stock: 300, reorder: 120, cost: 0.05, price: 0.20, expReimb: 0.12, dirRate: 0.12, expiry: "2027-03-31", schedule: 0 },
    { id: "D-008", name: "Oxycodone/APAP", strength: "5/325 mg", form: "tablet", ndc: "00603-3490-21",
      class: "Opioid analgesic", stock: 145, reorder: 80, cost: 0.22, price: 0.85, expReimb: 0.46, dirRate: 0.05, expiry: "2026-12-31", schedule: 2 },
    { id: "D-009", name: "Alprazolam", strength: "0.5 mg", form: "tablet", ndc: "00009-0029-01",
      class: "Benzodiazepine", stock: 60, reorder: 50, cost: 0.08, price: 0.40, expReimb: 0.095, dirRate: 0.05, expiry: "2026-06-30", schedule: 4 },
    { id: "D-010", name: "Omeprazole", strength: "20 mg", form: "capsule", ndc: "00904-5325-61",
      class: "PPI", stock: 175, reorder: 120, cost: 0.05, price: 0.21, expReimb: 0.12, dirRate: 0.12, expiry: "2026-07-31", schedule: 0 },
    { id: "D-011", name: "Amlodipine", strength: "5 mg", form: "tablet", ndc: "00093-0817-01",
      class: "Calcium channel blocker", stock: 28, reorder: 100, cost: 0.04, price: 0.16, expReimb: 0.034, dirRate: 0.10, expiry: "2027-02-28", schedule: 0 },
    { id: "D-012", name: "Sumatriptan", strength: "50 mg", form: "tablet", ndc: "00078-0486-15",
      class: "Triptan", stock: 110, reorder: 40, cost: 0.45, price: 1.30, expReimb: 0.95, dirRate: 0.10, expiry: "2026-11-30", schedule: 0 }
  ],

  prescriptions: [
    { id: "RX-50231", patientId: "P-1001", drugId: "D-002", sig: "Take 1 tablet by mouth twice daily",
      qty: 60, daysSupply: 30, refills: 5, prescriber: "Dr. A. Patel", written: "2026-06-01",
      status: "verification" },
    { id: "RX-50232", patientId: "P-1001", drugId: "D-001", sig: "Take 1 tablet by mouth daily",
      qty: 30, daysSupply: 30, refills: 11, prescriber: "Dr. A. Patel", written: "2026-06-01",
      status: "verification" },
    { id: "RX-50233", patientId: "P-1003", drugId: "D-006", sig: "Inhale 2 puffs every 4-6 hours as needed",
      qty: 1, daysSupply: 30, refills: 2, prescriber: "Dr. L. Moore", written: "2026-06-10",
      status: "filling" },
    { id: "RX-50234", patientId: "P-1006", drugId: "D-008", sig: "Take 1 tablet by mouth every 6 hours as needed for pain",
      qty: 40, daysSupply: 10, refills: 0, prescriber: "Dr. R. Diaz", written: "2026-06-11",
      status: "pmp-review" },
    { id: "RX-50235", patientId: "P-1004", drugId: "D-005", sig: "Take 1 tablet by mouth daily as directed",
      qty: 30, daysSupply: 30, refills: 3, prescriber: "Dr. K. Nguyen", written: "2026-06-09",
      status: "ready" },
    { id: "RX-50236", patientId: "P-1002", drugId: "D-003", sig: "Take 1 tablet by mouth at bedtime",
      qty: 30, daysSupply: 30, refills: 5, prescriber: "Dr. S. Webb", written: "2026-06-08",
      status: "ready" },
    { id: "RX-50237", patientId: "P-1005", drugId: "D-007", sig: "Take 1 tablet by mouth every morning",
      qty: 30, daysSupply: 30, refills: 2, prescriber: "Dr. J. Field", written: "2026-06-05",
      status: "intake" },
    { id: "RX-50238", patientId: "P-1005", drugId: "D-012", sig: "Take 1 tablet at onset of migraine, may repeat after 2h",
      qty: 9, daysSupply: 30, refills: 1, prescriber: "Dr. J. Field", written: "2026-06-05",
      status: "intake" },
    { id: "RX-50220", patientId: "P-1002", drugId: "D-010", sig: "Take 1 capsule by mouth before breakfast",
      qty: 30, daysSupply: 30, refills: 0, prescriber: "Dr. S. Webb", written: "2026-05-10",
      status: "dispensed", dispensedOn: "2026-05-11", maintenance: true, pdc: 0.91 },
    { id: "RX-50221", patientId: "P-1006", drugId: "D-009", sig: "Take 1 tablet by mouth at bedtime as needed",
      qty: 30, daysSupply: 30, refills: 1, prescriber: "Dr. R. Diaz", written: "2026-05-20",
      status: "dispensed", dispensedOn: "2026-05-21", maintenance: false, pdc: 0.78 },
    { id: "RX-50222", patientId: "P-1001", drugId: "D-004", sig: "Take 1 capsule by mouth three times daily for 10 days",
      qty: 30, daysSupply: 10, refills: 0, prescriber: "Dr. A. Patel", written: "2026-05-28",
      status: "dispensed", dispensedOn: "2026-05-28", maintenance: false },
    { id: "RX-50210", patientId: "P-1001", drugId: "D-001", sig: "Take 1 tablet by mouth daily",
      qty: 30, daysSupply: 30, refills: 10, prescriber: "Dr. A. Patel", written: "2026-04-28",
      status: "dispensed", dispensedOn: "2026-04-29", maintenance: true, pdc: 0.62 },
    { id: "RX-50211", patientId: "P-1004", drugId: "D-005", sig: "Take 1 tablet by mouth daily as directed",
      qty: 30, daysSupply: 30, refills: 4, prescriber: "Dr. K. Nguyen", written: "2026-05-08",
      status: "dispensed", dispensedOn: "2026-05-09", maintenance: true, pdc: 0.95 },
    { id: "RX-50212", patientId: "P-1002", drugId: "D-003", sig: "Take 1 tablet by mouth at bedtime",
      qty: 30, daysSupply: 30, refills: 6, prescriber: "Dr. S. Webb", written: "2026-05-06",
      status: "dispensed", dispensedOn: "2026-05-07", maintenance: true, pdc: 0.88 }
  ],

  // Third-party claim adjudication records (keyed to a prescription).
  // dirFee = retroactive DIR / pharmacy price-concession clawback (the silent
  // margin killer). appealStatus tracks a MAC (max allowable cost) appeal.
  claims: [
    { id: "CLM-9001", rxId: "RX-50220", payer: "BlueCross PPO", bin: "610502", pcn: "BCBSRX",
      billed: 12.60, paid: 9.10, copay: 3.50, status: "paid", rejectCode: "",
      dirFee: 2.10, appealStatus: "none", recovered: 0 },
    { id: "CLM-9002", rxId: "RX-50221", payer: "Cigna PPO", bin: "017010", pcn: "CIGRX",
      billed: 18.00, paid: 13.00, copay: 5.00, status: "paid", rejectCode: "",
      dirFee: 3.50, appealStatus: "none", recovered: 0 },
    { id: "CLM-9003", rxId: "RX-50222", payer: "Medicare Part D — Humana", bin: "610649", pcn: "HUMRX",
      billed: 18.00, paid: 0, copay: 0, status: "rejected", rejectCode: "75 — Prior authorization required",
      dirFee: 0, appealStatus: "none", recovered: 0 },
    { id: "CLM-9004", rxId: "RX-50210", payer: "Medicare Part D — Humana", bin: "610649", pcn: "HUMRX",
      billed: 9.00, paid: 0.80, copay: 0.30, status: "paid", rejectCode: "",
      dirFee: 1.40, appealStatus: "submitted", recovered: 0 },
    { id: "CLM-9005", rxId: "RX-50211", payer: "Medicare Part D — WellCare", bin: "603286", pcn: "WCRX",
      billed: 12.25, paid: 0, copay: 0, status: "rejected", rejectCode: "70 — Product not covered (non-formulary)",
      dirFee: 0, appealStatus: "none", recovered: 0 },
    { id: "CLM-9006", rxId: "RX-50212", payer: "BlueCross PPO", bin: "610502", pcn: "BCBSRX",
      billed: 9.90, paid: 1.40, copay: 0.50, status: "paid", rejectCode: "",
      dirFee: 4.30, appealStatus: "none", recovered: 0 }
  ],

  // PBM / DEA audits — recoupment risk and paperwork burden
  audits: [
    { id: "AUD-22-014", pbm: "Caremark", type: "Desk audit", status: "open",
      started: "2026-05-28", due: "2026-06-18", claims: 42, amountAtRisk: 8450.00, recouped: 0,
      reason: "Refill-too-soon & days-supply discrepancies",
      action: "Upload signature logs + hard copies for 42 flagged claims by due date." },
    { id: "AUD-22-009", pbm: "OptumRx", type: "On-site audit", status: "responded",
      started: "2026-04-10", due: "2026-05-10", claims: 120, amountAtRisk: 15200.00, recouped: 3100.00,
      reason: "Invoice reconciliation (wholesaler purchases vs. units dispensed)",
      action: "Awaiting findings letter; partial recoupment proposed." },
    { id: "AUD-21-101", pbm: "Express Scripts", type: "Desk audit", status: "closed",
      started: "2026-01-15", due: "2026-02-15", claims: 30, amountAtRisk: 5400.00, recouped: 1200.00,
      reason: "Missing prescriber DEA on C-II claims",
      action: "Closed — recoupment reduced after appeal." }
  ],

  // Audit-readiness scorecard (common audit triggers)
  auditReadiness: [
    { id: "AR1", item: "Patient signature logs captured for every pickup", ok: true,
      detail: "Electronic signature log current." },
    { id: "AR2", item: "Hard copy on file for every C-II dispense", ok: false,
      detail: "2 of 5 C-II hard copies not yet scanned." },
    { id: "AR3", item: "Days supply matches quantity ÷ directions", ok: false,
      detail: "1 claim flagged for qty/sig mismatch." },
    { id: "AR4", item: "DAW codes documented where brand dispensed", ok: true,
      detail: "All DAW codes present." },
    { id: "AR5", item: "Prescriber DEA validated on controlled Rx", ok: true,
      detail: "DEA numbers verified." },
    { id: "AR6", item: "Wholesaler invoices reconciled to dispensing", ok: false,
      detail: "April purchase invoices not yet reconciled." }
  ],

  // Licenses, registrations & credentials (the renewal paperwork treadmill)
  credentials: [
    { id: "CR1", name: "State Pharmacy Permit", holder: "PharmaDesk Pharmacy",
      authority: "State Board of Pharmacy", number: "PH-•••842", expires: "2026-07-31", renewalCost: 380 },
    { id: "CR2", name: "DEA Registration", holder: "PharmaDesk Pharmacy",
      authority: "US DEA", number: "BP•••4471", expires: "2026-09-30", renewalCost: 888 },
    { id: "CR3", name: "Pharmacist-in-Charge License", holder: "K. Adeyemi, PharmD",
      authority: "State Board of Pharmacy", number: "RPH-•••203", expires: "2026-06-30", renewalCost: 250 },
    { id: "CR4", name: "Professional & General Liability Insurance", holder: "PharmaDesk Pharmacy",
      authority: "Pharmacists Mutual", number: "POL-•••6650", expires: "2026-12-31", renewalCost: 4200 },
    { id: "CR5", name: "NCPDP / NPI Credentialing", holder: "PharmaDesk Pharmacy",
      authority: "NCPDP", number: "NCPDP •••118", expires: "2027-03-01", renewalCost: 0 },
    { id: "CR6", name: "Immunization Certification", holder: "K. Adeyemi, PharmD",
      authority: "APhA", number: "IZ-•••77", expires: "2026-08-15", renewalCost: 0 },
    { id: "CR7", name: "PMP / PDMP Account", holder: "K. Adeyemi, PharmD",
      authority: "State PDMP", number: "PMP-•••12", expires: "2026-06-20", renewalCost: 0 }
  ],

  // Medication Therapy Management / counseling task list
  mtmTasks: [
    { id: "MTM-301", patientId: "P-1001", type: "Comprehensive Medication Review", due: "2026-06-20",
      note: "Annual CMR — diabetes + hypertension polypharmacy.", done: false },
    { id: "MTM-302", patientId: "P-1004", type: "New therapy counseling", due: "2026-06-15",
      note: "Warfarin — diet/INR education, bleeding precautions.", done: false },
    { id: "MTM-303", patientId: "P-1003", type: "Device technique", due: "2026-06-18",
      note: "Albuterol inhaler technique check.", done: false },
    { id: "MTM-304", patientId: "P-1006", type: "Opioid safety counseling", due: "2026-06-14",
      note: "Offer naloxone; review benzodiazepine co-use risk.", done: false }
  ],

  immunizations: [
    { id: "IZ-7001", patientId: "P-1001", vaccine: "Influenza (quadrivalent)", date: "2025-10-04", lot: "FLU2025-A", site: "L deltoid" },
    { id: "IZ-7002", patientId: "P-1004", vaccine: "Pneumococcal (PCV20)", date: "2026-02-18", lot: "PNE-2231", site: "R deltoid" },
    { id: "IZ-7003", patientId: "P-1002", vaccine: "Tdap", date: "2026-04-22", lot: "TDP-9087", site: "L deltoid" },
    { id: "IZ-7004", patientId: "P-1003", vaccine: "COVID-19 (2025-26 formula)", date: "2025-11-12", lot: "CV-5521", site: "R deltoid" }
  ],

  // Pairwise interaction knowledge base keyed by drug class
  interactionRules: [
    { a: "Anticoagulant", b: "Penicillin antibiotic", severity: "moderate",
      effect: "Antibiotics may potentiate warfarin's effect — increased bleeding/INR.",
      action: "Monitor INR closely during and after antibiotic course." },
    { a: "Anticoagulant", b: "NSAID", severity: "major",
      effect: "Additive bleeding risk and GI ulceration.",
      action: "Avoid combination; prefer acetaminophen for analgesia." },
    { a: "Opioid analgesic", b: "Benzodiazepine", severity: "major",
      effect: "Additive CNS/respiratory depression — risk of fatal overdose (FDA boxed warning).",
      action: "Avoid co-prescribing. If unavoidable, lowest dose, counsel on naloxone." },
    { a: "SSRI", b: "Triptan", severity: "moderate",
      effect: "Theoretical risk of serotonin syndrome.",
      action: "Counsel patient on symptoms; usually acceptable to combine with monitoring." },
    { a: "ACE inhibitor", b: "NSAID", severity: "moderate",
      effect: "Reduced antihypertensive effect; risk of acute kidney injury (esp. with diuretic).",
      action: "Monitor BP and renal function; limit NSAID use." },
    { a: "SSRI", b: "Anticoagulant", severity: "moderate",
      effect: "Increased bleeding risk due to impaired platelet function.",
      action: "Monitor for bleeding signs; consider GI protection." },
    { a: "PPI", b: "Anticoagulant", severity: "minor",
      effect: "Possible modest increase in warfarin effect.",
      action: "Routine INR monitoring is sufficient." }
  ]
};

/* ---------- Storage layer ----------
   Persists to localStorage when available, with an in-memory fallback so the
   app still works when opened from a file:// URL or in private mode (some
   browsers throw on localStorage access in those contexts). */
const Store = (() => {
  const KEY = "pharmadesk.v1";
  // Bump SCHEMA whenever the seed shape changes so returning users with stale
  // localStorage are re-seeded instead of rendering a broken/old dataset.
  const SCHEMA = 3;

  const hasLS = (() => {
    try { const k = "__pd_test"; localStorage.setItem(k, "1"); localStorage.removeItem(k); return true; }
    catch (e) { console.warn("localStorage unavailable — using in-memory store", e); return false; }
  })();
  let memory = null; // in-memory fallback

  function load() {
    if (hasLS) {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.__schema === SCHEMA) return parsed;
          // stale/older shape — fall through to a fresh seed
        }
      } catch (e) { console.warn("Load failed, seeding fresh", e); }
    } else if (memory && memory.__schema === SCHEMA) {
      return memory;
    }
    return reset();
  }
  function save(state) {
    memory = state;
    if (hasLS) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* keep memory copy */ } }
  }
  function reset() {
    const fresh = JSON.parse(JSON.stringify(SEED));
    fresh.__schema = SCHEMA;
    save(fresh);
    return fresh;
  }

  let state = load();

  return {
    get all() { return state; },
    get patients() { return state.patients; },
    get inventory() { return state.inventory; },
    get prescriptions() { return state.prescriptions; },
    get immunizations() { return state.immunizations; },
    get interactionRules() { return state.interactionRules; },
    get claims() { return state.claims; },
    get mtmTasks() { return state.mtmTasks; },
    get audits() { return state.audits; },
    get auditReadiness() { return state.auditReadiness; },
    get credentials() { return state.credentials; },
    commit() { save(state); },
    reset() { state = reset(); return state; },
    findPatient(id) { return state.patients.find(p => p.id === id); },
    findDrug(id) { return state.inventory.find(d => d.id === id); }
  };
})();

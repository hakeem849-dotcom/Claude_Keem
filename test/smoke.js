#!/usr/bin/env node
/* Headless smoke tests for PharmaDesk. No dependencies. Run: node test/smoke.js
   1) Store boots when localStorage is blocked (file:// / private mode).
   2) Every view renders to a non-empty HTML string without throwing. */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
let failures = 0;

// 1) storage fallback when localStorage throws
(() => {
  global.localStorage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); }
  };
  const warn = console.warn; console.warn = () => {};
  const Store = new Function(read("js/data.js") + "\n; return Store;")();
  console.warn = warn;
  if (Store.patients.length === 6 && Store.claims.length === 6) {
    console.log("✓ storage fallback works with blocked localStorage");
  } else {
    console.error("✗ storage fallback returned unexpected data"); failures++;
  }
})();

// 2) every view renders against a stubbed DOM
(() => {
  const store = {};
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const el = () => ({
    style: {}, dataset: {},
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    value: "", textContent: "", innerHTML: "",
    appendChild() {}, remove() {}, focus() {}, setSelectionRange() {},
    reportValidity() { return true; }, addEventListener() {},
    querySelector() { return el(); }, querySelectorAll() { return []; }
  });
  global.document = {
    querySelector: () => el(), querySelectorAll: () => [],
    getElementById: () => el(), addEventListener: () => {}, createElement: () => el()
  };
  global.window = { addEventListener: () => {} };
  global.confirm = () => true;

  const { Views, REPORTS, buildPacket } = new Function(
    read("js/data.js") + "\n" + read("js/app.js") + "\n; return { Views, REPORTS, buildPacket };")();
  const names = ["dashboard", "prescriptions", "patients", "inventory", "interactions",
    "claims", "reimbursement", "refills", "controlled", "immunizations", "audits",
    "compliance", "reportcenter", "reports"];
  for (const n of names) {
    try {
      const html = Views[n]();
      if (typeof html !== "string" || html.length < 20) throw new Error("empty output");
      console.log(`✓ view renders: ${n}`);
    } catch (e) {
      console.error(`✗ view failed: ${n} -> ${e.message}`); failures++;
    }
  }

  // exercise every report builder + the reimbursement packet
  for (const key of Object.keys(REPORTS)) {
    try {
      const b = REPORTS[key].build();
      if (!Array.isArray(b.cols) || !Array.isArray(b.rows)) throw new Error("bad shape");
      console.log(`✓ report builds: ${key} (${b.rows.length} rows)`);
    } catch (e) {
      console.error(`✗ report failed: ${key} -> ${e.message}`); failures++;
    }
  }
  try {
    const pk = buildPacket();
    if (!Array.isArray(pk.rows)) throw new Error("bad packet");
    console.log(`✓ reimbursement packet builds (${pk.rows.length} claims)`);
  } catch (e) {
    console.error(`✗ packet failed -> ${e.message}`); failures++;
  }
})();

console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
process.exit(failures ? 1 : 0);

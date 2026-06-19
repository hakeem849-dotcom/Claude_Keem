#!/usr/bin/env node
/* PostToolUse hook: after Claude edits a file, validate it.
   - *.js / *.mjs / *.cjs  -> `node --check` (catches syntax errors immediately)
   - *.json                -> JSON.parse (catches malformed JSON)
   Dependency-free. Exit code 2 feeds the error back to Claude so it can fix it. */
const fs = require("fs");
const { execSync } = require("child_process");

let raw = "";
try { raw = fs.readFileSync(0, "utf8"); } catch (e) { process.exit(0); }

let data = {};
try { data = JSON.parse(raw || "{}"); } catch (e) { process.exit(0); }

const ti = data.tool_input || {};
const file = ti.file_path || ti.path || "";
if (!file || !fs.existsSync(file)) process.exit(0);

try {
  if (/\.(js|mjs|cjs)$/.test(file)) {
    execSync(`node --check "${file}"`, { stdio: ["ignore", "ignore", "pipe"] });
  } else if (/\.json$/.test(file)) {
    JSON.parse(fs.readFileSync(file, "utf8"));
  }
} catch (e) {
  const msg = (e.stderr && e.stderr.toString().trim()) || e.message || String(e);
  process.stderr.write(`[check-edit] validation failed for ${file}:\n${msg}\n`);
  process.exit(2);
}
process.exit(0);

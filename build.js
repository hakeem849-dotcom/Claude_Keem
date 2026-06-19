#!/usr/bin/env node
/* Build a single self-contained HTML file (dist/pharmadesk.html) by inlining
   every local stylesheet and script referenced by index.html. Remote URLs
   (fonts) and PWA-only bits are dropped so the file works offline from disk.
   No dependencies. Run: node build.js */
const fs = require("fs");
const path = require("path");

const read = (p) => fs.readFileSync(p, "utf8");
let html = read("index.html");

// inline local <link rel="stylesheet" href="local.css">
html = html.replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/g, (m, href) => {
  if (/^https?:|^\/\//.test(href)) return ""; // drop remote stylesheets (fonts)
  return `<style>\n${read(href)}\n</style>`;
});

// inline local <script src="local.js"></script>
html = html.replace(/<script\s+src="([^"]+)"><\/script>/g, (m, src) => {
  if (/^https?:|^\/\//.test(src)) return m;
  return `<script>\n${read(src)}\n</script>`;
});

// remove things that cannot work from a single offline file://
html = html
  .replace(/\s*<link rel="manifest"[^>]*>/, "")
  .replace(/\s*<link rel="preconnect"[^>]*>/g, "")
  .replace(/\s*<script>\s*\/\/ Register service worker[\s\S]*?<\/script>/, "");

const left = (html.match(/href="(?!https?:)[^"]*\.(css)"|src="(?!https?:)[^"]*\.(js)"/g) || []).length;
if (left > 0) {
  console.error(`Build error: ${left} local reference(s) remain unreplaced. ` +
    `Did the markup in index.html change?`);
  process.exit(1);
}

fs.mkdirSync("dist", { recursive: true });
const out = path.join("dist", "pharmadesk.html");
fs.writeFileSync(out, html);
console.log(`Built ${out} (${(html.length / 1024).toFixed(1)} KB)`);

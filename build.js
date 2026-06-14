#!/usr/bin/env node
/* Build a single self-contained HTML file (dist/pharmadesk.html) by inlining
   the CSS and JS into index.html. No dependencies. Run: node build.js */
const fs = require("fs");
const path = require("path");

const html0 = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("css/styles.css", "utf8");
const data = fs.readFileSync("js/data.js", "utf8");
const app = fs.readFileSync("js/app.js", "utf8");

let html = html0
  .replace('<link rel="stylesheet" href="css/styles.css" />', `<style>\n${css}\n</style>`)
  .replace(
    /<script src="js\/data\.js"><\/script>\s*<script src="js\/app\.js"><\/script>/,
    `<script>\n${data}\n</script>\n<script>\n${app}\n</script>`
  )
  // remove PWA references that cannot work from a single offline file
  .replace(/\s*<link rel="manifest"[^>]*>/, "")
  .replace(/\s*<script>\s*\/\/ Register service worker[\s\S]*?<\/script>/, "");

const left = (html.match(/href="css\/|src="js\/|href="manifest/g) || []).length;
if (left > 0) {
  console.error(`Build error: ${left} external reference(s) remain unreplaced. ` +
    `Did the markup in index.html change?`);
  process.exit(1);
}

fs.mkdirSync("dist", { recursive: true });
const out = path.join("dist", "pharmadesk.html");
fs.writeFileSync(out, html);
console.log(`Built ${out} (${(html.length / 1024).toFixed(1)} KB)`);

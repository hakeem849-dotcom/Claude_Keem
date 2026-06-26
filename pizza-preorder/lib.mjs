// Shared helpers for the Hotplate pre-order scripts.
import { chromium } from "playwright";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

export const __dirname = dirname(fileURLToPath(import.meta.url));

// A single persistent browser profile keeps you logged in between runs and
// remembers the contact / payment details Hotplate stores for you. Log in once
// (npm run login) and every later run reuses this folder.
export const PROFILE_DIR = join(__dirname, ".profile");

export function loadConfig() {
  const path = join(__dirname, "config.json");
  if (!existsSync(path)) {
    console.error(
      "No config.json found. Copy config.example.json to config.json and edit it.",
    );
    process.exit(1);
  }
  const cfg = JSON.parse(readFileSync(path, "utf8"));
  if (!cfg.storeUrl) {
    console.error("config.json is missing storeUrl (e.g. https://www.hotplate.com/akpizza).");
    process.exit(1);
  }
  return cfg;
}

// Launch a persistent context. Headed by default so you can watch / intervene;
// using your real Chrome ("chrome" channel) looks more like a normal customer
// than the bundled Chromium, which some sites treat differently.
export async function launchBrowser(cfg) {
  const launchOpts = {
    headless: cfg.headless ?? false,
    slowMo: cfg.slowMoMs ?? 0,
    viewport: null,
    args: ["--start-maximized"],
  };
  if (cfg.executablePath) launchOpts.executablePath = cfg.executablePath;
  else if (cfg.browserChannel) launchOpts.channel = cfg.browserChannel;

  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, launchOpts);
  ctx.setDefaultTimeout(15000);
  return ctx;
}

export function shotDir(cfg) {
  const dir = resolve(__dirname, cfg.screenshotDir || "runs");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

let shotCount = 0;
export async function snap(page, cfg, label) {
  try {
    const name = `${String(++shotCount).padStart(2, "0")}-${label}.png`;
    const file = join(shotDir(cfg), name);
    await page.screenshot({ path: file, fullPage: false });
    log(`  📸 ${name}`);
    return file;
  } catch {
    /* best effort */
    return null;
  }
}

export function log(...args) {
  const t = new Date().toISOString().slice(11, 23);
  console.log(`[${t}]`, ...args);
}

// Push a phone notification via ntfy.sh (free, no account: install the ntfy app,
// subscribe to your topic). Configure with notify.ntfyTopic in config.json.
// No-op if not configured, and never throws — notifications must not slow or
// break the actual ordering.
export async function notify(cfg, message, { title = "🍕 Pizza bot", priority = "default" } = {}) {
  const topic = cfg?.notify?.ntfyTopic;
  if (!topic) return;
  const base = cfg.notify.ntfyServer || "https://ntfy.sh";
  try {
    await fetch(`${base}/${topic}`, {
      method: "POST",
      headers: { Title: title, Priority: priority, Tags: "pizza" },
      body: message,
    });
  } catch {
    /* best effort */
  }
}

// Push an image (e.g. a screenshot file) to the same ntfy topic.
export async function notifyImage(cfg, filePath, caption = "") {
  const topic = cfg?.notify?.ntfyTopic;
  if (!topic) return;
  const base = cfg.notify.ntfyServer || "https://ntfy.sh";
  try {
    const buf = readFileSync(filePath);
    await fetch(`${base}/${topic}`, {
      method: "PUT",
      headers: {
        Filename: "screenshot.png",
        Title: "🍕 Pizza bot",
        Message: caption,
      },
      body: buf,
    });
  } catch {
    /* best effort */
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wait until a wall-clock target, logging a countdown. Returns immediately if
// the target is in the past or not set.
export async function waitUntil(targetIso, label = "drop") {
  if (!targetIso) return;
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) {
    log(`⚠️  Could not parse dropOpensAt="${targetIso}"; continuing now.`);
    return;
  }
  let last = -1;
  while (Date.now() < target) {
    const secs = Math.ceil((target - Date.now()) / 1000);
    if (secs !== last && (secs <= 10 || secs % 15 === 0)) {
      log(`⏳ ${secs}s until ${label}`);
      last = secs;
    }
    await sleep(secs > 5 ? 500 : 50);
  }
  log(`🚀 ${label} time reached.`);
}

// Try a list of locator factories in order; return the first that resolves to a
// visible element. Keeps the script working even if Hotplate tweaks its markup.
export async function firstVisible(page, factories, { timeout = 8000 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const make of factories) {
      try {
        const loc = make();
        if (await loc.first().isVisible()) return loc.first();
      } catch {
        /* try next */
      }
    }
    await sleep(150);
  }
  return null;
}

// One-time login. Opens the store in a persistent browser profile so you can
// sign in (Hotplate uses an SMS code) and let it remember your contact and
// payment details. After this, preorder.mjs reuses the same session.
//
//   npm run login
//
import { loadConfig, launchBrowser, log, sleep } from "./lib.mjs";

const cfg = loadConfig();
const ctx = await launchBrowser({ ...cfg, headless: false });
const page = ctx.pages()[0] || (await ctx.newPage());

await page.goto(cfg.storeUrl, { waitUntil: "domcontentloaded" });

async function saveAndExit() {
  // Give the browser a moment to flush cookies/storage to the profile dir.
  await sleep(500);
  await ctx.close().catch(() => {});
  log("✅ Session saved. You're ready — run the pre-order on drop day.");
  process.exit(0);
}

log("──────────────────────────────────────────────────────────");
log("Log in now in the browser window (phone number + SMS code).");
log("If you can, place a small test order another day so Hotplate");
log("saves your contact + card — that makes drop-day checkout instant.");
log("──────────────────────────────────────────────────────────");

if (process.stdin.isTTY) {
  // Local desktop: press Enter when done.
  log("When you're logged in, press ENTER here to save and close.");
  await new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", resolve);
  });
  await saveAndExit();
} else {
  // Cloud (noVNC) desktop: no terminal to press Enter in. Keep the browser open;
  // the session is saved when the container is stopped (docker compose stop
  // sends SIGTERM) or after the safety timeout below.
  log("Cloud mode: log in via the noVNC window in your phone's browser.");
  log("When done, run `docker compose stop login` — the session saves on exit.");
  process.on("SIGTERM", saveAndExit);
  process.on("SIGINT", saveAndExit);
  await sleep(60 * 60 * 1000); // 1h safety cap, then save anyway
  await saveAndExit();
}

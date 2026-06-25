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

log("──────────────────────────────────────────────────────────");
log("Log in now in the browser window (phone number + SMS code).");
log("If you can, place a small test order another day so Hotplate");
log("saves your contact + card — that makes drop-day checkout instant.");
log("");
log("When you're done and see you're logged in, come back here and");
log("press ENTER to save the session and close.");
log("──────────────────────────────────────────────────────────");

await new Promise((resolve) => {
  process.stdin.resume();
  process.stdin.once("data", resolve);
});

// Give the browser a moment to flush cookies/storage to the profile dir.
await sleep(500);
await ctx.close();
log("✅ Session saved. You're ready — run `npm run preorder` on drop day.");
process.exit(0);

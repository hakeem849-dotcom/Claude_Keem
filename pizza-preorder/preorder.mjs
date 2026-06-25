// Race a Hotplate drop and pre-order your items before they sell out.
//
//   npm run preorder           # full run (honours autoSubmit in config)
//   npm run dry-run            # stops just before placing the order
//
// Prereqs: run `npm run login` once so the browser profile is signed in.
//
// Because Hotplate can change its markup, locators below try several strategies
// (role, text, common attributes). Screenshots are saved to ./runs for every
// step so you can see exactly what happened and tweak a selector if needed.
import {
  loadConfig,
  launchBrowser,
  waitUntil,
  firstVisible,
  snap,
  log,
  sleep,
} from "./lib.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const cfg = loadConfig();

const ctx = await launchBrowser(cfg);
const page = ctx.pages()[0] || (await ctx.newPage());

async function gotoStore() {
  await page.goto(cfg.storeUrl, { waitUntil: "domcontentloaded" }).catch(() => {});
}

// ---- 1. Park on the page and wait for the open time -----------------------
log(`Opening ${cfg.storeUrl}`);
await gotoStore();
await snap(page, cfg, "parked");

if (cfg.dropOpensAt) {
  // Wait until just before open, then start hammering reloads so we catch the
  // exact moment items go live instead of waiting on a stale page.
  const arm = (cfg.armSecondsBefore ?? 20) * 1000;
  const target = new Date(cfg.dropOpensAt).getTime();
  if (!Number.isNaN(target)) {
    await waitUntil(new Date(target - arm).toISOString(), "arming");
  }
}

// ---- 2. Detect that the drop is open --------------------------------------
// We consider it "open" when at least one add-to-cart / quantity control for a
// real item appears. Keep reloading until then (or 2 min past target).
const addButtonFactories = () => [
  () => page.getByRole("button", { name: /add to cart|add to bag/i }),
  () => page.getByRole("button", { name: /^add$/i }),
  () => page.locator('button:has-text("Add")'),
  () => page.locator('[data-testid*="add"]'),
];

log("Waiting for the drop to open…");
const hardDeadline = Date.now() + 2 * 60 * 1000;
let open = false;
while (Date.now() < hardDeadline) {
  const btn = await firstVisible(page, addButtonFactories(), { timeout: 1000 });
  if (btn) {
    open = true;
    break;
  }
  await gotoStore();
  await sleep(cfg.reloadIntervalMs ?? 350);
}

if (!open) {
  log("❌ Never saw add-to-cart controls. The drop may not be open, the page");
  log("   markup may have changed, or you may be in a queue. Check ./runs.");
  await snap(page, cfg, "not-open");
  if (!cfg.headless) {
    log("Leaving the browser open so you can finish manually. Ctrl+C to quit.");
    await sleep(10 * 60 * 1000);
  }
  await ctx.close();
  process.exit(1);
}

log("✅ Drop is open — adding items.");
await snap(page, cfg, "open");

// ---- 3. Add each configured item to the cart ------------------------------
async function setQuantity(scope, qty) {
  if (!qty || qty <= 1) return;
  // Try a numeric input first, otherwise click a "+" stepper qty-1 times.
  const input = scope.locator('input[type="number"], input[name*="quant" i]').first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill(String(qty)).catch(() => {});
    return;
  }
  const plus = scope.getByRole("button", { name: /^\+$|increase|add one|plus/i }).first();
  for (let i = 1; i < qty; i++) {
    if (await plus.isVisible().catch(() => false)) await plus.click().catch(() => {});
  }
}

for (const item of cfg.items || []) {
  const name = item.name;
  log(`→ Adding "${name}" x${item.quantity || 1}`);

  // Find the card/section for this item by its visible name, then act within it.
  const card = await firstVisible(
    page,
    [
      () => page.locator("article", { hasText: name }),
      () => page.locator('[class*="card" i]', { hasText: name }),
      () => page.locator("li", { hasText: name }),
      () => page.locator("div", { hasText: name }),
      () => page.getByText(name, { exact: false }),
    ],
    { timeout: 5000 },
  );

  if (!card) {
    log(`   ⚠️  Couldn't find "${name}" on the page — skipping.`);
    continue;
  }

  // Some Hotplate menus open a modal when you click the item, with the qty +
  // add button inside it. Click the item first; harmless if there's no modal.
  await card.click({ timeout: 2000 }).catch(() => {});
  await sleep(300);

  const scope = page; // modal (if any) is part of the page DOM
  await setQuantity(scope, item.quantity || 1);

  const addBtn = await firstVisible(scope, addButtonFactories(), { timeout: 4000 });
  if (!addBtn) {
    log(`   ⚠️  No add-to-cart button for "${name}" (sold out?).`);
    await snap(page, cfg, `no-add-${name}`.replace(/\s+/g, "_"));
    // Close any modal and move on.
    await page.keyboard.press("Escape").catch(() => {});
    continue;
  }
  await addBtn.click().catch(() => {});
  log(`   ✅ Added "${name}"`);
  await sleep(400);
  await page.keyboard.press("Escape").catch(() => {}); // close modal if open
  await sleep(200);
}

await snap(page, cfg, "cart-filled");

// ---- 4. Go to checkout ----------------------------------------------------
log("Proceeding to checkout…");
const checkoutBtn = await firstVisible(
  page,
  [
    () => page.getByRole("button", { name: /checkout|check out|continue|view cart|go to cart/i }),
    () => page.getByRole("link", { name: /checkout|check out|cart/i }),
    () => page.locator('[data-testid*="checkout" i]'),
  ],
  { timeout: 8000 },
);
if (checkoutBtn) {
  await checkoutBtn.click().catch(() => {});
  await sleep(1500);
}
await snap(page, cfg, "checkout");

// ---- 5. Pick up time selection -------------------------------------------
async function selectPickup() {
  const { preferredDay, preferredTime, fallbackToFirstAvailable } = cfg.pickup || {};
  const pick = async (text) => {
    const opt = await firstVisible(
      page,
      [
        () => page.getByRole("radio", { name: new RegExp(escapeRe(text), "i") }),
        () => page.getByRole("button", { name: new RegExp(escapeRe(text), "i") }),
        () => page.getByText(new RegExp(escapeRe(text), "i")),
      ],
      { timeout: 2500 },
    );
    if (opt) {
      await opt.click().catch(() => {});
      return true;
    }
    return false;
  };

  if (preferredDay && (await pick(preferredDay))) log(`Picked day: ${preferredDay}`);
  if (preferredTime && (await pick(preferredTime))) log(`Picked time: ${preferredTime}`);

  if (fallbackToFirstAvailable) {
    // Click the first selectable pickup slot we can find, if nothing chosen.
    const slot = await firstVisible(
      page,
      [
        () => page.getByRole("radio").filter({ hasNot: page.locator("[disabled]") }),
        () => page.locator('button:not([disabled])', { hasText: /:\d{2}|am|pm/i }),
      ],
      { timeout: 2500 },
    );
    if (slot) {
      await slot.click().catch(() => {});
      log("Picked first available pickup slot.");
    }
  }
}
await selectPickup();
await snap(page, cfg, "pickup-selected");

// ---- 6. Place the order (or stop, for safety) -----------------------------
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const placeBtn = await firstVisible(
  page,
  [
    () => page.getByRole("button", { name: /place order|pay now|complete order|submit|confirm order|pay \$/i }),
    () => page.locator('[data-testid*="place" i], [data-testid*="pay" i]'),
  ],
  { timeout: 6000 },
);

if (!placeBtn) {
  log("ℹ️  Reached checkout but couldn't find a place-order button automatically.");
  log("   Your items should be in the cart (5-min timer) — finish in the window.");
} else if (DRY_RUN || !cfg.autoSubmit) {
  log("🛑 Stopping before payment (dry-run or autoSubmit=false).");
  log("   Items are in your cart. Click the final button yourself in the browser.");
  await placeBtn.scrollIntoViewIfNeeded().catch(() => {});
  await snap(page, cfg, "ready-to-pay");
} else {
  log("💳 Submitting the order (autoSubmit=true)…");
  await placeBtn.click().catch(() => {});
  await sleep(3000);
  await snap(page, cfg, "submitted");
  log("✅ Order submitted — verify the confirmation in the browser / your email.");
}

// Keep the (headed) browser open so you can finish or confirm manually.
if (!cfg.headless) {
  log("Browser stays open for 10 min so you can review/finish. Ctrl+C to quit.");
  await sleep(10 * 60 * 1000);
}
await ctx.close();
process.exit(0);

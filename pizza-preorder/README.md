# Pizza pre-order bot (Hotplate / AK Pizza)

Hotplate drops sell out in seconds because everyone hits the page the moment it
opens. This script parks on the store page, hammers reload right before the
drop, grabs your item the instant it's live, and races through checkout — using
your already-signed-in browser session so there's no login/SMS delay on the
clock.

It's a normal Playwright automation that **runs on your own computer**, drives a
real Chrome window you can watch, and (by default) stops right before payment so
you press the final button yourself.

> **No computer / phone only?** See [`cloud/README.md`](cloud/README.md) to run
> it on a small always-on server: you log in once via a remote desktop in your
> phone's browser, schedule it for drop time, and get a push notification (with
> a screenshot) on your phone via [ntfy](https://ntfy.sh) when it's done.

> Use responsibly: this just automates the same clicks you'd make as a regular
> customer ordering one meal for yourself. Don't run many copies, scalp, or
> resell — that's against Hotplate's terms and unfair to others in line.

## Setup

You need [Node.js](https://nodejs.org) 18+.

```bash
cd pizza-preorder
npm install
npx playwright install chrome   # one-time browser download
cp config.example.json config.json
```

Edit `config.json` (see below), then sign in once:

```bash
npm run login
```

A browser opens. Log in with your phone number + the SMS code. If you can, place
one small test order on a normal (non-drop) day so Hotplate saves your contact
and card — that makes drop-day checkout instant. Then press **Enter** in the
terminal to save the session.

## Drop day

Set `dropOpensAt` in `config.json` to the exact open time, then:

```bash
npm run dry-run     # full race, but STOPS before paying (recommended first)
npm run preorder    # honours autoSubmit in config
```

Start it a couple of minutes early. It waits, fires at open time, adds your
items, and reaches checkout. With `autoSubmit: false` (default) it parks on the
final pay button so you confirm — your items are held by Hotplate's ~5-minute
cart timer, so you have time. Set `autoSubmit: true` to let it click pay too.

## config.json

| Key | What it does |
| --- | --- |
| `storeUrl` | The Hotplate store, e.g. `https://www.hotplate.com/akpizza`. |
| `dropOpensAt` | ISO time the drop opens, with timezone offset (e.g. `2026-07-04T11:00:00-07:00`). |
| `armSecondsBefore` | How many seconds before open to start reloading. |
| `reloadIntervalMs` | Reload spacing while waiting for items to appear. |
| `items` | List of `{ "name", "quantity" }`. `name` matches the on-page item text (case-insensitive, partial OK). |
| `pickup.preferredDay` / `preferredTime` | Text of the slot to pick (optional). |
| `pickup.fallbackToFirstAvailable` | If `true`, grabs the first open slot when no preference matches. |
| `autoSubmit` | `true` clicks the final pay button; `false` stops just before it. |
| `notify.ntfyTopic` | Optional. A unique [ntfy](https://ntfy.sh) topic to push phone alerts + screenshots (open detected, in cart, ordered). Subscribe to the same topic in the ntfy app. |
| `headless` | Keep `false` so you can watch and step in. |
| `browserChannel` / `executablePath` | `"chrome"` uses installed Chrome; or point at a specific binary. |
| `slowMoMs` | Slows actions (debugging only — keep `0` for speed). |
| `screenshotDir` | Where step screenshots go (default `runs/`). |

## When something looks off

Every step writes a screenshot to `runs/`. If the script can't find your item or
a button, Hotplate likely changed its markup — open the latest screenshot, find
the real button text, and adjust the locators near the top of `preorder.mjs`
(`addButtonFactories`, the item-card list, and the checkout/place-order
locators). The browser is left open for 10 minutes so you can always finish by
hand.

## Notes & limits

- Clocks drift. The script trusts your computer's clock for `dropOpensAt`, so
  sync it (macOS/Windows do automatically) — being even 1–2s late matters.
- If Hotplate puts you in a waiting-room/queue, no bot can jump it; the script
  will keep trying and hand you a ready page.
- Don't share your `.profile/` folder — it contains your logged-in session.

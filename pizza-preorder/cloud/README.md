# Run the pizza bot in the cloud (phone-only)

You don't own a computer that can stay on for the drop — fine. This runs the bot
on a small always-on Linux server. You control everything from your phone:

1. Log in to Hotplate **once** through a remote desktop in your phone's browser.
2. Schedule the bot to fire at the drop time.
3. Get a push notification (with a screenshot) on your phone when it's done.

It's more setup than the desktop version, but it's a one-time effort.

---

## What you need

- A cheap Linux server (a $5/mo VPS is plenty). Any provider works — DigitalOcean,
  Hetzner, Vultr, Linode, etc. Pick **Ubuntu 22.04** and the region closest to
  the restaurant for the lowest lag.
- The [ntfy app](https://ntfy.sh) on your phone (free, no account) for alerts.
- A phone SSH/terminal app to type a few commands: **Termius** or **Blink** (iOS),
  **Termius** or **JuiceSSH** (Android). Or use the provider's in-browser console.

---

## One-time setup

### 1. Create the server and connect
Create the Ubuntu server in your provider's app, then SSH in from your phone
terminal app using the IP and password they give you:
```bash
ssh root@YOUR_SERVER_IP
```

### 2. Install Docker and get the code
```bash
curl -fsSL https://get.docker.com | sh
git clone https://github.com/hakeem849-dotcom/Claude_Keem.git
cd Claude_Keem/pizza-preorder/cloud
```

### 3. Make your config
```bash
cp ../config.example.json config.json
nano config.json
```
Set these for cloud use:
- `storeUrl`: `https://www.hotplate.com/akpizza`
- `dropOpensAt`: the exact open time **with timezone**, e.g. `2026-07-04T11:00:00-07:00`
- `items`: the pizzas you want, e.g. `[{ "name": "Pepperoni", "quantity": 1 }]`
- `notify.ntfyTopic`: any hard-to-guess name, e.g. `akpizza-7h3k9x2`
  (open the ntfy app → **+** → subscribe to this same name so alerts reach you)
- `headless`: `true`
- `browserChannel`: `""`  ← important; uses the built-in browser
- `autoSubmit`: `true` if you want it to pay automatically (needs your card saved
  on Hotplate — see next step). Leave `false` and it'll ping your phone to tap
  pay yourself within the ~5-minute cart timer.

Save in nano with `Ctrl+O`, `Enter`, then `Ctrl+X`.

### 4. Log in to Hotplate from your phone (the important bit)
Start the remote desktop:
```bash
docker compose up -d --build login
```
Wait ~1 minute for the build, then on your phone open:
```
http://YOUR_SERVER_IP:6080/vnc.html
```
Tap **Connect**. You'll see a browser on the Hotplate page. Log in with your
phone number + the SMS code. **Then place one small test order** (on a normal,
non-drop item if available) so Hotplate saves your contact + card — that's what
makes drop-day checkout instant and lets `autoSubmit` work.

When you're done, back in the SSH terminal:
```bash
docker compose stop login
```
Your session is now saved in the `profile/` folder and reused automatically.

> Security: port 6080 has no password. Either do the login quickly and then keep
> it stopped, or lock the port to your phone's IP in the provider's firewall.

### 5. Test it (won't pay)
```bash
docker compose run --rm preorder
```
With `autoSubmit: false` this races to checkout and pings your phone without
paying. Check the ntfy notification and the screenshots in `runs/`. If it can't
find your item, the live page text differs from your config `items` name — fix
the name and re-test.

---

## Drop day: schedule it

Have the server start the bot a couple of minutes before open (the script itself
waits for the exact second). Set a cron job — run `crontab -e` and add a line.

Example: drop opens **11:00**, start the bot at **10:57** on **July 4**
(cron uses the *server's* timezone — set it with `timedatectl set-timezone America/Los_Angeles`):
```cron
57 10 4 7 * cd /root/Claude_Keem/pizza-preorder/cloud && /usr/bin/docker compose run --rm preorder >> run.log 2>&1
```
Fields are: minute hour day month weekday. Then just keep your phone handy — the
bot fires on its own and notifies you. (You don't even need to be connected.)

Prefer not to use cron? At drop time just SSH in and run
`docker compose run --rm preorder` yourself.

---

## Troubleshooting
- **No notification?** Re-check `notify.ntfyTopic` matches what you subscribed to
  in the ntfy app, exactly.
- **"Couldn't find items"** alert: your `items[].name` must match the on-page
  text. Open the screenshot in `runs/` to see the real names.
- **Login didn't stick:** make sure you ran `docker compose stop login` (not
  `down`) so the session flushed, and that `profile/` isn't empty.
- **Clock:** the server clock drives the timing. `timedatectl` should show NTP
  synced; cloud servers usually are by default.

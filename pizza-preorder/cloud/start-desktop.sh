#!/usr/bin/env bash
# Bring up a virtual desktop and stream it to your phone via noVNC, then run the
# one-time login script (headed) inside it. Open http://YOUR_SERVER_IP:6080 in
# your phone's browser, log in to Hotplate, then `docker compose stop login`.
set -e

export DISPLAY=:99

# Virtual screen
Xvfb :99 -screen 0 1280x900x24 -ac +extension RANDR >/tmp/xvfb.log 2>&1 &
sleep 1
fluxbox >/tmp/fluxbox.log 2>&1 &

# VNC server on the virtual screen + noVNC web bridge on :6080
x11vnc -display :99 -forever -shared -nopw -quiet >/tmp/x11vnc.log 2>&1 &
websockify --web=/usr/share/novnc 6080 localhost:5900 >/tmp/novnc.log 2>&1 &

echo "noVNC ready on port 6080 — open http://YOUR_SERVER_IP:6080/vnc.html in your phone."
echo "Starting login browser…"

# Headed so it shows on the virtual screen the user controls via noVNC.
exec node login.mjs

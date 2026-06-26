# Cloud image: Playwright + Chromium, plus a tiny virtual desktop (Xvfb +
# fluxbox + x11vnc + noVNC) so you can do the one-time Hotplate login from your
# phone's browser. The actual drop run is headless.
FROM mcr.microsoft.com/playwright:v1.56.0-jammy

RUN apt-get update && apt-get install -y --no-install-recommends \
      xvfb x11vnc fluxbox novnc websockify tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# App code (parent dir is the build context — see docker-compose.yml)
COPY lib.mjs login.mjs preorder.mjs ./
COPY cloud/start-desktop.sh /usr/local/bin/start-desktop.sh
RUN chmod +x /usr/local/bin/start-desktop.sh

# noVNC web port for the one-time login
EXPOSE 6080

ENTRYPOINT ["/usr/bin/tini", "--"]

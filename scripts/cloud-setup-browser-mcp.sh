#!/usr/bin/env bash
# Setup script for the cloud (Claude Code on the web) environment.
#
# Paste the CONTENTS of this file into your environment's "Setup script" field
# (Edit environment -> Setup script). It runs once before each session and its
# output is cached, so the browser download does not repeat every session.
#
# It does two things:
#   1. Installs the Chromium browser that the "browser" MCP server (Playwright)
#      drives. This needs the Playwright CDN to be reachable -- see the network
#      notes in docs/flexiele-browser-mcp.md.
#   2. Materializes a logged-in FlexiEle session from the FLEXIELE_STORAGE_STATE
#      environment variable into a file the MCP server reads. Without this, the
#      headless remote browser has no way to pass the Azure AD / Microsoft login.
set -euo pipefail

echo "[setup] Installing Chromium for Playwright MCP..."
# --with-deps installs the OS libraries Chromium needs (runs as root in cloud).
npx -y playwright@latest install --with-deps chromium

STORAGE_FILE="${FLEXIELE_STORAGE_STATE_FILE:-/root/.flexiele/storage-state.json}"
if [ -n "${FLEXIELE_STORAGE_STATE:-}" ]; then
  echo "[setup] Writing FlexiEle storage state -> ${STORAGE_FILE}"
  mkdir -p "$(dirname "${STORAGE_FILE}")"
  printf '%s' "${FLEXIELE_STORAGE_STATE}" > "${STORAGE_FILE}"
  chmod 600 "${STORAGE_FILE}"
else
  echo "[setup] WARNING: FLEXIELE_STORAGE_STATE env var is not set."
  echo "[setup] The browser MCP will start unauthenticated and cannot complete"
  echo "[setup] the Microsoft SSO login in headless mode. See docs/flexiele-browser-mcp.md."
fi

echo "[setup] Done."

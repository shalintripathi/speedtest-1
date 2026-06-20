# Session Handoff — Connect FlexiEle HRMS to Claude via MCP

> Paste this whole file as your first message in the new session to transfer context.

## 🎯 Objective
Let Claude **access and operate the FlexiEle HRMS** web app at
`https://feexotel.flexiele.com/ROL0000001/home-page` (Exotel's tenant,
`ROL0000001`) through a **browser MCP server**, so Claude can read the dashboard,
leave balance, payslips, approvals, etc.

## ✅ What's established (findings)
- FlexiEle is a **React/Vite SPA**; backend REST API base is `/api` on the same
  host (also `/cand-api`, `/fileapi`). No public API docs / no Swagger. No
  existing public MCP server for FlexiEle.
- **Login = Google SSO only** for employees ("Login with Google"). No password
  form. (The `code1..code6` inputs are the separate Candidate OTP flow.)
- The right approach is **browser automation + session reuse**: log in once in a
  real browser, capture the Playwright **storage state** (cookies + localStorage),
  and feed it to a headless browser MCP. Automating the Google login itself is
  the wrong path (unreliable, policy-violating, trips security alerts).

## 🏗️ What's already built (PR #1, branch `claude/mcp-connection-uZuxr`)
Repo `shalintripathi/speedtest-1`, draft PR #1:
- `.mcp.json` — declares a `browser` MCP server (Microsoft Playwright MCP,
  headless Chromium, `--storage-state=${FLEXIELE_STORAGE_STATE_FILE:-/root/.flexiele/storage-state.json}`,
  origins locked to FlexiEle + Google/Microsoft login).
- `scripts/capture-flexiele-session.js` — local helper: opens a real browser,
  you click "Login with Google", saves `storage-state.json`.
- `scripts/cloud-setup-browser-mcp.sh` — cloud env setup script (installs
  Chromium, writes session from `FLEXIELE_STORAGE_STATE` env var).
- `docs/flexiele-browser-mcp.md` — full setup + env-side steps + security notes.
- `.gitignore` — ignores the session-state files.

## ⛔ Current blocker (the ONE remaining step)
The cloud session is **isolated** and cannot reach the user's Mac or local
Chrome. So the user must **export their logged-in session** and hand it over.
A browser MCP IS now connected in-session, but it runs in the cloud container
and has no login until the storage-state file exists.

### Next action: user runs this on their Mac, then pastes back the JSON
macOS one-liner (clones logged-in Chrome profile → opens FlexiEle → dumps session):
clone `~/Library/Application Support/Google/Chrome` to `/tmp/chrome-flexiele`,
launch `Google Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-flexiele`
on the FlexiEle URL, then `chromium.connectOverCDP('http://localhost:9222')` and
`ctx.storageState({path:'storage-state.json'})`. (Full one-liner is in the prior
chat; regenerate if needed. Requires Node on the Mac.)

## ▶️ How to finish once the user pastes the storage-state JSON
1. Write the JSON to `/root/.flexiele/storage-state.json` in the cloud session
   (`mkdir -p /root/.flexiele` first).
2. Use the `browser` MCP: `browser_navigate` to
   `https://feexotel.flexiele.com/ROL0000001/home-page`, then `browser_snapshot`.
   (If the MCP context was created before the file existed, a fresh navigate
   picks it up; otherwise drive it with a Bash Playwright script using
   `newContext({ ignoreHTTPSErrors: true, storageState: '/root/.flexiele/storage-state.json' })`.)
3. Confirm the logged-in dashboard renders; then perform the user's requested
   reads/actions.

## ⚙️ Environment gotchas
- Cloud network does **TLS interception** → Chromium must use
  `ignoreHTTPSErrors: true` (or `--ignore-certificate-errors`). curl works fine.
- Browsers already downloaded to `/opt/pw-browsers` in this container (ephemeral).
- This is Claude Code on the web: MCP servers load at **session start**; `.mcp.json`
  in the repo is the wiring mechanism. The host repo is an unrelated Rails
  "speedtest-1" app — the MCP config just lives there for transport.
- A draft PR #1 is open and subscribed for activity. No CI configured on the repo.

## 🔐 Security
- `storage-state.json` is a **live ~1h session token** for the user's HR account.
  Don't persist it beyond the task; user should sign out / `rm -rf /tmp/chrome-flexiele`
  to invalidate and clean up. Env vars are not a secrets vault.
- This is the user's own authorized corporate account (email shiva.wsofi@gmail.com,
  Exotel). Automation of their own access only.

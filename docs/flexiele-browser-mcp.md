# Browser MCP for FlexiEle (Claude Code on the web)

This wires a **headless browser MCP server** (Microsoft's
[Playwright MCP](https://github.com/microsoft/playwright-mcp)) into the remote
cloud environment so Claude can drive the FlexiEle HRMS web app
(`https://feexotel.flexiele.com/ROL0000001/home-page`) directly from a web
session.

> **It activates on the _next_ session, not the current one.** MCP servers are
> connected at session start. After you finish the env-side steps below, start a
> fresh session and you'll see a `browser` MCP server with tools like
> `browser_navigate`, `browser_snapshot`, `browser_click`, etc.

## Why headless + storage state (read this first)

FlexiEle logs in through **Microsoft Azure AD SSO** (often with MFA). In a
headless cloud browser there is **no interactive way for you to type your
password** — there is no window to click. The only practical way to get an
authenticated session into the remote browser is to **capture a logged-in
session on your own machine and inject it** as Playwright "storage state"
(cookies + localStorage). That is what `FLEXIELE_STORAGE_STATE` below is for.

These SSO sessions are **short-lived** (often ~1 hour) and may be device-bound,
so expect to refresh the storage state periodically. This path is inherently a
bit fragile; if you need long-lived robust access, ask FlexiEle for a real API
instead.

## What's in the repo (already committed)

| File | Purpose |
| --- | --- |
| `.mcp.json` | Declares the `browser` MCP server. Read at session start. |
| `scripts/cloud-setup-browser-mcp.sh` | Setup-script body: installs Chromium and writes the storage-state file. |

## What you must configure (environment side — not in the repo)

Open **Edit environment** in the Claude Code web UI and set the three things below.

### 1. Setup script

Paste the contents of `scripts/cloud-setup-browser-mcp.sh` into the
**Setup script** field. It installs Chromium (cached after first run) and writes
your logged-in session to disk.

### 2. Network access / allowed domains

The browser makes **direct** outbound requests (unlike MCP connector traffic,
which is proxied through Anthropic), so the environment's network policy must
allow them. Add these to **Allowed domains** (or use a broad enough access
level):

```
feexotel.flexiele.com
*.flexiele.com
login.microsoftonline.com
login.live.com
aadcdn.msftauth.net
fonts.googleapis.com
fonts.gstatic.com
```

The setup script also needs the Playwright browser-download host reachable to
install Chromium:

```
playwright.azureedge.net
cdn.playwright.dev
```

### 3. `FLEXIELE_STORAGE_STATE` environment variable

This holds your logged-in FlexiEle session as JSON. Generate it **on your local
machine**:

```bash
# Run locally, where you can complete the Microsoft login interactively.
npx -y @playwright/mcp@latest \
  --browser=chrome \
  --save-session \
  --output-dir ./flexiele-session
# ...drive it to log in to https://feexotel.flexiele.com/ROL0000001/home-page,
# then stop. The storage state is written under ./flexiele-session.
```

Alternatively, capture it with a tiny Playwright script:

```js
// save-state.js  ->  node save-state.js
const { chromium } = require('playwright');
(async () => {
  const ctx = await (await chromium.launch({ headless: false })).newContext();
  const page = await ctx.newPage();
  await page.goto('https://feexotel.flexiele.com/ROL0000001/home-page');
  console.log('Log in, then press Enter here...');
  await new Promise(r => process.stdin.once('data', r));
  await ctx.storageState({ path: 'storage-state.json' });
  process.exit(0);
})();
```

Then copy the **entire contents** of `storage-state.json` into the
`FLEXIELE_STORAGE_STATE` environment variable in the environment config.

> **Security note:** env vars and setup scripts are visible to anyone who can
> edit this environment, and they are **not** a secrets vault. `FLEXIELE_STORAGE_STATE`
> is effectively a live session token for your HR account — only do this in an
> environment you trust, and rotate/clear it when done. The storage-state file
> itself is git-ignored so it never lands in the repo.

## Using it (next session)

Once the above is set, start a new session and ask:

> Using the `browser` MCP, open
> `https://feexotel.flexiele.com/ROL0000001/home-page`, take a snapshot, and
> tell me what's on my dashboard.

If you get bounced to a Microsoft login page, your storage state has expired —
re-capture it (step 3) and update the env var.

#!/usr/bin/env node
/*
 * Capture a logged-in FlexiEle session for the browser MCP.
 *
 * Run this ON YOUR OWN MACHINE (it opens a real, visible browser so you can
 * complete the "Login with Google" SSO that Exotel's FlexiEle tenant requires):
 *
 *     npm i playwright            # once
 *     node scripts/capture-flexiele-session.js
 *
 * A Chrome window opens at the FlexiEle login page. Click "Login with Google",
 * finish the sign-in, and wait until your dashboard loads. Then return to the
 * terminal and press Enter. The script writes ./storage-state.json containing
 * the cookies + localStorage for an authenticated session.
 *
 * Put the CONTENTS of storage-state.json into the FLEXIELE_STORAGE_STATE
 * environment variable of your Claude Code web environment (see
 * docs/flexiele-browser-mcp.md). Treat it like a live password: it grants
 * access to your HR account until it expires (typically ~1 hour).
 */
const { chromium } = require('playwright');

const START_URL =
  process.env.FLEXIELE_URL ||
  'https://feexotel.flexiele.com/ROL0000001/home-page';
const OUT = process.env.FLEXIELE_STORAGE_STATE_FILE || 'storage-state.json';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(START_URL);

  console.log('\n  A browser window is open.');
  console.log('  1) Click "Login with Google" and complete the sign-in.');
  console.log('  2) Wait until your FlexiEle dashboard is fully loaded.');
  console.log('  3) Come back here and press Enter to save the session.\n');

  await new Promise((resolve) => process.stdin.once('data', resolve));

  await ctx.storageState({ path: OUT });
  console.log(`\n  Saved authenticated session -> ${OUT}`);
  console.log('  Copy its contents into the FLEXIELE_STORAGE_STATE env var.\n');
  await browser.close();
  process.exit(0);
})();

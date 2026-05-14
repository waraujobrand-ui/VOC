/*
 * Browser-style mobile viewport verification of the provider connected/
 * disconnected truth render. Uses Playwright (already available in the
 * dev environment) to serve the production-built dist/, intercept
 * /.netlify/functions/elevenlabs-status with a chosen connected payload,
 * and assert on the rendered DOM at an iPhone-class mobile viewport.
 *
 * Playwright is intentionally NOT in package.json; it is a dev-only
 * harness dependency.
 *
 * Two scenarios are exercised:
 *   A) connected:true  → header must NOT say "No audio generation connected"
 *                        and MUST say "Audio generation connected"
 *   B) connected:false → header MUST say "No audio generation connected"
 */

import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const distRoot = new URL('../dist/', import.meta.url).pathname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function makeServer({ connected, reason }) {
  return createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/.netlify/functions/elevenlabs-status') {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({
          provider: 'elevenlabs',
          connected,
          reason,
          docs_url: 'https://elevenlabs.io/docs/api-reference',
        }));
      }
      let path = url.pathname;
      if (path === '/' || path === '') path = '/index.html';
      const full = join(distRoot, path);
      if (!full.startsWith(distRoot)) { res.writeHead(403); return res.end(); }
      const data = readFileSync(full);
      const type = MIME[extname(full)] || 'application/octet-stream';
      res.writeHead(200, { 'content-type': type });
      res.end(data);
    } catch (err) {
      res.writeHead(404);
      res.end(err && err.message);
    }
  });
}

function listen(server) {
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${server.address().port}`)));
}

let failures = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failures++; } else { console.log('PASS:', msg); }
}

const browser = await chromium.launch();

async function runScenario({ name, connected, reason }) {
  console.log(`\n--- scenario: ${name} ---`);
  const server = makeServer({ connected, reason });
  const origin = await listen(server);
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  try {
    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="voc-header-audio-badge"]', { timeout: 5000 });

    const audio = (await page.locator('[data-testid="voc-header-audio-badge"]').textContent()).trim();
    const clone = (await page.locator('[data-testid="voc-header-clone-badge"]').textContent()).trim();
    const analysis = (await page.locator('[data-testid="voc-header-analysis-badge"]').textContent()).trim();
    const containerHtml = await page.locator('#root').innerHTML();
    const viewport = page.viewportSize();

    const demoAudio = (await page.locator('[data-testid="voc-demo-audio-badge"]').textContent()).trim();
    const limitsAudio = (await page.locator('[data-testid="voc-limits-audio-badge"]').textContent()).trim();

    if (connected) {
      assert(audio === 'Audio generation connected', `[${name}] audio badge = "Audio generation connected" (got: "${audio}")`);
      assert(!containerHtml.includes('No audio generation connected'), `[${name}] mobile DOM must NOT contain "No audio generation connected"`);
      assert(!containerHtml.includes('Audio generation not connected'), `[${name}] mobile DOM must NOT contain "Audio generation not connected"`);
      assert(clone === 'Voice cloning connected', `[${name}] clone badge = "Voice cloning connected" (got: "${clone}")`);
      assert(analysis === 'Analysis unavailable', `[${name}] analysis badge = "Analysis unavailable" (got: "${analysis}")`);
      assert(demoAudio === 'Audio generation provider connected', `[${name}] DemoModePanel audio badge truth (got: "${demoAudio}")`);
      assert(limitsAudio === 'Audio generation provider connected', `[${name}] CurrentLimitsPanel audio badge truth (got: "${limitsAudio}")`);
    } else {
      assert(audio === 'No audio generation connected', `[${name}] audio badge = "No audio generation connected" (got: "${audio}")`);
      assert(clone === 'Manual parameters only', `[${name}] clone badge = "Manual parameters only" (got: "${clone}")`);
      assert(demoAudio === 'Audio generation not connected', `[${name}] DemoModePanel audio badge disconnected truth (got: "${demoAudio}")`);
      assert(limitsAudio === 'Audio generation not connected', `[${name}] CurrentLimitsPanel audio badge disconnected truth (got: "${limitsAudio}")`);
    }
    assert(viewport.width <= 414, `[${name}] mobile viewport width <=414 (got ${viewport.width}x${viewport.height})`);
  } finally {
    await context.close();
    await new Promise((r) => server.close(() => r()));
  }
}

await runScenario({ name: 'connected', connected: true, reason: 'ELEVENLABS_API_KEY is configured on the backend.' });
await runScenario({ name: 'disconnected', connected: false, reason: 'ELEVENLABS_API_KEY is not configured on the backend; provider is disconnected.' });

await browser.close();

// Built-bundle sanity
const assets = readdirSync(new URL('../dist/assets/', import.meta.url));
const jsName = assets.find((f) => f.startsWith('index-') && f.endsWith('.js'));
const bundle = readFileSync(new URL(`../dist/assets/${jsName}`, import.meta.url), 'utf8');
assert(bundle.includes('Audio generation connected'), 'built bundle contains "Audio generation connected"');
assert(bundle.includes('No audio generation connected'), 'built bundle contains "No audio generation connected"');
assert(bundle.includes('Audio generation provider connected'), 'built bundle contains "Audio generation provider connected"');
assert(bundle.includes('Audio generation not connected'), 'built bundle contains "Audio generation not connected"');

console.log('');
if (failures === 0) {
  console.log('mobile truth browser check: ALL CHECKS PASSED');
} else {
  console.error(`mobile truth browser check: ${failures} FAILURE(S)`);
  process.exit(1);
}

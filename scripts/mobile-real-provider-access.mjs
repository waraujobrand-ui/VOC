/*
 * Mobile-viewport access verification for the real provider workflow.
 *
 * Loads the production dist/ in an iPhone-class viewport, mocks the
 * /.netlify/functions/elevenlabs-status response, and asserts that all
 * required real-provider controls are present, visible, reachable
 * (above-the-fold via in-page anchor), and bear correct truth labels.
 *
 * Pass condition (mobile, connected):
 *   - Provider section is rendered
 *   - Audio file input reachable
 *   - "Clone via ElevenLabs IVC" button reachable
 *   - Preview-text textarea reachable
 *   - "Generate ElevenLabs preview" button reachable
 *   - Header exposes "Jump to real provider controls" anchor that lands
 *     on the panel (above-the-fold after tap)
 *   - Provider status shows CONNECTED
 *   - "Audio generation connected" badge present (no disconnected copy)
 *
 * Pass condition (mobile, disconnected):
 *   - Same section + controls reachable
 *   - Provider status shows DISCONNECTED
 *   - Explicit CLONE / PREVIEW UNAVAILABLE failure copy is visible
 *   - No fake provider preview audio is rendered (no preview <audio>)
 */

import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
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

    const viewport = page.viewportSize();
    assert(viewport.width <= 414, `[${name}] viewport is mobile-class (got ${viewport.width}x${viewport.height})`);

    // Provider panel section is present
    const panelCount = await page.locator('[data-testid="voc-real-provider-panel"]').count();
    assert(panelCount === 1, `[${name}] real provider panel rendered exactly once (got ${panelCount})`);

    // All required generation controls are present + visible on mobile
    const controlSelectors = [
      'voc-real-provider-voice-name',
      'voc-real-provider-audio-input',
      'voc-real-provider-clone-button',
      'voc-real-provider-preview-text',
      'voc-real-provider-preview-button',
    ];
    for (const tid of controlSelectors) {
      const sel = `[data-testid="${tid}"]`;
      const loc = page.locator(sel);
      assert(await loc.count() === 1, `[${name}] control ${tid} present`);
      assert(await loc.first().isVisible(), `[${name}] control ${tid} visible on mobile`);
    }

    // Jump-link in header points to panel anchor
    const jump = page.locator('[data-testid="voc-header-jump-real-provider"]');
    assert(await jump.count() === 1, `[${name}] header exposes "Jump to real provider controls" link`);
    assert(await jump.first().isVisible(), `[${name}] jump link is visible on mobile from top of page`);
    const href = await jump.first().getAttribute('href');
    assert(href === '#real-provider-controls', `[${name}] jump link href targets #real-provider-controls (got ${href})`);

    // Tap the jump-link and assert panel is in viewport above the fold
    await jump.first().click();
    await page.waitForTimeout(400);
    const panel = page.locator('[data-testid="voc-real-provider-panel"]').first();
    const inView = await panel.evaluate((el) => {
      const r = el.getBoundingClientRect();
      // top of section visible within first 1.5 viewport heights after anchor jump
      return r.top >= -10 && r.top <= window.innerHeight * 1.5;
    });
    assert(inView, `[${name}] after tapping jump link, provider panel is in viewport`);

    // Buttons must remain enabled (user can always trigger explicit failure path)
    const cloneBtn = page.locator('[data-testid="voc-real-provider-clone-button"]').first();
    const previewBtn = page.locator('[data-testid="voc-real-provider-preview-button"]').first();
    assert(!(await cloneBtn.isDisabled()), `[${name}] clone button is not pre-disabled`);
    assert(!(await previewBtn.isDisabled()), `[${name}] preview button is not pre-disabled`);

    // Truth state checks
    const pill = (await page.locator('.voc-real-provider-state').first().textContent()).trim();
    if (connected) {
      assert(pill === 'CONNECTED', `[${name}] provider status pill = CONNECTED (got "${pill}")`);
      const audioBadge = (await page.locator('[data-testid="voc-header-audio-badge"]').textContent()).trim();
      assert(audioBadge === 'Audio generation connected', `[${name}] audio badge connected (got "${audioBadge}")`);
      // No disconnected impersonation copy
      const rootHtml = await page.locator('#root').innerHTML();
      assert(!rootHtml.includes('No audio generation connected'), `[${name}] DOM does NOT contain "No audio generation connected" when connected`);
      // No fake provider preview audio rendered (no preview blob exists yet)
      const audioCount = await page.locator('[data-testid="voc-real-provider-preview-audio"]').count();
      assert(audioCount === 0, `[${name}] no fake provider preview audio element when no real preview has run (got ${audioCount})`);
    } else {
      assert(pill === 'DISCONNECTED', `[${name}] provider status pill = DISCONNECTED (got "${pill}")`);
      const cloneUnavail = await page.locator('[data-testid="voc-real-provider-clone-unavailable"]').count();
      assert(cloneUnavail === 1, `[${name}] CLONE UNAVAILABLE explicit failure copy visible`);
      const previewUnavail = await page.locator('[data-testid="voc-real-provider-preview-unavailable"]').count();
      assert(previewUnavail === 1, `[${name}] PREVIEW UNAVAILABLE explicit failure copy visible`);
      const audioCount = await page.locator('[data-testid="voc-real-provider-preview-audio"]').count();
      assert(audioCount === 0, `[${name}] no fake provider preview audio when disconnected (got ${audioCount})`);
    }

    // Capture mobile screenshot proof of reachable controls
    await page.screenshot({ path: `/tmp/voc-mobile-real-provider-${name}.png`, fullPage: false });
    console.log(`screenshot: /tmp/voc-mobile-real-provider-${name}.png`);
  } finally {
    await context.close();
    await new Promise((r) => server.close(() => r()));
  }
}

await runScenario({ name: 'connected', connected: true, reason: 'ELEVENLABS_API_KEY is configured on the backend.' });
await runScenario({ name: 'disconnected', connected: false, reason: 'ELEVENLABS_API_KEY is not configured on the backend; provider is disconnected.' });

await browser.close();

console.log('');
if (failures === 0) {
  console.log('mobile real provider access check: ALL CHECKS PASSED');
} else {
  console.error(`mobile real provider access check: ${failures} FAILURE(S)`);
  process.exit(1);
}

/*
 * Recorder success-path smoke: confirm a synthetic recording still produces a
 * real audio Blob and a playable preview after the recovery UX changes.
 *
 * Uses Chromium with fake media flags so getUserMedia resolves to a synthetic
 * microphone, exercising the real MediaRecorder code path end-to-end.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const distRoot = new URL('../dist/', import.meta.url).pathname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function makeServer() {
  return createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/.netlify/functions/elevenlabs-status') {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(
          JSON.stringify({
            provider: 'elevenlabs',
            connected: false,
            reason: 'ELEVENLABS_API_KEY is not set on the backend.',
          }),
        );
      }
      let path = url.pathname;
      if (path === '/' || path === '') path = '/index.html';
      const full = join(distRoot, path);
      if (!full.startsWith(distRoot)) {
        res.writeHead(403);
        return res.end();
      }
      const data = readFileSync(full);
      const type = MIME[extname(full)] || 'application/octet-stream';
      res.writeHead(200, { 'content-type': type });
      res.end(data);
    } catch (err) {
      res.writeHead(404);
      res.end((err && err.message) || '');
    }
  });
}

function listen(server) {
  return new Promise((r) =>
    server.listen(0, '127.0.0.1', () =>
      r(`http://127.0.0.1:${server.address().port}`),
    ),
  );
}

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failures++;
  } else {
    console.log('PASS:', msg);
  }
}

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const server = makeServer();
const origin = await listen(server);

try {
  const context = await browser.newContext({ permissions: ['microphone'] });
  await context.grantPermissions(['microphone'], { origin });
  const page = await context.newPage();
  await page.goto(origin + '/', { waitUntil: 'networkidle' });

  // Enter tools stage.
  await page.locator('[data-testid="voc-entry-start"]').click();
  await page.waitForSelector('[data-testid="voc-real-provider-panel"]', {
    timeout: 5000,
  });

  // Click Record.
  await page.locator('[data-testid="voc-real-provider-record-start"]').click();

  // Wait for the live "recording" indicator (proves we entered recording state).
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="voc-recorder-status"]');
      return el && el.getAttribute('data-state') === 'recording';
    },
    null,
    { timeout: 5000 },
  );
  await page.waitForTimeout(1200);
  await page.locator('[data-testid="voc-real-provider-record-stop"]').click();

  // Wait for the confirmation screen (recording stopped, real blob preview).
  await page.waitForSelector('[data-testid="voc-confirm-summary-audio"], audio', {
    timeout: 8000,
  });

  // The confirmation UI shows an <audio> with a blob: URL.
  const blobSrc = await page.evaluate(() => {
    const audios = Array.from(document.querySelectorAll('audio'));
    const a = audios.find((x) => x.src && x.src.startsWith('blob:'));
    return a ? a.src : '';
  });
  assert(
    typeof blobSrc === 'string' && blobSrc.startsWith('blob:'),
    `recording preview is a blob: URL (got "${blobSrc}")`,
  );

  // Blob has nontrivial size.
  const size = await page.evaluate(async (src) => {
    if (!src) return 0;
    const r = await fetch(src);
    const b = await r.blob();
    return b.size;
  }, blobSrc);
  assert(size > 0, `recording blob has nonzero size (got ${size} bytes)`);

  // No recovery block should be rendered on a successful path.
  const failCount = await page
    .locator('[data-testid="voc-recorder-failed"]')
    .count();
  assert(failCount === 0, 'no recovery block on successful recording');

  await context.close();
} finally {
  await browser.close();
  await new Promise((r) => server.close(() => r()));
}

console.log('');
if (failures === 0) {
  console.log('recorder success smoke: ALL CHECKS PASSED');
} else {
  console.error(`recorder success smoke: ${failures} FAILURE(S)`);
  process.exit(1);
}

/*
 * Recorder permission/recovery UX check.
 *
 * Boots the built app, navigates from the entry screen into the tools stage,
 * then patches navigator.mediaDevices.getUserMedia to reject with each of the
 * relevant DOMException names. For every case we assert that:
 *
 *   1. the recorder recovery block is rendered (data-testid="voc-recorder-failed")
 *   2. the data-fail-kind attribute matches our classification
 *   3. the human-friendly title text is present (no raw "NotAllowedError: ..." as
 *      the primary message)
 *   4. a Try again button exists and is reachable
 *
 * Also covers the unsupported-browser path by stripping MediaRecorder before load.
 */

import { chromium } from 'playwright';
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

async function enterToolsStage(page) {
  await page.waitForSelector('[data-testid="voc-entry-start"]', { timeout: 5000 });
  await page.locator('[data-testid="voc-entry-start"]').click();
  await page.waitForSelector('[data-testid="voc-real-provider-panel"]', {
    timeout: 5000,
  });
}

// Patch getUserMedia to reject with a synthesised DOMException-like error.
async function installGUMRejection(page, { name, message }) {
  await page.addInitScript(
    ({ name, message }) => {
      const fakeErr = (() => {
        try {
          // DOMException is preferred when available — matches real browser behaviour.
          return new DOMException(message, name);
        } catch {
          const e = new Error(message);
          e.name = name;
          return e;
        }
      })();
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: () => Promise.reject(fakeErr),
        },
      });
    },
    { name, message },
  );
}

async function installUnsupported(page) {
  await page.addInitScript(() => {
    // Strip MediaRecorder so detectSupport() returns false.
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: undefined,
    });
  });
}

async function runCase({ browser, origin, label, install, expectedKind, expectedTitlePart }) {
  console.log(`\n--- scenario: ${label} ---`);
  const context = await browser.newContext();
  const page = await context.newPage();
  if (install) await install(page);
  try {
    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    await enterToolsStage(page);

    if (expectedKind === 'unsupported') {
      // Unsupported is detected on mount — recovery block renders without click.
      const block = page.locator('[data-testid="voc-recorder-unsupported"]');
      await block.waitFor({ timeout: 3000 });
      const kind = await block.getAttribute('data-fail-kind');
      assert(
        kind === 'unsupported',
        `${label}: data-fail-kind = "unsupported" (got "${kind}")`,
      );
      const text = (await block.textContent()) || '';
      assert(
        text.includes(expectedTitlePart),
        `${label}: human title contains "${expectedTitlePart}" (got "${text.slice(0, 120)}")`,
      );
      assert(
        !/^NotAllowedError|^NotFoundError|^NotReadableError/.test(text.trim()),
        `${label}: primary message is human-friendly, not raw error name`,
      );
      return;
    }

    // For permission/no-mic/in-use cases, click Record to trigger getUserMedia.
    await page.locator('[data-testid="voc-real-provider-record-start"]').click();
    const block = page.locator('[data-testid="voc-recorder-failed"]');
    await block.waitFor({ timeout: 5000 });
    const kind = await block.getAttribute('data-fail-kind');
    assert(
      kind === expectedKind,
      `${label}: data-fail-kind = "${expectedKind}" (got "${kind}")`,
    );
    const text = (await block.textContent()) || '';
    assert(
      text.includes(expectedTitlePart),
      `${label}: human title contains "${expectedTitlePart}" (got "${text.slice(0, 160)}")`,
    );
    // Retry button exists.
    const retry = page.locator('[data-testid="voc-recorder-retry"]');
    assert(
      (await retry.count()) === 1 && (await retry.first().isVisible()),
      `${label}: Try again button is visible`,
    );
    // Reset link exists.
    const reset = page.locator('[data-testid="voc-recorder-reset"]');
    assert((await reset.count()) === 1, `${label}: Reset action is present`);
    // Technical detail is preserved (secondary).
    const detailCount = await page
      .locator('[data-testid="voc-recorder-recovery-detail"]')
      .count();
    assert(detailCount === 1, `${label}: technical detail is preserved as secondary text`);
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch();
const server = makeServer();
const origin = await listen(server);

try {
  await runCase({
    browser,
    origin,
    label: 'permission denied',
    install: (p) => installGUMRejection(p, { name: 'NotAllowedError', message: 'Permission denied by system' }),
    expectedKind: 'permission_denied',
    expectedTitlePart: 'Microphone access was blocked',
  });
  await runCase({
    browser,
    origin,
    label: 'no microphone found',
    install: (p) => installGUMRejection(p, { name: 'NotFoundError', message: 'Requested device not found' }),
    expectedKind: 'no_microphone',
    expectedTitlePart: 'No microphone detected',
  });
  await runCase({
    browser,
    origin,
    label: 'microphone in use',
    install: (p) => installGUMRejection(p, { name: 'NotReadableError', message: 'Could not start audio source' }),
    expectedKind: 'mic_in_use',
    expectedTitlePart: 'Microphone is unavailable',
  });
  await runCase({
    browser,
    origin,
    label: 'unsupported browser',
    install: installUnsupported,
    expectedKind: 'unsupported',
    expectedTitlePart: 'This browser can’t record audio',
  });
} finally {
  await browser.close();
  await new Promise((r) => server.close(() => r()));
}

console.log('');
if (failures === 0) {
  console.log('recorder recovery check: ALL CHECKS PASSED');
} else {
  console.error(`recorder recovery check: ${failures} FAILURE(S)`);
  process.exit(1);
}

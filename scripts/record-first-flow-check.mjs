/*
 * Record-first microphone flow verification.
 *
 * Uses Playwright Chromium launched with fake media flags so getUserMedia
 * resolves to a synthetic microphone stream (no real hardware, no permission
 * prompt). This exercises the real MediaRecorder code path and produces a
 * real audio Blob in the page.
 *
 * Scenarios:
 *   A) desktop, provider connected — record → stop → preview → active source
 *      = recorded sample → clone uses recorded blob (intercepted backend
 *      receives multipart with audio/webm or audio/ogg payload).
 *   B) desktop, provider connected — upload regression: select an audio file
 *      → active source switches to "Uploaded audio file" → clone uses
 *      uploaded blob.
 *   C) mobile viewport — recording controls are visible/reachable and
 *      active source truth is rendered.
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

// Per-server clone capture.
function makeServer({ connected, reason, cloneCapture }) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/.netlify/functions/elevenlabs-status') {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(
          JSON.stringify({
            provider: 'elevenlabs',
            connected,
            reason,
            docs_url: 'https://elevenlabs.io/docs/api-reference',
          }),
        );
      }
      if (url.pathname === '/.netlify/functions/elevenlabs-clone') {
        // Capture content-type + raw body so we can assert the clone receives
        // a real audio blob from the recorder.
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const buf = Buffer.concat(chunks);
        cloneCapture.contentType = req.headers['content-type'] || '';
        cloneCapture.size = buf.length;
        // Look for the recorded filename signature in the raw multipart body.
        const head = buf.slice(0, Math.min(buf.length, 4096)).toString('utf8');
        cloneCapture.bodyHead = head;
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(
          JSON.stringify({
            voice_id: 'fake-voice-id-from-test-server',
            requires_verification: false,
            provider: 'elevenlabs',
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
      res.end(err && err.message);
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

// Launch Chromium with fake media flags so getUserMedia resolves synthetically.
const browser = await chromium.launch({
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
  ],
});

async function recordAndStop(page) {
  await page.locator('[data-testid="voc-real-provider-record-start"]').click();
  // Wait for recorder to transition to "recording" state.
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="voc-recorder-status"]');
      return el && el.getAttribute('data-state') === 'recording';
    },
    null,
    { timeout: 5000 },
  );
  // Record for ~1.2s to capture multiple chunks of synthetic audio.
  await page.waitForTimeout(1200);
  await page.locator('[data-testid="voc-real-provider-record-stop"]').click();
  // Wait for "stopped" state (final blob ready).
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="voc-recorder-status"]');
      return el && el.getAttribute('data-state') === 'stopped';
    },
    null,
    { timeout: 5000 },
  );
}

async function runDesktopRecordingScenario() {
  console.log('\n--- scenario: desktop record-first flow (connected) ---');
  const cloneCapture = {};
  const server = makeServer({
    connected: true,
    reason: 'ELEVENLABS_API_KEY is configured on the backend.',
    cloneCapture,
  });
  const origin = await listen(server);
  const context = await browser.newContext({
    permissions: ['microphone'],
  });
  await context.grantPermissions(['microphone'], { origin });
  const page = await context.newPage();
  try {
    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="voc-real-provider-panel"]', {
      timeout: 5000,
    });

    // Recording section is rendered before the upload section in the DOM
    // (record-first ordering).
    const order = await page.evaluate(() => {
      const recSection = document.querySelector(
        '[data-testid="voc-real-provider-record-section"]',
      );
      const upSection = document.querySelector(
        '[data-testid="voc-real-provider-upload-section"]',
      );
      if (!recSection || !upSection) return null;
      return recSection.compareDocumentPosition(upSection) &
        Node.DOCUMENT_POSITION_FOLLOWING
        ? 'record-first'
        : 'upload-first';
    });
    assert(order === 'record-first', 'recording section precedes upload section in DOM');

    // Status starts as IDLE.
    const initialStatus = await page
      .locator('[data-testid="voc-recorder-status"]')
      .getAttribute('data-state');
    assert(
      initialStatus === 'idle' || initialStatus === 'unsupported',
      `initial recorder status is idle (got "${initialStatus}")`,
    );

    // Drive the real recorder: record then stop.
    await recordAndStop(page);

    // Recording preview audio element rendered with object URL.
    const audioCount = await page
      .locator('[data-testid="voc-real-provider-record-audio"]')
      .count();
    assert(audioCount === 1, 'recorded audio preview rendered');
    const audioSrc = await page
      .locator('[data-testid="voc-real-provider-record-audio"]')
      .getAttribute('src');
    assert(
      typeof audioSrc === 'string' && audioSrc.startsWith('blob:'),
      `recorded audio src is a blob: URL (got "${audioSrc}")`,
    );

    // MIME displayed and filename has audio extension.
    const mime = (
      await page
        .locator('[data-testid="voc-real-provider-record-mime"]')
        .textContent()
    ).trim();
    assert(
      /^(audio\/webm|audio\/ogg|audio\/mp4)/.test(mime),
      `recorded MIME is a real audio type (got "${mime}")`,
    );
    const fileName = (
      await page
        .locator('[data-testid="voc-real-provider-record-filename"]')
        .textContent()
    ).trim();
    assert(
      /voc-recording\.(webm|ogg|m4a|wav)$/.test(fileName),
      `recorded filename has audio extension (got "${fileName}")`,
    );

    // Recorded blob has nonzero size, exposed through page evaluation.
    const blobSize = await page.evaluate(async () => {
      const audio = document.querySelector(
        '[data-testid="voc-real-provider-record-audio"]',
      );
      if (!audio || !audio.src) return 0;
      const r = await fetch(audio.src);
      const b = await r.blob();
      return b.size;
    });
    assert(blobSize > 0, `recorded blob has nonzero size (got ${blobSize} bytes)`);

    // Active clone source = recorded sample.
    const activeLabel = (
      await page
        .locator('[data-testid="voc-real-provider-active-source-label"]')
        .textContent()
    ).trim();
    assert(
      activeLabel === 'Recorded voice sample',
      `active clone source label = "Recorded voice sample" (got "${activeLabel}")`,
    );
    const activeAttr = await page
      .locator('[data-testid="voc-real-provider-source-truth"]')
      .getAttribute('data-active-source');
    assert(
      activeAttr === 'recorded',
      `source-truth data-active-source = "recorded" (got "${activeAttr}")`,
    );

    // Click clone — backend intercept should see multipart with the recorded blob.
    await page.locator('[data-testid="voc-real-provider-clone-button"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector('.voc-audio-signature') !== null ||
        document.querySelector(
          '[data-testid="voc-real-provider-clone-fail"]',
        ) !== null,
      null,
      { timeout: 10000 },
    );

    const signature = await page.locator('.voc-audio-signature').count();
    assert(signature === 1, 'clone result voice_id signature rendered');

    assert(
      typeof cloneCapture.contentType === 'string' &&
        cloneCapture.contentType.includes('multipart/form-data'),
      `clone request is multipart/form-data (got "${cloneCapture.contentType}")`,
    );
    assert(
      typeof cloneCapture.bodyHead === 'string' &&
        /voc-recording\.(webm|ogg|m4a|wav)/.test(cloneCapture.bodyHead),
      'clone request body contains recorded filename signature',
    );
    assert(
      cloneCapture.size > 100,
      `clone request body has nontrivial size (got ${cloneCapture.size} bytes)`,
    );
  } finally {
    await context.close();
    await new Promise((r) => server.close(() => r()));
  }
}

async function runDesktopUploadRegressionScenario() {
  console.log('\n--- scenario: desktop upload regression (connected) ---');
  const cloneCapture = {};
  const server = makeServer({
    connected: true,
    reason: 'ELEVENLABS_API_KEY is configured on the backend.',
    cloneCapture,
  });
  const origin = await listen(server);
  const context = await browser.newContext({});
  const page = await context.newPage();
  try {
    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="voc-real-provider-panel"]', {
      timeout: 5000,
    });

    // Upload an "audio" file via setInputFiles using a tiny in-memory payload.
    const uploadName = 'my-upload-sample.wav';
    const uploadBytes = Buffer.from([
      // Minimal "RIFF....WAVE" header bytes; backend stub doesn't decode it.
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
      0x66, 0x6d, 0x74, 0x20,
    ]);
    await page
      .locator('[data-testid="voc-real-provider-audio-input"]')
      .setInputFiles({
        name: uploadName,
        mimeType: 'audio/wav',
        buffer: uploadBytes,
      });

    const activeLabel = (
      await page
        .locator('[data-testid="voc-real-provider-active-source-label"]')
        .textContent()
    ).trim();
    assert(
      activeLabel === 'Uploaded audio file',
      `upload switches active source to "Uploaded audio file" (got "${activeLabel}")`,
    );
    const activeAttr = await page
      .locator('[data-testid="voc-real-provider-source-truth"]')
      .getAttribute('data-active-source');
    assert(
      activeAttr === 'uploaded',
      `source-truth data-active-source = "uploaded" (got "${activeAttr}")`,
    );

    // Clone button is reachable and not disabled.
    const cloneBtn = page.locator(
      '[data-testid="voc-real-provider-clone-button"]',
    );
    assert(
      !(await cloneBtn.isDisabled()),
      'clone button remains reachable after upload',
    );

    await cloneBtn.click();
    await page.waitForFunction(
      () =>
        document.querySelector('.voc-audio-signature') !== null ||
        document.querySelector(
          '[data-testid="voc-real-provider-clone-fail"]',
        ) !== null,
      null,
      { timeout: 10000 },
    );

    assert(
      typeof cloneCapture.bodyHead === 'string' &&
        cloneCapture.bodyHead.includes(uploadName),
      'clone request body contains uploaded filename when uploaded source active',
    );
    assert(
      !/voc-recording\.(webm|ogg|m4a|wav)/.test(cloneCapture.bodyHead || ''),
      'clone request body does NOT contain recorded filename signature when upload source active',
    );
  } finally {
    await context.close();
    await new Promise((r) => server.close(() => r()));
  }
}

async function runMobileRecordingScenario() {
  console.log('\n--- scenario: mobile record-first controls reachable ---');
  const cloneCapture = {};
  const server = makeServer({
    connected: true,
    reason: 'ELEVENLABS_API_KEY is configured on the backend.',
    cloneCapture,
  });
  const origin = await listen(server);
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    permissions: ['microphone'],
  });
  await context.grantPermissions(['microphone'], { origin });
  const page = await context.newPage();
  try {
    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="voc-real-provider-panel"]', {
      timeout: 5000,
    });
    const viewport = page.viewportSize();
    assert(
      viewport.width <= 414,
      `mobile viewport <=414 (got ${viewport.width}x${viewport.height})`,
    );

    // Tap the jump link to reach the provider panel from the top.
    await page
      .locator('[data-testid="voc-header-jump-real-provider"]')
      .first()
      .click();
    await page.waitForTimeout(400);

    const recStart = page.locator(
      '[data-testid="voc-real-provider-record-start"]',
    );
    const recStop = page.locator(
      '[data-testid="voc-real-provider-record-stop"]',
    );
    assert(
      (await recStart.count()) === 1 && (await recStart.first().isVisible()),
      'mobile: Record voice sample button visible',
    );
    assert(
      (await recStop.count()) === 1,
      'mobile: Stop recording button rendered',
    );

    // Active clone source truth is rendered (without recording yet).
    const sourceTruth = page.locator(
      '[data-testid="voc-real-provider-source-truth"]',
    );
    assert(
      (await sourceTruth.count()) === 1 &&
        (await sourceTruth.first().isVisible()),
      'mobile: Active clone source truth panel is visible',
    );

    // Actually drive the recorder on mobile viewport to prove it works.
    await recordAndStop(page);
    const audioCount = await page
      .locator('[data-testid="voc-real-provider-record-audio"]')
      .count();
    assert(audioCount === 1, 'mobile: recorded audio preview rendered');
    const activeLabel = (
      await page
        .locator('[data-testid="voc-real-provider-active-source-label"]')
        .textContent()
    ).trim();
    assert(
      activeLabel === 'Recorded voice sample',
      `mobile: active clone source label = "Recorded voice sample" (got "${activeLabel}")`,
    );

    await page.screenshot({
      path: '/tmp/voc-mobile-record-first.png',
      fullPage: false,
    });
    console.log('screenshot: /tmp/voc-mobile-record-first.png');
  } finally {
    await context.close();
    await new Promise((r) => server.close(() => r()));
  }
}

await runDesktopRecordingScenario();
await runDesktopUploadRegressionScenario();
await runMobileRecordingScenario();

await browser.close();

console.log('');
if (failures === 0) {
  console.log('record-first flow check: ALL CHECKS PASSED');
} else {
  console.error(`record-first flow check: ${failures} FAILURE(S)`);
  process.exit(1);
}

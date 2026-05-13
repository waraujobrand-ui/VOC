/*
 * Browser-style UI truth-state smoke. Verifies that the production build
 * contains all required disconnected-state truth text and that the
 * RealProviderPanel source DOES NOT disable the clone or preview buttons
 * based on provider capability (so users can always trigger the explicit
 * failure path).
 *
 * Runs without a real API key. Operates on the built bundle and source
 * files; no React renderer or browser required.
 */

import { readFileSync, readdirSync } from 'node:fs';

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failures++;
  } else {
    console.log('PASS:', msg);
  }
}

// --- 1. Built bundle truth strings -------------------------------------------
const distAssetsDir = new URL('../dist/assets/', import.meta.url);
const assets = readdirSync(distAssetsDir);
const jsName = assets.find((f) => f.startsWith('index-') && f.endsWith('.js'));
assert(!!jsName, 'production JS bundle exists in dist/assets/');
const bundle = readFileSync(new URL(`./${jsName}`, distAssetsDir), 'utf8');

const requiredTruthStrings = [
  'DISCONNECTED',
  'CONNECTED',
  'CLONE UNAVAILABLE',
  'CLONE FAILED',
  'PREVIEW UNAVAILABLE',
  'PREVIEW FAILED',
  'EXPORT UNAVAILABLE',
  'Provider connected',
  'Cloning',
  'Voice analysis',
  'Real provider preview',
  'Export real provider preview',
];

for (const needle of requiredTruthStrings) {
  assert(bundle.includes(needle), `bundle contains plain text: "${needle}"`);
}

// --- 2. Source: clone button is NOT disabled when provider is unavailable ----
const panelSrc = readFileSync(
  new URL('../src/components/RealProviderPanel.jsx', import.meta.url),
  'utf8',
);

function extractButton(source, testId) {
  // Find the index of the testid, walk backwards to the nearest `<button`,
  // and forward to the first `>` after the testid. This yields the exact
  // open-tag for that one button.
  const needle = `data-testid="${testId}"`;
  const tidx = source.indexOf(needle);
  if (tidx === -1) return null;
  const start = source.lastIndexOf('<button', tidx);
  if (start === -1) return null;
  const end = source.indexOf('>', tidx);
  if (end === -1) return null;
  return source.slice(start, end + 1);
}

const cloneBtn = extractButton(panelSrc, 'voc-real-provider-clone-button');
assert(!!cloneBtn, 'clone button JSX block found in source');
assert(
  cloneBtn && !/capabilities\.cloning/.test(cloneBtn),
  'clone button is not gated on capabilities.cloning (user can always click)',
);
assert(
  cloneBtn && !/!selectedFile/.test(cloneBtn),
  'clone button is not gated on selectedFile (no-file path produces explicit failure)',
);
assert(
  cloneBtn && /disabled=\{isCloning\}/.test(cloneBtn),
  'clone button is only disabled during in-flight clone request',
);

const previewBtn = extractButton(panelSrc, 'voc-real-provider-preview-button');
assert(!!previewBtn, 'preview button JSX block found in source');
assert(
  previewBtn && !/capabilities\.preview/.test(previewBtn),
  'preview button is not gated on capabilities.preview (user can always click)',
);
assert(
  previewBtn && !/cloneReady/.test(previewBtn),
  'preview button is not gated on cloneReady (user can always click)',
);
assert(
  previewBtn && /disabled=\{isPreviewing\}/.test(previewBtn),
  'preview button is only disabled during in-flight preview request',
);

// Export button still rendered only when preview blob exists, but no
// disabled-on-capability gating.
const exportBtn = extractButton(panelSrc, 'voc-real-provider-export-button');
assert(!!exportBtn, 'export button JSX block found in source');
assert(
  exportBtn && !/disabled/.test(exportBtn),
  'export button (rendered only when previewReady) is not extra-disabled',
);

// --- 3. Source: explicit plain-text unavailable copy is present --------------
assert(
  /CLONE UNAVAILABLE: provider disconnected/.test(panelSrc),
  'CLONE UNAVAILABLE copy present in source',
);
assert(
  /PREVIEW UNAVAILABLE: provider disconnected/.test(panelSrc),
  'PREVIEW UNAVAILABLE (disconnected) copy present in source',
);
assert(
  /PREVIEW UNAVAILABLE: no real provider voice_id yet/.test(panelSrc),
  'PREVIEW UNAVAILABLE (no voice_id) copy present in source',
);
assert(
  /EXPORT UNAVAILABLE: no real provider preview blob exists yet/.test(panelSrc),
  'EXPORT UNAVAILABLE copy present in source',
);

// --- 4. Hook never invents a voice_id on failure path -----------------------
const hookSrc = readFileSync(
  new URL('../src/hooks/useRealVoiceProvider.js', import.meta.url),
  'utf8',
);
assert(
  /state: REAL_PROVIDER_STATES\.FAILED,\s*voice_id: null/.test(hookSrc),
  'hook sets voice_id:null on FAILED clone path',
);
assert(
  !/localDeterministicToneEngine|encodeWav/.test(hookSrc),
  'hook does not import local engine or WAV encoder',
);

// --- 5. Adapter does not contain any fallback to local engine ---------------
const adapterSrc = readFileSync(
  new URL('../src/audio/realProviderAdapter.js', import.meta.url),
  'utf8',
);
assert(
  !/localDeterministicToneEngine|encodeWav|new Blob\(\[/.test(adapterSrc),
  'adapter does not synthesize or fabricate audio',
);

// --- 6. BuildStatusPanel disconnected truth ---------------------------------
const buildPanelSrc = readFileSync(
  new URL('../src/components/BuildStatusPanel.jsx', import.meta.url),
  'utf8',
);
assert(
  /Real voice cloning backend \(ElevenLabs IVC\)/.test(buildPanelSrc),
  'BuildStatusPanel mentions ElevenLabs IVC backend',
);
assert(
  /Hidden fallback[\s\S]*?NONE/.test(buildPanelSrc),
  'BuildStatusPanel states hidden fallback: NONE',
);
assert(
  /Voice analyzer backend[\s\S]*?NOT IMPLEMENTED/.test(buildPanelSrc),
  'BuildStatusPanel states voice analyzer NOT IMPLEMENTED',
);

console.log('');
if (failures === 0) {
  console.log('real provider UI smoke: ALL CHECKS PASSED');
} else {
  console.error(`real provider UI smoke: ${failures} FAILURE(S)`);
  process.exit(1);
}

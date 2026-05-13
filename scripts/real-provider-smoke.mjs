/*
 * Real provider smoke test (Node). Runs WITHOUT an API key.
 *
 * Verifies:
 *   1. Deterministic VOC→ElevenLabs parameter mapping: same params → same payload.
 *   2. Different parameter values change mapping.
 *   3. Backend status function reports disconnected when ELEVENLABS_API_KEY missing.
 *   4. Backend clone function returns 503 with structured reason when key missing.
 *   5. Backend generate function returns 503 with structured reason when key missing.
 *   6. Frontend adapter clone returns disconnected:true when status endpoint says 503.
 *   7. Frontend adapter generate returns disconnected:true when key missing.
 *   8. No code path in realProviderAdapter falls back to local engine on failure.
 */

import { Blob } from 'node:buffer';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (!globalThis.Blob) globalThis.Blob = Blob;

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failures++;
  } else {
    console.log('PASS:', msg);
  }
}

// --- 1 & 2. Deterministic mapping --------------------------------------------
const { mapVocToElevenLabsRequest } = await import(
  '../src/audio/elevenLabsParameterMapping.js'
);

const baseParams = {
  pitch: 50,
  speed: 50,
  cadence: 50,
  clarity: 50,
  stability: 50,
  emotion: 50,
  warmth: 50,
  accent: 'neutral',
};

const a = mapVocToElevenLabsRequest(baseParams);
const b = mapVocToElevenLabsRequest({ ...baseParams });
assert(
  JSON.stringify(a) === JSON.stringify(b),
  'VOC→ElevenLabs mapping is deterministic for identical params',
);

const c = mapVocToElevenLabsRequest({ ...baseParams, stability: 90 });
assert(
  a.forwarded.voice_settings.stability !== c.forwarded.voice_settings.stability,
  'mapping reflects changed VOC stability',
);
assert(a.forwarded.seed !== c.forwarded.seed, 'mapping seed changes with VOC parameters');

const d = mapVocToElevenLabsRequest({ ...baseParams, warmth: 80 });
assert(
  d.forwarded.voice_settings.use_speaker_boost === true,
  'high VOC warmth flips use_speaker_boost on',
);

const e = mapVocToElevenLabsRequest({ ...baseParams, warmth: 20 });
assert(
  e.forwarded.voice_settings.use_speaker_boost === false,
  'low VOC warmth flips use_speaker_boost off',
);

assert(
  Object.prototype.hasOwnProperty.call(a.unsupported, 'pitch') &&
    Object.prototype.hasOwnProperty.call(a.unsupported, 'cadence') &&
    Object.prototype.hasOwnProperty.call(a.unsupported, 'accent'),
  'mapping reports pitch/cadence/accent as unsupported, not silently transformed',
);

// --- 3. Status function, key missing -----------------------------------------
delete process.env.ELEVENLABS_API_KEY;
const statusMod = await import('../netlify/functions/elevenlabs-status.js');
const statusRes = await statusMod.handler();
const statusBody = JSON.parse(statusRes.body);
assert(statusRes.statusCode === 200, 'status function returns 200 even when disconnected');
assert(statusBody.connected === false, 'status reports connected:false when no API key');
assert(
  /not configured/i.test(statusBody.reason || ''),
  'status reason mentions API key not configured',
);

// --- 4. Clone function 503 when key missing ----------------------------------
const cloneMod = await import('../netlify/functions/elevenlabs-clone.js');
const cloneFn = cloneMod.default;

// Build a minimal multipart Request (Node 18+ has global FormData/Request)
const cloneForm = new FormData();
cloneForm.append('name', 'test');
cloneForm.append('files', new Blob([new Uint8Array([1, 2, 3])]), 'sample.wav');
const cloneReq = new Request('http://local/elevenlabs-clone', {
  method: 'POST',
  body: cloneForm,
});
const cloneRes = await cloneFn(cloneReq);
assert(cloneRes.status === 503, 'clone function returns 503 when API key missing');
const cloneBody = await cloneRes.json();
assert(cloneBody.disconnected === true, 'clone response sets disconnected:true');
assert(
  /not configured/i.test(cloneBody.reason || ''),
  'clone reason mentions API key not configured',
);

// --- 5. Generate function 503 when key missing -------------------------------
const genMod = await import('../netlify/functions/elevenlabs-generate.js');
const genFn = genMod.default;
const genReq = new Request('http://local/elevenlabs-generate', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ voice_id: 'abc', text: 'hi', mapping: a }),
});
const genRes = await genFn(genReq);
assert(genRes.status === 503, 'generate function returns 503 when API key missing');
const genBody = await genRes.json();
assert(genBody.disconnected === true, 'generate response sets disconnected:true');

// --- 6 & 7. Frontend adapter with mocked fetch -------------------------------
const adapter = await import('../src/audio/realProviderAdapter.js');

const mockFetchDisconnectedStatus = async () =>
  new Response(JSON.stringify({ connected: false, reason: 'no key', provider: 'elevenlabs' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
const status = await adapter.fetchRealProviderStatus(mockFetchDisconnectedStatus);
assert(status.connected === false, 'adapter fetchRealProviderStatus reports disconnected');
assert(
  status.capabilities.cloning === false &&
    status.capabilities.preview === false &&
    status.capabilities.export === false,
  'adapter capabilities all unavailable when disconnected',
);

const mockFetchCloneDisconnected = async () =>
  new Response(JSON.stringify({ ok: false, reason: 'no key', disconnected: true }), {
    status: 503,
    headers: { 'content-type': 'application/json' },
  });
const cloneRet = await adapter.realProviderClone(
  { file: new Blob([new Uint8Array([0])], { type: 'audio/wav' }), name: 'x' },
  mockFetchCloneDisconnected,
);
assert(cloneRet.ok === false, 'adapter clone reports failure when backend disconnected');
assert(cloneRet.disconnected === true, 'adapter clone propagates disconnected:true');
assert(cloneRet.voice_id === null, 'adapter clone NEVER invents a voice_id on failure');

const mockFetchGenDisconnected = async () =>
  new Response(JSON.stringify({ ok: false, reason: 'no key', disconnected: true }), {
    status: 503,
    headers: { 'content-type': 'application/json' },
  });
const genRet = await adapter.realProviderGenerate(
  { voiceId: 'abc', text: 'hi', parameters: baseParams },
  mockFetchGenDisconnected,
);
assert(genRet.ok === false, 'adapter generate reports failure when backend disconnected');
assert(genRet.disconnected === true, 'adapter generate propagates disconnected:true');
assert(!('blob' in genRet), 'adapter generate NEVER returns a fake audio blob on failure');

// --- 8. No hidden local fallback in adapter file -----------------------------
const adapterSrc = readFileSync(
  new URL('../src/audio/realProviderAdapter.js', import.meta.url),
  'utf8',
);
assert(
  !/localDeterministicToneEngine/.test(adapterSrc),
  'real provider adapter does not import the local deterministic engine',
);
assert(
  !/encodeWav/.test(adapterSrc),
  'real provider adapter does not invoke the local WAV encoder',
);

const hookSrc = readFileSync(
  new URL('../src/hooks/useRealVoiceProvider.js', import.meta.url),
  'utf8',
);
assert(
  !/localDeterministicToneEngine/.test(hookSrc),
  'useRealVoiceProvider hook does not import the local engine',
);

console.log('');
if (failures === 0) {
  console.log('real provider smoke: ALL CHECKS PASSED');
} else {
  console.error(`real provider smoke: ${failures} FAILURE(S)`);
  process.exit(1);
}

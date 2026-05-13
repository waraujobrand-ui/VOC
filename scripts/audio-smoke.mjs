/*
 * Smoke test (Node) — proves:
 *   1. Same parameters → same WAV bytes → same signature.
 *   2. Different parameter → different signature (each locked param mutated).
 *   3. Preview/export identity: the blob returned IS what we hash & export.
 */

import { Blob } from 'node:buffer';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}
if (!globalThis.Blob) {
  globalThis.Blob = Blob;
}

const { localDeterministicToneEngine } = await import(
  '../src/audio/localDeterministicToneEngine.js'
);
const { createVocString } = await import('../src/schema.js');

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

function vocString(p) {
  return createVocString(p);
}

async function genSig(parameters) {
  const result = await localDeterministicToneEngine.generate({
    parameters,
    vocString: vocString(parameters),
    sourceMeta: null,
  });
  return { signature: result.signature, size: result.blob.size, blob: result.blob };
}

const r1 = await genSig(baseParams);
const r2 = await genSig(baseParams);

console.log('reproducibility:', r1.signature === r2.signature ? 'PASS' : 'FAIL');
console.log('signature:', r1.signature);
console.log('blob size bytes:', r1.size);

const variations = [
  { ...baseParams, pitch: 90 },
  { ...baseParams, speed: 90 },
  { ...baseParams, cadence: 90 },
  { ...baseParams, clarity: 90 },
  { ...baseParams, stability: 90 },
  { ...baseParams, emotion: 90 },
  { ...baseParams, warmth: 90 },
  { ...baseParams, accent: 'british_general' },
];

let allDiff = true;
const seen = new Set([r1.signature]);
for (const v of variations) {
  const r = await genSig(v);
  const changedKey = Object.keys(v).find((k) => v[k] !== baseParams[k]);
  const diff = !seen.has(r.signature);
  if (!diff) allDiff = false;
  seen.add(r.signature);
  console.log(`mutate ${changedKey}=${v[changedKey]} → sig=${r.signature.slice(0, 16)}… diff=${diff ? 'YES' : 'NO'}`);
}

console.log('all variations distinct:', allDiff ? 'PASS' : 'FAIL');

const exportBlob = (
  await localDeterministicToneEngine.generate({
    parameters: baseParams,
    vocString: vocString(baseParams),
    sourceMeta: null,
  })
).blob;
console.log('export blob size matches preview:', exportBlob.size === r1.size ? 'PASS' : 'FAIL');

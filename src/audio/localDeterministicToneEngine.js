/*
 * LOCAL DETERMINISTIC TONE ENGINE
 *
 * Honest scope (BUILD STATUS truth):
 *   - This is NOT voice cloning.
 *   - This is NOT a voice analyzer.
 *   - It does NOT read the bytes of any uploaded audio/video.
 *   - It synthesizes a deterministic mono 16-bit PCM WAV in-browser from the
 *     VOC parameter values. Same parameters → same WAV bytes → same SHA-256.
 *   - Uploaded voice metadata (file name only, in current app) is passed
 *     through as sourceMeta but does NOT influence the output samples.
 *
 * Parameter-to-audio mapping (deterministic, documented, no randomness):
 *
 *   pitch (0..100)     → base frequency in Hz, mapped linearly 110..550 Hz.
 *                        Higher pitch → higher base tone frequency.
 *   speed (0..100)     → tempo multiplier 0.5..1.8, scales the modulation
 *                        and total clip length (faster pulses, shorter clip).
 *   cadence (0..100)   → tremolo (amplitude pulse) rate in Hz, mapped 1..9 Hz.
 *                        Higher cadence → faster on/off rhythm.
 *   clarity (0..100)   → harmonic mix: harmonic 2 weight 0..0.6 and
 *                        harmonic 3 weight 0..0.3. Higher clarity → richer
 *                        overtones.
 *   stability (0..100) → vibrato depth inverse, mapped 12..0 Hz peak deviation.
 *                        Higher stability → less pitch wobble.
 *   emotion (0..100)   → vibrato rate, mapped 1.5..7.5 Hz.
 *                        Higher emotion → faster wobble.
 *   warmth (0..100)    → sub-bass mix at base/2 freq, weight 0..0.45.
 *                        Higher warmth → more low-frequency body.
 *   accent (string)    → deterministic formant offset from accentSeed() in Hz,
 *                        added to base frequency. Different accents shift the
 *                        tone consistently; same accent always gives same shift.
 *
 * Clip length: 2.0s / speedMultiplier, clamped to [0.6s, 3.5s].
 * Sample rate: 22050 Hz mono, 16-bit PCM. Deterministic encoder.
 */

import { encodeWav, sha256Hex } from './wav.js';

const SAMPLE_RATE = 22050;
const PROVIDER_ID = 'local-deterministic-tone-engine';

const ACCENT_FORMANT_HZ = {
  neutral: 0,
  american_general: 6,
  american_southern: -14,
  british_general: 18,
  irish_general: 24,
  australian_general: 12,
  spanish_influenced: -8,
  caribbean_influenced: -20,
};

function clamp01(value) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function mapRange(value0to100, lo, hi) {
  const t = clamp01(Number(value0to100) / 100);
  return lo + (hi - lo) * t;
}

function accentSeed(accent) {
  if (Object.prototype.hasOwnProperty.call(ACCENT_FORMANT_HZ, accent)) {
    return ACCENT_FORMANT_HZ[accent];
  }
  return 0;
}

export function describeParameterMapping(parameters) {
  const baseFrequency = mapRange(parameters.pitch, 110, 550);
  const accentOffset = accentSeed(parameters.accent);
  const speedMultiplier = mapRange(parameters.speed, 0.5, 1.8);
  const tremoloHz = mapRange(parameters.cadence, 1, 9);
  const harm2 = mapRange(parameters.clarity, 0, 0.6);
  const harm3 = mapRange(parameters.clarity, 0, 0.3);
  const vibratoDepthHz = mapRange(parameters.stability, 12, 0);
  const vibratoRateHz = mapRange(parameters.emotion, 1.5, 7.5);
  const warmthMix = mapRange(parameters.warmth, 0, 0.45);
  const targetDuration = Math.max(0.6, Math.min(3.5, 2.0 / speedMultiplier));

  return {
    baseFrequencyHz: round3(baseFrequency + accentOffset),
    rawBaseFrequencyHz: round3(baseFrequency),
    accentFormantOffsetHz: accentOffset,
    speedMultiplier: round3(speedMultiplier),
    tremoloHz: round3(tremoloHz),
    harmonic2Weight: round3(harm2),
    harmonic3Weight: round3(harm3),
    vibratoDepthHz: round3(vibratoDepthHz),
    vibratoRateHz: round3(vibratoRateHz),
    warmthSubBassMix: round3(warmthMix),
    durationSeconds: round3(targetDuration),
    sampleRate: SAMPLE_RATE,
  };
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function synthesizeSamples(mapping) {
  const totalSamples = Math.floor(mapping.durationSeconds * SAMPLE_RATE);
  const samples = new Float32Array(totalSamples);
  const baseFreq = mapping.baseFrequencyHz;
  const attackSamples = Math.floor(0.02 * SAMPLE_RATE);
  const releaseSamples = Math.floor(0.05 * SAMPLE_RATE);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;

    const vibrato =
      mapping.vibratoDepthHz *
      Math.sin(2 * Math.PI * mapping.vibratoRateHz * t);
    const instantFreq = baseFreq + vibrato;
    const phase = 2 * Math.PI * instantFreq * t;

    const fundamental = Math.sin(phase);
    const harm2 = mapping.harmonic2Weight * Math.sin(2 * phase);
    const harm3 = mapping.harmonic3Weight * Math.sin(3 * phase);
    const sub =
      mapping.warmthSubBassMix *
      Math.sin(2 * Math.PI * (baseFreq / 2) * t);

    let voice = fundamental + harm2 + harm3 + sub;

    const tremolo =
      0.5 + 0.5 * Math.sin(2 * Math.PI * mapping.tremoloHz * t);
    voice *= 0.45 + 0.55 * tremolo;

    let envelope = 1;
    if (i < attackSamples) {
      envelope = i / attackSamples;
    } else if (i > totalSamples - releaseSamples) {
      envelope = Math.max(0, (totalSamples - i) / releaseSamples);
    }

    samples[i] = voice * envelope * 0.6;
  }

  return samples;
}

export const localDeterministicToneEngine = {
  id: PROVIDER_ID,
  label: 'Local Deterministic Tone Engine',
  kind: 'local',
  analyzesUploads: false,
  clonesUploads: false,

  async available() {
    const hasArrayBuffer = typeof ArrayBuffer !== 'undefined';
    const hasBlob = typeof Blob !== 'undefined';
    if (!hasArrayBuffer || !hasBlob) {
      return {
        ok: false,
        reason: 'Browser missing ArrayBuffer/Blob support required to synthesize WAV.',
      };
    }
    return { ok: true };
  },

  async generate({ parameters, vocString, sourceMeta }) {
    const availability = await this.available();
    if (!availability.ok) {
      throw new Error(availability.reason);
    }

    const mapping = describeParameterMapping(parameters);
    const samples = synthesizeSamples(mapping);
    const arrayBuffer = encodeWav(samples, SAMPLE_RATE);
    const signature = await sha256Hex(arrayBuffer);
    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });

    return {
      blob,
      mimeType: 'audio/wav',
      extension: 'wav',
      signature,
      durationMs: Math.round(mapping.durationSeconds * 1000),
      sampleRate: SAMPLE_RATE,
      parameterMapping: mapping,
      providerId: PROVIDER_ID,
      vocString,
      sourceMeta: sourceMeta || null,
    };
  },
};

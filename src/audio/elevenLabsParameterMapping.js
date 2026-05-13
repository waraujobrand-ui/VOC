/*
 * VOC → ElevenLabs parameter mapping.
 *
 * Truth statement:
 *   - This mapping itself is DETERMINISTIC: same VOC parameters always produce
 *     the same ElevenLabs request payload.
 *   - ElevenLabs TTS output, however, is NOT guaranteed to be byte-deterministic
 *     even when the `seed` field is provided (docs explicitly do not guarantee
 *     reproducible bytes). Do NOT claim reproducible bytes for real provider
 *     audio.
 *
 * VOC params (0..100 sliders, plus accent string) map to:
 *   - voice_settings.stability   (0..1)  ← VOC stability
 *   - voice_settings.similarity_boost (0..1) ← VOC clarity
 *   - voice_settings.style       (0..1)  ← VOC emotion
 *   - voice_settings.use_speaker_boost (bool) ← VOC warmth > 50
 *   - speed (when supported in some models, 0.7..1.2) ← VOC speed
 *   - seed (deterministic int derived from full VOC parameter set)
 *
 * Other VOC parameters (pitch, cadence, accent) do not have a direct
 * ElevenLabs slider equivalent and are NOT silently transformed; they are
 * captured in the mapping report so the user can see what is and isn't
 * forwarded to the provider.
 */

import { LOCKED_PARAMETERS, DEFAULT_PARAMETERS } from '../constants.js';

function clamp(value, lo, hi) {
  if (Number.isNaN(value)) return lo;
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

function pct(value0to100) {
  const n = Number(value0to100);
  if (!Number.isFinite(n)) return 0;
  return clamp(n, 0, 100) / 100;
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function deterministicSeed(parameters) {
  // Simple stable hash across the locked parameter set. Same params → same int.
  let hash = 2166136261;
  for (const key of LOCKED_PARAMETERS) {
    const raw =
      parameters[key] === undefined || parameters[key] === null
        ? DEFAULT_PARAMETERS[key]
        : parameters[key];
    const str = `${key}=${raw}`;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
  }
  return hash >>> 0;
}

export function mapVocToElevenLabsRequest(parameters) {
  const stability = round3(pct(parameters.stability));
  const similarity = round3(pct(parameters.clarity));
  const style = round3(pct(parameters.emotion));
  const speakerBoost = pct(parameters.warmth) > 0.5;
  const speed = round3(0.7 + pct(parameters.speed) * (1.2 - 0.7));
  const seed = deterministicSeed(parameters);

  const forwarded = {
    voice_settings: {
      stability,
      similarity_boost: similarity,
      style,
      use_speaker_boost: speakerBoost,
    },
    speed,
    seed,
  };

  const unsupported = {
    pitch: parameters.pitch ?? DEFAULT_PARAMETERS.pitch,
    cadence: parameters.cadence ?? DEFAULT_PARAMETERS.cadence,
    accent: parameters.accent ?? DEFAULT_PARAMETERS.accent,
  };

  return {
    forwarded,
    unsupported,
    notes: [
      'voice_settings mapping is deterministic; provider audio is not guaranteed reproducible.',
      'pitch, cadence, accent are not forwarded — ElevenLabs does not expose direct sliders for them.',
    ],
  };
}

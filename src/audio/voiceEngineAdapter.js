/*
 * VOICE ENGINE ADAPTER CONTRACT
 *
 * Any voice provider plugged into VOC must implement this shape:
 *
 *   {
 *     id: string,                // stable identifier, e.g. 'local-deterministic-tone-engine'
 *     label: string,              // human-readable, shown in UI
 *     kind: 'local' | 'remote',   // local = synthesized in-browser; remote = network call
 *     analyzesUploads: boolean,   // whether provider actually inspects uploaded voice bytes
 *     clonesUploads: boolean,     // whether provider clones the uploaded voice
 *     available(): Promise<{ ok: boolean, reason?: string }>,
 *     generate({ parameters, vocString, sourceMeta }): Promise<GenerationResult>,
 *   }
 *
 * GenerationResult shape:
 *   {
 *     blob: Blob,                 // playable audio blob (WAV preferred)
 *     mimeType: string,           // e.g. 'audio/wav'
 *     extension: string,          // e.g. 'wav'
 *     signature: string,          // deterministic hash of the blob bytes
 *     durationMs: number,         // length of generated clip
 *     sampleRate: number,
 *     parameterMapping: object,   // exact numeric values used by the provider
 *     providerId: string,         // mirrors adapter.id
 *     vocString: string,          // VOC string used to produce this clip
 *   }
 *
 * Rules:
 *   - Same parameters + same provider MUST produce the same signature bytes.
 *   - The blob returned MUST be the exact blob exported and played back.
 *   - If the provider cannot run, available() returns ok: false with a reason.
 *   - Adapter MUST NOT claim to clone uploaded audio unless clonesUploads: true.
 */

export const VOICE_ENGINE_CONTRACT_VERSION = 1;

export function isVoiceEngineAdapter(candidate) {
  return (
    candidate &&
    typeof candidate === 'object' &&
    typeof candidate.id === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.kind === 'string' &&
    typeof candidate.available === 'function' &&
    typeof candidate.generate === 'function'
  );
}

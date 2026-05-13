/*
 * REAL PROVIDER ADAPTER — ElevenLabs path.
 *
 * Honest scope:
 *   - This adapter NEVER fabricates audio. If the backend serverless function
 *     reports the provider is disconnected, or any call fails, this adapter
 *     reports failure. There is NO hidden local fallback inside this adapter.
 *   - Clone calls a backend function that proxies multipart upload to
 *     ElevenLabs POST /v1/voices/add.
 *   - Generate (preview) calls a backend function that proxies to
 *     ElevenLabs POST /v1/text-to-speech/:voice_id.
 *   - All ElevenLabs API key handling happens in the backend function. The
 *     browser never sees the key.
 *   - Analysis of uploads into VOC parameters is NOT implemented; capability
 *     is reported as unavailable.
 */

import { mapVocToElevenLabsRequest } from './elevenLabsParameterMapping.js';

export const REAL_PROVIDER_ID = 'elevenlabs-real';

const STATUS_ENDPOINT = '/.netlify/functions/elevenlabs-status';
const CLONE_ENDPOINT = '/.netlify/functions/elevenlabs-clone';
const GENERATE_ENDPOINT = '/.netlify/functions/elevenlabs-generate';

const DEFAULT_CAPABILITIES = {
  connected: false,
  cloning: false,
  analysis: false,
  preview: false,
  export: false,
};

export function defaultRealProviderCapabilities() {
  return { ...DEFAULT_CAPABILITIES };
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchRealProviderStatus(fetchImpl = fetch) {
  try {
    const res = await fetchImpl(STATUS_ENDPOINT, { method: 'GET' });
    const data = await safeJson(res);
    if (!res.ok || !data) {
      return {
        ok: false,
        connected: false,
        capabilities: {
          ...DEFAULT_CAPABILITIES,
          analysis: false,
        },
        reason:
          (data && data.reason) ||
          `status endpoint returned ${res.status}`,
        provider: 'elevenlabs',
      };
    }
    return {
      ok: true,
      connected: !!data.connected,
      capabilities: {
        connected: !!data.connected,
        cloning: !!data.connected,
        analysis: false,
        preview: !!data.connected,
        export: false,
      },
      reason: data.reason || '',
      provider: data.provider || 'elevenlabs',
      docs_url: data.docs_url || null,
    };
  } catch (err) {
    return {
      ok: false,
      connected: false,
      capabilities: { ...DEFAULT_CAPABILITIES },
      reason: err?.message || String(err),
      provider: 'elevenlabs',
    };
  }
}

export async function realProviderClone({ file, name }, fetchImpl = fetch) {
  if (!file) {
    return {
      ok: false,
      reason: 'no audio file selected for cloning',
      voice_id: null,
    };
  }
  try {
    const form = new FormData();
    form.append('name', name || 'VOC Source Voice');
    form.append('files', file, file.name || 'voc-source.wav');
    const res = await fetchImpl(CLONE_ENDPOINT, {
      method: 'POST',
      body: form,
    });
    const data = await safeJson(res);

    if (res.status === 503) {
      return {
        ok: false,
        reason:
          (data && data.reason) ||
          'ElevenLabs provider not connected (no API key configured on backend).',
        voice_id: null,
        disconnected: true,
      };
    }

    if (!res.ok || !data || !data.voice_id) {
      return {
        ok: false,
        reason:
          (data && (data.reason || data.error)) ||
          `clone endpoint returned ${res.status}`,
        voice_id: null,
      };
    }

    return {
      ok: true,
      voice_id: data.voice_id,
      requires_verification: !!data.requires_verification,
      provider: 'elevenlabs',
      raw: data,
    };
  } catch (err) {
    return {
      ok: false,
      reason: err?.message || String(err),
      voice_id: null,
    };
  }
}

export async function realProviderGenerate(
  { voiceId, text, parameters },
  fetchImpl = fetch,
) {
  if (!voiceId) {
    return {
      ok: false,
      reason: 'no provider voice_id — clone a source first',
    };
  }
  if (!text || !text.trim()) {
    return {
      ok: false,
      reason: 'no text supplied for TTS preview',
    };
  }
  const mapping = mapVocToElevenLabsRequest(parameters);
  try {
    const res = await fetchImpl(GENERATE_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        voice_id: voiceId,
        text,
        mapping,
      }),
    });

    if (res.status === 503) {
      const data = await safeJson(res);
      return {
        ok: false,
        reason:
          (data && data.reason) ||
          'ElevenLabs provider not connected (no API key configured on backend).',
        disconnected: true,
      };
    }

    if (!res.ok) {
      const data = await safeJson(res);
      return {
        ok: false,
        reason:
          (data && (data.reason || data.error)) ||
          `generate endpoint returned ${res.status}`,
      };
    }

    const blob = await res.blob();
    if (!blob || blob.size === 0) {
      return {
        ok: false,
        reason: 'empty audio blob returned from provider',
      };
    }
    return {
      ok: true,
      blob,
      mimeType: blob.type || 'audio/mpeg',
      mapping,
      provider: 'elevenlabs',
    };
  } catch (err) {
    return {
      ok: false,
      reason: err?.message || String(err),
    };
  }
}

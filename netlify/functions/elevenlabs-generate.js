/*
 * POST /.netlify/functions/elevenlabs-generate
 *
 * Proxies to ElevenLabs Text-to-Speech:
 *   POST https://api.elevenlabs.io/v1/text-to-speech/:voice_id
 *
 * Request body (JSON):
 *   { voice_id: string, text: string, mapping: { forwarded: {...} } }
 *
 * Response: audio bytes (audio/mpeg by default) streamed back to the client
 * unchanged. If ELEVENLABS_API_KEY is not configured, returns 503 with a
 * structured JSON reason and never invents audio.
 *
 * The frontend mapping is treated as the source of truth for voice_settings,
 * speed, and seed. ElevenLabs does not guarantee deterministic bytes even
 * with a seed; the response is forwarded as-is and not cached.
 */

const TTS_URL_PREFIX = 'https://api.elevenlabs.io/v1/text-to-speech/';

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, reason: 'POST required' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return jsonResponse(503, {
      ok: false,
      reason:
        'ELEVENLABS_API_KEY is not configured on the backend. Provider disconnected — real preview unavailable.',
      provider: 'elevenlabs',
      disconnected: true,
    });
  }

  let payload;
  try {
    payload = await req.json();
  } catch (err) {
    return jsonResponse(400, {
      ok: false,
      reason: `invalid JSON body: ${err?.message || String(err)}`,
    });
  }

  const { voice_id: voiceId, text, mapping } = payload || {};
  if (!voiceId || typeof voiceId !== 'string') {
    return jsonResponse(400, {
      ok: false,
      reason: 'voice_id is required',
    });
  }
  if (!text || typeof text !== 'string' || !text.trim()) {
    return jsonResponse(400, {
      ok: false,
      reason: 'text is required',
    });
  }

  const forwarded = (mapping && mapping.forwarded) || {};
  const body = {
    text,
    model_id: 'eleven_multilingual_v2',
  };
  if (forwarded.voice_settings) {
    body.voice_settings = forwarded.voice_settings;
  }
  if (typeof forwarded.seed === 'number') {
    body.seed = forwarded.seed;
  }
  if (typeof forwarded.speed === 'number') {
    body.speed = forwarded.speed;
  }

  let upstream;
  try {
    upstream = await fetch(`${TTS_URL_PREFIX}${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'content-type': 'application/json',
        accept: 'audio/mpeg',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return jsonResponse(502, {
      ok: false,
      reason: `upstream fetch failed: ${err?.message || String(err)}`,
    });
  }

  if (!upstream.ok) {
    let detail = null;
    try {
      detail = await upstream.json();
    } catch {
      detail = null;
    }
    return jsonResponse(upstream.status, {
      ok: false,
      reason:
        (detail && (detail.detail?.message || detail.detail || detail.error || detail.message)) ||
        `ElevenLabs returned ${upstream.status}`,
      provider: 'elevenlabs',
    });
  }

  const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
  const audioBuffer = await upstream.arrayBuffer();
  return new Response(audioBuffer, {
    status: 200,
    headers: {
      'content-type': contentType,
      'cache-control': 'no-store',
    },
  });
}

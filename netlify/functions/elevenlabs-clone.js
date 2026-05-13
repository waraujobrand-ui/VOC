/*
 * POST /.netlify/functions/elevenlabs-clone
 *
 * Proxies a multipart upload to ElevenLabs Instant Voice Cloning (IVC):
 *   POST https://api.elevenlabs.io/v1/voices/add
 *   Required form fields: name, files
 *
 * If ELEVENLABS_API_KEY is not configured, returns 503 with structured reason.
 * Never exposes the API key to the response body or to the client.
 *
 * Uses Netlify's "v2" handler signature (Request/Response, native fetch
 * available globally) so we can stream multipart bodies through without
 * re-encoding them. The form-data shape is forwarded verbatim.
 */

const ELEVENLABS_ADD_VOICE_URL = 'https://api.elevenlabs.io/v1/voices/add';

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
        'ELEVENLABS_API_KEY is not configured on the backend. Provider disconnected — real cloning unavailable.',
      provider: 'elevenlabs',
      disconnected: true,
    });
  }

  let form;
  try {
    form = await req.formData();
  } catch (err) {
    return jsonResponse(400, {
      ok: false,
      reason: `invalid multipart body: ${err?.message || String(err)}`,
    });
  }

  const name = form.get('name');
  const files = form.getAll('files');
  if (!name || files.length === 0) {
    return jsonResponse(400, {
      ok: false,
      reason: 'multipart form must include `name` and at least one `files` entry',
    });
  }

  const forwardForm = new FormData();
  forwardForm.append('name', String(name));
  for (const file of files) {
    forwardForm.append('files', file, file.name || 'voc-source.wav');
  }
  const description = form.get('description');
  if (description) forwardForm.append('description', String(description));
  const labels = form.get('labels');
  if (labels) forwardForm.append('labels', String(labels));
  const removeBg = form.get('remove_background_noise');
  if (removeBg !== null && removeBg !== undefined) {
    forwardForm.append('remove_background_noise', String(removeBg));
  }

  let upstream;
  try {
    upstream = await fetch(ELEVENLABS_ADD_VOICE_URL, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: forwardForm,
    });
  } catch (err) {
    return jsonResponse(502, {
      ok: false,
      reason: `upstream fetch failed: ${err?.message || String(err)}`,
    });
  }

  let data = null;
  try {
    data = await upstream.json();
  } catch {
    data = null;
  }

  if (!upstream.ok) {
    return jsonResponse(upstream.status, {
      ok: false,
      reason:
        (data && (data.detail?.message || data.detail || data.error || data.message)) ||
        `ElevenLabs returned ${upstream.status}`,
      provider: 'elevenlabs',
    });
  }

  if (!data || !data.voice_id) {
    return jsonResponse(502, {
      ok: false,
      reason: 'ElevenLabs response missing voice_id',
      provider: 'elevenlabs',
    });
  }

  return jsonResponse(200, {
    ok: true,
    provider: 'elevenlabs',
    voice_id: data.voice_id,
    requires_verification:
      typeof data.requires_verification === 'boolean'
        ? data.requires_verification
        : false,
  });
}

/*
 * GET /.netlify/functions/elevenlabs-status
 *
 * Truth-only status endpoint. Does not call out to ElevenLabs.
 * Reports whether an ELEVENLABS_API_KEY is configured on the backend so the
 * frontend can render an honest connected/disconnected capability matrix.
 *
 * Response shape:
 *   {
 *     provider: 'elevenlabs',
 *     connected: boolean,
 *     reason: string,
 *     docs_url: string
 *   }
 *
 * No secret material is ever included in the response. Uses Netlify v2
 * handler shape (default export returning a Response) to match the clone
 * and generate functions.
 */

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export default async function handler() {
  const key = process.env.ELEVENLABS_API_KEY;
  const connected = typeof key === 'string' && key.trim().length > 0;
  return jsonResponse(200, {
    provider: 'elevenlabs',
    connected,
    reason: connected
      ? 'ELEVENLABS_API_KEY is configured on the backend.'
      : 'ELEVENLABS_API_KEY is not configured on the backend; provider is disconnected.',
    docs_url: 'https://elevenlabs.io/docs/api-reference',
  });
}

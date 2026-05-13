export default function BuildStatusPanel({
  providerStatus,
  provider,
  realProviderStatus,
  realProviderCapabilities,
}) {
  const audioAvailable = providerStatus.ok === true;
  const audioPending = providerStatus.ok === null;

  const rp = realProviderStatus || {
    checked: false,
    connected: false,
    reason: 'real provider not initialized',
  };
  const caps = realProviderCapabilities || {
    connected: false,
    cloning: false,
    analysis: false,
    preview: false,
    export: false,
  };

  return (
    <section className="voc-card voc-build-status-panel">
      <span className="voc-card-subtitle">BUILD STATUS</span>
      <h2>Real Audio Truth</h2>
      <ul className="voc-build-status-list">
        <li>
          <strong>Local deterministic audio generation:</strong>{' '}
          {audioPending
            ? 'checking…'
            : audioAvailable
            ? `AVAILABLE — ${provider.label}`
            : `UNAVAILABLE — ${providerStatus.reason}`}
        </li>
        <li>
          <strong>Real voice cloning backend (ElevenLabs IVC):</strong>{' '}
          {!rp.checked
            ? 'checking…'
            : rp.connected
            ? 'CONNECTED — uploads can be sent to ElevenLabs /v1/voices/add to receive a real voice_id.'
            : `DISCONNECTED — ${rp.reason}`}
        </li>
        <li>
          <strong>Real provider preview (ElevenLabs TTS):</strong>{' '}
          {caps.preview
            ? 'AVAILABLE — preview calls /v1/text-to-speech/:voice_id and plays the returned blob.'
            : 'UNAVAILABLE — requires connected provider and a real voice_id.'}
        </li>
        <li>
          <strong>Voice analyzer backend:</strong> NOT IMPLEMENTED. No
          byte-level analysis of uploaded audio into VOC parameters is
          performed by this build.
        </li>
        <li>
          <strong>Real provider determinism:</strong> Local engine output is
          byte-deterministic. ElevenLabs TTS output is NOT guaranteed
          byte-deterministic even when a seed is supplied. The VOC →
          ElevenLabs parameter mapping IS deterministic.
        </li>
        <li>
          <strong>Hidden fallback:</strong> NONE. The real provider path does
          not silently fall back to the local engine — if the provider call
          fails, the UI reports an explicit failure state.
        </li>
        <li>
          <strong>Output format:</strong> Local engine = 16-bit PCM WAV, mono,
          deterministic encoder; same parameters always produce the same WAV
          bytes and SHA-256 signature. ElevenLabs preview = audio/mpeg (MP3)
          forwarded unchanged from the provider.
        </li>
        <li>
          <strong>Preview ↔ Export identity:</strong> Both paths export the
          exact preview blob, not a re-render.
        </li>
        <li>
          <strong>Cost / rate-limit:</strong> When the real provider is
          connected, each clone and preview consumes ElevenLabs plan quota
          (cloning slots, character credits, concurrency limits). No numeric
          estimates are claimed here.
        </li>
        <li>
          <strong>Profile reuse:</strong> Loading a saved profile and
          generating uses the loaded parameters; for the local engine the
          resulting signature is reproducible across reloads.
        </li>
      </ul>
    </section>
  );
}

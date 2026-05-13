export default function BuildStatusPanel({ providerStatus, provider }) {
  const audioAvailable = providerStatus.ok === true;
  const audioPending = providerStatus.ok === null;

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
          <strong>Real voice cloning backend:</strong> NOT CONNECTED. No remote
          voice cloning provider is wired up.
        </li>
        <li>
          <strong>Voice analyzer backend:</strong> NOT CONNECTED. Uploaded
          audio/video is recorded as source metadata only; no byte-level
          analysis is performed.
        </li>
        <li>
          <strong>Output format:</strong> 16-bit PCM WAV, mono, deterministic
          encoder. Same parameters always produce the same WAV bytes and the
          same SHA-256 signature.
        </li>
        <li>
          <strong>Preview ↔ Export identity:</strong> The Export button
          downloads the exact same blob that the preview player is playing.
        </li>
        <li>
          <strong>Profile reuse:</strong> Loading a saved profile and generating
          uses the loaded parameters; the resulting signature is reproducible
          across reloads.
        </li>
      </ul>
    </section>
  );
}

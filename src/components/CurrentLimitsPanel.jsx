export default function CurrentLimitsPanel({
  realProviderStatus,
  realProviderCapabilities,
}) {
  const checked = !!(realProviderStatus && realProviderStatus.checked);
  const connected = !!(realProviderStatus && realProviderStatus.connected);
  const caps = realProviderCapabilities || {
    connected: false,
    cloning: false,
    analysis: false,
    preview: false,
    export: false,
  };

  let audioBadge;
  if (!checked) {
    audioBadge = 'Audio generation status checking…';
  } else if (connected && caps.preview) {
    audioBadge = 'Audio generation provider connected';
  } else {
    audioBadge = 'Audio generation not connected';
  }

  return (
    <section className="voc-card voc-limits-panel">
      <h2>Current Limits</h2>
      <div className="voc-badge-row">
        <span className="voc-badge">Analysis engine not connected</span>
        <span
          className="voc-badge"
          data-testid="voc-limits-audio-badge"
        >
          {audioBadge}
        </span>
        <span className="voc-badge">Manual workflow only</span>
        <span className="voc-badge">No fake detection</span>
      </div>
    </section>
  );
}

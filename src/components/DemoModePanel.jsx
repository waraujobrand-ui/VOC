export default function DemoModePanel({
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
    <section className="voc-card voc-demo-panel">
      <h2>Demo Mode</h2>
      <div className="voc-badge-row">
        <span className="voc-badge">Analysis engine not connected</span>
        <span
          className="voc-badge"
          data-testid="voc-demo-audio-badge"
        >
          {audioBadge}
        </span>
        <span className="voc-badge">Manual parameter workflow active</span>
      </div>
    </section>
  );
}

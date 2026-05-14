export default function AppHeader({ realProviderStatus, realProviderCapabilities }) {
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
    audioBadge = 'Audio generation connected';
  } else {
    audioBadge = 'No audio generation connected';
  }

  const analysisBadge = caps.analysis
    ? 'Voice analysis available'
    : 'Analysis unavailable';

  const cloneBadge = checked && connected && caps.cloning
    ? 'Voice cloning connected'
    : 'Manual parameters only';

  return (
    <header className="voc-header">
      <div className="voc-brand">
        <div className="voc-logo" aria-label="VOC logo">
          VOC
        </div>
        <div>
          <h1>VOC</h1>
          <p className="voc-tagline">Voice Identity Profiling System</p>
        </div>
        <span className="voc-version">v0.1-alpha</span>
      </div>
      <div className="voc-badge-row">
        <span
          className="voc-badge"
          data-testid="voc-header-analysis-badge"
        >
          {analysisBadge}
        </span>
        <span
          className="voc-badge"
          data-testid="voc-header-clone-badge"
        >
          {cloneBadge}
        </span>
        <span
          className="voc-badge"
          data-testid="voc-header-audio-badge"
        >
          {audioBadge}
        </span>
      </div>
      <a
        href="#real-provider-controls"
        className="voc-header-jump-link"
        data-testid="voc-header-jump-real-provider"
      >
        Jump to real provider controls →
      </a>
    </header>
  );
}

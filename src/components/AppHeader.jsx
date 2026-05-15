/**
 * AppHeader
 *
 * minimal=true  → just the logo/wordmark. No capability badges.
 *                  Used on the entry screen so first-time users don't see
 *                  system status before they've done anything.
 *
 * minimal=false (default) → full header with a quiet single status line
 *                  replacing the old three noisy capability badges.
 */
export default function AppHeader({
  realProviderStatus,
  realProviderCapabilities,
  minimal = false,
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

  // Single quiet status: one dot, one phrase. No architecture detail.
  let statusLabel;
  if (!checked) {
    statusLabel = null; // still checking — show nothing
  } else if (connected && caps.preview) {
    statusLabel = 'Voice service ready';
  } else if (connected) {
    statusLabel = 'Voice service connected';
  } else {
    statusLabel = 'Voice service not configured';
  }

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

      {/* Only show status line when NOT in minimal mode */}
      {!minimal && statusLabel && (
        <div className="voc-header-status-row">
          <span
            className={`voc-header-status-dot ${connected ? 'voc-header-status-dot--on' : 'voc-header-status-dot--off'}`}
            aria-hidden="true"
          />
          <span
            className="voc-header-status-label"
            data-testid="voc-header-status-label"
          >
            {statusLabel}
          </span>
        </div>
      )}
    </header>
  );
}

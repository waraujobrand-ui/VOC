export default function AppHeader() {
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
        <span className="voc-badge">Analysis unavailable</span>
        <span className="voc-badge">Manual parameters only</span>
        <span className="voc-badge">No audio generation connected</span>
      </div>
    </header>
  );
}

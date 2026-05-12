export default function DemoModePanel() {
  return (
    <section className="voc-card voc-demo-panel">
      <h2>Demo Mode</h2>
      <div className="voc-badge-row">
        <span className="voc-badge">Analysis engine not connected</span>
        <span className="voc-badge">Audio generation not connected</span>
        <span className="voc-badge">Manual parameter workflow active</span>
      </div>
    </section>
  );
}

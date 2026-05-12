export default function CurrentLimitsPanel() {
  return (
    <section className="voc-card voc-limits-panel">
      <h2>Current Limits</h2>
      <div className="voc-badge-row">
        <span className="voc-badge">Analysis engine not connected</span>
        <span className="voc-badge">Audio generation not connected</span>
        <span className="voc-badge">Manual workflow only</span>
        <span className="voc-badge">No fake detection</span>
      </div>
    </section>
  );
}

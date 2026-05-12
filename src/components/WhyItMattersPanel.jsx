export default function WhyItMattersPanel() {
  return (
    <section className="voc-card voc-investor-panel">
      <h2>Why It Matters</h2>
      <div className="voc-explainer-grid">
        <div>
          <h3>Voice apps use vague presets</h3>
          <p>Most workflows describe voices with loose labels that are hard to reuse or tune precisely.</p>
        </div>
        <div>
          <h3>VOC uses structured parameters</h3>
          <p>Profiles organize voice identity into clear controls like pitch, cadence, clarity, warmth, and accent.</p>
        </div>
        <div>
          <h3>Saved profiles make voices reusable</h3>
          <p>A VOC profile can be loaded, duplicated, edited, exported, and imported without changing its schema.</p>
        </div>
        <div>
          <h3>Future analysis can estimate parameters</h3>
          <p>Uploaded audio or video can later feed a real analyzer that estimates profile parameters from measurable traits.</p>
        </div>
      </div>
    </section>
  );
}

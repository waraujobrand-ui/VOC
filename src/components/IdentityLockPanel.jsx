export default function IdentityLockPanel() {
  return (
    <section className="voc-card voc-identity-panel">
      <h2>Identity Lock</h2>
      <div className="voc-explainer-grid">
        <div>
          <h3>Base voice identity is protected</h3>
          <p>The persistent source voice stays intact while profiles reference it as reusable identity infrastructure.</p>
        </div>
        <div>
          <h3>Expression layers do the modification</h3>
          <p>Emotion, delivery, and style layers adjust presentation without replacing the underlying identity.</p>
        </div>
        <div>
          <h3>Profiles stay reusable and consistent</h3>
          <p>Saved profiles preserve structured settings so the same voice identity can return across sessions.</p>
        </div>
        <div>
          <h3>Non-destructive by design</h3>
          <p>VOC layers identity-consistent variation instead of permanently transforming or overwriting a voice.</p>
        </div>
      </div>
    </section>
  );
}

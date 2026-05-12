export default function IdentityConsistencyPanel() {
  return (
    <section className="voc-card voc-identity-panel">
      <h2>Identity Consistency</h2>
      <p>
        A character voice can carry different expression layers while
        remaining the same core identity.
      </p>
      <div className="voc-character-grid">
        <span>Chris - Neutral</span>
        <span>Chris - Angry</span>
        <span>Chris - Crying</span>
        <span>Chris - Whispering</span>
      </div>
      <p className="voc-identity-statement">All remain: "the same core identity"</p>
    </section>
  );
}

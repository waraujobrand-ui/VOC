export default function VoiceOwnershipPanel() {
  return (
    <section className="voc-card voc-identity-panel">
      <h2>Voice Ownership Integrity</h2>
      <ul className="voc-feature-list">
        <li>Original uploaded or recorded voices are never modified automatically.</li>
        <li>VOC never deletes or overwrites source identity.</li>
        <li>Only explicit user actions can replace or remove a source.</li>
        <li>Saved voice sources remain persistent assets.</li>
      </ul>
    </section>
  );
}

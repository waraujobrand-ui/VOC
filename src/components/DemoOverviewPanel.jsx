export default function DemoOverviewPanel() {
  return (
    <section className="voc-card voc-landing-panel">
      <h2>Demo Overview</h2>
      <p>
        VOC stores persistent source voices, lets users manually layer
        expression through structured parameters, persists reusable voice
        profiles in localStorage, and keeps a future analysis pipeline visible
        without pretending it is connected.
      </p>
      <ul className="voc-feature-list">
        <li>Saved voice sources collect audio/video filenames only.</li>
        <li>Manual parameter control remains the only profile input path.</li>
        <li>Profile persistence is frontend-only and non-destructive.</li>
        <li>Future analysis fields are schema-safe placeholders.</li>
        <li>Frontend truth policy: no fake analysis, detection, or generation.</li>
      </ul>
    </section>
  );
}

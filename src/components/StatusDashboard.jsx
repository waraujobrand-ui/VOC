import { DEFAULT_ANALYSIS_STATUS } from '../constants.js';

export default function StatusDashboard({
  savedProfiles,
  savedVoices,
  audioFileName,
  videoFileName,
}) {
  return (
    <section className="voc-card">
      <h2>Status Dashboard</h2>
      <div className="voc-status-grid">
        <div className="voc-status-item">
          <span>Saved profiles</span>
          <strong>{savedProfiles.length}</strong>
        </div>
        <div className="voc-status-item">
          <span>Saved voice sources</span>
          <strong>{savedVoices.length}</strong>
        </div>
        <div className="voc-status-item">
          <span>Selected audio file</span>
          <strong>{audioFileName || 'None'}</strong>
        </div>
        <div className="voc-status-item">
          <span>Selected video file</span>
          <strong>{videoFileName || 'None'}</strong>
        </div>
        <div className="voc-status-item">
          <span>Analysis engine status</span>
          <strong>{DEFAULT_ANALYSIS_STATUS}</strong>
        </div>
      </div>
    </section>
  );
}

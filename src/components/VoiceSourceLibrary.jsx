import { SORT_MODES } from '../constants.js';

export default function VoiceSourceLibrary({
  audioFileName,
  videoFileName,
  handleAudioUpload,
  handleVideoUpload,
  saveVoiceSource,
  savedVoices,
  filteredVoices,
  voiceSearch,
  setVoiceSearch,
  voiceSortMode,
  setVoiceSortMode,
  loadVoiceSource,
  deleteVoiceSource,
  createProfileFromSource,
}) {
  return (
    <section className="voc-card">
      <h2>Voice Source Library</h2>
      <p>Voice analysis engine unavailable</p>

      <label className="voc-field">
        Upload Audio
        <input type="file" accept="audio/*" onChange={handleAudioUpload} />
      </label>

      <label className="voc-field">
        Upload Video
        <input type="file" accept="video/*" onChange={handleVideoUpload} />
      </label>

      <p>Selected source: {videoFileName || audioFileName || 'None'}</p>

      <div className="voc-button-group">
        <button
          type="button"
          className="voc-button voc-button-primary"
          onClick={saveVoiceSource}
          disabled={!videoFileName && !audioFileName}
        >
          Save Voice Source
        </button>
      </div>

      <div className="voc-controls">
        <label className="voc-field">
          Search voice sources
          <input
            type="search"
            value={voiceSearch}
            onChange={(event) => setVoiceSearch(event.target.value)}
            placeholder="Search by name or source file"
          />
        </label>

        <label className="voc-field">
          Sort voice sources
          <select
            value={voiceSortMode}
            onChange={(event) => setVoiceSortMode(event.target.value)}
          >
            <option value={SORT_MODES.NEWEST}>newest</option>
            <option value={SORT_MODES.OLDEST}>oldest</option>
            <option value={SORT_MODES.ALPHABETICAL}>alphabetical</option>
          </select>
        </label>
      </div>

      {savedVoices.length === 0 ? (
        <div className="voc-empty-state">
          <h3>No saved voice sources yet</h3>
          <p>Start by uploading a source. VOC stores the filename only until a real analysis engine is connected.</p>
        </div>
      ) : filteredVoices.length === 0 ? (
        <div className="voc-empty-state">
          <h3>No source matches</h3>
          <p>Try searching by source name or filename.</p>
        </div>
      ) : (
        <ul className="voc-list">
          {filteredVoices.map((voice) => (
            <li key={voice.id} className="voc-list-item voc-voice-card">
              <div className="voc-card-heading-row">
                <div>
                  <span className="voc-source-type-badge">{voice.source_type}</span>
                  <h3 className="voc-source-file-name">{voice.source_file_name}</h3>
                </div>
                <span className="voc-status-pill">{voice.analysis_status}</span>
              </div>

              <div className="voc-profile-meta-grid">
                <p><span>name</span>{voice.name}</p>
                <p><span>base_voice_id</span>{voice.base_voice_id || 'null'}</p>
                <p><span>created_at</span>{voice.created_at}</p>
                <p><span>updated_at</span>{voice.updated_at}</p>
              </div>

              <div className="voc-analysis-grid">
                <p><span>analysis_traits</span>{voice.analysis_traits || 'null'}</p>
                <p><span>estimated_parameters</span>{voice.estimated_parameters || 'null'}</p>
                <p><span>analysis_error</span>{voice.analysis_error || 'null'}</p>
              </div>
              <div className="voc-button-group">
                <button
                  type="button"
                  className="voc-button voc-button-primary"
                  onClick={() => loadVoiceSource(voice)}
                >
                  Load Source
                </button>
                <button
                  type="button"
                  className="voc-button voc-button-danger"
                  onClick={() => deleteVoiceSource(voice.id)}
                >
                  Delete Source
                </button>
                <button
                  type="button"
                  className="voc-button voc-button-secondary"
                  onClick={() => createProfileFromSource(voice)}
                >
                  Create Profile
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

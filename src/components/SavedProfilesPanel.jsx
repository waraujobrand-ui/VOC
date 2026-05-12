import {
  DEFAULT_PARAMETERS,
  LOCKED_PARAMETERS,
  SORT_MODES,
} from '../constants.js';
import { createVocString } from '../schema.js';

export default function SavedProfilesPanel({
  savedProfiles,
  filteredProfiles,
  selectedExportProfileId,
  setSelectedExportProfileId,
  selectedExportProfile,
  exportSelectedProfile,
  importProfileJson,
  importStatus,
  profileSearch,
  setProfileSearch,
  profileSortMode,
  setProfileSortMode,
  loadProfile,
  deleteProfile,
  duplicateProfile,
  editProfile,
  copyProfileVocString,
  copiedProfileId,
}) {
  return (
    <section className="voc-card">
      <h2>Saved Profiles</h2>
      <div className="voc-controls">
        <label className="voc-field">
          Export profile JSON
          <select
            value={selectedExportProfileId}
            onChange={(event) =>
              setSelectedExportProfileId(event.target.value)
            }
          >
            <option value="">Select a saved profile</option>
            {savedProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>

        <div className="voc-export-panel">
          <button
            type="button"
            className="voc-button voc-button-primary"
            onClick={exportSelectedProfile}
            disabled={!selectedExportProfile}
          >
            Export Profile JSON
          </button>
        </div>
      </div>

      <label className="voc-field">
        Import Profile JSON
        <input type="file" accept=".json,application/json" onChange={importProfileJson} />
      </label>
      {importStatus ? (
        <p className="voc-copy-confirmation">{importStatus}</p>
      ) : null}

      <div className="voc-controls">
        <label className="voc-field">
          Search profiles
          <input
            type="search"
            value={profileSearch}
            onChange={(event) => setProfileSearch(event.target.value)}
            placeholder="Search by profile name"
          />
        </label>

        <label className="voc-field">
          Sort profiles
          <select
            value={profileSortMode}
            onChange={(event) => setProfileSortMode(event.target.value)}
          >
            <option value={SORT_MODES.NEWEST}>newest</option>
            <option value={SORT_MODES.OLDEST}>oldest</option>
            <option value={SORT_MODES.ALPHABETICAL}>alphabetical</option>
          </select>
        </label>
      </div>

      {savedProfiles.length === 0 ? (
        <div className="voc-empty-state">
          <h3>No saved profiles yet</h3>
          <p>Start by uploading a source or manually setting parameters, then save your first VOC profile.</p>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="voc-empty-state">
          <h3>No profile matches</h3>
          <p>Try a different profile name or clear the search field.</p>
        </div>
      ) : (
        <ul className="voc-list">
          {filteredProfiles.map((profile) => (
            <li key={profile.id} className="voc-list-item voc-profile-card">
              <div className="voc-card-heading-row">
                <div>
                  <h3 className="voc-profile-name">{profile.name}</h3>
                  <p className="voc-card-subtitle">Saved VOC profile</p>
                </div>
                <span className="voc-accent-pill">
                  {profile.parameters?.accent ?? DEFAULT_PARAMETERS.accent}
                </span>
              </div>

              <div className="voc-profile-meta-grid">
                <p><span>source_voice_id</span>{profile.source_voice_id || 'null'}</p>
                <p><span>base_voice_id</span>{profile.base_voice_id || 'null'}</p>
                <p><span>created_at</span>{profile.created_at}</p>
                <p><span>updated_at</span>{profile.updated_at}</p>
              </div>

              <div className="voc-profile-section">
                <span className="voc-section-label">Derived VOC string</span>
                <p className="voc-string voc-profile-voc-string">{createVocString(profile.parameters)}</p>
              </div>

              <div className="voc-profile-section">
                <span className="voc-section-label">Parameters summary</span>
                <div className="voc-param-summary">
                  {LOCKED_PARAMETERS.map((key) => (
                    <span key={key}>
                      <strong>{key}</strong>
                      {profile.parameters?.[key] ?? DEFAULT_PARAMETERS[key]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="voc-button-group">
                <button
                  type="button"
                  className="voc-button voc-button-primary"
                  onClick={() => loadProfile(profile)}
                >
                  Load
                </button>
                <button
                  type="button"
                  className="voc-button voc-button-danger"
                  onClick={() => deleteProfile(profile.id)}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="voc-button voc-button-secondary"
                  onClick={() => duplicateProfile(profile)}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="voc-button voc-button-secondary"
                  onClick={() => editProfile(profile)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="voc-button voc-button-secondary"
                  onClick={() => copyProfileVocString(profile)}
                >
                  Copy VOC String
                </button>
              </div>
              {copiedProfileId === profile.id ? (
                <p className="voc-copy-confirmation">Copied VOC string.</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

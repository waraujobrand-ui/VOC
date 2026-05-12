import { useEffect, useState } from 'react';

import {
  STORAGE_KEY,
  SAVED_VOICES_STORAGE_KEY,
  DEFAULT_ANALYSIS_STATUS,
  LOCKED_PARAMETERS,
  ACCENT_OPTIONS,
  DEFAULT_PARAMETERS,
  PARAMETER_GROUPS,
  SORT_MODES,
  VIEWS,
} from './constants.js';
import {
  createVocString,
  createProfile,
  createSavedVoice,
  validateProfile,
} from './schema.js';
import { safeLoadArray, saveArray } from './storage.js';
import {
  sortByMode,
  filterProfilesBySearch,
  filterVoicesBySearch,
  duplicateProfile as duplicateProfileObject,
} from './profileUtils.js';

export default function App() {
  const [parameters, setParameters] = useState(DEFAULT_PARAMETERS);
  const [savedProfiles, setSavedProfiles] = useState(() =>
    safeLoadArray(STORAGE_KEY),
  );
  const [savedVoices, setSavedVoices] = useState(() =>
    safeLoadArray(SAVED_VOICES_STORAGE_KEY),
  );
  const [profileName, setProfileName] = useState('');
  const [audioFileName, setAudioFileName] = useState('');
  const [videoFileName, setVideoFileName] = useState('');
  const [activeView, setActiveView] = useState(VIEWS.PROFILE_BUILDER);
  const [selectedVoiceSourceId, setSelectedVoiceSourceId] = useState(null);
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [profileSearch, setProfileSearch] = useState('');
  const [profileSortMode, setProfileSortMode] = useState(SORT_MODES.NEWEST);
  const [voiceSearch, setVoiceSearch] = useState('');
  const [voiceSortMode, setVoiceSortMode] = useState(SORT_MODES.NEWEST);
  const [copiedProfileId, setCopiedProfileId] = useState(null);
  const [selectedExportProfileId, setSelectedExportProfileId] = useState('');
  const [importStatus, setImportStatus] = useState('');

  const filteredProfiles = sortByMode(
    filterProfilesBySearch(savedProfiles, profileSearch),
    profileSortMode,
  );

  const filteredVoices = sortByMode(
    filterVoicesBySearch(savedVoices, voiceSearch),
    voiceSortMode,
  );

  const selectedExportProfile =
    savedProfiles.find((profile) => profile.id === selectedExportProfileId) ||
    null;

  useEffect(() => {
    saveArray(STORAGE_KEY, savedProfiles);
  }, [savedProfiles]);

  useEffect(() => {
    saveArray(SAVED_VOICES_STORAGE_KEY, savedVoices);
  }, [savedVoices]);

  function updateParameter(key, value) {
    setParameters((current) => ({
      ...current,
      [key]: key === 'accent' ? value : Number(value),
    }));
  }

  function saveProfile() {
    const now = new Date().toISOString();

    if (editingProfileId) {
      setSavedProfiles((current) =>
        current.map((profile) => {
          if (profile.id !== editingProfileId) {
            return profile;
          }

          return {
            ...profile,
            name: profileName,
            base_voice_id: profile.base_voice_id,
            source_voice_id: selectedVoiceSourceId || null,
            parameters: { ...parameters },
            created_at: profile.created_at,
            updated_at: now,
          };
        }),
      );
      setProfileName('');
      setEditingProfileId(null);
      setSelectedVoiceSourceId(null);
      return;
    }

    const profile = createProfile({
      name: profileName,
      parameters,
      sourceVoiceId: selectedVoiceSourceId,
      baseVoiceId: null,
      fallbackIndex: savedProfiles.length + 1,
    });

    setSavedProfiles((current) => [profile, ...current]);
    setProfileName('');
    setSelectedVoiceSourceId(null);
  }

  function loadProfile(profile) {
    setParameters({ ...DEFAULT_PARAMETERS, ...profile.parameters });
    setProfileName(profile.name);
  }

  function deleteProfile(profileId) {
    setSavedProfiles((current) =>
      current.filter((profile) => profile.id !== profileId),
    );
  }

  function duplicateProfile(profile) {
    setSavedProfiles((current) => [duplicateProfileObject(profile), ...current]);
  }

  function editProfile(profile) {
    setParameters({ ...DEFAULT_PARAMETERS, ...profile.parameters });
    setProfileName(profile.name);
    setSelectedVoiceSourceId(profile.source_voice_id || null);
    setEditingProfileId(profile.id);
    setActiveView(VIEWS.PROFILE_BUILDER);
  }

  function cancelEditProfile() {
    setEditingProfileId(null);
    setSelectedVoiceSourceId(null);
    setProfileName(`VOC Profile ${savedProfiles.length + 1}`);
  }

  function handleAudioUpload(event) {
    const fileName = event.target.files?.[0]?.name || '';
    setAudioFileName(fileName);

    if (fileName) {
      setVideoFileName('');
    }
  }

  function handleVideoUpload(event) {
    const fileName = event.target.files?.[0]?.name || '';
    setVideoFileName(fileName);

    if (fileName) {
      setAudioFileName('');
    }
  }

  function saveVoiceSource() {
    const sourceFileName = videoFileName || audioFileName;

    if (!sourceFileName) {
      return;
    }

    const sourceType = videoFileName ? 'video' : 'audio';
    const savedVoice = createSavedVoice({ sourceFileName, sourceType });

    setSavedVoices((current) => [savedVoice, ...current]);
  }

  function loadVoiceSource(voice) {
    if (voice.source_type === 'audio') {
      setAudioFileName(voice.source_file_name);
      setVideoFileName('');
    }

    if (voice.source_type === 'video') {
      setVideoFileName(voice.source_file_name);
      setAudioFileName('');
    }
  }

  function deleteVoiceSource(voiceId) {
    setSavedVoices((current) => current.filter((voice) => voice.id !== voiceId));
  }

  function createProfileFromSource(voice) {
    loadVoiceSource(voice);
    setSelectedVoiceSourceId(voice.id);
    setProfileName(`${voice.name} Profile`);
    setActiveView(VIEWS.PROFILE_BUILDER);
  }

  async function copyProfileVocString(profile) {
    const vocString = createVocString(profile.parameters);

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(vocString);
    } else {
      const copyField = document.createElement('textarea');
      copyField.value = vocString;
      copyField.setAttribute('readonly', '');
      copyField.style.position = 'absolute';
      copyField.style.left = '-9999px';
      document.body.appendChild(copyField);
      copyField.select();
      document.execCommand('copy');
      document.body.removeChild(copyField);
    }

    setCopiedProfileId(profile.id);
    window.setTimeout(() => {
      setCopiedProfileId((current) => (current === profile.id ? null : current));
    }, 1800);
  }

  function exportSelectedProfile() {
    if (!selectedExportProfile) {
      return;
    }

    const json = JSON.stringify(selectedExportProfile, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${selectedExportProfile.name || 'voc-profile'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function importProfileJson(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const importedProfile = JSON.parse(reader.result);

        if (!validateProfile(importedProfile)) {
          setImportStatus('Invalid profile JSON: missing required fields.');
          return;
        }

        setSavedProfiles((current) => [importedProfile, ...current]);
        setImportStatus(`Imported profile: ${importedProfile.name}`);
      } catch {
        setImportStatus('Invalid profile JSON: parse failed.');
      }
    };

    reader.onerror = () => {
      setImportStatus('Invalid profile JSON: file read failed.');
    };

    reader.readAsText(file);
    event.target.value = '';
  }

  return (
    <main className="voc-app">
      <header className="voc-header">
        <div className="voc-brand">
          <div className="voc-logo" aria-label="VOC logo">
            VOC
          </div>
          <div>
            <h1>VOC</h1>
            <p className="voc-tagline">Voice Identity Profiling System</p>
          </div>
          <span className="voc-version">v0.1-alpha</span>
        </div>
        <div className="voc-badge-row">
          <span className="voc-badge">Analysis unavailable</span>
          <span className="voc-badge">Manual parameters only</span>
          <span className="voc-badge">No audio generation connected</span>
        </div>
      </header>

      <section className="voc-card voc-investor-hero">
        <span className="voc-section-label">Investor demo framing</span>
        <h2>VOC turns voice identity into reusable, adjustable parameters.</h2>
        <p>
          Persistent Voice Identity Infrastructure for reusable character voice
          systems and identity-consistent variation.
        </p>
      </section>

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

      <section className="voc-card voc-identity-panel">
        <h2>Voice Ownership Integrity</h2>
        <ul className="voc-feature-list">
          <li>Original uploaded or recorded voices are never modified automatically.</li>
          <li>VOC never deletes or overwrites source identity.</li>
          <li>Only explicit user actions can replace or remove a source.</li>
          <li>Saved voice sources remain persistent assets.</li>
        </ul>
      </section>

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

      <section className="voc-card voc-investor-panel">
        <h2>Demo Walkthrough</h2>
        <ol className="voc-walkthrough-list">
          <li><span>1</span>Upload or save a voice source</li>
          <li><span>2</span>Adjust profile parameters manually</li>
          <li><span>3</span>Save reusable VOC profile</li>
          <li><span>4</span>Export/import profile JSON</li>
        </ol>
      </section>

      <section className="voc-card voc-demo-panel">
        <h2>Demo Mode</h2>
        <div className="voc-badge-row">
          <span className="voc-badge">Analysis engine not connected</span>
          <span className="voc-badge">Audio generation not connected</span>
          <span className="voc-badge">Manual parameter workflow active</span>
        </div>
      </section>

      <section className="voc-card voc-limits-panel">
        <h2>Current Limits</h2>
        <div className="voc-badge-row">
          <span className="voc-badge">Analysis engine not connected</span>
          <span className="voc-badge">Audio generation not connected</span>
          <span className="voc-badge">Manual workflow only</span>
          <span className="voc-badge">No fake detection</span>
        </div>
      </section>

      <section className="voc-card voc-future-engine-panel">
        <h2>Future Engine Pipeline</h2>
        <div className="voc-pipeline">
          <span>audio/video source</span>
          <span>analysis traits</span>
          <span>estimated parameters</span>
          <span>reusable VOC profile</span>
        </div>
      </section>

      <section className="voc-card voc-future-engine-panel">
        <h2>Future System Architecture</h2>
        <div className="voc-architecture-pipeline">
          <span>Base Identity</span>
          <span>Identity Lock</span>
          <span>Emotion Layer</span>
          <span>Delivery Layer</span>
          <span>Style Layer</span>
          <span>Output Voice</span>
        </div>
      </section>

      <section className="voc-card voc-investor-panel">
        <h2>Dev / Investor Clarity</h2>
        <div className="voc-explainer-grid">
          <div>
            <h3>Structured parameter architecture</h3>
            <p>Voice identity is represented through inspectable controls rather than vague presets.</p>
          </div>
          <div>
            <h3>Reusable deterministic profiles</h3>
            <p>Profiles can be saved, loaded, duplicated, exported, and imported with stable schema fields.</p>
          </div>
          <div>
            <h3>Identity-preserving overlays</h3>
            <p>Expression changes are modeled as layers on top of a protected base identity.</p>
          </div>
          <div>
            <h3>Future analysis-assisted estimation</h3>
            <p>Real audio traits can later assist parameter estimation without fake detection in the current demo.</p>
          </div>
          <div>
            <h3>Non-destructive profile persistence</h3>
            <p>Saved sources and profiles remain persistent assets until the user explicitly removes them.</p>
          </div>
        </div>
      </section>

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

      <section className="voc-card voc-builder-card">
        <h2>{activeView === VIEWS.PROFILE_BUILDER ? 'Profile Builder' : 'Profile Schema'}</h2>
        <p>Parameters are the locked source of truth for every VOC profile.</p>

        <label className="voc-field">
          Profile name
          <input
            type="text"
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            placeholder="Name this VOC profile"
          />
        </label>

        <div className="voc-parameter-groups">
          {PARAMETER_GROUPS.map((group) => (
            <div key={group.title} className="voc-parameter-group">
              <h3>{group.title}</h3>
              <div className="voc-parameter-grid">
                {group.keys.map((key) => (
                  <label key={key} className="voc-field">
                    <span>{key}</span>
                    {key === 'accent' ? (
                      <select
                        value={parameters.accent}
                        onChange={(event) =>
                          updateParameter(key, event.target.value)
                        }
                      >
                        {ACCENT_OPTIONS.map((accent) => (
                          <option key={accent} value={accent}>
                            {accent}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={parameters[key]}
                          onChange={(event) =>
                            updateParameter(key, event.target.value)
                          }
                        />
                  <span className="voc-param-value">{parameters[key]}</span>
                </>
              )}
            </label>
                ))}
              </div>
            </div>
          ))}

          <div className="voc-parameter-group voc-future-analysis-group">
            <h3>Future Analysis</h3>
            <p>
              Analysis traits and estimated parameters are reserved for a real
              analyzer. This demo does not infer values from uploads.
            </p>
          </div>
        </div>

        <p className="voc-string">{createVocString(parameters)}</p>

        <div className="voc-button-group">
          <button type="button" className="voc-button voc-button-primary" onClick={saveProfile}>
            Save Profile
          </button>

          {editingProfileId ? (
            <button
              type="button"
              className="voc-button voc-button-secondary"
              onClick={cancelEditProfile}
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </section>

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
    </main>
  );
}

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'voc_profiles';
const SAVED_VOICES_STORAGE_KEY = 'voc_saved_voices';
const DEFAULT_ANALYSIS_STATUS = 'unavailable';

const LOCKED_PARAMETERS = [
  'pitch',
  'speed',
  'cadence',
  'clarity',
  'stability',
  'emotion',
  'warmth',
  'accent',
];

const ACCENT_OPTIONS = [
  'neutral',
  'american_general',
  'american_southern',
  'british_general',
  'irish_general',
  'australian_general',
  'spanish_influenced',
  'caribbean_influenced',
];

const DEFAULT_PARAMETERS = {
  pitch: 50,
  speed: 50,
  cadence: 50,
  clarity: 50,
  stability: 50,
  emotion: 50,
  warmth: 50,
  accent: 'neutral',
};

const PARAMETER_GROUPS = [
  {
    title: 'Voice Core',
    keys: ['pitch', 'clarity', 'stability', 'warmth'],
  },
  {
    title: 'Delivery',
    keys: ['speed', 'cadence', 'emotion'],
  },
  {
    title: 'Accent',
    keys: ['accent'],
  },
];

function sortByMode(items, sortMode) {
  const sortedItems = [...items];

  if (sortMode === 'oldest') {
    return sortedItems.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );
  }

  if (sortMode === 'alphabetical') {
    return sortedItems.sort((a, b) => a.name.localeCompare(b.name));
  }

  return sortedItems.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
}

function createVocString(parameters) {
  return LOCKED_PARAMETERS.map(
    (key) => `${key}:${parameters[key] ?? DEFAULT_PARAMETERS[key]}`,
  ).join('|');
}

function createParametersSummary(parameters) {
  return LOCKED_PARAMETERS.map(
    (key) => `${key}: ${parameters[key] ?? DEFAULT_PARAMETERS[key]}`,
  ).join(', ');
}

function isValidImportedProfile(profile) {
  const requiredFields = ['id', 'name', 'parameters', 'created_at', 'updated_at'];

  return (
    profile &&
    typeof profile === 'object' &&
    requiredFields.every((field) =>
      Object.prototype.hasOwnProperty.call(profile, field),
    ) &&
    typeof profile.parameters === 'object' &&
    profile.parameters !== null
  );
}

function loadSavedProfiles() {
  const storedProfiles = localStorage.getItem(STORAGE_KEY);

  if (!storedProfiles) {
    return [];
  }

  try {
    const parsedProfiles = JSON.parse(storedProfiles);

    if (!Array.isArray(parsedProfiles)) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    return parsedProfiles;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function loadSavedVoices() {
  const storedVoices = localStorage.getItem(SAVED_VOICES_STORAGE_KEY);

  if (!storedVoices) {
    return [];
  }

  try {
    const parsedVoices = JSON.parse(storedVoices);

    if (!Array.isArray(parsedVoices)) {
      localStorage.removeItem(SAVED_VOICES_STORAGE_KEY);
      return [];
    }

    return parsedVoices;
  } catch {
    localStorage.removeItem(SAVED_VOICES_STORAGE_KEY);
    return [];
  }
}

export default function App() {
  const [parameters, setParameters] = useState(DEFAULT_PARAMETERS);
  const [savedProfiles, setSavedProfiles] = useState(loadSavedProfiles);
  const [savedVoices, setSavedVoices] = useState(loadSavedVoices);
  const [profileName, setProfileName] = useState('');
  const [audioFileName, setAudioFileName] = useState('');
  const [videoFileName, setVideoFileName] = useState('');
  const [activeView, setActiveView] = useState('profile_builder');
  const [selectedVoiceSourceId, setSelectedVoiceSourceId] = useState(null);
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [profileSearch, setProfileSearch] = useState('');
  const [profileSortMode, setProfileSortMode] = useState('newest');
  const [voiceSearch, setVoiceSearch] = useState('');
  const [voiceSortMode, setVoiceSortMode] = useState('newest');
  const [copiedProfileId, setCopiedProfileId] = useState(null);
  const [selectedExportProfileId, setSelectedExportProfileId] = useState('');
  const [importStatus, setImportStatus] = useState('');

  const filteredProfiles = sortByMode(
    savedProfiles.filter((profile) =>
      profile.name.toLowerCase().includes(profileSearch.toLowerCase()),
    ),
    profileSortMode,
  );

  const filteredVoices = sortByMode(
    savedVoices.filter((voice) => {
      const searchValue = voiceSearch.toLowerCase();

      return (
        voice.name.toLowerCase().includes(searchValue) ||
        voice.source_file_name.toLowerCase().includes(searchValue)
      );
    }),
    voiceSortMode,
  );

  const selectedExportProfile =
    savedProfiles.find((profile) => profile.id === selectedExportProfileId) ||
    null;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedProfiles));
  }, [savedProfiles]);

  useEffect(() => {
    localStorage.setItem(SAVED_VOICES_STORAGE_KEY, JSON.stringify(savedVoices));
  }, [savedVoices]);

  function updateParameter(key, value) {
    setParameters((current) => ({
      ...current,
      [key]: key === 'accent' ? value : Number(value),
    }));
  }

  function saveProfile() {
    const now = new Date().toISOString();
    const trimmedName = profileName.trim();

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

    const profile = {
      id: crypto.randomUUID(),
      name: trimmedName || `VOC Profile ${savedProfiles.length + 1}`,
      base_voice_id: null,
      source_voice_id: selectedVoiceSourceId,
      parameters: { ...parameters },
      created_at: now,
      updated_at: now,
    };

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
    const now = new Date().toISOString();

    const duplicatedProfile = {
      id: crypto.randomUUID(),
      name: `${profile.name} Copy`,
      base_voice_id: profile.base_voice_id,
      source_voice_id: profile.source_voice_id,
      parameters: { ...profile.parameters },
      created_at: now,
      updated_at: now,
    };

    setSavedProfiles((current) => [duplicatedProfile, ...current]);
  }

  function editProfile(profile) {
    setParameters({ ...DEFAULT_PARAMETERS, ...profile.parameters });
    setProfileName(profile.name);
    setSelectedVoiceSourceId(profile.source_voice_id || null);
    setEditingProfileId(profile.id);
    setActiveView('profile_builder');
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

    const now = new Date().toISOString();
    const sourceType = videoFileName ? 'video' : 'audio';

    const savedVoice = {
      id: crypto.randomUUID(),
      name: sourceFileName,
      source_type: sourceType,
      source_file_name: sourceFileName,
      analysis_status: DEFAULT_ANALYSIS_STATUS,
      analysis_traits: null,
      estimated_parameters: null,
      analysis_error: null,
      base_voice_id: null,
      parameters: null,
      created_at: now,
      updated_at: now,
    };

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
    setActiveView('profile_builder');
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

        if (!isValidImportedProfile(importedProfile)) {
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

      <section className="voc-card voc-landing-panel">
        <h2>Demo Overview</h2>
        <p>
          VOC stores saved voice sources, lets users manually control profile
          parameters, persists profiles in localStorage, and keeps a future
          analysis pipeline visible without pretending it is connected.
        </p>
        <ul className="voc-feature-list">
          <li>Saved voice sources collect audio/video filenames only.</li>
          <li>Manual parameter control remains the only profile input path.</li>
          <li>Profile persistence is frontend-only through localStorage.</li>
          <li>Future analysis fields are schema-safe placeholders.</li>
          <li>Frontend truth policy: no fake analysis, detection, or generation.</li>
        </ul>
      </section>

      <section className="voc-card voc-demo-panel">
        <h2>Demo Mode</h2>
        <div className="voc-badge-row">
          <span className="voc-badge">Analysis engine not connected</span>
          <span className="voc-badge">Audio generation not connected</span>
          <span className="voc-badge">Manual parameter workflow active</span>
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
        <h2>{activeView === 'profile_builder' ? 'Profile Builder' : 'Profile Schema'}</h2>
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
              <option value="newest">newest</option>
              <option value="oldest">oldest</option>
              <option value="alphabetical">alphabetical</option>
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
              <option value="newest">newest</option>
              <option value="oldest">oldest</option>
              <option value="alphabetical">alphabetical</option>
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

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
];

const DEFAULT_PARAMETERS = {
  pitch: 50,
  speed: 50,
  cadence: 50,
  clarity: 50,
  stability: 50,
  emotion: 50,
  warmth: 50,
};

function createVocString(parameters) {
  return LOCKED_PARAMETERS.map((key) => `${key}:${parameters[key]}`).join('|');
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedProfiles));
  }, [savedProfiles]);

  useEffect(() => {
    localStorage.setItem(SAVED_VOICES_STORAGE_KEY, JSON.stringify(savedVoices));
  }, [savedVoices]);

  function updateParameter(key, value) {
    setParameters((current) => ({
      ...current,
      [key]: Number(value),
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
    setParameters({ ...profile.parameters });
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
    setParameters({ ...profile.parameters });
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

  return (
    <main className="voc-app">
      <header className="voc-header">
        <h1>VOC</h1>
        <p className="voc-tagline">Voice profile parameters — clean rebuild</p>
      </header>

      <section className="voc-card">
        <h2>{activeView === 'profile_builder' ? 'Profile Builder' : 'Profile Schema'}</h2>
        <p>Parameters are the locked source of truth for every VOC profile.</p>

        <label>
          Profile name
          <input
            type="text"
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            placeholder="Name this VOC profile"
          />
        </label>

        <div>
          {LOCKED_PARAMETERS.map((key) => (
            <label key={key}>
              {key}
              <input
                type="range"
                min="0"
                max="100"
                value={parameters[key]}
                onChange={(event) => updateParameter(key, event.target.value)}
              />
              <span>{parameters[key]}</span>
            </label>
          ))}
        </div>

        <p>{createVocString(parameters)}</p>

        <button type="button" className="voc-button" onClick={saveProfile}>
          Save Profile
        </button>

        {editingProfileId ? (
          <button
            type="button"
            className="voc-button"
            onClick={cancelEditProfile}
          >
            Cancel Edit
          </button>
        ) : null}
      </section>

      <section className="voc-card">
        <h2>Saved Profiles</h2>
        {savedProfiles.length === 0 ? (
          <p>No profiles saved yet.</p>
        ) : (
          <ul>
            {savedProfiles.map((profile) => (
              <li key={profile.id}>
                <strong>{profile.name}</strong>
                <p>{createVocString(profile.parameters)}</p>
                <p>Source voice ID: {profile.source_voice_id || 'null'}</p>
                <button
                  type="button"
                  className="voc-button"
                  onClick={() => loadProfile(profile)}
                >
                  Load
                </button>
                <button
                  type="button"
                  className="voc-button"
                  onClick={() => deleteProfile(profile.id)}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="voc-button"
                  onClick={() => duplicateProfile(profile)}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="voc-button"
                  onClick={() => editProfile(profile)}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="voc-card">
        <h2>Voice Source Library</h2>
        <p>Voice analysis engine unavailable</p>

        <label>
          Upload Audio
          <input type="file" accept="audio/*" onChange={handleAudioUpload} />
        </label>

        <label>
          Upload Video
          <input type="file" accept="video/*" onChange={handleVideoUpload} />
        </label>

        <p>Selected source: {videoFileName || audioFileName || 'None'}</p>

        <button
          type="button"
          className="voc-button"
          onClick={saveVoiceSource}
          disabled={!videoFileName && !audioFileName}
        >
          Save Voice Source
        </button>

        {savedVoices.length === 0 ? (
          <p>No voice sources saved yet.</p>
        ) : (
          <ul>
            {savedVoices.map((voice) => (
              <li key={voice.id}>
                <strong>{voice.name}</strong>
                <p>Source type: {voice.source_type}</p>
                <p>Source file: {voice.source_file_name}</p>
                <p>Analysis status: {voice.analysis_status}</p>
                <p>Base voice ID: {voice.base_voice_id || 'null'}</p>
                <p>Created at: {voice.created_at}</p>
                <p>Updated at: {voice.updated_at}</p>
                <button
                  type="button"
                  className="voc-button"
                  onClick={() => loadVoiceSource(voice)}
                >
                  Load Source
                </button>
                <button
                  type="button"
                  className="voc-button"
                  onClick={() => deleteVoiceSource(voice.id)}
                >
                  Delete Source
                </button>
                <button
                  type="button"
                  className="voc-button"
                  onClick={() => createProfileFromSource(voice)}
                >
                  Create Profile
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

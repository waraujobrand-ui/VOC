import { useEffect, useState } from 'react';

import {
  STORAGE_KEY,
  SAVED_VOICES_STORAGE_KEY,
  DEFAULT_PARAMETERS,
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
import AppHeader from './components/AppHeader.jsx';
import InvestorHero from './components/InvestorHero.jsx';
import DemoOverviewPanel from './components/DemoOverviewPanel.jsx';
import IdentityLockPanel from './components/IdentityLockPanel.jsx';
import VoiceOwnershipPanel from './components/VoiceOwnershipPanel.jsx';
import IdentityConsistencyPanel from './components/IdentityConsistencyPanel.jsx';
import WhyItMattersPanel from './components/WhyItMattersPanel.jsx';
import DemoWalkthroughPanel from './components/DemoWalkthroughPanel.jsx';
import DemoModePanel from './components/DemoModePanel.jsx';
import CurrentLimitsPanel from './components/CurrentLimitsPanel.jsx';
import FutureEnginePipelinePanel from './components/FutureEnginePipelinePanel.jsx';
import FutureSystemArchitecturePanel from './components/FutureSystemArchitecturePanel.jsx';
import DevInvestorClarityPanel from './components/DevInvestorClarityPanel.jsx';
import StatusDashboard from './components/StatusDashboard.jsx';
import ProfileBuilder from './components/ProfileBuilder.jsx';
import SavedProfilesPanel from './components/SavedProfilesPanel.jsx';
import VoiceSourceLibrary from './components/VoiceSourceLibrary.jsx';

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
      <AppHeader />
      <InvestorHero />
      <DemoOverviewPanel />
      <IdentityLockPanel />
      <VoiceOwnershipPanel />
      <IdentityConsistencyPanel />
      <WhyItMattersPanel />
      <DemoWalkthroughPanel />
      <DemoModePanel />
      <CurrentLimitsPanel />
      <FutureEnginePipelinePanel />
      <FutureSystemArchitecturePanel />
      <DevInvestorClarityPanel />
      <StatusDashboard
        savedProfiles={savedProfiles}
        savedVoices={savedVoices}
        audioFileName={audioFileName}
        videoFileName={videoFileName}
      />
      <ProfileBuilder
        activeView={activeView}
        profileName={profileName}
        setProfileName={setProfileName}
        parameters={parameters}
        updateParameter={updateParameter}
        saveProfile={saveProfile}
        editingProfileId={editingProfileId}
        cancelEditProfile={cancelEditProfile}
      />
      <SavedProfilesPanel
        savedProfiles={savedProfiles}
        filteredProfiles={filteredProfiles}
        selectedExportProfileId={selectedExportProfileId}
        setSelectedExportProfileId={setSelectedExportProfileId}
        selectedExportProfile={selectedExportProfile}
        exportSelectedProfile={exportSelectedProfile}
        importProfileJson={importProfileJson}
        importStatus={importStatus}
        profileSearch={profileSearch}
        setProfileSearch={setProfileSearch}
        profileSortMode={profileSortMode}
        setProfileSortMode={setProfileSortMode}
        loadProfile={loadProfile}
        deleteProfile={deleteProfile}
        duplicateProfile={duplicateProfile}
        editProfile={editProfile}
        copyProfileVocString={copyProfileVocString}
        copiedProfileId={copiedProfileId}
      />
      <VoiceSourceLibrary
        audioFileName={audioFileName}
        videoFileName={videoFileName}
        handleAudioUpload={handleAudioUpload}
        handleVideoUpload={handleVideoUpload}
        saveVoiceSource={saveVoiceSource}
        savedVoices={savedVoices}
        filteredVoices={filteredVoices}
        voiceSearch={voiceSearch}
        setVoiceSearch={setVoiceSearch}
        voiceSortMode={voiceSortMode}
        setVoiceSortMode={setVoiceSortMode}
        loadVoiceSource={loadVoiceSource}
        deleteVoiceSource={deleteVoiceSource}
        createProfileFromSource={createProfileFromSource}
      />
    </main>
  );
}

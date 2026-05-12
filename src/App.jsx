import { useState } from 'react';

import { VIEWS } from './constants.js';
import { createProfile } from './schema.js';
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
import { useProfileBuilderState } from './hooks/useProfileBuilderState.js';
import { useProfilesStore } from './hooks/useProfilesStore.js';
import { useVoicesStore } from './hooks/useVoicesStore.js';
import { useVoiceUploads } from './hooks/useVoiceUploads.js';
import {
  useProfileSearchSort,
  useVoiceSearchSort,
} from './hooks/useSearchSort.js';
import { useProfileImportExport } from './hooks/useProfileImportExport.js';

export default function App() {
  const [activeView, setActiveView] = useState(VIEWS.PROFILE_BUILDER);

  const {
    parameters,
    profileName,
    setProfileName,
    selectedVoiceSourceId,
    setSelectedVoiceSourceId,
    editingProfileId,
    setEditingProfileId,
    updateParameter,
    applyProfileToBuilder,
  } = useProfileBuilderState();

  const {
    savedProfiles,
    setSavedProfiles,
    deleteProfile,
    duplicateProfile,
    copiedProfileId,
    copyProfileVocString,
  } = useProfilesStore();

  const {
    savedVoices,
    saveVoiceSource: persistVoiceSource,
    deleteVoiceSource,
  } = useVoicesStore();

  const {
    audioFileName,
    videoFileName,
    handleAudioUpload,
    handleVideoUpload,
    loadVoiceSource,
  } = useVoiceUploads();

  const {
    profileSearch,
    setProfileSearch,
    profileSortMode,
    setProfileSortMode,
    filteredProfiles,
  } = useProfileSearchSort(savedProfiles);

  const {
    voiceSearch,
    setVoiceSearch,
    voiceSortMode,
    setVoiceSortMode,
    filteredVoices,
  } = useVoiceSearchSort(savedVoices);

  const {
    selectedExportProfileId,
    setSelectedExportProfileId,
    selectedExportProfile,
    exportSelectedProfile,
    importStatus,
    importProfileJson,
  } = useProfileImportExport({ savedProfiles, setSavedProfiles });

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
    applyProfileToBuilder(profile);
  }

  function editProfile(profile) {
    applyProfileToBuilder(profile);
    setSelectedVoiceSourceId(profile.source_voice_id || null);
    setEditingProfileId(profile.id);
    setActiveView(VIEWS.PROFILE_BUILDER);
  }

  function cancelEditProfile() {
    setEditingProfileId(null);
    setSelectedVoiceSourceId(null);
    setProfileName(`VOC Profile ${savedProfiles.length + 1}`);
  }

  function saveVoiceSource() {
    persistVoiceSource({ audioFileName, videoFileName });
  }

  function createProfileFromSource(voice) {
    loadVoiceSource(voice);
    setSelectedVoiceSourceId(voice.id);
    setProfileName(`${voice.name} Profile`);
    setActiveView(VIEWS.PROFILE_BUILDER);
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

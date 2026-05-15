import { useState } from 'react';

import { VIEWS } from './constants.js';
import { createProfile } from './schema.js';
import AppHeader from './components/AppHeader.jsx';
import VocEntry from './components/VocEntry.jsx';
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
import AudioGenerationPanel from './components/AudioGenerationPanel.jsx';
import BuildStatusPanel from './components/BuildStatusPanel.jsx';
import RealProviderPanel from './components/RealProviderPanel.jsx';
import { useAudioGeneration } from './hooks/useAudioGeneration.js';
import { useRealVoiceProvider } from './hooks/useRealVoiceProvider.js';
import { useProfileBuilderState } from './hooks/useProfileBuilderState.js';
import { useProfilesStore } from './hooks/useProfilesStore.js';
import { useVoicesStore } from './hooks/useVoicesStore.js';
import { useVoiceUploads } from './hooks/useVoiceUploads.js';
import {
  useProfileSearchSort,
  useVoiceSearchSort,
} from './hooks/useSearchSort.js';
import { useProfileImportExport } from './hooks/useProfileImportExport.js';

/**
 * Top-level app stages.
 *
 *   entry   → first-load screen, single CTA
 *   tools   → full tool interface (RealProviderPanel + everything else)
 *
 * Investor / demo / architecture panels are only rendered in tools stage
 * and collapsed into an "advanced" section via a disclosure.
 */
const APP_STAGE = {
  ENTRY: 'entry',
  TOOLS: 'tools',
};

export default function App() {
  const [appStage, setAppStage] = useState(APP_STAGE.ENTRY);
  const [showAdvanced, setShowAdvanced] = useState(false);
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

  const generation = useAudioGeneration();
  const realProvider = useRealVoiceProvider();

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

  const providerConnected = !!(
    realProvider.status &&
    realProvider.status.checked &&
    realProvider.status.connected
  );

  // ── Entry stage ──────────────────────────────────────────────────────────
  if (appStage === APP_STAGE.ENTRY) {
    return (
      <main className="voc-app voc-app--entry">
        <AppHeader
          realProviderStatus={realProvider.status}
          realProviderCapabilities={realProvider.capabilities}
          minimal
        />
        <VocEntry
          onStart={() => setAppStage(APP_STAGE.TOOLS)}
          providerConnected={providerConnected}
        />
      </main>
    );
  }

  // ── Tools stage ───────────────────────────────────────────────────────────
  return (
    <main className="voc-app">
      <AppHeader
        realProviderStatus={realProvider.status}
        realProviderCapabilities={realProvider.capabilities}
      />

      {/* Primary tool — recording + clone */}
      <RealProviderPanel
        realProvider={realProvider}
        parameters={parameters}
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

      <AudioGenerationPanel
        parameters={parameters}
        audioFileName={audioFileName}
        videoFileName={videoFileName}
        generation={generation}
      />

      <BuildStatusPanel
        provider={generation.provider}
        providerStatus={generation.providerStatus}
        realProviderStatus={realProvider.status}
        realProviderCapabilities={realProvider.capabilities}
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

      {/* Advanced / investor panels — collapsed by default */}
      <div className="voc-advanced-section" data-testid="voc-advanced-section">
        <button
          type="button"
          className="voc-advanced-toggle"
          onClick={() => setShowAdvanced((v) => !v)}
          data-testid="voc-advanced-toggle"
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? 'Hide' : 'Show'} advanced info
          <span className="voc-advanced-toggle-caret" aria-hidden="true">
            {showAdvanced ? ' ▲' : ' ▼'}
          </span>
        </button>

        {showAdvanced && (
          <div className="voc-advanced-panels">
            <StatusDashboard
              savedProfiles={savedProfiles}
              savedVoices={savedVoices}
              audioFileName={audioFileName}
              videoFileName={videoFileName}
            />
            <InvestorHero />
            <DemoOverviewPanel />
            <IdentityLockPanel />
            <VoiceOwnershipPanel />
            <IdentityConsistencyPanel />
            <WhyItMattersPanel />
            <DemoWalkthroughPanel />
            <DemoModePanel
              realProviderStatus={realProvider.status}
              realProviderCapabilities={realProvider.capabilities}
            />
            <CurrentLimitsPanel
              realProviderStatus={realProvider.status}
              realProviderCapabilities={realProvider.capabilities}
            />
            <FutureEnginePipelinePanel />
            <FutureSystemArchitecturePanel />
            <DevInvestorClarityPanel />
          </div>
        )}
      </div>
    </main>
  );
}

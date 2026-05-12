import { useState } from 'react';

import { validateProfile } from '../schema.js';

export function useProfileImportExport({ savedProfiles, setSavedProfiles }) {
  const [selectedExportProfileId, setSelectedExportProfileId] = useState('');
  const [importStatus, setImportStatus] = useState('');

  const selectedExportProfile =
    savedProfiles.find((profile) => profile.id === selectedExportProfileId) ||
    null;

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

  return {
    selectedExportProfileId,
    setSelectedExportProfileId,
    selectedExportProfile,
    exportSelectedProfile,
    importStatus,
    importProfileJson,
  };
}

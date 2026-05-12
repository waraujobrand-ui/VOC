import { useState } from 'react';

import { DEFAULT_PARAMETERS } from '../constants.js';

export function useProfileBuilderState() {
  const [parameters, setParameters] = useState(DEFAULT_PARAMETERS);
  const [profileName, setProfileName] = useState('');
  const [selectedVoiceSourceId, setSelectedVoiceSourceId] = useState(null);
  const [editingProfileId, setEditingProfileId] = useState(null);

  function updateParameter(key, value) {
    setParameters((current) => ({
      ...current,
      [key]: key === 'accent' ? value : Number(value),
    }));
  }

  function applyProfileToBuilder(profile) {
    setParameters({ ...DEFAULT_PARAMETERS, ...profile.parameters });
    setProfileName(profile.name);
  }

  return {
    parameters,
    profileName,
    setProfileName,
    selectedVoiceSourceId,
    setSelectedVoiceSourceId,
    editingProfileId,
    setEditingProfileId,
    updateParameter,
    applyProfileToBuilder,
  };
}

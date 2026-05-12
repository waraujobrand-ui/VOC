import { useState } from 'react';

import { STORAGE_KEY } from '../constants.js';
import { createVocString } from '../schema.js';
import { duplicateProfile as duplicateProfileObject } from '../profileUtils.js';
import { usePersistentArray } from './usePersistentArray.js';

export function useProfilesStore() {
  const [savedProfiles, setSavedProfiles] = usePersistentArray(STORAGE_KEY);
  const [copiedProfileId, setCopiedProfileId] = useState(null);

  function deleteProfile(profileId) {
    setSavedProfiles((current) =>
      current.filter((profile) => profile.id !== profileId),
    );
  }

  function duplicateProfile(profile) {
    setSavedProfiles((current) => [duplicateProfileObject(profile), ...current]);
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

  return {
    savedProfiles,
    setSavedProfiles,
    deleteProfile,
    duplicateProfile,
    copiedProfileId,
    copyProfileVocString,
  };
}

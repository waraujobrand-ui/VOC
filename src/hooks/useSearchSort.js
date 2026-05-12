import { useState } from 'react';

import { SORT_MODES } from '../constants.js';
import {
  sortByMode,
  filterProfilesBySearch,
  filterVoicesBySearch,
} from '../profileUtils.js';

export function useProfileSearchSort(savedProfiles) {
  const [profileSearch, setProfileSearch] = useState('');
  const [profileSortMode, setProfileSortMode] = useState(SORT_MODES.NEWEST);

  const filteredProfiles = sortByMode(
    filterProfilesBySearch(savedProfiles, profileSearch),
    profileSortMode,
  );

  return {
    profileSearch,
    setProfileSearch,
    profileSortMode,
    setProfileSortMode,
    filteredProfiles,
  };
}

export function useVoiceSearchSort(savedVoices) {
  const [voiceSearch, setVoiceSearch] = useState('');
  const [voiceSortMode, setVoiceSortMode] = useState(SORT_MODES.NEWEST);

  const filteredVoices = sortByMode(
    filterVoicesBySearch(savedVoices, voiceSearch),
    voiceSortMode,
  );

  return {
    voiceSearch,
    setVoiceSearch,
    voiceSortMode,
    setVoiceSortMode,
    filteredVoices,
  };
}

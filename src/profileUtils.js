import { SORT_MODES } from './constants.js';

export function sortByMode(items, sortMode) {
  const sortedItems = [...items];

  if (sortMode === SORT_MODES.OLDEST) {
    return sortedItems.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );
  }

  if (sortMode === SORT_MODES.ALPHABETICAL) {
    return sortedItems.sort((a, b) => a.name.localeCompare(b.name));
  }

  return sortedItems.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
}

export function filterProfilesBySearch(profiles, searchTerm) {
  const search = (searchTerm || '').toLowerCase();
  return profiles.filter((profile) =>
    profile.name.toLowerCase().includes(search),
  );
}

export function filterVoicesBySearch(voices, searchTerm) {
  const search = (searchTerm || '').toLowerCase();
  return voices.filter(
    (voice) =>
      voice.name.toLowerCase().includes(search) ||
      voice.source_file_name.toLowerCase().includes(search),
  );
}

export function duplicateProfile(profile) {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: `${profile.name} Copy`,
    base_voice_id: profile.base_voice_id,
    source_voice_id: profile.source_voice_id,
    parameters: { ...profile.parameters },
    created_at: now,
    updated_at: now,
  };
}

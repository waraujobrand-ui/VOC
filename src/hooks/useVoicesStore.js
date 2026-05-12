import { SAVED_VOICES_STORAGE_KEY } from '../constants.js';
import { createSavedVoice } from '../schema.js';
import { usePersistentArray } from './usePersistentArray.js';

export function useVoicesStore() {
  const [savedVoices, setSavedVoices] = usePersistentArray(
    SAVED_VOICES_STORAGE_KEY,
  );

  function saveVoiceSource({ audioFileName, videoFileName }) {
    const sourceFileName = videoFileName || audioFileName;

    if (!sourceFileName) {
      return;
    }

    const sourceType = videoFileName ? 'video' : 'audio';
    const savedVoice = createSavedVoice({ sourceFileName, sourceType });

    setSavedVoices((current) => [savedVoice, ...current]);
  }

  function deleteVoiceSource(voiceId) {
    setSavedVoices((current) => current.filter((voice) => voice.id !== voiceId));
  }

  return {
    savedVoices,
    saveVoiceSource,
    deleteVoiceSource,
  };
}

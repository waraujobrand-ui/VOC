import { useState } from 'react';

export function useVoiceUploads() {
  const [audioFileName, setAudioFileName] = useState('');
  const [videoFileName, setVideoFileName] = useState('');

  function handleAudioUpload(event) {
    const fileName = event.target.files?.[0]?.name || '';
    setAudioFileName(fileName);
  }

  function handleVideoUpload(event) {
    const fileName = event.target.files?.[0]?.name || '';
    setVideoFileName(fileName);
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

  return {
    audioFileName,
    videoFileName,
    handleAudioUpload,
    handleVideoUpload,
    loadVoiceSource,
  };
}

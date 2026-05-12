import {
  LOCKED_PARAMETERS,
  DEFAULT_PARAMETERS,
  DEFAULT_ANALYSIS_STATUS,
} from './constants.js';

export function createVocString(parameters) {
  return LOCKED_PARAMETERS.map(
    (key) => `${key}:${parameters[key] ?? DEFAULT_PARAMETERS[key]}`,
  ).join('|');
}

export function createParametersSummary(parameters) {
  return LOCKED_PARAMETERS.map(
    (key) => `${key}: ${parameters[key] ?? DEFAULT_PARAMETERS[key]}`,
  ).join(', ');
}

export function normalizeProfile(profile) {
  return {
    ...profile,
    parameters: { ...DEFAULT_PARAMETERS, ...(profile.parameters || {}) },
  };
}

export function validateProfile(profile) {
  const requiredFields = ['id', 'name', 'parameters', 'created_at', 'updated_at'];

  return (
    profile &&
    typeof profile === 'object' &&
    requiredFields.every((field) =>
      Object.prototype.hasOwnProperty.call(profile, field),
    ) &&
    typeof profile.parameters === 'object' &&
    profile.parameters !== null
  );
}

export function createProfile({
  name,
  parameters,
  sourceVoiceId = null,
  baseVoiceId = null,
  fallbackIndex = 0,
}) {
  const now = new Date().toISOString();
  const trimmedName = (name || '').trim();

  return {
    id: crypto.randomUUID(),
    name: trimmedName || `VOC Profile ${fallbackIndex}`,
    base_voice_id: baseVoiceId,
    source_voice_id: sourceVoiceId,
    parameters: { ...parameters },
    created_at: now,
    updated_at: now,
  };
}

export function createSavedVoice({ sourceFileName, sourceType }) {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: sourceFileName,
    source_type: sourceType,
    source_file_name: sourceFileName,
    analysis_status: DEFAULT_ANALYSIS_STATUS,
    analysis_traits: null,
    estimated_parameters: null,
    analysis_error: null,
    base_voice_id: null,
    parameters: null,
    created_at: now,
    updated_at: now,
  };
}

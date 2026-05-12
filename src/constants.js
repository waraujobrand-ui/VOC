export const STORAGE_KEY = 'voc_profiles';
export const SAVED_VOICES_STORAGE_KEY = 'voc_saved_voices';

export const DEFAULT_ANALYSIS_STATUS = 'unavailable';

export const LOCKED_PARAMETERS = [
  'pitch',
  'speed',
  'cadence',
  'clarity',
  'stability',
  'emotion',
  'warmth',
  'accent',
];

export const ACCENT_OPTIONS = [
  'neutral',
  'american_general',
  'american_southern',
  'british_general',
  'irish_general',
  'australian_general',
  'spanish_influenced',
  'caribbean_influenced',
];

export const DEFAULT_PARAMETERS = {
  pitch: 50,
  speed: 50,
  cadence: 50,
  clarity: 50,
  stability: 50,
  emotion: 50,
  warmth: 50,
  accent: 'neutral',
};

export const PARAMETER_GROUPS = [
  {
    title: 'Voice Core',
    keys: ['pitch', 'clarity', 'stability', 'warmth'],
  },
  {
    title: 'Delivery',
    keys: ['speed', 'cadence', 'emotion'],
  },
  {
    title: 'Accent',
    keys: ['accent'],
  },
];

export const SORT_MODES = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  ALPHABETICAL: 'alphabetical',
};

export const VIEWS = {
  PROFILE_BUILDER: 'profile_builder',
};

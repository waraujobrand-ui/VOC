export function safeLoadArray(storageKey) {
  const stored = localStorage.getItem(storageKey);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      localStorage.removeItem(storageKey);
      return [];
    }

    return parsed;
  } catch {
    localStorage.removeItem(storageKey);
    return [];
  }
}

export function saveArray(storageKey, arrayValue) {
  localStorage.setItem(storageKey, JSON.stringify(arrayValue));
}

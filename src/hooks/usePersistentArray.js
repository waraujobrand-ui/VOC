import { useEffect, useState } from 'react';

import { safeLoadArray, saveArray } from '../storage.js';

export function usePersistentArray(storageKey) {
  const [items, setItems] = useState(() => safeLoadArray(storageKey));

  useEffect(() => {
    saveArray(storageKey, items);
  }, [storageKey, items]);

  return [items, setItems];
}

'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to get the appropriate modifier key text for the current platform
 * Returns 'Cmd' on Mac, 'Ctrl' on Windows/Linux
 */
export function useModifierKey(): string {
  const [modifierKey, setModifierKey] = useState<string>('Ctrl');

  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    setModifierKey(isMac ? 'Cmd' : 'Ctrl');
  }, []);

  return modifierKey;
}

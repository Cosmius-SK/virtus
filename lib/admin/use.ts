'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Settings } from '@/lib/db';
import { settings as read } from './store';

/**
 * What the admin has set, on every screen that needs it.
 *
 * Read rather than passed down: the banner is in the header and the house style
 * is used at the moment a file is produced, and those are far apart. Threading
 * one object between them would put the admin space in the props of screens
 * that have nothing to do with it.
 */
export function useSettings(): { settings: Settings | undefined; reload: () => void } {
  const [settings, setSettings] = useState<Settings | undefined>(undefined);

  const reload = useCallback(() => {
    void read().then(setSettings);
  }, []);
  useEffect(reload, [reload]);

  return { settings, reload };
}

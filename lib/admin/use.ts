'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type { Settings } from '@/lib/db';
import {
  refreshSettings,
  settingsLoaded,
  settingsSnapshotCompat,
  subscribeSettings,
} from './store';

/**
 * What the admin has set, on every screen that needs it.
 *
 * Read from one shared copy rather than passed down: the banner is in the
 * header and the house style is used at the moment a file is produced, and
 * those are far apart. Threading one object between them would put the admin
 * space in the props of screens that have nothing to do with it.
 *
 * It is `useSyncExternalStore` rather than `useState` because the copy is
 * shared. Each component holding its own was the bug: the admin panel saved and
 * re-read; the header, mounted once, kept showing what it read on page load.
 *
 * The copy is now shared further than one browser — see lib/shared/client.ts —
 * and nothing here had to change for that, which was the point of reading from
 * one subscribable snapshot rather than threading it through props.
 */
export function useSettings(): { settings: Settings | undefined; reload: () => void } {
  const settings = useSyncExternalStore(
    subscribeSettings,
    settingsSnapshotCompat,
    () => undefined as Settings | undefined,
  );

  useEffect(() => {
    if (!settingsLoaded()) void refreshSettings(false);
  }, []);

  return { settings, reload: () => void refreshSettings(false) };
}

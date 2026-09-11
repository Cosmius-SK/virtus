'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { refresh, sharedLoaded, sharedSnapshot, subscribeShared, type SharedState } from './client';

/** The shared document and what this browser may do with it, on any screen. */
export function useShared(): { state: SharedState; reload: () => void } {
  const state = useSyncExternalStore(subscribeShared, sharedSnapshot, sharedSnapshot);
  useEffect(() => {
    if (!sharedLoaded()) void refresh(false);
  }, []);
  return { state, reload: () => void refresh(false) };
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { allTemplates } from '@/lib/admin/store';
import { FORMATS, formatById } from './registry';
import type { FormatDef } from './types';

/**
 * Every template available on this device: the ones that ship, plus the ones
 * somebody built here.
 *
 * Deliberately one list. The store, the fill screen and the renderers must not
 * be able to tell a built-in template from a custom one — the moment they can,
 * every one of them grows a branch and the next template costs what the first
 * one did.
 *
 * Custom templates come last within their category, so the shelves people know
 * do not reorder themselves the first time somebody adds one.
 */
export function useFormats(): { formats: FormatDef[]; custom: FormatDef[]; reload: () => void } {
  const [custom, setCustom] = useState<FormatDef[]>([]);

  const reload = useCallback(() => {
    void allTemplates().then((rows) => setCustom(rows.map((r) => r.def)));
  }, []);
  useEffect(reload, [reload]);

  return { formats: [...FORMATS, ...custom], custom, reload };
}

/** A lookup across both, for the screens that hold an id rather than a format. */
export function findFormat(id: string, custom: FormatDef[]): FormatDef | undefined {
  return formatById(id) ?? custom.find((f) => f.id === id);
}

'use client';

import { db } from './db';
import { ownerId } from './owner';
import { costOf } from './pricing';

/**
 * A per-person meter of what has actually been made and what it cost.
 *
 * biblio's caps existed to protect one wallet; here the same measurement
 * answers a different question — what does this cost a department, and what
 * does it save them (§10). Both need the same thing: real numbers from real
 * runs rather than an estimate in a slide.
 *
 * Local, like everything else. Nothing is sent anywhere to be counted.
 */
export interface Run {
  id: string;
  ownerId: string;
  formatId: string;
  formatName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Wall-clock from pressing the button to having something to edit. */
  ms: number;
  createdAt: number;
}

export async function recordRun(run: Omit<Run, 'id' | 'ownerId' | 'createdAt'>): Promise<void> {
  try {
    await db.runs.put({
      ...run,
      id: crypto.randomUUID(),
      ownerId: ownerId(),
      createdAt: Date.now(),
    });
  } catch {
    // Measuring must never be the reason a person loses their document.
  }
}

export interface Summary {
  runs: number;
  medianSeconds: number;
  totalCost: number | null;
  medianCost: number | null;
  byFormat: { formatId: string; formatName: string; runs: number }[];
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function summary(): Promise<Summary> {
  const runs = await db.runs.where('ownerId').equals(ownerId()).toArray();
  const costs = runs
    .map((r) => costOf(r.model, r.inputTokens, r.outputTokens))
    .filter((c): c is number => c !== null);

  const counts = new Map<string, { name: string; n: number }>();
  for (const r of runs) {
    const seen = counts.get(r.formatId);
    counts.set(r.formatId, { name: r.formatName, n: (seen?.n ?? 0) + 1 });
  }

  return {
    runs: runs.length,
    // Median, not mean: one cold start should not decide the headline number.
    medianSeconds: median(runs.map((r) => r.ms)) / 1000,
    totalCost: costs.length ? costs.reduce((a, b) => a + b, 0) : null,
    medianCost: costs.length ? median(costs) : null,
    byFormat: [...counts.entries()]
      .map(([formatId, { name, n }]) => ({ formatId, formatName: name, runs: n }))
      .sort((a, b) => b.runs - a.runs),
  };
}

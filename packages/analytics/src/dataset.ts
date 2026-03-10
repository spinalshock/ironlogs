import type { LiftEntry } from '@ironlogs/core';
import type { TrainingDataset, LiftSummary, DatasetMeta } from '@ironlogs/core';
import { normalizeLiftName } from '@ironlogs/csv-parser';
import { groupByDay } from './volume.js';

/**
 * Build a normalized TrainingDataset from raw parsed entries.
 * This is the single entry point — parse CSV, then call this.
 * All analytics functions accept TrainingDataset.
 */
export function createDataset(entries: LiftEntry[]): TrainingDataset {
  // Sort by date
  const sets = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const sessions = groupByDay(sets);

  // Build lift summaries
  const liftMap = new Map<string, { sets: number; reps: number; volume: number; first: string; last: string; bestWeight: number }>();
  for (const e of sets) {
    const lift = normalizeLiftName(e.lift);
    const existing = liftMap.get(lift);
    if (existing) {
      existing.sets++;
      existing.reps += e.reps;
      existing.volume += e.weight * e.reps;
      if (e.date < existing.first) existing.first = e.date;
      if (e.date > existing.last) existing.last = e.date;
      if (e.weight > existing.bestWeight) existing.bestWeight = e.weight;
    } else {
      liftMap.set(lift, {
        sets: 1, reps: e.reps, volume: e.weight * e.reps,
        first: e.date, last: e.date, bestWeight: e.weight,
      });
    }
  }

  const lifts: LiftSummary[] = Array.from(liftMap.entries())
    .map(([lift, data]) => ({
      lift,
      totalSets: data.sets,
      totalReps: data.reps,
      totalVolume: data.volume,
      firstSeen: data.first,
      lastSeen: data.last,
      bestWeight: data.bestWeight,
    }))
    .sort((a, b) => b.totalVolume - a.totalVolume);

  const dates = sets.map(e => e.date);
  const meta: DatasetMeta = {
    totalSets: sets.length,
    totalSessions: sessions.length,
    dateRange: dates.length > 0 ? [dates[0], dates[dates.length - 1]] : null,
    uniqueLifts: lifts.map(l => l.lift),
    hasBodyweight: sets.some(e => e.bodyweight > 0),
    hasSetTypes: sets.some(e => e.set_type !== ''),
    hasSleep: sets.some(e => e.sleep > 0),
  };

  return { sets, sessions, lifts, meta };
}

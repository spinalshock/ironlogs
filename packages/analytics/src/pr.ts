import type { LiftEntry } from '@ironlogs/core';
import { normalizeLiftName } from '@ironlogs/csv-parser';
import { estimate1RM } from './e1rm.js';

/**
 * Determine if a set qualifies for 1RM progression tracking.
 *
 * A set is a progression set if it is:
 * - A `testing` set (dedicated max-effort test), OR
 * - An `amrap` set, OR
 * - A `t1_amrap` set whose notes contain "programmed N+" (legacy nSuns format)
 *
 * Only progression sets drive 1RM charts, PR detection, and scoring.
 *
 * @param entry - A single lift entry
 * @returns True if the set counts toward progression tracking
 */
export function isProgressionSet(entry: LiftEntry): boolean {
  if (entry.set_type === 'testing') return true;
  if (entry.set_type === 'amrap') return true;
  // Legacy nSuns support
  if (entry.set_type !== 't1_amrap') return false;
  return /programmed\s+1\+/.test(entry.notes);
}

/**
 * Build a chronological 1RM progression for a given lift.
 *
 * Filters to progression sets only, estimates 1RM via the Wathan formula, and
 * keeps the best estimated 1RM per day. Results are sorted by date ascending.
 *
 * @param entries - All lift entries
 * @param lift - Lift name (will be normalized)
 * @returns Daily best estimated 1RM values with the underlying weight/reps
 */
export function get1RMProgression(
  entries: LiftEntry[],
  lift: string,
): { date: string; estimated1RM: number; weight: number; reps: number }[] {
  const key = normalizeLiftName(lift);
  const byDay = new Map<string, { estimated1RM: number; weight: number; reps: number }>();

  for (const e of entries) {
    if (normalizeLiftName(e.lift) !== key || !isProgressionSet(e)) continue;
    const est = estimate1RM(e.weight, e.reps);
    const existing = byDay.get(e.date);
    if (!existing || est > existing.estimated1RM) {
      byDay.set(e.date, { estimated1RM: est, weight: e.weight, reps: e.reps });
    }
  }

  return Array.from(byDay.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Find all dates on which a new personal record was set for a given lift.
 *
 * Walks the 1RM progression chronologically and marks each date where the
 * estimated 1RM exceeds all previous values (running maximum detection).
 *
 * @param entries - All lift entries
 * @param lift - Lift name (will be normalized)
 * @returns Set of date strings (YYYY-MM-DD) on which PRs occurred
 */
export function findPRs(entries: LiftEntry[], lift: string): Set<string> {
  const progression = get1RMProgression(entries, lift);
  const prs = new Set<string>();
  let maxSoFar = 0;
  for (const p of progression) {
    if (p.estimated1RM > maxSoFar) {
      maxSoFar = p.estimated1RM;
      prs.add(p.date);
    }
  }
  return prs;
}

/**
 * Get the all-time best progression set for each lift (by estimated 1RM).
 *
 * Scans all progression sets and retains the single best estimated 1RM per
 * normalized lift name, regardless of date.
 *
 * @param entries - All lift entries
 * @returns Map of canonical lift name to best weight/reps/estimated1RM
 */
export function getBestRecentSets(
  entries: LiftEntry[],
): Record<string, { weight: number; reps: number; estimated1RM: number }> {
  const best: Record<string, { weight: number; reps: number; estimated1RM: number }> = {};
  for (const e of entries) {
    if (!isProgressionSet(e)) continue;
    const key = normalizeLiftName(e.lift);
    const est = estimate1RM(e.weight, e.reps);
    if (!best[key] || est > best[key].estimated1RM) {
      best[key] = { weight: e.weight, reps: e.reps, estimated1RM: est };
    }
  }
  return best;
}

const PRIMARY_LIFTS = ['bench', 'squat', 'deadlift', 'ohp'];

export function getUniqueLifts(entries: LiftEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) {
    if (!isProgressionSet(e)) continue;
    const name = normalizeLiftName(e.lift);
    if (PRIMARY_LIFTS.includes(name)) set.add(name);
  }
  return PRIMARY_LIFTS.filter((l) => set.has(l));
}

import type { LiftEntry, DaySession } from '@ironlogs/core';
import { normalizeLiftName } from '@ironlogs/csv-parser';

/**
 * Group lift entries into daily sessions sorted chronologically.
 *
 * Aggregates all entries sharing the same date into a single session, computing
 * total tonnage (weight x reps) and per-lift tonnage using normalized lift names.
 * Bodyweight and sleep are taken from the first entry of each day.
 *
 * @param entries - Flat array of lift entries
 * @returns Sessions sorted by date ascending, each with tonnage and per-lift tonnage
 */
export function groupByDay(entries: LiftEntry[]): DaySession[] {
  const map = new Map<string, LiftEntry[]>();
  for (const e of entries) {
    const existing = map.get(e.date) || [];
    existing.push(e);
    map.set(e.date, existing);
  }

  return Array.from(map.entries())
    .map(([date, lifts]) => {
      const tonnage = lifts.reduce((sum, l) => sum + l.weight * l.reps, 0);
      const liftTonnage: Record<string, number> = {};
      for (const l of lifts) {
        const key = normalizeLiftName(l.lift);
        liftTonnage[key] = (liftTonnage[key] || 0) + l.weight * l.reps;
      }
      const sleep = lifts[0].sleep || 0;
      return { date, bodyweight: lifts[0].bodyweight, sleep, lifts, tonnage, liftTonnage };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Return the most recent bodyweight recorded across all entries.
 *
 * @param entries - Lift entries with bodyweight data
 * @returns Latest bodyweight value, or 0 if no entries exist
 */
export function getLatestBodyweight(entries: LiftEntry[]): number {
  if (entries.length === 0) return 0;
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0].bodyweight;
}

export function getAllUniqueLifts(entries: LiftEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) {
    set.add(normalizeLiftName(e.lift));
  }
  return Array.from(set).sort();
}

export function getBodyweightProgression(
  entries: LiftEntry[],
): { date: string; bodyweight: number }[] {
  const byDay = new Map<string, number>();
  for (const e of entries) {
    if (e.bodyweight > 0) byDay.set(e.date, e.bodyweight);
  }
  return Array.from(byDay.entries())
    .map(([date, bodyweight]) => ({ date, bodyweight }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Extract daily sleep values as a time series sorted chronologically.
 *
 * Takes the first non-zero sleep value per date (from the first entry of that day).
 *
 * @param entries - Lift entries with sleep data
 * @returns Array of {date, sleep} sorted by date ascending
 */
export function getSleepProgression(
  entries: LiftEntry[],
): { date: string; sleep: number }[] {
  const byDay = new Map<string, number>();
  for (const e of entries) {
    if (e.sleep > 0 && !byDay.has(e.date)) byDay.set(e.date, e.sleep);
  }
  return Array.from(byDay.entries())
    .map(([date, sleep]) => ({ date, sleep }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Compute summary sleep statistics: all-time average, 7-day average, 30-day
 * average, and the most recent value.
 *
 * Falls back to the all-time average when fewer data points exist for the
 * 7-day or 30-day windows.
 *
 * @param entries - Lift entries with sleep data
 * @returns Sleep stats rounded to one decimal place, or null if no sleep data
 */
export function getSleepStats(entries: LiftEntry[]): {
  average: number; avg7d: number; avg30d: number; latest: number;
} | null {
  const data = getSleepProgression(entries);
  if (data.length === 0) return null;
  const average = data.reduce((s, d) => s + d.sleep, 0) / data.length;
  const latest = data[data.length - 1].sleep;
  const now = new Date().toISOString().slice(0, 10);
  const d7 = new Date(); d7.setDate(d7.getDate() - 7);
  const d30 = new Date(); d30.setDate(d30.getDate() - 30);
  const cutoff7 = d7.toISOString().slice(0, 10);
  const cutoff30 = d30.toISOString().slice(0, 10);
  const last7 = data.filter(d => d.date >= cutoff7 && d.date <= now);
  const last30 = data.filter(d => d.date >= cutoff30 && d.date <= now);
  const avg7d = last7.length > 0 ? last7.reduce((s, d) => s + d.sleep, 0) / last7.length : average;
  const avg30d = last30.length > 0 ? last30.reduce((s, d) => s + d.sleep, 0) / last30.length : average;
  return { average: Math.round(average * 10) / 10, avg7d: Math.round(avg7d * 10) / 10, avg30d: Math.round(avg30d * 10) / 10, latest };
}

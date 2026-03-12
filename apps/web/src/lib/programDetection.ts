/**
 * Shared program day detection logic.
 * Used by TodaySession, FatigueBanner, and Log to determine next training day.
 */

import type { LiftEntry } from './types';
import { groupByDay } from './useLifts';
import { normalizeLiftName } from './scoring';

export const PROGRAM_ROTATION = [
  { t1: 'bench', hasOnePlus: false }, { t1: 'deadlift', hasOnePlus: true },
  { t1: 'ohp', hasOnePlus: true }, { t1: 'squat', hasOnePlus: true },
  { t1: 'bench', hasOnePlus: true }, { t1: 'deadlift', hasOnePlus: false },
];

/**
 * Find which program rotation index matches a given T1 lift + AMRAP combo.
 */
export function detectProgramDay(t1Lift: string, hasOnePlusAmrap: boolean): number {
  for (let i = 0; i < PROGRAM_ROTATION.length; i++) {
    const d = PROGRAM_ROTATION[i];
    if (d.t1 === t1Lift && d.hasOnePlus === hasOnePlusAmrap) return i;
  }
  return PROGRAM_ROTATION.findIndex((d) => d.t1 === t1Lift);
}

/**
 * Detect the next T1 lift based on the last session's data.
 */
export function detectNextT1(entries: LiftEntry[]): string | null {
  const sessions = groupByDay(entries);
  if (sessions.length === 0) return null;
  const last = sessions[sessions.length - 1];
  const t1Lifts = last.lifts.filter((l) => l.set_type === 't1' || l.set_type === 't1_amrap');
  if (t1Lifts.length === 0) return null;
  const lastT1 = normalizeLiftName(t1Lifts[0].lift);
  const hadOnePlus = last.lifts.some((l) => l.set_type === 't1_amrap' && /programmed\s+1\+/.test(l.notes));

  const idx = detectProgramDay(lastT1, hadOnePlus);
  if (idx >= 0) return PROGRAM_ROTATION[(idx + 1) % PROGRAM_ROTATION.length].t1;
  return null;
}

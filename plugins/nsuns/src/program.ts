/**
 * nSuns 5/3/1 LP program rotation and day detection.
 */

import type { LiftEntry } from '@ironlogs/core';
import { normalizeLiftName } from '@ironlogs/csv-parser';
import { groupByDay } from '@ironlogs/analytics';

export const PROGRAM_ROTATION = [
  { t1: 'bench', hasOnePlus: false },
  { t1: 'deadlift', hasOnePlus: true },
  { t1: 'ohp', hasOnePlus: true },
  { t1: 'squat', hasOnePlus: true },
  { t1: 'bench', hasOnePlus: true },
  { t1: 'deadlift', hasOnePlus: false },
];

export function detectProgramDay(t1Lift: string, hasOnePlusAmrap: boolean): number {
  for (let i = 0; i < PROGRAM_ROTATION.length; i++) {
    const d = PROGRAM_ROTATION[i];
    if (d.t1 === t1Lift && d.hasOnePlus === hasOnePlusAmrap) return i;
  }
  return PROGRAM_ROTATION.findIndex((d) => d.t1 === t1Lift);
}

export function detectNextT1(entries: LiftEntry[]): string | null {
  const sessions = groupByDay(entries);
  if (sessions.length === 0) return null;
  const last = sessions[sessions.length - 1];
  const t1Lifts = last.lifts.filter((l) => l.set_type === 't1' || l.set_type === 't1_amrap');
  if (t1Lifts.length === 0) return null;
  const lastT1 = normalizeLiftName(t1Lifts[0].lift);
  const hadOnePlus = last.lifts.some((l) => l.set_type === 't1_amrap' && /programmed\s+1\+/.test(l.notes));

  for (let i = 0; i < PROGRAM_ROTATION.length; i++) {
    const d = PROGRAM_ROTATION[i];
    if (d.t1 === lastT1 && d.hasOnePlus === hadOnePlus) {
      return PROGRAM_ROTATION[(i + 1) % PROGRAM_ROTATION.length].t1;
    }
  }
  const idx = PROGRAM_ROTATION.findIndex((d) => d.t1 === lastT1);
  if (idx >= 0) return PROGRAM_ROTATION[(idx + 1) % PROGRAM_ROTATION.length].t1;
  return null;
}

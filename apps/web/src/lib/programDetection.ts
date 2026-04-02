/**
 * Generic program day detection.
 * Works with any program template by matching the last session's T1 lift
 * against the program's computed days array.
 */

import type { ComputedDay } from '@ironlogs/plugin-api';
import type { LiftEntry } from './types';
import { groupByDay } from './useLifts';
import { normalizeLiftName } from './scoring';

/**
 * Get the next program day index based on the last session's T1 lift.
 * Skips rest days unless insufficient time has passed.
 */
export function getNextDayIndex(days: ComputedDay[], entries: LiftEntry[]): number {
  const sessions = groupByDay(entries);
  if (sessions.length === 0 || days.length === 0) return 0;

  // Find the last program session (has a t1_amrap set — actual programmed work).
  // Non-program sessions (testing, accessories-only) don't drive day detection,
  // but each one counts as advancing one program day.
  let programIdx = sessions.length - 1;
  let sessionsAfter = 0;
  while (programIdx >= 0) {
    if (sessions[programIdx].lifts.some((l) => l.set_type === 't1_amrap')) break;
    programIdx--;
    sessionsAfter++;
  }
  if (programIdx < 0) return 0;

  const programSession = sessions[programIdx];
  const t1Lifts = programSession.lifts.filter(
    (l) => l.set_type === 't1' || l.set_type === 't1_amrap',
  );
  if (t1Lifts.length === 0) return 0;

  const lastT1 = normalizeLiftName(t1Lifts[0].lift);

  // Programs with duplicate T1 lifts (e.g., nSuns has bench twice) need
  // disambiguation. We check if the session had a 1+ AMRAP to narrow it down.
  const hadOnePlus = programSession.lifts.some(
    (l) => l.set_type === 't1_amrap' && /programmed\s+1\+/.test(l.notes),
  );

  // Find all matching day indices
  const matches: number[] = [];
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    if (!day.t1) continue;
    if (normalizeLiftName(day.t1.lift) !== lastT1) continue;
    matches.push(i);
  }

  let lastDayIndex: number;
  if (matches.length === 0) {
    // No T1 match — fall back to first training day
    return days.findIndex((d) => !d.rest);
  } else if (matches.length === 1) {
    lastDayIndex = matches[0];
  } else {
    // Multiple matches — disambiguate by checking if the day has a 1+ AMRAP set
    const refined = matches.find((i) => {
      const sets = days[i].t1!.sets;
      const has1Plus = sets.some((s) => String(s.reps) === '1+');
      return has1Plus === hadOnePlus;
    });
    lastDayIndex = refined ?? matches[0];
  }

  return (lastDayIndex + 1 + sessionsAfter) % days.length;
}

/**
 * Detect the next T1 lift based on last session and program days.
 */
export function detectNextT1(days: ComputedDay[], entries: LiftEntry[]): string | null {
  const nextIdx = getNextDayIndex(days, entries);

  // Walk forward from nextIdx to find next training day with a T1
  for (let offset = 0; offset < days.length; offset++) {
    const day = days[(nextIdx + offset) % days.length];
    if (day.t1) return normalizeLiftName(day.t1.lift);
  }
  return null;
}

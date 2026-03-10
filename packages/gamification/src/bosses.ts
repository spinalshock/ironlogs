/**
 * Boss battles for IronLogs.
 */

import type { LiftEntry } from '@ironlogs/core';
import { getBestRecentSets, getLatestBodyweight } from '@ironlogs/analytics';

// ─── Boss Battles ───────────────────────────────────────────

export interface Boss {
  id: string;
  name: string;
  challenge: string;
  lift: string;
  targetWeight: number;
  targetReps: number;
  xpReward: number;
  defeated: boolean;
}

const BOSS_DEFS: { id: string; name: string; lift: string; target: number; reps: number; xp: number; challenge: string }[] = [
  { id: 'gatekeeper', name: 'The Gatekeeper', lift: 'squat', target: 100, reps: 1, xp: 500, challenge: 'Squat 100kg' },
  { id: 'iron_gate', name: 'The Iron Gate', lift: 'bench', target: 100, reps: 1, xp: 500, challenge: 'Bench 100kg' },
  { id: 'earth_shaker', name: 'The Earth Shaker', lift: 'deadlift', target: 140, reps: 1, xp: 500, challenge: 'Deadlift 140kg' },
  { id: 'skybreaker', name: 'The Skybreaker', lift: 'ohp', target: -1, reps: 1, xp: 600, challenge: 'Press your bodyweight overhead' },
  { id: 'titan', name: 'The Titan', lift: 'deadlift', target: 180, reps: 1, xp: 800, challenge: 'Deadlift 180kg' },
  { id: 'mountain', name: 'The Mountain', lift: 'squat', target: 140, reps: 1, xp: 700, challenge: 'Squat 140kg' },
  { id: 'gladiator', name: 'The Gladiator', lift: 'bench', target: 140, reps: 1, xp: 700, challenge: 'Bench 140kg' },
  { id: 'colossus', name: 'The Colossus', lift: 'deadlift', target: 220, reps: 1, xp: 1000, challenge: 'Deadlift 220kg' },
  { id: 'leviathan', name: 'The Leviathan', lift: '_total_4x', target: -1, reps: 1, xp: 1200, challenge: 'SBD total >= 4x bodyweight' },
  { id: 'iron_god', name: 'Iron God', lift: '_total_5x', target: -1, reps: 1, xp: 2000, challenge: 'SBD total >= 5x bodyweight' },
];

export function getBosses(entries: LiftEntry[]): Boss[] {
  const bw = getLatestBodyweight(entries);
  const best = getBestRecentSets(entries);
  const sbd = (best.squat?.estimated1RM || 0) + (best.bench?.estimated1RM || 0) + (best.deadlift?.estimated1RM || 0);

  return BOSS_DEFS.map((def) => {
    let defeated = false;
    if (def.lift === '_total_4x') {
      defeated = bw > 0 && sbd >= 4 * bw;
    } else if (def.lift === '_total_5x') {
      defeated = bw > 0 && sbd >= 5 * bw;
    } else if (def.target === -1 && def.lift === 'ohp') {
      defeated = bw > 0 && (best.ohp?.estimated1RM || 0) >= bw;
    } else {
      const e1rm = best[def.lift]?.estimated1RM || 0;
      defeated = e1rm >= def.target;
    }
    return { id: def.id, name: def.name, challenge: def.challenge, lift: def.lift, targetWeight: def.target, targetReps: def.reps, xpReward: def.xp, defeated };
  });
}

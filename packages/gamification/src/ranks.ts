/**
 * Ranks for IronLogs.
 */

import type { LiftEntry } from '@ironlogs/core';
import { calcLiftScore, calcOverallScore, getBestRecentSets, getLatestBodyweight } from '@ironlogs/analytics';

// ─── Rank (Score-based) ─────────────────────────────────────

export interface Rank {
  name: string;
  color: string;
  minScore: number;
}

export const RANKS: Rank[] = [
  { name: 'Mythic', minScore: 125, color: '#f44336' },
  { name: 'Warlord', minScore: 112.5, color: '#ff5722' },
  { name: 'Champion', minScore: 100, color: '#ffc107' },
  { name: 'Iron Elite', minScore: 87.5, color: '#cddc39' },
  { name: 'Iron Warrior', minScore: 75, color: '#4caf50' },
  { name: 'Iron Adept', minScore: 60, color: '#009688' },
  { name: 'Apprentice', minScore: 45, color: '#3f51b5' },
  { name: 'Initiate', minScore: 30, color: '#673ab7' },
  { name: 'Civilian', minScore: 0, color: '#90a4ae' },
];

export function getRank(entries: LiftEntry[]): Rank {
  const bw = getLatestBodyweight(entries);
  const best = getBestRecentSets(entries);
  const scored = ['squat', 'bench', 'deadlift', 'ohp'];
  const liftScores = scored
    .filter((l) => best[l])
    .map((l) => ({ lift: l, ...calcLiftScore(l, best[l].estimated1RM, bw) }));
  const score = calcOverallScore(liftScores).score;
  for (const r of RANKS) {
    if (score >= r.minScore) return r;
  }
  return RANKS[RANKS.length - 1];
}

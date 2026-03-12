/**
 * Lifter classes for IronLogs.
 */

import type { LiftEntry } from '@ironlogs/core';
import { calcLiftScore, SCORING_CATEGORIES, getBestRecentSets, getLatestBodyweight } from '@ironlogs/analytics';

// ─── Lifter Classes ─────────────────────────────────────────

export interface LifterClass {
  name: string;
  description: string;
  primaryLift: string;
  color: string;
}

const CLASSES: { name: string; category: string; description: string; color: string }[] = [
  { name: 'The Juggernaut', category: 'Squat', description: 'Squat Dominance', color: '#f06292' },
  { name: 'The Titan', category: 'Floor Pull', description: 'Pulling Dominance', color: '#81c784' },
  { name: 'The Gladiator', category: 'Horizontal Press', description: 'Pressing Power', color: '#7986cb' },
  { name: 'The Olympian', category: 'Vertical Press', description: 'Overhead Strength', color: '#ffd54f' },
];

export function getLifterClass(entries: LiftEntry[]): LifterClass {
  const bw = getLatestBodyweight(entries);
  const best = getBestRecentSets(entries);

  const categoryScores: { category: string; score: number }[] = [];
  for (const [cat, lifts] of Object.entries(SCORING_CATEGORIES)) {
    let maxScore = 0;
    for (const lift of lifts) {
      if (best[lift]) {
        const { score } = calcLiftScore(lift, best[lift].estimated1RM, bw);
        maxScore = Math.max(maxScore, score);
      }
    }
    if (maxScore > 0) categoryScores.push({ category: cat, score: maxScore });
  }

  if (categoryScores.length === 0) {
    return { name: 'The Initiate', description: 'Just getting started', primaryLift: 'none', color: '#90a4ae' };
  }

  // Check if balanced (max and min within 20% — true balance is rare)
  const scores = categoryScores.map((c) => c.score);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  if (categoryScores.length >= 3 && maxScore > 0 && (maxScore - minScore) / maxScore < 0.20) {
    return { name: 'The Atlas', description: 'Balanced Strength', primaryLift: 'balanced', color: '#ab47bc' };
  }

  const best_cat = categoryScores.reduce((a, b) => a.score > b.score ? a : b);
  const cls = CLASSES.find((c) => c.category === best_cat.category);
  return cls
    ? { name: cls.name, description: cls.description, primaryLift: best_cat.category, color: cls.color }
    : { name: 'The Atlas', description: 'Balanced', primaryLift: 'balanced', color: '#ab47bc' };
}

/**
 * Strength archaeologist insights for IronLogs.
 */

import type { LiftEntry } from '@ironlogs/core';
import { groupByDay, findPRs, getSleepProgression } from '@ironlogs/analytics';

// ─── Strength Archaeologist ─────────────────────────────────

export interface Insight {
  title: string;
  description: string;
  color: string;
}

export function getInsights(entries: LiftEntry[]): Insight[] {
  const insights: Insight[] = [];
  const sessions = groupByDay(entries);
  if (sessions.length < 10) return insights;

  // Best sleep for PRs
  const T1_LIFTS = ['bench', 'squat', 'deadlift', 'ohp'];
  const allPRDates = new Set<string>();
  for (const lift of T1_LIFTS) {
    for (const date of findPRs(entries, lift)) allPRDates.add(date);
  }

  const sleepData = getSleepProgression(entries);
  if (sleepData.length >= 5) {
    const sleepMap = new Map(sleepData.map((s) => [s.date, s.sleep]));
    const prSleeps = sessions.filter((s) => allPRDates.has(s.date) && sleepMap.has(s.date)).map((s) => sleepMap.get(s.date)!);
    const nonPrSleeps = sessions.filter((s) => !allPRDates.has(s.date) && sleepMap.has(s.date)).map((s) => sleepMap.get(s.date)!);

    if (prSleeps.length >= 2 && nonPrSleeps.length >= 2) {
      const avgPR = prSleeps.reduce((a, b) => a + b, 0) / prSleeps.length;
      const avgNon = nonPrSleeps.reduce((a, b) => a + b, 0) / nonPrSleeps.length;
      if (avgPR > avgNon + 0.3) {
        insights.push({
          title: 'Sleep drives PRs',
          description: `You average ${avgPR.toFixed(1)}h sleep on PR days vs ${avgNon.toFixed(1)}h on non-PR days`,
          color: '#7986cb',
        });
      }
    }
  }

  // Best tonnage range for PRs
  const prTonnages = sessions.filter((s) => allPRDates.has(s.date)).map((s) => s.tonnage);
  if (prTonnages.length >= 3) {
    const avgPRTonnage = prTonnages.reduce((a, b) => a + b, 0) / prTonnages.length;
    insights.push({
      title: 'PR sweet spot',
      description: `Your PRs tend to happen at ~${(avgPRTonnage / 1000).toFixed(1)} tons session volume`,
      color: '#81c784',
    });
  }

  // Strongest day of the week
  const dayScores: Record<number, number[]> = {};
  for (const s of sessions) {
    const dow = new Date(s.date + 'T00:00:00').getDay();
    if (!dayScores[dow]) dayScores[dow] = [];
    dayScores[dow].push(s.tonnage);
  }
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let bestDay = 0, bestAvg = 0;
  for (const [dow, tonnages] of Object.entries(dayScores)) {
    const avg = tonnages.reduce((a, b) => a + b, 0) / tonnages.length;
    if (avg > bestAvg) { bestAvg = avg; bestDay = parseInt(dow); }
  }
  if (bestAvg > 0) {
    insights.push({
      title: 'Power day',
      description: `${DAYS[bestDay]}s are your highest-volume day (avg ${(bestAvg / 1000).toFixed(1)} tons)`,
      color: '#ffd54f',
    });
  }

  return insights;
}

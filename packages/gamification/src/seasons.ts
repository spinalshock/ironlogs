/**
 * Seasons for IronLogs.
 */

import type { LiftEntry } from '@ironlogs/core';
import { groupByDay, findPRs } from '@ironlogs/analytics';
import { calcXPProfile } from './xp.js';

// ─── Seasons ────────────────────────────────────────────────

export interface Season {
  number: number;
  startDate: string;
  endDate: string;
  sessions: number;
  prCount: number;
  totalXP: number;
  isActive: boolean;
}

export function getSeasons(entries: LiftEntry[]): Season[] {
  const sessions = groupByDay(entries);
  if (sessions.length === 0) return [];

  const firstDate = new Date(sessions[0].date + 'T00:00:00');
  const today = new Date();
  const seasons: Season[] = [];
  let seasonStart = new Date(firstDate);
  let seasonNum = 1;

  const T1_LIFTS = ['bench', 'squat', 'deadlift', 'ohp'];
  const allPRDates = new Set<string>();
  for (const lift of T1_LIFTS) {
    for (const date of findPRs(entries, lift)) allPRDates.add(date);
  }

  const xpProfile = calcXPProfile(entries);
  const xpByDate = new Map<string, number>();
  for (const s of xpProfile.sessions) xpByDate.set(s.date, s.total);

  while (seasonStart <= today) {
    const seasonEnd = new Date(seasonStart);
    seasonEnd.setDate(seasonEnd.getDate() + 12 * 7 - 1); // 12 weeks
    const startStr = seasonStart.toISOString().slice(0, 10);
    const endStr = seasonEnd.toISOString().slice(0, 10);

    const seasonSessions = sessions.filter((s) => s.date >= startStr && s.date <= endStr);
    const prCount = seasonSessions.filter((s) => allPRDates.has(s.date)).length;
    const totalXP = seasonSessions.reduce((sum, s) => sum + (xpByDate.get(s.date) || 0), 0);

    seasons.push({
      number: seasonNum,
      startDate: startStr,
      endDate: endStr,
      sessions: seasonSessions.length,
      prCount,
      totalXP,
      isActive: today >= seasonStart && today <= seasonEnd,
    });

    seasonStart = new Date(seasonEnd);
    seasonStart.setDate(seasonStart.getDate() + 1);
    seasonNum++;
  }

  return seasons;
}

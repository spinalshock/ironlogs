/**
 * XP system for IronLogs.
 */

import type { LiftEntry } from '@ironlogs/core';
import { groupByDay, findPRs } from '@ironlogs/analytics';

// ─── XP System ──────────────────────────────────────────────

export interface SessionXP {
  date: string;
  tonnageXP: number;
  amrapXP: number;
  prXP: number;
  streakXP: number;
  total: number;
}

export interface XPProfile {
  totalXP: number;
  level: number;
  xpInCurrentLevel: number;
  xpForNextLevel: number;
  progressPct: number;
  sessions: SessionXP[];
}

function levelXPRequired(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

function levelFromXP(totalXP: number): { level: number; xpInLevel: number; xpForNext: number } {
  let level = 1;
  let xpUsed = 0;
  while (true) {
    const req = levelXPRequired(level);
    if (xpUsed + req > totalXP) {
      return { level, xpInLevel: totalXP - xpUsed, xpForNext: req };
    }
    xpUsed += req;
    level++;
  }
}

export function calcXPProfile(entries: LiftEntry[]): XPProfile {
  const sessions = groupByDay(entries);
  const T1_LIFTS = ['bench', 'squat', 'deadlift', 'ohp'];
  const allPRs = new Set<string>();
  for (const lift of T1_LIFTS) {
    for (const date of findPRs(entries, lift)) allPRs.add(date);
  }

  // Build streak map
  const dateSet = new Set(sessions.map((s) => s.date));
  const sortedDates = Array.from(dateSet).sort();
  const streakOnDate = new Map<string, number>();
  let currentStreak = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) { currentStreak = 1; }
    else {
      const prev = new Date(sortedDates[i - 1] + 'T00:00:00');
      const curr = new Date(sortedDates[i] + 'T00:00:00');
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      currentStreak = diff === 1 ? currentStreak + 1 : 1;
    }
    streakOnDate.set(sortedDates[i], currentStreak);
  }

  const sessionXPs: SessionXP[] = sessions.map((s) => {
    // Tonnage XP
    const tonnageXP = Math.round(s.tonnage / 100);

    // AMRAP surplus XP
    let amrapXP = 0;
    for (const l of s.lifts) {
      if (l.set_type === 't1_amrap' && l.notes) {
        const match = l.notes.match(/programmed\s+(\d+)\+/);
        if (match) {
          const surplus = l.reps - parseInt(match[1]);
          if (surplus > 0) amrapXP += surplus * 10;
        }
      }
    }

    // PR bonus
    const prXP = allPRs.has(s.date) ? 100 : 0;

    // Streak bonus
    const streak = streakOnDate.get(s.date) || 0;
    let streakXP = 0;
    if (streak >= 14) streakXP = 30;
    else if (streak >= 7) streakXP = 20;
    else if (streak >= 3) streakXP = 10;

    return { date: s.date, tonnageXP, amrapXP, prXP, streakXP, total: tonnageXP + amrapXP + prXP + streakXP };
  });

  const totalXP = sessionXPs.reduce((sum, s) => sum + s.total, 0);
  const { level, xpInLevel, xpForNext } = levelFromXP(totalXP);

  return {
    totalXP,
    level,
    xpInCurrentLevel: xpInLevel,
    xpForNextLevel: xpForNext,
    progressPct: Math.round((xpInLevel / xpForNext) * 100),
    sessions: sessionXPs,
  };
}

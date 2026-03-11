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

  // Build a running streak counter: consecutive sessions allowing 2-day gaps
  // (covers rest days in a 6-day program). Resets on 3+ day gaps.
  const streakByDate = new Map<string, number>();
  if (sessions.length > 0) {
    let streak = 1;
    streakByDate.set(sessions[0].date, streak);
    for (let i = 1; i < sessions.length; i++) {
      const prev = new Date(sessions[i - 1].date + 'T00:00:00');
      const curr = new Date(sessions[i].date + 'T00:00:00');
      const gap = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (gap <= 2) { streak++; } else { streak = 1; }
      streakByDate.set(sessions[i].date, streak);
    }
  }

  // Streak XP: ramps from 5 at streak 2, up to max 50 at streak 20+
  // Formula: min(5 * (streak - 1), 50) — so streak 1 = 0, 2 = 5, 3 = 10, ... 11 = 50 (capped)
  function calcStreakXP(streak: number): number {
    if (streak <= 1) return 0;
    return Math.min((streak - 1) * 5, 50);
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

    // Streak bonus (progressive, per-session)
    const streak = streakByDate.get(s.date) || 0;
    const streakXP = calcStreakXP(streak);

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

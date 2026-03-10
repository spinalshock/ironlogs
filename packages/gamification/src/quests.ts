/**
 * Daily and weekly quests for IronLogs.
 */

import type { LiftEntry } from '@ironlogs/core';
import { normalizeLiftName } from '@ironlogs/csv-parser';
import { groupByDay, findPRs } from '@ironlogs/analytics';

// ─── Daily Quests ───────────────────────────────────────────

export interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  type: 'daily' | 'weekly';
}

export function getDailyQuests(entries: LiftEntry[]): Quest[] {
  const today = new Date().toISOString().slice(0, 10);
  const sessions = groupByDay(entries);
  const todaySession = sessions.find((s) => s.date === today);

  const completedT1 = todaySession
    ? todaySession.lifts.filter((l) => l.set_type === 't1' || l.set_type === 't1_amrap').length >= 8
    : false;

  const tonnage10k = todaySession ? todaySession.tonnage >= 10000 : false;

  const amrapSurplus2 = todaySession
    ? todaySession.lifts.some((l) => {
        if (l.set_type !== 't1_amrap' || !l.notes) return false;
        const match = l.notes.match(/programmed\s+(\d+)\+/);
        return match ? (l.reps - parseInt(match[1])) >= 2 : false;
      })
    : false;

  return [
    { id: 'daily_t1', title: 'Iron Discipline', description: 'Complete all T1 sets', xpReward: 50, completed: completedT1, type: 'daily' },
    { id: 'daily_tonnage', title: 'Volume Crusher', description: 'Hit 10k session tonnage', xpReward: 80, completed: tonnage10k, type: 'daily' },
    { id: 'daily_amrap', title: 'Beyond the Limit', description: 'Beat AMRAP by +2 reps', xpReward: 60, completed: amrapSurplus2, type: 'daily' },
  ];
}

// ─── Weekly Quests ──────────────────────────────────────────

export function getWeeklyQuests(entries: LiftEntry[]): Quest[] {
  const now = new Date();
  const monday = new Date(now);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
  const weekStart = monday.toISOString().slice(0, 10);
  const weekEnd = new Date().toISOString().slice(0, 10);

  const sessions = groupByDay(entries);
  const weekSessions = sessions.filter((s) => s.date >= weekStart && s.date <= weekEnd);

  // PR this week
  const T1_LIFTS = ['bench', 'squat', 'deadlift', 'ohp'];
  let weeklyPR = false;
  for (const lift of T1_LIFTS) {
    const prs = findPRs(entries, lift);
    for (const s of weekSessions) {
      if (prs.has(s.date)) { weeklyPR = true; break; }
    }
    if (weeklyPR) break;
  }

  // All 6 nSuns days this week
  const uniqueT1s = new Set<string>();
  for (const s of weekSessions) {
    for (const l of s.lifts) {
      if (l.set_type === 't1' || l.set_type === 't1_amrap') {
        uniqueT1s.add(normalizeLiftName(l.lift));
      }
    }
  }

  return [
    { id: 'weekly_6days', title: 'Pain Train', description: 'Complete all 6 nSuns days', xpReward: 300, completed: weekSessions.length >= 6, type: 'weekly' },
    { id: 'weekly_pr', title: 'Record Setter', description: 'PR any lift this week', xpReward: 400, completed: weeklyPR, type: 'weekly' },
    { id: 'weekly_4days', title: 'Dedicated', description: 'Train 4 days this week', xpReward: 150, completed: weekSessions.length >= 4, type: 'weekly' },
  ];
}

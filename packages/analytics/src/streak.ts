import type { DaySession } from '@ironlogs/core';

export interface WeeklyStreak {
  /** Consecutive completed weeks (not counting current week) */
  streak: number;
  /** Sessions logged in the current (in-progress) week */
  currentWeekSessions: number;
  /** Required sessions per week to count as complete */
  requiredPerWeek: number;
  /** Whether the current week is already complete */
  currentWeekComplete: boolean;
}

/**
 * Get the Monday-based ISO week start for a YYYY-MM-DD string.
 */
function getWeekStart(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Subtract 7 days from a YYYY-MM-DD string.
 */
function weekBefore(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d - 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Get today as YYYY-MM-DD in local time.
 */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Calculate a weekly program-completion streak.
 *
 * A week counts as "complete" if the number of sessions that week
 * meets or exceeds `trainingDaysPerWeek`. Streak = consecutive
 * completed weeks walking backwards from last week.
 *
 * The current week is tracked separately (in-progress).
 *
 * @param sessions - Day sessions sorted by date ascending
 * @param trainingDaysPerWeek - Number of training days in the program (e.g. 6 for nSuns)
 */
export function calcWeeklyStreak(
  sessions: DaySession[],
  trainingDaysPerWeek: number,
): WeeklyStreak {
  if (sessions.length === 0 || trainingDaysPerWeek <= 0) {
    return { streak: 0, currentWeekSessions: 0, requiredPerWeek: trainingDaysPerWeek, currentWeekComplete: false };
  }

  // Count sessions per week (Monday-based)
  const weekCounts = new Map<string, number>();
  for (const s of sessions) {
    const ws = getWeekStart(s.date);
    weekCounts.set(ws, (weekCounts.get(ws) || 0) + 1);
  }

  const currentWeekStart = getWeekStart(todayStr());
  // 80% threshold — survive occasional misses (e.g. 5/6 for a 6-day program)
  const threshold = Math.ceil(trainingDaysPerWeek * 0.8);

  const currentWeekSessions = weekCounts.get(currentWeekStart) || 0;
  const currentWeekComplete = currentWeekSessions >= threshold;

  // Walk backwards from the week before current, checking consecutive completed weeks
  let streak = 0;
  let checkWeek = weekBefore(currentWeekStart);
  while (true) {
    const count = weekCounts.get(checkWeek) || 0;
    if (count >= threshold) {
      streak++;
      checkWeek = weekBefore(checkWeek);
    } else {
      break;
    }
  }

  return { streak, currentWeekSessions, requiredPerWeek: trainingDaysPerWeek, currentWeekComplete };
}

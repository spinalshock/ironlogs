/**
 * XP system for IronLogs.
 *
 * Four XP sources per session:
 * 1. Tonnage XP — intensity-weighted volume (heavy work > junk volume)
 * 2. AMRAP Surplus XP — effort beyond programmed minimum (capped at 10 surplus)
 * 3. PR Bonus — flat 100 XP for any session with a new e1RM high
 * 4. Streak XP — progressive bonus for consecutive sessions (program-aware gaps)
 *
 * Anti-abuse: sessions under 500kg total tonnage earn 0 XP.
 */

import type { LiftEntry } from '@ironlogs/core';
import { groupByDay, findPRs, estimate1RM } from '@ironlogs/analytics';

// ─── Constants ─────────────────────────────────────────────

/** Minimum session tonnage (kg) to earn any XP. Prevents farming tiny sessions. */
const MIN_SESSION_TONNAGE = 500;

/** Maximum AMRAP surplus reps that count for XP. Prevents runaway sets from dominating. */
const MAX_AMRAP_SURPLUS = 10;

/** Level curve multiplier. 80 × level^1.5 — slightly faster early progression for 3-6x/week training. */
const LEVEL_CURVE_BASE = 80;

// ─── Types ─────────────────────────────────────────────────

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

export interface XPConfig {
  /** Training days per week from program config. Used for streak gap tolerance. Default: 6 */
  trainingDaysPerWeek?: number;
}

// ─── Level Curve ───────────────────────────────────────────

function levelXPRequired(level: number): number {
  return Math.round(LEVEL_CURVE_BASE * Math.pow(level, 1.5));
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

// ─── Intensity-Weighted Tonnage ────────────────────────────

/**
 * Compute intensity factor for a set: weight / estimated 1RM for that set.
 * Heavy sets (low reps) get a higher factor than light sets (high reps).
 * For reps > 12 (where e1RM is unreliable), use a default low factor.
 * Clamped to [0.4, 1.2].
 */
function intensityFactor(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0.4;
  const e1rm = estimate1RM(weight, reps);
  if (e1rm <= 0) return 0.5; // reps > 12, default low factor
  const factor = weight / e1rm;
  return Math.max(0.4, Math.min(1.2, factor));
}

/**
 * Compute intensity-weighted tonnage for a session.
 * Each set contributes: weight × reps × intensity_factor
 * This makes heavy work worth more XP than junk volume.
 */
function weightedTonnage(lifts: LiftEntry[]): number {
  let total = 0;
  for (const l of lifts) {
    total += l.weight * l.reps * intensityFactor(l.weight, l.reps);
  }
  return total;
}

// ─── Main XP Calculation ───────────────────────────────────

export function calcXPProfile(entries: LiftEntry[], config?: XPConfig): XPProfile {
  const sessions = groupByDay(entries);
  const T1_LIFTS = ['bench', 'squat', 'deadlift', 'ohp'];
  const allPRs = new Set<string>();
  for (const lift of T1_LIFTS) {
    for (const date of findPRs(entries, lift)) allPRs.add(date);
  }

  // Program-aware streak: gap tolerance based on training frequency
  const trainingDays = config?.trainingDaysPerWeek ?? 6;
  const expectedGap = Math.ceil(7 / trainingDays); // 6d→2, 5d→2, 4d→2, 3d→3

  // Build a running streak counter with program-aware gap tolerance
  const streakByDate = new Map<string, number>();
  if (sessions.length > 0) {
    let streak = 1;
    streakByDate.set(sessions[0].date, streak);
    for (let i = 1; i < sessions.length; i++) {
      const prev = new Date(sessions[i - 1].date + 'T00:00:00');
      const curr = new Date(sessions[i].date + 'T00:00:00');
      const gap = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (gap <= expectedGap) { streak++; } else { streak = 1; }
      streakByDate.set(sessions[i].date, streak);
    }
  }

  // Streak XP: min((streak - 1) × 5, 50)
  function calcStreakXP(streak: number): number {
    if (streak <= 1) return 0;
    return Math.min((streak - 1) * 5, 50);
  }

  const sessionXPs: SessionXP[] = sessions.map((s) => {
    // Anti-abuse: minimum tonnage threshold
    if (s.tonnage < MIN_SESSION_TONNAGE) {
      return { date: s.date, tonnageXP: 0, amrapXP: 0, prXP: 0, streakXP: 0, total: 0 };
    }

    // Tonnage XP (intensity-weighted)
    const tonnageXP = Math.round(weightedTonnage(s.lifts) / 100);

    // AMRAP surplus XP (capped at MAX_AMRAP_SURPLUS per set)
    let amrapXP = 0;
    for (const l of s.lifts) {
      if (l.set_type === 't1_amrap' && l.notes) {
        const match = l.notes.match(/programmed\s+(\d+)\+/);
        if (match) {
          const surplus = l.reps - parseInt(match[1]);
          if (surplus > 0) amrapXP += Math.min(surplus, MAX_AMRAP_SURPLUS) * 10;
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

/**
 * Per-lift skill progression system for IronLogs.
 *
 * Runescape-style: every session gives XP to individual lifts,
 * progress bars always move even during strength plateaus.
 *
 * Skill XP = lift tonnage / 50 (per session)
 * Level curve: same exponential as overall (80 × level^1.5)
 */

import type { LiftEntry } from '@ironlogs/core';
import { groupByDay } from '@ironlogs/analytics';

// ─── Types ─────────────────────────────────────────────────

export interface LiftSkill {
  lift: string;
  label: string;
  totalXP: number;
  level: number;
  xpInCurrentLevel: number;
  xpForNextLevel: number;
  progressPct: number;
}

export interface SkillProfile {
  skills: LiftSkill[];
}

// ─── Lift Labels ───────────────────────────────────────────

const LIFT_LABELS: Record<string, string> = {
  bench: 'Bench',
  squat: 'Squat',
  deadlift: 'Deadlift',
  ohp: 'OHP',
  incline_bench: 'Incline Bench',
  cgbench: 'Close-Grip Bench',
  front_squat: 'Front Squat',
  sumo_deadlift: 'Sumo Deadlift',
};

// ─── Skill Level Curve ─────────────────────────────────────

/** Same curve as overall XP but at lift scale. */
function skillXPRequired(level: number): number {
  return Math.round(80 * Math.pow(level, 1.5));
}

function levelFromXP(totalXP: number): { level: number; xpInLevel: number; xpForNext: number } {
  let level = 1;
  let xpUsed = 0;
  while (true) {
    const req = skillXPRequired(level);
    if (xpUsed + req > totalXP) {
      return { level, xpInLevel: totalXP - xpUsed, xpForNext: req };
    }
    xpUsed += req;
    level++;
  }
}

// ─── Main Calculation ──────────────────────────────────────

/** Primary T1/T2 lifts that get tracked as skills. */
const TRACKED_LIFTS = ['bench', 'squat', 'deadlift', 'ohp'];

export function calcSkillProfile(entries: LiftEntry[]): SkillProfile {
  const sessions = groupByDay(entries);

  // Accumulate tonnage-based XP per lift across all sessions
  const liftXP = new Map<string, number>();
  for (const s of sessions) {
    for (const [lift, tonnage] of Object.entries(s.liftTonnage)) {
      // Only track primary lifts as skills
      if (!TRACKED_LIFTS.includes(lift)) continue;
      liftXP.set(lift, (liftXP.get(lift) || 0) + Math.round(tonnage / 50));
    }
  }

  const skills: LiftSkill[] = TRACKED_LIFTS.map((lift) => {
    const totalXP = liftXP.get(lift) || 0;
    const { level, xpInLevel, xpForNext } = levelFromXP(totalXP);
    return {
      lift,
      label: LIFT_LABELS[lift] || lift,
      totalXP,
      level,
      xpInCurrentLevel: xpInLevel,
      xpForNextLevel: xpForNext,
      progressPct: xpForNext > 0 ? Math.round((xpInLevel / xpForNext) * 100) : 0,
    };
  });

  return { skills };
}

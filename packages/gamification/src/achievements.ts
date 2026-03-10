import type { LiftEntry } from '@ironlogs/core';
import { calcLiftScore, estimate1RM } from '@ironlogs/analytics';
import { getBestRecentSets, getLatestBodyweight, groupByDay } from '@ironlogs/analytics';
import { normalizeLiftName } from '@ironlogs/csv-parser';
import { getRank, RANKS } from './ranks.js';

export type AchievementCategory = 'strength' | 'consistency' | 'endurance' | 'program' | 'legendary' | 'secret';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  secret?: boolean;
  check: (entries: LiftEntry[]) => boolean;
}

/**
 * Best estimated 1RM across ALL sets (not just progression sets).
 * Achievements should be earnable from any set type — a 95kg x 10 bench
 * counts whether it's t1, t2, testing, or accessory.
 */
function best1RM(entries: LiftEntry[], lift: string): number {
  let best = 0;
  for (const e of entries) {
    if (normalizeLiftName(e.lift) !== lift) continue;
    const est = estimate1RM(e.weight, e.reps);
    if (est > best) best = est;
  }
  return best;
}


function sessionCount(entries: LiftEntry[]): number {
  return groupByDay(entries).length;
}

function maxStreak(entries: LiftEntry[]): number {
  const sessions = groupByDay(entries);
  const dateSet = new Set(sessions.map((s) => s.date));
  const sorted = Array.from(dateSet).sort();
  let max = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) { cur++; max = Math.max(max, cur); }
    else { cur = 1; }
  }
  return sorted.length > 0 ? max : 0;
}

function totalTonnage(entries: LiftEntry[]): number {
  return groupByDay(entries).reduce((sum, s) => sum + s.tonnage, 0);
}

function totalReps(entries: LiftEntry[]): number {
  return entries.reduce((sum, e) => sum + e.reps, 0);
}

function amrapSurplusTotal(entries: LiftEntry[]): number {
  let total = 0;
  for (const e of entries) {
    if (e.set_type === 't1_amrap' && e.notes) {
      const match = e.notes.match(/programmed\s+(\d+)\+/);
      if (match) {
        const surplus = e.reps - parseInt(match[1]);
        if (surplus > 0) total += surplus;
      }
    }
  }
  return total;
}

function bestAmrapSurplus(entries: LiftEntry[]): number {
  let best = 0;
  for (const e of entries) {
    if (e.set_type === 't1_amrap' && e.notes) {
      const match = e.notes.match(/programmed\s+(\d+)\+/);
      if (match) {
        const surplus = e.reps - parseInt(match[1]);
        if (surplus > best) best = surplus;
      }
    }
  }
  return best;
}

function weeklySessionCount(entries: LiftEntry[]): number {
  const sessions = groupByDay(entries);
  if (sessions.length < 2) return 0;
  const weeks = new Map<string, number>();
  for (const s of sessions) {
    const d = new Date(s.date + 'T00:00:00');
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    weeks.set(key, (weeks.get(key) || 0) + 1);
  }
  let fullWeeks = 0;
  for (const count of weeks.values()) {
    if (count >= 6) fullWeeks++;
  }
  return fullWeeks;
}

function avgSleep(entries: LiftEntry[]): number {
  const sleepEntries = entries.filter((e) => e.sleep > 0);
  if (sleepEntries.length === 0) return 0;
  const dates = new Map<string, number>();
  for (const e of sleepEntries) dates.set(e.date, e.sleep);
  const values = Array.from(dates.values());
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function hasSessionWithSleep(entries: LiftEntry[], minHours: number): boolean {
  return entries.some((e) => e.sleep >= minHours);
}

function hasSessionWithLowSleep(entries: LiftEntry[], maxHours: number): boolean {
  const sessions = groupByDay(entries);
  return sessions.some((s) => s.sleep > 0 && s.sleep <= maxHours);
}

function comebackAfterBreak(entries: LiftEntry[], breakDays: number): boolean {
  const sessions = groupByDay(entries);
  const sorted = sessions.map((s) => s.date).sort();
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff >= breakDays) return true;
  }
  return false;
}

export const ACHIEVEMENTS: Achievement[] = [
  // ═══ STRENGTH: Bench ═══
  { id: 'bench_first_flight', title: 'First Flight', description: 'Bench 1RM ≥ 60kg', category: 'strength', check: (e) => best1RM(e, 'bench') >= 60 },
  { id: 'bench_double_iron', title: 'Double Iron', description: 'Bench 1RM ≥ 80kg', category: 'strength', check: (e) => best1RM(e, 'bench') >= 80 },
  { id: 'bench_bar_bender', title: 'Bar Bender', description: 'Bench 1RM ≥ 100kg', category: 'strength', check: (e) => best1RM(e, 'bench') >= 100 },
  { id: 'bench_barbarian', title: 'Bench Barbarian', description: 'Bench 1RM ≥ 120kg', category: 'strength', check: (e) => best1RM(e, 'bench') >= 120 },
  { id: 'bench_chest_of_steel', title: 'Chest of Steel', description: 'Bench 1RM ≥ 140kg', category: 'strength', check: (e) => best1RM(e, 'bench') >= 140 },

  // ═══ STRENGTH: Squat ═══
  { id: 'squat_first_descent', title: 'First Descent', description: 'Squat 1RM ≥ 60kg', category: 'strength', check: (e) => best1RM(e, 'squat') >= 60 },
  { id: 'squat_gatekeeper', title: 'Gatekeeper', description: 'Squat 1RM ≥ 100kg', category: 'strength', check: (e) => best1RM(e, 'squat') >= 100 },
  { id: 'squat_atlas_rising', title: 'Atlas Rising', description: 'Squat 1RM ≥ 120kg', category: 'strength', check: (e) => best1RM(e, 'squat') >= 120 },
  { id: 'squat_titan_of_depth', title: 'Titan of Depth', description: 'Squat 1RM ≥ 140kg', category: 'strength', check: (e) => best1RM(e, 'squat') >= 140 },
  { id: 'squat_mountain_mover', title: 'Mountain Mover', description: 'Squat 1RM ≥ 160kg', category: 'strength', check: (e) => best1RM(e, 'squat') >= 160 },
  { id: 'squat_quadzilla', title: 'Quadzilla', description: 'Squat 1RM ≥ 180kg', category: 'strength', check: (e) => best1RM(e, 'squat') >= 180 },
  { id: 'squat_barbell_throne', title: 'Barbell Throne', description: 'Squat 1RM ≥ 200kg', category: 'strength', check: (e) => best1RM(e, 'squat') >= 200 },

  // ═══ STRENGTH: Deadlift ═══
  { id: 'deadlift_breaking_gravity', title: 'Breaking Gravity', description: 'Deadlift 1RM ≥ 60kg', category: 'strength', check: (e) => best1RM(e, 'deadlift') >= 60 },
  { id: 'deadlift_iron_spine', title: 'Iron Spine', description: 'Deadlift 1RM ≥ 100kg', category: 'strength', check: (e) => best1RM(e, 'deadlift') >= 100 },
  { id: 'deadlift_earth_mover', title: 'Earth Mover', description: 'Deadlift 1RM ≥ 140kg', category: 'strength', check: (e) => best1RM(e, 'deadlift') >= 140 },
  { id: 'deadlift_tectonic_shift', title: 'Tectonic Shift', description: 'Deadlift 1RM ≥ 180kg', category: 'strength', check: (e) => best1RM(e, 'deadlift') >= 180 },
  { id: 'deadlift_planet_puller', title: 'Planet Puller', description: 'Deadlift 1RM ≥ 220kg', category: 'strength', check: (e) => best1RM(e, 'deadlift') >= 220 },
  { id: 'deadlift_gravity_denied', title: 'Gravity Denied', description: 'Deadlift 1RM ≥ 260kg', category: 'strength', check: (e) => best1RM(e, 'deadlift') >= 260 },

  // ═══ STRENGTH: OHP ═══
  { id: 'ohp_skyward', title: 'Skyward', description: 'OHP 1RM ≥ 40kg', category: 'strength', check: (e) => best1RM(e, 'ohp') >= 40 },
  { id: 'ohp_sky_breaker', title: 'Sky Breaker', description: 'OHP 1RM ≥ 60kg', category: 'strength', check: (e) => best1RM(e, 'ohp') >= 60 },
  { id: 'ohp_thunderbolt', title: 'Thunderbolt', description: 'OHP 1RM ≥ 70kg', category: 'strength', check: (e) => best1RM(e, 'ohp') >= 70 },
  { id: 'ohp_stormcaller', title: 'Stormcaller', description: 'OHP 1RM ≥ 80kg', category: 'strength', check: (e) => best1RM(e, 'ohp') >= 80 },
  { id: 'ohp_olympian', title: 'Olympian', description: 'OHP ≥ bodyweight', category: 'strength',
    check: (e) => { const bw = getLatestBodyweight(e); return bw > 0 && best1RM(e, 'ohp') >= bw; } },
  { id: 'ohp_shoulder_forge', title: 'Shoulder Forge', description: 'OHP 1RM ≥ 100kg', category: 'strength', check: (e) => best1RM(e, 'ohp') >= 100 },

  // ═══ STRENGTH: Totals ═══
  { id: 'total_triple_crown', title: 'Triple Crown', description: 'SBD total ≥ 3× bodyweight', category: 'strength',
    check: (e) => { const bw = getLatestBodyweight(e); const t = best1RM(e, 'squat') + best1RM(e, 'bench') + best1RM(e, 'deadlift'); return bw > 0 && t >= 3 * bw; } },
  { id: 'total_iron_trinity', title: 'Iron Trinity', description: 'SBD total ≥ 300kg', category: 'strength',
    check: (e) => (best1RM(e, 'squat') + best1RM(e, 'bench') + best1RM(e, 'deadlift')) >= 300 },
  { id: 'total_the_thousand', title: 'The Thousand', description: 'SBD total ≥ 453.6kg (1000lb)', category: 'strength',
    check: (e) => (best1RM(e, 'squat') + best1RM(e, 'bench') + best1RM(e, 'deadlift')) >= 453.6 },
  { id: 'total_fifteen_hundred', title: 'The Fifteen Hundred', description: 'SBD total ≥ 680kg (1500lb)', category: 'strength',
    check: (e) => (best1RM(e, 'squat') + best1RM(e, 'bench') + best1RM(e, 'deadlift')) >= 680 },
  { id: 'total_iron_standard', title: 'The Iron Standard', description: 'SBD total ≥ 4× bodyweight', category: 'strength',
    check: (e) => { const bw = getLatestBodyweight(e); const t = best1RM(e, 'squat') + best1RM(e, 'bench') + best1RM(e, 'deadlift'); return bw > 0 && t >= 4 * bw; } },
  { id: 'total_competitive_ready', title: 'Competitive Ready', description: 'SBD total ≥ 5× bodyweight', category: 'strength',
    check: (e) => { const bw = getLatestBodyweight(e); const t = best1RM(e, 'squat') + best1RM(e, 'bench') + best1RM(e, 'deadlift'); return bw > 0 && t >= 5 * bw; } },

  // ═══ STRENGTH: Rank ═══
  ...RANKS.filter((r) => r.minScore > 0).map((r) => ({
    id: `rank_${r.name.toLowerCase().replace(/\s+/g, '_')}`,
    title: `Rank: ${r.name}`,
    description: `Reach ${r.name} rank (score ≥ ${r.minScore})`,
    category: 'strength' as AchievementCategory,
    check: (e: LiftEntry[]) => getRank(e).minScore >= r.minScore,
  })),

  // ═══ CONSISTENCY: Sessions ═══
  { id: 'con_day_one', title: 'Day One', description: 'Log your first session', category: 'consistency', check: (e) => sessionCount(e) >= 1 },
  { id: 'con_getting_serious', title: 'Getting Serious', description: 'Log 10 sessions', category: 'consistency', check: (e) => sessionCount(e) >= 10 },
  { id: 'con_iron_habit', title: 'Iron Habit', description: 'Log 50 sessions', category: 'consistency', check: (e) => sessionCount(e) >= 50 },
  { id: 'con_centurion', title: 'Centurion', description: 'Log 100 sessions', category: 'consistency', check: (e) => sessionCount(e) >= 100 },
  { id: 'con_veteran', title: 'Veteran', description: 'Log 250 sessions', category: 'consistency', check: (e) => sessionCount(e) >= 250 },
  { id: 'con_iron_lifetime', title: 'Iron Lifetime', description: 'Log 500 sessions', category: 'consistency', check: (e) => sessionCount(e) >= 500 },

  // ═══ CONSISTENCY: Streaks ═══
  { id: 'con_on_fire', title: 'On Fire', description: '3-day training streak', category: 'consistency', check: (e) => maxStreak(e) >= 3 },
  { id: 'con_unstoppable', title: 'Unstoppable', description: '7-day training streak', category: 'consistency', check: (e) => maxStreak(e) >= 7 },
  { id: 'con_warpath', title: 'Warpath', description: '14-day training streak', category: 'consistency', check: (e) => maxStreak(e) >= 14 },

  // ═══ ENDURANCE: Volume ═══
  { id: 'end_volume_rookie', title: 'Volume Rookie', description: 'Lift 100 tons total', category: 'endurance', check: (e) => totalTonnage(e) >= 100000 },
  { id: 'end_volume_warrior', title: 'Volume Warrior', description: 'Lift 500 tons total', category: 'endurance', check: (e) => totalTonnage(e) >= 500000 },
  { id: 'end_iron_mountain', title: 'Iron Mountain', description: 'Lift 1,000 tons total', category: 'endurance', check: (e) => totalTonnage(e) >= 1000000 },
  { id: 'end_volume_titan', title: 'Volume Titan', description: 'Lift 5,000 tons total', category: 'endurance', check: (e) => totalTonnage(e) >= 5000000 },

  // ═══ ENDURANCE: Reps ═══
  { id: 'end_rep_counter', title: 'Rep Counter', description: 'Complete 1,000 total reps', category: 'endurance', check: (e) => totalReps(e) >= 1000 },
  { id: 'end_rep_machine', title: 'Rep Machine', description: 'Complete 5,000 total reps', category: 'endurance', check: (e) => totalReps(e) >= 5000 },
  { id: 'end_rep_god', title: 'Rep God', description: 'Complete 10,000 total reps', category: 'endurance', check: (e) => totalReps(e) >= 10000 },

  // ═══ PROGRAM MASTERY: AMRAP ═══
  { id: 'prog_amrap_slayer', title: 'AMRAP Slayer', description: 'Beat AMRAP target by +3 on any set', category: 'program', check: (e) => bestAmrapSurplus(e) >= 3 },
  { id: 'prog_overachiever', title: 'Overachiever', description: 'Beat AMRAP target by +5 on any set', category: 'program', check: (e) => bestAmrapSurplus(e) >= 5 },
  { id: 'prog_rep_annihilator', title: 'Rep Annihilator', description: 'Beat AMRAP target by +8 on any set', category: 'program', check: (e) => bestAmrapSurplus(e) >= 8 },

  // ═══ PROGRAM MASTERY: Volume ═══
  { id: 'prog_volume_monster', title: 'Volume Monster', description: 'Accumulate 50 total AMRAP surplus reps', category: 'program', check: (e) => amrapSurplusTotal(e) >= 50 },
  { id: 'prog_pain_train', title: 'Pain Train', description: 'Complete 6 sessions in one week', category: 'program', check: (e) => weeklySessionCount(e) >= 1 },
  { id: 'prog_program_devotee', title: 'Program Devotee', description: 'Complete 6-day weeks 4 times', category: 'program', check: (e) => weeklySessionCount(e) >= 4 },

  // ═══ PROGRAM MASTERY: Progression ═══
  { id: 'prog_pr_hunter', title: 'PR Hunter', description: 'Set 5 personal records', category: 'program',
    check: (e) => {
      const sessions = groupByDay(e);
      const seen = new Map<string, number>();
      let prCount = 0;
      for (const s of sessions) {
        for (const l of s.lifts) {
          if (l.set_type !== 't1_amrap' && l.set_type !== 'testing') continue;
          const key = l.lift.toLowerCase().replace(/\s+/g, '_');
          const prev = seen.get(key) || 0;
          const w = l.weight * l.reps;
          if (w > prev) { prCount++; seen.set(key, w); }
        }
      }
      return prCount >= 5;
    } },
  { id: 'prog_record_breaker', title: 'Record Breaker', description: 'Set 20 personal records', category: 'program',
    check: (e) => {
      const sessions = groupByDay(e);
      const seen = new Map<string, number>();
      let prCount = 0;
      for (const s of sessions) {
        for (const l of s.lifts) {
          if (l.set_type !== 't1_amrap' && l.set_type !== 'testing') continue;
          const key = l.lift.toLowerCase().replace(/\s+/g, '_');
          const prev = seen.get(key) || 0;
          const w = l.weight * l.reps;
          if (w > prev) { prCount++; seen.set(key, w); }
        }
      }
      return prCount >= 20;
    } },

  // ═══ LEGENDARY ═══
  { id: 'leg_well_rested', title: 'Well Rested', description: 'Log a session with 8+ hours sleep', category: 'legendary', check: (e) => hasSessionWithSleep(e, 8) },
  { id: 'leg_recovery_master', title: 'Recovery Master', description: 'Average 7.5+ hours sleep across all sessions', category: 'legendary', check: (e) => avgSleep(e) >= 7.5 },
  { id: 'leg_tonnage_king', title: 'Tonnage King', description: 'Hit 20+ tons in a single session', category: 'legendary',
    check: (e) => groupByDay(e).some((s) => s.tonnage >= 20000) },
  { id: 'leg_all_fours', title: 'All Fours', description: 'Score 75+ on all 4 main lifts', category: 'legendary',
    check: (e) => {
      const bw = getLatestBodyweight(e);
      const best = getBestRecentSets(e);
      return ['squat', 'bench', 'deadlift', 'ohp'].every((l) => best[l] && calcLiftScore(l, best[l].estimated1RM, bw).score >= 75);
    } },

  // ═══ SECRET ═══
  { id: 'sec_zombie_mode', title: 'Zombie Mode', description: 'Train on less than 5 hours of sleep', category: 'secret', secret: true,
    check: (e) => hasSessionWithLowSleep(e, 5) },
  { id: 'sec_iron_comeback', title: 'Iron Comeback', description: 'Return after 14+ day break', category: 'secret', secret: true,
    check: (e) => comebackAfterBreak(e, 14) },
  { id: 'sec_deload_prophet', title: 'The Deload Prophet', description: 'Take a 7+ day break and PR within 3 sessions of return', category: 'secret', secret: true,
    check: (e) => {
      const sessions = groupByDay(e);
      const sorted = sessions.map((s) => s.date).sort();
      const T1 = ['bench', 'squat', 'deadlift', 'ohp'];
      const allPRs = new Set<string>();
      const seen = new Map<string, number>();
      for (const s of sessions) {
        for (const l of s.lifts) {
          if (l.set_type !== 't1_amrap' && l.set_type !== 'testing') continue;
          const key = l.lift.toLowerCase().replace(/\s+/g, '_');
          if (!T1.includes(key)) continue;
          const prev = seen.get(key) || 0;
          const w = l.weight * l.reps;
          if (w > prev) { allPRs.add(s.date); seen.set(key, w); }
        }
      }
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1]);
        const curr = new Date(sorted[i]);
        const gap = Math.round((curr.getTime() - prev.getTime()) / 86400000);
        if (gap >= 7) {
          const returnIdx = i;
          for (let j = returnIdx; j < Math.min(returnIdx + 3, sorted.length); j++) {
            if (allPRs.has(sorted[j])) return true;
          }
        }
      }
      return false;
    } },
  { id: 'sec_midnight_iron', title: 'Midnight Iron', description: 'Log a session (it\'s always iron o\'clock)', category: 'secret', secret: true,
    check: (e) => sessionCount(e) >= 1 },
];

export const CATEGORY_INFO: Record<AchievementCategory, { label: string; color: string }> = {
  strength: { label: 'Strength', color: '#f44336' },
  consistency: { label: 'Consistency', color: '#4caf50' },
  endurance: { label: 'Endurance', color: '#ff9800' },
  program: { label: 'Program Mastery', color: '#7986cb' },
  legendary: { label: 'Legendary', color: '#ffd54f' },
  secret: { label: 'Secret', color: '#9c27b0' },
};

export function checkAchievements(entries: LiftEntry[]): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.check(entries));
}

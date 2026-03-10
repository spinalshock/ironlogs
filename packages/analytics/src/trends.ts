import type { LiftEntry } from '@ironlogs/core';
import { normalizeLiftName } from '@ironlogs/csv-parser';
import { estimate1RM } from './e1rm.js';
import { groupByDay, getSleepProgression } from './volume.js';
import { get1RMProgression, getBestRecentSets } from './pr.js';

// ─── Helpers ────────────────────────────────────────────────

function dateDiffDays(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const T1_LIFTS = ['bench', 'squat', 'deadlift', 'ohp'];

// ─── Relative Intensity ─────────────────────────────────

export interface IntensityBucket { label: string; range: [number, number]; count: number; pct: number; }
export interface SessionIntensity { date: string; avgIntensity: number; sets: number; }

function getRunningBest(entries: LiftEntry[]): Map<string, Map<string, number>> {
  const sessions = groupByDay(entries);
  const running = new Map<string, number>();
  const result = new Map<string, Map<string, number>>();
  for (const s of sessions) {
    for (const e of s.lifts) {
      const lift = normalizeLiftName(e.lift);
      const est = estimate1RM(e.weight, e.reps);
      if (!running.has(lift) || est > running.get(lift)!) running.set(lift, est);
    }
    result.set(s.date, new Map(running));
  }
  return result;
}

/**
 * Calculate per-session average relative intensity over time.
 *
 * Relative intensity = weight / running best e1RM for that lift on that date.
 * Uses a running best (not all-time best) so early sessions aren't penalized.
 *
 * @param entries - All lift entries
 * @returns Sessions with average relative intensity (0-1 scale) and set count
 */
export function getSessionIntensities(entries: LiftEntry[]): SessionIntensity[] {
  const runningBest = getRunningBest(entries);
  const sessions = groupByDay(entries);
  return sessions.map((s) => {
    const best = runningBest.get(s.date);
    if (!best) return null;
    let totalRI = 0, count = 0;
    for (const e of s.lifts) {
      const e1rm = best.get(normalizeLiftName(e.lift));
      if (e1rm && e1rm > 0) { totalRI += e.weight / e1rm; count++; }
    }
    return count > 0 ? { date: s.date, avgIntensity: Math.round((totalRI / count) * 1000) / 1000, sets: count } : null;
  }).filter((s): s is SessionIntensity => s !== null);
}

export function getIntensityDistribution(entries: LiftEntry[]): IntensityBucket[] {
  const runningBest = getRunningBest(entries);
  const sessions = groupByDay(entries);
  const buckets: IntensityBucket[] = [
    { label: '<60%', range: [0, 0.6], count: 0, pct: 0 },
    { label: '60-70%', range: [0.6, 0.7], count: 0, pct: 0 },
    { label: '70-80%', range: [0.7, 0.8], count: 0, pct: 0 },
    { label: '80-90%', range: [0.8, 0.9], count: 0, pct: 0 },
    { label: '90%+', range: [0.9, 2.0], count: 0, pct: 0 },
  ];
  let total = 0;
  for (const s of sessions) {
    const best = runningBest.get(s.date);
    if (!best) continue;
    for (const e of s.lifts) {
      const e1rm = best.get(normalizeLiftName(e.lift));
      if (!e1rm || e1rm <= 0) continue;
      const ri = e.weight / e1rm;
      for (const b of buckets) { if (ri >= b.range[0] && ri < b.range[1]) { b.count++; break; } }
      total++;
    }
  }
  if (total > 0) for (const b of buckets) b.pct = Math.round((b.count / total) * 1000) / 10;
  return buckets;
}

// ─── Stimulus Score ──────────────────────────────────────

export interface SessionStimulus { date: string; stimulus: number; tonnage: number; }

/**
 * Calculate per-session training stimulus score.
 *
 * Stimulus = sum of (reps x relative_intensity^2) across all sets. Squaring
 * the relative intensity weights heavier sets disproportionately, reflecting
 * their greater hypertrophic and neurological stimulus.
 *
 * @param entries - All lift entries
 * @returns Sessions with stimulus score and raw tonnage
 */
export function getSessionStimulus(entries: LiftEntry[]): SessionStimulus[] {
  const runningBest = getRunningBest(entries);
  const sessions = groupByDay(entries);
  return sessions.map((s) => {
    const best = runningBest.get(s.date);
    if (!best) return null;
    let stimulus = 0;
    for (const e of s.lifts) {
      const e1rm = best.get(normalizeLiftName(e.lift));
      if (e1rm && e1rm > 0) { const ri = e.weight / e1rm; stimulus += e.reps * ri * ri; }
    }
    return { date: s.date, stimulus: Math.round(stimulus * 10) / 10, tonnage: s.tonnage };
  }).filter((s): s is SessionStimulus => s !== null);
}

// ─── Strength Velocity ───────────────────────────────────

export interface StrengthVelocity { lift: string; velocity: number; trend: 'gaining' | 'plateau' | 'declining'; current1RM: number; prev1RM: number; }

/**
 * Calculate the rate of 1RM change for a lift in kg/month.
 *
 * Compares the latest estimated 1RM against the value from 28+ days ago (or the
 * earliest available). Velocity > 1 kg/month = gaining, < -1 = declining,
 * otherwise plateau.
 *
 * @param entries - All lift entries
 * @param lift - Lift name to analyze
 * @returns Velocity in kg/month with trend classification, or null if < 2 data points
 */
export function getStrengthVelocity(entries: LiftEntry[], lift: string): StrengthVelocity | null {
  const prog = get1RMProgression(entries, lift);
  if (prog.length < 2) return null;
  const latest = prog[prog.length - 1];
  const cutoff = daysAgo(28);
  const prevEntries = prog.filter((p) => p.date <= cutoff);
  const prev = prevEntries.length > 0 ? prevEntries[prevEntries.length - 1] : prog[0];
  const days = dateDiffDays(prev.date, latest.date);
  if (days <= 0) return null;
  const velocity = Math.round(((latest.estimated1RM - prev.estimated1RM) / days) * 30 * 10) / 10;
  let trend: StrengthVelocity['trend'];
  if (velocity > 1) trend = 'gaining'; else if (velocity < -1) trend = 'declining'; else trend = 'plateau';
  return { lift: normalizeLiftName(lift), velocity, trend, current1RM: latest.estimated1RM, prev1RM: prev.estimated1RM };
}

export function getAllStrengthVelocities(entries: LiftEntry[]): StrengthVelocity[] {
  return T1_LIFTS.map((l) => getStrengthVelocity(entries, l)).filter((v): v is StrengthVelocity => v !== null);
}

// ─── Plateau Detection ───────────────────────────────────

export interface PlateauInfo { lift: string; weeksSincePR: number; lastPRDate: string; isPlateaued: boolean; slope: number; }

/**
 * Detect plateaus across the four primary lifts (bench, squat, deadlift, OHP).
 *
 * A lift is considered plateaued when 4+ weeks have passed since the last PR
 * AND the linear regression slope of the last 28 days of 1RM data is < 0.1.
 * The slope is computed via ordinary least squares on the recent progression points.
 *
 * @param entries - All lift entries
 * @returns Plateau info per lift including weeks since PR and regression slope
 */
export function detectPlateaus(entries: LiftEntry[]): PlateauInfo[] {
  const results: PlateauInfo[] = [];
  for (const lift of T1_LIFTS) {
    const prog = get1RMProgression(entries, lift);
    if (prog.length < 3) continue;
    let maxSoFar = 0, lastPRDate = prog[0].date;
    for (const p of prog) { if (p.estimated1RM > maxSoFar) { maxSoFar = p.estimated1RM; lastPRDate = p.date; } }
    const weeksSincePR = Math.round(dateDiffDays(lastPRDate, todayStr()) / 7);
    const cutoff = daysAgo(28);
    const recent = prog.filter((p) => p.date >= cutoff);
    let slope = 0;
    if (recent.length >= 2) {
      const n = recent.length;
      const xs = recent.map((_, i) => i);
      const ys = recent.map((p) => p.estimated1RM);
      const xMean = xs.reduce((a, b) => a + b, 0) / n;
      const yMean = ys.reduce((a, b) => a + b, 0) / n;
      const num = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0);
      const den = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
      slope = den > 0 ? Math.round((num / den) * 100) / 100 : 0;
    }
    results.push({ lift, weeksSincePR, lastPRDate, isPlateaued: weeksSincePR >= 4 && slope < 0.1, slope });
  }
  return results;
}

// ─── AMRAP Trend Analysis ────────────────────────────────

export interface AmrapTrend { lift: string; rolling7: number; rolling21: number; trending: 'improving' | 'stable' | 'declining'; data: { date: string; surplus: number }[]; }

export function parseAmrapSurplus(entries: LiftEntry[]): { date: string; lift: string; surplus: number }[] {
  return entries
    .filter((e) => (e.set_type === 't1_amrap' || e.set_type === 'amrap') && e.notes)
    .map((e) => {
      const match = e.notes.match(/programmed\s+(\d+)\+/);
      if (!match) return null;
      return { date: e.date, lift: normalizeLiftName(e.lift), surplus: e.reps - parseInt(match[1]) };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getAmrapTrends(entries: LiftEntry[]): AmrapTrend[] {
  const surpluses = parseAmrapSurplus(entries);
  const results: AmrapTrend[] = [];
  for (const lift of T1_LIFTS) {
    const data = surpluses.filter((s) => s.lift === lift);
    if (data.length < 3) continue;
    const last7 = data.slice(-7);
    const last21 = data.slice(-21);
    const rolling7 = Math.round((last7.reduce((s, d) => s + d.surplus, 0) / last7.length) * 10) / 10;
    const rolling21 = Math.round((last21.reduce((s, d) => s + d.surplus, 0) / last21.length) * 10) / 10;
    let trending: AmrapTrend['trending'];
    if (rolling7 > rolling21 + 0.5) trending = 'improving'; else if (rolling7 < rolling21 - 0.5) trending = 'declining'; else trending = 'stable';
    results.push({ lift, rolling7, rolling21, trending, data: data.map((d) => ({ date: d.date, surplus: d.surplus })) });
  }
  return results;
}

// ─── Readiness Score ─────────────────────────────────────

export interface ReadinessScore { score: number; sleepComponent: number; fatigueComponent: number; amrapComponent: number; label: string; color: string; }

/**
 * Calculate a composite training readiness score (0-100).
 *
 * Weighted formula: 50% sleep + 30% fatigue + 20% AMRAP performance.
 * - Sleep: 7-day average normalized to 8h target (capped at 125%)
 * - Fatigue: ACWR-based, optimal at 0.8-1.3 (sweet spot = 100%)
 * - AMRAP: Recent surplus reps above programmed minimum, normalized 0-100%
 *
 * @param entries - All lift entries (must include sleep and AMRAP data for full accuracy)
 * @returns Readiness score with component breakdowns and label, or null if no sessions
 */
export function calcReadiness(entries: LiftEntry[]): ReadinessScore | null {
  const sleepData = getSleepProgression(entries);
  const recentSleep = sleepData.slice(-7);
  const sleepAvg = recentSleep.length > 0 ? recentSleep.reduce((s, d) => s + d.sleep, 0) / recentSleep.length : 0;
  const sleepComponent = sleepAvg > 0 ? Math.min(sleepAvg / 8, 1.25) : 0.5;

  const sessions = groupByDay(entries);
  if (sessions.length === 0) return null;

  const earliest = sessions[0].date;
  const today = new Date();
  const earliestDate = new Date(earliest + 'T00:00:00');
  const totalDays = Math.floor((today.getTime() - earliestDate.getTime()) / 86400000);

  let fatigueComponent = 0.7;
  if (totalDays >= 21) {
    const tonnageByDate = new Map<string, number>();
    for (const s of sessions) tonnageByDate.set(s.date, s.tonnage);
    const lambdaA = 0.25, lambdaC = 2 / 29;
    let acute = tonnageByDate.get(earliest) || 0;
    let chronic = acute;
    const d = new Date(earliestDate);
    d.setDate(d.getDate() + 1);
    while (d <= today) {
      const k = d.toISOString().slice(0, 10);
      const load = tonnageByDate.get(k) || 0;
      acute = load * lambdaA + (1 - lambdaA) * acute;
      chronic = load * lambdaC + (1 - lambdaC) * chronic;
      d.setDate(d.getDate() + 1);
    }
    if (chronic > 0) {
      const acwr = acute / chronic;
      if (acwr >= 0.8 && acwr <= 1.3) fatigueComponent = 1.0;
      else if (acwr < 0.8) fatigueComponent = Math.max(0.3, acwr / 0.8);
      else fatigueComponent = Math.max(0.2, 1.0 - (acwr - 1.3) * 2);
    }
  }

  const surpluses = parseAmrapSurplus(entries);
  const recent = surpluses.slice(-7);
  let amrapComponent = 0.5;
  if (recent.length >= 2) {
    const avgSurplus = recent.reduce((s, d) => s + d.surplus, 0) / recent.length;
    amrapComponent = Math.min(Math.max((avgSurplus + 2) / 8, 0), 1);
  }

  const raw = 0.5 * sleepComponent + 0.3 * fatigueComponent + 0.2 * amrapComponent;
  const score = Math.round(Math.min(raw * 100, 100));
  let label: string, color: string;
  if (score >= 80) { label = 'Fresh'; color = '#66bb6a'; }
  else if (score >= 60) { label = 'Good'; color = '#81c784'; }
  else if (score >= 40) { label = 'Moderate'; color = '#ffa726'; }
  else { label = 'Fatigued'; color = '#ef5350'; }

  return { score, sleepComponent: Math.round(sleepComponent * 100), fatigueComponent: Math.round(fatigueComponent * 100), amrapComponent: Math.round(amrapComponent * 100), label, color };
}

// ─── Strength Balance Ratios ─────────────────────────────

export interface StrengthRatio { name: string; numerator: string; denominator: string; actual: number; target: number; status: 'balanced' | 'lagging' | 'dominant'; deviation: number; }

/**
 * Evaluate key strength balance ratios against ideal targets.
 *
 * Compares actual e1RM ratios to established ideals:
 * - Deadlift/Squat target: 1.2
 * - Bench/Squat target: 0.7
 * - OHP/Bench target: 0.65
 *
 * Deviation within +/-10% is "balanced"; below is "lagging"; above is "dominant".
 *
 * @param entries - All lift entries
 * @returns Ratio analysis per pair, only for lifts with available data
 */
export function getStrengthRatios(entries: LiftEntry[]): StrengthRatio[] {
  const best = getBestRecentSets(entries);
  const ratios = [
    { name: 'Deadlift / Squat', num: 'deadlift', den: 'squat', target: 1.2 },
    { name: 'Bench / Squat', num: 'bench', den: 'squat', target: 0.7 },
    { name: 'OHP / Bench', num: 'ohp', den: 'bench', target: 0.65 },
  ];
  return ratios
    .filter((r) => best[r.num] && best[r.den])
    .map((r) => {
      const actual = Math.round((best[r.num].estimated1RM / best[r.den].estimated1RM) * 100) / 100;
      const deviation = Math.round(((actual - r.target) / r.target) * 100);
      let status: StrengthRatio['status'];
      if (Math.abs(deviation) <= 10) status = 'balanced'; else if (deviation < -10) status = 'lagging'; else status = 'dominant';
      return { name: r.name, numerator: r.num, denominator: r.den, actual, target: r.target, status, deviation };
    });
}

// ─── Weekly Muscle Volume ────────────────────────────────

const MUSCLE_INVOLVEMENT: Record<string, Record<string, number>> = {
  squat: { quads: 8, glutes: 9, hamstrings: 6, spinalErectors: 6, abdominals: 6, calves: 2, hipAdductors: 6 },
  front_squat: { quads: 10, glutes: 7, hamstrings: 4, abdominals: 8, spinalErectors: 4, calves: 2 },
  deadlift: { spinalErectors: 10, hamstrings: 7, glutes: 7, quads: 6, upperTraps: 8, forearms: 4 },
  sumo_deadlift: { glutes: 8, hamstrings: 8, quads: 8, spinalErectors: 6, upperTraps: 8, hipAdductors: 6 },
  bench: { lowerChest: 10, upperChest: 8, triceps: 8, frontDelts: 6, lats: 4 },
  incline_bench: { upperChest: 10, lowerChest: 8, triceps: 8, frontDelts: 6, lats: 4 },
  cgbench: { triceps: 10, lowerChest: 8, upperChest: 6, frontDelts: 4 },
  ohp: { frontDelts: 10, sideDelts: 6, triceps: 8, upperChest: 4, upperTraps: 4 },
  face_pulls: { rearDelts: 8, rotatorCuff: 6, middleTraps: 6 },
  seated_row: { lats: 8, rearDelts: 6, biceps: 6, middleTraps: 6 },
  chinup: { lats: 10, biceps: 8, forearms: 4, abdominals: 8 },
  pendlay_row: { lats: 10, rearDelts: 8, biceps: 6, spinalErectors: 5 },
};

export interface WeeklyMuscleVolume { muscle: string; volume: number; label: string; }

const MUSCLE_LABELS: Record<string, string> = {
  quads: 'Quads', glutes: 'Glutes', hamstrings: 'Hamstrings',
  spinalErectors: 'Spinal Erectors', abdominals: 'Abs', calves: 'Calves',
  hipAdductors: 'Hip Adductors', lowerChest: 'Lower Chest', upperChest: 'Upper Chest',
  triceps: 'Triceps', frontDelts: 'Front Delts', sideDelts: 'Side Delts',
  rearDelts: 'Rear Delts', lats: 'Lats', biceps: 'Biceps',
  forearms: 'Forearms', upperTraps: 'Upper Traps', middleTraps: 'Middle Traps',
  rotatorCuff: 'Rotator Cuff',
};

export function getWeeklyMuscleVolume(entries: LiftEntry[]): WeeklyMuscleVolume[] {
  const cutoff = daysAgo(7);
  const recent = entries.filter((e) => e.date >= cutoff);
  const volumes: Record<string, number> = {};
  for (const e of recent) {
    const lift = normalizeLiftName(e.lift);
    const involvement = MUSCLE_INVOLVEMENT[lift];
    if (!involvement) continue;
    const setVolume = e.weight * e.reps;
    for (const [muscle, factor] of Object.entries(involvement)) {
      volumes[muscle] = (volumes[muscle] || 0) + setVolume * (factor / 10);
    }
  }
  return Object.entries(volumes)
    .map(([muscle, volume]) => ({ muscle, volume: Math.round(volume), label: MUSCLE_LABELS[muscle] || muscle }))
    .sort((a, b) => b.volume - a.volume);
}

// ─── PR Prediction ──────────────────────────────────────

export interface PRPrediction { lift: string; current1RM: number; projected1RM: number; daysOut: number; velocity: number; }

export function predictNextPR(entries: LiftEntry[], lift: string, daysOut: number = 30): PRPrediction | null {
  const vel = getStrengthVelocity(entries, lift);
  if (!vel || vel.trend === 'declining') return null;
  const projected = Math.round((vel.current1RM + (vel.velocity / 30) * daysOut) * 10) / 10;
  return { lift: normalizeLiftName(lift), current1RM: vel.current1RM, projected1RM: projected, daysOut, velocity: vel.velocity };
}

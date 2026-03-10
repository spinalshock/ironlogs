import type { LiftEntry } from '@ironlogs/core';
import { normalizeLiftName } from '@ironlogs/csv-parser';
import { groupByDay } from './volume.js';

export interface FatigueData {
  acwr: number;
  acuteEWMA: number;
  chronicEWMA: number;
  status: 'detraining' | 'fresh' | 'moderate' | 'high';
  label: string;
  color: string;
}

export interface LiftFatigue extends FatigueData {
  lift: string;
}

function ewmaFatigue(
  tonnageByDate: Map<string, number>,
  earliestDate: Date,
  today: Date,
): { acute: number; chronic: number } | null {
  const totalDays = Math.floor((today.getTime() - earliestDate.getTime()) / 86400000);
  if (totalDays < 21) return null;

  const lambdaA = 2 / (7 + 1);
  const lambdaC = 2 / (28 + 1);
  const earliest = earliestDate.toISOString().slice(0, 10);
  const firstLoad = tonnageByDate.get(earliest) || 0;
  let acute = firstLoad;
  let chronic = firstLoad;

  const d = new Date(earliestDate);
  d.setDate(d.getDate() + 1);
  while (d <= today) {
    const k = d.toISOString().slice(0, 10);
    const load = tonnageByDate.get(k) || 0;
    acute = load * lambdaA + (1 - lambdaA) * acute;
    chronic = load * lambdaC + (1 - lambdaC) * chronic;
    d.setDate(d.getDate() + 1);
  }

  return chronic > 0 ? { acute, chronic } : null;
}

function classifyACWR(acwr: number): { status: FatigueData['status']; label: string; color: string } {
  if (acwr < 0.8) return { status: 'detraining', label: 'Detraining', color: '#42a5f5' };
  if (acwr <= 1.3) return { status: 'fresh', label: 'Sweet Spot', color: '#66bb6a' };
  if (acwr <= 1.5) return { status: 'moderate', label: 'Moderate', color: '#ffa726' };
  return { status: 'high', label: 'High', color: '#ef5350' };
}

/**
 * Calculate overall training fatigue using the EWMA-based Acute:Chronic
 * Workload Ratio (ACWR).
 *
 * Uses exponentially weighted moving averages with a 7-day acute window and
 * 28-day chronic window, as described in Williams et al. (2016). Requires at
 * least 21 days of data for meaningful chronic load estimation.
 *
 * ACWR zones: <0.8 detraining, 0.8-1.3 sweet spot, 1.3-1.5 moderate, >1.5 high.
 *
 * @param entries - All lift entries
 * @returns Fatigue data with ACWR, EWMA values, and status classification, or null if insufficient data
 */
export function calcFatigue(entries: LiftEntry[]): FatigueData | null {
  const sessions = groupByDay(entries);
  if (sessions.length === 0) return null;

  const tonnageByDate = new Map<string, number>();
  for (const s of sessions) tonnageByDate.set(s.date, s.tonnage);

  const earliestDate = new Date(sessions[0].date + 'T00:00:00');
  const result = ewmaFatigue(tonnageByDate, earliestDate, new Date());
  if (!result) return null;

  const acwr = Math.round((result.acute / result.chronic) * 100) / 100;
  return { acwr, acuteEWMA: result.acute, chronicEWMA: result.chronic, ...classifyACWR(acwr) };
}

/**
 * Calculate EWMA-based ACWR fatigue for a specific lift and its variants.
 *
 * Groups related lifts together (e.g., bench includes incline_bench and cgbench;
 * squat includes front_squat; deadlift includes sumo_deadlift) so that fatigue
 * reflects the full stimulus on that movement pattern.
 *
 * @param entries - All lift entries
 * @param lift - Primary lift name (will be normalized and expanded to variants)
 * @returns Per-lift fatigue data with ACWR and classification, or null if insufficient data
 */
export function calcLiftFatigue(entries: LiftEntry[], lift: string): LiftFatigue | null {
  const key = normalizeLiftName(lift);
  const variants: Record<string, string[]> = {
    bench: ['bench', 'incline_bench', 'cgbench'],
    squat: ['squat', 'front_squat'],
    deadlift: ['deadlift', 'sumo_deadlift'],
    ohp: ['ohp'],
  };
  const group = variants[key] || [key];

  const sessions = groupByDay(entries);
  if (sessions.length === 0) return null;

  const loadByDate = new Map<string, number>();
  for (const s of sessions) {
    let load = 0;
    for (const e of s.lifts) {
      if (group.includes(normalizeLiftName(e.lift))) load += e.weight * e.reps;
    }
    if (load > 0) loadByDate.set(s.date, load);
  }

  const earliestDate = new Date(sessions[0].date + 'T00:00:00');
  const result = ewmaFatigue(loadByDate, earliestDate, new Date());
  if (!result) return null;

  const acwr = Math.round((result.acute / result.chronic) * 100) / 100;
  return { lift: key, acwr, acuteEWMA: result.acute, chronicEWMA: result.chronic, ...classifyACWR(acwr) };
}

export function getAllLiftFatigue(entries: LiftEntry[]): LiftFatigue[] {
  return ['bench', 'squat', 'deadlift', 'ohp']
    .map((l) => calcLiftFatigue(entries, l))
    .filter((f): f is LiftFatigue => f !== null);
}

export interface FatigueReserve {
  reserve: number;
  status: string;
  color: string;
}

/**
 * Calculate fatigue reserve as (chronic EWMA - acute EWMA) in tonnes.
 *
 * A positive reserve means chronic load exceeds acute load (fresh/recovered).
 * A negative reserve indicates acute load exceeds chronic (overreaching).
 * Thresholds: >0 = fresh reserve, 0 to -1 = slightly overreaching, <-1 = overreaching.
 *
 * @param entries - All lift entries
 * @returns Reserve in tonnes with status label and color, or null if insufficient data
 */
export function calcFatigueReserve(entries: LiftEntry[]): FatigueReserve | null {
  const sessions = groupByDay(entries);
  if (sessions.length === 0) return null;

  const tonnageByDate = new Map<string, number>();
  for (const s of sessions) tonnageByDate.set(s.date, s.tonnage);

  const earliestDate = new Date(sessions[0].date + 'T00:00:00');
  const result = ewmaFatigue(tonnageByDate, earliestDate, new Date());
  if (!result) return null;

  const reserve = Math.round((result.chronic - result.acute) / 1000 * 10) / 10;
  let status: string, color: string;
  if (reserve > 0) { status = 'Fresh reserve'; color = '#66bb6a'; }
  else if (reserve > -1) { status = 'Slightly overreaching'; color = '#ffa726'; }
  else { status = 'Overreaching'; color = '#ef5350'; }

  return { reserve, status, color };
}

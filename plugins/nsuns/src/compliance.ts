/**
 * nSuns 5/3/1 LP compliance tracking.
 * Extracted from core analytics — this is program-specific logic.
 */

import type { LiftEntry } from '@ironlogs/core';
import { normalizeLiftName } from '@ironlogs/csv-parser';
import { groupByDay } from '@ironlogs/analytics';

export interface ComplianceData {
  date: string;
  dayLabel: string;
  t1Lift: string;
  t2Lift: string | null;
  t1Completed: number;
  t1Programmed: number;
  t2Completed: number;
  t2Programmed: number;
  t1Rate: number;
  t2Rate: number;
  amrapEffort: number | null;
}

const NSUNS_DAYS: { t1: string; t2: string; label: string; t1Sets: number; t2Sets: number }[] = [
  { t1: 'bench', t2: 'ohp', label: 'Volume Bench', t1Sets: 9, t2Sets: 8 },
  { t1: 'deadlift', t2: 'front_squat', label: 'Heavy Deadlift', t1Sets: 9, t2Sets: 8 },
  { t1: 'ohp', t2: 'incline_bench', label: 'Heavy OHP', t1Sets: 9, t2Sets: 8 },
  { t1: 'squat', t2: 'sumo_deadlift', label: 'Heavy Squat', t1Sets: 9, t2Sets: 8 },
  { t1: 'bench', t2: 'cgbench', label: 'Heavy Bench', t1Sets: 9, t2Sets: 8 },
  { t1: 'deadlift', t2: 'front_squat', label: 'Light Deadlift', t1Sets: 8, t2Sets: 6 },
];

export function getComplianceData(entries: LiftEntry[]): ComplianceData[] {
  const sessions = groupByDay(entries);
  const results: ComplianceData[] = [];

  for (const s of sessions) {
    const t1Entries = s.lifts.filter((l) => l.set_type === 't1' || l.set_type === 't1_amrap');
    const t2Entries = s.lifts.filter((l) => l.set_type === 't2');
    if (t1Entries.length === 0) continue;

    const t1Lift = normalizeLiftName(t1Entries[0].lift);
    const t2Lift = t2Entries.length > 0 ? normalizeLiftName(t2Entries[0].lift) : null;
    const hasOnePlus = s.lifts.some((l) => l.set_type === 't1_amrap' && /programmed\s+1\+/.test(l.notes));

    let matched = NSUNS_DAYS.find((d) => d.t1 === t1Lift && d.t2 === t2Lift);
    if (!matched && t1Lift === 'bench') {
      matched = hasOnePlus
        ? NSUNS_DAYS.find((d) => d.t1 === 'bench' && d.t2 === 'cgbench')
        : NSUNS_DAYS.find((d) => d.t1 === 'bench' && d.t2 === 'ohp');
    }
    if (!matched && t1Lift === 'deadlift') {
      matched = hasOnePlus
        ? NSUNS_DAYS.find((d) => d.label === 'Heavy Deadlift')
        : NSUNS_DAYS.find((d) => d.label === 'Light Deadlift');
    }
    if (!matched) matched = NSUNS_DAYS.find((d) => d.t1 === t1Lift);

    const t1Programmed = matched?.t1Sets || 9;
    const t2Programmed = matched?.t2Sets || 8;

    let amrapEffort: number | null = null;
    const onePlusSet = s.lifts.find((l) => l.set_type === 't1_amrap' && /programmed\s+1\+/.test(l.notes));
    if (onePlusSet) {
      amrapEffort = Math.round((onePlusSet.reps / 1) * 10) / 10;
    }

    results.push({
      date: s.date,
      dayLabel: matched?.label || `${t1Lift} day`,
      t1Lift,
      t2Lift,
      t1Completed: t1Entries.length,
      t1Programmed,
      t2Completed: t2Entries.length,
      t2Programmed,
      t1Rate: Math.round((t1Entries.length / t1Programmed) * 100),
      t2Rate: t2Entries.length > 0 ? Math.round((t2Entries.length / t2Programmed) * 100) : 0,
      amrapEffort,
    });
  }

  return results;
}

export interface ComplianceSummary {
  avgT1Rate: number;
  avgT2Rate: number;
  avgAmrapEffort: number;
  totalSessions: number;
  fullCompletionRate: number;
}

export function getComplianceSummary(entries: LiftEntry[]): ComplianceSummary {
  const data = getComplianceData(entries);
  if (data.length === 0) {
    return { avgT1Rate: 0, avgT2Rate: 0, avgAmrapEffort: 0, totalSessions: 0, fullCompletionRate: 0 };
  }

  const avgT1Rate = Math.round(data.reduce((s, d) => s + d.t1Rate, 0) / data.length);
  const t2Data = data.filter((d) => d.t2Rate > 0);
  const avgT2Rate = t2Data.length > 0 ? Math.round(t2Data.reduce((s, d) => s + d.t2Rate, 0) / t2Data.length) : 0;
  const amrapData = data.filter((d) => d.amrapEffort !== null);
  const avgAmrapEffort = amrapData.length > 0
    ? Math.round((amrapData.reduce((s, d) => s + d.amrapEffort!, 0) / amrapData.length) * 10) / 10
    : 0;
  const fullCompletion = data.filter((d) => d.t1Rate >= 100 && d.t2Rate >= 100).length;

  return {
    avgT1Rate,
    avgT2Rate,
    avgAmrapEffort,
    totalSessions: data.length,
    fullCompletionRate: Math.round((fullCompletion / data.length) * 100),
  };
}

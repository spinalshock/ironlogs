/**
 * nSuns 5/3/1 LP program template with percentage-based weights.
 *
 * All weights are percentages of Training Max (TM).
 * TM = CEILING(1RM * 0.9, roundTo)
 * Actual weight = MROUND(TM * pct, roundTo)
 */

import type { ProgramTemplate } from '@ironlogs/plugin-api';

/**
 * T2 helper: 3 ascending sets then hold top weight for 5 more.
 * Reps always [6, 5, 3, 5, 7, 4, 6, 8].
 */
function t2Sets(startPct: number): { pct: number; reps: number }[] {
  const pcts = [startPct, startPct + 0.10, startPct + 0.20];
  const holdPct = pcts[2];
  return [
    { pct: pcts[0], reps: 6 },
    { pct: pcts[1], reps: 5 },
    { pct: holdPct, reps: 3 },
    { pct: holdPct, reps: 5 },
    { pct: holdPct, reps: 7 },
    { pct: holdPct, reps: 4 },
    { pct: holdPct, reps: 6 },
    { pct: holdPct, reps: 8 },
  ];
}

export const NSUNS_5DAY_TEMPLATE: ProgramTemplate = {
  id: 'nsuns-5day-lp',
  name: 'nSuns 5-Day LP',
  description: 'nSuns 5/3/1 Linear Progression — 5 training days + 1 light day + rest',
  tmFactor: 0.9,
  tmLifts: ['bench', 'squat', 'deadlift', 'ohp'],
  days: [
    // Day 1: Volume Bench
    {
      name: 'Day 1',
      label: 'Volume Bench',
      t1: {
        lift: 'bench',
        tmLift: 'bench',
        sets: [
          { pct: 0.65, reps: 8 },
          { pct: 0.75, reps: 6 },
          { pct: 0.85, reps: 4 },
          { pct: 0.85, reps: 4 },
          { pct: 0.85, reps: 4 },
          { pct: 0.80, reps: 5 },
          { pct: 0.75, reps: 6 },
          { pct: 0.70, reps: 7 },
          { pct: 0.65, reps: '8+' },
        ],
      },
      t2: {
        lift: 'ohp',
        tmLift: 'ohp',
        sets: t2Sets(0.50),
      },
      accessories: ['Face Pulls'],
    },
    // Day 2: Heavy Deadlift
    {
      name: 'Day 2',
      label: 'Heavy Deadlift',
      t1: {
        lift: 'deadlift',
        tmLift: 'deadlift',
        sets: [
          { pct: 0.75, reps: 5 },
          { pct: 0.85, reps: 3 },
          { pct: 0.95, reps: '1+' },
          { pct: 0.90, reps: 3 },
          { pct: 0.85, reps: 3 },
          { pct: 0.80, reps: 3 },
          { pct: 0.75, reps: 3 },
          { pct: 0.70, reps: 3 },
          { pct: 0.65, reps: '3+' },
        ],
      },
      t2: {
        lift: 'front_squat',
        tmLift: 'squat',
        sets: t2Sets(0.35),
      },
      accessories: ["Farmer's Walk"],
    },
    // Day 3: Heavy OHP
    {
      name: 'Day 3',
      label: 'Heavy OHP',
      t1: {
        lift: 'ohp',
        tmLift: 'ohp',
        sets: [
          { pct: 0.75, reps: 5 },
          { pct: 0.85, reps: 3 },
          { pct: 0.95, reps: '1+' },
          { pct: 0.90, reps: 3 },
          { pct: 0.85, reps: 3 },
          { pct: 0.80, reps: 3 },
          { pct: 0.75, reps: 5 },
          { pct: 0.70, reps: 5 },
          { pct: 0.65, reps: '5+' },
        ],
      },
      t2: {
        lift: 'incline_bench',
        tmLift: 'bench',
        sets: t2Sets(0.40),
      },
      accessories: ['Face Pulls', 'Seated Row'],
    },
    // Day 4: Heavy Squat
    {
      name: 'Day 4',
      label: 'Heavy Squat',
      t1: {
        lift: 'squat',
        tmLift: 'squat',
        sets: [
          { pct: 0.75, reps: 5 },
          { pct: 0.85, reps: 3 },
          { pct: 0.95, reps: '1+' },
          { pct: 0.90, reps: 3 },
          { pct: 0.85, reps: 3 },
          { pct: 0.80, reps: 3 },
          { pct: 0.75, reps: 5 },
          { pct: 0.70, reps: 5 },
          { pct: 0.65, reps: '5+' },
        ],
      },
      t2: {
        lift: 'sumo_deadlift',
        tmLift: 'deadlift',
        sets: t2Sets(0.50),
      },
      accessories: ['Seated Row'],
    },
    // Day 5: Heavy Bench
    {
      name: 'Day 5',
      label: 'Heavy Bench',
      t1: {
        lift: 'bench',
        tmLift: 'bench',
        sets: [
          { pct: 0.75, reps: 5 },
          { pct: 0.85, reps: 3 },
          { pct: 0.95, reps: '1+' },
          { pct: 0.90, reps: 3 },
          { pct: 0.85, reps: 5 },
          { pct: 0.80, reps: 3 },
          { pct: 0.75, reps: 5 },
          { pct: 0.70, reps: 3 },
          { pct: 0.65, reps: '5+' },
        ],
      },
      t2: {
        lift: 'cgbench',
        tmLift: 'bench',
        sets: t2Sets(0.40),
      },
      accessories: ['Face Pulls', 'Seated Row'],
    },
    // Day 6: Light Deadlift
    {
      name: 'Day 6',
      label: 'Light Deadlift',
      t1: {
        lift: 'deadlift',
        tmLift: 'deadlift',
        sets: [
          { pct: 0.725, reps: 3 },
          { pct: 0.725, reps: 3 },
          { pct: 0.725, reps: '3+' },
          { pct: 0.725, reps: 3 },
          { pct: 0.725, reps: 3 },
          { pct: 0.725, reps: 3 },
          { pct: 0.725, reps: 3 },
          { pct: 0.725, reps: 3 },
        ],
      },
      t2: {
        lift: 'front_squat',
        tmLift: 'squat',
        // 0.75 × 0.75 = 0.5625 of squat TM
        sets: [
          { pct: 0.5625, reps: 3 },
          { pct: 0.5625, reps: 3 },
          { pct: 0.5625, reps: 3 },
          { pct: 0.5625, reps: 3 },
          { pct: 0.5625, reps: 3 },
          { pct: 0.5625, reps: 3 },
        ],
      },
      accessories: ["Farmer's Walk"],
    },
    // Day 7: Rest
    {
      name: 'Day 7',
      label: 'Rest Day',
      rest: true,
    },
  ],
};

#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { parseCSV, validateDataset } from '@ironlogs/csv-parser';
import {
  estimate1RM, calcLiftScore, calcOverallScore,
  groupByDay, getLatestBodyweight, getBestRecentSets,
  getAllStrengthVelocities, detectPlateaus, calcFatigue,
} from '@ironlogs/analytics';

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  console.log(`
ironlogs — Open source strength analytics for serious lifters.

Usage:
  ironlogs analyze <file.csv>     Analyze a training log
  ironlogs validate <file.csv>    Validate CSV format
  ironlogs --help                 Show this help

Examples:
  ironlogs analyze training.csv
  ironlogs validate my_data.csv
`);
  process.exit(0);
}

if (command === 'validate') {
  const file = args[1];
  if (!file) { console.error('Usage: ironlogs validate <file.csv>'); process.exit(1); }
  const text = readFileSync(file, 'utf-8');
  const { entries, errors } = parseCSV(text);
  const validation = validateDataset(entries);

  console.log(`\n  Validation: ${validation.valid ? 'PASS' : 'FAIL'}`);
  console.log(`  Entries: ${validation.stats.totalEntries}`);
  if (validation.stats.dateRange) {
    console.log(`  Date range: ${validation.stats.dateRange[0]} → ${validation.stats.dateRange[1]}`);
  }
  console.log(`  Lifts: ${validation.stats.uniqueLifts.join(', ')}`);
  console.log(`  Has bodyweight: ${validation.stats.hasBodyweight}`);
  console.log(`  Has set types: ${validation.stats.hasSetTypes}`);
  console.log(`  Has sleep: ${validation.stats.hasSleep}`);
  if (errors.length > 0) {
    console.log(`\n  Errors:`);
    for (const e of errors.slice(0, 5)) console.log(`    ${e}`);
  }
  if (validation.warnings.length > 0) {
    console.log(`\n  Warnings:`);
    for (const w of validation.warnings) console.log(`    ${w}`);
  }
  console.log();
  process.exit(validation.valid ? 0 : 1);
}

if (command === 'analyze') {
  const file = args[1];
  if (!file) { console.error('Usage: ironlogs analyze <file.csv>'); process.exit(1); }
  const text = readFileSync(file, 'utf-8');
  const { entries, errors } = parseCSV(text);

  if (entries.length === 0) {
    console.error('No valid entries found.');
    if (errors.length > 0) for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }

  const sessions = groupByDay(entries);
  const bw = getLatestBodyweight(entries);
  const best = getBestRecentSets(entries);
  const scored = ['squat', 'bench', 'deadlift', 'ohp'];
  const liftScores = scored
    .filter((l) => best[l])
    .map((l) => ({ lift: l, ...calcLiftScore(l, best[l].estimated1RM, bw) }));
  const overall = calcOverallScore(liftScores);

  console.log(`\n  IronLogs Analysis`);
  console.log(`  ${'═'.repeat(40)}`);
  console.log(`  Sessions: ${sessions.length}`);
  console.log(`  Bodyweight: ${bw}kg`);
  console.log(`  Overall Score: ${overall.score} [${overall.level}]`);

  console.log(`\n  Estimated 1RMs:`);
  for (const s of liftScores) {
    console.log(`    ${s.lift.padEnd(12)} ${s.estimated1RM.toFixed(1)}kg  [${s.level}] ${s.score}`);
  }

  const velocities = getAllStrengthVelocities(entries);
  if (velocities.length > 0) {
    console.log(`\n  Strength Velocity:`);
    for (const v of velocities) {
      const sign = v.velocity >= 0 ? '+' : '';
      console.log(`    ${v.lift.padEnd(12)} ${sign}${v.velocity} kg/month  (${v.trend})`);
    }
  }

  const plateaus = detectPlateaus(entries).filter((p) => p.isPlateaued);
  if (plateaus.length > 0) {
    console.log(`\n  Plateaus Detected:`);
    for (const p of plateaus) {
      console.log(`    ${p.lift}: ${p.weeksSincePR} weeks since PR`);
    }
  }

  const fatigue = calcFatigue(entries);
  if (fatigue) {
    console.log(`\n  Fatigue: ${fatigue.label} (ACWR: ${fatigue.acwr})`);
  }

  console.log();
  process.exit(0);
}

console.error(`Unknown command: ${command}. Use --help for usage.`);
process.exit(1);

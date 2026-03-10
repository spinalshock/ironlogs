#!/usr/bin/env node

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCSV, validateDataset } from '@ironlogs/csv-parser';
import {
  calcLiftScore, calcOverallScore,
  groupByDay, getLatestBodyweight, getBestRecentSets,
  getAllStrengthVelocities, detectPlateaus, calcFatigue,
  findPRs, getUniqueLifts,
} from '@ironlogs/analytics';

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  console.log(`
ironlogs — Open source strength analytics for serious lifters.

Usage:
  ironlogs analyze <file.csv>                  Analyze a training log
  ironlogs validate <file.csv>                 Validate CSV format
  ironlogs report <file.csv> [--output <dir>]  Generate static HTML report
  ironlogs --help                              Show this help

Examples:
  ironlogs analyze training.csv
  ironlogs validate my_data.csv
  ironlogs report training.csv
  ironlogs report training.csv --output ./my-report
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

if (command === 'report') {
  const file = args[1];
  if (!file) { console.error('Usage: ironlogs report <file.csv> [--output <dir>]'); process.exit(1); }

  const outputIdx = args.indexOf('--output');
  const outputDir = resolve(outputIdx !== -1 && args[outputIdx + 1] ? args[outputIdx + 1] : './report');

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
  const velocities = getAllStrengthVelocities(entries);
  const plateaus = detectPlateaus(entries).filter((p) => p.isPlateaued);
  const fatigue = calcFatigue(entries);

  const lifts = getUniqueLifts(entries);
  let totalPRs = 0;
  for (const lift of lifts) {
    totalPRs += findPRs(entries, lift).size;
  }

  const dates = sessions.map((s) => s.date).sort();
  const dateRange = dates.length > 0 ? { start: dates[0], end: dates[dates.length - 1] } : null;

  const reportData = {
    generatedAt: new Date().toISOString(),
    bodyweight: bw,
    sessionCount: sessions.length,
    prCount: totalPRs,
    dateRange,
    overall: { score: overall.score, level: overall.level, color: overall.color },
    liftScores: liftScores.map((s) => ({
      lift: s.lift,
      estimated1RM: s.estimated1RM,
      score: s.score,
      level: s.level,
      color: s.color,
    })),
    velocities: velocities.map((v) => ({
      lift: v.lift,
      velocity: v.velocity,
      trend: v.trend,
    })),
    plateaus: plateaus.map((p) => ({
      lift: p.lift,
      weeksSincePR: p.weeksSincePR,
    })),
    fatigue: fatigue ? { acwr: fatigue.acwr, label: fatigue.label, status: fatigue.status, color: fatigue.color } : null,
  };

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(resolve(outputDir, 'data.json'), JSON.stringify(reportData, null, 2));

  const html = generateReportHTML(reportData);
  writeFileSync(resolve(outputDir, 'index.html'), html);

  console.log(`\n  Report generated:`);
  console.log(`    ${resolve(outputDir, 'index.html')}`);
  console.log(`    ${resolve(outputDir, 'data.json')}`);
  console.log();
  process.exit(0);
}

function generateReportHTML(data: {
  generatedAt: string;
  bodyweight: number;
  sessionCount: number;
  prCount: number;
  dateRange: { start: string; end: string } | null;
  overall: { score: number; level: string; color: string };
  liftScores: { lift: string; estimated1RM: number; score: number; level: string; color: string }[];
  velocities: { lift: string; velocity: number; trend: string }[];
  plateaus: { lift: string; weeksSincePR: number }[];
  fatigue: { acwr: number; label: string; status: string; color: string } | null;
}): string {
  const liftRows = data.liftScores.map((s) => `
        <tr>
          <td class="lift-name">${s.lift}</td>
          <td>${s.estimated1RM.toFixed(1)} kg</td>
          <td>${s.score}</td>
          <td><span class="badge" style="background:${s.color}">${s.level}</span></td>
        </tr>`).join('');

  const velocityRows = data.velocities.length > 0 ? data.velocities.map((v) => {
    const sign = v.velocity >= 0 ? '+' : '';
    const cls = v.velocity > 0 ? 'positive' : v.velocity < 0 ? 'negative' : 'neutral';
    return `
        <tr>
          <td class="lift-name">${v.lift}</td>
          <td class="${cls}">${sign}${v.velocity} kg/month</td>
          <td>${v.trend}</td>
        </tr>`;
  }).join('') : '<tr><td colspan="3" class="muted">No velocity data available</td></tr>';

  const plateauSection = data.plateaus.length > 0
    ? `<div class="card">
        <h2>Plateaus Detected</h2>
        <table>
          <thead><tr><th>Lift</th><th>Weeks Since PR</th></tr></thead>
          <tbody>${data.plateaus.map((p) => `
            <tr><td class="lift-name">${p.lift}</td><td>${p.weeksSincePR}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>`
    : '';

  const fatigueSection = data.fatigue
    ? `<div class="card">
        <h2>Fatigue</h2>
        <div class="stat-row">
          <div class="stat">
            <div class="stat-value">${data.fatigue.acwr}</div>
            <div class="stat-label">ACWR</div>
          </div>
          <div class="stat">
            <span class="badge" style="background:${data.fatigue.color}">${data.fatigue.label}</span>
          </div>
        </div>
      </div>`
    : '';

  const dateRangeStr = data.dateRange
    ? `${data.dateRange.start} to ${data.dateRange.end}`
    : 'N/A';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>IronLogs Report</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #0d1117;
    color: #c9d1d9;
    line-height: 1.6;
    padding: 2rem;
    max-width: 900px;
    margin: 0 auto;
  }
  h1 { color: #e6edf3; font-size: 1.8rem; margin-bottom: 0.25rem; }
  h2 { color: #e6edf3; font-size: 1.2rem; margin-bottom: 1rem; border-bottom: 1px solid #21262d; padding-bottom: 0.5rem; }
  .subtitle { color: #8b949e; font-size: 0.9rem; margin-bottom: 2rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
  .card {
    background: #161b22;
    border: 1px solid #21262d;
    border-radius: 8px;
    padding: 1.25rem;
    margin-bottom: 1rem;
  }
  .card-full { grid-column: 1 / -1; }
  .overall-score {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 1rem;
  }
  .score-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }
  .score-detail { flex: 1; }
  .score-detail .level { font-size: 1.3rem; font-weight: 600; color: #e6edf3; }
  .score-detail .meta { color: #8b949e; font-size: 0.85rem; }
  .stat-row { display: flex; gap: 2rem; flex-wrap: wrap; }
  .stat { text-align: center; }
  .stat-value { font-size: 1.5rem; font-weight: 700; color: #e6edf3; }
  .stat-label { font-size: 0.8rem; color: #8b949e; text-transform: uppercase; letter-spacing: 0.05em; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; color: #8b949e; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.5rem 0.75rem; border-bottom: 1px solid #21262d; }
  td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #21262d; }
  tr:last-child td { border-bottom: none; }
  .lift-name { text-transform: capitalize; font-weight: 500; color: #e6edf3; }
  .badge {
    display: inline-block;
    padding: 0.15rem 0.6rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
    color: #fff;
  }
  .positive { color: #3fb950; }
  .negative { color: #f85149; }
  .neutral { color: #8b949e; }
  .muted { color: #8b949e; font-style: italic; }
  footer { text-align: center; color: #484f58; font-size: 0.8rem; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #21262d; }
</style>
</head>
<body>
  <h1>IronLogs Report</h1>
  <p class="subtitle">Generated ${new Date(data.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

  <div class="card">
    <div class="overall-score">
      <div class="score-circle" style="background:${data.overall.color}">${data.overall.score}</div>
      <div class="score-detail">
        <div class="level">${data.overall.level}</div>
        <div class="meta">Overall Strength Score</div>
      </div>
    </div>
    <div class="stat-row">
      <div class="stat">
        <div class="stat-value">${data.sessionCount}</div>
        <div class="stat-label">Sessions</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.prCount}</div>
        <div class="stat-label">PRs Hit</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.bodyweight} kg</div>
        <div class="stat-label">Bodyweight</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="font-size:1rem">${dateRangeStr}</div>
        <div class="stat-label">Date Range</div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Per-Lift Scores</h2>
    <table>
      <thead><tr><th>Lift</th><th>Est. 1RM</th><th>Score</th><th>Level</th></tr></thead>
      <tbody>${liftRows}</tbody>
    </table>
  </div>

  <div class="card">
    <h2>Strength Velocity</h2>
    <table>
      <thead><tr><th>Lift</th><th>Velocity</th><th>Trend</th></tr></thead>
      <tbody>${velocityRows}</tbody>
    </table>
  </div>

  ${plateauSection}
  ${fatigueSection}

  <footer>IronLogs -- open source strength analytics</footer>
</body>
</html>`;
}

console.error(`Unknown command: ${command}. Use --help for usage.`);
process.exit(1);

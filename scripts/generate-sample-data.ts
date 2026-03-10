/**
 * Synthetic nSuns 5/3/1 Training Data Generator
 *
 * Generates a realistic 1-year training log as CSV for IronLogs.
 * Run: npx tsx scripts/generate-sample-data.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// ── Seeded PRNG (mulberry32) for reproducible output ────────────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);

function randFloat(min: number, max: number): number {
  return min + rng() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(randFloat(min, max + 1));
}

/** Box-Muller normal distribution */
function randNormal(mean: number, stddev: number): number {
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

function roundTo2_5(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ── Types ───────────────────────────────────────────────────────────────────

interface CSVRow {
  date: string;
  bodyweight: number;
  lift: string;
  weight: number;
  reps: number;
  set_type: string;
  notes: string;
  sleep: number;
}

// ── nSuns Program Definition ────────────────────────────────────────────────
// Each day has T1 (9 sets) and T2 (8 sets).
// Percentages are of the Training Max (TM), which is ~90% of 1RM.

interface DayTemplate {
  label: string;
  t1Lift: string;
  t2Lift: string;
  // T1: 9 sets. Each entry: [percentage of TM, programmed reps, isAMRAP?]
  t1Sets: [number, number, boolean][];
  // T2: 8 sets. Each entry: [percentage of TM, programmed reps]
  t2Sets: [number, number][];
  accessories: { lift: string; weight: number; reps: number }[];
  amrapTarget: string; // e.g. "1+" or "5+"
}

// Day templates for the 6-day nSuns rotation
const DAY_TEMPLATES: DayTemplate[] = [
  {
    // Day 1: Volume Bench + OHP
    label: 'Volume Bench',
    t1Lift: 'bench',
    t2Lift: 'ohp',
    t1Sets: [
      [0.65, 8, false],
      [0.75, 6, false],
      [0.85, 4, false],
      [0.85, 4, false],
      [0.85, 4, false],
      [0.80, 5, false],
      [0.75, 6, false],
      [0.70, 7, false],
      [0.65, 8, true], // AMRAP 8+
    ],
    t2Sets: [
      [0.50, 6],
      [0.60, 5],
      [0.70, 3],
      [0.70, 5],
      [0.70, 7],
      [0.70, 4],
      [0.70, 6],
      [0.70, 8],
    ],
    accessories: [{ lift: 'face_pull', weight: 15, reps: 15 }],
    amrapTarget: '8+',
  },
  {
    // Day 2: Heavy Deadlift + Front Squat
    label: 'Heavy Deadlift',
    t1Lift: 'deadlift',
    t2Lift: 'front_squat',
    t1Sets: [
      [0.75, 5, false],
      [0.85, 3, false],
      [0.95, 1, true], // AMRAP 1+
      [0.90, 3, false],
      [0.85, 3, false],
      [0.80, 3, false],
      [0.75, 3, false],
      [0.70, 3, false],
      [0.65, 3, true], // AMRAP 3+
    ],
    t2Sets: [
      [0.35, 5],
      [0.45, 5],
      [0.55, 3],
      [0.55, 5],
      [0.55, 7],
      [0.55, 4],
      [0.55, 6],
      [0.55, 8],
    ],
    accessories: [{ lift: 'pendlay_row', weight: 40, reps: 8 }],
    amrapTarget: '1+',
  },
  {
    // Day 3: Heavy OHP + Incline Bench
    label: 'Heavy OHP',
    t1Lift: 'ohp',
    t2Lift: 'incline_bench',
    t1Sets: [
      [0.75, 5, false],
      [0.85, 3, false],
      [0.95, 1, true], // AMRAP 1+
      [0.90, 3, false],
      [0.85, 3, false],
      [0.80, 3, false],
      [0.75, 5, false],
      [0.70, 5, false],
      [0.65, 5, true], // AMRAP 5+
    ],
    t2Sets: [
      [0.40, 6],
      [0.50, 5],
      [0.60, 3],
      [0.60, 5],
      [0.60, 7],
      [0.60, 4],
      [0.60, 6],
      [0.60, 8],
    ],
    accessories: [
      { lift: 'face_pull', weight: 15, reps: 15 },
      { lift: 'pendlay_row', weight: 40, reps: 8 },
    ],
    amrapTarget: '1+',
  },
  {
    // Day 4: Heavy Squat + Sumo Deadlift
    label: 'Heavy Squat',
    t1Lift: 'squat',
    t2Lift: 'sumo_deadlift',
    t1Sets: [
      [0.75, 5, false],
      [0.85, 3, false],
      [0.95, 1, true], // AMRAP 1+
      [0.90, 3, false],
      [0.85, 3, false],
      [0.80, 3, false],
      [0.75, 5, false],
      [0.70, 5, false],
      [0.65, 5, true], // AMRAP 5+
    ],
    t2Sets: [
      [0.50, 5],
      [0.60, 5],
      [0.70, 3],
      [0.70, 5],
      [0.70, 7],
      [0.70, 4],
      [0.70, 6],
      [0.70, 8],
    ],
    accessories: [{ lift: 'pendlay_row', weight: 40, reps: 8 }],
    amrapTarget: '1+',
  },
  {
    // Day 5: Heavy Bench + Close Grip Bench
    label: 'Heavy Bench',
    t1Lift: 'bench',
    t2Lift: 'cgbench',
    t1Sets: [
      [0.75, 5, false],
      [0.85, 3, false],
      [0.95, 1, true], // AMRAP 1+
      [0.90, 3, false],
      [0.85, 5, false],
      [0.80, 3, false],
      [0.75, 5, false],
      [0.70, 3, false],
      [0.65, 5, true], // AMRAP 5+
    ],
    t2Sets: [
      [0.40, 6],
      [0.50, 5],
      [0.60, 3],
      [0.60, 5],
      [0.60, 7],
      [0.60, 4],
      [0.60, 6],
      [0.60, 8],
    ],
    accessories: [
      { lift: 'face_pull', weight: 15, reps: 15 },
      { lift: 'pendlay_row', weight: 40, reps: 8 },
    ],
    amrapTarget: '1+',
  },
  {
    // Day 6: Light Deadlift + Front Squat
    label: 'Light Deadlift',
    t1Lift: 'deadlift',
    t2Lift: 'front_squat',
    t1Sets: [
      [0.70, 3, false],
      [0.70, 3, false],
      [0.70, 3, true], // AMRAP 3+
      [0.70, 3, false],
      [0.70, 3, false],
      [0.70, 3, false],
      [0.70, 3, false],
      [0.70, 3, false],
      [0.70, 3, false], // 9th set to fill the structure
    ],
    t2Sets: [
      [0.45, 5],
      [0.45, 5],
      [0.45, 3],
      [0.45, 5],
      [0.45, 5],
      [0.45, 3],
      [0.45, 5],
      [0.45, 5],
    ],
    accessories: [{ lift: 'pendlay_row', weight: 40, reps: 8 }],
    amrapTarget: '3+',
  },
];

// ── Starting 1RMs and Training Max ─────────────────────────────────────────

interface LiftState {
  oneRepMax: number;
  trainingMax: number; // ~90% of 1RM
  incrementPerCycle: number; // kg added per successful cycle
}

const liftStates: Record<string, LiftState & { cap: number }> = {
  bench: { oneRepMax: 70, trainingMax: 63, incrementPerCycle: 2.5, cap: 110 },
  squat: { oneRepMax: 90, trainingMax: 81, incrementPerCycle: 5, cap: 155 },
  deadlift: { oneRepMax: 110, trainingMax: 99, incrementPerCycle: 5, cap: 185 },
  ohp: { oneRepMax: 45, trainingMax: 40.5, incrementPerCycle: 2.5, cap: 72.5 },
};

// T2 lifts derive their TM from the parent lift
function getT2TM(t2Lift: string): number {
  switch (t2Lift) {
    case 'ohp':
      return liftStates.ohp.trainingMax;
    case 'front_squat':
      return liftStates.squat.trainingMax * 0.7;
    case 'incline_bench':
      return liftStates.bench.trainingMax * 0.8;
    case 'sumo_deadlift':
      return liftStates.deadlift.trainingMax * 0.9;
    case 'cgbench':
      return liftStates.bench.trainingMax * 0.85;
    default:
      return 40;
  }
}

// ── Accessory weight progression ────────────────────────────────────────────
// Accessories scale slowly over the year
function getAccessoryWeight(baseWeight: number, weekNumber: number): number {
  // Increase ~1kg every 4 weeks for accessories
  const progression = Math.floor(weekNumber / 4) * 1;
  return roundTo2_5(baseWeight + progression);
}

// ── Generation ──────────────────────────────────────────────────────────────

const START_DATE = new Date(2025, 2, 1); // March 1, 2025
const END_DATE = new Date(2026, 2, 1); // March 1, 2026

const rows: CSVRow[] = [];
let sessionCount = 0;
let dayInRotation = 0;
let cycleCount = 0;
let daysSinceLastDeload = 0;
let isDeloadWeek = false;
let deloadDaysRemaining = 0;
let nextDeloadThreshold = randInt(42, 56);

// Track for summary
let totalSets = 0;
let prDates: string[] = [];
let bestEstimated1RMs: Record<string, number> = {
  bench: 0,
  squat: 0,
  deadlift: 0,
  ohp: 0,
};
let testingDays = 0;
let restDays = 0;

// Bodyweight and sleep state
let bodyweight = 78;
const targetBodyweight = 82;

// Dates to skip (rest days / missed days)
const skipDates = new Set<string>();

// Pre-generate some rest days (~1 per 2 weeks)
{
  let d = new Date(START_DATE);
  while (d < END_DATE) {
    // Every 10-16 days, skip a day
    const gap = randInt(10, 16);
    d = addDays(d, gap);
    if (d < END_DATE) {
      skipDates.add(formatDate(d));
    }
  }
}

// Testing days: one at the start, one mid-year, one near the end
const testingDates = [
  formatDate(new Date(2025, 2, 1)), // March 1, 2025 - initial testing
  formatDate(new Date(2025, 8, 6)), // Sept 6, 2025 - mid-year testing
  formatDate(new Date(2026, 1, 21)), // Feb 21, 2026 - final testing
];

/** Wathan 1RM estimation (matches scoring.ts) */
function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(((100 * weight) / (48.8 + 53.8 * Math.exp(-0.075 * reps))) * 10) / 10;
}

function generateTestingDay(date: string, bw: number, sleep: number): void {
  testingDays++;

  // Test the 4 main lifts with singles working up
  const lifts = [
    { name: 'bench', max: liftStates.bench.oneRepMax },
    { name: 'squat', max: liftStates.squat.oneRepMax },
    { name: 'deadlift', max: liftStates.deadlift.oneRepMax },
    { name: 'ohp', max: liftStates.ohp.oneRepMax },
  ];

  for (const lift of lifts) {
    // Warm-up triples working up, then singles near max
    const warmups = [0.4, 0.5, 0.6, 0.7, 0.8];
    for (const pct of warmups) {
      const w = roundTo2_5(lift.max * pct);
      rows.push({
        date,
        bodyweight: bw,
        lift: lift.name,
        weight: w,
        reps: 3,
        set_type: 'testing',
        notes: warmups.indexOf(pct) === 0 ? '1RM testing day' : '',
        sleep,
      });
      totalSets++;
    }

    // Heavy singles
    const heavyPcts = [0.9, 0.95, 1.0];
    for (const pct of heavyPcts) {
      const w = roundTo2_5(lift.max * pct);
      const reps = pct >= 1.0 ? 1 : randInt(1, 2);
      const notes = pct >= 1.0 ? 'max attempt' : '';
      rows.push({
        date,
        bodyweight: bw,
        lift: lift.name,
        weight: w,
        reps,
        set_type: 'testing',
        notes,
        sleep,
      });
      totalSets++;

      // Track PRs
      const est = estimate1RM(w, reps);
      if (est > bestEstimated1RMs[lift.name]) {
        bestEstimated1RMs[lift.name] = est;
        prDates.push(date);
      }
    }
  }
}

function generateTrainingDay(date: string, template: DayTemplate, bw: number, sleep: number): void {
  const t1State = liftStates[template.t1Lift];
  if (!t1State) return;

  const t1TM = isDeloadWeek ? t1State.trainingMax * 0.9 : t1State.trainingMax;
  const t2TM = isDeloadWeek
    ? getT2TM(template.t2Lift) * 0.9
    : getT2TM(template.t2Lift);

  // ── T1 Sets ──
  for (let i = 0; i < template.t1Sets.length; i++) {
    const [pct, programmedReps, isAmrap] = template.t1Sets[i];
    const weight = roundTo2_5(t1TM * pct);

    let reps: number;
    let setType: string;
    let notes = '';

    if (isAmrap) {
      setType = 't1_amrap';

      // Determine the AMRAP target label
      if (i === template.t1Sets.length - 1) {
        // Last AMRAP set
        if (template.amrapTarget === '1+' && i > 2) {
          // This is the secondary AMRAP (5+ or 3+)
          const secondaryTarget =
            template.t1Sets[i][1] === 3 ? '3+' : '5+';
          notes = `programmed ${secondaryTarget}`;
          // Hit target + surplus
          const surplus = randInt(1, 5);
          reps = programmedReps + surplus;
        } else {
          notes = `programmed ${template.amrapTarget}`;
          // Main AMRAP surplus
          if (template.amrapTarget === '1+') {
            // Heavy AMRAP: 1-5 extra reps, occasionally more
            const roll = rng();
            if (roll < 0.05) {
              reps = programmedReps + randInt(6, 8); // rare big set
            } else if (roll < 0.2) {
              reps = programmedReps + randInt(3, 5);
            } else {
              reps = programmedReps + randInt(1, 3);
            }
          } else {
            // Volume AMRAP (8+, 5+, 3+)
            const surplus = randInt(1, 4);
            reps = programmedReps + surplus;
          }
        }
      } else {
        // The primary "1+" AMRAP (set index 2, typically)
        notes = `programmed ${template.amrapTarget}`;
        const roll = rng();
        if (roll < 0.05) {
          reps = programmedReps + randInt(6, 8);
        } else if (roll < 0.2) {
          reps = programmedReps + randInt(3, 5);
        } else {
          reps = programmedReps + randInt(1, 3);
        }
      }

      // Track estimated 1RM for PR detection
      if (notes.includes('programmed 1+')) {
        const est = estimate1RM(weight, reps);
        if (est > bestEstimated1RMs[template.t1Lift]) {
          bestEstimated1RMs[template.t1Lift] = est;
          prDates.push(date);
        }
      }
    } else {
      setType = 't1';
      reps = programmedReps;
      // Occasionally miss a rep on heavy sets
      if (pct >= 0.9 && rng() < 0.05) {
        reps = Math.max(1, reps - 1);
        notes = 'grinder';
      }
    }

    rows.push({ date, bodyweight: bw, lift: template.t1Lift, weight, reps, set_type: setType, notes, sleep });
    totalSets++;
  }

  // ── T2 Sets ──
  for (const [pct, programmedReps] of template.t2Sets) {
    const weight = roundTo2_5(t2TM * pct);
    let reps = programmedReps;
    // Slight variance on T2 sets
    if (rng() < 0.1) {
      reps = Math.max(1, reps + randInt(-1, 1));
    }

    rows.push({
      date,
      bodyweight: bw,
      lift: template.t2Lift,
      weight: Math.max(20, weight), // minimum bar weight
      reps,
      set_type: 't2',
      notes: '',
      sleep,
    });
    totalSets++;
  }

  // ── Accessories ──
  const weekNumber = Math.floor(
    (new Date(date).getTime() - START_DATE.getTime()) / (7 * 86400000),
  );
  for (const acc of template.accessories) {
    const accWeight = getAccessoryWeight(acc.weight, weekNumber);
    const accReps = acc.reps + randInt(-2, 2);
    // 2 sets of each accessory
    for (let s = 0; s < 2; s++) {
      rows.push({
        date,
        bodyweight: bw,
        lift: acc.lift,
        weight: roundTo2_5(accWeight),
        reps: Math.max(5, accReps),
        set_type: 'accessory',
        notes: '',
        sleep,
      });
      totalSets++;
    }
  }
}

// ── Main loop: iterate day by day ───────────────────────────────────────────

let currentDate = new Date(START_DATE);

while (currentDate < END_DATE) {
  const dateStr = formatDate(currentDate);

  // ── Bodyweight: slow linear increase with daily noise ──
  const daysSinceStart = Math.floor(
    (currentDate.getTime() - START_DATE.getTime()) / 86400000,
  );
  const totalDays = Math.floor(
    (END_DATE.getTime() - START_DATE.getTime()) / 86400000,
  );
  const baseBodyweight =
    78 + ((targetBodyweight - 78) * daysSinceStart) / totalDays;
  bodyweight =
    Math.round((baseBodyweight + randNormal(0, 0.5)) * 10) / 10;

  // ── Sleep: normally distributed ──
  let sleep = Math.round(randNormal(7.2, 0.7) * 10) / 10;
  sleep = Math.max(4.5, Math.min(9, sleep)); // clamp

  // ── Check for testing day ──
  if (testingDates.includes(dateStr)) {
    generateTestingDay(dateStr, bodyweight, sleep);
    sessionCount++;
    currentDate = addDays(currentDate, 1);
    continue;
  }

  // ── Check for rest day ──
  if (skipDates.has(dateStr)) {
    restDays++;
    currentDate = addDays(currentDate, 1);
    continue;
  }

  // ── Check for deload ──
  daysSinceLastDeload++;
  if (daysSinceLastDeload > nextDeloadThreshold && !isDeloadWeek) {
    // Start deload week
    isDeloadWeek = true;
    deloadDaysRemaining = 6;
    daysSinceLastDeload = 0;
    nextDeloadThreshold = randInt(42, 56);
  }

  if (isDeloadWeek) {
    deloadDaysRemaining--;
    if (deloadDaysRemaining <= 0) {
      isDeloadWeek = false;
    }
  }

  // ── Get the day template ──
  const template = DAY_TEMPLATES[dayInRotation % 6];

  // ── Generate training day ──
  generateTrainingDay(dateStr, template, bodyweight, sleep);
  sessionCount++;

  // ── Progress to next day in rotation ──
  dayInRotation++;

  // After every 6 days (1 full rotation = 1 cycle), bump training maxes
  if (dayInRotation % 6 === 0 && !isDeloadWeek) {
    cycleCount++;
    for (const [, state] of Object.entries(liftStates)) {
      // Stall probability increases as you approach your cap
      const progressRatio = state.oneRepMax / state.cap;
      const stallChance = progressRatio < 0.7 ? 0.08 : progressRatio < 0.85 ? 0.25 : progressRatio < 0.95 ? 0.5 : 0.8;
      if (rng() < stallChance) continue;
      if (state.oneRepMax >= state.cap) continue; // hard cap
      state.trainingMax += state.incrementPerCycle;
      state.oneRepMax = state.trainingMax / 0.9;
    }
  }

  currentDate = addDays(currentDate, 1);
}

// ── Write CSV ───────────────────────────────────────────────────────────────

const header = 'date,bodyweight,lift,weight,reps,set_type,notes,sleep';
const csvLines = rows.map(
  (r) =>
    `${r.date},${r.bodyweight},${r.lift},${r.weight},${r.reps},${r.set_type},${r.notes},${r.sleep}`,
);

const outDir = join(import.meta.dirname ?? '.', '..', 'examples');
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const outPath = join(outDir, 'year_of_training.csv');
writeFileSync(outPath, [header, ...csvLines].join('\n') + '\n');

// ── Summary ─────────────────────────────────────────────────────────────────

const uniquePRDates = new Set(prDates);

console.log('=== IronLogs Sample Data Generator ===\n');
console.log(`Output:        ${outPath}`);
console.log(`Date range:    ${formatDate(START_DATE)} to ${formatDate(END_DATE)}`);
console.log(`Sessions:      ${sessionCount}`);
console.log(`Total sets:    ${totalSets}`);
console.log(`Total rows:    ${rows.length}`);
console.log(`Rest days:     ${restDays}`);
console.log(`Testing days:  ${testingDays}`);
console.log(`Cycles:        ${cycleCount}`);
console.log(`PR dates:      ${uniquePRDates.size}`);
console.log('');
console.log('Final estimated 1RMs:');
for (const [lift, best] of Object.entries(bestEstimated1RMs)) {
  console.log(`  ${lift.padEnd(12)} ${best.toFixed(1)} kg`);
}
console.log('');
console.log('Final training maxes:');
for (const [lift, state] of Object.entries(liftStates)) {
  console.log(
    `  ${lift.padEnd(12)} TM: ${state.trainingMax.toFixed(1)} kg  (est 1RM: ${state.oneRepMax.toFixed(1)} kg)`,
  );
}

const finalBW = rows[rows.length - 1]?.bodyweight ?? 0;
console.log(`\nBodyweight:    ${rows[0]?.bodyweight} kg -> ${finalBW} kg`);

const sleepValues = [...new Set(rows.map((r) => r.date))].map((d) => {
  const dayRows = rows.filter((r) => r.date === d);
  return dayRows[0].sleep;
});
const avgSleep =
  sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length;
console.log(`Avg sleep:     ${avgSleep.toFixed(1)} hrs`);
console.log('\nDone!');

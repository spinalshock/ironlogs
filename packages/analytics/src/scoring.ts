import type { StrengthLevel } from '@ironlogs/core';

// --- Wilks Coefficient (Males) ---
function wilksCoefficient(bw: number): number {
  const a = -216.0475144;
  const b = 16.2606339;
  const c = -0.002388645;
  const d = -0.00113732;
  const e = 0.00000701863;
  const f = -0.000000001291;
  const denom = a + b * bw + c * bw ** 2 + d * bw ** 3 + e * bw ** 4 + f * bw ** 5;
  if (denom <= 0) return 0;
  return 500 / denom;
}

// --- Lift Ratios (% of Powerlifting Total, Males) ---
export const LIFT_RATIOS: Record<string, number> = {
  deadlift: 0.3968,
  squat: 0.3452,
  bench: 0.2579,
  sumo_deadlift: 0.3968,
  front_squat: 0.2762,
  incline_bench: 0.2115,
  ohp: 0.1676,
  push_press: 0.2229,
  snatch_press: 0.1341,
  pendlay_row: 0.2103,
  power_clean: 0.2222,
  cgbench: 0.2321,
};

// --- Age Adjustment ---
function ageAdjustment(age: number): number {
  if (age < 23) return 0.0039 * age * age - 0.167 * age + 2.80;
  if (age <= 40) return 1.0;
  return 0.000468 * age * age - 0.0300 * age + 1.45;
}

function singleLiftScore(bw: number, liftName: string, oneRepMax: number, age: number = 30): number {
  const ratio = LIFT_RATIOS[liftName];
  if (!ratio || bw <= 0 || oneRepMax <= 0) return 0;
  const expectedPLTotal = oneRepMax / ratio;
  const wilks = expectedPLTotal * wilksCoefficient(bw);
  return (wilks * ageAdjustment(age)) / 4;
}

// --- Level Thresholds ---
export const LEVEL_THRESHOLDS: [number, StrengthLevel][] = [
  [125, 'World Class'],
  [112.5, 'Elite'],
  [100, 'Exceptional'],
  [87.5, 'Advanced'],
  [75, 'Proficient'],
  [60, 'Intermediate'],
  [45, 'Novice'],
  [30, 'Untrained'],
  [0, 'Subpar'],
];

export const LEVELS: StrengthLevel[] = [
  'Subpar', 'Untrained', 'Novice', 'Intermediate', 'Proficient',
  'Advanced', 'Exceptional', 'Elite', 'World Class',
];

export const LEVEL_COLORS: Record<StrengthLevel, string> = {
  'Subpar':       '#e91e63',
  'Untrained':    '#673ab7',
  'Novice':       '#3f51b5',
  'Intermediate': '#009688',
  'Proficient':   '#4caf50',
  'Advanced':     '#cddc39',
  'Exceptional':  '#ffc107',
  'Elite':        '#ff5722',
  'World Class':  '#f44336',
};

export function getLevel(score: number): { level: StrengthLevel; color: string } {
  for (const [minScore, level] of LEVEL_THRESHOLDS) {
    if (score >= minScore) {
      return { level, color: LEVEL_COLORS[level] };
    }
  }
  return { level: 'Subpar', color: LEVEL_COLORS['Subpar'] };
}

/**
 * Calculate a normalized strength score for a single lift.
 *
 * Projects the lift's 1RM to an estimated powerlifting total using known lift
 * ratios, applies the Wilks coefficient to normalize for bodyweight, and adjusts
 * for age (quadratic curves for juniors <23 and masters >40). The result is
 * divided by 4 to produce a 0-125+ scale matching the level thresholds.
 *
 * @param lift - Canonical lift name (must exist in LIFT_RATIOS)
 * @param oneRepMax - Estimated or actual one-rep max
 * @param bodyweight - Lifter's bodyweight in kg
 * @param age - Lifter's age in years (default 30, no adjustment applied 23-40)
 * @returns Score (0-125+), strength level label, and associated color
 */
export function calcLiftScore(
  lift: string,
  oneRepMax: number,
  bodyweight: number,
  age: number = 30,
): { score: number; level: StrengthLevel; color: string } {
  if (bodyweight <= 0 || oneRepMax <= 0 || !LIFT_RATIOS[lift]) {
    return { score: 0, level: 'Subpar', color: LEVEL_COLORS['Subpar'] };
  }
  const score = Math.round(singleLiftScore(bodyweight, lift, oneRepMax, age) * 10) / 10;
  const { level, color } = getLevel(score);
  return { score, level, color };
}

/**
 * The five scoring categories used for overall strength assessment.
 *
 * Each category groups related lifts so the overall score reflects balanced
 * strength across movement patterns: Squat, Floor Pull, Horizontal Press,
 * Vertical Press, and Pull/Row. The best score within each category is used.
 */
export const SCORING_CATEGORIES: Record<string, string[]> = {
  'Squat': ['squat', 'front_squat'],
  'Floor Pull': ['deadlift', 'sumo_deadlift', 'power_clean'],
  'Horizontal Press': ['bench', 'incline_bench'],
  'Vertical Press': ['ohp', 'push_press', 'snatch_press'],
  'Pull/Row': ['chinup', 'pullup', 'pendlay_row'],
};

/**
 * Calculate an overall strength score from individual lift scores.
 *
 * When lift names are provided, scores are grouped into the five scoring
 * categories (Squat, Floor Pull, Horizontal Press, Vertical Press, Pull/Row).
 * The best score per category is selected, then averaged across categories.
 * Falls back to a simple average if lift names are absent or no categories match.
 *
 * @param liftScores - Array of per-lift scores, optionally with lift name for categorization
 * @returns Averaged score (0-125+), strength level label, and associated color
 */
export function calcOverallScore(
  liftScores: { lift?: string; score: number }[],
): { score: number; level: StrengthLevel; color: string } {
  if (liftScores.length === 0) {
    return { score: 0, level: 'Subpar', color: LEVEL_COLORS['Subpar'] };
  }

  const hasLiftKeys = liftScores.every((s) => s.lift);
  if (hasLiftKeys) {
    const categoryScores: number[] = [];
    for (const [, lifts] of Object.entries(SCORING_CATEGORIES)) {
      const catMax = liftScores
        .filter((s) => lifts.includes(s.lift!))
        .reduce((max, s) => Math.max(max, s.score), 0);
      if (catMax > 0) categoryScores.push(catMax);
    }

    if (categoryScores.length === 0) {
      const avg = liftScores.reduce((sum, s) => sum + s.score, 0) / liftScores.length;
      const rounded = Math.round(avg * 10) / 10;
      const { level, color } = getLevel(rounded);
      return { score: rounded, level, color };
    }

    const avg = categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length;
    const rounded = Math.round(avg * 10) / 10;
    const { level, color } = getLevel(rounded);
    return { score: rounded, level, color };
  }

  const avg = liftScores.reduce((sum, s) => sum + s.score, 0) / liftScores.length;
  const rounded = Math.round(avg * 10) / 10;
  const { level, color } = getLevel(rounded);
  return { score: rounded, level, color };
}

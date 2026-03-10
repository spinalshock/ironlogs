import type { StrengthLevel } from '@ironlogs/core';
import { getLevel } from './scoring.js';

type MuscleKey =
  | 'upperTraps' | 'middleTraps' | 'lowerTraps'
  | 'frontDelts' | 'sideDelts' | 'rearDelts' | 'rotatorCuff'
  | 'upperChest' | 'lowerChest'
  | 'biceps' | 'triceps' | 'forearms'
  | 'serratusAndObliques' | 'abdominals'
  | 'latsAndTeresMajor' | 'spinalErectors'
  | 'glutes' | 'hamstrings' | 'quads'
  | 'hipFlexors' | 'hipAdductors' | 'calves';

const LIFT_INVOLVEMENT: Record<string, Record<MuscleKey, number>> = {
  squat:          { upperTraps:0, middleTraps:0, lowerTraps:0, frontDelts:0, sideDelts:0, rearDelts:0, rotatorCuff:0, upperChest:0, lowerChest:0, biceps:0, triceps:0, forearms:0, serratusAndObliques:2, abdominals:6, latsAndTeresMajor:2, spinalErectors:6, glutes:9, hamstrings:6, quads:8, hipFlexors:4, hipAdductors:6, calves:2 },
  front_squat:    { upperTraps:2, middleTraps:2, lowerTraps:2, frontDelts:0, sideDelts:0, rearDelts:0, rotatorCuff:2, upperChest:0, lowerChest:0, biceps:0, triceps:0, forearms:0, serratusAndObliques:2, abdominals:8, latsAndTeresMajor:0, spinalErectors:4, glutes:7, hamstrings:4, quads:10, hipFlexors:4, hipAdductors:6, calves:2 },
  deadlift:       { upperTraps:8, middleTraps:8, lowerTraps:2, frontDelts:0, sideDelts:0, rearDelts:0, rotatorCuff:0, upperChest:0, lowerChest:0, biceps:0, triceps:0, forearms:4, serratusAndObliques:4, abdominals:6, latsAndTeresMajor:4, spinalErectors:10, glutes:7, hamstrings:7, quads:6, hipFlexors:2, hipAdductors:4, calves:2 },
  sumo_deadlift:  { upperTraps:8, middleTraps:8, lowerTraps:2, frontDelts:0, sideDelts:0, rearDelts:0, rotatorCuff:0, upperChest:0, lowerChest:0, biceps:0, triceps:0, forearms:4, serratusAndObliques:4, abdominals:6, latsAndTeresMajor:4, spinalErectors:6, glutes:8, hamstrings:8, quads:8, hipFlexors:4, hipAdductors:6, calves:2 },
  power_clean:    { upperTraps:8, middleTraps:8, lowerTraps:2, frontDelts:0, sideDelts:0, rearDelts:0, rotatorCuff:0, upperChest:0, lowerChest:0, biceps:0, triceps:0, forearms:6, serratusAndObliques:4, abdominals:6, latsAndTeresMajor:2, spinalErectors:8, glutes:6, hamstrings:6, quads:8, hipFlexors:2, hipAdductors:4, calves:3 },
  bench:          { upperTraps:0, middleTraps:0, lowerTraps:0, frontDelts:6, sideDelts:0, rearDelts:0, rotatorCuff:2, upperChest:8, lowerChest:10, biceps:2, triceps:8, forearms:2, serratusAndObliques:0, abdominals:2, latsAndTeresMajor:4, spinalErectors:2, glutes:0, hamstrings:0, quads:2, hipFlexors:0, hipAdductors:0, calves:0 },
  incline_bench:  { upperTraps:0, middleTraps:0, lowerTraps:0, frontDelts:6, sideDelts:0, rearDelts:0, rotatorCuff:2, upperChest:10, lowerChest:8, biceps:2, triceps:8, forearms:2, serratusAndObliques:0, abdominals:2, latsAndTeresMajor:4, spinalErectors:2, glutes:0, hamstrings:0, quads:2, hipFlexors:0, hipAdductors:0, calves:0 },
  ohp:            { upperTraps:4, middleTraps:4, lowerTraps:4, frontDelts:10, sideDelts:6, rearDelts:0, rotatorCuff:2, upperChest:4, lowerChest:0, biceps:2, triceps:8, forearms:2, serratusAndObliques:2, abdominals:4, latsAndTeresMajor:0, spinalErectors:2, glutes:2, hamstrings:0, quads:0, hipFlexors:0, hipAdductors:0, calves:0 },
  push_press:     { upperTraps:4, middleTraps:4, lowerTraps:4, frontDelts:8, sideDelts:6, rearDelts:0, rotatorCuff:2, upperChest:2, lowerChest:0, biceps:2, triceps:8, forearms:2, serratusAndObliques:2, abdominals:4, latsAndTeresMajor:0, spinalErectors:2, glutes:4, hamstrings:2, quads:4, hipFlexors:2, hipAdductors:6, calves:3 },
  snatch_press:   { upperTraps:6, middleTraps:6, lowerTraps:6, frontDelts:8, sideDelts:8, rearDelts:2, rotatorCuff:2, upperChest:0, lowerChest:0, biceps:2, triceps:6, forearms:2, serratusAndObliques:2, abdominals:4, latsAndTeresMajor:0, spinalErectors:2, glutes:2, hamstrings:0, quads:0, hipFlexors:0, hipAdductors:0, calves:0 },
  pullup:         { upperTraps:0, middleTraps:6, lowerTraps:6, frontDelts:0, sideDelts:0, rearDelts:6, rotatorCuff:6, upperChest:0, lowerChest:0, biceps:6, triceps:0, forearms:6, serratusAndObliques:4, abdominals:6, latsAndTeresMajor:10, spinalErectors:0, glutes:0, hamstrings:0, quads:0, hipFlexors:0, hipAdductors:0, calves:0 },
  chinup:         { upperTraps:0, middleTraps:4, lowerTraps:4, frontDelts:0, sideDelts:0, rearDelts:6, rotatorCuff:6, upperChest:2, lowerChest:2, biceps:8, triceps:0, forearms:4, serratusAndObliques:4, abdominals:8, latsAndTeresMajor:10, spinalErectors:0, glutes:0, hamstrings:0, quads:0, hipFlexors:0, hipAdductors:0, calves:0 },
  pendlay_row:    { upperTraps:2, middleTraps:6, lowerTraps:6, frontDelts:0, sideDelts:0, rearDelts:8, rotatorCuff:8, upperChest:0, lowerChest:2, biceps:6, triceps:0, forearms:4, serratusAndObliques:4, abdominals:4, latsAndTeresMajor:10, spinalErectors:5, glutes:3, hamstrings:3, quads:0, hipFlexors:0, hipAdductors:2, calves:2 },
};

const MUSCLE_KEY_TO_SVG: Record<MuscleKey, string> = {
  upperTraps: 'upper-traps', middleTraps: 'middle-traps', lowerTraps: 'lower-traps',
  frontDelts: 'front-delts', sideDelts: 'side-delts', rearDelts: 'rear-delts', rotatorCuff: 'rotator-cuff',
  upperChest: 'upper-chest', lowerChest: 'lower-chest',
  biceps: 'biceps', triceps: 'triceps', forearms: 'forearms',
  serratusAndObliques: 'obliques', abdominals: 'abdominals',
  latsAndTeresMajor: 'lats', spinalErectors: 'spinal-erectors',
  glutes: 'glutes', hamstrings: 'hamstrings', quads: 'quads',
  hipFlexors: 'hip-flexors', hipAdductors: 'hip-adductors', calves: 'calves',
};

export function calcMuscleScores(
  liftScores: Record<string, number>,
): Record<string, { score: number; level: StrengthLevel; color: string }> {
  const result: Record<string, { score: number; level: StrengthLevel; color: string }> = {};
  const muscleKeys = Object.keys(MUSCLE_KEY_TO_SVG) as MuscleKey[];
  for (const muscle of muscleKeys) {
    let numerator = 0;
    let denominator = 0;
    for (const [liftKey, involvement] of Object.entries(LIFT_INVOLVEMENT)) {
      const weight = involvement[muscle];
      if (weight === 0) continue;
      const score = liftScores[liftKey];
      if (!score || score <= 0) continue;
      const w3 = weight ** 3;
      numerator += score * w3;
      denominator += w3;
    }
    const svgName = MUSCLE_KEY_TO_SVG[muscle];
    if (denominator >= 50) {
      const score = Math.round((numerator / denominator) * 10) / 10;
      const { level, color } = getLevel(score);
      result[svgName] = { score, level, color };
    } else {
      result[svgName] = { score: 0, level: 'Subpar', color: '#555' };
    }
  }
  return result;
}

export function calcSymmetryScore(scores: number[]): number {
  if (scores.length < 2) return 100;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
  return Math.round((100 - variance) * 10) / 10;
}

export const LIFT_MUSCLE_MAP: Record<string, string[]> = {
  squat: ['quads', 'glutes', 'spinal-erectors', 'abdominals'],
  front_squat: ['quads', 'abdominals', 'upper-traps'],
  bench: ['lower-chest', 'upper-chest', 'front-delts', 'triceps'],
  deadlift: ['hamstrings', 'glutes', 'spinal-erectors', 'upper-traps', 'forearms'],
  ohp: ['front-delts', 'side-delts', 'triceps', 'upper-chest'],
  chinup: ['lats', 'biceps', 'forearms'],
  pendlay_row: ['lats', 'rear-delts', 'biceps', 'rotator-cuff'],
};

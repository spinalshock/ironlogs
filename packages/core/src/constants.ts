/** Canonical lift names used throughout the system */
export const CANONICAL_LIFTS = [
  'bench', 'squat', 'deadlift', 'ohp',
  'cgbench', 'incline_bench', 'front_squat', 'sumo_deadlift',
  'chinup', 'pullup', 'pendlay_row', 'power_clean', 'push_press', 'snatch_press',
] as const;

export type CanonicalLift = typeof CANONICAL_LIFTS[number];

/** Map of common aliases → canonical name */
export const LIFT_ALIASES: Record<string, string> = {
  'bench_press': 'bench',
  'flat_bench': 'bench',
  'bp': 'bench',
  'back_squat': 'squat',
  'bs': 'squat',
  'conventional_deadlift': 'deadlift',
  'dl': 'deadlift',
  'overhead_press': 'ohp',
  'shoulder_press': 'ohp',
  'military_press': 'ohp',
  'close_grip_bench': 'cgbench',
  'close_grip_bench_press': 'cgbench',
  'chin_up': 'chinup',
  'chin-up': 'chinup',
  'pull_up': 'pullup',
  'pull-up': 'pullup',
  'barbell_row': 'pendlay_row',
  'bent_over_row': 'pendlay_row',
  'row': 'pendlay_row',
};

/** Primary lifts used for scoring */
export const PRIMARY_LIFTS = ['squat', 'bench', 'deadlift', 'ohp'] as const;

/** Set type categories */
export const SET_TYPES = {
  primary: 'primary',
  secondary: 'secondary',
  accessory: 'accessory',
  amrap: 'amrap',
  testing: 'testing',
  // Legacy nSuns types (backward compat)
  t1: 't1',
  t1_amrap: 't1_amrap',
  t2: 't2',
} as const;

/** Lift display names */
export const LIFT_DISPLAY_NAMES: Record<string, string> = {
  bench: 'Bench Press',
  squat: 'Back Squat',
  deadlift: 'Deadlift',
  ohp: 'Overhead Press',
  cgbench: 'Close Grip Bench',
  incline_bench: 'Incline Bench',
  front_squat: 'Front Squat',
  sumo_deadlift: 'Sumo Deadlift',
  chinup: 'Chin-up',
  pullup: 'Pull-up',
  pendlay_row: 'Pendlay Row',
  power_clean: 'Power Clean',
  push_press: 'Push Press',
  snatch_press: 'Snatch Press',
  face_pulls: 'Face Pulls',
  seated_row: 'Seated Row',
  lateral_raise: 'Lateral Raise',
  bicep_curl: 'Bicep Curl',
  tricep_pushdown: 'Tricep Pushdown',
  leg_curl: 'Leg Curl',
};

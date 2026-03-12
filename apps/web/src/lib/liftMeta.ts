/**
 * Centralized lift display names and colors.
 * Single source of truth — no more per-file redeclarations.
 */

export const LIFT_LABELS: Record<string, string> = {
  // T1 lifts
  bench: 'Bench Press', squat: 'Back Squat', deadlift: 'Deadlift', ohp: 'Overhead Press',
  // T2 lifts
  cgbench: 'Close Grip Bench', incline_bench: 'Incline Bench', front_squat: 'Front Squat', sumo_deadlift: 'Sumo Deadlift',
  // Accessories
  chinup: 'Chin-up', pendlay_row: 'Pendlay Row', face_pulls: 'Face Pulls', seated_row: 'Seated Row',
  lateral_raise: 'Lateral Raise', bicep_curl: 'Bicep Curl', tricep_pushdown: 'Tricep Pushdown',
  leg_curl: 'Leg Curl', farmers_walk: "Farmer's Walk",
};

/** Short labels for compact displays (heatmaps, charts, pills) */
export const LIFT_LABELS_SHORT: Record<string, string> = {
  bench: 'Bench', squat: 'Squat', deadlift: 'Deadlift', ohp: 'OHP',
  cgbench: 'CG Bench', incline_bench: 'Incline Bench', front_squat: 'Front Squat', sumo_deadlift: 'Sumo DL',
  face_pulls: 'Face Pulls', pendlay_row: 'Pendlay Row', seated_row: 'Seated Row',
  lateral_raise: 'Lateral Raise', bicep_curl: 'Bicep Curl', tricep_pushdown: 'Tricep Pushdown',
  leg_curl: 'Leg Curl', chinup: 'Chin-up', farmers_walk: "Farmer's Walk",
};

export const LIFT_COLORS: Record<string, string> = {
  // T1 lifts
  bench: '#7986cb', squat: '#f06292', deadlift: '#81c784', ohp: '#ffd54f',
  // T2 lifts
  cgbench: '#b39ddb', incline_bench: '#64b5f6', front_squat: '#ce93d8', sumo_deadlift: '#a5d6a7',
  // Accessories
  chinup: '#ffb74d', row: '#80cbc4', face_pulls: '#90a4ae', seated_row: '#80cbc4',
  lateral_raise: '#ef9a9a', bicep_curl: '#ffcc80', tricep_pushdown: '#ce93d8', leg_curl: '#a5d6a7',
};

export function getLiftLabel(lift: string, short = false): string {
  return (short ? LIFT_LABELS_SHORT[lift] : LIFT_LABELS[lift]) || lift;
}

export function getLiftColor(lift: string, fallback = '#999'): string {
  return LIFT_COLORS[lift] || fallback;
}

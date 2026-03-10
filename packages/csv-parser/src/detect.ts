/** Known column aliases for auto-detection */
const COLUMN_MAP: Record<string, string> = {
  // Date
  date: 'date', day: 'date', workout_date: 'date',

  // Lift
  lift: 'lift', exercise: 'lift', exercise_name: 'lift', movement: 'lift',

  // Weight
  weight: 'weight', load: 'weight', weight_kg: 'weight', weight_lbs: 'weight',

  // Reps
  reps: 'reps', repetitions: 'reps', rep: 'reps',

  // Bodyweight
  bodyweight: 'bodyweight', bw: 'bodyweight', body_weight: 'bodyweight',

  // Set type
  set_type: 'set_type', type: 'set_type', category: 'set_type',

  // Notes
  notes: 'notes', comment: 'notes', comments: 'notes',

  // Sleep
  sleep: 'sleep', sleep_hours: 'sleep',
};

export interface ColumnMapping {
  date: string;
  lift: string;
  weight: string;
  reps: string;
  bodyweight?: string;
  set_type?: string;
  notes?: string;
  sleep?: string;
}

/**
 * Auto-detect column mapping from CSV headers.
 * Returns null if required columns (date, lift, weight, reps) can't be found.
 */
export function detectColumns(headers: string[]): ColumnMapping | null {
  const normalized = headers.map((h) => h.toLowerCase().trim().replace(/\s+/g, '_'));
  const mapping: Record<string, string> = {};

  for (let i = 0; i < normalized.length; i++) {
    const mapped = COLUMN_MAP[normalized[i]];
    if (mapped && !mapping[mapped]) {
      mapping[mapped] = headers[i];
    }
  }

  // Require at minimum: date, lift, weight, reps
  if (!mapping.date || !mapping.lift || !mapping.weight || !mapping.reps) {
    return null;
  }

  return {
    date: mapping.date,
    lift: mapping.lift,
    weight: mapping.weight,
    reps: mapping.reps,
    bodyweight: mapping.bodyweight,
    set_type: mapping.set_type,
    notes: mapping.notes,
    sleep: mapping.sleep,
  };
}

import type { LiftEntry } from '@ironlogs/core';
import { normalizeLiftName } from '../normalize.js';

/**
 * Parse Hevy app CSV export format.
 * Hevy format: title,start_time,end_time,description,exercise_title,superset_id,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe
 */
export function parseHevyCSV(text: string): LiftEntry[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const entries: LiftEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseQuotedCSV(line);
    const startTime = parts[1]; // "2024-01-15 10:30:00"
    const date = startTime?.split(' ')[0];
    const lift = parts[4]; // exercise_title
    const setType = parts[7]?.toLowerCase(); // "normal", "warmup", etc.
    const weight = parseFloat(parts[8]); // weight_kg
    const reps = parseInt(parts[9]);

    if (!date || !lift || isNaN(weight) || isNaN(reps)) continue;

    let mappedSetType = '';
    if (setType === 'warmup') mappedSetType = 'accessory';
    else if (setType === 'normal') mappedSetType = 'primary';
    else if (setType === 'failure') mappedSetType = 'amrap';

    entries.push({
      date,
      bodyweight: 0,
      lift: normalizeLiftName(lift),
      weight,
      reps,
      set_type: mappedSetType,
      notes: '',
      sleep: 0,
    });
  }

  return entries;
}

function parseQuotedCSV(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

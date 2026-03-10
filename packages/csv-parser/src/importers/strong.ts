import type { LiftEntry } from '@ironlogs/core';
import { normalizeLiftName } from '../normalize.js';

/**
 * Parse Strong app CSV export format.
 * Strong format: Date,Workout Name,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
 */
export function parseStrongCSV(text: string): LiftEntry[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const entries: LiftEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseQuotedCSV(line);
    const date = parts[0]?.split(' ')[0]; // Strong uses "YYYY-MM-DD HH:MM:SS"
    const lift = parts[2];
    const weight = parseFloat(parts[4]);
    const reps = parseInt(parts[5]);

    if (!date || !lift || isNaN(weight) || isNaN(reps)) continue;

    entries.push({
      date,
      bodyweight: 0,
      lift: normalizeLiftName(lift),
      weight,
      reps,
      set_type: '',
      notes: parts[8] || '',
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

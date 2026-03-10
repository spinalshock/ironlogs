import type { LiftEntry } from '@ironlogs/core';
import { detectColumns } from './detect.js';
import { normalizeLiftName } from './normalize.js';

export interface ParseResult {
  entries: LiftEntry[];
  errors: string[];
  columnsDetected: string[];
}

/**
 * Strip CSV injection characters, HTML tags, and restrict lift names to safe characters.
 *
 * - Removes leading characters that could trigger formula execution in spreadsheet
 *   applications (=, +, -, @, \t, \r).
 * - Strips HTML tags.
 * - For lift names, additionally restricts to alphanumeric, spaces, underscores, and hyphens.
 */
export function sanitizeField(value: string, isLiftName = false): string {
  // Strip leading CSV-injection characters (repeatedly, in case of stacking)
  let sanitized = value.replace(/^[=+\-@\t\r]+/, '');
  // Strip HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  if (isLiftName) {
    // Only allow alphanumeric, spaces, underscores, hyphens
    sanitized = sanitized.replace(/[^a-zA-Z0-9 _-]/g, '');
  }
  return sanitized.trim();
}

/**
 * Parse raw CSV text into a structured array of lift entries.
 *
 * Supports a flexible schema with auto-detection of column names from the header
 * row. At minimum requires date, lift, weight, and reps columns. Optionally
 * detects bodyweight, set_type, notes, and sleep columns. Handles quoted fields
 * and various column naming conventions (e.g., "exercise" for lift, "bw" for
 * bodyweight).
 *
 * Rows with missing or invalid required fields are skipped and reported in errors.
 * Lift names are automatically normalized to canonical form.
 *
 * @param text - Raw CSV string including header row
 * @returns Parsed entries, any row-level errors, and list of detected column names
 */
export function parseCSV(text: string): ParseResult {
  const lines = text.trim().split('\n');
  if (lines.length < 2) {
    return { entries: [], errors: ['CSV must have a header row and at least one data row'], columnsDetected: [] };
  }

  const headers = parseCSVLine(lines[0]);
  const mapping = detectColumns(headers);

  if (!mapping) {
    return {
      entries: [],
      errors: [`Could not detect required columns (date, lift, weight, reps) from headers: ${headers.join(', ')}`],
      columnsDetected: [],
    };
  }

  const columnsDetected = Object.entries(mapping)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => k);

  const entries: LiftEntry[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }

    const date = row[mapping.date]?.trim();
    const lift = row[mapping.lift]?.trim();
    const weight = parseFloat(row[mapping.weight]);
    const reps = parseInt(row[mapping.reps]);

    if (!date || !lift || isNaN(weight) || weight <= 0 || isNaN(reps) || reps <= 0) {
      if (date || lift) {
        errors.push(`Line ${i + 1}: invalid data (date=${date}, lift=${lift}, weight=${row[mapping.weight]}, reps=${row[mapping.reps]})`);
      }
      continue;
    }

    entries.push({
      date,
      lift: normalizeLiftName(sanitizeField(lift, true)),
      weight,
      reps,
      bodyweight: mapping.bodyweight ? (parseFloat(row[mapping.bodyweight]) || 0) : 0,
      set_type: mapping.set_type ? (row[mapping.set_type]?.trim().toLowerCase() || '') : '',
      notes: mapping.notes ? sanitizeField(row[mapping.notes] || '') : '',
      sleep: mapping.sleep ? (parseFloat(row[mapping.sleep]) || 0) : 0,
    });
  }

  return { entries, errors, columnsDetected };
}

/** Simple CSV line parser that handles quoted fields */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

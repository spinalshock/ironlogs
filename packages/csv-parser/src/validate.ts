import type { LiftEntry } from '@ironlogs/core';

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  stats: {
    totalEntries: number;
    dateRange: [string, string] | null;
    uniqueLifts: string[];
    hasBodyweight: boolean;
    hasSetTypes: boolean;
    hasSleep: boolean;
  };
}

export function validateDataset(entries: LiftEntry[]): ValidationResult {
  const warnings: string[] = [];

  if (entries.length === 0) {
    return {
      valid: false,
      warnings: ['No valid entries found'],
      stats: { totalEntries: 0, dateRange: null, uniqueLifts: [], hasBodyweight: false, hasSetTypes: false, hasSleep: false },
    };
  }

  const dates = entries.map((e) => e.date).sort();
  const uniqueLifts = [...new Set(entries.map((e) => e.lift))].sort();
  const hasBodyweight = entries.some((e) => e.bodyweight > 0);
  const hasSetTypes = entries.some((e) => e.set_type !== '');
  const hasSleep = entries.some((e) => e.sleep > 0);

  if (!hasBodyweight) {
    warnings.push('No bodyweight data found. Strength scoring will use default bodyweight.');
  }
  if (!hasSetTypes) {
    warnings.push('No set_type column detected. All sets treated as primary lifts.');
  }

  return {
    valid: true,
    warnings,
    stats: {
      totalEntries: entries.length,
      dateRange: [dates[0], dates[dates.length - 1]],
      uniqueLifts,
      hasBodyweight,
      hasSetTypes,
      hasSleep,
    },
  };
}

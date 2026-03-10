import { CANONICAL_LIFTS, LIFT_ALIASES } from '@ironlogs/core';

/**
 * Normalize any lift name to its canonical form.
 *
 * Resolution order: (1) direct match against CANONICAL_LIFTS, (2) alias lookup
 * in LIFT_ALIASES, (3) stripped non-alpha retry, (4) fuzzy pattern matching for
 * common lifts (chinup, pullup, row). Handles mixed casing, extra whitespace,
 * and special characters.
 *
 * @param lift - Raw lift name from user input or CSV
 * @returns Canonical lift name (lowercase, underscore-separated)
 */
export function normalizeLiftName(lift: string): string {
  const lower = lift.toLowerCase().trim().replace(/\s+/g, '_');

  // Direct canonical match
  if ((CANONICAL_LIFTS as readonly string[]).includes(lower)) return lower;

  // Check aliases
  if (LIFT_ALIASES[lower]) return LIFT_ALIASES[lower];

  // Strip non-alpha chars and try again
  const stripped = lower.replace(/[^a-z_]/g, '');
  if (LIFT_ALIASES[stripped]) return LIFT_ALIASES[stripped];

  // Fuzzy matching for common patterns
  if (stripped.includes('chinup') || stripped.includes('chin_up')) return 'chinup';
  if (stripped.includes('pullup') || stripped.includes('pull_up')) return 'pullup';
  if (stripped.includes('row')) return 'pendlay_row';

  return lower;
}

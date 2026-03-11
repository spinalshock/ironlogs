/**
 * Titles (reputation) for IronLogs.
 */

import type { LiftEntry } from '@ironlogs/core';
import { groupByDay } from '@ironlogs/analytics';

// ─── Titles (Reputation) ────────────────────────────────────

export interface Title {
  name: string;
  color: string;
}

const TITLES: { min: number; name: string; color: string }[] = [
  { min: 1000, name: 'Legend of Iron', color: '#f44336' },
  { min: 500, name: 'Master of Iron', color: '#ff5722' },
  { min: 250, name: 'Veteran of Steel', color: '#ffc107' },
  { min: 100, name: 'Iron Warrior', color: '#cddc39' },
  { min: 50, name: 'Iron Disciple', color: '#4caf50' },
  { min: 10, name: 'Barbell Initiate', color: '#009688' },
  { min: 1, name: 'Newcomer', color: '#90a4ae' },
];

export function getTitle(entries: LiftEntry[]): Title {
  const count = groupByDay(entries).length;
  for (const t of TITLES) {
    if (count >= t.min) return { name: t.name, color: t.color };
  }
  return { name: 'Newcomer', color: '#90a4ae' };
}

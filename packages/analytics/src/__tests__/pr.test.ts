import { describe, it, expect } from 'vitest';
import type { LiftEntry } from '@ironlogs/core';
import { isProgressionSet, findPRs, getBestRecentSets, get1RMProgression } from '../pr.js';

function makeEntry(overrides: Partial<LiftEntry> = {}): LiftEntry {
  return {
    date: '2026-01-01',
    bodyweight: 80,
    lift: 'bench',
    weight: 100,
    reps: 5,
    set_type: 'testing',
    notes: '',
    sleep: 7,
    ...overrides,
  };
}

describe('isProgressionSet', () => {
  it('detects testing sets', () => {
    expect(isProgressionSet(makeEntry({ set_type: 'testing' }))).toBe(true);
  });

  it('detects amrap sets', () => {
    expect(isProgressionSet(makeEntry({ set_type: 'amrap' }))).toBe(true);
  });

  it('detects t1_amrap with "programmed 1+" notes', () => {
    expect(
      isProgressionSet(makeEntry({ set_type: 't1_amrap', notes: 'programmed 1+' })),
    ).toBe(true);
  });

  it('does NOT detect regular t1 sets', () => {
    expect(isProgressionSet(makeEntry({ set_type: 't1' }))).toBe(false);
  });

  it('does NOT detect t1_amrap without matching notes', () => {
    expect(
      isProgressionSet(makeEntry({ set_type: 't1_amrap', notes: 'some other note' })),
    ).toBe(false);
  });

  it('does NOT detect accessory sets', () => {
    expect(isProgressionSet(makeEntry({ set_type: 'accessory' }))).toBe(false);
  });

  it('does NOT detect primary sets', () => {
    expect(isProgressionSet(makeEntry({ set_type: 'primary' }))).toBe(false);
  });
});

describe('findPRs', () => {
  it('detects progressive overload as PRs', () => {
    const entries = [
      makeEntry({ date: '2026-01-01', weight: 80, reps: 5 }),
      makeEntry({ date: '2026-01-08', weight: 85, reps: 5 }),
      makeEntry({ date: '2026-01-15', weight: 90, reps: 5 }),
    ];
    const prs = findPRs(entries, 'bench');
    expect(prs.size).toBe(3);
    expect(prs.has('2026-01-01')).toBe(true);
    expect(prs.has('2026-01-08')).toBe(true);
    expect(prs.has('2026-01-15')).toBe(true);
  });

  it('does not mark a day as PR if e1RM did not increase', () => {
    const entries = [
      makeEntry({ date: '2026-01-01', weight: 100, reps: 5 }),
      makeEntry({ date: '2026-01-08', weight: 90, reps: 5 }),
      makeEntry({ date: '2026-01-15', weight: 100, reps: 5 }),
    ];
    const prs = findPRs(entries, 'bench');
    // Only the first day is a PR since 90x5 < 100x5 and 100x5 ties but doesn't exceed
    expect(prs.size).toBe(1);
    expect(prs.has('2026-01-01')).toBe(true);
  });

  it('returns empty set when no progression sets exist', () => {
    const entries = [
      makeEntry({ set_type: 'primary', weight: 100, reps: 5 }),
    ];
    const prs = findPRs(entries, 'bench');
    expect(prs.size).toBe(0);
  });
});

describe('get1RMProgression', () => {
  it('returns progression sorted by date', () => {
    const entries = [
      makeEntry({ date: '2026-01-15', weight: 90, reps: 5 }),
      makeEntry({ date: '2026-01-01', weight: 80, reps: 5 }),
      makeEntry({ date: '2026-01-08', weight: 85, reps: 5 }),
    ];
    const prog = get1RMProgression(entries, 'bench');
    expect(prog).toHaveLength(3);
    expect(prog[0].date).toBe('2026-01-01');
    expect(prog[1].date).toBe('2026-01-08');
    expect(prog[2].date).toBe('2026-01-15');
  });

  it('keeps best e1RM per day', () => {
    const entries = [
      makeEntry({ date: '2026-01-01', weight: 80, reps: 5 }),
      makeEntry({ date: '2026-01-01', weight: 100, reps: 3 }),
    ];
    const prog = get1RMProgression(entries, 'bench');
    expect(prog).toHaveLength(1);
    // The set with the higher e1RM should win
    expect(prog[0].weight).toBe(100);
  });

  it('filters by lift name (normalized)', () => {
    const entries = [
      makeEntry({ lift: 'bench', weight: 100, reps: 5 }),
      makeEntry({ lift: 'squat', weight: 140, reps: 5 }),
    ];
    const prog = get1RMProgression(entries, 'bench');
    expect(prog).toHaveLength(1);
  });
});

describe('getBestRecentSets', () => {
  it('returns highest e1RM per lift', () => {
    const entries = [
      makeEntry({ lift: 'bench', weight: 80, reps: 5 }),
      makeEntry({ lift: 'bench', weight: 100, reps: 3 }),
      makeEntry({ lift: 'squat', weight: 120, reps: 5 }),
    ];
    const best = getBestRecentSets(entries);
    expect(best['bench']).toBeDefined();
    expect(best['squat']).toBeDefined();
    expect(best['bench'].estimated1RM).toBeGreaterThan(0);
    expect(best['squat'].estimated1RM).toBeGreaterThan(0);
  });

  it('ignores non-progression sets', () => {
    const entries = [
      makeEntry({ set_type: 'primary', lift: 'bench', weight: 200, reps: 1 }),
    ];
    const best = getBestRecentSets(entries);
    expect(best['bench']).toBeUndefined();
  });

  it('returns empty object for empty input', () => {
    expect(getBestRecentSets([])).toEqual({});
  });
});

import { describe, it, expect } from 'vitest';
import type { LiftEntry } from '@ironlogs/core';
import { groupByDay, getLatestBodyweight, getAllUniqueLifts } from '../volume.js';

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

describe('groupByDay', () => {
  it('groups entries from the same day into one session', () => {
    const entries = [
      makeEntry({ lift: 'bench', weight: 100, reps: 5 }),
      makeEntry({ lift: 'squat', weight: 120, reps: 3 }),
    ];
    const sessions = groupByDay(entries);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].date).toBe('2026-01-01');
    expect(sessions[0].lifts).toHaveLength(2);
  });

  it('groups entries from two different days into two sessions', () => {
    const entries = [
      makeEntry({ date: '2026-01-01' }),
      makeEntry({ date: '2026-01-02' }),
    ];
    const sessions = groupByDay(entries);
    expect(sessions).toHaveLength(2);
  });

  it('sorts sessions by date ascending', () => {
    const entries = [
      makeEntry({ date: '2026-01-03' }),
      makeEntry({ date: '2026-01-01' }),
      makeEntry({ date: '2026-01-02' }),
    ];
    const sessions = groupByDay(entries);
    expect(sessions.map((s) => s.date)).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
    ]);
  });

  it('calculates tonnage correctly', () => {
    const entries = [
      makeEntry({ weight: 100, reps: 5 }),
      makeEntry({ weight: 60, reps: 10 }),
    ];
    const sessions = groupByDay(entries);
    // 100*5 + 60*10 = 500 + 600 = 1100
    expect(sessions[0].tonnage).toBe(1100);
  });

  it('calculates per-lift tonnage', () => {
    const entries = [
      makeEntry({ lift: 'bench', weight: 100, reps: 5 }),
      makeEntry({ lift: 'bench', weight: 80, reps: 8 }),
      makeEntry({ lift: 'squat', weight: 120, reps: 3 }),
    ];
    const sessions = groupByDay(entries);
    // bench: 100*5 + 80*8 = 500+640 = 1140
    // squat: 120*3 = 360
    expect(sessions[0].liftTonnage['bench']).toBe(1140);
    expect(sessions[0].liftTonnage['squat']).toBe(360);
  });

  it('returns empty array for empty input', () => {
    expect(groupByDay([])).toEqual([]);
  });

  it('uses first entry bodyweight and sleep for the session', () => {
    const entries = [
      makeEntry({ bodyweight: 80, sleep: 7 }),
      makeEntry({ bodyweight: 81, sleep: 8 }),
    ];
    const sessions = groupByDay(entries);
    expect(sessions[0].bodyweight).toBe(80);
    expect(sessions[0].sleep).toBe(7);
  });
});

describe('getLatestBodyweight', () => {
  it('returns most recent bodyweight', () => {
    const entries = [
      makeEntry({ date: '2026-01-01', bodyweight: 78 }),
      makeEntry({ date: '2026-01-05', bodyweight: 80 }),
      makeEntry({ date: '2026-01-03', bodyweight: 79 }),
    ];
    expect(getLatestBodyweight(entries)).toBe(80);
  });

  it('returns 0 for empty input', () => {
    expect(getLatestBodyweight([])).toBe(0);
  });
});

describe('getAllUniqueLifts', () => {
  it('returns sorted unique normalized lift names', () => {
    const entries = [
      makeEntry({ lift: 'bench' }),
      makeEntry({ lift: 'Bench Press' }),
      makeEntry({ lift: 'squat' }),
      makeEntry({ lift: 'deadlift' }),
    ];
    const lifts = getAllUniqueLifts(entries);
    expect(lifts).toEqual(['bench', 'deadlift', 'squat']);
  });

  it('returns empty array for empty input', () => {
    expect(getAllUniqueLifts([])).toEqual([]);
  });
});

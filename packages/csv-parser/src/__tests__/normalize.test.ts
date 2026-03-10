import { describe, it, expect } from 'vitest';
import { normalizeLiftName } from '../normalize.js';

describe('normalizeLiftName', () => {
  it('normalizes "Bench Press" to "bench"', () => {
    expect(normalizeLiftName('Bench Press')).toBe('bench');
  });

  it('passes through canonical names unchanged', () => {
    expect(normalizeLiftName('bench')).toBe('bench');
    expect(normalizeLiftName('squat')).toBe('squat');
    expect(normalizeLiftName('deadlift')).toBe('deadlift');
    expect(normalizeLiftName('ohp')).toBe('ohp');
  });

  it('normalizes uppercase to canonical', () => {
    expect(normalizeLiftName('DEADLIFT')).toBe('deadlift');
    expect(normalizeLiftName('BENCH')).toBe('bench');
  });

  it('normalizes "overhead_press" to "ohp"', () => {
    expect(normalizeLiftName('overhead_press')).toBe('ohp');
  });

  it('normalizes "shoulder_press" to "ohp"', () => {
    expect(normalizeLiftName('shoulder_press')).toBe('ohp');
  });

  it('normalizes "chin-up" to "chinup"', () => {
    expect(normalizeLiftName('chin-up')).toBe('chinup');
  });

  it('normalizes "chin_up" to "chinup"', () => {
    expect(normalizeLiftName('chin_up')).toBe('chinup');
  });

  it('normalizes "pull-up" to "pullup"', () => {
    expect(normalizeLiftName('pull-up')).toBe('pullup');
  });

  it('normalizes "row" to "pendlay_row"', () => {
    expect(normalizeLiftName('row')).toBe('pendlay_row');
  });

  it('normalizes "barbell_row" to "pendlay_row"', () => {
    expect(normalizeLiftName('barbell_row')).toBe('pendlay_row');
  });

  it('normalizes "close_grip_bench" to "cgbench"', () => {
    expect(normalizeLiftName('close_grip_bench')).toBe('cgbench');
  });

  it('handles extra whitespace', () => {
    expect(normalizeLiftName('  bench  ')).toBe('bench');
  });

  it('handles multi-word with spaces converted to underscores', () => {
    expect(normalizeLiftName('back squat')).toBe('squat');
  });

  it('returns lowercased input for unrecognized lifts', () => {
    expect(normalizeLiftName('Goblet Squat')).toBe('goblet_squat');
  });
});

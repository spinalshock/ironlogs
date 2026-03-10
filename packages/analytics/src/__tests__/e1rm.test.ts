import { describe, it, expect } from 'vitest';
import { estimate1RM } from '../e1rm.js';

describe('estimate1RM (Wathan formula)', () => {
  it('returns the weight itself for a single rep', () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  it('estimates correctly for 5 reps', () => {
    // 100 * 100 / (48.8 + 53.8 * exp(-0.075 * 5))
    expect(estimate1RM(100, 5)).toBeCloseTo(116.6, 0);
  });

  it('estimates correctly for 10 reps', () => {
    // 100 * 100 / (48.8 + 53.8 * exp(-0.075 * 10))
    expect(estimate1RM(100, 10)).toBeCloseTo(134.7, 0);
  });

  it('returns 0 for zero weight', () => {
    expect(estimate1RM(0, 5)).toBe(0);
  });

  it('returns 0 for zero reps', () => {
    expect(estimate1RM(100, 0)).toBe(0);
  });

  it('returns 0 for negative weight', () => {
    expect(estimate1RM(-10, 5)).toBe(0);
  });

  it('returns 0 for negative reps', () => {
    expect(estimate1RM(100, -3)).toBe(0);
  });

  it('scales linearly with weight', () => {
    const e1 = estimate1RM(100, 5);
    const e2 = estimate1RM(200, 5);
    expect(e2).toBeCloseTo(e1 * 2, 0);
  });

  it('returns higher estimate for more reps at same weight', () => {
    expect(estimate1RM(100, 10)).toBeGreaterThan(estimate1RM(100, 5));
  });
});

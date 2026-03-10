import { describe, it, expect } from 'vitest';
import { calcLiftScore, calcOverallScore, getLevel, LIFT_RATIOS } from '../scoring.js';

describe('calcLiftScore', () => {
  it('returns a positive score for a known lift', () => {
    const result = calcLiftScore('bench', 100, 80);
    expect(result.score).toBeGreaterThan(0);
    expect(result.level).toBeDefined();
    expect(result.color).toBeDefined();
  });

  it('returns score 0 for zero oneRepMax', () => {
    const result = calcLiftScore('bench', 0, 80);
    expect(result.score).toBe(0);
    expect(result.level).toBe('Subpar');
  });

  it('returns score 0 for zero bodyweight', () => {
    const result = calcLiftScore('bench', 100, 0);
    expect(result.score).toBe(0);
    expect(result.level).toBe('Subpar');
  });

  it('returns score 0 for unknown lift', () => {
    const result = calcLiftScore('unknown_lift', 100, 80);
    expect(result.score).toBe(0);
    expect(result.level).toBe('Subpar');
  });

  it('produces higher score for stronger lifts', () => {
    const weak = calcLiftScore('bench', 60, 80);
    const strong = calcLiftScore('bench', 140, 80);
    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it('accepts an optional age parameter', () => {
    const young = calcLiftScore('squat', 150, 80, 20);
    const prime = calcLiftScore('squat', 150, 80, 30);
    // Age adjustment for young lifters differs from prime
    expect(young.score).not.toBe(prime.score);
  });
});

describe('calcOverallScore', () => {
  it('returns score 0 for empty array', () => {
    const result = calcOverallScore([]);
    expect(result.score).toBe(0);
    expect(result.level).toBe('Subpar');
  });

  it('averages scores without lift keys', () => {
    const result = calcOverallScore([{ score: 50 }, { score: 70 }]);
    expect(result.score).toBe(60);
  });

  it('uses category-based scoring when lift keys are present', () => {
    const scores = [
      { lift: 'bench', score: 80 },
      { lift: 'squat', score: 90 },
      { lift: 'deadlift', score: 100 },
      { lift: 'ohp', score: 70 },
    ];
    const result = calcOverallScore(scores);
    expect(result.score).toBeGreaterThan(0);
    // Should be average of category maxes
    // Squat category: 90, Floor Pull: 100, Horizontal Press: 80, Vertical Press: 70
    expect(result.score).toBe(85);
  });

  it('falls back to simple average when lift keys do not match categories', () => {
    const scores = [
      { lift: 'some_random_lift', score: 40 },
      { lift: 'another_random', score: 60 },
    ];
    const result = calcOverallScore(scores);
    expect(result.score).toBe(50);
  });
});

describe('getLevel', () => {
  it('returns Subpar for score 0', () => {
    expect(getLevel(0).level).toBe('Subpar');
  });

  it('returns Untrained for score 30', () => {
    expect(getLevel(30).level).toBe('Untrained');
  });

  it('returns Novice for score 45', () => {
    expect(getLevel(45).level).toBe('Novice');
  });

  it('returns Intermediate for score 60', () => {
    expect(getLevel(60).level).toBe('Intermediate');
  });

  it('returns World Class for score 125', () => {
    expect(getLevel(125).level).toBe('World Class');
  });

  it('returns World Class for score above 125', () => {
    expect(getLevel(200).level).toBe('World Class');
  });
});

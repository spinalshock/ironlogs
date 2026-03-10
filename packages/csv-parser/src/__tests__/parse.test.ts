import { describe, it, expect } from 'vitest';
import { parseCSV, sanitizeField } from '../parse.js';

describe('parseCSV', () => {
  it('parses minimal format (date,lift,weight,reps)', () => {
    const csv = `date,lift,weight,reps
2026-01-01,bench,100,5
2026-01-01,squat,120,3`;
    const result = parseCSV(csv);
    expect(result.entries).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.entries[0].date).toBe('2026-01-01');
    expect(result.entries[0].lift).toBe('bench');
    expect(result.entries[0].weight).toBe(100);
    expect(result.entries[0].reps).toBe(5);
  });

  it('parses extended format with all 8 columns', () => {
    const csv = `date,bodyweight,lift,weight,reps,set_type,notes,sleep
2026-01-01,80,bench,100,5,testing,felt good,7.5`;
    const result = parseCSV(csv);
    expect(result.entries).toHaveLength(1);
    const e = result.entries[0];
    expect(e.bodyweight).toBe(80);
    expect(e.set_type).toBe('testing');
    expect(e.notes).toBe('felt good');
    expect(e.sleep).toBe(7.5);
  });

  it('defaults optional columns to zero/empty when missing', () => {
    const csv = `date,lift,weight,reps
2026-01-01,bench,100,5`;
    const result = parseCSV(csv);
    const e = result.entries[0];
    expect(e.bodyweight).toBe(0);
    expect(e.set_type).toBe('');
    expect(e.notes).toBe('');
    expect(e.sleep).toBe(0);
  });

  it('reports errors for invalid data rows', () => {
    const csv = `date,lift,weight,reps
2026-01-01,bench,abc,5
2026-01-01,squat,120,3`;
    const result = parseCSV(csv);
    expect(result.entries).toHaveLength(1);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('skips rows with zero or negative weight', () => {
    const csv = `date,lift,weight,reps
2026-01-01,bench,0,5
2026-01-01,squat,-10,3
2026-01-01,deadlift,100,5`;
    const result = parseCSV(csv);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].lift).toBe('deadlift');
  });

  it('skips rows with zero or negative reps', () => {
    const csv = `date,lift,weight,reps
2026-01-01,bench,100,0
2026-01-01,squat,120,-1
2026-01-01,deadlift,100,5`;
    const result = parseCSV(csv);
    expect(result.entries).toHaveLength(1);
  });

  it('returns empty entries for empty input', () => {
    const result = parseCSV('');
    expect(result.entries).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error for header-only CSV', () => {
    const result = parseCSV('date,lift,weight,reps');
    expect(result.entries).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error when required columns are missing', () => {
    const csv = `foo,bar
1,2`;
    const result = parseCSV(csv);
    expect(result.entries).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('normalizes lift names in output', () => {
    const csv = `date,lift,weight,reps
2026-01-01,Bench Press,100,5`;
    const result = parseCSV(csv);
    expect(result.entries[0].lift).toBe('bench');
  });

  it('detects columns via aliases (exercise, load, repetitions)', () => {
    const csv = `date,exercise,load,repetitions
2026-01-01,squat,140,3`;
    const result = parseCSV(csv);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].lift).toBe('squat');
    expect(result.entries[0].weight).toBe(140);
    expect(result.entries[0].reps).toBe(3);
  });

  it('handles quoted CSV fields', () => {
    const csv = `date,lift,weight,reps,notes
2026-01-01,bench,100,5,"felt great, really strong"`;
    const result = parseCSV(csv);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].notes).toBe('felt great, really strong');
  });

  it('reports detected columns', () => {
    const csv = `date,lift,weight,reps,bodyweight
2026-01-01,bench,100,5,80`;
    const result = parseCSV(csv);
    expect(result.columnsDetected).toContain('date');
    expect(result.columnsDetected).toContain('lift');
    expect(result.columnsDetected).toContain('weight');
    expect(result.columnsDetected).toContain('reps');
    expect(result.columnsDetected).toContain('bodyweight');
  });
});

describe('sanitizeField', () => {
  it('strips leading = from fields', () => {
    expect(sanitizeField('=cmd|test')).toBe('cmd|test');
  });

  it('strips leading + from fields', () => {
    expect(sanitizeField('+cmd|test')).toBe('cmd|test');
  });

  it('strips leading - from fields', () => {
    expect(sanitizeField('-cmd|test')).toBe('cmd|test');
  });

  it('strips leading @ from fields', () => {
    expect(sanitizeField('@SUM(A1)')).toBe('SUM(A1)');
  });

  it('strips leading tab and carriage return', () => {
    expect(sanitizeField('\t\rmalicious')).toBe('malicious');
  });

  it('strips stacked injection characters', () => {
    expect(sanitizeField('=+=@payload')).toBe('payload');
  });

  it('strips HTML tags from fields', () => {
    expect(sanitizeField('<script>alert(1)</script>hello')).toBe('alert(1)hello');
    expect(sanitizeField('good <b>bold</b> text')).toBe('good bold text');
  });

  it('restricts lift names to safe characters', () => {
    expect(sanitizeField('bench!@#press', true)).toBe('benchpress');
    expect(sanitizeField('overhead_press-v2', true)).toBe('overhead_press-v2');
    expect(sanitizeField('squat 123', true)).toBe('squat 123');
  });

  it('leaves clean fields unchanged', () => {
    expect(sanitizeField('felt good')).toBe('felt good');
    expect(sanitizeField('bench', true)).toBe('bench');
  });
});

describe('parseCSV CSV injection sanitization', () => {
  it('strips injection characters from lift names', () => {
    const csv = `date,lift,weight,reps
2026-01-01,=cmd|bench,100,5`;
    const result = parseCSV(csv);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].lift).not.toContain('=');
    expect(result.entries[0].lift).not.toContain('|');
  });

  it('strips injection characters from notes', () => {
    const csv = `date,lift,weight,reps,notes
2026-01-01,bench,100,5,=SUM(A1:A10)`;
    const result = parseCSV(csv);
    expect(result.entries[0].notes).toBe('SUM(A1:A10)');
  });

  it('strips HTML from notes', () => {
    const csv = `date,lift,weight,reps,notes
2026-01-01,bench,100,5,<img src=x onerror=alert(1)>great set`;
    const result = parseCSV(csv);
    expect(result.entries[0].notes).toBe('great set');
  });

  it('strips HTML from lift names', () => {
    const csv = `date,lift,weight,reps
2026-01-01,<b>bench</b>,100,5`;
    const result = parseCSV(csv);
    expect(result.entries[0].lift).toBe('bench');
  });

  it('handles @ injection in notes', () => {
    const csv = `date,lift,weight,reps,notes
2026-01-01,bench,100,5,@SUM(A1)`;
    const result = parseCSV(csv);
    expect(result.entries[0].notes).toBe('SUM(A1)');
  });
});

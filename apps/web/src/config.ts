export const USER_CONFIG = {
  name: 'Om',
  age: 30,
  sex: 'male' as const,
  units: 'kg' as const,
  targetBodyweight: 76,
  /** Program plugin to use */
  program: 'nsuns-6day-dl-lp' as const,
  /** When this program started (ISO date). Used for block resolution in
   *  periodized programs; informational for flat programs like nSuns. */
  programStartDate: '2026-02-09',
  /** Rounding factor for computed weights (kg) */
  roundTo: 5,
  /** Training maxes — increase by 2.5kg on successful AMRAP each week.
   *  Set weights = MROUND(TM × pct, roundTo). */
  trainingMaxes: {
    bench: 70,
    squat: 82.5,
    deadlift: 117.5,
    ohp: 55,
  },
};

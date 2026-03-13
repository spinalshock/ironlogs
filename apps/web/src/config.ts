export const USER_CONFIG = {
  name: 'Om',
  age: 30,
  sex: 'male' as const,
  units: 'kg' as const,
  targetBodyweight: 76,
  /** Program plugin to use */
  program: 'nsuns-5day-lp' as const,
  /** Rounding factor for computed weights (kg) */
  roundTo: 5,
  /** Training maxes — increase by 2.5kg on successful AMRAP each week.
   *  Set weights = MROUND(TM × pct, roundTo). */
  trainingMaxes: {
    bench: 62.5,
    squat: 80,
    deadlift: 105,
    ohp: 50,
  },
};

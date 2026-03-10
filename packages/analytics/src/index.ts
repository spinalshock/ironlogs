// 1RM
export { estimate1RM } from './e1rm.js';

// Scoring
export {
  calcLiftScore, calcOverallScore, getLevel,
  LIFT_RATIOS, LEVEL_THRESHOLDS, LEVELS, LEVEL_COLORS, SCORING_CATEGORIES,
} from './scoring.js';

// Muscles
export { calcMuscleScores, calcSymmetryScore, LIFT_MUSCLE_MAP } from './muscles.js';

// Volume & data
export {
  groupByDay, getLatestBodyweight, getAllUniqueLifts,
  getBodyweightProgression, getSleepProgression, getSleepStats,
} from './volume.js';

// PR detection
export {
  isProgressionSet, get1RMProgression, findPRs, getBestRecentSets, getUniqueLifts,
} from './pr.js';

// Fatigue
export {
  calcFatigue, calcLiftFatigue, getAllLiftFatigue, calcFatigueReserve,
  type FatigueData, type LiftFatigue, type FatigueReserve,
} from './fatigue.js';

// Trends & advanced analytics
export {
  getSessionIntensities, getIntensityDistribution,
  getSessionStimulus,
  getStrengthVelocity, getAllStrengthVelocities,
  detectPlateaus,
  parseAmrapSurplus, getAmrapTrends,
  calcReadiness,
  getStrengthRatios,
  getWeeklyMuscleVolume,
  predictNextPR,
  type IntensityBucket, type SessionIntensity,
  type SessionStimulus,
  type StrengthVelocity,
  type PlateauInfo,
  type AmrapTrend,
  type ReadinessScore,
  type StrengthRatio,
  type WeeklyMuscleVolume,
  type PRPrediction,
} from './trends.js';

// Dataset
export { createDataset } from './dataset.js';

// Re-export analytics from @ironlogs/analytics
export {
  // Intensity
  getSessionIntensities,
  getIntensityDistribution,
  type IntensityBucket,
  type SessionIntensity,

  // Stimulus
  getSessionStimulus,
  type SessionStimulus,

  // Fatigue
  calcLiftFatigue,
  getAllLiftFatigue,
  calcFatigueReserve,
  type LiftFatigue,
  type FatigueReserve,

  // Velocity
  getStrengthVelocity,
  getAllStrengthVelocities,
  type StrengthVelocity,

  // Plateaus
  detectPlateaus,
  type PlateauInfo,

  // AMRAP
  getAmrapTrends,
  type AmrapTrend,

  // Readiness
  calcReadiness,
  type ReadinessScore,

  // Ratios
  getStrengthRatios,
  type StrengthRatio,

  // Muscle Volume
  getWeeklyMuscleVolume,
  type WeeklyMuscleVolume,

  // PR Prediction
  predictNextPR,
  type PRPrediction,
} from '@ironlogs/analytics';

// nSuns compliance — from plugin
export {
  getComplianceData,
  getComplianceSummary,
  type ComplianceData,
  type ComplianceSummary,
} from '@ironlogs/plugin-nsuns';

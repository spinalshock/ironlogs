/**
 * Training status system for IronLogs.
 *
 * Communicates training state via animated sprite avatars.
 * Based on readiness score (primary) and streak (modifier).
 */

// ─── Types ─────────────────────────────────────────────────

export type StatusLevel = 'bloodlust' | 'determined' | 'steady' | 'tired' | 'wrecked';

export interface TrainingStatus {
  level: StatusLevel;
  label: string;
  message: string;
  /** Status accent color (used for label text, indicators) */
  faceColor: string;
  /** Background glow color */
  glowColor: string;
  /** Sprite sheet filename for AnimatedFace */
  sprite: string;
}

// ─── Status Mapping ────────────────────────────────────────

const STATUS_MAP: Record<StatusLevel, Omit<TrainingStatus, 'level'>> = {
  bloodlust: {
    label: 'Bloodlust',
    message: 'Blood in the water. Go lift heavy.',
    faceColor: '#e57373',
    glowColor: 'rgba(255,23,68,0.3)',
    sprite: 'GodMode.jpg',
  },
  determined: {
    label: 'Determined',
    message: 'Locked in. Execute the plan.',
    faceColor: '#ffb74d',
    glowColor: 'rgba(255,183,77,0.2)',
    sprite: 'Bloodlust.jpg',
  },
  steady: {
    label: 'Steady',
    message: 'Consistent. Keep grinding.',
    faceColor: '#81c784',
    glowColor: 'rgba(129,199,132,0.15)',
    sprite: 'Determined.jpg',
  },
  tired: {
    label: 'Tired',
    message: 'Recovery needed. Deload or rest.',
    faceColor: '#90a4ae',
    glowColor: 'rgba(144,164,174,0.15)',
    sprite: 'SleepMode.png',
  },
  wrecked: {
    label: 'Wrecked',
    message: 'Take a break. Seriously.',
    faceColor: '#78909c',
    glowColor: 'rgba(84,110,122,0.15)',
    sprite: 'Test.png',
  },
};

// ─── Status Calculation ────────────────────────────────────

/**
 * Determine training status from readiness score and streak.
 *
 * Primary signal: readiness score (0-100)
 * Modifier: streak boosts status by one tier if ≥ 10 sessions
 */
export function getTrainingStatus(
  readinessScore: number | null,
  currentStreak: number,
): TrainingStatus {
  // Base level from readiness
  let level: StatusLevel;
  if (readinessScore === null) {
    // No readiness data — use streak as primary signal
    level = currentStreak >= 10 ? 'determined' : currentStreak >= 3 ? 'steady' : 'tired';
  } else if (readinessScore >= 80) {
    level = 'bloodlust';
  } else if (readinessScore >= 60) {
    level = 'determined';
  } else if (readinessScore >= 40) {
    level = 'steady';
  } else if (readinessScore >= 20) {
    level = 'tired';
  } else {
    level = 'wrecked';
  }

  // Streak modifier: boost one tier if streak ≥ 10
  if (currentStreak >= 10 && level !== 'bloodlust') {
    const tiers: StatusLevel[] = ['wrecked', 'tired', 'steady', 'determined', 'bloodlust'];
    const idx = tiers.indexOf(level);
    if (idx < tiers.length - 1) level = tiers[idx + 1];
  }

  return { level, ...STATUS_MAP[level] };
}

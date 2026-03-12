/**
 * Doomguy-inspired status face system for IronLogs.
 *
 * Communicates training state instantly without numbers.
 * Based on readiness score (primary) and streak (modifier).
 *
 * Each face is a pixel-art SVG rendered inline — no external assets needed.
 */

// ─── Types ─────────────────────────────────────────────────

export type StatusLevel = 'bloodlust' | 'determined' | 'steady' | 'tired' | 'wrecked';

export interface TrainingStatus {
  level: StatusLevel;
  label: string;
  message: string;
  /** Pixel art face color (primary skin tone shifts with status) */
  faceColor: string;
  /** Eye color */
  eyeColor: string;
  /** Background glow color */
  glowColor: string;
}

// ─── Status Mapping ────────────────────────────────────────

const STATUS_MAP: Record<StatusLevel, Omit<TrainingStatus, 'level'>> = {
  bloodlust: {
    label: 'Bloodlust',
    message: 'Blood in the water. Go lift heavy.',
    faceColor: '#e57373',
    eyeColor: '#ff1744',
    glowColor: 'rgba(255,23,68,0.3)',
  },
  determined: {
    label: 'Determined',
    message: 'Locked in. Execute the plan.',
    faceColor: '#ffb74d',
    eyeColor: '#fff',
    glowColor: 'rgba(255,183,77,0.2)',
  },
  steady: {
    label: 'Steady',
    message: 'Consistent. Keep grinding.',
    faceColor: '#81c784',
    eyeColor: '#fff',
    glowColor: 'rgba(129,199,132,0.15)',
  },
  tired: {
    label: 'Tired',
    message: 'Recovery needed. Deload or rest.',
    faceColor: '#90a4ae',
    eyeColor: '#78909c',
    glowColor: 'rgba(144,164,174,0.15)',
  },
  wrecked: {
    label: 'Wrecked',
    message: 'Take a break. Seriously.',
    faceColor: '#78909c',
    eyeColor: '#546e7a',
    glowColor: 'rgba(84,110,122,0.15)',
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

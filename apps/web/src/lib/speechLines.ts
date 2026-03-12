import type { StatusLevel } from './gamification';

const STATUS_LINES: Record<StatusLevel, string[]> = {
  bloodlust: [
    'Blood in the water.',
    'Load the bar.',
    'Today we go to war.',
    'Break the bar.',
    'Rip the iron apart.',
    'Heavy is calling.',
    'No mercy today.',
  ],
  determined: [
    'Locked in.',
    'Execute the plan.',
    'Focus. Lift. Repeat.',
    'Today we build strength.',
    'Dial it in.',
    'Clean reps only.',
    'Trust the program.',
  ],
  steady: [
    'Stay the course.',
    'Strength is built slowly.',
    'Consistency wins.',
    'Another brick today.',
    'Show up. Do the work.',
  ],
  tired: [
    'Recovery builds strength.',
    'Rest earns tomorrow.',
    'Even iron cools.',
    'Sleep. Eat. Return stronger.',
    'Deload the ego.',
  ],
  wrecked: [
    'Your CNS is screaming.',
    'System overload.',
    'Live to lift again.',
    'The bar wins today.',
    'Take the day.',
  ],
};

const STREAK_LINES = [
  '{streak} weeks strong.',
  'The streak lives.',
  "Don't break the chain.",
  'Momentum is building.',
];

const HIGH_READINESS_LINES = [
  'You are primed.',
  'Today is a PR day.',
  'Bar speed will fly.',
  'Something heavy waits.',
];

const LEVEL_MILESTONE_LINES = [
  'Level up.',
  'Strength recognized.',
  "You've earned this.",
  'Progress confirmed.',
];

const GENERAL_LINES = [
  'Pain fades. PRs stay.',
  'The bar tells the truth.',
  'One more rep.',
  'Earn the rack.',
  "Steel doesn't lie.",
  'Gravity is undefeated.',
  'Fight it anyway.',
  'Strong today. Stronger tomorrow.',
  'Respect the weight.',
];

interface SpeechContext {
  status: StatusLevel;
  weeklyStreak: number;
  readinessScore: number | null;
  level: number;
}

export function getSpeechLines(ctx: SpeechContext): string[] {
  const lines: string[] = [];

  // Status-specific
  lines.push(...STATUS_LINES[ctx.status]);

  // Streak bonuses
  if (ctx.weeklyStreak >= 2) {
    lines.push(...STREAK_LINES.map(l => l.replace('{streak}', String(ctx.weeklyStreak))));
  }

  // High readiness
  if (ctx.readinessScore !== null && ctx.readinessScore >= 85) {
    lines.push(...HIGH_READINESS_LINES);
  }

  // Level milestone
  if (ctx.level >= 10) {
    lines.push(...LEVEL_MILESTONE_LINES);
  }

  // Always include general pool
  lines.push(...GENERAL_LINES);

  return lines;
}

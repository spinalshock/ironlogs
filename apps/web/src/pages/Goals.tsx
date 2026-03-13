import { useLifts, getBestRecentSets, getLatestBodyweight } from '../lib/useLifts';
import { USER_CONFIG } from '../config';

interface Goal {
  lift: string;
  label: string;
  target: number;
  color: string;
}

const GOALS: Goal[] = [
  { lift: 'bench', label: 'Bench Press', target: 105, color: '#7986cb' },
  { lift: 'squat', label: 'Back Squat', target: 140, color: '#f06292' },
  { lift: 'deadlift', label: 'Deadlift', target: 160, color: '#81c784' },
  { lift: 'ohp', label: 'Overhead Press', target: 65, color: '#ffd54f' },
];

function ProgressBar({ current, target, color, label, remaining, unit = 'to go' }: {
  current: number; target: number; color: string; label: string; remaining: string; unit?: string;
}) {
  const pct = Math.min(Math.round((current / target) * 100), 100);
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="font-bold" style={{ color }}>{label}</span>
        <span className="text-sm opacity-75">
          {current.toFixed(1)}kg / {target}kg
          {parseFloat(remaining) > 0
            ? <span className="opacity-65 ml-2">({remaining}kg {unit})</span>
            : <span className="ml-2" style={{ color: '#81c784' }}>Goal reached!</span>
          }
        </span>
      </div>
      <div className="progress-track">
        <div
          className="h-full rounded-md transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }}
        />
        <span className="progress-label">{pct}%</span>
      </div>
    </div>
  );
}

export default function Goals() {
  const { entries, loading } = useLifts();
  if (loading) return <p className="text-text-muted">Loading...</p>;

  const bestSets = getBestRecentSets(entries);
  const currentBW = getLatestBodyweight(entries);
  const targetBW = USER_CONFIG.targetBodyweight;
  const bwRemaining = Math.max(currentBW - targetBW, 0);
  // For weight loss: show how close current is to target (lower = better)
  // 100% when at or below target, 0% would be infinitely far
  const bwPct = bwRemaining <= 0 ? 100 : Math.max(0, Math.min(Math.round((targetBW / currentBW) * 100), 99));

  return (
    <div>
      <h2>Goals</h2>
      <div className="flex flex-col gap-5">
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-bold" style={{ color: '#4fc3f7' }}>Bodyweight</span>
            <span className="text-sm opacity-75">
              {currentBW.toFixed(1)}kg / {targetBW}kg
              {bwRemaining > 0
                ? <span className="opacity-65 ml-2">({bwRemaining.toFixed(1)}kg to lose)</span>
                : <span className="ml-2" style={{ color: '#81c784' }}>Goal reached!</span>
              }
            </span>
          </div>
          <div className="progress-track">
            <div
              className="h-full rounded-md transition-all duration-500"
              style={{ width: `${bwPct}%`, backgroundColor: '#4fc3f7', opacity: 0.7 }}
            />
            <span className="progress-label">{bwPct}%</span>
          </div>
        </div>

        {GOALS.map((goal) => {
          const best = bestSets[goal.lift];
          const current = best ? Math.round(best.estimated1RM * 10) / 10 : 0;
          const remaining = Math.max(goal.target - current, 0).toFixed(1);
          return (
            <div key={goal.lift}>
              <ProgressBar
                current={current} target={goal.target} color={goal.color}
                label={goal.label} remaining={remaining}
              />
              {best && (
                <div className="text-xs opacity-65 mt-1">
                  Best: {best.weight}kg x {best.reps} reps
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

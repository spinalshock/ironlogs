import { useState } from 'react';
import { useLifts, getBestRecentSets, getLatestBodyweight } from '../lib/useLifts';
import { calcMuscleScores, calcLiftScore, LEVELS, LEVEL_COLORS } from '../lib/scoring';
import { MUSCLE_PATHS } from '../lib/musclePaths';

function darkenHex(hex: string, factor: number): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return hex;
  const r = Math.round(parseInt(c.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(c.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(c.slice(4, 6), 16) * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default function MuscleMapPage() {
  const { entries, loading } = useLifts();
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);

  if (loading) return <p className="text-text-muted">Loading...</p>;

  const bodyweight = getLatestBodyweight(entries);
  const bestSets = getBestRecentSets(entries);
  const liftScores: Record<string, number> = {};
  for (const [lift, best] of Object.entries(bestSets)) {
    const { score } = calcLiftScore(lift, best.estimated1RM, bodyweight);
    if (score > 0) liftScores[lift] = score;
  }

  const muscleColors = calcMuscleScores(liftScores);
  const hoveredInfo = hoveredMuscle ? muscleColors[hoveredMuscle] : null;

  return (
    <div>
      <h2>Muscle Map</h2>
      <div className="relative inline-block">
        <svg xmlns="http://www.w3.org/2000/svg" width="700" height="800" viewBox="0 0 700 800" className="max-w-full h-auto">
          <image width="700" height="800" href={`${import.meta.env.BASE_URL}img/male-musculature.png`} />
          {MUSCLE_PATHS.map((mp, i) => {
            const info = muscleColors[mp.muscle];
            const baseColor = info?.color || '#555';
            const isHovered = hoveredMuscle === mp.muscle;
            return (
              <path key={i} d={mp.d}
                fill={isHovered ? darkenHex(baseColor, 0.65) : baseColor} fillOpacity={0.5}
                stroke={darkenHex(baseColor, 0.5)} strokeWidth={2} strokeOpacity={isHovered ? 0.5 : 0}
                className="cursor-pointer transition-all duration-250"
                onMouseEnter={() => setHoveredMuscle(mp.muscle)}
                onMouseLeave={() => setHoveredMuscle(null)}
              />
            );
          })}
        </svg>

        {hoveredMuscle && hoveredInfo && (
          <div className="absolute top-2.5 right-2.5 rounded-lg p-3 text-sm pointer-events-none min-w-[150px]"
            style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', border: `2px solid ${hoveredInfo.color}` }}>
            <div className="font-bold capitalize mb-1">{hoveredMuscle.replace(/-/g, ' ')}</div>
            <div>Score: <strong style={{ color: hoveredInfo.color }}>{hoveredInfo.score || 'N/A'}</strong></div>
            <div className="font-bold" style={{ color: hoveredInfo.color }}>[{hoveredInfo.level}]</div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h4>Legend</h4>
        <div className="flex flex-wrap gap-3">
          {LEVELS.map((level) => (
            <span key={level} className="inline-flex items-center gap-1 text-sm">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: LEVEL_COLORS[level] }} />
              {level}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 text-sm">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#555' }} />
            No data
          </span>
        </div>
      </div>
    </div>
  );
}

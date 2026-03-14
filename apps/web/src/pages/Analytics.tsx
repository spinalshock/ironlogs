import { useMemo } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Line } from 'react-chartjs-2';
import { useLifts } from '../lib/useLifts';
import {
  calcReadiness,
  getIntensityDistribution,
  getSessionStimulus,
  getAllLiftFatigue,
  getAllStrengthVelocities,
  detectPlateaus,
  getStrengthRatios,
  getWeeklyMuscleVolume,
  calcFatigueReserve,
  getAmrapTrends,
  getComplianceSummary,
  predictNextPR,
} from '../lib/analytics';
import type {
  ReadinessScore,
  IntensityBucket,
  SessionStimulus,
  LiftFatigue,
  StrengthVelocity,
  PlateauInfo,
  StrengthRatio,
  WeeklyMuscleVolume,
  FatigueReserve,
  AmrapTrend,
  ComplianceSummary,
  PRPrediction,
} from '../lib/analytics';

ChartJS.register(LinearScale, TimeScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

import { getLiftLabel } from '../lib/liftMeta';

function liftLabel(lift: string): string {
  return getLiftLabel(lift);
}

// ─── 1. Readiness Score ──────────────────────────────────────

function ReadinessCard({ readiness }: { readiness: ReadinessScore }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (readiness.score / 100) * circumference;

  return (
    <div className="card mb-6">
      <h3 className="mb-4">Readiness Score</h3>
      <p className="text-xs opacity-60 mb-3">How prepared your body is for training today. Combines sleep quality (50%), fatigue levels (30%), and recent AMRAP performance (20%).</p>
      <div className="flex flex-col items-center gap-4">
        <svg width={140} height={140} viewBox="0 0 140 140">
          <circle cx={70} cy={70} r={radius} fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth={10} />
          <circle
            cx={70} cy={70} r={radius} fill="none"
            stroke={readiness.color} strokeWidth={10}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
          />
          <text x={70} y={64} textAnchor="middle" fill={readiness.color} fontSize={32} fontWeight="bold">
            {readiness.score}
          </text>
          <text x={70} y={86} textAnchor="middle" fill="var(--color-text-muted)" fontSize={13}>
            {readiness.label}
          </text>
        </svg>

        <div className="flex gap-3 flex-wrap justify-center">
          <div className="stat-card">
            <div className="label">Sleep</div>
            <div className="value">{readiness.sleepAvg}h</div>
            <div className="text-xs opacity-40 mt-0.5">/ 8h target</div>
          </div>
          <div className="stat-card">
            <div className="label">ACWR</div>
            <div className="value">{readiness.acwr !== null ? readiness.acwr.toFixed(2) : '—'}</div>
            <div className="text-xs opacity-40 mt-0.5">{readiness.acwr !== null ? (readiness.acwr >= 0.8 && readiness.acwr <= 1.3 ? 'optimal' : readiness.acwr < 0.8 ? 'undertrained' : 'overreaching') : '< 21 days data'}</div>
          </div>
          <div className="stat-card">
            <div className="label">AMRAP Surplus</div>
            <div className="value">{readiness.amrapSurplusAvg !== null ? `+${readiness.amrapSurplusAvg}` : '—'}</div>
            <div className="text-xs opacity-40 mt-0.5">{readiness.amrapSurplusAvg !== null ? 'avg reps above target' : '< 2 AMRAP sets'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 2. Relative Intensity Distribution ──────────────────────

const BUCKET_COLORS = ['#9e9e9e', '#42a5f5', '#66bb6a', '#ffa726', '#ef5350'];

function IntensityDistributionChart({ buckets }: { buckets: IntensityBucket[] }) {
  const barHeight = 28;
  const chartWidth = 500;
  const labelWidth = 60;
  const pctWidth = 50;
  const totalWidth = labelWidth + chartWidth + pctWidth + 10;

  return (
    <div className="card mb-6">
      <h3 className="mb-4">Relative Intensity Distribution</h3>
      <p className="text-xs opacity-60 mb-3">How your sets distribute across effort levels. Aim for most work in the 70-85% zone with strategic heavy and light days.</p>
      <div className="overflow-x-auto">
        <svg width={totalWidth} height={buckets.length * (barHeight + 8) + 10} style={{ fontSize: '12px' }}>
          {buckets.map((b, i) => {
            const y = i * (barHeight + 8) + 4;
            const barW = Math.max((b.pct / 100) * chartWidth, 0);
            return (
              <g key={b.label}>
                <text x={labelWidth - 6} y={y + barHeight / 2 + 4} textAnchor="end" fill="var(--color-text-secondary)">
                  {b.label}
                </text>
                <rect x={labelWidth} y={y} width={barW} height={barHeight} rx={4} fill={BUCKET_COLORS[i]} opacity={0.85} />
                <text x={labelWidth + barW + 6} y={y + barHeight / 2 + 4} fill="var(--color-text-muted)">
                  {b.pct}% ({b.count})
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── 3. Stimulus Score Timeline ──────────────────────────────

function StimulusTimeline({ data }: { data: SessionStimulus[] }) {
  const recent = data.slice(-60);

  const chartData = {
    datasets: [
      {
        label: 'Stimulus Score',
        data: recent.map((d) => ({ x: d.date, y: d.stimulus })),
        borderColor: '#1abc9c',
        backgroundColor: 'rgba(26, 188, 156, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        yAxisID: 'y',
      },
      {
        label: 'Tonnage (tons)',
        data: recent.map((d) => ({ x: d.date, y: Math.round(d.tonnage / 100) / 10 })),
        borderColor: '#42a5f5',
        backgroundColor: 'rgba(66, 165, 245, 0.05)',
        fill: false,
        tension: 0.3,
        pointRadius: 2,
        borderDash: [4, 3],
        yAxisID: 'y1',
      },
    ],
  };

  return (
    <div className="card mb-6">
      <h3 className="mb-4">Stimulus Score Timeline</h3>
      <p className="text-xs opacity-60 mb-3">Training stimulus combines volume and intensity into a single score. Higher isn't always better — look for consistent, sustainable stimulus over time.</p>
      <Line
        data={chartData}
        options={{
          responsive: true,
          interaction: { mode: 'index' as const, intersect: false },
          plugins: { legend: { display: true } },
          scales: {
            y: {
              type: 'linear' as const,
              position: 'left' as const,
              title: { display: true, text: 'Stimulus' },
              beginAtZero: true,
            },
            y1: {
              type: 'linear' as const,
              position: 'right' as const,
              title: { display: true, text: 'Tonnage (tons)' },
              grid: { drawOnChartArea: false },
              beginAtZero: true,
            },
            x: {
              type: 'time' as const,
              time: { unit: 'week' as const, tooltipFormat: 'yyyy-MM-dd' },
            },
          },
        }}
      />
    </div>
  );
}

// ─── 4. Lift-Specific Fatigue ────────────────────────────────

function LiftFatigueCards({ fatigueData }: { fatigueData: LiftFatigue[] }) {
  return (
    <div className="card mb-6">
      <h3 className="mb-4">Lift-Specific Fatigue</h3>
      <p className="text-xs opacity-60 mb-3">Acute-to-Chronic Workload Ratio (ACWR) per lift. Values 0.8-1.2 are optimal. Above 1.4 signals overreach — consider a deload.</p>
      <div className="flex gap-3 flex-wrap justify-center">
        {fatigueData.map((f) => (
          <div
            key={f.lift}
            className="stat-card"
            style={{ borderLeft: `4px solid ${f.color}`, minWidth: '160px' }}
          >
            <div className="label">{liftLabel(f.lift)}</div>
            <div className="value" style={{ color: f.color }}>{f.acwr}</div>
            <div className="text-xs mt-1" style={{ color: f.color }}>{f.label}</div>
            <div className="text-xs opacity-60 mt-1">
              A: {(f.acuteEWMA / 1000).toFixed(1)} tons | C: {(f.chronicEWMA / 1000).toFixed(1)} tons
            </div>
          </div>
        ))}
        {fatigueData.length === 0 && (
          <p className="text-sm opacity-60">Need 3+ weeks of data per lift</p>
        )}
      </div>
    </div>
  );
}

// ─── 5. Strength Velocity ────────────────────────────────────

const VELOCITY_COLORS: Record<string, string> = {
  gaining: '#66bb6a',
  plateau: '#ffa726',
  declining: '#ef5350',
};

function StrengthVelocityCards({ velocities }: { velocities: StrengthVelocity[] }) {
  return (
    <div className="card mb-6">
      <h3 className="mb-4">Strength Velocity</h3>
      <p className="text-xs opacity-60 mb-3">Rate of 1RM change over the last 8 weeks. Positive = gaining strength, zero = plateau, negative = losing strength.</p>
      <div className="flex gap-3 flex-wrap justify-center">
        {velocities.map((v) => (
          <div key={v.lift} className="stat-card" style={{ minWidth: '160px' }}>
            <div className="label">{liftLabel(v.lift)}</div>
            <div className="value" style={{ color: VELOCITY_COLORS[v.trend] }}>
              {v.velocity > 0 ? '+' : ''}{v.velocity} kg/mo
            </div>
            <div className="text-xs opacity-60 mt-1">
              Current 1RM: {v.current1RM.toFixed(1)} kg
            </div>
            <div className="text-xs mt-1" style={{ color: VELOCITY_COLORS[v.trend] }}>
              {v.trend.charAt(0).toUpperCase() + v.trend.slice(1)}
            </div>
          </div>
        ))}
        {velocities.length === 0 && (
          <p className="text-sm opacity-60">Need more data for velocity calculation</p>
        )}
      </div>
    </div>
  );
}

// ─── 6. Plateau Detection ────────────────────────────────────

function PlateauAlerts({ plateaus }: { plateaus: PlateauInfo[] }) {
  const active = plateaus.filter((p) => p.isPlateaued);
  if (active.length === 0) return null;

  return (
    <div className="card mb-6">
      <h3 className="mb-4">Plateau Alerts</h3>
      <div className="flex gap-3 flex-wrap justify-center">
        {active.map((p) => (
          <div
            key={p.lift}
            className="stat-card"
            style={{ borderLeft: '4px solid #ef5350', minWidth: '180px' }}
          >
            <div className="label">{liftLabel(p.lift)}</div>
            <div className="value" style={{ color: '#ef5350' }}>
              {p.weeksSincePR} weeks
            </div>
            <div className="text-xs opacity-60 mt-1">Since last PR</div>
            <div className="text-xs opacity-60">
              Slope: {p.slope > 0 ? '+' : ''}{p.slope} kg/session
            </div>
            <div className="text-xs opacity-60">Last PR: {p.lastPRDate}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 7. Strength Balance Ratios ──────────────────────────────

const RATIO_STATUS_COLORS: Record<string, string> = {
  balanced: '#66bb6a',
  lagging: '#ffa726',
  dominant: '#ef5350',
};

function StrengthBalanceTable({ ratios }: { ratios: StrengthRatio[] }) {
  if (ratios.length === 0) return null;

  return (
    <div className="card mb-6">
      <h3 className="mb-4">Strength Balance</h3>
      <p className="text-xs opacity-60 mb-3">How your lift ratios compare to competitive powerlifting norms. 'Lagging' means a lift is underdeveloped relative to your others.</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {ratios.map((r) => (
          <div key={r.name} className="rounded-lg p-3 border border-border text-center" style={{ minWidth: '140px', flex: '1 1 140px', maxWidth: '180px' }}>
            <div className="text-xs opacity-50 uppercase mb-1">{r.name}</div>
            <div className="text-lg font-bold">{r.actual} <span className="text-xs opacity-40">/ {r.target}</span></div>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="text-xs" style={{ color: RATIO_STATUS_COLORS[r.status] }}>
                {r.deviation > 0 ? '+' : ''}{r.deviation}%
              </span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: RATIO_STATUS_COLORS[r.status] + '20', color: RATIO_STATUS_COLORS[r.status] }}>
                {r.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 8. Weekly Muscle Volume ─────────────────────────────────

function getVolumeColor(volume: number, maxVolume: number): string {
  const ratio = volume / maxVolume;
  if (ratio > 0.75) return '#4caf50';
  if (ratio > 0.5) return '#66bb6a';
  if (ratio > 0.25) return '#81c784';
  return '#a5d6a7';
}

function WeeklyMuscleVolumeChart({ volumes }: { volumes: WeeklyMuscleVolume[] }) {
  const top15 = volumes.slice(0, 15);
  if (top15.length === 0) return null;

  const maxVolume = Math.max(...top15.map((v) => v.volume), 1);
  const barHeight = 24;
  const labelWidth = 110;
  const chartWidth = 400;
  const pctWidth = 80;
  const totalWidth = labelWidth + chartWidth + pctWidth;
  const totalHeight = top15.length * (barHeight + 6) + 10;

  return (
    <div className="card mb-6">
      <h3 className="mb-4">Weekly Muscle Volume</h3>
      <p className="text-xs opacity-60 mb-3">Volume distribution across muscle groups from the past 7 days. Helps identify underworked areas in your program.</p>
      <div className="overflow-x-auto">
        <svg width={totalWidth} height={totalHeight} style={{ fontSize: '11px' }}>
          {top15.map((v, i) => {
            const y = i * (barHeight + 6) + 4;
            const barW = Math.max((v.volume / maxVolume) * chartWidth, 2);
            return (
              <g key={v.muscle}>
                <text x={labelWidth - 6} y={y + barHeight / 2 + 4} textAnchor="end" fill="var(--color-text-secondary)">
                  {v.label}
                </text>
                <rect x={labelWidth} y={y} width={barW} height={barHeight} rx={3} fill={getVolumeColor(v.volume, maxVolume)} opacity={0.85} />
                <text x={labelWidth + barW + 6} y={y + barHeight / 2 + 4} fill="var(--color-text-muted)">
                  {(v.volume / 1000).toFixed(1)} tons
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── 9. Fatigue Reserve ──────────────────────────────────────

function FatigueReserveCard({ reserve }: { reserve: FatigueReserve }) {
  return (
    <div className="card mb-6">
      <h3 className="mb-4">Fatigue Reserve</h3>
      <p className="text-xs opacity-60 mb-3">How much room you have to increase training load before reaching your chronic baseline. Negative = you're exceeding your body's adapted capacity.</p>
      <div
        className="stat-card"
        style={{ borderLeft: `4px solid ${reserve.color}`, display: 'inline-block' }}
      >
        <div className="label">Reserve</div>
        <div className="value" style={{ color: reserve.color }}>
          {reserve.reserve > 0 ? '+' : ''}{reserve.reserve} tons
        </div>
        <div className="text-xs mt-1" style={{ color: reserve.color }}>
          {reserve.status}
        </div>
      </div>
    </div>
  );
}

// ─── 10. AMRAP Trends ────────────────────────────────────────

const AMRAP_TREND_COLORS: Record<string, string> = {
  improving: '#66bb6a',
  stable: '#ffa726',
  declining: '#ef5350',
};

const AMRAP_TREND_ARROWS: Record<string, string> = {
  improving: '\u2191',
  stable: '\u2192',
  declining: '\u2193',
};

function AmrapTrendCards({ trends }: { trends: AmrapTrend[] }) {
  if (trends.length === 0) return null;

  return (
    <div className="card mb-6">
      <h3 className="mb-4">AMRAP Trends</h3>
      <p className="text-xs opacity-60 mb-3">Rolling 7-day vs 21-day AMRAP rep average. When the short-term average exceeds the long-term, you're likely peaking.</p>
      <div className="flex gap-3 flex-wrap justify-center">
        {trends.map((t) => (
          <div key={t.lift} className="stat-card" style={{ minWidth: '160px' }}>
            <div className="label">{liftLabel(t.lift)}</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xl font-bold"
                style={{ color: AMRAP_TREND_COLORS[t.trending] }}
              >
                {AMRAP_TREND_ARROWS[t.trending]}
              </span>
              <span className="text-xs" style={{ color: AMRAP_TREND_COLORS[t.trending] }}>
                {t.trending.charAt(0).toUpperCase() + t.trending.slice(1)}
              </span>
            </div>
            <div className="text-xs opacity-60 mt-1">
              R7: {t.rolling7} reps | R21: {t.rolling21} reps
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 11. nSuns Compliance Summary ────────────────────────────

function ComplianceCards({ summary }: { summary: ComplianceSummary }) {
  if (summary.totalSessions === 0) return null;

  return (
    <div className="card mb-6">
      <h3 className="mb-4">nSuns Compliance</h3>
      <p className="text-xs opacity-60 mb-3">How closely you follow the nSuns program. T1 = primary compound, T2 = secondary. AMRAP effort = bonus reps on the '1+' set.</p>
      <div className="flex gap-3 flex-wrap justify-center">
        <div className="stat-card">
          <div className="label">Avg T1 Rate</div>
          <div className="value">{summary.avgT1Rate}%</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg T2 Rate</div>
          <div className="value">{summary.avgT2Rate}%</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg AMRAP Effort</div>
          <div className="value">{summary.avgAmrapEffort}x</div>
        </div>
        <div className="stat-card">
          <div className="label">Full Completion</div>
          <div className="value">{summary.fullCompletionRate}%</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Sessions</div>
          <div className="value">{summary.totalSessions}</div>
        </div>
      </div>
    </div>
  );
}

// ─── 12. PR Predictions ──────────────────────────────────────

function PRPredictionCards({ predictions }: { predictions: PRPrediction[] }) {
  if (predictions.length === 0) return null;

  return (
    <div className="card mb-6">
      <h3 className="mb-4">PR Predictions (30 days)</h3>
      <p className="text-xs opacity-60 mb-3">Based on current strength velocity for gaining lifts</p>
      <div className="flex gap-3 flex-wrap justify-center">
        {predictions.map((p) => (
          <div key={p.lift} className="stat-card" style={{ minWidth: '160px' }}>
            <div className="label">{liftLabel(p.lift)}</div>
            <div className="value" style={{ color: '#66bb6a' }}>
              {p.projected1RM} kg
            </div>
            <div className="text-xs opacity-60 mt-1">
              Current: {p.current1RM.toFixed(1)} kg
            </div>
            <div className="text-xs opacity-60">
              +{p.velocity} kg/mo
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function Analytics() {
  const { entries, loading } = useLifts();

  const readiness = useMemo(() => (entries.length > 0 ? calcReadiness(entries) : null), [entries]);
  const intensityBuckets = useMemo(() => getIntensityDistribution(entries), [entries]);
  const stimulusData = useMemo(() => getSessionStimulus(entries), [entries]);
  const liftFatigue = useMemo(() => getAllLiftFatigue(entries), [entries]);
  const velocities = useMemo(() => getAllStrengthVelocities(entries), [entries]);
  const plateaus = useMemo(() => detectPlateaus(entries), [entries]);
  const ratios = useMemo(() => getStrengthRatios(entries), [entries]);
  const muscleVolumes = useMemo(() => getWeeklyMuscleVolume(entries), [entries]);
  const fatigueReserve = useMemo(() => calcFatigueReserve(entries), [entries]);
  const amrapTrends = useMemo(() => getAmrapTrends(entries), [entries]);
  const compliance = useMemo(() => getComplianceSummary(entries), [entries]);
  const predictions = useMemo(() => {
    const T1 = ['bench', 'squat', 'deadlift', 'ohp'];
    return T1.map((l) => predictNextPR(entries, l)).filter((p): p is PRPrediction => p !== null);
  }, [entries]);

  if (loading) return <p className="text-text-muted">Loading...</p>;
  if (entries.length === 0) return <p>No data available.</p>;

  return (
    <div>
      <h2>Analytics Dashboard</h2>

      {readiness && <ReadinessCard readiness={readiness} />}

      <IntensityDistributionChart buckets={intensityBuckets} />

      {stimulusData.length > 0 && <StimulusTimeline data={stimulusData} />}

      <LiftFatigueCards fatigueData={liftFatigue} />

      <StrengthVelocityCards velocities={velocities} />

      <PlateauAlerts plateaus={plateaus} />

      <StrengthBalanceTable ratios={ratios} />

      <WeeklyMuscleVolumeChart volumes={muscleVolumes} />

      {fatigueReserve && <FatigueReserveCard reserve={fatigueReserve} />}

      <AmrapTrendCards trends={amrapTrends} />

      <ComplianceCards summary={compliance} />

      <PRPredictionCards predictions={predictions} />
    </div>
  );
}

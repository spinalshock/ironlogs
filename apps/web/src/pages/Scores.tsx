import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, RadialLinearScale,
  PointElement, LineElement, Filler, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';
import { useLifts, getBestRecentSets, getLatestBodyweight } from '../lib/useLifts';
import { calcLiftScore, calcOverallScore, SCORING_CATEGORIES } from '../lib/scoring';
import { getStrengthRatios } from '../lib/analytics';

ChartJS.register(CategoryScale, LinearScale, BarElement, RadialLinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend);

const LIFT_DISPLAY: Record<string, string> = {
  bench: 'Bench Press', squat: 'Back Squat', deadlift: 'Deadlift', ohp: 'Overhead Press',
  front_squat: 'Front Squat', incline_bench: 'Incline Bench', sumo_deadlift: 'Sumo Deadlift',
  chinup: 'Chin-up', pendlay_row: 'Pendlay Row',
};

const SCORED_LIFTS = ['squat', 'bench', 'deadlift', 'ohp'];

export default function Scores() {
  const { entries, loading } = useLifts();
  if (loading) return <p className="text-text-muted">Loading data...</p>;

  const bodyweight = getLatestBodyweight(entries);
  const bestSets = getBestRecentSets(entries);
  const liftScores = SCORED_LIFTS.filter((lift) => bestSets[lift]).map((lift) => {
    const best = bestSets[lift];
    return { lift, ...best, ...calcLiftScore(lift, best.estimated1RM, bodyweight) };
  });
  const overall = calcOverallScore(liftScores);
  const avgScore = overall.score;
  const deviations = liftScores.map((s) => avgScore > 0 ? Math.round(((s.score - avgScore) / avgScore) * 100) : 0);

  const barData = {
    labels: liftScores.map((s) => LIFT_DISPLAY[s.lift] || s.lift),
    datasets: [{ label: 'Relative Strength', data: deviations, backgroundColor: deviations.map((d) => (d >= 0 ? '#4a7c59' : '#a0524e')) }],
  };

  const categoryLabels = Object.keys(SCORING_CATEGORIES);
  const categoryScores = categoryLabels.map((cat) => {
    const lifts = SCORING_CATEGORIES[cat];
    return liftScores.filter((s) => lifts.includes(s.lift)).reduce((max, s) => Math.max(max, s.score), 0);
  });

  const radarData = {
    labels: categoryLabels,
    datasets: [{
      label: 'Strength Score', data: categoryScores,
      backgroundColor: 'rgba(121, 134, 203, 0.2)', borderColor: '#7986cb', borderWidth: 2,
      pointBackgroundColor: '#7986cb', pointBorderColor: '#fff', pointRadius: 4,
    }],
  };

  return (
    <div className="text-center">
      <h2>Strength Scores</h2>

      {/* Overall score hero */}
      <div
        className="rounded-xl p-6 mx-auto mb-6 max-w-[240px]"
        style={{
          background: `linear-gradient(135deg, ${overall.color}33, ${overall.color}11)`,
          border: `2px solid ${overall.color}`,
        }}
      >
        <div className="text-4xl font-bold" style={{ color: overall.color }}>{overall.score}</div>
        <div className="text-lg font-bold" style={{ color: overall.color }}>{overall.level}</div>
        <div className="text-sm mt-2 opacity-70">Overall Strength Score</div>
      </div>

      {/* 1RM cards */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {liftScores.map((s) => (
          <div key={s.lift} className="rounded-lg p-3 border border-border text-center" style={{ minWidth: '140px', flex: '1 1 140px', maxWidth: '180px' }}>
            <div className="text-xs opacity-50 uppercase mb-1">{LIFT_DISPLAY[s.lift] || s.lift}</div>
            <div className="text-lg font-bold">{s.estimated1RM.toFixed(1)}<span className="text-xs opacity-50 ml-0.5">kg</span></div>
            <div className="text-xs font-bold mt-0.5" style={{ color: s.color }}>{s.level} · {s.score}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 text-xs opacity-50">BW {bodyweight}kg · DOTS scoring · Wathan 1RM</div>

      <h4>Strength Profile</h4>
      <p className="text-sm opacity-75 mt-0">Balance across the 5 strength categories</p>
      <div className="max-w-[400px] mx-auto mb-8">
        <Radar data={radarData} options={{
          responsive: true,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${categoryLabels[ctx.dataIndex]}: ${ctx.raw}` } } },
          scales: { r: {
            beginAtZero: true, max: Math.max(125, ...categoryScores) + 10,
            ticks: { stepSize: 25, backdropColor: 'transparent', color: 'rgba(255,255,255,0.5)' },
            grid: { color: 'rgba(128,128,128,0.2)' }, angleLines: { color: 'rgba(128,128,128,0.2)' },
            pointLabels: { color: 'rgba(255,255,255,0.8)', font: { size: 12 } },
          } },
        }} />
      </div>

      <h4>Relative Strengths & Weaknesses</h4>
      <p className="text-sm opacity-75 mt-0">How each lift compares to your average</p>
      <Bar data={barData} options={{
        responsive: true, indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: (ctx) => `${(ctx.raw as number) >= 0 ? '+' : ''}${ctx.raw}%`,
          afterLabel: (ctx) => { const s = liftScores[ctx.dataIndex]; return `Score: ${s.score} [${s.level}]\n1RM: ${s.estimated1RM.toFixed(1)}kg`; },
        } } },
        scales: {
          x: { min: -25, max: 20,
            grid: { color: (ctx) => ctx.tick.value === 0 ? 'rgba(100,100,255,0.5)' : 'rgba(128,128,128,0.2)', lineWidth: (ctx) => ctx.tick.value === 0 ? 2 : 1 },
            ticks: { callback: (v) => `${Number(v) >= 0 ? '+' : ''}${v}%`, stepSize: 5 } },
          y: { grid: { display: false } },
        },
      }} />

      <StrengthBalanceRatios entries={entries} />
    </div>
  );
}

function StrengthBalanceRatios({ entries }: { entries: import('../lib/types').LiftEntry[] }) {
  const ratios = getStrengthRatios(entries);
  if (ratios.length === 0) return null;

  const statusColor: Record<string, string> = { balanced: '#66bb6a', lagging: '#ef5350', dominant: '#ffa726' };

  return (
    <div className="mt-6">
      <h4>Strength Balance</h4>
      <div className="flex flex-wrap gap-2 justify-center">
        {ratios.map((r) => (
          <div key={r.name} className="rounded-lg p-3 border border-border text-center" style={{ minWidth: '140px', flex: '1 1 140px', maxWidth: '180px' }}>
            <div className="text-xs opacity-50 uppercase mb-1">{r.name}</div>
            <div className="text-lg font-bold">{r.actual} <span className="text-xs opacity-40">/ {r.target}</span></div>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="text-xs" style={{ color: statusColor[r.status] }}>
                {r.deviation > 0 ? '+' : ''}{r.deviation}%
              </span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: statusColor[r.status] + '22', color: statusColor[r.status] }}>
                {r.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Chart as ChartJS, LinearScale, PointElement, LineElement, TimeScale, Title, Tooltip, Legend, Filler } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Line } from 'react-chartjs-2';
import { useLifts, get1RMProgression, findPRs, getUniqueLifts } from '../lib/useLifts';
import { getStrengthVelocity, predictNextPR, detectPlateaus } from '../lib/analytics';

ChartJS.register(LinearScale, TimeScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const LIFT_LABELS: Record<string, string> = { bench: 'Bench Press', squat: 'Back Squat', deadlift: 'Deadlift', ohp: 'Overhead Press' };

export default function Progression() {
  const { entries, loading } = useLifts();
  const [selectedLift, setSelectedLift] = useState('bench');
  if (loading) return <p className="text-text-muted">Loading...</p>;

  const lifts = getUniqueLifts(entries);
  const progression = get1RMProgression(entries, selectedLift);
  const prs = findPRs(entries, selectedLift);
  const velocity = getStrengthVelocity(entries, selectedLift);
  const prediction = predictNextPR(entries, selectedLift, 30);
  const plateau = detectPlateaus(entries).find((p) => p.lift === selectedLift);

  const data = {
    datasets: [{
      label: `${LIFT_LABELS[selectedLift] || selectedLift} - Est. 1RM (kg)`,
      data: progression.map((p) => ({ x: p.date, y: Math.round(p.estimated1RM * 10) / 10 })),
      borderColor: '#1abc9c', backgroundColor: 'rgba(26, 188, 156, 0.1)', fill: true, tension: 0.3,
      pointRadius: progression.map((p) => (prs.has(p.date) ? 8 : 4)),
      pointBackgroundColor: progression.map((p) => prs.has(p.date) ? '#f1c40f' : '#1abc9c'),
      pointBorderColor: progression.map((p) => prs.has(p.date) ? '#e67e22' : '#16a085'),
      pointBorderWidth: progression.map((p) => (prs.has(p.date) ? 3 : 1)),
    }],
  };

  return (
    <div>
      <h2>Lift Progression</h2>
      <div className="mb-4">
        <label htmlFor="lift-select" className="mr-2 font-bold">Select Lift:</label>
        <select id="lift-select" value={selectedLift} onChange={(e) => setSelectedLift(e.target.value)} className="input-field w-auto">
          {lifts.map((l) => <option key={l} value={l}>{LIFT_LABELS[l] || l}</option>)}
        </select>
      </div>
      <div className="flex gap-4 items-center flex-wrap mb-3">
        <div className="text-sm text-text-secondary">
          <span className="text-lg" style={{ color: '#f1c40f' }}>&#9679;</span> = Personal Record
        </div>
        {velocity && (
          <span className="text-xs font-medium px-2 py-1 rounded-full"
            style={{ backgroundColor: velocity.trend === 'gaining' ? '#66bb6a22' : velocity.trend === 'plateau' ? '#ffa72622' : '#ef535022',
                     color: velocity.trend === 'gaining' ? '#66bb6a' : velocity.trend === 'plateau' ? '#ffa726' : '#ef5350' }}>
            {velocity.velocity >= 0 ? '+' : ''}{velocity.velocity} kg/month
          </span>
        )}
        {plateau?.isPlateaued && (
          <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: '#ffa72622', color: '#ffa726' }}>
            Plateau ({plateau.weeksSincePR}w since PR)
          </span>
        )}
        {prediction && velocity?.trend === 'gaining' && (
          <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: '#42a5f522', color: '#42a5f5' }}>
            Projected: {prediction.projected1RM}kg in 30d
          </span>
        )}
      </div>
      <Line data={data} options={{
        responsive: true,
        plugins: { legend: { display: true }, tooltip: { callbacks: { afterLabel: (ctx: any) => {
          const p = progression[ctx.dataIndex];
          let label = `Best set: ${p.weight}kg x ${p.reps}`;
          if (prs.has(p.date)) label += '\nNEW PERSONAL RECORD!';
          return label;
        } } } },
        scales: {
          y: { title: { display: true, text: 'Estimated 1RM (kg)' }, beginAtZero: false },
          x: { type: 'time' as const, time: { unit: 'day' as const, tooltipFormat: 'yyyy-MM-dd' }, title: { display: true, text: 'Date' } },
        },
      }} />
      {progression.length > 0 && (
        <div className="mt-4">
          <h4>Session Log</h4>
          <table>
            <thead><tr><th>Date</th><th>Best Set</th><th>Est. 1RM</th><th>PR</th></tr></thead>
            <tbody>{progression.map((p) => (
              <tr key={p.date}>
                <td>{p.date}</td>
                <td>{p.weight}kg x {p.reps}</td>
                <td>{p.estimated1RM.toFixed(1)}kg</td>
                <td>{prs.has(p.date) ? 'PR' : ''}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

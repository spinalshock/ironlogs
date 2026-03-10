import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useLifts, getBodyweightProgression } from '../lib/useLifts';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function calc7DayMA(data: { date: string; bodyweight: number }[]): (number | null)[] {
  return data.map((_, i) => {
    const window = data.slice(Math.max(0, i - 6), i + 1);
    if (window.length < 2) return null;
    const avg = window.reduce((s, d) => s + d.bodyweight, 0) / window.length;
    return Math.round(avg * 100) / 100;
  });
}

export default function Bodyweight() {
  const { entries, loading } = useLifts();
  if (loading) return <p className="text-text-muted">Loading...</p>;

  const progression = getBodyweightProgression(entries);
  if (progression.length === 0) return <p>No bodyweight data recorded yet.</p>;

  const weights = progression.map((p) => p.bodyweight);
  const ma7 = calc7DayMA(progression);
  const min = Math.min(...weights);
  const max = Math.max(...weights);

  const data = {
    labels: progression.map((p) => p.date),
    datasets: [
      {
        label: 'Bodyweight (kg)',
        data: weights,
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
      },
      {
        label: '7-day Moving Avg',
        data: ma7,
        borderColor: 'rgba(231, 76, 60, 0.5)',
        borderDash: [5, 5],
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        spanGaps: true,
      },
    ],
  };

  return (
    <div>
      <h2>Bodyweight</h2>
      <div className="flex gap-8 flex-wrap mb-4 text-sm">
        <div><strong>Current:</strong> {weights[weights.length - 1]}kg</div>
        <div><strong>Lowest:</strong> {min}kg</div>
        <div><strong>Highest:</strong> {max}kg</div>
        <div><strong>Change:</strong> {weights.length > 1 ? `${(weights[weights.length - 1] - weights[0]).toFixed(1)}kg` : 'N/A'}</div>
      </div>
      <Line data={data} options={{
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          y: { title: { display: true, text: 'Bodyweight (kg)' }, min: Math.floor(min - 2), max: Math.ceil(max + 2) },
          x: { title: { display: true, text: 'Date' } },
        },
      }} />
    </div>
  );
}

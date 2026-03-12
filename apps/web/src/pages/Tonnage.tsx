import { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useLifts, groupByDay, getAllUniqueLifts } from '../lib/useLifts';
import { LIFT_LABELS, LIFT_COLORS } from '../lib/liftMeta';
import type { DaySession } from '../lib/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

function fmt(kg: number) { return (kg / 1000).toFixed(2); }

export default function Tonnage() {
  const { entries, loading } = useLifts();
  const [viewMode, setViewMode] = useState<'total' | 'per-lift'>('total');
  const [selectedLift, setSelectedLift] = useState('');

  if (loading) return <p className="text-text-muted">Loading...</p>;
  const sessions = groupByDay(entries);
  if (sessions.length === 0) return <p>No session data.</p>;
  const allLifts = getAllUniqueLifts(entries);

  // Auto-select first lift if none selected
  if (!selectedLift && allLifts.length > 0 && viewMode === 'per-lift') {
    setSelectedLift(allLifts[0]);
  }

  if (viewMode === 'total') {
    const data = {
      labels: sessions.map((s) => s.date),
      datasets: [{
        label: 'Total Tonnage (tons)',
        data: sessions.map((s) => +(s.tonnage / 1000).toFixed(2)),
        backgroundColor: 'rgba(26, 188, 156, 0.7)', borderColor: '#1abc9c', borderWidth: 1,
      }],
    };
    return (
      <div>
        <h2>Tonnage</h2>
        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
        <Bar data={data} options={{
          responsive: true,
          plugins: { legend: { display: true }, tooltip: { callbacks: {
            afterBody: (items) => {
              const session = sessions[items[0].dataIndex];
              return Object.entries(session.liftTonnage).map(([lift, t]) => `  ${LIFT_LABELS[lift] || lift}: ${fmt(t)} tons`).join('\n');
            },
          } } },
          scales: {
            y: { title: { display: true, text: 'Tonnage (tons)' }, beginAtZero: true },
            x: { title: { display: true, text: 'Date' } },
          },
        }} />
        <SessionTable sessions={sessions} />
      </div>
    );
  }

  // Per-lift view: only sessions that include the selected lift
  const lift = selectedLift || allLifts[0];
  const liftSessions = sessions.filter((s) => (s.liftTonnage[lift] || 0) > 0);
  const liftColor = LIFT_COLORS[lift] || '#95a5a6';

  const data = {
    labels: liftSessions.map((s) => s.date),
    datasets: [{
      label: `${LIFT_LABELS[lift] || lift} Tonnage (tons)`,
      data: liftSessions.map((s) => +((s.liftTonnage[lift] || 0) / 1000).toFixed(2)),
      backgroundColor: liftColor + 'bb',
      borderColor: liftColor,
      borderWidth: 1,
    }],
  };

  // Stats for selected lift
  const tonnages = liftSessions.map((s) => s.liftTonnage[lift] || 0);
  const totalTonnage = tonnages.reduce((a, b) => a + b, 0);
  const avgTonnage = tonnages.length > 0 ? totalTonnage / tonnages.length : 0;
  const maxTonnage = Math.max(...tonnages, 0);

  return (
    <div>
      <h2>Tonnage</h2>
      <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />

      <div className="mb-4">
        <label htmlFor="lift-select" className="mr-2 font-bold">Select Lift:</label>
        <select
          id="lift-select"
          value={lift}
          onChange={(e) => setSelectedLift(e.target.value)}
          className="input-field w-auto"
        >
          {allLifts.map((l) => (
            <option key={l} value={l}>{LIFT_LABELS[l] || l}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-6 mb-4 flex-wrap">
        <div className="stat-card">
          <div className="label">Sessions</div>
          <div className="value">{liftSessions.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg Tonnage</div>
          <div className="value">{(avgTonnage / 1000).toFixed(2)}<span className="text-sm font-medium text-text-secondary"> tons</span></div>
        </div>
        <div className="stat-card">
          <div className="label">Peak Tonnage</div>
          <div className="value">{(maxTonnage / 1000).toFixed(2)}<span className="text-sm font-medium text-text-secondary"> tons</span></div>
        </div>
        <div className="stat-card">
          <div className="label">Total</div>
          <div className="value">{(totalTonnage / 1000).toFixed(1)}<span className="text-sm font-medium text-text-secondary"> tons</span></div>
        </div>
      </div>

      <Bar data={data} options={{
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          afterBody: (items) => {
            const session = liftSessions[items[0].dataIndex];
            const sets = session.lifts.filter((l) => l.lift === lift || l.lift.toLowerCase().replace(/\s+/g, '_') === lift);
            return sets.map((s) => `  ${s.weight}kg x ${s.reps} (${s.set_type})`).join('\n');
          },
        } } },
        scales: {
          y: { title: { display: true, text: `${LIFT_LABELS[lift] || lift} Tonnage (tons)` }, beginAtZero: true },
          x: { title: { display: true, text: 'Date' } },
        },
      }} />

      <LiftSessionTable sessions={liftSessions} lift={lift} />
    </div>
  );
}

function ViewToggle({ viewMode, setViewMode }: { viewMode: 'total' | 'per-lift'; setViewMode: (v: 'total' | 'per-lift') => void }) {
  return (
    <div className="flex gap-2 mb-4">
      {(['total', 'per-lift'] as const).map((mode) => (
        <button key={mode} onClick={() => setViewMode(mode)} className={mode === viewMode ? 'btn-primary' : 'btn-secondary'}>
          {mode === 'total' ? 'Total' : 'Per Lift'}
        </button>
      ))}
    </div>
  );
}

function SessionTable({ sessions }: { sessions: DaySession[] }) {
  return (
    <div className="mt-4">
      <h4>Session Tonnage</h4>
      <table>
        <thead><tr><th>Date</th><th>Total</th><th>Breakdown</th></tr></thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.date}>
              <td>{s.date}</td>
              <td><strong>{(s.tonnage / 1000).toFixed(1)} tons</strong></td>
              <td className="text-sm">
                {Object.entries(s.liftTonnage).map(([lift, t]) => `${LIFT_LABELS[lift] || lift}: ${(t / 1000).toFixed(2)} tons`).join(' | ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LiftSessionTable({ sessions, lift }: { sessions: DaySession[]; lift: string }) {
  return (
    <div className="mt-4">
      <h4>{LIFT_LABELS[lift] || lift} Sessions</h4>
      <table>
        <thead><tr><th>Date</th><th>Tonnage</th><th>Sets</th><th>Top Set</th></tr></thead>
        <tbody>
          {[...sessions].reverse().map((s) => {
            const sets = s.lifts.filter((l) => l.lift === lift || l.lift.toLowerCase().replace(/\s+/g, '_') === lift);
            const topSet = sets.reduce((best, curr) => curr.weight > best.weight ? curr : best, sets[0]);
            return (
              <tr key={s.date}>
                <td>{s.date}</td>
                <td><strong>{((s.liftTonnage[lift] || 0) / 1000).toFixed(2)} tons</strong></td>
                <td>{sets.length}</td>
                <td>{topSet ? `${topSet.weight}kg x ${topSet.reps}` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { useLifts } from '../lib/useLifts';
import { normalizeLiftName } from '../lib/scoring';
import { LIFT_LABELS_SHORT as LIFT_LABELS, LIFT_COLORS } from '../lib/liftMeta';
import type { LiftEntry } from '../lib/types';

interface AmrapSet {
  date: string; lift: string; weight: number; reps: number;
  programmedMin: number; surplus: number; variant: string;
}

function parseAmraps(entries: LiftEntry[]): AmrapSet[] {
  return entries
    .filter((e) => e.set_type === 't1_amrap' && e.notes)
    .map((e) => {
      const match = e.notes.match(/programmed\s+(\d+)\+/);
      if (!match) return null;
      const programmedMin = parseInt(match[1]);
      return { date: e.date, lift: normalizeLiftName(e.lift), weight: e.weight, reps: e.reps, programmedMin, surplus: e.reps - programmedMin, variant: `${match[1]}+` };
    })
    .filter((a): a is AmrapSet => a !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function SurplusBadge({ surplus }: { surplus: number }) {
  const color = surplus > 3 ? '#81c784' : surplus > 0 ? '#ffd54f' : surplus === 0 ? '#ffb74d' : '#ef5350';
  return (
    <span className="inline-block px-2 py-0.5 rounded text-sm font-bold text-center min-w-[2.5rem]"
      style={{ backgroundColor: color + '22', color }}>
      {surplus > 0 ? `+${surplus}` : `${surplus}`}
    </span>
  );
}

function RepBar({ reps, programmedMin, maxReps }: { reps: number; programmedMin: number; maxReps: number }) {
  const pct = maxReps > 0 ? (reps / maxReps) * 100 : 0;
  const minPct = maxReps > 0 ? (programmedMin / maxReps) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-5 flex-1 rounded overflow-hidden" style={{ backgroundColor: 'rgba(128,128,128,0.15)' }}>
        <div className="absolute left-0 top-0 h-full rounded transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: reps >= programmedMin ? 'rgba(76,175,80,0.5)' : 'rgba(233,30,99,0.5)' }} />
        <div className="absolute top-0 h-full w-0.5" style={{ left: `${minPct}%`, backgroundColor: 'rgba(255,255,255,0.5)' }} />
      </div>
      <span className="text-sm font-bold min-w-[1.5rem] text-right">{reps}</span>
    </div>
  );
}

export default function Amrap() {
  const { entries, loading } = useLifts();
  if (loading) return <p className="text-text-muted">Loading...</p>;

  const amraps = parseAmraps(entries);
  if (amraps.length === 0) return <p>No AMRAP data found.</p>;

  const byDate = new Map<string, AmrapSet[]>();
  for (const a of amraps) { const list = byDate.get(a.date) || []; list.push(a); byDate.set(a.date, list); }

  const heavyAmraps = amraps.filter((a) => a.variant === '1+' || a.variant === '3+');
  const backoffAmraps = amraps.filter((a) => a.variant === '5+' || a.variant === '8+');
  const avgHeavy = heavyAmraps.length > 0 ? (heavyAmraps.reduce((s, a) => s + a.surplus, 0) / heavyAmraps.length).toFixed(1) : '0';
  const avgBackoff = backoffAmraps.length > 0 ? (backoffAmraps.reduce((s, a) => s + a.surplus, 0) / backoffAmraps.length).toFixed(1) : '0';
  const maxReps = Math.max(...amraps.map((a) => a.reps));

  return (
    <div>
      <h2>AMRAP Tracker</h2>
      <div className="flex gap-6 mb-6 flex-wrap">
        <div className="stat-card"><div className="label">Heavy AMRAP avg surplus</div><div className="value">+{avgHeavy}</div><div className="sub">reps above min (1+/3+)</div></div>
        <div className="stat-card"><div className="label">Back-off avg surplus</div><div className="value">+{avgBackoff}</div><div className="sub">reps above min (5+/8+)</div></div>
        <div className="stat-card"><div className="label">Total AMRAPs</div><div className="value">{amraps.length}</div><div className="sub">{byDate.size} sessions</div></div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Lift</th><th>Set</th><th>Weight</th><th style={{ width: '30%' }}>Reps</th><th>Surplus</th></tr></thead>
        <tbody>
          {Array.from(byDate.entries()).reverse().map(([date, sets]) =>
            sets.map((a, i) => (
              <tr key={`${date}-${i}`}>
                {i === 0 ? <td rowSpan={sets.length} className="font-bold align-top">{date}</td> : null}
                <td><span style={{ color: LIFT_COLORS[a.lift] || '#999' }}>{LIFT_LABELS[a.lift] || a.lift}</span></td>
                <td>{a.variant}</td><td>{a.weight}kg</td>
                <td><RepBar reps={a.reps} programmedMin={a.programmedMin} maxReps={maxReps} /></td>
                <td><SurplusBadge surplus={a.surplus} /></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

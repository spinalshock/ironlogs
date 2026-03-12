import { useState } from 'react';
import { useLifts, groupByDay } from '../lib/useLifts';
import { normalizeLiftName } from '../lib/scoring';
import { LIFT_LABELS_SHORT as LIFT_LABELS, LIFT_COLORS } from '../lib/liftMeta';

function getExpectedT2(t1Lift: string, hasOneRepAmrap: boolean): string | null {
  switch (t1Lift) {
    case 'ohp': return 'incline_bench';
    case 'squat': return 'sumo_deadlift';
    case 'deadlift': return 'front_squat';
    case 'bench': return hasOneRepAmrap ? 'cgbench' : 'ohp';
    default: return null;
  }
}

function getDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
}

function isFailedSet(notes: string): boolean {
  if (!notes) return false;
  const n = notes.toLowerCase();
  return /failed/.test(n) || /got \d+/.test(n);
}

function SessionCard({ session }: { session: ReturnType<typeof groupByDay>[0] }) {
  const [expanded, setExpanded] = useState(false);

  const t1Lifts = session.lifts.filter((l) => l.set_type === 't1' || l.set_type === 't1_amrap' || l.set_type === 'testing');
  const t2Lifts = session.lifts.filter((l) => l.set_type === 't2');

  const liftSetCounts = new Map<string, { count: number; type: string }>();
  for (const l of session.lifts) {
    const name = normalizeLiftName(l.lift);
    const existing = liftSetCounts.get(name);
    if (!existing) liftSetCounts.set(name, { count: 1, type: l.set_type === 't2' ? 't2' : 't1' });
    else existing.count++;
  }

  const topSets = (lifts: typeof session.lifts) => {
    const map = new Map<string, { weight: number; reps: number }>();
    for (const l of lifts) {
      const name = normalizeLiftName(l.lift);
      const ex = map.get(name);
      if (!ex || l.weight > ex.weight || (l.weight === ex.weight && l.reps > ex.reps)) {
        map.set(name, { weight: l.weight, reps: l.reps });
      }
    }
    return map;
  };

  const t1TopSets = topSets(t1Lifts);
  const t2TopSets = topSets(t2Lifts);

  const programmedT1Lifts = new Set(session.lifts.filter((l) => l.set_type === 't1' || l.set_type === 't1_amrap').map((l) => normalizeLiftName(l.lift)));
  const hasOnePlusAmrap = session.lifts.some((l) => l.set_type === 't1_amrap' && /programmed\s+1\+/.test(l.notes));
  let t2Skipped: string | null = null;
  if (programmedT1Lifts.size > 0) {
    const mainT1 = Array.from(programmedT1Lifts)[0];
    const expectedT2 = getExpectedT2(mainT1, hasOnePlusAmrap);
    if (expectedT2 && !t2TopSets.has(expectedT2)) t2Skipped = expectedT2;
  }

  const failedSets = session.lifts.filter((l) => isFailedSet(l.notes)).map((l) => ({ lift: normalizeLiftName(l.lift), weight: l.weight, reps: l.reps, note: l.notes.trim() }));
  const notes = session.lifts.filter((l) => l.notes && l.notes.trim() && !isFailedSet(l.notes)).map((l) => ({
    lift: normalizeLiftName(l.lift), label: LIFT_LABELS[normalizeLiftName(l.lift)] || l.lift,
    weight: l.weight, reps: l.reps, note: l.notes.trim(),
  }));

  const dayShort = getDayOfWeek(session.date).slice(0, 3);
  const dateShort = session.date.slice(5); // "03-10"

  return (
    <div className="p-3 rounded-lg border border-border cursor-pointer transition-colors" onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start gap-3">
        {/* Date column */}
        <div className="shrink-0 text-center" style={{ minWidth: '2.5rem' }}>
          <div className="text-xs opacity-50 uppercase">{dayShort}</div>
          <div className="font-bold text-sm">{dateShort}</div>
        </div>

        {/* Lifts */}
        <div className="flex-1 min-w-0">
          <div className="flex gap-1.5 flex-wrap">
            {Array.from(liftSetCounts.entries()).map(([lift, info]) => (
              <span key={lift} className="text-xs" style={{ color: LIFT_COLORS[lift] || '#999' }}>
                {info.count}x {LIFT_LABELS[lift] || lift}
              </span>
            ))}
          </div>
        </div>

        {/* Tonnage + chevron */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="opacity-50 text-xs">{(session.tonnage / 1000).toFixed(1)} tons</span>
          <svg className={`w-3.5 h-3.5 opacity-40 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
      </div>

      {expanded && (
        <div className="mt-3">
          {t1TopSets.size > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              <span className="text-xs opacity-50 self-center mr-1">T1</span>
              {Array.from(t1TopSets.entries()).map(([lift, top]) => (
                <span key={lift} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm"
                  style={{ backgroundColor: (LIFT_COLORS[lift] || '#888') + '22', color: LIFT_COLORS[lift] || '#ccc' }}>
                  <strong>{LIFT_LABELS[lift] || lift}</strong>
                  <span className="opacity-75">{top.weight}kg x {top.reps}</span>
                </span>
              ))}
            </div>
          )}
          {t2TopSets.size > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              <span className="text-xs opacity-50 self-center mr-1">T2</span>
              {Array.from(t2TopSets.entries()).map(([lift, top]) => (
                <span key={lift} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm opacity-80"
                  style={{ backgroundColor: (LIFT_COLORS[lift] || '#888') + '15', color: LIFT_COLORS[lift] || '#ccc' }}>
                  <strong>{LIFT_LABELS[lift] || lift}</strong>
                  <span className="opacity-75">{top.weight}kg x {top.reps}</span>
                </span>
              ))}
            </div>
          )}
          {t2Skipped && (
            <div className="flex gap-2 flex-wrap mb-2">
              <span className="text-xs opacity-50 self-center mr-1">T2</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm" style={{ backgroundColor: '#f4433615', color: '#ef9a9a' }}>
                {LIFT_LABELS[t2Skipped] || t2Skipped} <span className="opacity-70">skipped</span>
              </span>
            </div>
          )}
          {(failedSets.length > 0 || notes.length > 0) && (
            <div className="border-t border-border pt-2">
              {failedSets.map((f, i) => (
                <div key={`fail-${i}`} className="text-sm py-0.5" style={{ color: '#ef9a9a' }}>
                  <span className="mr-2">{LIFT_LABELS[f.lift] || f.lift} {f.weight}kg x {f.reps}</span>{f.note}
                </div>
              ))}
              {notes.map((n, i) => (
                <div key={i} className="text-sm opacity-80 py-0.5">
                  <span className="mr-2" style={{ color: LIFT_COLORS[n.lift] || '#999' }}>{n.label} {n.weight}kg x {n.reps}</span>{n.note}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Journal() {
  const { entries, loading } = useLifts();
  if (loading) return <p className="text-text-muted">Loading...</p>;
  const sessions = groupByDay(entries).reverse();

  return (
    <div>
      <h2>Session Journal</h2>
      <div className="flex flex-col gap-3">
        {sessions.map((session) => <SessionCard key={session.date} session={session} />)}
      </div>
    </div>
  );
}

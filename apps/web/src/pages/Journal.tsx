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

/**
 * Parse plan info from notes. Returns { plan, remaining } where plan is the
 * programmed weight×reps string (for display) and remaining is leftover note text.
 *
 * Patterns handled:
 *   "programmed 1+"          → AMRAP target: plan="1+"
 *   "programmed 25x5"        → plan="25kg × 5"
 *   "programmed 25"          → plan="25kg"
 *   "programmed 6 got 5"     → plan="× 6", remaining="got 5"
 *   "programmed 35x8+ did 30x8" → plan="35kg × 8+", remaining="did 30x8"
 */
function parsePlan(notes: string, _isAmrap: boolean): { plan: string | null; amrapTarget: number | null; remaining: string } {
  if (!notes) return { plan: null, amrapTarget: null, remaining: '' };
  const trimmed = notes.trim();

  // AMRAP: "programmed 1+", "programmed 5+"
  const amrapMatch = trimmed.match(/^programmed\s+(\d+)\+(.*)$/);
  if (amrapMatch) {
    return { plan: `${amrapMatch[1]}+`, amrapTarget: parseInt(amrapMatch[1]), remaining: amrapMatch[2].trim() };
  }

  // Weight x reps with +: "programmed 35x8+ did 30x8"
  const wxrPlusMatch = trimmed.match(/^programmed\s+(\d+)x(\d+)\+\s*(.*)$/);
  if (wxrPlusMatch) {
    return { plan: `${wxrPlusMatch[1]}kg \u00d7 ${wxrPlusMatch[2]}+`, amrapTarget: null, remaining: wxrPlusMatch[3].trim() };
  }

  // Weight x reps: "programmed 25x5"
  const wxrMatch = trimmed.match(/^programmed\s+(\d+)x(\d+)\s*(.*)$/);
  if (wxrMatch) {
    return { plan: `${wxrMatch[1]}kg \u00d7 ${wxrMatch[2]}`, amrapTarget: null, remaining: wxrMatch[3].trim() };
  }

  // Reps only with outcome: "programmed 6 got 5"
  const repsGotMatch = trimmed.match(/^programmed\s+(\d+)\s+(got\s+.*)$/);
  if (repsGotMatch) {
    return { plan: `\u00d7 ${repsGotMatch[1]}`, amrapTarget: null, remaining: repsGotMatch[2].trim() };
  }

  // Weight only: "programmed 25"
  const weightMatch = trimmed.match(/^programmed\s+(\d+)\s*$/);
  if (weightMatch) {
    return { plan: `${weightMatch[1]}kg`, amrapTarget: null, remaining: '' };
  }

  // Freeform "programmed" note we can't parse — show as note
  if (/^programmed/i.test(trimmed)) {
    return { plan: null, amrapTarget: null, remaining: trimmed.replace(/^programmed\s*/i, '') };
  }

  return { plan: null, amrapTarget: null, remaining: trimmed };
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

  const dayShort = getDayOfWeek(session.date).slice(0, 3);
  const dateShort = session.date.slice(5);

  // Build table data: group sets by lift, track set # per lift
  const buildTableRows = () => {
    const liftSetNum = new Map<string, number>();
    return session.lifts.map((l, i) => {
      const name = normalizeLiftName(l.lift);
      const num = (liftSetNum.get(name) || 0) + 1;
      liftSetNum.set(name, num);
      const prevName = i > 0 ? normalizeLiftName(session.lifts[i - 1].lift) : null;
      const isAmrap = l.set_type === 't1_amrap';
      const typeLabel =
        l.set_type === 't2' ? 'T2' :
        l.set_type === 'accessory' ? 'ACC' :
        l.set_type === 'testing' ? 'TEST' : '';
      return { entry: l, name, num, isFirstOfLift: name !== prevName, isAmrap, typeLabel };
    });
  };

  return (
    <div className="p-3 rounded-lg border border-border transition-colors">
      <div className="flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
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
          {/* T1/T2 top set summary badges */}
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

          {/* Full session log */}
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr className="text-xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}>
                <th className="text-center font-normal py-1.5" style={{ width: '8%' }}>#</th>
                <th className="text-center font-normal py-1.5" style={{ width: '27%' }}>Lift</th>
                <th className="text-center font-normal py-1.5" style={{ width: '17%' }}>Weight</th>
                <th className="text-center font-normal py-1.5" style={{ width: '15%' }}>Reps</th>
                <th className="text-center font-normal py-1.5" style={{ width: '33%' }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {buildTableRows().map((row, i) => {
                const { entry: l, name, num, isFirstOfLift, isAmrap, typeLabel } = row;
                const { amrapTarget, remaining } = parsePlan(l.notes, isAmrap);
                const surplus = amrapTarget !== null ? l.reps - amrapTarget : null;
                const failed = isFailedSet(l.notes);

                return (
                  <tr key={i} style={isFirstOfLift && i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.08)' } : undefined}>
                    <td className="py-0.5 text-center text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.3)' }}>{num}</td>
                    <td className="py-0.5 text-center" style={{ color: LIFT_COLORS[name] || '#ccc' }}>
                      {isFirstOfLift ? (
                        <>
                          <span className="font-medium">{LIFT_LABELS[name] || name}</span>
                          {typeLabel && <span className="text-xs ml-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{typeLabel}</span>}
                        </>
                      ) : null}
                    </td>
                    <td
                      className={`py-0.5 tabular-nums text-center whitespace-nowrap${isAmrap ? ' font-semibold' : ''}`}
                      style={failed ? { color: '#ef9a9a' } : undefined}
                    >
                      {l.weight}kg
                    </td>
                    <td
                      className={`py-0.5 tabular-nums text-center${isAmrap ? ' font-semibold' : ''}`}
                      style={failed ? { color: '#ef9a9a' } : undefined}
                    >
                      {l.reps}
                    </td>
                    <td className="py-0.5 text-center text-xs">
                      {isAmrap && amrapTarget !== null && (
                        <span
                          className="font-medium"
                          style={{ color: surplus !== null && surplus > 0 ? '#66bb6a' : surplus !== null && surplus < 0 ? '#ef9a9a' : '#ffca28' }}
                        >
                          {amrapTarget}+
                          {surplus !== null && surplus !== 0 && (
                            <span className="ml-0.5">({surplus > 0 ? '+' : ''}{surplus})</span>
                          )}
                        </span>
                      )}
                      {failed && <span style={{ color: '#ef9a9a' }} className="font-medium">failed </span>}
                      {remaining && !failed && (
                        <span className={`${isAmrap && amrapTarget !== null ? 'ml-1.5 ' : ''}`} style={{ color: 'rgba(255,255,255,0.55)' }}>{remaining}</span>
                      )}
                      {failed && remaining && (
                        <span className="ml-1" style={{ color: 'rgba(255,255,255,0.55)' }}>{remaining.replace(/failed\s*/i, '')}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const JOURNAL_PAGE_SIZE = 40;

export default function Journal() {
  const { entries, loading } = useLifts();
  const [visibleCount, setVisibleCount] = useState(JOURNAL_PAGE_SIZE);
  if (loading) return <p className="text-text-muted">Loading...</p>;
  const sessions = groupByDay(entries).reverse();
  const visible = sessions.slice(0, visibleCount);

  return (
    <div>
      <h2>Session Journal</h2>
      <div className="flex flex-col gap-3">
        {visible.map((session) => <SessionCard key={session.date} session={session} />)}
      </div>
      {visibleCount < sessions.length && (
        <button className="mt-4 w-full text-sm py-2 opacity-60 hover:opacity-100" onClick={() => setVisibleCount((c) => c + JOURNAL_PAGE_SIZE)}>
          Load more ({sessions.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}

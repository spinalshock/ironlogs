import { useState, useEffect } from 'react';
import { useLifts, groupByDay, get1RMProgression, getLatestBodyweight } from '../lib/useLifts';
import { estimate1RM, normalizeLiftName, calcLiftScore } from '../lib/scoring';
import { calcLiftFatigue } from '../lib/analytics';

interface ProgramSet { weight: number; reps: string | number; }
interface ProgramLift { lift: string; sets: ProgramSet[]; }
interface ProgramDay { name: string; label: string; t1: ProgramLift; t2: ProgramLift; accessories: string[]; }

const LIFT_LABELS: Record<string, string> = {
  bench: 'Bench Press', squat: 'Squat', deadlift: 'Deadlift', ohp: 'Overhead Press',
  cgbench: 'Close Grip Bench', incline_bench: 'Incline Bench', front_squat: 'Front Squat', sumo_deadlift: 'Sumo Deadlift',
};

const LIFT_COLORS: Record<string, string> = {
  bench: '#7986cb', squat: '#f06292', deadlift: '#81c784', ohp: '#ffd54f',
  cgbench: '#b39ddb', incline_bench: '#64b5f6', front_squat: '#ce93d8', sumo_deadlift: '#a5d6a7',
};

const PROGRAM_ROTATION = [
  { t1: 'bench', hasOnePlus: false }, { t1: 'deadlift', hasOnePlus: true },
  { t1: 'ohp', hasOnePlus: true }, { t1: 'squat', hasOnePlus: true },
  { t1: 'bench', hasOnePlus: true }, { t1: 'deadlift', hasOnePlus: false },
];

function detectProgramDay(t1Lift: string, hasOnePlusAmrap: boolean): number {
  for (let i = 0; i < PROGRAM_ROTATION.length; i++) {
    const d = PROGRAM_ROTATION[i];
    if (d.t1 === t1Lift && d.hasOnePlus === hasOnePlusAmrap) return i;
  }
  return PROGRAM_ROTATION.findIndex((d) => d.t1 === t1Lift);
}

function SetPill({ set, liftColor }: { set: ProgramSet; liftColor: string }) {
  const isAmrap = typeof set.reps === 'string' && String(set.reps).includes('+');
  return (
    <span className={`px-2 py-0.5 rounded text-sm ${isAmrap ? 'font-bold' : ''}`}
      style={{
        backgroundColor: isAmrap ? liftColor + '33' : 'var(--color-border)',
        color: isAmrap ? liftColor : 'inherit',
      }}>
      {set.weight}x{set.reps}
    </span>
  );
}

export default function TodaySession() {
  const { entries, loading } = useLifts();
  const [program, setProgram] = useState<{ days: ProgramDay[] } | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/nsuns-program.json`).then((r) => r.json()).then(setProgram);
  }, []);

  if (loading || !program) return <p className="text-text-muted">Loading...</p>;

  const sessions = groupByDay(entries);
  if (sessions.length === 0) return <p>No session data yet.</p>;

  const lastSession = sessions[sessions.length - 1];
  const lastT1Lifts = lastSession.lifts.filter((l) => l.set_type === 't1' || l.set_type === 't1_amrap');
  if (lastT1Lifts.length === 0) return <p>Could not detect last program day.</p>;

  const lastT1Lift = normalizeLiftName(lastT1Lifts[0].lift);
  const lastHadOnePlus = lastSession.lifts.some((l) => l.set_type === 't1_amrap' && /programmed\s+1\+/.test(l.notes));
  const nextDayIndex = (detectProgramDay(lastT1Lift, lastHadOnePlus) + 1) % program.days.length;
  const todayProgram = program.days[nextDayIndex];

  const amrapSet = todayProgram.t1.sets.find((s) => typeof s.reps === 'string' && String(s.reps).includes('1+'));
  let prInfo: { currentPR1RM: number; currentPRScore: number; amrapWeight: number; repsNeeded: number } | null = null;

  if (amrapSet) {
    const t1Lift = normalizeLiftName(todayProgram.t1.lift);
    const progression = get1RMProgression(entries, t1Lift);
    const currentBW = getLatestBodyweight(entries);
    if (progression.length > 0 && currentBW > 0) {
      let bestScore = 0, best1RM = 0;
      for (const p of progression) {
        const dayBW = entries.find((e) => e.date === p.date)?.bodyweight || currentBW;
        const { score } = calcLiftScore(t1Lift, p.estimated1RM, dayBW);
        if (score > bestScore) { bestScore = score; best1RM = p.estimated1RM; }
      }
      let repsNeeded = 1;
      for (let r = 1; r <= 30; r++) {
        const { score } = calcLiftScore(t1Lift, estimate1RM(amrapSet.weight, r), currentBW);
        if (score > bestScore) { repsNeeded = r; break; }
        if (r === 30) repsNeeded = 30;
      }
      prInfo = { currentPRScore: bestScore, currentPR1RM: best1RM, amrapWeight: amrapSet.weight, repsNeeded };
    }
  }

  const t1Lift = normalizeLiftName(todayProgram.t1.lift);
  const fatigue = calcLiftFatigue(entries, t1Lift);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const t1Color = LIFT_COLORS[todayProgram.t1.lift] || '#ccc';
  const t2Color = LIFT_COLORS[todayProgram.t2.lift] || '#ccc';

  return (
    <div className="card">
      {fatigue?.status === 'high' && (
        <div className="p-2 rounded-md mb-4 text-sm" style={{ backgroundColor: '#ef535020', border: '1px solid #ef535040', color: '#ef5350' }}>
          <strong>High {LIFT_LABELS[t1Lift] || t1Lift} fatigue (ACWR {fatigue.acwr}).</strong> Consider a deload or rest day.
        </div>
      )}
      {fatigue?.status === 'moderate' && (
        <div className="p-2 rounded-md mb-4 text-sm" style={{ backgroundColor: '#ffa72620', border: '1px solid #ffa72640', color: '#ffa726' }}>
          <strong>Elevated {LIFT_LABELS[t1Lift] || t1Lift} load (ACWR {fatigue.acwr}).</strong> Listen to your body.
        </div>
      )}

      <div className="mb-4">
        <div className="text-xs opacity-50 uppercase tracking-wider">Next Session</div>
        <div className="text-xl font-bold">{todayProgram.label}</div>
        <div className="text-sm opacity-60">{todayProgram.name} · {today}</div>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs opacity-50">T1</span>
          <span className="font-bold" style={{ color: t1Color }}>{LIFT_LABELS[todayProgram.t1.lift] || todayProgram.t1.lift}</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {todayProgram.t1.sets.map((s, i) => <SetPill key={i} set={s} liftColor={t1Color} />)}
        </div>
      </div>

      {prInfo && (
        <div className="p-2.5 rounded-md mb-4 text-sm" style={{ backgroundColor: '#4caf5020', border: '1px solid #4caf5040' }}>
          <span className="font-bold" style={{ color: '#81c784' }}>PR Target: </span>
          Hit <strong>{prInfo.repsNeeded} reps</strong> at {prInfo.amrapWeight}kg to beat your current PR
          <span className="opacity-70"> (best: {prInfo.currentPR1RM.toFixed(1)}kg est. 1RM · score {prInfo.currentPRScore.toFixed(1)})</span>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs opacity-50">T2</span>
          <span className="font-bold opacity-80" style={{ color: t2Color }}>{LIFT_LABELS[todayProgram.t2.lift] || todayProgram.t2.lift}</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {todayProgram.t2.sets.map((s, i) => (
            <span key={i} className="px-2 py-0.5 rounded text-sm opacity-80" style={{ backgroundColor: 'var(--color-border)' }}>{s.weight}x{s.reps}</span>
          ))}
        </div>
      </div>

      {todayProgram.accessories.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs opacity-50">ACC</span>
            <span className="text-sm opacity-60">pick based on feel</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {todayProgram.accessories.map((acc, i) => (
              <span key={i} className="px-2 py-0.5 rounded text-sm opacity-80" style={{ backgroundColor: '#4fc3f715', color: '#4fc3f7' }}>{acc}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

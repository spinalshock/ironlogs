import { useLifts, groupByDay, get1RMProgression, getLatestBodyweight } from '../lib/useLifts';
import { estimate1RM, normalizeLiftName, calcLiftScore } from '../lib/scoring';
import { calcLiftFatigue } from '../lib/analytics';
import { LIFT_LABELS, LIFT_COLORS } from '../lib/liftMeta';
import { useProgramData } from '../lib/useProgramData';
import type { ComputedSet, ComputedDay } from '@ironlogs/plugin-api';

import { detectProgramDay } from '../lib/programDetection';

function SetPill({ set, liftColor }: { set: ComputedSet; liftColor: string }) {
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
  const { days, loading: programLoading } = useProgramData();

  if (loading || programLoading || days.length === 0) return <p className="text-text-muted">Loading...</p>;

  const program = { days };

  const sessions = groupByDay(entries);
  if (sessions.length === 0) return <p>No session data yet.</p>;

  const lastSession = sessions[sessions.length - 1];
  const lastT1Lifts = lastSession.lifts.filter((l) => l.set_type === 't1' || l.set_type === 't1_amrap');
  if (lastT1Lifts.length === 0) return <p>Could not detect last program day.</p>;

  const lastT1Lift = normalizeLiftName(lastT1Lifts[0].lift);
  const lastHadOnePlus = lastSession.lifts.some((l) => l.set_type === 't1_amrap' && /programmed\s+1\+/.test(l.notes));
  let nextDayIndex = (detectProgramDay(lastT1Lift, lastHadOnePlus) + 1) % program.days.length;

  // If the next day is a rest day, count how many consecutive rest days follow,
  // then check if enough days have passed to have completed them all.
  // e.g. 1 rest day → skip after 2+ days, 2 rest days (Sat+Sun) → skip after 3+ days
  if (program.days[nextDayIndex].rest) {
    let restDays = 0;
    for (let offset = 0; offset < program.days.length; offset++) {
      if (program.days[(nextDayIndex + offset) % program.days.length].rest) restDays++;
      else break;
    }
    const lastDate = new Date(lastSession.date + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const daysSinceLast = Math.round((now.getTime() - lastDate.getTime()) / 86400000);
    if (daysSinceLast > restDays) {
      // All rest days completed — advance to next training day
      for (let offset = 1; offset < program.days.length; offset++) {
        const idx = (nextDayIndex + offset) % program.days.length;
        if (!program.days[idx].rest) { nextDayIndex = idx; break; }
      }
    }
  }

  const todayProgram = program.days[nextDayIndex];

  if (todayProgram.rest) {
    const REST_MESSAGES = [
      'Recovery is where gains are made. Go touch grass.',
      'Your muscles grow while you rest. Netflix approved.',
      'No iron today. Your CNS thanks you.',
      'Deload your brain too. You\'ve earned it.',
    ];
    const restMsg = REST_MESSAGES[Math.floor(Math.random() * REST_MESSAGES.length)];
    // Find the next training day after the rest day
    let nextTrainingDay: ComputedDay | null = null;
    for (let offset = 1; offset < program.days.length; offset++) {
      const candidate = program.days[(nextDayIndex + offset) % program.days.length];
      if (!candidate.rest) { nextTrainingDay = candidate; break; }
    }
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    return (
      <div className="card" style={{ borderTop: '3px solid #4dd0e1' }}>
        <div className="mb-4">
          <div className="text-xs opacity-50 uppercase tracking-wider">Next Session</div>
          <div className="text-xl font-bold" style={{ color: '#4dd0e1' }}>Rest Day</div>
          <div className="text-sm opacity-60">{todayProgram.name} · {today}</div>
        </div>
        <div className="p-3 rounded-md mb-4" style={{ backgroundColor: '#4dd0e110', color: '#b0bec5' }}>
          <div className="text-base italic">{restMsg}</div>
        </div>
        {nextTrainingDay && (
          <div className="text-sm opacity-50">
            Up next: <span className="font-medium opacity-70">{nextTrainingDay.name} — {nextTrainingDay.label}</span>
          </div>
        )}
      </div>
    );
  }

  if (!todayProgram.t1 || !todayProgram.t2) return <p>Could not load program day.</p>;

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

      {todayProgram.accessories && todayProgram.accessories.length > 0 && (
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

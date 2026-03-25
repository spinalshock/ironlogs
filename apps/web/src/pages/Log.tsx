import { useState, useEffect, useCallback, useMemo } from 'react';
import { addLift, exportLiftsAsCSV, clearLocalLifts } from '../lib/storage';
import { normalizeLiftName } from '../lib/scoring';
import { useLifts, groupByDay, calcWeeklyStreak } from '../lib/useLifts';
import { calcXPProfile } from '../lib/gamification';
import { useProgramData } from '../lib/useProgramData';
import type { ComputedDay } from '@ironlogs/plugin-api';
import WorkoutComplete from '../components/WorkoutComplete';

interface ProgramSet {
  weight: number;
  reps: string | number;
  set_type: string;
  note: string;
}

interface ProgramExercise {
  lift: string;
  label: string;
  sets: ProgramSet[];
}

interface ProgramDay {
  name: string;
  label: string;
  exercises: ProgramExercise[];
}

interface WorkoutSet {
  weight: string;
  reps: string;
  done: boolean;
  set_type: string;
  note: string;
  isAmrap: boolean;
  targetLabel: string;
}

interface WorkoutExercise {
  lift: string;
  label: string;
  sets: WorkoutSet[];
}

import { LIFT_LABELS } from '../lib/liftMeta';

const ACCESSORY_OPTIONS = [
  'face_pulls', 'seated_row', 'lateral_raise', 'bicep_curl',
  'tricep_pushdown', 'leg_curl', 'chinup', 'pendlay_row',
];

function computedDaysToProgramDays(days: ComputedDay[]): ProgramDay[] {
  return days.map((day) => {
    if (day.rest || (!day.t1 && !day.t2)) {
      return { name: day.name, label: day.label, exercises: [] };
    }

    const exercises: ProgramExercise[] = [];

    if (day.t1) {
      exercises.push({
        lift: day.t1.lift,
        label: LIFT_LABELS[day.t1.lift] || day.t1.lift,
        sets: day.t1.sets.map((s) => {
          const repsStr = String(s.reps);
          const isAmrap = repsStr.includes('+');
          return {
            weight: s.weight,
            reps: repsStr,
            set_type: isAmrap ? 't1_amrap' : 't1',
            note: isAmrap ? `programmed ${repsStr}` : '',
          };
        }),
      });
    }

    if (day.t2) {
      exercises.push({
        lift: day.t2.lift,
        label: LIFT_LABELS[day.t2.lift] || day.t2.lift,
        sets: day.t2.sets.map((s) => ({
          weight: s.weight,
          reps: String(s.reps),
          set_type: 't2',
          note: '',
        })),
      });
    }

    return { name: day.name, label: day.label, exercises };
  });
}

function nextTrainingDay(index: number, programDays: ProgramDay[]): number {
  // Skip past rest days to find next training day
  let next = index;
  for (let i = 0; i < programDays.length; i++) {
    if (programDays[next].exercises.length > 0) return next;
    next = (next + 1) % programDays.length;
  }
  return 0;
}

function detectNextDay(entries: any[], programDays: ProgramDay[]): number {
  const sessions = groupByDay(entries);
  if (sessions.length === 0) return 0;

  const last = sessions[sessions.length - 1];
  const t1Lifts = last.lifts.filter((l: any) => l.set_type === 't1' || l.set_type === 't1_amrap');
  if (t1Lifts.length === 0) return 0;

  const lastT1 = normalizeLiftName(t1Lifts[0].lift);
  const had1Plus = last.lifts.some((l: any) => l.set_type === 't1_amrap' && /programmed\s+1\+/.test(l.notes));

  for (let i = 0; i < programDays.length; i++) {
    const day = programDays[i];
    const dayT1 = day.exercises[0]?.lift;
    if (dayT1 !== lastT1) continue;

    const dayHas1Plus = day.exercises[0].sets.some(s => String(s.reps) === '1+');
    if (dayT1 === 'bench') {
      if (had1Plus === dayHas1Plus) return nextTrainingDay((i + 1) % programDays.length, programDays);
    } else if (dayT1 === 'deadlift') {
      const dayHas1PlusAmrap = day.exercises[0].sets.some(s => String(s.reps) === '1+');
      if (had1Plus === dayHas1PlusAmrap) return nextTrainingDay((i + 1) % programDays.length, programDays);
    } else {
      return nextTrainingDay((i + 1) % programDays.length, programDays);
    }
  }
  return 0;
}

function programDayToWorkout(day: ProgramDay): WorkoutExercise[] {
  return day.exercises.map(ex => ({
    lift: ex.lift,
    label: ex.label,
    sets: ex.sets.map(s => {
      const repsStr = String(s.reps);
      const isAmrap = repsStr.includes('+');
      return {
        weight: String(s.weight),
        reps: isAmrap ? '' : repsStr,
        done: false,
        set_type: s.set_type,
        note: s.note,
        isAmrap,
        targetLabel: `${s.weight}kg x ${repsStr}`,
      };
    }),
  }));
}

function createEmptyExercise(lift: string): WorkoutExercise {
  return {
    lift,
    label: LIFT_LABELS[lift] || lift,
    sets: [{
      weight: '', reps: '', done: false, set_type: 'accessory',
      note: '', isAmrap: false, targetLabel: '',
    }],
  };
}

const SESSION_KEY = 'ironlogs-log-session';

interface SavedSession {
  exercises: WorkoutExercise[];
  selectedDay: number;
  date: string;
  bodyweight: string;
  sleep: string;
  workoutStarted: boolean;
}

function saveSession(data: SavedSession) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {}
}

function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedSession;
    // Only restore if from today
    if (data.date !== new Date().toISOString().slice(0, 10)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return data;
  } catch { return null; }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export default function Log() {
  const { entries, loading, refreshLocalLifts } = useLifts();
  const { days: computedDays } = useProgramData();
  const program = useMemo(() => computedDaysToProgramDays(computedDays), [computedDays]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bodyweight, setBodyweight] = useState('');
  const [sleep, setSleep] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [restoredFromSession, setRestoredFromSession] = useState(false);
  const [celebration, setCelebration] = useState<{
    sets: number; xpGained: number; xpBefore: number; xpAfter: number;
    levelBefore: number; levelAfter: number; progressBefore: number; progressAfter: number; streak: number;
  } | null>(null);

  // Restore saved session or detect next day
  useEffect(() => {
    if (loading) return;
    const saved = loadSession();
    if (saved && saved.workoutStarted) {
      setSelectedDay(saved.selectedDay);
      setExercises(saved.exercises);
      setBodyweight(saved.bodyweight);
      setSleep(saved.sleep);
      setDate(saved.date);
      setWorkoutStarted(true);
      setRestoredFromSession(true);
    } else {
      setSelectedDay(detectNextDay(entries, program));
    }
  }, [program, entries, loading]);

  useEffect(() => {
    if (restoredFromSession) return;
    setExercises(programDayToWorkout(program[selectedDay]));
    setWorkoutStarted(false);
  }, [program, selectedDay, restoredFromSession]);

  // Persist workout state on every change
  useEffect(() => {
    if (!workoutStarted) return;
    saveSession({ exercises, selectedDay, date, bodyweight, sleep, workoutStarted });
  }, [exercises, selectedDay, date, bodyweight, sleep, workoutStarted]);

  const updateSet = useCallback((exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
    setExercises(prev => {
      const next = prev.map(ex => ({ ...ex, sets: ex.sets.map(s => ({ ...s })) }));
      next[exIdx].sets[setIdx][field] = value;
      return next;
    });
  }, []);

  const toggleDone = useCallback((exIdx: number, setIdx: number) => {
    setExercises(prev => {
      const next = prev.map(ex => ({ ...ex, sets: ex.sets.map(s => ({ ...s })) }));
      const set = next[exIdx].sets[setIdx];
      if (!set.done && set.isAmrap && !set.reps) return prev;
      if (!set.done && (!set.weight || !set.reps)) return prev;
      set.done = !set.done;
      if (!workoutStarted) setWorkoutStarted(true);
      return next;
    });
  }, [workoutStarted]);

  const addSet = useCallback((exIdx: number) => {
    setExercises(prev => {
      const next = prev.map(ex => ({ ...ex, sets: ex.sets.map(s => ({ ...s })) }));
      const lastSet = next[exIdx].sets[next[exIdx].sets.length - 1];
      next[exIdx].sets.push({
        weight: lastSet?.weight || '', reps: '', done: false,
        set_type: next[exIdx].sets[0]?.set_type || 'accessory',
        note: '', isAmrap: false, targetLabel: '',
      });
      return next;
    });
  }, []);

  const addExercise = useCallback((lift: string) => {
    setExercises(prev => [...prev, createEmptyExercise(lift)]);
    setShowAddExercise(false);
  }, []);

  const removeExercise = useCallback((exIdx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== exIdx));
  }, []);

  const finishWorkout = async () => {
    if (saving) return;

    const completedSets = exercises.flatMap(ex =>
      ex.sets.filter(s => s.done).map(s => ({
        date,
        bodyweight: parseFloat(bodyweight) || 0,
        lift: normalizeLiftName(ex.lift),
        weight: parseFloat(s.weight),
        reps: parseInt(s.reps),
        set_type: s.set_type,
        notes: s.note,
        sleep: parseFloat(sleep) || 0,
      }))
    );

    if (completedSets.length === 0) {
      setStatus('No sets completed');
      setTimeout(() => setStatus(''), 2000);
      return;
    }

    setSaving(true);
    try {
      // Snapshot XP before saving
      const xpBefore = calcXPProfile(entries);

      for (const set of completedSets) await addLift(set);
      await refreshLocalLifts();

      // Calculate XP after (entries won't have updated yet, so simulate)
      const xpAfter = calcXPProfile([...entries, ...completedSets]);

      // Weekly streak for celebration screen
      const allSessions = groupByDay([...entries, ...completedSets]);
      const trainingDays = program.filter(d => d.exercises.length > 0).length || 6;
      const ws = calcWeeklyStreak(allSessions, trainingDays);

      setCelebration({
        sets: completedSets.length,
        xpGained: xpAfter.totalXP - xpBefore.totalXP,
        xpBefore: xpBefore.totalXP,
        xpAfter: xpAfter.totalXP,
        levelBefore: xpBefore.level,
        levelAfter: xpAfter.level,
        progressBefore: xpBefore.progressPct / 100,
        progressAfter: xpAfter.progressPct / 100,
        streak: ws.currentWeekSessions,
      });

      // Reset page state
      clearSession();
      setRestoredFromSession(false);
      setExercises(programDayToWorkout(program[selectedDay]));
      setWorkoutStarted(false);
    } catch {
      setStatus('Error saving workout');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    const csv = await exportLiftsAsCSV();
    if (!csv) { setStatus('No local data to export'); setTimeout(() => setStatus(''), 2000); return; }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ironlogs-${date}.csv`;
    a.click(); URL.revokeObjectURL(url);
    // Clear IndexedDB after successful export
    await clearLocalLifts();
    await refreshLocalLifts();
    clearSession();
    setRestoredFromSession(false);
    setStatus('Exported & local data cleared');
    setTimeout(() => setStatus(''), 3000);
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton w-[200px] h-8 mb-4" />
        <div className="skeleton w-full h-[400px] rounded-xl" />
      </div>
    );
  }

  const totalCompleted = exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.done).length, 0);
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <div className="max-w-[600px]">
      {celebration && (
        <WorkoutComplete {...celebration} onDismiss={() => setCelebration(null)} />
      )}
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="mb-1">{program[selectedDay].name}</h2>
          <div className="text-text-muted text-sm">{program[selectedDay].label}</div>
        </div>
        {workoutStarted && (
          <button onClick={finishWorkout} disabled={saving} className="btn-primary px-5 py-2" style={saving ? { opacity: 0.5 } : undefined}>
            {saving ? 'Saving...' : 'Finish'}
          </button>
        )}
      </div>

      {/* Day selector — skip rest days */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {program.filter(d => d.exercises.length > 0).map((d) => {
          const i = program.indexOf(d);
          return (
          <button
            key={i}
            onClick={() => { setRestoredFromSession(false); clearSession(); setSelectedDay(i); }}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border cursor-pointer transition-colors ${
              i === selectedDay
                ? 'border-accent bg-accent-glow text-accent'
                : 'border-border bg-transparent text-text-muted hover:border-border-bright'
            }`}
          >
            D{i + 1}
          </button>
          );
        })}
      </div>

      {/* Date + Bodyweight + Sleep */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1">
          <label className="text-[0.7rem] text-text-muted uppercase tracking-wider">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" />
        </div>
        <div className="flex-1">
          <label className="text-[0.7rem] text-text-muted uppercase tracking-wider">Bodyweight (kg)</label>
          <input type="number" step="0.1" value={bodyweight} onChange={e => setBodyweight(e.target.value)} placeholder="e.g. 81.5" className="input-field" />
        </div>
        <div className="w-20">
          <label className="text-[0.7rem] text-text-muted uppercase tracking-wider">Sleep (h)</label>
          <input type="number" step="0.5" min="0" max="16" value={sleep} onChange={e => setSleep(e.target.value)} placeholder="7.5" className="input-field" />
        </div>
      </div>

      {/* Progress bar */}
      {workoutStarted && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>Progress</span>
            <span>{totalCompleted}/{totalSets} sets</span>
          </div>
          <div className="h-1 rounded-sm bg-border">
            <div
              className="h-full rounded-sm bg-accent transition-all duration-300"
              style={{ width: `${totalSets > 0 ? (totalCompleted / totalSets) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Exercises */}
      {exercises.map((ex, exIdx) => (
        <div key={exIdx} className="mb-5 border-t border-border pt-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-accent font-bold text-sm">{exIdx + 1}</span>
              <span className="text-accent font-bold text-base">{ex.label}</span>
            </div>
            {exIdx >= 2 && (
              <button onClick={() => removeExercise(exIdx)} className="bg-transparent border-none text-text-muted text-lg cursor-pointer px-1">x</button>
            )}
          </div>

          {/* Set header */}
          <div className="grid grid-cols-[32px_1fr_60px_60px_36px] gap-1.5 items-center mb-1 text-[0.7rem] text-text-muted uppercase tracking-wider">
            <span>Set</span>
            <span>Target</span>
            <span>kg</span>
            <span>Reps</span>
            <span />
          </div>

          {/* Sets */}
          {ex.sets.map((set, setIdx) => (
            <div key={setIdx} className="grid grid-cols-[32px_1fr_60px_60px_36px] gap-1.5 items-center mb-1">
              <span className={`text-sm font-semibold ${set.isAmrap ? 'text-accent' : 'text-text-muted'}`}>
                {set.isAmrap ? 'P' : setIdx + 1}
              </span>
              <span className="text-sm text-text-secondary">{set.targetLabel || '--'}</span>
              <input
                type="number" step="0.5" value={set.weight}
                onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                className={`input-field py-1.5 px-2 text-sm text-center ${set.done ? 'bg-accent-glow' : ''}`}
              />
              <input
                type="number" value={set.reps}
                onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                placeholder={set.isAmrap ? String(set.note.replace('programmed ', '')) : ''}
                className={`input-field py-1.5 px-2 text-sm text-center ${set.done ? 'bg-accent-glow' : ''}`}
              />
              <button
                onClick={() => toggleDone(exIdx, setIdx)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs cursor-pointer transition-all ${
                  set.done
                    ? 'border-accent bg-accent text-white'
                    : 'border-border bg-transparent text-text-muted'
                }`}
              >
                {set.done ? '\u2713' : ''}
              </button>
            </div>
          ))}

          {/* Add Set */}
          <button onClick={() => addSet(exIdx)} className="btn-secondary w-full mt-1">+ Add Set</button>
        </div>
      ))}

      {/* Add Exercise */}
      {!showAddExercise ? (
        <button onClick={() => setShowAddExercise(true)} className="btn-primary w-full py-2.5 mb-4">+ Add Exercise</button>
      ) : (
        <div className="p-3 rounded-lg border border-border bg-bg-card mb-4">
          <div className="text-xs text-text-muted mb-2">Select exercise:</div>
          <div className="flex flex-wrap gap-1.5">
            {ACCESSORY_OPTIONS.map(lift => (
              <button key={lift} onClick={() => addExercise(lift)}
                className="px-3 py-1.5 rounded-md text-xs border border-border bg-transparent text-text-primary cursor-pointer hover:border-border-bright transition-colors">
                {LIFT_LABELS[lift] || lift}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAddExercise(false)} className="mt-2 bg-transparent border-none text-text-muted text-xs cursor-pointer">Cancel</button>
        </div>
      )}

      {/* Finish + Export */}
      <div className="flex gap-3 mb-4">
        <button onClick={finishWorkout} disabled={saving} className="btn-primary flex-1" style={saving ? { opacity: 0.5 } : undefined}>
          {saving ? 'Saving...' : `Finish Workout (${totalCompleted} sets)`}
        </button>
        <button onClick={handleExport} className="btn-secondary">Export CSV</button>
      </div>

      {/* Status */}
      {status && (
        <div className={`text-sm p-2 px-3 rounded-md mb-4 ${
          status.includes('Error') || status.includes('No ')
            ? 'text-danger bg-danger/10'
            : 'text-success bg-success/10'
        }`}>
          {status}
        </div>
      )}

      {/* Data management */}
      <div className="mt-8 pt-4 border-t border-border">
        <button
          onClick={async () => {
            if (confirm('Clear all locally logged sets? This won\'t affect your CSV data.')) {
              await clearLocalLifts();
              await refreshLocalLifts();
              setStatus('Local data cleared');
              setTimeout(() => setStatus(''), 2000);
            }
          }}
          className="text-xs text-text-muted bg-transparent border-none cursor-pointer underline"
        >
          Clear local data
        </button>
      </div>
    </div>
  );
}

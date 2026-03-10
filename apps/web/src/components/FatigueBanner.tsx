import { useLifts, groupByDay } from '../lib/useLifts';
import { normalizeLiftName } from '../lib/scoring';
import { calcLiftFatigue } from '../lib/analytics';

const LIFT_LABELS: Record<string, string> = {
  bench: 'Bench', squat: 'Squat', deadlift: 'Deadlift', ohp: 'OHP',
};

const PROGRAM_ROTATION = [
  { t1: 'bench', hasOnePlus: false }, { t1: 'deadlift', hasOnePlus: true },
  { t1: 'ohp', hasOnePlus: true }, { t1: 'squat', hasOnePlus: true },
  { t1: 'bench', hasOnePlus: true }, { t1: 'deadlift', hasOnePlus: false },
];

function detectNextT1(entries: ReturnType<typeof useLifts>['entries']): string | null {
  const sessions = groupByDay(entries);
  if (sessions.length === 0) return null;
  const last = sessions[sessions.length - 1];
  const t1Lifts = last.lifts.filter((l) => l.set_type === 't1' || l.set_type === 't1_amrap');
  if (t1Lifts.length === 0) return null;
  const lastT1 = normalizeLiftName(t1Lifts[0].lift);
  const hadOnePlus = last.lifts.some((l) => l.set_type === 't1_amrap' && /programmed\s+1\+/.test(l.notes));

  for (let i = 0; i < PROGRAM_ROTATION.length; i++) {
    const d = PROGRAM_ROTATION[i];
    if (d.t1 === lastT1 && d.hasOnePlus === hadOnePlus) {
      return PROGRAM_ROTATION[(i + 1) % PROGRAM_ROTATION.length].t1;
    }
  }
  const idx = PROGRAM_ROTATION.findIndex((d) => d.t1 === lastT1);
  if (idx >= 0) return PROGRAM_ROTATION[(idx + 1) % PROGRAM_ROTATION.length].t1;
  return null;
}

export default function FatigueBanner() {
  const { entries, loading } = useLifts();
  if (loading) return null;

  const nextT1 = detectNextT1(entries);
  if (!nextT1) return null;

  const fatigue = calcLiftFatigue(entries, nextT1);
  if (!fatigue) return null;

  return (
    <div
      className="flex items-center gap-4 flex-wrap rounded-lg p-3"
      style={{ border: `1px solid ${fatigue.color}40`, backgroundColor: `${fatigue.color}15` }}
    >
      <div>
        <div className="text-xs opacity-60">{LIFT_LABELS[nextT1] || nextT1} Recovery</div>
        <div className="text-lg font-bold" style={{ color: fatigue.color }}>{fatigue.label}</div>
      </div>
      <div className="text-sm opacity-75">
        ACWR: <strong>{fatigue.acwr}</strong>
        <span className="mx-2">|</span>
        Acute: {(fatigue.acuteEWMA / 1000).toFixed(1)} tons
        <span className="mx-2">|</span>
        Chronic: {(fatigue.chronicEWMA / 1000).toFixed(1)} tons
      </div>
    </div>
  );
}

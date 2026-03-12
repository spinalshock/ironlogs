import { useLifts } from '../lib/useLifts';
import { calcLiftFatigue } from '../lib/analytics';
import { LIFT_LABELS_SHORT as LIFT_LABELS } from '../lib/liftMeta';
import { detectNextT1 } from '../lib/programDetection';

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

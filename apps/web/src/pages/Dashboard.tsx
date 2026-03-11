import { useEffect, useState } from 'react';
import TodaySession from '../components/TodaySession';
import FatigueBanner from '../components/FatigueBanner';
import { useLifts, getBestRecentSets, getLatestBodyweight, groupByDay, calcWeeklyStreak } from '../lib/useLifts';
import { calcLiftScore, calcOverallScore } from '../lib/scoring';
import { calcReadiness } from '../lib/analytics';
import { calcXPProfile, getLifterClass, getRank } from '../lib/gamification';
import { USER_CONFIG } from '../config';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Late night';
}

function getTime(): string {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function Dashboard() {
  const { entries, loading } = useLifts();
  const [time, setTime] = useState(getTime());
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState(6);

  useEffect(() => {
    const interval = setInterval(() => setTime(getTime()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/nsuns-program.json`)
      .then(r => r.json())
      .then(data => {
        const trainingDays = data.days.filter((d: any) => !d.rest).length;
        setTrainingDaysPerWeek(trainingDays);
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div>
        <div className="skeleton w-[200px] h-8 mb-4" />
        <div className="flex gap-4 mb-6">
          <div className="skeleton w-[140px] h-[90px] rounded-xl" />
          <div className="skeleton w-[140px] h-[90px] rounded-xl" />
          <div className="skeleton w-[140px] h-[90px] rounded-xl" />
        </div>
        <div className="skeleton w-full h-[200px] rounded-xl" />
      </div>
    );
  }

  const bw = getLatestBodyweight(entries);
  const best = getBestRecentSets(entries);
  const scored = ['squat', 'bench', 'deadlift', 'ohp'];
  const liftScores = scored
    .filter((l) => best[l])
    .map((l) => ({ lift: l, ...calcLiftScore(l, best[l].estimated1RM, bw) }));
  const overall = calcOverallScore(liftScores);
  const sessions = groupByDay(entries);

  const readiness = calcReadiness(entries);
  const xp = calcXPProfile(entries);
  const lifterClass = getLifterClass(entries);
  const rank = getRank(entries);

  const weeklyStreak = calcWeeklyStreak(sessions, trainingDaysPerWeek);

  return (
    <div>
      <div className="mb-8">
        <div className="text-5xl font-extrabold tracking-tighter leading-none">{time}</div>
        <div className="text-xl text-text-secondary mt-1">
          {getGreeting()}, {USER_CONFIG.name}
        </div>
      </div>

      {/* XP Bar */}
      <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: 'rgba(121,134,203,0.08)', border: '1px solid rgba(121,134,203,0.2)' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold" style={{ color: '#7986cb' }}>Lv.{xp.level}</span>
            <span className="text-sm font-bold" style={{ color: lifterClass.color }}>{lifterClass.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: rank.color + '1a', color: rank.color, filter: 'brightness(1.5)' }}>{rank.name}</span>
          </div>
          <span className="text-xs opacity-50">{xp.xpInCurrentLevel}/{xp.xpForNextLevel} XP</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(128,128,128,0.15)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${xp.progressPct}%`, background: 'linear-gradient(90deg, #7986cb, #ab47bc)' }} />
        </div>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="stat-card">
          <div className="label">Strength</div>
          <div className="value" style={{ color: overall.color }}>{overall.score}</div>
          <div className="sub">{overall.level}</div>
        </div>
        <div className="stat-card">
          <div className="label">Sessions</div>
          <div className="value">{sessions.length}</div>
          <div className="sub">total logged</div>
        </div>
        <div className="stat-card">
          <div className="label">Streak</div>
          <div className="value">{weeklyStreak.streak} <span className="text-lg font-medium text-text-secondary">w</span></div>
          <div className="sub">{weeklyStreak.currentWeekSessions}/{weeklyStreak.requiredPerWeek} this week</div>
        </div>
        <div className="stat-card">
          <div className="label">Bodyweight</div>
          <div className="value">{bw} <span className="text-lg font-medium text-text-secondary">kg</span></div>
          <div className="sub">latest</div>
        </div>
        {readiness && (
          <div className="stat-card">
            <div className="label">Readiness</div>
            <div className="value" style={{ color: readiness.color }}>{readiness.score}</div>
            <div className="sub">{readiness.label}</div>
          </div>
        )}
      </div>

      <FatigueBanner />

      <div className="mt-6"><TodaySession /></div>
    </div>
  );
}

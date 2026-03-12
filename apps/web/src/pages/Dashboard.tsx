import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TodaySession from '../components/TodaySession';
import FatigueBanner from '../components/FatigueBanner';
import AnimatedFace from '../components/AnimatedFace';
import { useLifts, getBestRecentSets, getLatestBodyweight, groupByDay, calcWeeklyStreak } from '../lib/useLifts';
import { calcLiftScore, calcOverallScore } from '../lib/scoring';
import { calcReadiness } from '../lib/analytics';
import { calcXPProfile, calcSkillProfile, getTrainingStatus, getLifterClass, getRank, getTitle } from '../lib/gamification';
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
  const xp = calcXPProfile(entries, { trainingDaysPerWeek });
  const lifterClass = getLifterClass(entries);
  const rank = getRank(entries);
  const title = getTitle(entries);
  const skills = calcSkillProfile(entries);

  // Current streak for status face
  const lastSession = xp.sessions[xp.sessions.length - 1];
  const currentStreak = lastSession?.streakXP ? Math.floor(lastSession.streakXP / 5) + 1 : 1;
  const status = getTrainingStatus(readiness?.score ?? null, currentStreak);

  const weeklyStreak = calcWeeklyStreak(sessions, trainingDaysPerWeek);
  const nav = useNavigate();

  return (
    <div>
      <div className="mb-8">
        <div className="text-5xl font-extrabold tracking-tighter leading-none">{time}</div>
        <div className="text-xl text-text-secondary mt-1">
          {getGreeting()}, {USER_CONFIG.name}
        </div>
      </div>

      {/* Character Panel */}
      <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(121,134,203,0.08)', border: '1px solid rgba(121,134,203,0.15)' }}>
        {/* Identity Row: Face + Info */}
        <div className="flex items-center gap-5 mb-3">
          <div className="flex-shrink-0 rounded-xl overflow-hidden" style={{ boxShadow: `0 0 20px ${status.glowColor}` }}>
            <AnimatedFace file="SleepMode.png" fw={512} fh={512} size={96} duration={2.0} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-3xl font-extrabold" style={{ color: '#7986cb' }}>Lv.{xp.level}</span>
              <span className="text-base font-bold" style={{ color: lifterClass.color }}>{lifterClass.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: rank.color + '1a', color: rank.color, filter: 'brightness(1.5)' }}>{rank.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm opacity-40">{lifterClass.description}</span>
              <span className="text-sm opacity-25">·</span>
              <span className="text-sm opacity-40">{sessions.length} sessions</span>
              <span className="text-sm opacity-25">·</span>
              <span className="text-sm font-medium" style={{ color: status.faceColor }}>{status.label}</span>
            </div>
          </div>
        </div>

        {/* Overall XP Bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs opacity-50">XP</span>
            <span className="text-xs opacity-40">{xp.xpInCurrentLevel}/{xp.xpForNextLevel}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(128,128,128,0.15)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${xp.progressPct}%`, background: 'linear-gradient(90deg, #7986cb, #ab47bc)' }} />
          </div>
        </div>

        {/* Skill Bars */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {skills.skills.map((s) => (
            <div key={s.lift}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium opacity-70">{s.label}</span>
                <span className="text-xs opacity-40">Lv.{s.level}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(128,128,128,0.12)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${s.progressPct}%`,
                    backgroundColor: s.lift === 'bench' ? '#7986cb' : s.lift === 'squat' ? '#f06292' : s.lift === 'deadlift' ? '#81c784' : '#ffd54f',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="stat-card cursor-pointer hover:brightness-110 transition-all" onClick={() => nav('/scores')}>
          <div className="label">Strength</div>
          <div className="value" style={{ color: overall.color }}>{overall.score}</div>
          <div className="sub">{rank.name} · {overall.level}</div>
        </div>
        <div className="stat-card cursor-pointer hover:brightness-110 transition-all" onClick={() => nav('/journal')}>
          <div className="label">Sessions</div>
          <div className="value">{sessions.length}</div>
          <div className="sub">{title.name}</div>
        </div>
        <div className="stat-card cursor-pointer hover:brightness-110 transition-all" onClick={() => nav('/compliance')}>
          <div className="label">Streak</div>
          <div className="value">{weeklyStreak.streak > 0 && '🔥 '}{weeklyStreak.streak} <span className="text-lg font-medium text-text-secondary">weeks</span></div>
          <div className="sub">{weeklyStreak.currentWeekSessions}/{weeklyStreak.requiredPerWeek} this week</div>
        </div>
        <div className="stat-card cursor-pointer hover:brightness-110 transition-all" onClick={() => nav('/bodyweight')}>
          <div className="label">Bodyweight</div>
          <div className="value">{bw} <span className="text-lg font-medium text-text-secondary">kg</span></div>
          <div className="sub">latest</div>
        </div>
        {readiness && (
          <div className="stat-card cursor-pointer hover:brightness-110 transition-all" onClick={() => nav('/analytics')}>
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

import { useState, useEffect } from 'react';
import { useLifts } from '../lib/useLifts';
import { ACHIEVEMENTS, checkAchievements, CATEGORY_INFO, type AchievementCategory } from '../lib/achievements';
import { getUnlockedAchievements, unlockAchievement } from '../lib/storage';
import { calcXPProfile, getLifterClass, getTitle, getRank, getBosses, getDailyQuests, getWeeklyQuests, getSeasons, getInsights } from '../lib/gamification';

const CATEGORIES: AchievementCategory[] = ['strength', 'consistency', 'endurance', 'program', 'legendary', 'secret'];

export default function Achievements() {
  const { entries, loading } = useLifts();
  const [unlocked, setUnlocked] = useState<Record<string, string>>({});
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const [tab, setTab] = useState<'profile' | 'quests' | 'bosses' | 'achievements' | 'seasons'>('profile');

  useEffect(() => { getUnlockedAchievements().then(setUnlocked); }, []);

  useEffect(() => {
    if (loading || entries.length === 0) return;
    const earned = checkAchievements(entries);
    const newOnes: string[] = [];
    for (const a of earned) { if (!unlocked[a.id]) { unlockAchievement(a.id); newOnes.push(a.id); } }
    if (newOnes.length > 0) { setNewlyUnlocked(newOnes); getUnlockedAchievements().then(setUnlocked); }
  }, [entries, loading]);

  if (loading) return <p className="text-text-muted">Loading...</p>;

  const earned = checkAchievements(entries);
  const earnedIds = new Set(earned.map((a) => a.id));

  const xp = calcXPProfile(entries);
  const lifterClass = getLifterClass(entries);
  const title = getTitle(entries);
  const rank = getRank(entries);
  const bosses = getBosses(entries);
  const dailyQuests = getDailyQuests(entries);
  const weeklyQuests = getWeeklyQuests(entries);
  const seasons = getSeasons(entries);
  const insights = getInsights(entries);

  return (
    <div>
      <h2>Character</h2>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(['profile', 'quests', 'bosses', 'achievements', 'seasons'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={t === tab ? 'btn-primary' : 'btn-secondary'}>
            {t === 'profile' ? 'Profile' : t === 'quests' ? 'Quests' : t === 'bosses' ? 'Bosses' : t === 'achievements' ? 'Achievements' : 'Seasons'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <ProfileTab xp={xp} lifterClass={lifterClass} title={title} rank={rank} insights={insights}
          earnedCount={earned.length} totalCount={ACHIEVEMENTS.length} newlyUnlocked={newlyUnlocked} />
      )}
      {tab === 'quests' && <QuestsTab daily={dailyQuests} weekly={weeklyQuests} />}
      {tab === 'bosses' && <BossesTab bosses={bosses} />}
      {tab === 'achievements' && <AchievementsTab earnedIds={earnedIds} newlyUnlocked={newlyUnlocked} />}
      {tab === 'seasons' && <SeasonsTab seasons={seasons} />}
    </div>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────

function ProfileTab({ xp, lifterClass, title, rank, insights, earnedCount, totalCount, newlyUnlocked }: {
  xp: ReturnType<typeof calcXPProfile>;
  lifterClass: ReturnType<typeof getLifterClass>;
  title: ReturnType<typeof getTitle>;
  rank: ReturnType<typeof getRank>;
  insights: ReturnType<typeof getInsights>;
  earnedCount: number;
  totalCount: number;
  newlyUnlocked: string[];
}) {
  const pct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  return (
    <div>
      {newlyUnlocked.length > 0 && (
        <div className="p-3 rounded-lg mb-6" style={{ border: '1px solid #ffd54f40', backgroundColor: '#ffd54f15' }}>
          <div className="font-bold mb-1" style={{ color: '#ffd54f' }}>New Achievements Unlocked!</div>
          {newlyUnlocked.map((id) => {
            const a = ACHIEVEMENTS.find((x) => x.id === id);
            return a ? <div key={id} className="text-sm">{a.title} — {a.description}</div> : null;
          })}
        </div>
      )}

      {/* XP + Level */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-xs opacity-50 uppercase tracking-wider">Level</span>
            <div className="text-4xl font-extrabold">{xp.level}</div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-60">{xp.totalXP.toLocaleString()} XP</div>
            <div className="text-xs opacity-40">{xp.xpInCurrentLevel} / {xp.xpForNextLevel} to next</div>
          </div>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(128,128,128,0.15)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${xp.progressPct}%`, background: 'linear-gradient(90deg, #7986cb, #ab47bc)' }} />
        </div>
      </div>

      {/* Class + Title + Rank */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="stat-card">
          <div className="label">Class</div>
          <div className="value text-base" style={{ color: lifterClass.color }}>{lifterClass.name}</div>
          <div className="sub">{lifterClass.description}</div>
        </div>
        <div className="stat-card">
          <div className="label">Title</div>
          <div className="value text-base" style={{ color: title.color }}>{title.name}</div>
          <div className="sub">reputation</div>
        </div>
        <div className="stat-card">
          <div className="label">Rank</div>
          <div className="value text-base" style={{ color: rank.color }}>{rank.name}</div>
          <div className="sub">score ≥ {rank.minScore}</div>
        </div>
        <div className="stat-card">
          <div className="label">Achievements</div>
          <div className="value text-base">{earnedCount}/{totalCount}</div>
          <div className="sub">{pct}%</div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mb-4">
          <h4>Strength Archaeologist</h4>
          <div className="flex flex-col gap-2">
            {insights.map((ins, i) => (
              <div key={i} className="p-3 rounded-lg text-sm" style={{ border: `1px solid ${ins.color}30`, backgroundColor: `${ins.color}10` }}>
                <span className="font-bold" style={{ color: ins.color }}>{ins.title}:</span> {ins.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent XP */}
      {xp.sessions.length > 0 && (
        <div>
          <h4>Recent XP</h4>
          <table>
            <thead><tr><th>Date</th><th>Tonnage</th><th>AMRAP</th><th>PR</th><th>Streak</th><th>Total</th></tr></thead>
            <tbody>
              {xp.sessions.slice(-10).reverse().map((s) => (
                <tr key={s.date}>
                  <td>{s.date}</td>
                  <td>{s.tonnageXP}</td>
                  <td>{s.amrapXP > 0 ? <span style={{ color: '#81c784' }}>+{s.amrapXP}</span> : '—'}</td>
                  <td>{s.prXP > 0 ? <span style={{ color: '#ffd54f' }}>+{s.prXP}</span> : '—'}</td>
                  <td>{s.streakXP > 0 ? <span style={{ color: '#7986cb' }}>+{s.streakXP}</span> : '—'}</td>
                  <td className="font-bold">{s.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Quests Tab ──────────────────────────────────────────────

function QuestsTab({ daily, weekly }: {
  daily: ReturnType<typeof getDailyQuests>;
  weekly: ReturnType<typeof getWeeklyQuests>;
}) {
  return (
    <div>
      <h4>Daily Quests</h4>
      <div className="flex flex-col gap-2 mb-6">
        {daily.map((q) => (
          <QuestCard key={q.id} quest={q} />
        ))}
      </div>

      <h4>Weekly Quests</h4>
      <div className="flex flex-col gap-2">
        {weekly.map((q) => (
          <QuestCard key={q.id} quest={q} />
        ))}
      </div>
    </div>
  );
}

function QuestCard({ quest }: { quest: ReturnType<typeof getDailyQuests>[0] }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border"
      style={{
        borderColor: quest.completed ? '#81c78440' : 'var(--color-border)',
        backgroundColor: quest.completed ? '#81c78410' : undefined,
      }}>
      <div>
        <div className="font-bold">{quest.title}</div>
        <div className="text-xs text-text-muted">{quest.description}</div>
      </div>
      <div className="text-right">
        <div className="text-xs font-bold" style={{ color: quest.completed ? '#81c784' : '#ffd54f' }}>
          {quest.completed ? 'Complete' : `${quest.xpReward} XP`}
        </div>
      </div>
    </div>
  );
}

// ─── Bosses Tab ──────────────────────────────────────────────

function BossesTab({ bosses }: { bosses: ReturnType<typeof getBosses> }) {
  const defeated = bosses.filter((b) => b.defeated).length;
  return (
    <div>
      <div className="mb-4 text-sm opacity-75">
        Defeated: <strong>{defeated}/{bosses.length}</strong>
      </div>
      <div className="flex flex-col gap-3">
        {bosses.map((boss) => (
          <div key={boss.id} className="flex items-center justify-between p-4 rounded-lg border"
            style={{
              borderColor: boss.defeated ? '#81c78440' : '#ef535040',
              backgroundColor: boss.defeated ? '#81c78408' : '#ef535008',
            }}>
            <div>
              <div className="font-bold text-lg" style={{ color: boss.defeated ? '#81c784' : '#ef5350' }}>
                {boss.name}
              </div>
              <div className="text-sm opacity-75">{boss.challenge}</div>
            </div>
            <div className="text-right">
              {boss.defeated ? (
                <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: '#81c78422', color: '#81c784' }}>
                  DEFEATED
                </span>
              ) : (
                <span className="text-xs font-bold" style={{ color: '#ffd54f' }}>{boss.xpReward} XP</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Achievements Tab ────────────────────────────────────────

function AchievementsTab({ earnedIds, newlyUnlocked }: { earnedIds: Set<string>; newlyUnlocked: string[] }) {
  return (
    <div>
      {CATEGORIES.map((cat) => {
        const catAchievements = ACHIEVEMENTS.filter((a) => a.category === cat);
        const catEarned = catAchievements.filter((a) => earnedIds.has(a.id)).length;
        const info = CATEGORY_INFO[cat];

        return (
          <div key={cat} className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="m-0" style={{ color: info.color }}>{info.label}</h4>
              <span className="text-xs opacity-50">{catEarned}/{catAchievements.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {catAchievements.map((a) => {
                const isEarned = earnedIds.has(a.id);
                const isNew = newlyUnlocked.includes(a.id);
                const isSecret = a.secret && !isEarned;

                return (
                  <div key={a.id}
                    className={`flex justify-between items-center p-3 rounded-lg border ${isEarned ? '' : 'opacity-40'}`}
                    style={{
                      borderColor: isNew ? '#ffd54f40' : isEarned ? info.color + '30' : undefined,
                      backgroundColor: isNew ? '#ffd54f08' : isEarned ? info.color + '08' : undefined,
                    }}>
                    <div>
                      <div className="font-bold">{isSecret ? '????' : a.title}</div>
                      <div className="text-xs text-text-muted">{isSecret ? 'Hidden achievement' : a.description}</div>
                    </div>
                    {isEarned && (
                      <span className="text-xs font-bold whitespace-nowrap" style={{ color: info.color }}>
                        {isNew ? 'NEW!' : 'Unlocked'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Seasons Tab ─────────────────────────────────────────────

function SeasonsTab({ seasons }: { seasons: ReturnType<typeof getSeasons> }) {
  if (seasons.length === 0) return <p className="text-text-muted">No seasons yet.</p>;

  return (
    <div>
      <div className="flex flex-col gap-3">
        {[...seasons].reverse().map((s) => (
          <div key={s.number} className="p-4 rounded-lg border"
            style={{
              borderColor: s.isActive ? '#7986cb40' : 'var(--color-border)',
              backgroundColor: s.isActive ? '#7986cb08' : undefined,
            }}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-lg">
                Season {s.number}
                {s.isActive && <span className="text-xs ml-2 px-2 py-0.5 rounded" style={{ backgroundColor: '#7986cb22', color: '#7986cb' }}>ACTIVE</span>}
              </div>
              <div className="text-sm opacity-60">{s.startDate} → {s.endDate}</div>
            </div>
            <div className="flex gap-4 text-sm">
              <span><strong>{s.sessions}</strong> sessions</span>
              <span><strong>{s.prCount}</strong> PRs</span>
              <span><strong>{s.totalXP.toLocaleString()}</strong> XP</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

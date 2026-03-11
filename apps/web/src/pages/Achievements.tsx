import { useState, useMemo } from 'react';
import { useLifts } from '../lib/useLifts';
import { ACHIEVEMENTS, checkAchievements, CATEGORY_INFO, type AchievementCategory } from '../lib/achievements';
import type { Achievement } from '../lib/achievements';
import { calcXPProfile, getLifterClass, getTitle, getRank, RANKS, getBosses, getDailyQuests, getWeeklyQuests, getSeasons, getInsights } from '../lib/gamification';
import { groupByDay, getBestRecentSets } from '@ironlogs/analytics';
import type { LiftEntry } from '@ironlogs/core';

const CATEGORIES: AchievementCategory[] = ['strength', 'consistency', 'endurance', 'program', 'legendary', 'secret'];

const RARITY_COLORS: Record<AchievementCategory, { bg: string; border: string; text: string }> = {
  strength: { bg: '#ef535012', border: '#ef535040', text: '#ef5350' },
  consistency: { bg: '#42a5f512', border: '#42a5f540', text: '#42a5f5' },
  endurance: { bg: '#66bb6a12', border: '#66bb6a40', text: '#66bb6a' },
  program: { bg: '#7986cb12', border: '#7986cb40', text: '#7986cb' },
  legendary: { bg: '#ffd54f12', border: '#ffd54f40', text: '#ffd54f' },
  secret: { bg: '#ab47bc12', border: '#ab47bc40', text: '#ab47bc' },
};

export default function Achievements() {
  const { entries, loading } = useLifts();
  const [tab, setTab] = useState<'profile' | 'quests' | 'bosses' | 'achievements' | 'seasons'>('profile');

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

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: '⚔' },
    { key: 'quests' as const, label: 'Quests', icon: '📜' },
    { key: 'bosses' as const, label: 'Bosses', icon: '💀' },
    { key: 'achievements' as const, label: 'Achievements', icon: '🏆' },
    { key: 'seasons' as const, label: 'Seasons', icon: '📅' },
  ];

  return (
    <div>
      <h2>Character</h2>

      <div className="flex gap-1.5 mb-8 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`whitespace-nowrap text-sm ${t.key === tab ? 'btn-primary' : 'btn-secondary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <ProfileTab xp={xp} lifterClass={lifterClass} title={title} rank={rank} insights={insights}
          earnedCount={earned.length} totalCount={ACHIEVEMENTS.length}
          earned={earned} earnedIds={earnedIds} entries={entries} />
      )}
      {tab === 'quests' && <QuestsTab daily={dailyQuests} weekly={weeklyQuests} />}
      {tab === 'bosses' && <BossesTab bosses={bosses} />}
      {tab === 'achievements' && <AchievementsTab earnedIds={earnedIds} />}
      {tab === 'seasons' && <SeasonsTab seasons={seasons} />}
    </div>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────

function ProfileTab({ xp, lifterClass, title, rank, insights, earnedCount, totalCount, earned, earnedIds, entries }: {
  xp: ReturnType<typeof calcXPProfile>;
  lifterClass: ReturnType<typeof getLifterClass>;
  title: ReturnType<typeof getTitle>;
  rank: ReturnType<typeof getRank>;
  insights: ReturnType<typeof getInsights>;
  earnedCount: number;
  totalCount: number;
  earned: ReturnType<typeof checkAchievements>;
  earnedIds: Set<string>;
  entries: LiftEntry[];
}) {
  const pct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  // Find next rank milestone
  const currentRankIdx = RANKS.findIndex((r) => r.name === rank.name);
  const nextRank = currentRankIdx > 0 ? RANKS[currentRankIdx - 1] : null;

  // Find next unearned achievement
  const unearnedAchievements = ACHIEVEMENTS.filter((a) => !earnedIds.has(a.id) && !a.secret);
  const nextAchievement = unearnedAchievements[0];

  // Recent unlocks (max 3)
  const recentUnlocks = earned.slice(-3).reverse();

  // Lifetime stats
  const lifetime = useMemo(() => {
    const sessions = groupByDay(entries);
    const totalTonnage = sessions.reduce((sum, s) => sum + s.tonnage, 0);

    // Calculate current streak (consecutive days with sessions, allowing 1 rest day gaps)
    let currentStreak = 0;
    let bestStreak = 0;
    if (sessions.length > 0) {
      const dates = sessions.map((s) => s.date).sort().reverse();
      currentStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1] + 'T00:00:00');
        const curr = new Date(dates[i] + 'T00:00:00');
        const gap = (prev.getTime() - curr.getTime()) / 86400000;
        if (gap <= 2) { currentStreak++; } else { break; }
      }
      // Best streak
      let streak = 1;
      const sortedDates = [...dates].reverse();
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1] + 'T00:00:00');
        const curr = new Date(sortedDates[i] + 'T00:00:00');
        const gap = (curr.getTime() - prev.getTime()) / 86400000;
        if (gap <= 2) { streak++; } else { streak = 1; }
        if (streak > bestStreak) bestStreak = streak;
      }
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    }

    return {
      sessionCount: sessions.length,
      totalTonnage: Math.round(totalTonnage / 1000 * 10) / 10,
      currentStreak,
      bestStreak,
    };
  }, [entries]);

  return (
    <div className="profile-sections">
      {/* Level Hero — dramatic */}
      <div className="level-hero">
        <div className="level-hero-top">
          <div className="level-number-wrap">
            <span className="level-label">LEVEL</span>
            <span className="level-number">{xp.level}</span>
          </div>
          <div className="level-meta">
            <div className="level-xp-total">{xp.totalXP.toLocaleString()} XP</div>
            <div className="level-xp-next">{(xp.xpForNextLevel - xp.xpInCurrentLevel).toLocaleString()} XP to Level {xp.level + 1}</div>
          </div>
        </div>
        <div className="level-bar-track">
          <div className="level-bar-fill" style={{ width: `${xp.progressPct}%` }} />
        </div>
        <div className="level-hero-footer">
          <span className="text-text-muted text-xs">{xp.xpInCurrentLevel} / {xp.xpForNextLevel}</span>
          {nextRank && (
            <span className="level-milestone">
              Next rank: <span style={{ color: nextRank.color, fontWeight: 700 }}>{nextRank.name}</span>
            </span>
          )}
        </div>
      </div>

      {/* Character Identity Cards */}
      <div className="profile-stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: lifterClass.color }}>&#9876;</div>
          <div className="label">Class</div>
          <div className="value text-base" style={{ color: lifterClass.color }}>{lifterClass.name}</div>
          <div className="sub">{lifterClass.description}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: title.color }}>&#9733;</div>
          <div className="label">Title</div>
          <div className="value text-base" style={{ color: title.color }}>{title.name}</div>
          <div className="sub">reputation</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: rank.color }}>&#9670;</div>
          <div className="label">Rank</div>
          <div className="value text-base" style={{ color: rank.color }}>{rank.name}</div>
          <div className="sub">score &ge; {rank.minScore}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: '#ffd54f' }}>&#127942;</div>
          <div className="label">Achievements</div>
          <div className="value text-base">{earnedCount}/{totalCount}</div>
          <div className="achievement-mini-bar">
            <div className="achievement-mini-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="sub">{pct}% complete</div>
        </div>
      </div>

      {/* Lifetime Stats */}
      <div className="card">
        <h4 className="section-header">Lifetime Stats</h4>
        <div className="lifetime-stats-grid">
          <div className="lifetime-stat">
            <div className="lifetime-stat-value">{lifetime.sessionCount}</div>
            <div className="lifetime-stat-label">Sessions</div>
          </div>
          <div className="lifetime-stat">
            <div className="lifetime-stat-value">{lifetime.totalTonnage} tons</div>
            <div className="lifetime-stat-label">Total Volume</div>
          </div>
          <div className="lifetime-stat">
            <div className="lifetime-stat-value">{xp.totalXP.toLocaleString()}</div>
            <div className="lifetime-stat-label">Total XP</div>
          </div>
          <div className="lifetime-stat">
            <div className="lifetime-stat-value">{lifetime.bestStreak}d</div>
            <div className="lifetime-stat-label">Best Streak</div>
          </div>
        </div>
      </div>

      {/* Recent Unlocks + Next Achievement */}
      {recentUnlocks.length > 0 && (
        <div className="card">
          <h4 className="section-header">Recent Unlocks</h4>
          <div className="flex flex-col gap-2">
            {recentUnlocks.map((a) => {
              const rarity = RARITY_COLORS[a.category];
              return (
                <div key={a.id} className="achievement-row" style={{ borderColor: rarity.border, backgroundColor: rarity.bg }}>
                  <div>
                    <span className="achievement-category-tag" style={{ color: rarity.text, borderColor: rarity.border }}>{CATEGORY_INFO[a.category].label}</span>
                    <span className="font-bold">{a.title}</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: rarity.text }}>Unlocked</span>
                </div>
              );
            })}
          </div>
          {earnedCount > 3 && (
            <div className="text-text-muted text-sm mt-2">+{earnedCount - 3} more earned</div>
          )}
        </div>
      )}

      {/* Next Achievement — standalone highlight with progress */}
      {nextAchievement && <NextAchievementCard achievement={nextAchievement} entries={entries} />}

      {/* Training Insights */}
      {insights.length > 0 && (
        <div className="card">
          <h4 className="section-header">Training Insights</h4>
          <div className="flex flex-col gap-2">
            {insights.map((ins, i) => (
              <div key={i} className="insight-row" style={{ borderLeftColor: ins.color }}>
                <div className="flex items-center gap-2">
                  <span className="insight-icon" style={{ color: ins.color }}>{getInsightIcon(ins.title)}</span>
                  <span className="font-bold text-sm" style={{ color: ins.color }}>{ins.title}</span>
                </div>
                <div className="text-sm text-text-secondary">{ins.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent XP */}
      {xp.sessions.length > 0 && (
        <div className="card">
          <h4 className="section-header">Recent XP</h4>
          <div className="xp-table-wrap">
            <table className="xp-table">
              <thead><tr><th>Date</th><th>Tonnage</th><th>AMRAP</th><th>PR</th><th>Streak</th><th>Total</th></tr></thead>
              <tbody>
                {xp.sessions.slice(-10).reverse().map((s, i) => (
                  <tr key={s.date} className={i % 2 === 0 ? 'xp-row-even' : ''}>
                    <td>{s.date}</td>
                    <td>{s.tonnageXP}</td>
                    <td>{s.amrapXP > 0 ? <span style={{ color: '#81c784' }}>+{s.amrapXP}</span> : <span className="text-text-muted">—</span>}</td>
                    <td>{s.prXP > 0 ? <span style={{ color: '#ffd54f' }}>+{s.prXP}</span> : <span className="text-text-muted">—</span>}</td>
                    <td>{s.streakXP > 0 ? <span style={{ color: '#7986cb' }}>+{s.streakXP}</span> : <span className="text-text-muted">—</span>}</td>
                    <td className="xp-total-cell">{s.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function getInsightIcon(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('pr') || t.includes('record')) return '\u2197';
  if (t.includes('power') || t.includes('strong')) return '\u26A1';
  if (t.includes('streak') || t.includes('consist')) return '\uD83D\uDD25';
  if (t.includes('volume') || t.includes('tonnage')) return '\uD83D\uDCCA';
  if (t.includes('day') || t.includes('time')) return '\uD83D\uDCC5';
  return '\uD83D\uDCA1';
}

/** Extract progress towards an achievement from its description + current data. */
function getAchievementProgress(achievement: Achievement, entries: LiftEntry[]): { current: number; target: number; label: string } | null {
  const desc = achievement.description;

  // "Bench 1RM >= 80kg" pattern
  const liftMatch = desc.match(/(Bench|Squat|Deadlift|OHP)\s+1RM\s*[≥>=]+\s*(\d+)kg/i);
  if (liftMatch) {
    const lift = liftMatch[1].toLowerCase();
    const target = parseInt(liftMatch[2]);
    const best = getBestRecentSets(entries);
    const current = Math.round(best[lift]?.estimated1RM ?? 0);
    return { current, target, label: `${current}kg / ${target}kg` };
  }

  // "Log N sessions" pattern
  const sessionMatch = desc.match(/Log\s+(\d+)\s+session/i);
  if (sessionMatch) {
    const target = parseInt(sessionMatch[1]);
    const current = groupByDay(entries).length;
    return { current, target, label: `${current} / ${target} sessions` };
  }

  // "Lift N tons total" pattern
  const tonnageMatch = desc.match(/Lift\s+([\d,]+)\s+tons?\s+total/i);
  if (tonnageMatch) {
    const target = parseInt(tonnageMatch[1].replace(/,/g, ''));
    const current = Math.round(groupByDay(entries).reduce((s, d) => s + d.tonnage, 0) / 1000);
    return { current, target, label: `${current} / ${target} tons` };
  }

  // "N-day training streak" pattern
  const streakMatch = desc.match(/(\d+)-day\s+training\s+streak/i);
  if (streakMatch) {
    const target = parseInt(streakMatch[1]);
    const dates = groupByDay(entries).map((s) => s.date).sort();
    let max = dates.length > 0 ? 1 : 0, cur = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = Math.round((new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()) / 86400000);
      if (diff === 1) { cur++; max = Math.max(max, cur); } else { cur = 1; }
    }
    return { current: max, target, label: `${max} / ${target} days` };
  }

  // "Complete N total reps" pattern
  const repMatch = desc.match(/Complete\s+([\d,]+)\s+total\s+reps/i);
  if (repMatch) {
    const target = parseInt(repMatch[1].replace(/,/g, ''));
    const current = entries.reduce((s, e) => s + e.reps, 0);
    return { current, target, label: `${current.toLocaleString()} / ${target.toLocaleString()} reps` };
  }

  return null;
}

function NextAchievementCard({ achievement, entries }: { achievement: Achievement; entries: LiftEntry[] }) {
  const progress = getAchievementProgress(achievement, entries);
  const progressPct = progress ? Math.min(100, Math.round((progress.current / progress.target) * 100)) : null;

  return (
    <div className="next-achievement-card">
      <div className="next-achievement-label">Next Achievement</div>
      <div className="next-achievement-title">{achievement.title}</div>
      <div className="next-achievement-desc">{achievement.description}</div>
      {progress && progressPct !== null && (
        <div className="next-achievement-progress">
          <div className="next-achievement-bar-track">
            <div className="next-achievement-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="next-achievement-progress-label">{progress.label}</div>
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
    <div className="profile-sections">
      <div>
        <h4 className="section-header">Daily Quests</h4>
        <div className="flex flex-col gap-2">
          {daily.map((q) => (
            <QuestCard key={q.id} quest={q} />
          ))}
        </div>
      </div>

      <div>
        <h4 className="section-header">Weekly Quests</h4>
        <div className="flex flex-col gap-2">
          {weekly.map((q) => (
            <QuestCard key={q.id} quest={q} />
          ))}
        </div>
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

function AchievementsTab({ earnedIds }: { earnedIds: Set<string> }) {
  return (
    <div className="profile-sections">
      {CATEGORIES.map((cat) => {
        const catAchievements = ACHIEVEMENTS.filter((a) => a.category === cat);
        const catEarned = catAchievements.filter((a) => earnedIds.has(a.id)).length;
        const info = CATEGORY_INFO[cat];
        const rarity = RARITY_COLORS[cat];
        const catPct = catAchievements.length > 0 ? Math.round((catEarned / catAchievements.length) * 100) : 0;

        return (
          <div key={cat}>
            <div className="flex items-center gap-3 mb-3">
              <h4 className="m-0" style={{ color: info.color }}>{info.label}</h4>
              <span className="text-xs opacity-50">{catEarned}/{catAchievements.length}</span>
              <div className="achievement-cat-bar">
                <div className="achievement-cat-fill" style={{ width: `${catPct}%`, backgroundColor: info.color }} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {catAchievements.map((a) => {
                const isEarned = earnedIds.has(a.id);
                const isSecret = a.secret && !isEarned;

                return (
                  <div key={a.id}
                    className="achievement-row"
                    style={{
                      borderColor: isEarned ? rarity.border : 'var(--color-border)',
                      backgroundColor: isEarned ? rarity.bg : undefined,
                      opacity: isEarned ? 1 : 0.4,
                    }}>
                    <div>
                      <div className="font-bold">{isSecret ? '????' : a.title}</div>
                      <div className="text-xs text-text-muted">{isSecret ? 'Hidden achievement' : a.description}</div>
                    </div>
                    {isEarned && (
                      <span className="text-xs font-bold whitespace-nowrap" style={{ color: rarity.text }}>
                        Unlocked
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

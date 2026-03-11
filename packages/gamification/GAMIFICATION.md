# IronLogs Gamification System

Technical documentation for the XP, leveling, and character systems.

## XP Sources

Each logged session earns XP from four sources:

### 1. Tonnage XP (base)
```
tonnageXP = round(session_tonnage_kg / 100)
```
A 3,000kg session = 30 XP. This is the baseline — every session earns something just for showing up and moving weight.

### 2. AMRAP Surplus XP
```
amrapXP = surplus_reps × 10  (per AMRAP set)
```
Only applies to `t1_amrap` sets with a `programmed N+` note. If you're programmed for 3+ and hit 8, that's 5 surplus reps = +50 XP. Rewards effort beyond the minimum.

### 3. PR Bonus
```
prXP = 100  (flat, per session with a PR)
```
Awarded when any T1 lift (bench/squat/deadlift/ohp) hits a new estimated 1RM high on that date. One bonus per day regardless of how many PRs.

### 4. Streak Bonus (progressive)
```
streakXP = min((streak - 1) × 5, 50)
```

| Streak | Bonus |
|--------|-------|
| 1 | 0 |
| 2 | +5 |
| 3 | +10 |
| 5 | +20 |
| 8 | +35 |
| 11+ | +50 (cap) |

**Streak definition:** Consecutive sessions with ≤2 calendar day gaps between them. A gap of 3+ days resets the streak to 1. The 2-day tolerance covers programmed rest days (e.g., a 6-day program with 1 rest day won't break the streak).

### Typical Session XP Range
- Light accessory day: ~30-50 XP (tonnage only)
- Full T1+T2 session: ~80-150 XP (tonnage + AMRAP)
- PR day with streak: ~200-300 XP (all sources firing)

## Level Curve

```
XP_required(level) = round(100 × level^1.5)
```

| Level | XP to Next | Cumulative | ~Sessions to reach |
|-------|-----------|------------|-------------------|
| 1 | 100 | 100 | 1 |
| 2 | 283 | 383 | 3-4 |
| 5 | 1,118 | 2,936 | 20-30 |
| 10 | 3,162 | 13,096 | 80-130 |
| 15 | 5,809 | 33,616 | 200-340 |
| 20 | 8,944 | 63,246 | 400-630 |

The curve is game-feel, not milestone-based. Early levels come fast (1-2 sessions), later levels require sustained training over weeks. This is intentional — the *real* progression signals are Rank and Title (see below).

## Character System

Three independent axes, each answering a different question:

### Class — "What am I good at?"
Based on which scoring category (Squat / Floor Pull / Horizontal Press / Vertical Press) has the highest strength score. If all categories are within 15% of each other, you're balanced.

| Class | Condition | Description |
|-------|-----------|-------------|
| The Atlas | All categories within 15% | Balanced Strength |
| The Juggernaut | Squat dominant | Squat Dominance |
| The Titan | Floor Pull dominant | Pulling Dominance |
| The Gladiator | Horizontal Press dominant | Pressing Power |
| The Olympian | Vertical Press dominant | Overhead Strength |
| The Initiate | No data | Just getting started |

### Rank — "How strong am I?"
Based on overall strength score (DOTS-normalized, age-adjusted, averaged across scoring categories).

| Rank | Min Score | Roughly equivalent to |
|------|-----------|----------------------|
| Mythic | 125 | World Class |
| Legend | 112.5 | Elite |
| Warlord | 100 | Exceptional |
| Iron Champion | 87.5 | Advanced |
| Iron Warrior | 75 | Proficient |
| Iron Adept | 60 | Intermediate |
| Apprentice | 45 | Novice |
| Initiate | 30 | Untrained |
| Civilian | 0 | Subpar |

These thresholds map directly to the strength scoring levels. A Rank change = a real shift in strength.

### Title — "How consistent am I?"
Pure session count. No strength requirement, just showing up.

| Title | Sessions |
|-------|----------|
| Legend of Iron | 1,000 |
| Master of Iron | 500 |
| Veteran of Steel | 250 |
| Iron Warrior | 100 |
| Iron Disciple | 50 |
| Barbell Initiate | 10 |
| Newcomer | 1 |

## Weekly Streak (Dashboard)

Separate from the XP streak. Displayed on the Dashboard as "X w" (weeks).

A week (Mon-Sun) counts as "complete" if sessions that week ≥ training days in the program (read from `nsuns-program.json`). The streak = consecutive completed weeks walking backwards from last week. Current week is tracked separately as in-progress.

## Scoring (DOTS)

Strength scores use the DOTS formula (IPF 2019) to normalize for bodyweight:
1. Estimated 1RM via Wathan formula
2. Project to powerlifting total using lift ratio constants
3. Apply DOTS coefficient for bodyweight normalization
4. Age adjustment (quadratic curves for <23 and >40)
5. Scale to 0-125 range with `/2.9` divisor

## Readiness Score

Weighted composite of three signals:

| Component | Weight | Source |
|-----------|--------|--------|
| Sleep | 50% | 7-day average sleep hours (8h = 100%) |
| Fatigue | 30% | ACWR via EWMA (optimal 0.8-1.3) |
| AMRAP Trend | 20% | 7-session average surplus reps |

Score 0-100: Fresh (80+), Good (60-79), Moderate (40-59), Fatigued (<40). Requires 3+ weeks of data for the fatigue component to activate.

# IronLogs Gamification System

Technical documentation for the XP, leveling, skill, and character systems.

## XP Sources

Each logged session earns XP from four sources. Sessions under 500kg total tonnage earn 0 XP (anti-farming).

### 1. Tonnage XP (intensity-weighted)
```
tonnageXP = round(Σ(weight × reps × intensity_factor) / 100)

intensity_factor = clamp(weight / estimate1RM(weight, reps), 0.4, 1.2)
```
Heavy work earns more XP than junk volume. A 100kg×5 set has higher intensity (~0.87) than a 20kg×10 set (~0.75), so equivalent tonnage from heavy work awards more XP.

### 2. AMRAP Surplus XP (capped)
```
amrapXP = min(surplus, 10) × 10  (per AMRAP set)
```
Only applies to `t1_amrap` sets with a `programmed N+` note. Surplus capped at 10 reps per set (max +100 XP per AMRAP) to prevent runaway sets from dominating.

### 3. PR Bonus
```
prXP = 100  (flat, per session with a PR)
```
Awarded when any T1 lift hits a new estimated 1RM high. One bonus per day.

### 4. Streak Bonus (progressive, program-aware)
```
streakXP = min((streak - 1) × 5, 50)
```

**Gap tolerance adapts to training frequency:**
```
expected_gap = ceil(7 / training_days_per_week)
```

| Program | Expected gap | Example |
|---------|-------------|---------|
| 6 days/week | 2 days | Mon-Sat with Sun rest |
| 5 days/week | 2 days | |
| 4 days/week | 2 days | |
| 3 days/week | 3 days | Mon-Wed-Fri |

A gap exceeding `expected_gap` resets the streak to 1.

| Streak | Bonus |
|--------|-------|
| 1 | 0 |
| 2 | +5 |
| 3 | +10 |
| 5 | +20 |
| 8 | +35 |
| 11+ | +50 (cap) |

### Typical Session XP Range
- Light accessory day: ~30-50 XP (tonnage only)
- Full T1+T2 session: ~80-150 XP (tonnage + AMRAP)
- PR day with streak: ~200-300 XP (all sources firing)

## Level Curve

```
XP_required(level) = round(80 × level^1.5)
```

Slightly faster early progression than standard RPG curves, tuned for 3-6x/week training frequency.

| Level | XP to Next | Cumulative | ~Sessions to reach |
|-------|-----------|------------|-------------------|
| 1 | 80 | 80 | 1 |
| 2 | 226 | 306 | 2-3 |
| 5 | 894 | 2,349 | 15-25 |
| 10 | 2,530 | 10,477 | 65-100 |
| 15 | 4,648 | 26,893 | 170-270 |
| 20 | 7,155 | 50,597 | 320-500 |

## Per-Lift Skill System (Runescape-style)

Each T1 lift has its own independent XP and level progression.

### Skill XP
```
liftXP = lift_session_tonnage / 50
```

### Skill Level Curve
Same exponential as overall: `80 × level^1.5`

### Tracked Lifts
- Bench (blue)
- Squat (pink)
- Deadlift (green)
- OHP (yellow)

Skills provide **continuous visible progress** even during strength plateaus. The progress bars always move as long as you train, which maintains motivation when PRs become rare.

## Character System

Three independent axes, each answering a different question:

### Class — "What am I good at?"
Based on which scoring category has the highest strength score. Balanced threshold: within **20%** of each other.

| Class | Condition | Description |
|-------|-----------|-------------|
| The Atlas | All categories within 20% | Balanced Strength |
| The Juggernaut | Squat dominant | Squat Dominance |
| The Titan | Floor Pull dominant | Pulling Dominance |
| The Gladiator | Horizontal Press dominant | Pressing Power |
| The Olympian | Vertical Press dominant | Overhead Strength |
| The Initiate | No data | Just getting started |

### Rank — "How strong am I?"
Based on overall strength score (DOTS-normalized, age-adjusted).

| Rank | Min Score |
|------|-----------|
| Mythic | 125 |
| Legend | 112.5 |
| Warlord | 100 |
| Iron Champion | 87.5 |
| Iron Warrior | 75 |
| Iron Adept | 60 |
| Apprentice | 45 |
| Initiate | 30 |
| Civilian | 0 |

### Title — "How consistent am I?"
Pure session count.

| Title | Sessions |
|-------|----------|
| Legend of Iron | 1,000 |
| Master of Iron | 500 |
| Veteran of Steel | 250 |
| Iron Warrior | 100 |
| Iron Disciple | 50 |
| Barbell Initiate | 10 |
| Newcomer | 1 |

## Status Face System

Doomguy-inspired pixel art face that communicates training state at a glance.

### Primary Signal: Readiness Score
| Readiness | Status | Face |
|-----------|--------|------|
| 80+ | Bloodlust | Red, glowing eyes |
| 60-79 | Determined | Orange, furrowed brow |
| 40-59 | Steady | Green, neutral |
| 20-39 | Tired | Grey-blue, droopy |
| <20 | Wrecked | Dark grey, bruised |

### Modifier: Streak
Streak ≥ 10 sessions boosts status by one tier (e.g. Steady → Determined).

## Weekly Streak (Dashboard)

A week (Mon-Sun) counts as "complete" if sessions that week ≥ **80%** of training days in the program. This survives occasional misses (e.g. 5/6 for a 6-day program). Streak = consecutive completed weeks walking backwards from last week.

## Scoring (DOTS)

1. Estimated 1RM via Wathan formula
2. Project to powerlifting total using lift ratio constants
3. Apply DOTS coefficient for bodyweight normalization
4. Age adjustment (quadratic curves for <23 and >40)
5. Scale to 0-125 range with `/2.9` divisor

## Readiness Score

| Component | Weight | Source |
|-----------|--------|--------|
| Sleep | 50% | 7-day average sleep hours (8h = 100%) |
| Fatigue | 30% | ACWR via EWMA (optimal 0.8-1.3) |
| AMRAP Trend | 20% | 7-session average surplus reps |

Score 0-100: Fresh (80+), Good (60-79), Moderate (40-59), Fatigued (<40).

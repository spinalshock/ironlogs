# IronLogs

**IronLogs** is a **local-first strength training analytics engine** and **serverless Progressive Web App** for lifters who want to own their data.

It turns a simple CSV workout log into detailed strength analytics, fatigue monitoring, progress tracking, and gamified training insights — all without accounts, servers, or databases.

Think **Git for strength training logs**.

---

## Philosophy

- **Local-first** — your training data lives in a CSV file you control.
- **Serverless** — the app runs entirely in the browser (PWA).
- **No accounts** — no login, no tracking, no backend.
- **Program agnostic** — works with any lifting program.
- **Extensible** — analytics and programs can be added via plugins.
- **Hackable** — designed for developers and data-driven lifters.

Your data stays yours.

---

## Live Demo

**[spinalshock.github.io/ironlogs](https://spinalshock.github.io/ironlogs/)**

Open the site and:

- Explore a real training dataset
- Upload your own CSV
- Instantly see strength analytics

No account required.

---

## Features

### Strength Analytics

- Estimated 1RM progression (Wathan formula)
- PR detection and timelines
- Strength trends and velocity (kg/month)
- Strength-to-bodyweight ratios
- Wilks-based scoring and levels

### Training Load & Fatigue

- Session tonnage and weekly volume
- Acute:Chronic Workload Ratio (ACWR)
- Per-lift fatigue tracking
- Plateau detection
- Fatigue reserve estimation

### Program Analysis

Works with any program structure. Includes plugin support for program-specific analytics:

- nSuns compliance tracking
- AMRAP surplus analysis
- Progression monitoring

### Recovery Monitoring

- Sleep tracking and trends
- Bodyweight progression
- Readiness estimation (sleep + fatigue + volume weighted)

### Gamification

Training becomes a progression system:

- XP and leveling (tonnage, AMRAP surplus, PRs, streaks)
- Ranks (Civilian to Mythic) and lifter classes (Juggernaut, Titan, Gladiator, Olympian, Atlas)
- 60+ achievements across 6 categories
- Boss challenges with weight/ratio targets
- Daily and weekly quests
- 12-week seasons

### Visual Analytics

- Strength progression charts
- Training load heatmaps
- PR timelines
- Muscle strength radar charts
- Symmetry scoring

### Import Support

Flexible CSV parsing with auto-detection. Import from:

- **Strong**
- **Hevy**
- Any CSV with `date, lift, weight, reps` columns

---

## CSV Format

Minimal format:

```csv
date,lift,weight,reps
2026-03-09,bench,100,5
2026-03-09,squat,120,3
```

Extended format:

```csv
date,bodyweight,lift,weight,reps,set_type,notes,sleep
2026-03-09,81.55,bench,55,8,t1_amrap,programmed 1+,6
```

| Field      | Description                 | Required |
| ---------- | --------------------------- | -------- |
| date       | Session date (YYYY-MM-DD)   | Yes      |
| lift       | Lift name                   | Yes      |
| weight     | Load (kg or lb)             | Yes      |
| reps       | Repetitions completed       | Yes      |
| bodyweight | Bodyweight                  | No       |
| set_type   | Training set classification | No       |
| notes      | Freeform notes              | No       |
| sleep      | Hours slept previous night  | No       |

---

## Architecture

Modular **monorepo** — analytics are completely independent of the UI.

```
ironlogs/
├── apps/
│   └── web/                  # React 19 PWA dashboard
├── packages/
│   ├── core/                 # Types, config, lift registry
│   ├── csv-parser/           # Flexible CSV ingestion + importers
│   ├── analytics/            # Strength, fatigue, trends, scoring
│   ├── gamification/         # XP, ranks, achievements, bosses
│   └── plugin-api/           # Plugin system
├── plugins/
│   └── plugin-nsuns/         # nSuns 5/3/1 program analytics
├── cli/                      # CLI analytics tool
└── examples/                 # Example datasets
```

Dependency graph (downward only):

```
core → csv-parser → analytics → gamification
                                     ↓
                                plugin-api → plugin-nsuns
```

---

## CLI

```bash
ironlogs analyze training.csv
```

```
  IronLogs Analysis
  ════════════════════════════════════════
  Sessions: 337
  Bodyweight: 81.6kg
  Overall Score: 72 [Intermediate]

  Estimated 1RMs:
    bench        108.2kg  [Intermediate] 68
    squat        152.4kg  [Intermediate] 74
    deadlift     181.5kg  [Intermediate] 78
    ohp          68.3kg   [Intermediate] 66

  Strength Velocity:
    bench        +2.1 kg/month  (gaining)
    squat        +3.4 kg/month  (gaining)

  Fatigue: Moderate (ACWR: 1.12)
```

---

## Getting Started

### 1. Clone

```bash
git clone https://github.com/spinalshock/ironlogs.git
cd ironlogs
```

### 2. Install

```bash
pnpm install
```

### 3. Run

```bash
pnpm dev
```

Open [http://localhost:5173/ironlogs/](http://localhost:5173/ironlogs/)

### 4. Analyze your data

Drop your CSV into `apps/web/public/data/lifts.csv` — or drag and drop in the browser.

---

## Testing

```bash
pnpm --filter @ironlogs/analytics test:run
pnpm --filter @ironlogs/csv-parser test:run
```

---

## Scoring Methodology

### 1RM Estimation

Uses the **Wathan formula** (Wathan, 1994):

```
1RM = 100 * weight / (48.8 + 53.8 * e^(-0.075 * reps))
```

Valid for 1-10 reps. From: Wathan, D. (1994). *Essentials of Strength Training and Conditioning*. NSCA.

### Strength Score

Based on Symmetric Strength's Wilks-based system:

1. Estimate the powerlifting total from each lift using known ratios
2. Apply the Wilks coefficient to normalize for bodyweight
3. Apply age adjustment
4. Score = Wilks * ageAdjustment / 4

### Scoring Categories

| Category         | Lifts                                |
| ---------------- | ------------------------------------ |
| Squat            | Back Squat, Front Squat              |
| Floor Pull       | Deadlift, Sumo Deadlift, Power Clean|
| Horizontal Press | Bench Press, Incline Bench           |
| Vertical Press   | OHP, Push Press                      |
| Pull/Row         | Chin-up, Pull-up, Pendlay Row        |

### Strength Levels

| Level        | Score |
| ------------ | ----- |
| Subpar       | < 30  |
| Untrained    | 30    |
| Novice       | 45    |
| Intermediate | 60    |
| Proficient   | 75    |
| Advanced     | 87.5  |
| Exceptional  | 100   |
| Elite        | 112.5 |
| World Class  | 125   |

---

## Contributing

Contributions are welcome. Areas that need help:

- New analytics modules
- Additional program plugins (5/3/1, GZCL, SBS, etc.)
- Visualization improvements
- Importer support for more apps
- Documentation

---

## Roadmap

- Plugin ecosystem and registry
- Drag-and-drop CSV upload in web app
- Advanced statistical insights
- Static dashboard generation via CLI
- Mobile-friendly logging UI

---

## Data Ownership

Most fitness apps lock your data behind accounts and subscriptions.

IronLogs keeps things simple:

- Your data is a CSV file
- Everything runs locally
- You can export or modify your data anytime

No vendor lock-in.

---

## Tech Stack

- [React 19](https://react.dev/) + TypeScript
- [Vite](https://vitejs.dev/) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Chart.js](https://www.chartjs.org/) via react-chartjs-2
- [Vitest](https://vitest.dev/) for testing
- [pnpm](https://pnpm.io/) workspaces + [Turborepo](https://turbo.build/)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via idb

---

## License

MIT

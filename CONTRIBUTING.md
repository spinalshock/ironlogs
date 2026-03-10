# Contributing to IronLogs

## Dev Setup

```bash
git clone https://github.com/<your-fork>/ironlogs.git
cd ironlogs
pnpm install
pnpm dev          # starts the web app
```

### Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start the web app dev server |
| `pnpm --filter @ironlogs/analytics test:run` | Run analytics tests |
| `pnpm --filter @ironlogs/csv-parser test:run` | Run csv-parser tests |
| `pnpm --filter @ironlogs/web build` | Production build of web app |

## Monorepo Structure

```
packages/core          — types, config, lift registry (zero deps)
packages/csv-parser    — CSV parsing, normalization, importers (depends on core)
packages/analytics     — 1RM estimation, scoring, fatigue, trends (depends on core + csv-parser)
packages/gamification  — XP, ranks, achievements, bosses (depends on analytics)
packages/plugin-api    — plugin system interface
plugins/plugin-nsuns   — nSuns program analytics
apps/web               — React 19 PWA dashboard
cli                    — CLI tool
```

Dependencies flow downward. `core` has zero dependencies. Nothing in `packages/` should import from `apps/` or `cli/`.

---

## How to Add a New Analytics Module

All analytics live in `packages/analytics/src/`. Each module should be a set of pure functions.

1. Create your file in `packages/analytics/src/`, e.g. `myModule.ts`.
2. Write pure functions that take data in and return results. No side effects, no UI dependencies.

```ts
// packages/analytics/src/myModule.ts
import type { LiftEntry } from "@ironlogs/core";

export function calculateSomething(entries: LiftEntry[]): number {
  // your math here
}
```

3. Export from the package barrel file:

```ts
// packages/analytics/src/index.ts
export { calculateSomething } from "./myModule";
```

4. Add tests in `packages/analytics/src/__tests__/myModule.test.ts` (see Testing below).

## How to Write a Plugin

Plugins implement the `IronLogsPlugin` interface from `@ironlogs/plugin-api`.

1. Create a new directory under `plugins/`, e.g. `plugins/plugin-myplugin/`.
2. Add a `package.json` with `@ironlogs/plugin-api` as a dependency.
3. Implement the interface:

```ts
import type { IronLogsPlugin } from "@ironlogs/plugin-api";

const myPlugin: IronLogsPlugin = {
  name: "my-plugin",
  // implement required methods per the interface
};

export default myPlugin;
```

4. See `plugins/plugin-nsuns/` for a working example.

## How to Add an Importer

Importers live in `packages/csv-parser/src/importers/`. Each importer normalizes a specific app's export format into IronLogs' internal format.

1. Create a new file in `packages/csv-parser/src/importers/`, e.g. `myApp.ts`.
2. Export a function that takes raw CSV rows and returns normalized `LiftEntry[]` objects.
3. Register the importer in the importers index so it can be discovered by the parser.
4. Add tests covering edge cases in the source format (missing fields, alternate units, etc.).

## How to Add an Achievement

Achievements are defined in `packages/gamification/src/achievements.ts`.

1. Add a new entry to the achievements array:

```ts
{
  id: "my_achievement",
  name: "Achievement Name",
  description: "What the user did to earn this.",
  check(entries, stats) {
    // return true when the condition is met
  },
}
```

2. The `check` function receives all lift entries and computed stats. Keep it pure -- no async, no side effects.
3. Add a test that verifies the achievement triggers (and does not trigger) with appropriate test data.

---

## Code Style

- **TypeScript strict mode** is enabled across all packages. No `any` unless truly unavoidable.
- **Pure functions preferred.** Analytics, scoring, and gamification logic must be pure. Side effects belong at the edges (apps, CLI, storage).
- **No UI dependencies in packages.** React, DOM APIs, and browser-specific code belong in `apps/web` only. Everything under `packages/` must run in any JS environment.
- **No default exports** in packages (named exports only). Plugins are the exception.
- Keep functions small and composable. Prefer multiple focused functions over one large one.

## Testing

Tests use **Vitest**. Every new module, importer, achievement, or plugin should have tests.

- Place tests in a `__tests__/` directory adjacent to the source, or co-locate as `*.test.ts` files.
- Run tests for a specific package: `pnpm --filter @ironlogs/<package> test:run`
- Tests should be fast and deterministic. No network calls, no file I/O, no timers.
- Use descriptive test names that state the expected behavior.

```ts
import { describe, it, expect } from "vitest";
import { calculateSomething } from "../myModule";

describe("calculateSomething", () => {
  it("returns 0 for an empty entry list", () => {
    expect(calculateSomething([])).toBe(0);
  });
});
```

## PR Process

1. Fork the repo and create a feature branch from `main`.
2. Make your changes. Keep commits focused -- one logical change per commit.
3. Ensure all tests pass: run `pnpm --filter @ironlogs/<affected-package> test:run` for each package you touched.
4. Write a clear PR description: what changed, why, and how to test it.
5. PRs that touch `packages/` must not introduce UI or browser dependencies.
6. PRs that add new exports must include tests.
7. Keep PRs small. If your change spans multiple packages, consider whether it can be split into stacked PRs.

A maintainer will review and may request changes. Once approved, the PR will be squash-merged into `main`.

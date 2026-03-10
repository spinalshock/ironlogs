/**
 * IronLogs Plugin Template
 *
 * Copy this directory to create a new plugin. Rename the package in
 * package.json and fill in the sections below.
 *
 * Each section is optional -- delete any you don't need.
 */

import type { LiftEntry } from '@ironlogs/core';
import type {
  IronLogsPlugin,
  PluginMetric,
  PluginAchievement,
  PluginChart,
  ProgramTemplate,
  PluginImporter,
} from '@ironlogs/plugin-api';

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------
// TODO: Define custom metrics that appear in the dashboard.
// Each metric receives all lift entries and returns a computed value.

const metrics: PluginMetric[] = [
  // Example:
  // {
  //   id: 'my-plugin.total-volume',
  //   name: 'Total Volume',
  //   description: 'Sum of weight x reps across all sets',
  //   compute: (entries: LiftEntry[]) => {
  //     return entries.reduce((sum, e) => sum + e.weight * e.reps, 0);
  //   },
  // },
];

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------
// TODO: Register chart components that can be rendered in the UI.

const charts: PluginChart[] = [
  // Example:
  // {
  //   id: 'my-plugin.volume-chart',
  //   name: 'Volume Over Time',
  //   description: 'Weekly volume trend line',
  //   component: 'VolumeChart',
  // },
];

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------
// TODO: Define achievements that are checked against all entries.

const achievements: PluginAchievement[] = [
  // Example:
  // {
  //   id: 'my-plugin.first-session',
  //   title: 'First Session',
  //   description: 'Log your first workout',
  //   category: 'milestones',
  //   check: (entries: LiftEntry[]) => entries.length > 0,
  // },
];

// ---------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------
// TODO: Define program templates (set/rep schemes) users can follow.

const programs: ProgramTemplate[] = [
  // Example:
  // {
  //   name: 'My Program',
  //   days: [
  //     {
  //       name: 'day1',
  //       label: 'Day 1 - Upper',
  //       primary: {
  //         lift: 'bench',
  //         sets: [
  //           { weight: 0.65, reps: 5 },
  //           { weight: 0.75, reps: 3 },
  //           { weight: 0.85, reps: '1+' },
  //         ],
  //       },
  //       secondary: {
  //         lift: 'ohp',
  //         sets: [{ weight: 0.5, reps: 8 }],
  //       },
  //       accessories: ['lat pulldown', 'face pull'],
  //     },
  //   ],
  // },
];

// ---------------------------------------------------------------------------
// Importers
// ---------------------------------------------------------------------------
// TODO: Define CSV/file importers for external data sources.

const importers: PluginImporter[] = [
  // Example:
  // {
  //   name: 'My App Import',
  //   description: 'Import data exported from My App',
  //   extensions: ['.csv'],
  //   parse: (text: string): LiftEntry[] => {
  //     // Parse the file contents and return LiftEntry objects.
  //     return [];
  //   },
  // },
];

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

const plugin: IronLogsPlugin = {
  // TODO: Give your plugin a unique name matching the package name.
  name: 'plugin-template',
  version: '0.1.0',
  description: 'A template plugin -- replace this with your description.',

  // Remove any sections you don't use.
  metrics,
  charts,
  achievements,
  programs,
  importers,
};

export default plugin;

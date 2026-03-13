import type { LiftEntry } from '@ironlogs/core';

/** Metric computed by a plugin */
export interface PluginMetric {
  id: string;
  name: string;
  description: string;
  compute: (entries: LiftEntry[]) => number | string | null;
}

/** Chart/visualization provided by a plugin */
export interface PluginChart {
  id: string;
  name: string;
  description: string;
  /** React component name or render function */
  component: string;
}

/** Achievement added by a plugin */
export interface PluginAchievement {
  id: string;
  title: string;
  description: string;
  category: string;
  check: (entries: LiftEntry[]) => boolean;
}

/** Computed program (absolute weights — what consumers use) */
export interface ComputedSet {
  weight: number;
  reps: number | string;
}

export interface ComputedLift {
  lift: string;
  sets: ComputedSet[];
}

export interface ComputedDay {
  name: string;
  label: string;
  rest?: boolean;
  t1?: ComputedLift;
  t2?: ComputedLift;
  accessories?: string[];
}

/** Program template (percentage-based, defined by plugins) */
export interface TemplateSet {
  /** Percentage of training max (e.g., 0.65 = 65%) */
  pct: number;
  reps: number | string;
}

export interface TemplateLift {
  /** The actual lift performed (e.g., "cgbench", "front_squat") */
  lift: string;
  /** Which training max to use (e.g., "bench" for CG bench) */
  tmLift: string;
  sets: TemplateSet[];
}

export interface TemplateDay {
  name: string;
  label: string;
  rest?: boolean;
  t1?: TemplateLift;
  t2?: TemplateLift;
  accessories?: string[];
}

export interface ProgramTemplate {
  id: string;
  name: string;
  description?: string;
  /** Factor to derive TM from 1RM (e.g., 0.9 for nSuns) */
  tmFactor: number;
  /** Lifts that have training maxes */
  tmLifts: string[];
  days: TemplateDay[];
}

/** Training maxes keyed by lift name */
export type TrainingMaxes = Record<string, number>;

/** Round to nearest multiple (MROUND equivalent) */
export function mround(value: number, multiple: number): number {
  if (multiple === 0) return value;
  return Math.round(value / multiple) * multiple;
}

/** Compute absolute weight from TM, percentage, and rounding factor */
export function computeWeight(tm: number, pct: number, roundTo: number): number {
  return mround(tm * pct, roundTo);
}

/** Compute a full program with absolute weights from a template + training maxes */
export function computeProgram(
  template: ProgramTemplate,
  tms: TrainingMaxes,
  roundTo: number,
): ComputedDay[] {
  return template.days.map((day) => {
    if (day.rest) {
      return { name: day.name, label: day.label, rest: true };
    }

    const result: ComputedDay = {
      name: day.name,
      label: day.label,
      accessories: day.accessories,
    };

    if (day.t1) {
      const tm = tms[day.t1.tmLift] ?? 0;
      result.t1 = {
        lift: day.t1.lift,
        sets: day.t1.sets.map((s) => ({
          weight: computeWeight(tm, s.pct, roundTo),
          reps: s.reps,
        })),
      };
    }

    if (day.t2) {
      const tm = tms[day.t2.tmLift] ?? 0;
      result.t2 = {
        lift: day.t2.lift,
        sets: day.t2.sets.map((s) => ({
          weight: computeWeight(tm, s.pct, roundTo),
          reps: s.reps,
        })),
      };
    }

    return result;
  });
}

/** CSV importer */
export interface PluginImporter {
  name: string;
  description: string;
  /** File extensions this importer handles */
  extensions: string[];
  parse: (text: string) => LiftEntry[];
}

/** Current plugin API version. Plugins declare the API version they target. */
export const PLUGIN_API_VERSION = 1;

/** The main plugin interface */
export interface IronLogsPlugin {
  name: string;
  version: string;
  /** Target API version for forward compatibility checks */
  apiVersion?: number;
  description?: string;

  /** Additional metrics */
  metrics?: PluginMetric[];

  /** Additional charts/visualizations */
  charts?: PluginChart[];

  /** Additional achievements */
  achievements?: PluginAchievement[];

  /** Program templates (percentage-based) */
  programs?: ProgramTemplate[];

  /** CSV importers */
  importers?: PluginImporter[];
}

/** Plugin registry */
const plugins = new Map<string, IronLogsPlugin>();

export function registerPlugin(plugin: IronLogsPlugin): void {
  if (plugin.apiVersion && plugin.apiVersion > PLUGIN_API_VERSION) {
    console.warn(
      `Plugin "${plugin.name}" targets API v${plugin.apiVersion} but runtime is v${PLUGIN_API_VERSION}. ` +
      `Some features may not work.`,
    );
  }
  plugins.set(plugin.name, plugin);
}

export function getPlugin(name: string): IronLogsPlugin | undefined {
  return plugins.get(name);
}

export function getAllPlugins(): IronLogsPlugin[] {
  return Array.from(plugins.values());
}

export function getPluginAchievements(): PluginAchievement[] {
  return getAllPlugins().flatMap((p) => p.achievements || []);
}

export function getPluginPrograms(): ProgramTemplate[] {
  return getAllPlugins().flatMap((p) => p.programs || []);
}

export function getPluginImporters(): PluginImporter[] {
  return getAllPlugins().flatMap((p) => p.importers || []);
}

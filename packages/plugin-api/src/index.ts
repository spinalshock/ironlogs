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

/** Program template (set/rep scheme) */
export interface ProgramSet {
  weight: number;
  reps: string | number;
}

export interface ProgramLift {
  lift: string;
  sets: ProgramSet[];
}

export interface ProgramDay {
  name: string;
  label: string;
  primary: ProgramLift;
  secondary: ProgramLift;
  accessories: string[];
}

export interface ProgramTemplate {
  name: string;
  days: ProgramDay[];
}

/** CSV importer */
export interface PluginImporter {
  name: string;
  description: string;
  /** File extensions this importer handles */
  extensions: string[];
  parse: (text: string) => LiftEntry[];
}

/** The main plugin interface */
export interface IronLogsPlugin {
  name: string;
  version: string;
  description?: string;

  /** Additional metrics */
  metrics?: PluginMetric[];

  /** Additional charts/visualizations */
  charts?: PluginChart[];

  /** Additional achievements */
  achievements?: PluginAchievement[];

  /** Program templates */
  programs?: ProgramTemplate[];

  /** CSV importers */
  importers?: PluginImporter[];
}

/** Plugin registry */
const plugins = new Map<string, IronLogsPlugin>();

export function registerPlugin(plugin: IronLogsPlugin): void {
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

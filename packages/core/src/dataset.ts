import type { LiftEntry, DaySession } from './types.js';

/**
 * A normalized, validated training dataset.
 * All analytics functions should accept this instead of raw arrays.
 * Created once from parsed CSV data, then passed to all analytics.
 */
export interface TrainingDataset {
  /** All valid lift entries, sorted by date */
  sets: LiftEntry[];
  /** Sets grouped into daily sessions */
  sessions: DaySession[];
  /** Summary per lift */
  lifts: LiftSummary[];
  /** Metadata about the dataset */
  meta: DatasetMeta;
}

export interface LiftSummary {
  lift: string;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  firstSeen: string;
  lastSeen: string;
  bestWeight: number;
}

export interface DatasetMeta {
  totalSets: number;
  totalSessions: number;
  dateRange: [string, string] | null;
  uniqueLifts: string[];
  hasBodyweight: boolean;
  hasSetTypes: boolean;
  hasSleep: boolean;
}

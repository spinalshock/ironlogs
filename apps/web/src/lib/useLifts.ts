import { useLiftsContext } from './LiftsContext';

/**
 * React hook to access lift entries (CSV + locally logged via IndexedDB).
 * All pages use this hook. Data is provided by LiftsProvider in main.tsx.
 */
export function useLifts() {
  const { entries, loading, isDemo, loadCSV, refreshLocalLifts } = useLiftsContext();
  return { entries, loading, isDemo, loadCSV, refreshLocalLifts };
}

// Re-export analytics functions so existing pages don't need import changes
export {
  groupByDay,
  getLatestBodyweight,
  getAllUniqueLifts,
  getBodyweightProgression,
  getSleepProgression,
  getSleepStats,
  get1RMProgression,
  findPRs,
  getBestRecentSets,
  getUniqueLifts,
  calcFatigue,
  type FatigueData,
} from '@ironlogs/analytics';

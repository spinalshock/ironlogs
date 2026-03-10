import { useState, useEffect } from 'react';
import type { LiftEntry } from '@ironlogs/core';
import { parseCSV } from '@ironlogs/csv-parser';

/**
 * React hook to load lift entries from CSV.
 * This is the only browser-specific part — all analytics are in @ironlogs/analytics.
 */
export function useLifts() {
  const [entries, setEntries] = useState<LiftEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/lifts.csv`)
      .then((r) => r.text())
      .then((text) => {
        const result = parseCSV(text);
        setEntries(result.entries);
        setLoading(false);
      });
  }, []);

  const loadCSV = (text: string) => {
    const result = parseCSV(text);
    setEntries(result.entries);
    setIsDemo(false);
  };

  return { entries, loading, isDemo, loadCSV };
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

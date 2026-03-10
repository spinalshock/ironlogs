import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { LiftEntry } from '@ironlogs/core';
import { parseCSV } from '@ironlogs/csv-parser';
import { getLocalLifts } from './storage';

interface LiftsContextValue {
  entries: LiftEntry[];
  loading: boolean;
  isDemo: boolean;
  loadCSV: (text: string) => void;
  /** Call after logging new entries to IndexedDB so the rest of the app sees them. */
  refreshLocalLifts: () => Promise<void>;
}

const LiftsContext = createContext<LiftsContextValue>({
  entries: [],
  loading: true,
  isDemo: true,
  loadCSV: () => {},
  refreshLocalLifts: async () => {},
});

export function LiftsProvider({ children }: { children: ReactNode }) {
  const [csvEntries, setCsvEntries] = useState<LiftEntry[]>([]);
  const [localEntries, setLocalEntries] = useState<LiftEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(true);

  // Load CSV + IndexedDB on mount
  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/lifts.csv`)
        .then((r) => r.text())
        .then((text) => parseCSV(text).entries),
      getLocalLifts().catch(() => [] as LiftEntry[]),
    ]).then(([csv, local]) => {
      setCsvEntries(csv);
      setLocalEntries(local);
      setLoading(false);
    });
  }, []);

  const loadCSV = useCallback((text: string) => {
    const result = parseCSV(text);
    setCsvEntries(result.entries);
    setIsDemo(false);
  }, []);

  const refreshLocalLifts = useCallback(async () => {
    const local = await getLocalLifts();
    setLocalEntries(local);
  }, []);

  // Merge CSV + local, deduplicate by date+lift+weight+reps, sort by date
  const entries = mergeEntries(csvEntries, localEntries);

  return (
    <LiftsContext.Provider value={{ entries, loading, isDemo, loadCSV, refreshLocalLifts }}>
      {children}
    </LiftsContext.Provider>
  );
}

/** Merge CSV and IndexedDB entries, deduplicating exact matches. */
function mergeEntries(csv: LiftEntry[], local: LiftEntry[]): LiftEntry[] {
  if (local.length === 0) return csv;

  const seen = new Set<string>();
  for (const e of csv) {
    seen.add(`${e.date}|${e.lift}|${e.weight}|${e.reps}|${e.set_type}`);
  }

  const merged = [...csv];
  for (const e of local) {
    const key = `${e.date}|${e.lift}|${e.weight}|${e.reps}|${e.set_type}`;
    if (!seen.has(key)) {
      merged.push(e);
      seen.add(key);
    }
  }

  return merged.sort((a, b) => a.date.localeCompare(b.date));
}

export function useLiftsContext() {
  return useContext(LiftsContext);
}

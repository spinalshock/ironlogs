import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { LiftEntry } from '@ironlogs/core';
import { parseCSV } from '@ironlogs/csv-parser';

interface LiftsContextValue {
  entries: LiftEntry[];
  loading: boolean;
  isDemo: boolean;
  loadCSV: (text: string) => void;
}

const LiftsContext = createContext<LiftsContextValue>({
  entries: [],
  loading: true,
  isDemo: true,
  loadCSV: () => {},
});

export function LiftsProvider({ children }: { children: ReactNode }) {
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

  const loadCSV = useCallback((text: string) => {
    const result = parseCSV(text);
    setEntries(result.entries);
    setIsDemo(false);
  }, []);

  return (
    <LiftsContext.Provider value={{ entries, loading, isDemo, loadCSV }}>
      {children}
    </LiftsContext.Provider>
  );
}

export function useLiftsContext() {
  return useContext(LiftsContext);
}

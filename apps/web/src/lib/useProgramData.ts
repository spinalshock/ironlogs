import { useMemo } from 'react';
import { computeProgram } from '@ironlogs/plugin-api';
import type { ComputedDay } from '@ironlogs/plugin-api';
import { NSUNS_5DAY_TEMPLATE } from '@ironlogs/plugin-nsuns';
import { USER_CONFIG } from '../config';

interface ProgramData {
  days: ComputedDay[];
  trainingDaysPerWeek: number;
  loading: boolean;
}

export function useProgramData(): ProgramData {
  const days = useMemo(
    () => computeProgram(NSUNS_5DAY_TEMPLATE, USER_CONFIG.trainingMaxes, USER_CONFIG.roundTo),
    [],
  );

  const trainingDaysPerWeek = days.filter((d) => !d.rest).length || 6;

  return { days, trainingDaysPerWeek, loading: false };
}

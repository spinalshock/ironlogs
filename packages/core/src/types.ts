export interface LiftEntry {
  date: string;
  bodyweight: number;
  lift: string;
  weight: number;
  reps: number;
  set_type: string;
  notes: string;
  sleep: number;
}

export interface DaySession {
  date: string;
  bodyweight: number;
  sleep: number;
  lifts: LiftEntry[];
  tonnage: number;
  liftTonnage: Record<string, number>;
}

export interface LiftPR {
  date: string;
  weight: number;
  reps: number;
  estimated1RM: number;
}

export interface StrengthScore {
  lift: string;
  estimated1RM: number;
  score: number;
  level: string;
  color: string;
}

export type StrengthLevel =
  | 'Subpar'
  | 'Untrained'
  | 'Novice'
  | 'Intermediate'
  | 'Proficient'
  | 'Advanced'
  | 'Exceptional'
  | 'Elite'
  | 'World Class';

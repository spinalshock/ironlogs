export interface UserConfig {
  name: string;
  age: number;
  sex: 'male' | 'female';
  units: 'kg' | 'lb';
  targetBodyweight: number;
}

export const DEFAULT_CONFIG: UserConfig = {
  name: 'Lifter',
  age: 30,
  sex: 'male',
  units: 'kg',
  targetBodyweight: 80,
};

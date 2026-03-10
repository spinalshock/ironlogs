/**
 * Lift registry — single source of truth for all lift metadata.
 * Defines canonical names, aliases, muscle involvement, and categories.
 */

export interface LiftDefinition {
  id: string;
  name: string;
  aliases: string[];
  category: 'squat' | 'hinge' | 'horizontal_press' | 'vertical_press' | 'pull' | 'accessory';
  muscles: Record<string, number>; // muscle → involvement 0-10
  isCompound: boolean;
}

export const LIFT_REGISTRY: Record<string, LiftDefinition> = {
  squat: {
    id: 'squat',
    name: 'Back Squat',
    aliases: ['back_squat', 'bs', 'barbell_squat'],
    category: 'squat',
    muscles: { quads: 8, glutes: 9, hamstrings: 6, spinalErectors: 6, abdominals: 6, calves: 2, hipAdductors: 6 },
    isCompound: true,
  },
  front_squat: {
    id: 'front_squat',
    name: 'Front Squat',
    aliases: ['fs'],
    category: 'squat',
    muscles: { quads: 10, glutes: 7, hamstrings: 4, abdominals: 8, spinalErectors: 4, calves: 2 },
    isCompound: true,
  },
  bench: {
    id: 'bench',
    name: 'Bench Press',
    aliases: ['bench_press', 'flat_bench', 'bp', 'benchpress'],
    category: 'horizontal_press',
    muscles: { lowerChest: 10, upperChest: 8, triceps: 8, frontDelts: 6, lats: 4 },
    isCompound: true,
  },
  incline_bench: {
    id: 'incline_bench',
    name: 'Incline Bench',
    aliases: ['incline_bench_press', 'incline_press'],
    category: 'horizontal_press',
    muscles: { upperChest: 10, lowerChest: 8, triceps: 8, frontDelts: 6, lats: 4 },
    isCompound: true,
  },
  cgbench: {
    id: 'cgbench',
    name: 'Close Grip Bench',
    aliases: ['close_grip_bench', 'close_grip_bench_press', 'cg_bench'],
    category: 'horizontal_press',
    muscles: { triceps: 10, lowerChest: 8, upperChest: 6, frontDelts: 4 },
    isCompound: true,
  },
  deadlift: {
    id: 'deadlift',
    name: 'Deadlift',
    aliases: ['conventional_deadlift', 'dl', 'conv_deadlift'],
    category: 'hinge',
    muscles: { spinalErectors: 10, hamstrings: 7, glutes: 7, quads: 6, upperTraps: 8, forearms: 4 },
    isCompound: true,
  },
  sumo_deadlift: {
    id: 'sumo_deadlift',
    name: 'Sumo Deadlift',
    aliases: ['sumo', 'sumo_dl'],
    category: 'hinge',
    muscles: { glutes: 8, hamstrings: 8, quads: 8, spinalErectors: 6, upperTraps: 8, hipAdductors: 6 },
    isCompound: true,
  },
  ohp: {
    id: 'ohp',
    name: 'Overhead Press',
    aliases: ['overhead_press', 'shoulder_press', 'military_press', 'strict_press'],
    category: 'vertical_press',
    muscles: { frontDelts: 10, sideDelts: 6, triceps: 8, upperChest: 4, upperTraps: 4 },
    isCompound: true,
  },
  push_press: {
    id: 'push_press',
    name: 'Push Press',
    aliases: ['pp'],
    category: 'vertical_press',
    muscles: { frontDelts: 8, sideDelts: 6, triceps: 8, quads: 4, glutes: 4 },
    isCompound: true,
  },
  chinup: {
    id: 'chinup',
    name: 'Chin-up',
    aliases: ['chin_up', 'chin-up', 'chinups'],
    category: 'pull',
    muscles: { lats: 10, biceps: 8, forearms: 4, abdominals: 8 },
    isCompound: true,
  },
  pullup: {
    id: 'pullup',
    name: 'Pull-up',
    aliases: ['pull_up', 'pull-up', 'pullups'],
    category: 'pull',
    muscles: { lats: 10, biceps: 6, forearms: 6, rearDelts: 6, rotatorCuff: 6 },
    isCompound: true,
  },
  pendlay_row: {
    id: 'pendlay_row',
    name: 'Pendlay Row',
    aliases: ['barbell_row', 'bent_over_row', 'row', 'bb_row'],
    category: 'pull',
    muscles: { lats: 10, rearDelts: 8, biceps: 6, spinalErectors: 5 },
    isCompound: true,
  },
  power_clean: {
    id: 'power_clean',
    name: 'Power Clean',
    aliases: ['clean', 'pc'],
    category: 'hinge',
    muscles: { spinalErectors: 8, quads: 8, glutes: 6, hamstrings: 6, upperTraps: 8, forearms: 6 },
    isCompound: true,
  },
  face_pulls: {
    id: 'face_pulls',
    name: 'Face Pulls',
    aliases: ['face_pull', 'facepulls'],
    category: 'accessory',
    muscles: { rearDelts: 8, rotatorCuff: 6, middleTraps: 6 },
    isCompound: false,
  },
  seated_row: {
    id: 'seated_row',
    name: 'Seated Row',
    aliases: ['cable_row', 'machine_row'],
    category: 'pull',
    muscles: { lats: 8, rearDelts: 6, biceps: 6, middleTraps: 6 },
    isCompound: true,
  },
  lateral_raise: {
    id: 'lateral_raise',
    name: 'Lateral Raise',
    aliases: ['lat_raise', 'side_raise'],
    category: 'accessory',
    muscles: { sideDelts: 10, frontDelts: 2 },
    isCompound: false,
  },
  bicep_curl: {
    id: 'bicep_curl',
    name: 'Bicep Curl',
    aliases: ['curl', 'barbell_curl', 'dumbbell_curl'],
    category: 'accessory',
    muscles: { biceps: 10, forearms: 4 },
    isCompound: false,
  },
  tricep_pushdown: {
    id: 'tricep_pushdown',
    name: 'Tricep Pushdown',
    aliases: ['pushdown', 'cable_pushdown'],
    category: 'accessory',
    muscles: { triceps: 10 },
    isCompound: false,
  },
  leg_curl: {
    id: 'leg_curl',
    name: 'Leg Curl',
    aliases: ['hamstring_curl', 'lying_leg_curl'],
    category: 'accessory',
    muscles: { hamstrings: 10, calves: 2 },
    isCompound: false,
  },
};

/** Get a lift definition by ID or alias */
export function getLift(nameOrAlias: string): LiftDefinition | undefined {
  const lower = nameOrAlias.toLowerCase().trim().replace(/\s+/g, '_');
  if (LIFT_REGISTRY[lower]) return LIFT_REGISTRY[lower];
  for (const def of Object.values(LIFT_REGISTRY)) {
    if (def.aliases.includes(lower)) return def;
  }
  return undefined;
}

/** Get all lifts in a category */
export function getLiftsByCategory(category: LiftDefinition['category']): LiftDefinition[] {
  return Object.values(LIFT_REGISTRY).filter(l => l.category === category);
}

/** Get all compound lifts */
export function getCompoundLifts(): LiftDefinition[] {
  return Object.values(LIFT_REGISTRY).filter(l => l.isCompound);
}

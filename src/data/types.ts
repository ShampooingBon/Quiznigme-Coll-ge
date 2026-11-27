export type Category = 'maths' | 'francais' | 'enigmes' | 'mix';
export type Difficulty = 'facile' | 'moyen' | 'difficile';
export interface Question { q: string; choices: string[]; a: number; }
export const MAX_LEVELS = 25;

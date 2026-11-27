import { Category, Difficulty, MAX_LEVELS, Question } from './data/types';
import { francais } from './data/francais';
import { enigmes } from './data/enigmes';
import type { Row } from './data/francais';

/** Générateur pseudo-aléatoire déterministe : un niveau donne toujours la même question. */
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
const shuffle = <T,>(a: T[], r: () => number) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const fromRows = (rows: Row[]): Question[] => rows.map(r => {
  const choices = shuffle([r[1], r[2], r[3]], rng(hash(r[0])));
  return { q: r[0], choices, a: choices.indexOf(r[1]) };
});

// ---------- Mathématiques : générées par niveau (difficulté croissante) ----------
const ri = (r: () => number, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
function mathsLevel(d: Difficulty, i: number): Question {
  const r = rng(hash(d) + i * 977); let q = ''; let ans = 0;
  if (d === 'facile') {
    const m = 5 + i;
    if (i < 8) { const a = ri(r, 1, m), b = ri(r, 1, m); q = `${a} + ${b} = ?`; ans = a + b; }
    else if (i < 14) { const a = ri(r, 5, m + 5), b = ri(r, 1, a - 1); q = `${a} − ${b} = ?`; ans = a - b; }
    else if (i < 19) { const a = [2, 3, 4, 5, 10][i % 5], b = ri(r, 1, 10); q = `${a} × ${b} = ?`; ans = a * b; }
    else if (i < 23) { const a = ri(r, 2, 20), b = ri(r, 2, 20); q = `${a} + ? = ${a + b}`; ans = b; }
    else { const h = ri(r, 3, 25); q = `Quelle est la moitié de ${2 * h} ?`; ans = h; }
  } else if (d === 'moyen') {
    if (i < 6) { const a = ri(r, 20, 90), b = ri(r, 15, 80); q = `${a} + ${b} = ?`; ans = a + b; }
    else if (i < 12) { const a = ri(r, 60, 200), b = ri(r, 15, 59); q = `${a} − ${b} = ?`; ans = a - b; }
    else if (i < 18) { const a = ri(r, 6, 9), b = ri(r, 6, 12); q = `${a} × ${b} = ?`; ans = a * b; }
    else if (i < 22) { const b = ri(r, 3, 9), c = ri(r, 4, 12); q = `${b * c} ÷ ${b} = ?`; ans = c; }
    else { const c = ri(r, 4, 30); q = `Quel est le périmètre d'un carré de côté ${c} cm ? (en cm)`; ans = 4 * c; }
  } else {
    if (i < 6) { const a = ri(r, 6, 15), b = ri(r, 6, 15), c = ri(r, 5, 40); q = `${a} × ${b} − ${c} = ?`; ans = a * b - c; }
    else if (i < 12) { const x = ri(r, 2, 15), a = ri(r, 2, 9), b = ri(r, 1, 30); q = `Si ${a}x + ${b} = ${a * x + b}, que vaut x ?`; ans = x; }
    else if (i < 17) { const p = [10, 25, 50, 20][i % 4], n = ri(r, 2, 20) * 20; q = `Combien font ${p} % de ${n} ?`; ans = (n * p) / 100; }
    else if (i < 21) { const a = ri(r, 6, 20); q = `Combien font ${a}² ?`; ans = a * a; }
    else if (i < 24) { const n = ri(r, 2, 12) * 4; q = `Combien font les 3/4 de ${n} ?`; ans = (n * 3) / 4; }
    else { const a = ri(r, 8, 15), b = ri(r, 2, 7); q = `Combien font ${a}² − ${b}² ?`; ans = a * a - b * b; }
  }
  const set = new Set([ans]); const cand = [1, -1, 2, -2, 10, -10, 3, 5, -5];
  for (const c of shuffle(cand, r)) { if (set.size >= 3) break; if (ans + c >= 0) set.add(ans + c); }
  const choices = shuffle([...set].map(String), r);
  return { q, choices, a: choices.indexOf(String(ans)) };
}

const cache = new Map<string, Question[]>();
function base(cat: Exclude<Category, 'mix'>, d: Difficulty): Question[] {
  const k = cat + d; if (cache.has(k)) return cache.get(k)!;
  const l = cat === 'maths' ? Array.from({ length: MAX_LEVELS }, (_, i) => mathsLevel(d, i))
    : fromRows((cat === 'francais' ? francais : enigmes)[d]);
  cache.set(k, l); return l;
}
/** Niveaux d'un jeu. « mix » alterne maths → français → énigmes. */
export function getLevels(cat: Category, d: Difficulty): Question[] {
  if (cat !== 'mix') return base(cat, d).slice(0, MAX_LEVELS);
  const order = ['maths', 'francais', 'enigmes'] as const;
  return Array.from({ length: MAX_LEVELS }, (_, i) => base(order[i % 3], d)[i]);
}

// ---------- Progression (localStorage) ----------
export interface Progress { unlocked: number; stars: number[]; }
const key = (c: Category, d: Difficulty) => `quiznigme:v2:${c}:${d}`;
export function getProgress(c: Category, d: Difficulty): Progress {
  try { return JSON.parse(localStorage.getItem(key(c, d)) ?? '') as Progress; } catch { return { unlocked: 1, stars: [] }; }
}
export function saveResult(c: Category, d: Difficulty, level: number, stars: number) {
  const p = getProgress(c, d);
  p.stars[level] = Math.max(p.stars[level] ?? 0, stars);
  p.unlocked = Math.max(p.unlocked, Math.min(level + 2, MAX_LEVELS));
  try { localStorage.setItem(key(c, d), JSON.stringify(p)); } catch { /* ignoré */ }
}

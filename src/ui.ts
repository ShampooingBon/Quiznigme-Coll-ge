import type { Question } from './data/types';
/** Briques du jeu (mascotte, boutons, questions…) partagées avec l'Espace Collège. */
export interface Opt<T> { id: T; label: string; cls: string; deco?: string; }
export interface Ctx {
  say(t: string, speed?: number, el?: HTMLElement): Promise<void>;
  stage: HTMLElement; bar: HTMLElement;
  btn(o: Opt<unknown>, fn: () => void): HTMLButtonElement;
  backBtn(label: string, fn: () => void): HTMLButtonElement;
  reveal(els: HTMLElement[], gap?: number): Promise<void>;
  choose<T>(opts: Opt<T>[], back?: string): Promise<T | 'back'>;
  /** Pose une question exactement comme dans le jeu : 3 étoiles au 1er essai, 2 après 1 erreur, 1 ensuite. */
  askQuestion(q: Question): Promise<{ stars: number; fb: HTMLElement }>;
  wait(ms: number): Promise<void>;
}

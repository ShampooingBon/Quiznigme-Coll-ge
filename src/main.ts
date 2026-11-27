import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import './style.css';
import gsap from 'gsap';
import { Mascot, wait } from './mascot';
import { sfx, sound } from './audio';
import { Category, Difficulty, MAX_LEVELS, Question } from './data/types';
import type { Ctx, Opt } from './ui';
import { startCollege } from './college';
import { currentTheme } from './seasons';
import { getLevels, getProgress, saveResult } from './engine';

const theme = currentTheme();
const LOGO = `${import.meta.env.BASE_URL}${theme.logo}`;
document.documentElement.dataset.season = theme.season;
document.querySelector<HTMLLinkElement>('link[rel=icon]')?.setAttribute('href', LOGO);
const app = document.getElementById('app')!;
app.innerHTML = `
<div id="splash"><img src="${LOGO}" alt="Quiznigme" /><button class="btn indigo" id="go">Jouer</button></div>
<main id="game" hidden><div id="cat"></div><p id="bubble" aria-live="polite"></p><p id="bar"></p><section id="stage"></section></main>
<button id="mute" aria-label="Activer ou couper le son">🔊</button>`;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const mascot = new Mascot($('cat'), theme);
const bubble = $('bubble'), stage = $('stage'), bar = $('bar');
bubble.onclick = () => mascot.skip();
$('mute').onclick = () => { sound.muted = !sound.muted; $('mute').textContent = sound.muted ? '🔇' : '🔊'; };
const say = (t: string, speed?: number, el: HTMLElement = bubble) => mascot.say(el, t, speed);

const CATS: Opt<Category | 'college'>[] = [
  { id: 'maths', label: 'Mathématiques', cls: 'indigo', deco: '+ − × =' },
  { id: 'francais', label: 'Français', cls: 'indigo', deco: '📖 abc' },
  { id: 'enigmes', label: 'Énigmes', cls: 'indigo', deco: '? ? ?' },
  { id: 'mix', label: 'Tout mélangé', cls: 'indigo', deco: '+ ? 📖 A' },
  { id: 'college', label: 'Espace Collège', cls: 'indigo', deco: '🎓 ✎' },
];
const DIFFS: Opt<Difficulty>[] = [
  { id: 'facile', label: 'Facile', cls: 'green' },
  { id: 'moyen', label: 'Moyen', cls: 'orange' },
  { id: 'difficile', label: 'Difficile', cls: 'red' },
];

function btn(o: Opt<unknown>, onClick: () => void) {
  const b = document.createElement('button');
  b.className = `btn ${o.cls}`;
  b.innerHTML = `<span class="deco">${o.deco ?? ''}</span><span>${o.label}</span>`;
  b.onclick = () => { sfx.click(); onClick(); };
  return b;
}
const reveal = async (els: HTMLElement[], gap = 260) => {
  for (const e of els) { stage.append(e); gsap.from(e, { opacity: 0, y: 14, duration: 0.35 }); await wait(gap); }
};
const backBtn = (label: string, fn: () => void) => { const b = btn({ id: 0, label, cls: 'ghost' }, fn); return b; };

/** Affiche les boutons un à un et renvoie le choix (ou 'back'). */
function choose<T>(opts: Opt<T>[], back?: string): Promise<T | 'back'> {
  stage.innerHTML = '';
  return new Promise(resolve => {
    const els = opts.map(o => btn(o, () => resolve(o.id)));
    if (back) els.push(backBtn(back, () => resolve('back')));
    void reveal(els);
  });
}

async function home(first: boolean): Promise<void> {
  bar.textContent = '';
  if (first) { await say('Bonjour et bienvenue sur Quiznigme !'); await wait(350); }
  const cat = await (async () => { const p = choose(CATS); await say('Quel type de jeu souhaitez-vous ?'); return p; })();
  if (cat === 'back') return home(false);
  if (cat === 'college') { await startCollege(ctx); return home(false); }
  return difficulty(cat);
}

async function difficulty(cat: Category): Promise<void> {
  stage.innerHTML = '';
  await say('Quel niveau de difficulté souhaitez-vous ?');
  const d = await choose(DIFFS, '← Changer de jeu');
  if (d === 'back') return home(false);
  return levelSelect(cat, d);
}

async function levelSelect(cat: Category, d: Difficulty, intro = true): Promise<void> {
  const levels = getLevels(cat, d), prog = getProgress(cat, d);
  stage.innerHTML = ''; bar.textContent = '';
  if (intro) await say('Choisis ton niveau !');
  const choice = await new Promise<number | 'back'>(resolve => {
    const grid = document.createElement('div'); grid.className = `grid ${d}`;
    for (let i = 0; i < levels.length; i++) {
      const b = document.createElement('button'), locked = i >= prog.unlocked, s = prog.stars[i] ?? 0;
      b.className = 'lvl'; b.disabled = locked;
      b.innerHTML = `<strong>${locked ? '🔒' : i + 1}</strong><small>${s ? '★'.repeat(s) : '\u00a0'}</small>`;
      b.setAttribute('aria-label', locked ? `Niveau ${i + 1} verrouillé` : `Niveau ${i + 1}`);
      b.onclick = () => { sfx.click(); resolve(i); };
      grid.append(b);
    }
    stage.append(grid, backBtn('← Changer la difficulté', () => resolve('back')));
    gsap.from(grid.children, { opacity: 0, scale: 0.8, duration: 0.3, stagger: 0.015 });
  });
  if (choice === 'back') return difficulty(cat);
  return playLevel(cat, d, choice);
}

/** Pose une question : même logique pour le jeu normal et l'Espace Collège (3 étoiles au 1er essai, 2 après 1 erreur, 1 ensuite). */
async function askQuestion(q: Question): Promise<{ stars: number; fb: HTMLElement }> {
  const fb = document.createElement('p'); fb.className = 'feedback';
  await say(q.q, 22);
  let tries = 0;
  await new Promise<void>(resolve => {
    const els = q.choices.map((c, k) => {
      const b = btn({ id: k, label: c, cls: 'indigo' }, () => {
        if (k === q.a) { sfx.good(); b.classList.add('ok'); resolve(); return; }
        sfx.bad(); tries++; b.disabled = true; b.classList.add('ko');
        gsap.fromTo(b, { x: -8 }, { x: 0, duration: 0.4, ease: 'elastic.out(2,0.3)' });
        void say(tries > 1 ? 'Courage, réfléchis bien !' : 'Pas tout à fait… essaie encore !', 25, fb);
      });
      return b;
    });
    void reveal(els, 180).then(() => stage.append(fb));
  });
  stage.querySelectorAll('button').forEach(b => ((b as HTMLButtonElement).disabled = true));
  return { stars: tries === 0 ? 3 : tries === 1 ? 2 : 1, fb };
}

async function playLevel(cat: Category, d: Difficulty, n: number): Promise<void> {
  const levels = getLevels(cat, d), q = levels[n];
  stage.innerHTML = ''; bar.textContent = `Niveau ${n + 1} / ${MAX_LEVELS}`;
  const { stars, fb } = await askQuestion(q);
  saveResult(cat, d, n, stars);
  void say(`Bravo ! ${'★'.repeat(stars)}`, 30, fb);
  await wait(1100);
  const last = n + 1 >= levels.length;
  const next = await new Promise<'next' | 'list'>(resolve => {
    stage.innerHTML = '';
    const els = [btn({ id: 0, label: last ? '🏆 Tous les niveaux terminés !' : 'Niveau suivant', cls: 'indigo' }, () => resolve(last ? 'list' : 'next')),
      backBtn('Liste des niveaux', () => resolve('list'))];
    void reveal(els, 150);
  });
  return next === 'next' ? playLevel(cat, d, n + 1) : levelSelect(cat, d, false);
}

const ctx: Ctx = { say, stage, bar, btn, backBtn, reveal, choose, askQuestion, wait };

$('go').onclick = async () => {
  sfx.click();
  await gsap.to('#splash', { opacity: 0, duration: 0.4 });
  $('splash').hidden = true; $('game').hidden = false;
  gsap.from('#game', { opacity: 0, duration: 0.4 });
  void home(true);
};

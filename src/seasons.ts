export type Season = 'default' | 'halloween' | 'noel';

/** Calques d'animation d'une image de mascotte (coordonnées dans l'image `cat`). */
export interface Theme {
  season: Season;
  /** false tant que les images de la saison ne sont pas dans /public → on garde le thème normal. */
  ready: boolean;
  cat: string; logo: string; w: number; h: number;
  eyes: { cx: number; cy: number; rx: number; ry: number }[];
  lidColor: string; lidLine: string;
  mouth: { cx: number; cy: number; rx: number; ry: number; originY: number; fill: string };
}

const BASE = { w: 750, h: 820, lidColor: '#f5dba8', lidLine: '#4a2a15' };

export const THEMES: Record<Season, Theme> = {
  default: {
    ...BASE, season: 'default', ready: true, cat: 'cat.png', logo: 'logo.jpg',
    eyes: [{ cx: 205, cy: 272, rx: 54, ry: 49 }, { cx: 405, cy: 272, rx: 54, ry: 49 }],
    mouth: { cx: 305, cy: 412, rx: 56, ry: 34, originY: 388, fill: '#faf9f2' },
  },
  // Calibré sur cat-halloween.png (588 × 664, fond retiré) — coordonnées dans cette image.
  halloween: {
    ...BASE, season: 'halloween', ready: true, cat: 'cat-halloween.png', logo: 'logo-halloween.jpg', w: 588, h: 664,
    lidColor: '#f7dfaa',
    eyes: [{ cx: 231, cy: 253, rx: 31, ry: 29 }, { cx: 369, cy: 253, rx: 32, ry: 29 }],
    mouth: { cx: 302, cy: 350, rx: 42, ry: 26, originY: 333, fill: '#faf9f4' },
  },
  // Calibré sur cat-noel.png (571 × 720, fond retiré).
  noel: {
    ...BASE, season: 'noel', ready: true, cat: 'cat-noel.png', logo: 'logo-noel.jpg', w: 571, h: 720,
    lidColor: '#f7dfaa',
    eyes: [{ cx: 118, cy: 237, rx: 32, ry: 29 }, { cx: 262, cy: 236, rx: 33, ry: 29 }],
    mouth: { cx: 184, cy: 332, rx: 44, ry: 27, originY: 308, fill: '#faf9f4' },
  },
};

/** Halloween : du 1er octobre au 2 novembre · Noël : du 1er au 31 décembre. */
export function seasonFor(d: Date): Season {
  const m = d.getMonth(), day = d.getDate(); // m : 0 = janvier
  if (m === 9 || (m === 10 && day <= 2)) return 'halloween';
  if (m === 11) return 'noel';
  return 'default';
}

/** Thème du jour. Test : ajouter ?theme=halloween ou ?theme=noel dans l'adresse. */
export function currentTheme(): Theme {
  const forced = new URLSearchParams(location.search).get('theme') as Season | null;
  const t = THEMES[forced && forced in THEMES ? forced : seasonFor(new Date())];
  return t.ready ? t : THEMES.default;
}

import gsap from 'gsap';
import type { Theme } from './seasons';

export const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const REST = 0.4;   // bouche presque fermée au repos

/** Le chat est l'image fournie, JAMAIS redessinée : les paupières et la mâchoire sont des
 *  calques qui réutilisent les pixels de l'image (clip + étirement) pour animer. */
export class Mascot {
  private jaw: SVGElement; private lids: SVGElement[];
  private originY = 0; private cx = 0; private lid = 118; private run = 0; private skipping = false;

  constructor(root: HTMLElement, th: Theme) {
    const IMG = `${import.meta.env.BASE_URL}${th.cat}`, m = th.mouth;
    const clips = th.eyes.map((e, i) => `<clipPath id="e${i}"><ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}"/></clipPath>`).join('');
    const lids = th.eyes.map((e, i) => { const x = e.cx - e.rx - 10, w = 2 * e.rx + 20, y = e.cy - e.ry - 8, h = 2 * e.ry + 16;
      return `<g clip-path="url(#e${i})"><g class="lid"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${th.lidColor}"/><rect x="${x}" y="${y + h - 7}" width="${w}" height="7" fill="${th.lidLine}"/></g></g>`; }).join('');
    root.innerHTML = `<div class="catbox" style="aspect-ratio:${th.w}/${th.h}"><img src="${IMG}" alt="Mascotte de Quiznigme" draggable="false"/>
<svg viewBox="0 0 ${th.w} ${th.h}" aria-hidden="true"><defs><clipPath id="cm"><ellipse cx="${m.cx}" cy="${m.cy}" rx="${m.rx}" ry="${m.ry}"/></clipPath>${clips}</defs>
<g clip-path="url(#cm)"><rect x="${m.cx - m.rx - 10}" y="${m.originY - 18}" width="${2 * m.rx + 20}" height="${2 * m.ry + 30}" fill="${m.fill}"/><image class="jaw" href="${IMG}" width="${th.w}" height="${th.h}"/></g>${lids}</svg></div>`;
    this.originY = m.originY; this.cx = m.cx; this.lid = th.eyes[0].ry * 2 + 20;
    this.jaw = root.querySelector('.jaw')!;
    this.lids = [...root.querySelectorAll<SVGElement>('.lid')];
    gsap.set(this.lids, { y: -this.lid });
    gsap.set(this.jaw, { scaleY: REST, svgOrigin: `${this.cx} ${this.originY}` });
    gsap.to(root.firstElementChild, { y: -5, rotation: 0.8, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    this.blink();
  }

  private blink() {
    gsap.delayedCall(1.8 + Math.random() * 3.2, () => {
      const tl = gsap.timeline({ onComplete: () => this.blink() });
      tl.to(this.lids, { y: 0, duration: 0.07 }).to(this.lids, { y: -this.lid, duration: 0.12 });
      if (Math.random() < 0.25) tl.to(this.lids, { y: 0, duration: 0.07, delay: 0.08 }).to(this.lids, { y: -this.lid, duration: 0.12 });
    });
  }

  skip() { this.skipping = true; }

  /** Écrit le texte lettre par lettre pendant que les lèvres bougent. */
  async say(el: HTMLElement, text: string, speed = 38) {
    const id = ++this.run; this.skipping = false; el.textContent = '';
    for (let i = 0; i < text.length; i++) {
      if (id !== this.run) return;
      if (this.skipping) { el.textContent = text; break; }
      const ch = text[i]; el.textContent += ch;
      const open = /[\p{L}\p{N}]/u.test(ch) ? 0.55 + Math.random() * 0.6 : REST;
      gsap.to(this.jaw, { scaleY: open, duration: 0.06, overwrite: true });
      await wait(/[.,!?:]/.test(ch) ? speed * 4 : speed);
    }
    gsap.to(this.jaw, { scaleY: REST, duration: 0.2, overwrite: true });
  }
}

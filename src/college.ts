import gsap from 'gsap';
import { sfx } from './audio';
import * as cloud from './cloud';
import type { Question } from './data/types';
import type { Ctx } from './ui';

const esc = (s: string) => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
const up = () => window.scrollTo({ top: 0, behavior: 'smooth' });

// ───────────────────────── Formulaires ─────────────────────────
interface Field { key: string; label: string; type?: 'text' | 'password' | 'classes'; max?: number; upper?: boolean; auto?: string; }

function ask(c: Ctx, fields: Field[], ok: string, back: string, init: Record<string, string> = {}): Promise<Record<string, string> | null> {
  c.stage.innerHTML = '';
  return new Promise(resolve => {
    const form = document.createElement('form'); form.className = 'form'; form.noValidate = true;
    const get: Record<string, () => string> = {};
    for (const f of fields) {
      const box = document.createElement('div'); box.className = 'fld'; const id = `f-${f.key}`;
      box.innerHTML = `<label for="${id}">${esc(f.label)}</label>`;
      const inp = document.createElement('input'); inp.id = id;
      if (f.type === 'classes') {
        const list = (init[f.key] ?? '').split('|').filter(Boolean);
        const row = document.createElement('div'); row.className = 'row';
        inp.maxLength = 20; inp.placeholder = 'ex : 6A, 5B, 3C…';
        const add = document.createElement('button'); add.type = 'button'; add.className = 'mini'; add.textContent = 'Ajouter';
        const chips = document.createElement('div'); chips.className = 'chips';
        const draw = () => { chips.innerHTML = list.map((x, i) => `<button type="button" class="chip on" data-i="${i}" title="Retirer">${esc(x)} ×</button>`).join(''); };
        const push = () => { const v = inp.value.trim().replace(/\|/g, ''); if (v && !list.some(x => norm(x) === norm(v))) list.push(v); inp.value = ''; draw(); };
        add.onclick = () => { sfx.click(); push(); inp.focus(); };
        inp.onkeydown = e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); push(); } };
        chips.onclick = e => { const i = (e.target as HTMLElement).closest<HTMLElement>('[data-i]')?.dataset.i; if (i !== undefined) { list.splice(Number(i), 1); draw(); } };
        row.append(inp, add); box.append(row, chips); draw();
        get[f.key] = () => { push(); return list.join('|'); };
      } else {
        inp.type = f.type ?? 'text'; inp.maxLength = f.max ?? 60; inp.value = init[f.key] ?? '';
        inp.setAttribute('autocomplete', f.auto ?? 'off'); inp.autocapitalize = f.upper ? 'characters' : 'words';
        if (f.upper) inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
        box.append(inp); get[f.key] = () => inp.value;
      }
      form.append(box);
    }
    const submit = document.createElement('button'); submit.type = 'submit'; submit.className = 'btn indigo';
    submit.innerHTML = `<span class="deco"></span><span>${esc(ok)}</span>`; form.append(submit);
    form.onsubmit = e => { e.preventDefault(); sfx.click(); const out: Record<string, string> = {}; for (const k in get) out[k] = get[k](); resolve(out); };
    c.stage.append(form, c.backBtn(back, () => resolve(null)));
    gsap.from(form, { opacity: 0, y: 14, duration: 0.35 });
  });
}

function showCode(c: Ctx, value: string, next: string): Promise<void> {
  c.stage.innerHTML = '';
  return new Promise(resolve => {
    const card = document.createElement('div'); card.className = 'codecard';
    card.innerHTML = `<strong class="code">${esc(value)}</strong>`;
    const copy = document.createElement('button'); copy.className = 'mini'; copy.textContent = 'Copier';
    copy.onclick = async () => { try { await navigator.clipboard.writeText(value); copy.textContent = 'Copié ✓'; } catch { copy.textContent = 'Copie-le à la main'; } };
    card.append(copy); c.stage.append(card); gsap.from(card, { opacity: 0, scale: 0.9, duration: 0.4 });
    void c.reveal([c.btn({ id: 0, label: next, cls: 'indigo' }, () => resolve())], 200);
  });
}

// ───────────────────────── Menu Collège ─────────────────────────
export async function startCollege(c: Ctx): Promise<void> {
  c.bar.textContent = '';
  if (!cloud.cloudReady) {
    void c.say("L'Espace Collège n'est pas encore activé sur ce site. Il faut d'abord le configurer (voir COLLEGE.md).");
    await c.choose([], '← Retour');
    return;
  }
  for (;;) {
    c.bar.textContent = '';
    void c.say("Bienvenue dans l'Espace Collège ! Tu es professeur ou élève ?");
    const r = await c.choose<'prof' | 'eleve'>([
      { id: 'prof', label: 'Professeur(e)', cls: 'indigo', deco: '✎ 📖' },
      { id: 'eleve', label: 'Élève', cls: 'indigo', deco: '★ ★ ★' },
    ], "← Retour à l'accueil");
    if (r === 'back') return;
    if (r === 'prof') await profFlow(c);
    else if (await eleveFlow(c)) return;
  }
}

// ───────────────────────── Professeur ─────────────────────────
async function profFlow(c: Ctx): Promise<void> {
  let t = await cloud.currentTeacher().catch(() => null);
  if (!t) { t = await profAuth(c); if (!t) return; }
  for (;;) {
    c.bar.textContent = '';
    void c.say(`Bonjour ${t.prenom} ! Que veux-tu faire ?`);
    const r = await c.choose<'new' | 'list' | 'out'>([
      { id: 'new', label: 'Créer un exercice', cls: 'indigo', deco: '✎ +' },
      { id: 'list', label: 'Mes exercices et résultats', cls: 'indigo', deco: '★ 📊' },
      { id: 'out', label: 'Se déconnecter', cls: 'ghost' },
    ], '← Espace Collège');
    if (r === 'back') return;
    if (r === 'out') { await cloud.logoutTeacher().catch(() => {}); return; }
    if (r === 'new') await createFlow(c, t); else await listFlow(c, t);
  }
}

async function profAuth(c: Ctx): Promise<cloud.Teacher | null> {
  for (;;) {
    void c.say('Espace professeur : veux-tu créer un compte ou te connecter ?');
    const r = await c.choose<'new' | 'in'>([
      { id: 'new', label: 'Créer un compte', cls: 'indigo', deco: '✎ +' },
      { id: 'in', label: 'Se connecter', cls: 'indigo', deco: '🔑' },
    ], '← Retour');
    if (r === 'back') return null;
    const t = r === 'new' ? await register(c) : await login(c);
    if (t) return t;
  }
}

async function register(c: Ctx): Promise<cloud.Teacher | null> {
  let init: Record<string, string> = {};
  for (;;) {
    void c.say('Pour créer ton compte, dis-moi ton prénom, toutes tes classes, et choisis ton mot de passe.');
    const v = await ask(c, [
      { key: 'prenom', label: 'Ton prénom', max: 40, auto: 'given-name' },
      { key: 'classes', label: 'Tes classes (ajoute-les une par une)', type: 'classes' },
      { key: 'pw', label: 'Ton mot de passe (6 caractères minimum)', type: 'password', max: 60, auto: 'new-password' },
      { key: 'pw2', label: 'Répète ton mot de passe', type: 'password', max: 60, auto: 'new-password' },
    ], 'Créer mon compte', '← Retour', init);
    if (!v) return null;
    init = { prenom: v.prenom, classes: v.classes };
    const classes = v.classes.split('|').filter(Boolean);
    const err = !v.prenom.trim() ? "Il me faut ton prénom !" : !classes.length ? 'Ajoute au moins une classe.'
      : v.pw.length < 6 ? 'Ton mot de passe doit faire 6 caractères minimum.' : v.pw !== v.pw2 ? 'Les deux mots de passe ne sont pas identiques.' : '';
    if (err) { await c.say(err); continue; }
    try {
      const t = await cloud.registerTeacher(v.prenom.trim(), classes, v.pw);
      void c.say(`Ton compte est créé, ${t.prenom} ! Voici ton identifiant personnel. Note-le bien : il te servira pour te reconnecter.`);
      await showCode(c, t.identifiant, 'Continuer');
      return t;
    } catch (e) { await c.say(authMessage(e)); }
  }
}

async function login(c: Ctx): Promise<cloud.Teacher | null> {
  let init: Record<string, string> = {};
  for (;;) {
    void c.say('Entre ton identifiant et ton mot de passe.');
    const v = await ask(c, [
      { key: 'id', label: 'Ton identifiant (ex : PROF-AB12CD)', max: 20, upper: false, auto: 'username' },
      { key: 'pw', label: 'Ton mot de passe', type: 'password', max: 60, auto: 'current-password' },
    ], 'Me connecter', '← Retour', init);
    if (!v) return null;
    init = { id: v.id };
    try {
      const t = await cloud.loginTeacher(v.id, v.pw);
      if (t) return t;
      await c.say("Je ne trouve pas ton profil. Écris-moi si ça continue.");
    } catch (e) { await c.say(authMessage(e)); }
  }
}

function authMessage(e: unknown): string {
  const code = cloud.errCode(e);
  if (code === 'auth/operation-not-allowed') return "La connexion par mot de passe n'est pas activée dans Firebase (Authentication → Email/Mot de passe).";
  if (code.startsWith('auth/invalid-') || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'Identifiant ou mot de passe incorrect. Réessaie !';
  if (code === 'auth/too-many-requests') return 'Trop d\'essais. Attends un peu avant de réessayer.';
  if (code === 'auth/network-request-failed') return 'Pas de connexion internet. Réessaie !';
  if (code === 'permission-denied') return "Firebase refuse l'enregistrement : vérifie les règles (firestore.rules).";
  return "Oups, ça n'a pas marché. Réessaie dans un instant !";
}

// ── Création d'un exercice ──
interface Draft { q: string; answers: string[]; correct: number; }
const newDraft = (): Draft => ({ q: '', answers: ['', '', ''], correct: 0 });

async function createFlow(c: Ctx, t: cloud.Teacher): Promise<void> {
  void c.say('Écris tes questions, ajoute les réponses possibles et coche la bonne. Tes élèves verront exactement ce que tu écris !');
  const qs: Draft[] = [newDraft()]; let titre = ''; const picked = new Set(t.classes);
  c.stage.innerHTML = '';
  const root = document.createElement('div'); root.className = 'editor';
  const render = () => {
    root.innerHTML = `<div class="fld"><label for="ex-t">Titre de l'exercice</label><input id="ex-t" maxlength="80" value="${esc(titre)}" placeholder="ex : Les fractions"></div>
<div class="fld"><label>Classes concernées</label><div class="chips">${t.classes.map(cl => `<button type="button" class="chip${picked.has(cl) ? ' on' : ''}" data-cl="${esc(cl)}">${esc(cl)}</button>`).join('')}</div></div>
${qs.map((q, i) => `<div class="qcard" data-i="${i}"><div class="qhead"><strong>Question ${i + 1}</strong><span>
<button type="button" class="mini" data-act="up" aria-label="Monter">↑</button><button type="button" class="mini" data-act="down" aria-label="Descendre">↓</button><button type="button" class="mini" data-act="del" aria-label="Supprimer la question">🗑</button></span></div>
<textarea data-f="q" rows="2" maxlength="300" placeholder="Écris ta question">${esc(q.q)}</textarea>
<p class="hint">Réponses possibles — coche la bonne :</p>
${q.answers.map((a, k) => `<div class="ans"><input type="radio" name="c${i}" data-f="c" data-k="${k}" ${q.correct === k ? 'checked' : ''} aria-label="Bonne réponse ${k + 1}"><input data-f="a" data-k="${k}" maxlength="120" placeholder="Réponse ${k + 1}" value="${esc(a)}">${q.answers.length > 2 ? `<button type="button" class="mini" data-act="rm" data-k="${k}" aria-label="Retirer la réponse">×</button>` : ''}</div>`).join('')}
${q.answers.length < 4 ? '<button type="button" class="link" data-act="add">+ Ajouter une réponse</button>' : ''}</div>`).join('')}
<button type="button" class="link big" data-act="addq">+ Ajouter une question</button>`;
  };
  root.oninput = e => {
    const el = e.target as HTMLInputElement, i = Number(el.closest<HTMLElement>('[data-i]')?.dataset.i), k = Number(el.dataset.k);
    if (el.id === 'ex-t') titre = el.value;
    else if (el.dataset.f === 'q') qs[i].q = el.value;
    else if (el.dataset.f === 'a') qs[i].answers[k] = el.value;
  };
  root.onchange = e => { const el = e.target as HTMLInputElement; if (el.dataset.f === 'c') qs[Number(el.closest<HTMLElement>('[data-i]')!.dataset.i)].correct = Number(el.dataset.k); };
  root.onclick = e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return;
    const cl = b.dataset.cl, act = b.dataset.act, card = b.closest<HTMLElement>('[data-i]'), i = Number(card?.dataset.i), k = Number(b.dataset.k);
    if (cl !== undefined) { picked.has(cl) ? picked.delete(cl) : picked.add(cl); b.classList.toggle('on'); return; }
    if (!act) return; sfx.click();
    if (act === 'addq') qs.push(newDraft());
    else if (act === 'add') qs[i].answers.push('');
    else if (act === 'rm') { const q = qs[i]; q.answers.splice(k, 1); q.correct = q.correct === k ? 0 : q.correct > k ? q.correct - 1 : q.correct; }
    else if (act === 'del') { if (qs.length > 1) qs.splice(i, 1); }
    else if (act === 'up' && i > 0) [qs[i - 1], qs[i]] = [qs[i], qs[i - 1]];
    else if (act === 'down' && i < qs.length - 1) [qs[i + 1], qs[i]] = [qs[i], qs[i + 1]];
    render();
  };
  render();

  await new Promise<void>(done => {
    const finish = c.btn({ id: 0, label: 'Terminer et générer le code', cls: 'green' }, async () => {
      const problem = (): string => {
        if (!titre.trim()) return "Donne un titre à ton exercice.";
        if (!picked.size) return 'Choisis au moins une classe.';
        for (let i = 0; i < qs.length; i++) {
          const q = qs[i], n = i + 1, filled = q.answers.filter(a => a.trim()).length;
          if (!q.q.trim()) return `La question ${n} est vide.`;
          if (filled < 2) return `La question ${n} a besoin d'au moins 2 réponses.`;
          if (!q.answers[q.correct]?.trim()) return `Coche la bonne réponse de la question ${n}.`;
        }
        return '';
      };
      const p = problem(); if (p) { up(); void c.say(p, 25); return; }
      const questions: Question[] = qs.map(q => {
        const keep = q.answers.map((a, k) => k).filter(k => q.answers[k].trim());
        return { q: q.q.trim(), choices: keep.map(k => q.answers[k].trim()), a: keep.indexOf(q.correct) };
      });
      try {
        finish.disabled = true;
        const code = await cloud.createExercise(t, titre.trim(), [...picked], questions);
        up(); void c.say('Ton exercice est prêt ! Voici le code à donner à tes élèves.');
        await showCode(c, code, 'Terminé'); done();
      } catch (e) { finish.disabled = false; up(); void c.say(authMessage(e), 25); }
    });
    c.stage.append(root, finish, c.backBtn('← Annuler', () => done()));
    gsap.from(root, { opacity: 0, y: 14, duration: 0.35 });
  });
  up();
}

// ── Mes exercices & résultats ──
async function listFlow(c: Ctx, t: cloud.Teacher): Promise<void> {
  c.stage.innerHTML = '<p class="muted">Chargement…</p>';
  let list: cloud.Exercise[];
  try { list = await cloud.listExercises(t.uid); } catch (e) { await c.say(authMessage(e)); return; }
  if (!list.length) { void c.say("Tu n'as pas encore créé d'exercice."); await c.choose([], '← Retour'); return; }
  void c.say('Voici tes exercices. Choisis-en un pour voir les résultats de tes élèves.');
  const pick = await new Promise<cloud.Exercise | null>(resolve => {
    c.stage.innerHTML = '';
    const els = list.map(ex => c.btn({ id: 0, label: `${ex.titre} · ${ex.code}`, cls: 'indigo', deco: ex.classes.join(' ') }, () => resolve(ex)));
    els.push(c.backBtn('← Retour', () => resolve(null))); void c.reveal(els, 90);
  });
  if (pick) { await resultsFlow(c, pick); await listFlow(c, t); }
}

async function resultsFlow(c: Ctx, ex: cloud.Exercise): Promise<void> {
  c.stage.innerHTML = '<p class="muted">Chargement…</p>'; c.bar.textContent = ex.titre;
  let rs: cloud.Result[];
  try { rs = await cloud.listResults(ex.code); } catch (e) { await c.say(authMessage(e)); return; }
  void c.say(rs.length ? `Voici les résultats : ${rs.length} élève${rs.length > 1 ? 's ont' : ' a'} terminé l'exercice.` : "Aucun élève n'a encore terminé cet exercice.");
  const n = ex.questions.length, max = 3 * n; let filter = '';
  await new Promise<void>(done => {
    const draw = () => {
      const shown = rs.filter(r => !filter || norm(r.classe) === norm(filter)).sort((a, b) => a.classe.localeCompare(b.classe) || a.prenom.localeCompare(b.prenom));
      const tot = (r: cloud.Result) => r.stars.reduce((s, x) => s + x, 0);
      const avg = shown.length ? (shown.reduce((s, r) => s + tot(r), 0) / shown.length).toFixed(1) : '–';
      const perQ = ex.questions.map((q, i) => {
        const v = shown.map(r => r.stars[i] ?? 0), first = v.length ? Math.round(100 * v.filter(x => x === 3).length / v.length) : 0;
        return `<tr><td>${i + 1}</td><td class="l">${esc(q.q)}</td><td>${v.length ? first + ' %' : '–'}</td></tr>`;
      }).join('');
      const classes = [...new Set([...ex.classes, ...rs.map(r => r.classe)])];
      box.innerHTML = `<div class="chips"><button type="button" class="chip${filter ? '' : ' on'}" data-f="">Toutes les classes</button>${classes.map(cl => `<button type="button" class="chip${norm(filter) === norm(cl) && filter ? ' on' : ''}" data-f="${esc(cl)}">${esc(cl)}</button>`).join('')}</div>
<p class="sum"><strong>${shown.length}</strong> élève${shown.length > 1 ? 's' : ''} · moyenne <strong>${avg} ★ / ${max}</strong></p>
<div class="tbl"><table><thead><tr><th class="l">Élève</th><th>Classe</th><th>Étoiles</th><th>1er essai</th></tr></thead><tbody>${shown.map(r => `<tr><td class="l">${esc(r.prenom)}</td><td>${esc(r.classe)}</td><td>${tot(r)} / ${max} ★</td><td>${r.stars.filter(x => x === 3).length} / ${n}</td></tr>`).join('') || '<tr><td colspan="4">Aucun résultat</td></tr>'}</tbody></table></div>
<p class="hint">Réussite du 1er coup, question par question :</p>
<div class="tbl"><table><tbody>${perQ}</tbody></table></div>`;
    };
    const box = document.createElement('div'); box.className = 'results';
    box.onclick = e => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-f]'); if (b) { sfx.click(); filter = b.dataset.f ?? ''; draw(); } };
    draw(); c.stage.innerHTML = ''; c.stage.append(box, c.backBtn('← Mes exercices', () => done()));
    gsap.from(box, { opacity: 0, y: 14, duration: 0.35 });
  });
  c.bar.textContent = '';
}

// ───────────────────────── Élève ─────────────────────────
/** Renvoie true si l'élève a terminé un exercice (retour à l'accueil), false s'il est revenu en arrière. */
async function eleveFlow(c: Ctx): Promise<boolean> {
  let init: Record<string, string> = {};
  for (;;) {
    void c.say("Dis-moi qui tu es et donne-moi le code de ton exercice !");
    const v = await ask(c, [
      { key: 'prenom', label: 'Ton prénom', max: 40, auto: 'given-name' },
      { key: 'classe', label: 'Ta classe (ex : 6A)', max: 20 },
      { key: 'code', label: "Le code de l'exercice (10 caractères)", max: 10, upper: true },
    ], "C'est parti !", '← Retour', init);
    if (!v) return false;
    init = v;
    if (!v.prenom.trim() || !v.classe.trim()) { await c.say('Il me faut ton prénom et ta classe !'); continue; }
    if (v.code.length !== 10) { await c.say('Le code fait 10 caractères, lettres et chiffres.'); continue; }
    let ex: cloud.Exercise | null;
    try { ex = await cloud.getExercise(v.code); } catch { await c.say('Je n\'arrive pas à joindre Quiznigme. Vérifie ta connexion !'); continue; }
    if (!ex) { await c.say('Je ne trouve pas cet exercice. Vérifie bien le code !'); continue; }
    if (!ex.classes.some(x => norm(x) === norm(v.classe))) { await c.say("Cet exercice n'est pas prévu pour ta classe. Vérifie ta classe !"); continue; }
    await playExercise(c, ex, v.prenom.trim(), v.classe.trim());
    return true;
  }
}

async function playExercise(c: Ctx, ex: cloud.Exercise, prenom: string, classe: string): Promise<void> {
  const n = ex.questions.length, stars: number[] = [];
  await c.say(`Salut ${prenom} ! Voici « ${ex.titre} » : ${n} question${n > 1 ? 's' : ''}. Bonne chance !`);
  for (let i = 0; i < n; i++) {
    c.stage.innerHTML = ''; c.bar.textContent = `Question ${i + 1} / ${n}`;
    const r = await c.askQuestion(ex.questions[i]);   // mêmes règles d'étoiles que le jeu normal
    stars.push(r.stars);
    void c.say(`Bravo ! ${'★'.repeat(r.stars)}`, 30, r.fb);
    await c.wait(1100);
    const last = i === n - 1;
    await new Promise<void>(next => { c.stage.innerHTML = ''; void c.reveal([c.btn({ id: 0, label: last ? 'Voir mon résultat' : 'Question suivante', cls: 'indigo' }, () => next())], 150); });
  }
  c.bar.textContent = '';
  let sent = true;
  try { await cloud.submitResult(ex.code, prenom, classe, stars); } catch { sent = false; }
  const total = stars.reduce((s, x) => s + x, 0);
  void c.say(`Exercice terminé, ${prenom} ! Tu as ${total} étoile${total > 1 ? 's' : ''} sur ${3 * n}.${sent ? '' : " Mais ton résultat n'a pas pu être envoyé à ton professeur."}`);
  c.stage.innerHTML = '';
  const grid = document.createElement('div'); grid.className = 'grid facile';
  grid.innerHTML = stars.map((s, i) => `<div class="lvl"><strong>${i + 1}</strong><small>${'★'.repeat(s)}</small></div>`).join('');
  c.stage.append(grid); gsap.from(grid.children, { opacity: 0, scale: 0.8, duration: 0.3, stagger: 0.03 });
  await new Promise<void>(done => void c.reveal([c.btn({ id: 0, label: "Retour à l'accueil", cls: 'indigo' }, () => done())], 200));
}

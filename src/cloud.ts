import { initializeApp, type FirebaseApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import type { Question } from './data/types';

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const cloudReady = Boolean(cfg.apiKey && cfg.projectId && cfg.appId);
let _app: FirebaseApp | null = null;
const app = () => (_app ??= initializeApp(cfg));
const auth = () => getAuth(app());
const db = () => getFirestore(app());

export interface Teacher { uid: string; prenom: string; classes: string[]; identifiant: string; }
export interface Exercise { code: string; titre: string; classes: string[]; questions: Question[]; teacherUid: string; createdAt: number; }
export interface Result { id: string; prenom: string; classe: string; stars: number[]; at: number; }

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O/1/I pour éviter les confusions
const rand = (n: number) => Array.from(crypto.getRandomValues(new Uint32Array(n)), v => ALPHA[v % ALPHA.length]).join('');
const emailOf = (id: string) => `${id.toLowerCase()}@quiznigme-prof.app`;
export const normId = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '');
export const errCode = (e: unknown) => (e as { code?: string })?.code ?? '';

async function loadTeacher(uid: string): Promise<Teacher | null> {
  const s = await getDoc(doc(db(), 'teachers', uid));
  if (!s.exists()) return null;
  const d = s.data();
  return { uid, prenom: String(d.prenom), classes: (d.classes as string[]) ?? [], identifiant: String(d.identifiant) };
}

/** Crée le compte et génère l'identifiant personnel unique (PROF-XXXXXX). */
export async function registerTeacher(prenom: string, classes: string[], password: string): Promise<Teacher> {
  for (let i = 0; i < 5; i++) {
    const identifiant = `PROF-${rand(6)}`;
    try {
      const cred = await createUserWithEmailAndPassword(auth(), emailOf(identifiant), password);
      await setDoc(doc(db(), 'teachers', cred.user.uid), { prenom, classes, identifiant });
      return { uid: cred.user.uid, prenom, classes, identifiant };
    } catch (e) { if (errCode(e) !== 'auth/email-already-in-use') throw e; }
  }
  throw new Error('identifiant');
}
export async function loginTeacher(id: string, password: string): Promise<Teacher | null> {
  const cred = await signInWithEmailAndPassword(auth(), emailOf(normId(id)), password);
  return loadTeacher(cred.user.uid);
}
export const currentTeacher = () => new Promise<Teacher | null>(res => {
  const off = onAuthStateChanged(auth(), async u => { off(); res(u ? await loadTeacher(u.uid).catch(() => null) : null); });
});
export const logoutTeacher = () => signOut(auth());

const ms = (t: unknown) => (t as { toMillis?: () => number })?.toMillis?.() ?? 0;
const toExercise = (code: string, d: Record<string, unknown>): Exercise => ({
  code, titre: String(d.titre), classes: (d.classes as string[]) ?? [], questions: (d.questions as Question[]) ?? [],
  teacherUid: String(d.teacherUid), createdAt: ms(d.createdAt),
});

/** Enregistre l'exercice sous un code unique de 10 caractères (lettres + chiffres). */
export async function createExercise(t: Teacher, titre: string, classes: string[], questions: Question[]): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = rand(10), ref = doc(db(), 'exercises', code);
    if ((await getDoc(ref)).exists()) continue;
    await setDoc(ref, { titre, classes, questions, teacherUid: t.uid, createdAt: serverTimestamp() });
    return code;
  }
  throw new Error('code');
}
export async function listExercises(uid: string): Promise<Exercise[]> {
  const s = await getDocs(query(collection(db(), 'exercises'), where('teacherUid', '==', uid)));
  return s.docs.map(d => toExercise(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt);
}
export async function getExercise(rawCode: string): Promise<Exercise | null> {
  const code = normId(rawCode), s = await getDoc(doc(db(), 'exercises', code));
  if (!s.exists()) return null;
  const ex = toExercise(code, s.data());
  return Array.isArray(ex.questions) && ex.questions.length ? ex : null;
}
export const submitResult = (code: string, prenom: string, classe: string, stars: number[]) =>
  addDoc(collection(db(), 'exercises', code, 'results'), { prenom, classe, stars, at: serverTimestamp() });
export async function listResults(code: string): Promise<Result[]> {
  const s = await getDocs(collection(db(), 'exercises', code, 'results'));
  return s.docs.map(d => {
    const x = d.data();
    return { id: d.id, prenom: String(x.prenom), classe: String(x.classe), at: ms(x.at),
      stars: Array.isArray(x.stars) ? (x.stars as unknown[]).map(n => Math.min(3, Math.max(0, Number(n) || 0))) : [] };
  });
}

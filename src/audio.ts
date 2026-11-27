let ctx: AudioContext | null = null;
export const sound = { muted: false };
function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine') {
  if (sound.muted) return;
  ctx ??= new AudioContext();
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + start;
  o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur);
}
export const sfx = {
  click: () => tone(520, 0, 0.07),
  good: () => { tone(523, 0, 0.12); tone(659, 0.1, 0.12); tone(784, 0.2, 0.25); },
  bad: () => { tone(220, 0, 0.18, 'triangle'); tone(165, 0.15, 0.25, 'triangle'); },
};

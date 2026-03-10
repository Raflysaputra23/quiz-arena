/* eslint-disable @typescript-eslint/no-explicit-any */
// Web Audio API based sound effects — no external dependencies
const audioCtx = () => {
  if (!(window as any).__quizAudioCtx) {
    (window as any).__quizAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return (window as any).__quizAudioCtx as AudioContext;
};

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  try {
    const ctx = audioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function playNotes(notes: [number, number, number][], type: OscillatorType = "sine", volume = 0.12) {
  try {
    const ctx = audioCtx();
    notes.forEach(([freq, startOffset, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
      gain.gain.setValueAtTime(volume, ctx.currentTime + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + dur);
    });
  } catch {}
}

export const Sounds = {
  correct: () => playNotes([
    [523, 0, 0.15],
    [659, 0.1, 0.15],
    [784, 0.2, 0.3],
  ], "sine", 0.15),

  wrong: () => playNotes([
    [330, 0, 0.2],
    [277, 0.15, 0.35],
  ], "sawtooth", 0.08),

  tick: () => playTone(880, 0.05, "sine", 0.06),

  tickUrgent: () => playTone(1200, 0.08, "square", 0.08),

  countdown321: () => playTone(660, 0.15, "triangle", 0.12),

  go: () => playNotes([
    [523, 0, 0.1],
    [659, 0.08, 0.1],
    [784, 0.16, 0.1],
    [1047, 0.24, 0.3],
  ], "sine", 0.15),

  streak: () => playNotes([
    [784, 0, 0.1],
    [988, 0.08, 0.1],
    [1175, 0.16, 0.25],
  ], "triangle", 0.12),

  fanfare: () => playNotes([
    [523, 0, 0.2],
    [659, 0.15, 0.2],
    [784, 0.3, 0.2],
    [1047, 0.45, 0.4],
    [784, 0.7, 0.15],
    [1047, 0.85, 0.5],
  ], "triangle", 0.14),

  pop: () => playTone(1400, 0.06, "sine", 0.1),

  whoosh: () => {
    try {
      const ctx = audioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  },
};

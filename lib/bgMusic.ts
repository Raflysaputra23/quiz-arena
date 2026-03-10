/* eslint-disable @typescript-eslint/no-explicit-any */
// Procedural background music using Web Audio API
class BackgroundMusic {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private oscillators: OscillatorNode[] = [];
  private intervalId: number | null = null;

  private getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.04, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);
    }
    return { ctx: this.ctx, gain: this.gainNode! };
  }

  private playChord(notes: number[], duration: number) {
    const { ctx, gain } = this.getCtx();
    notes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      oscGain.gain.setValueAtTime(0.03, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(oscGain);
      oscGain.connect(gain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
      this.oscillators.push(osc);
    });
  }

  private chordProgressions = [
    [261, 329, 392],  // C major
    [220, 277, 329],  // A minor
    [349, 440, 523],  // F major
    [392, 493, 587],  // G major
    [293, 369, 440],  // D minor
    [261, 329, 392],  // C major
    [349, 440, 523],  // F major
    [392, 493, 587],  // G major
  ];

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    let chordIdx = 0;

    const playNext = () => {
      if (!this.isPlaying) return;
      this.playChord(this.chordProgressions[chordIdx % this.chordProgressions.length], 3.5);
      chordIdx++;
    };

    playNext();
    this.intervalId = window.setInterval(playNext, 3200);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.oscillators.forEach((o) => {
      try { o.stop(); } catch {}
    });
    this.oscillators = [];
  }

  setVolume(vol: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(0.1, vol)), this.ctx.currentTime);
    }
  }

  getIsPlaying() { return this.isPlaying; }
}

export const bgMusic = new BackgroundMusic();

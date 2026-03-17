"use client";

import { useCallback } from 'react';

export const useLightningSound = () => {
  const playLightningSound = useCallback(() => {
    const ctx = new AudioContext();

    // Layer 1: Thunder crack - sharp noise burst
    const createCrack = () => {
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.5);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(8000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start(ctx.currentTime);
    };

    // Layer 2: Rolling thunder
    const createRollingThunder = () => {
      const duration = 3;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const env = Math.sin((i / bufferSize) * Math.PI) * Math.pow(1 - i / bufferSize, 0.3);
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, ctx.currentTime + 0.2);
      filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 3);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.3);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 1.5);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);

      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start(ctx.currentTime + 0.1);
    };

    // Layer 3: Electric zap
    const createZap = () => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(3000, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    };

    // Layer 4: Sub bass impact
    const createImpact = () => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.5);
    };

    createCrack();
    createZap();
    createImpact();
    createRollingThunder();
  }, []);

  return { playLightningSound };
};

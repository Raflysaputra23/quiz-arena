"use client"

import { useCallback, useRef } from 'react';

export const useFreezeSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playFreezeSound = useCallback(() => {
    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    // Layer 1: Ice cracking - filtered noise burst
    const createCrack = (startTime: number, duration: number) => {
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(3000, ctx.currentTime + startTime);
      filter.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + startTime + duration);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
      
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start(ctx.currentTime + startTime);
    };

    // Layer 2: Deep freeze rumble
    const createRumble = () => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 2);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.3);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
      
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2.5);
    };

    // Layer 3: Crystal shimmer - high frequency tones
    const createShimmer = (startTime: number) => {
      const frequencies = [2400, 3200, 4000, 4800, 5600];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime + i * 0.1);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime + startTime + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + startTime + i * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + i * 0.1 + 1.5);
        
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + startTime + i * 0.1);
        osc.stop(ctx.currentTime + startTime + i * 0.1 + 1.5);
      });
    };

    // Layer 4: Wind/whoosh
    const createWhoosh = () => {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(500, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.5);
      filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 2);
      filter.Q.value = 2;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
      
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start(ctx.currentTime);
    };

    // Execute layers
    createRumble();
    createWhoosh();
    createCrack(0.1, 0.4);
    createCrack(0.3, 0.3);
    createCrack(0.6, 0.5);
    createCrack(1.0, 0.3);
    createShimmer(0.2);
    createShimmer(0.8);
  }, []);

  return { playFreezeSound };
};

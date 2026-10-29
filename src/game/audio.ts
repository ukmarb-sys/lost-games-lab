import { loadSoundEnabled, saveSoundEnabled } from './storage';

/**
 * Tiny procedural sound kit built on the Web Audio API — no audio files, no
 * licensing concerns. All sounds are short, soft and synthesised on demand.
 */
export type SoundName = 'select' | 'step' | 'capture' | 'whoosh' | 'win' | 'lose' | 'invalid' | 'click';

class SoundKit {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = loadSoundEnabled();

  /** Must be called from a user gesture (browsers keep audio locked until then). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    saveSoundEnabled(this.enabled);
    if (this.enabled) this.unlock();
    return this.enabled;
  }

  play(name: SoundName): void {
    if (!this.enabled) return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + 0.005;
    switch (name) {
      case 'click':
        this.tone(520, t, 0.06, 'triangle', 0.18);
        break;
      case 'select':
        this.tone(660, t, 0.09, 'sine', 0.22);
        this.tone(990, t + 0.03, 0.08, 'sine', 0.08);
        break;
      case 'step':
        this.noise(t, 0.07, 900, 0.35);
        this.tone(190, t, 0.12, 'sine', 0.3);
        break;
      case 'whoosh':
        this.sweep(t, 0.5);
        break;
      case 'capture':
        this.noise(t, 0.12, 600, 0.4);
        this.tone(880, t, 0.9, 'sine', 0.22);
        this.tone(1320, t + 0.02, 0.7, 'sine', 0.12);
        this.tone(1760, t + 0.04, 0.5, 'sine', 0.06);
        break;
      case 'win':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, t + i * 0.13, 0.7, 'triangle', 0.2));
        this.tone(1568, t + 0.55, 1.1, 'sine', 0.1);
        break;
      case 'lose':
        [392, 349.23, 293.66].forEach((f, i) => this.tone(f, t + i * 0.18, 0.6, 'triangle', 0.18));
        break;
      case 'invalid':
        this.tone(140, t, 0.12, 'square', 0.06);
        break;
    }
  }

  private tone(freq: number, at: number, dur: number, type: OscillatorType, vol: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(this.master!);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  private noiseBuffer(dur: number): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private noise(at: number, dur: number, cutoff: number, vol: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter).connect(g).connect(this.master!);
    src.start(at);
  }

  private sweep(at: number, dur: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 4;
    filter.frequency.setValueAtTime(300, at);
    filter.frequency.exponentialRampToValueAtTime(2400, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.25, at + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter).connect(g).connect(this.master!);
    src.start(at);
  }
}

export const sound = new SoundKit();

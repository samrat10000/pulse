/* Login music, synthesised in the browser (no audio files). 126 BPM, 4-bar loop, Am–F–C–G.
   Ported from the prototype's Music object. */
import { useSyncExternalStore } from 'react';
import { store } from './env';

type AC = AudioContext;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

class Engine {
  ctx: AC | null = null;
  playing = false;
  /** auto-start already attempted on this page view */
  tried = false;
  private step = 0;
  private next = 0;
  private timer = 0;
  private master!: GainNode;
  private duck!: GainNode;
  private noise!: AudioBuffer;

  get muted() { return store.get('session', 'pulse-muted') === '1'; }
  set muted(v: boolean) { store.set('session', 'pulse-muted', v ? '1' : null); emit(); }

  private build() {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return false;
      const x = this.ctx = new Ctor();
      this.master = x.createGain(); this.master.gain.value = 0;
      const comp = x.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      this.master.connect(comp).connect(x.destination);
      this.duck = x.createGain(); this.duck.connect(this.master);
      const n = x.createBuffer(1, x.sampleRate, x.sampleRate), d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = n;
      return true;
    } catch { return false; }
  }

  /** returns false when the browser can't play sound */
  start() {
    if (this.playing) return true;
    if (!this.ctx && !this.build()) return false;
    try {
      const x = this.ctx!; void x.resume();
      this.master.gain.cancelScheduledValues(x.currentTime); this.master.gain.setValueAtTime(this.master.gain.value, x.currentTime); this.master.gain.linearRampToValueAtTime(.5, x.currentTime + 1.2);
      this.next = x.currentTime + .06; this.step = 0; this.playing = true;
      clearInterval(this.timer); this.timer = window.setInterval(() => this.sched(), 25);
    } catch { return false; }
    emit();
    return true;
  }

  stop(fade = .4) {
    if (!this.ctx || !this.playing) return;
    const x = this.ctx; this.playing = false;
    try {
      this.master.gain.cancelScheduledValues(x.currentTime); this.master.gain.setValueAtTime(this.master.gain.value, x.currentTime); this.master.gain.linearRampToValueAtTime(0, x.currentTime + fade);
    } catch { /* closed */ }
    setTimeout(() => { if (!this.playing) { clearInterval(this.timer); void x.suspend(); } }, fade * 1000 + 100);
    emit();
  }

  private sched() {
    const sl = 60 / 126 / 4;
    while (this.next < this.ctx!.currentTime + .12) { this.play(this.step, this.next, sl); this.next += sl; this.step = (this.step + 1) % 64; }
  }

  private play(s: number, t: number, sl: number) {
    const bar = s >> 4, i = s & 15;
    if (i % 4 === 0) { this.kick(t); this.duck.gain.cancelScheduledValues(t); this.duck.gain.setValueAtTime(.3, t); this.duck.gain.linearRampToValueAtTime(1, t + .2); }
    if (i === 4 || i === 12) this.hit(t, 'bandpass', 1500, .32, .16);
    if (i % 4 === 2) this.hit(t, 'highpass', 7500, .16, .11); else if (i % 2 === 1) this.hit(t, 'highpass', 9000, .06, .03);
    const roots = [55, 43.65, 65.41, 49];
    if (i % 4 !== 0) this.bass(t, roots[bar] * (i === 14 ? 2 : 1), sl * .9);
    if (i === 0) this.chord(t, [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]][bar], sl * 16);
    if (bar === 3 && i >= 8 && i % 2 === 0) this.hit(t, 'bandpass', 600 + i * 300, .05 + (i - 8) * .02, .08);
  }
  private kick(t: number) { const x = this.ctx!, o = x.createOscillator(), g = x.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .12); g.gain.setValueAtTime(.95, t); g.gain.exponentialRampToValueAtTime(.001, t + .4); o.connect(g).connect(this.master); o.start(t); o.stop(t + .42); }
  private hit(t: number, type: BiquadFilterType, f: number, v: number, dur: number) { const x = this.ctx!, s = x.createBufferSource(), fl = x.createBiquadFilter(), g = x.createGain(); s.buffer = this.noise; fl.type = type; fl.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(fl).connect(g).connect(this.master); s.start(t, Math.random() * .5); s.stop(t + dur + .02); }
  private bass(t: number, f: number, dur: number) { const x = this.ctx!, o = x.createOscillator(), fl = x.createBiquadFilter(), g = x.createGain(); o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(260, t + dur); g.gain.setValueAtTime(.2, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(fl).connect(g).connect(this.duck); o.start(t); o.stop(t + dur + .02); }
  private chord(t: number, notes: number[], dur: number) {
    const x = this.ctx!, fl = x.createBiquadFilter(), g = x.createGain(); fl.type = 'lowpass'; fl.frequency.value = 1300;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.032, t + .08); g.gain.setValueAtTime(.032, t + dur - .12); g.gain.linearRampToValueAtTime(0, t + dur); fl.connect(g).connect(this.duck);
    notes.forEach(f => [-7, 7].forEach(dt => { const o = x.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(fl); o.start(t); o.stop(t + dur + .02); }));
  }
}

export const Music = new Engine();

/** re-renders when music starts, stops or is muted */
export function useMusic() {
  useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l); }, () => `${Music.playing}|${Music.muted}`);
  return { playing: Music.playing, muted: Music.muted };
}

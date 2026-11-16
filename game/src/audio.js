// audio.js — every sound in Starlight Salvage is synthesised with WebAudio.
// No audio files, no network. The context is created on the first user
// gesture (a click or key), because browsers block audio before interaction.

const CHIME_STEPS = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.7, 1318.5];

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    muted: false,
    // Lazily create the context so the game can boot silently on the title
    // screen; the first gesture calls ensure() and sound starts working.
    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return true;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
        return true;
      } catch (e) {
        return false;
      }
    },
    toggleMute() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
      return this.muted;
    },
    // One short oscillator blip with a pitch slide and a fast decay.
    blip(freq, endFreq, dur, type, vol) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (endFreq && endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + dur);
      gain.gain.setValueAtTime(vol || 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    // Filtered noise burst — the explosion and the comet rumble.
    noise(dur, vol, cutoff) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff || 900;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t);
    },
    // Shard pickup: the chime climbs one step per combo level, so a long
    // chain literally sounds like it is rising.
    pickup(combo) {
      const step = Math.min(combo, CHIME_STEPS.length) - 1;
      const f = CHIME_STEPS[Math.max(0, step)];
      this.blip(f, f * 1.5, 0.16, 'sine', 0.28);
      this.blip(f * 2, f * 2, 0.1, 'triangle', 0.1);
    },
    laser() {
      this.blip(880, 220, 0.09, 'square', 0.12);
    },
    explosion(big) {
      this.noise(big ? 0.5 : 0.28, big ? 0.4 : 0.25, big ? 500 : 900);
      this.blip(140, 40, big ? 0.4 : 0.22, 'sawtooth', 0.18);
    },
    hurt() {
      this.blip(220, 55, 0.35, 'sawtooth', 0.3);
      this.noise(0.3, 0.3, 600);
    },
    storm() {
      this.noise(1.2, 0.16, 300);
      this.blip(90, 180, 0.9, 'sine', 0.12);
    },
    powerup() {
      this.blip(392, 784, 0.18, 'triangle', 0.25);
      this.blip(523, 1046, 0.22, 'triangle', 0.2);
    },
    waveClear() {
      this.blip(523, 523, 0.12, 'triangle', 0.22);
      this.blip(659, 659, 0.12, 'triangle', 0.22);
      this.blip(784, 784, 0.2, 'triangle', 0.25);
    },
    click() {
      this.blip(660, 660, 0.06, 'triangle', 0.18);
    },
    gameOver() {
      this.blip(392, 392, 0.25, 'triangle', 0.25);
      this.blip(311, 311, 0.25, 'triangle', 0.25);
      this.blip(233, 180, 0.5, 'triangle', 0.25);
    },
  };
  return audio;
}

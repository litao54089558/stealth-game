// Night Archive — all sound is synthesised with WebAudio.
// No audio files ship with the game: footsteps are short bursts of filtered
// noise, the alert sting and the pickup chime are small oscillator phrases.
// A guard's footsteps get louder as it gets closer to the player and pan
// left or right with its direction, so you can hear where a guard is.
// Everything no-ops when there is no audio context (headless screenshots,
// or a browser that blocks audio before the first click).

export class StealthAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.heartbeatTimer = 0;
  }

  ensure() {
    if (this.ctx) return;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.12);
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch (err) {
      this.ctx = null;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playNoiseBurst({ volume, pan, lowpassHz, duration }) {
    if (!this.ctx || !this.noiseBuffer) return;
    try {
      const now = this.ctx.currentTime;
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpassHz;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      source.connect(filter).connect(gain).connect(panner).connect(this.master);
      source.start(now);
      source.stop(now + duration);
    } catch (err) {
      // Audio must never break the game.
    }
  }

  playTone({ frequency, volume, duration, when = 0, type = 'sine' }) {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = frequency;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain).connect(this.master);
      osc.start(now);
      osc.stop(now + duration);
    } catch (err) {
      // Audio must never break the game.
    }
  }

  // The player's own step: soft, centred, a touch louder when a guard
  // is close (tension you can hear).
  playPlayerStep(nearestGuardDistance) {
    const closeness = Math.max(0, 1 - nearestGuardDistance / 320);
    this.playNoiseBurst({
      volume: 0.10 + 0.10 * closeness,
      pan: 0,
      lowpassHz: 320,
      duration: 0.09,
    });
  }

  // A guard's step: volume by distance to the player, panned by the
  // guard's direction from the player.
  playGuardStep(guard, player) {
    const dx = guard.x - player.x;
    const dy = guard.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 520) return;
    this.playNoiseBurst({
      volume: 0.30 * (1 - dist / 520),
      pan: Math.max(-1, Math.min(1, dx / 360)),
      lowpassHz: 220,
      duration: 0.11,
    });
  }

  playAlertSting() {
    this.playTone({ frequency: 620, volume: 0.16, duration: 0.12, type: 'square' });
    this.playTone({ frequency: 830, volume: 0.16, duration: 0.18, when: 0.11, type: 'square' });
  }

  playPickup() {
    this.playTone({ frequency: 880, volume: 0.14, duration: 0.10 });
    this.playTone({ frequency: 1318, volume: 0.14, duration: 0.16, when: 0.09 });
  }

  playLevelClear() {
    [523, 659, 784, 1046].forEach((f, i) => {
      this.playTone({ frequency: f, volume: 0.14, duration: 0.22, when: i * 0.11 });
    });
  }

  playCaught() {
    this.playTone({ frequency: 220, volume: 0.20, duration: 0.30, type: 'sawtooth' });
    this.playTone({ frequency: 147, volume: 0.20, duration: 0.45, when: 0.22, type: 'sawtooth' });
  }

  // A low thump while any guard is hunting, timed by the caller.
  playHeartbeat() {
    this.playNoiseBurst({ volume: 0.22, pan: 0, lowpassHz: 140, duration: 0.16 });
  }
}

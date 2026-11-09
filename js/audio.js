// Tiny procedural sound engine (WebAudio): no audio files, no licensing questions.
let ctx = null;
let master = null;
let enabled = true;
let noiseBuf = null;

export function setSoundEnabled(on) {
  enabled = on;
}

function ensure() {
  if (!enabled) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Call from the first user gesture so iOS unlocks audio. */
export function unlockAudio() {
  ensure();
  if (typeof unlockMusic === 'function') unlockMusic();
}

function tone({ freq, to, dur = 0.15, type = 'sine', gain = 0.3, delay = 0 }) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.2, freq = 800, q = 1, gain = 0.2, delay = 0, type = 'bandpass' }) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0, Math.random() * 0.2);
  src.stop(t0 + dur + 0.02);
}

export const sfx = {
  roll(seconds) {
    noise({ dur: Math.max(0.12, seconds), freq: 380, q: 0.7, gain: 0.08 });
  },
  clack(strength = 1) {
    tone({ freq: 1900, to: 900, dur: 0.05, type: 'triangle', gain: 0.07 + 0.08 * strength });
    noise({ dur: 0.05, freq: 3200, q: 2, gain: 0.05 * strength });
  },
  thud() {
    tone({ freq: 140, to: 70, dur: 0.12, type: 'sine', gain: 0.25 });
  },
  drop(pitchIndex = 0) {
    const base = [523.25, 659.25, 783.99, 987.77][pitchIndex % 4];
    tone({ freq: base * 1.5, to: base * 0.5, dur: 0.22, type: 'sine', gain: 0.22 });
    tone({ freq: base, dur: 0.35, type: 'triangle', gain: 0.12, delay: 0.08 });
  },
  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ freq: f, dur: 0.4, type: 'triangle', gain: 0.16, delay: i * 0.09 }),
    );
    tone({ freq: 1567.98, dur: 0.6, type: 'sine', gain: 0.08, delay: 0.38 });
  },
  star(i) {
    tone({ freq: 880 * Math.pow(1.26, i), dur: 0.25, type: 'sine', gain: 0.14 });
  },
  coin() {
    tone({ freq: 1318.5, dur: 0.08, type: 'square', gain: 0.05 });
    tone({ freq: 1975.5, dur: 0.25, type: 'square', gain: 0.05, delay: 0.07 });
  },
  whoosh() {
    noise({ dur: 0.45, freq: 900, q: 0.6, gain: 0.12, type: 'bandpass' });
    tone({ freq: 220, to: 110, dur: 0.4, type: 'sine', gain: 0.12, delay: 0.25 });
  },
  chestShake(i = 0) {
    tone({ freq: 160 + i * 40, to: 120 + i * 30, dur: 0.12, type: 'triangle', gain: 0.18 });
    noise({ dur: 0.1, freq: 2400, q: 3, gain: 0.08 + i * 0.03 });
  },
  chestOpen() {
    noise({ dur: 0.6, freq: 3000, q: 0.5, gain: 0.12, type: 'highpass' });
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      tone({ freq: f, dur: 0.6, type: 'triangle', gain: 0.1, delay: 0.05 + i * 0.06 }),
    );
  },
  pop(i = 0) {
    tone({ freq: 600 + i * 150, to: 1200 + i * 200, dur: 0.12, type: 'sine', gain: 0.16 });
  },
  tick() {
    tone({ freq: 2000 + Math.random() * 400, dur: 0.04, type: 'square', gain: 0.03 });
  },
  unlock() {
    tone({ freq: 880, dur: 0.08, type: 'square', gain: 0.05 });
    tone({ freq: 1320, dur: 0.3, type: 'triangle', gain: 0.12, delay: 0.08 });
    noise({ dur: 0.2, freq: 4000, q: 2, gain: 0.06, delay: 0.05 });
  },
  /** Rising hum while the chest charges up (duration in seconds). */
  charge(dur = 1) {
    tone({ freq: 140, to: 620, dur, type: 'sawtooth', gain: 0.035 });
    tone({ freq: 280, to: 1240, dur, type: 'sine', gain: 0.05 });
  },
  land() {
    tone({ freq: 120, to: 55, dur: 0.22, type: 'sine', gain: 0.3 });
    noise({ dur: 0.18, freq: 500, q: 0.8, gain: 0.12 });
  },
  upgrade() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) =>
      tone({ freq: f, dur: 0.18, type: 'square', gain: 0.045, delay: i * 0.05 }),
    );
    noise({ dur: 0.5, freq: 5000, q: 1, gain: 0.07, type: 'highpass', delay: 0.1 });
  },
  flip(i = 0) {
    noise({ dur: 0.08, freq: 1800 + i * 200, q: 1.5, gain: 0.1 });
    tone({ freq: 700 + i * 120, to: 1000 + i * 150, dur: 0.1, type: 'triangle', gain: 0.08 });
  },
  epic() {
    [659.25, 830.61, 987.77, 1318.5].forEach((f, i) => tone({ freq: f, dur: 0.7, type: 'triangle', gain: 0.1, delay: i * 0.08 }));
    tone({ freq: 1975.5, dur: 0.9, type: 'sine', gain: 0.06, delay: 0.35 });
  },
  coinRain() {
    for (let i = 0; i < 10; i++) tone({ freq: 1800 + Math.random() * 900, dur: 0.05, type: 'square', gain: 0.025, delay: i * 0.06 + Math.random() * 0.03 });
  },
  warp() {
    tone({ freq: 300, to: 1400, dur: 0.18, type: 'sine', gain: 0.12 });
    tone({ freq: 1400, to: 500, dur: 0.18, type: 'triangle', gain: 0.06, delay: 0.1 });
  },
  combo(count = 2) {
    const base = count >= 3 ? [659.25, 830.61, 987.77, 1318.5, 1661.2] : [587.33, 739.99, 880, 1174.7];
    base.forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'square', gain: 0.05, delay: i * 0.055 }));
    tone({ freq: base[base.length - 1] * 2, dur: 0.5, type: 'sine', gain: 0.07, delay: base.length * 0.055 });
  },
  tap() {
    tone({ freq: 660, to: 520, dur: 0.06, type: 'sine', gain: 0.08 });
  },
  undo() {
    tone({ freq: 420, to: 300, dur: 0.1, type: 'sine', gain: 0.12 });
  },
};

export function haptic(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* unsupported */
  }
}

/* ==========================================================================
   Procedural ambient music — calm chords, a pentatonic arpeggio with echo,
   and a soft bass. Each world has its own key and tempo. No audio files.
   ========================================================================== */
const THEMES = {
  home: { root: 261.63, minor: false, bpm: 72 }, // C
  daily: { root: 293.66, minor: false, bpm: 70 }, // D
  0: { root: 261.63, minor: false, bpm: 76 }, // Pebble Beach — C
  1: { root: 329.63, minor: false, bpm: 70 }, // Sunny Dunes — E
  2: { root: 220.0, minor: true, bpm: 80 }, // Ember Canyon — A minor
  3: { root: 349.23, minor: false, bpm: 68 }, // Coral Reef — F
  4: { root: 246.94, minor: true, bpm: 66 }, // Violet Peaks — B minor
  5: { root: 392.0, minor: false, bpm: 62 }, // Glacier Bay — G
  6: { root: 293.66, minor: true, bpm: 74 }, // Mossy Woods — D minor
  7: { root: 311.13, minor: false, bpm: 84 }, // Neon City — E♭
};
// Scale degrees in semitones; chord progressions as scale-degree roots.
const PENTA_MAJ = [0, 2, 4, 7, 9, 12, 14, 16];
const PENTA_MIN = [0, 3, 5, 7, 10, 12, 15, 17];
const PROG_MAJ = [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]]; // I vi IV V
const PROG_MIN = [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]]; // i VI III VII

let music = { on: false, wanted: false, theme: 'home', gain: null, delay: null, timer: 0, step: 0, next: 0, last: 2 };
const semi = (root, n) => root * Math.pow(2, n / 12);

function musicNodes(c) {
  if (music.gain) return;
  music.gain = c.createGain();
  music.gain.gain.value = 0;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2600;
  music.delay = c.createDelay(1);
  music.delay.delayTime.value = 0.36;
  const fb = c.createGain();
  fb.gain.value = 0.32;
  music.delay.connect(fb).connect(music.delay);
  music.delay.connect(lp);
  music.gain.connect(lp).connect(c.destination);
  music.gain.connect(music.delay);
}

function note(c, freq, t, dur, { type = 'sine', gain = 0.05, attack = 0.02 } = {}) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(music.gain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function scheduler() {
  const c = ctx;
  if (!c || !music.on) return;
  const th = THEMES[music.theme] || THEMES.home;
  const eighth = 60 / th.bpm / 2;
  const scale = th.minor ? PENTA_MIN : PENTA_MAJ;
  const prog = th.minor ? PROG_MIN : PROG_MAJ;
  while (music.next < c.currentTime + 0.3) {
    const t = music.next;
    const s = music.step;
    const bar = Math.floor(s / 8);
    const chord = prog[bar % 4];
    if (s % 16 === 0) {
      // Pad: a soft chord every two bars.
      for (const n of chord) note(c, semi(th.root, n - 12), t, eighth * 16, { type: 'triangle', gain: 0.022, attack: 0.6 });
    }
    if (s % 8 === 0) note(c, semi(th.root, chord[0] - 24), t, eighth * 7, { type: 'sine', gain: 0.05, attack: 0.05 });
    // Arpeggio: a gentle random walk on the pentatonic scale, with rests.
    if (Math.random() < (s % 2 === 0 ? 0.72 : 0.35)) {
      music.last = Math.max(0, Math.min(scale.length - 1, music.last + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
      note(c, semi(th.root, scale[music.last]), t, eighth * 2.2, { type: 'sine', gain: 0.028 });
    }
    music.next += eighth;
    music.step++;
  }
}

function startMusic() {
  const c = ensure();
  if (!c || music.on) return;
  musicNodes(c);
  music.on = true;
  music.next = c.currentTime + 0.1;
  music.gain.gain.cancelScheduledValues(c.currentTime);
  music.gain.gain.setTargetAtTime(0.55, c.currentTime, 1.2);
  music.timer = setInterval(scheduler, 100);
}

function stopMusic() {
  if (!music.on || !ctx) return;
  music.on = false;
  clearInterval(music.timer);
  music.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
}

/** Turn background music on/off (it only actually starts after a user gesture). */
export function setMusicEnabled(on) {
  music.wanted = on;
  if (on && ctx && ctx.state !== 'suspended' && !document.hidden) startMusic();
  if (!on) stopMusic();
}

/** Switch the musical theme (world index, 'home' or 'daily'). */
export function setMusicTheme(key) {
  music.theme = String(key);
}

/** Called on the first user gesture (browsers block audio before that). */
export function unlockMusic() {
  if (music.wanted && !document.hidden) startMusic();
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopMusic();
    else if (music.wanted && ctx) startMusic();
  });
}

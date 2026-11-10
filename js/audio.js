// Tiny procedural sound engine (WebAudio): no audio files, no licensing questions.
//
// Signal flow:
//   sfx voices ─► sfxBus ─┬────────────────► master (compressor) ─► out
//                         └─► reverb send ─┘
//   music voices ─► musicBus (volume × duck) ─► lowpass/echo ─► master
//
// Everything is synthesised; each sound gets a little random pitch/level variation so
// repeated actions (hundreds of tilts per session) never sound mechanical.
let ctx = null;
let master = null;
let sfxBus = null;
let reverbIn = null;
let enabled = true;
let noiseBuf = null;
let sfxVolume = 0.8;
let musicVolume = 0.7;

export function setSoundEnabled(on) {
  enabled = on;
}

/** 0..1 */
export function setSfxVolume(v) {
  sfxVolume = Math.max(0, Math.min(1, v));
  if (sfxBus) sfxBus.gain.setTargetAtTime(sfxVolume, ctx.currentTime, 0.05);
}
export function setMusicVolume(v) {
  musicVolume = Math.max(0, Math.min(1, v));
  applyMusicLevel(0.15);
}

function impulse(c, seconds = 1.6, decay = 3) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function ensure() {
  if (!enabled) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // Gentle bus compressor: many overlapping sounds (combo + coins + chest) never clip.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp).connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxVolume;
    sfxBus.connect(master);
    // Small room reverb on a send: gives sounds a soft tail without muddying them.
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx, 1.4, 3.2);
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.22;
    reverbIn = ctx.createGain();
    reverbIn.gain.value = 1;
    reverbIn.connect(verb).connect(verbOut).connect(master);
    sfxBus.connect(reverbIn);
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
  unlockMusic();
}

const vary = (amount = 0.03) => 1 + (Math.random() * 2 - 1) * amount;

function tone({ freq, to, dur = 0.15, type = 'sine', gain = 0.3, delay = 0, attack = 0.008, wet = 0, out }) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(out || sfxBus);
  if (wet && !out) {
    const s = c.createGain();
    s.gain.value = wet;
    g.connect(s).connect(reverbIn);
  }
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

/** Bell / glass: a few inharmonic partials that die away at different speeds. */
function bell(freq, { dur = 0.6, gain = 0.1, delay = 0, wet = 0.6, bright = 1 } = {}) {
  tone({ freq, dur, gain, delay, wet, attack: 0.004 });
  tone({ freq: freq * 2.76, dur: dur * 0.45, gain: gain * 0.35 * bright, delay, wet, attack: 0.003 });
  tone({ freq: freq * 5.4, dur: dur * 0.22, gain: gain * 0.18 * bright, delay, wet, attack: 0.002 });
}

function noise({ dur = 0.2, freq = 800, to, q = 1, gain = 0.2, delay = 0, type = 'bandpass', attack = 0.02, wet = 0 }) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t0);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(sfxBus);
  if (wet) {
    const s = c.createGain();
    s.gain.value = wet;
    g.connect(s).connect(reverbIn);
  }
  src.start(t0, Math.random() * 0.2);
  src.stop(t0 + dur + 0.02);
}

/* ---------- music ducking ---------- */
let duckLevel = 1;
let duckTimer = 0;
/** Lower the music for a moment so a big sound (win, chest) reads clearly. */
function duck(amount = 0.35, ms = 1200) {
  if (!music.gain || !ctx) return;
  duckLevel = amount;
  applyMusicLevel(0.06);
  clearTimeout(duckTimer);
  duckTimer = setTimeout(() => {
    duckLevel = 1;
    applyMusicLevel(0.6);
  }, ms);
}

const raw = {
  roll(seconds, strength = 1) {
    // Low rumble whose filter opens then closes as the marble speeds up and stops.
    const dur = Math.max(0.12, seconds);
    noise({ dur, freq: 260 * vary(0.1), to: 520, q: 0.8, gain: 0.07 * strength, attack: 0.04 });
    noise({ dur: dur * 0.9, freq: 1400 * vary(0.1), q: 3, gain: 0.012 * strength, attack: 0.05 });
  },
  clack(strength = 1) {
    // Marble against wood: a short knock and a bright tick.
    const v = vary(0.06);
    tone({ freq: 1700 * v, to: 820 * v, dur: 0.045, type: 'triangle', gain: 0.06 + 0.08 * strength, wet: 0.15 });
    tone({ freq: 210 * v, to: 120, dur: 0.07, type: 'sine', gain: 0.08 * strength });
    noise({ dur: 0.04, freq: 3400 * v, q: 2.5, gain: 0.045 * strength, attack: 0.003 });
  },
  thud() {
    tone({ freq: 140 * vary(), to: 70, dur: 0.12, type: 'sine', gain: 0.22 });
    noise({ dur: 0.08, freq: 300, q: 1, gain: 0.05, attack: 0.004 });
  },
  drop(pitchIndex = 0) {
    // "Plunk" into the hole, then a bell on a rising major arpeggio:
    // each marble dropped in a level sounds one step higher.
    const steps = [0, 4, 7, 12, 16, 19, 24];
    const base = 523.25 * Math.pow(2, steps[Math.min(pitchIndex, steps.length - 1)] / 12);
    tone({ freq: base * 1.4, to: base * 0.45, dur: 0.16, type: 'sine', gain: 0.18 });
    tone({ freq: 190, to: 80, dur: 0.18, type: 'sine', gain: 0.16, delay: 0.02 });
    bell(base, { dur: 0.7, gain: 0.11, delay: 0.07, wet: 0.5 });
  },
  sand() {
    // Soft "shhf" as a piece stops in sand.
    noise({ dur: 0.18 * vary(0.1), freq: 2400 * vary(0.1), to: 900, q: 0.7, gain: 0.07, attack: 0.01 });
  },
  gate(color = 0) {
    // Glassy chime when a marble slips through its crystal gate.
    const notes = [1046.5, 1174.7, 1318.5, 1568];
    bell(notes[color % 4] * vary(0.01), { dur: 0.5, gain: 0.05, wet: 0.7, bright: 1.4 });
  },
  win() {
    duck(0.25, 1800);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ freq: f, dur: 0.42, type: 'triangle', gain: 0.13, delay: i * 0.09, wet: 0.35 }));
    bell(1567.98, { dur: 1.1, gain: 0.08, delay: 0.38, wet: 0.8 });
    bell(2093, { dur: 0.9, gain: 0.04, delay: 0.5, wet: 0.9 });
  },
  star(i) {
    bell(880 * Math.pow(1.26, i), { dur: 0.6, gain: 0.11, wet: 0.6 });
    noise({ dur: 0.25, freq: 6000, q: 1, gain: 0.025, type: 'highpass', attack: 0.005, wet: 0.5 });
  },
  coin() {
    const v = vary(0.015);
    tone({ freq: 1318.5 * v, dur: 0.07, type: 'square', gain: 0.035 });
    bell(1975.5 * v, { dur: 0.32, gain: 0.05, delay: 0.06, wet: 0.35, bright: 0.6 });
  },
  whoosh() {
    noise({ dur: 0.45, freq: 500, to: 2200, q: 0.7, gain: 0.1, type: 'bandpass' });
    tone({ freq: 220, to: 110, dur: 0.4, type: 'sine', gain: 0.1, delay: 0.25 });
  },
  /** Soft swish for panels sliding in / out. */
  swish(out = false) {
    noise({ dur: 0.22, freq: out ? 2400 : 700, to: out ? 700 : 2400, q: 0.8, gain: 0.035, attack: 0.05 });
  },
  chestShake(i = 0) {
    tone({ freq: (160 + i * 40) * vary(), to: 120 + i * 30, dur: 0.12, type: 'triangle', gain: 0.16 });
    noise({ dur: 0.1, freq: 2400, q: 3, gain: 0.07 + i * 0.03 });
  },
  chestOpen() {
    duck(0.2, 2200);
    noise({ dur: 0.7, freq: 2000, to: 7000, q: 0.5, gain: 0.1, type: 'highpass', wet: 0.6 });
    tone({ freq: 98, to: 60, dur: 0.4, type: 'sine', gain: 0.22 });
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone({ freq: f, dur: 0.6, type: 'triangle', gain: 0.085, delay: 0.05 + i * 0.06, wet: 0.4 }));
    bell(2093, { dur: 1.4, gain: 0.06, delay: 0.42, wet: 0.9 });
  },
  pop(i = 0) {
    tone({ freq: (600 + i * 150) * vary(), to: 1200 + i * 200, dur: 0.12, type: 'sine', gain: 0.14, wet: 0.2 });
  },
  tick() {
    tone({ freq: (2000 + Math.random() * 400), dur: 0.035, type: 'square', gain: 0.022 });
  },
  unlock() {
    tone({ freq: 880, dur: 0.08, type: 'square', gain: 0.04 });
    bell(1320, { dur: 0.6, gain: 0.1, delay: 0.08, wet: 0.6 });
    noise({ dur: 0.2, freq: 4000, q: 2, gain: 0.05, delay: 0.05 });
  },
  /** Rising hum while the chest charges up (duration in seconds). */
  charge(dur = 1) {
    duck(0.4, dur * 1000 + 400);
    tone({ freq: 140, to: 620, dur, type: 'sawtooth', gain: 0.025 });
    tone({ freq: 280, to: 1240, dur, type: 'sine', gain: 0.045, wet: 0.4 });
  },
  fall() {
    tone({ freq: 520, to: 70, dur: 0.5, type: 'triangle', gain: 0.14, wet: 0.3 });
    noise({ dur: 0.35, freq: 400, to: 120, q: 0.7, gain: 0.07, delay: 0.1 });
  },
  land() {
    tone({ freq: 120, to: 55, dur: 0.22, type: 'sine', gain: 0.28 });
    noise({ dur: 0.18, freq: 500, q: 0.8, gain: 0.1 });
  },
  upgrade() {
    duck(0.3, 1400);
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'square', gain: 0.035, delay: i * 0.05, wet: 0.3 }));
    noise({ dur: 0.5, freq: 5000, q: 1, gain: 0.06, type: 'highpass', delay: 0.1, wet: 0.5 });
  },
  flip(i = 0) {
    noise({ dur: 0.08, freq: 1800 + i * 200, q: 1.5, gain: 0.09 });
    tone({ freq: 700 + i * 120, to: 1000 + i * 150, dur: 0.1, type: 'triangle', gain: 0.07 });
  },
  epic() {
    duck(0.3, 1600);
    [659.25, 830.61, 987.77, 1318.5].forEach((f, i) => tone({ freq: f, dur: 0.7, type: 'triangle', gain: 0.085, delay: i * 0.08, wet: 0.45 }));
    bell(1975.5, { dur: 1.2, gain: 0.06, delay: 0.35, wet: 0.9 });
  },
  coinRain() {
    for (let i = 0; i < 10; i++) tone({ freq: 1800 + Math.random() * 900, dur: 0.05, type: 'square', gain: 0.02, delay: i * 0.06 + Math.random() * 0.03, wet: 0.3 });
  },
  warp() {
    tone({ freq: 300, to: 1400, dur: 0.18, type: 'sine', gain: 0.1, wet: 0.5 });
    tone({ freq: 1400, to: 500, dur: 0.18, type: 'triangle', gain: 0.05, delay: 0.1, wet: 0.5 });
  },
  combo(count = 2) {
    duck(0.35, 1200);
    const base = count >= 3 ? [659.25, 830.61, 987.77, 1318.5, 1661.2] : [587.33, 739.99, 880, 1174.7];
    base.forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'square', gain: 0.04, delay: i * 0.055, wet: 0.3 }));
    bell(base[base.length - 1] * 2, { dur: 0.8, gain: 0.06, delay: base.length * 0.055, wet: 0.8 });
  },
  tap() {
    const v = vary(0.04);
    tone({ freq: 660 * v, to: 520 * v, dur: 0.06, type: 'sine', gain: 0.07 });
  },
  undo() {
    tone({ freq: 420 * vary(), to: 300, dur: 0.1, type: 'sine', gain: 0.1 });
    noise({ dur: 0.12, freq: 1500, to: 600, q: 1, gain: 0.025 });
  },
};

// The same sound fired twice within a few ms (two marbles hitting a wall together,
// a burst of coin taps) is merged: louder in theory, just noisier in practice.
const MIN_GAP = { clack: 35, coin: 45, tick: 30, tap: 40, sand: 40, gate: 60, roll: 60, thud: 80, pop: 30, swish: 120 };
const lastPlayed = {};
export const sfx = {};
for (const [name, fn] of Object.entries(raw)) {
  sfx[name] = (...args) => {
    if (!enabled || !sfxVolume) return;
    const gap = MIN_GAP[name];
    if (gap) {
      const now = performance.now();
      if (now - (lastPlayed[name] || 0) < gap) return;
      lastPlayed[name] = now;
    }
    fn(...args);
  };
}

export function haptic(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* unsupported */
  }
}

/* ==========================================================================
   Procedural ambient music — calm chords, a melody built from a short motif
   (so each world has a tune you can recognise), a soft bass and, in the
   livelier worlds, light percussion. Each world has its own key, tempo and
   lead instrument. No audio files.
   ========================================================================== */
const THEMES = {
  home: { root: 261.63, minor: false, bpm: 72, lead: 'bell' }, // C
  daily: { root: 293.66, minor: false, bpm: 70, lead: 'bell' }, // D
  0: { root: 261.63, minor: false, bpm: 76, lead: 'pluck', perc: 1 }, // Pebble Beach — C
  1: { root: 329.63, minor: false, bpm: 70, lead: 'pluck' }, // Sunny Dunes — E
  2: { root: 220.0, minor: true, bpm: 80, lead: 'pluck', perc: 1 }, // Ember Canyon — A minor
  3: { root: 349.23, minor: false, bpm: 68, lead: 'soft' }, // Coral Reef — F
  4: { root: 246.94, minor: true, bpm: 66, lead: 'bell' }, // Violet Peaks — B minor
  5: { root: 392.0, minor: false, bpm: 62, lead: 'bell' }, // Glacier Bay — G
  6: { root: 293.66, minor: true, bpm: 74, lead: 'pluck' }, // Mossy Woods — D minor
  7: { root: 311.13, minor: false, bpm: 84, lead: 'square', perc: 1 }, // Neon City — E♭
  8: { root: 349.23, minor: false, bpm: 78, lead: 'pluck', perc: 1 }, // Arrow Gardens — F
  9: { root: 233.08, minor: true, bpm: 70, lead: 'soft' }, // Sunset Mesa — B♭ minor
  10: { root: 196.0, minor: true, bpm: 64, lead: 'soft' }, // Storm Lagoon — G minor
  11: { root: 415.3, minor: false, bpm: 58, lead: 'bell' }, // Starlight Summit — A♭
  12: { root: 277.18, minor: true, bpm: 66, lead: 'bell' }, // Echo Valley — C# minor
  13: { root: 369.99, minor: false, bpm: 74, lead: 'soft' }, // Floating Isles — F#
  14: { root: 207.65, minor: true, bpm: 88, lead: 'square', perc: 1 }, // Clockwork Caves — G# minor
  15: { root: 440.0, minor: false, bpm: 82, lead: 'bell', perc: 1 }, // Rainbow Rift — A
};
// Scale degrees in semitones; chord progressions as scale-degree roots.
const PENTA_MAJ = [0, 2, 4, 7, 9, 12, 14, 16];
const PENTA_MIN = [0, 3, 5, 7, 10, 12, 15, 17];
const PROG_MAJ = [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]]; // I vi IV V
const PROG_MIN = [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]]; // i VI III VII

let music = { on: false, wanted: false, theme: 'home', gain: null, delay: null, timer: 0, step: 0, next: 0, last: 2, motif: null, switching: 0 };
const semi = (root, n) => root * Math.pow(2, n / 12);

function applyMusicLevel(tc = 0.3) {
  if (!music.gain || !ctx) return;
  const target = music.on && !music.switching ? 0.85 * musicVolume * duckLevel : 0;
  music.gain.gain.cancelScheduledValues(ctx.currentTime);
  music.gain.gain.setTargetAtTime(target, ctx.currentTime, tc);
}

/** A short, theme-specific melody (scale indices, -1 = rest), stable for a given theme. */
function motifFor(key) {
  let h = 2166136261;
  for (const ch of `motif:${key}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
  const out = [];
  let at = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < 8; i++) {
    if (i > 0 && rnd() < 0.28) {
      out.push(-1);
      continue;
    }
    at = Math.max(0, Math.min(7, at + [-2, -1, 1, 1, 2, 0][Math.floor(rnd() * 6)]));
    out.push(at);
  }
  return out;
}

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
  fb.gain.value = 0.3;
  music.delay.connect(fb).connect(music.delay);
  music.delay.connect(lp);
  music.gain.connect(lp).connect(master);
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

function lead(c, th, freq, t, len) {
  switch (th.lead) {
    case 'bell':
      note(c, freq, t, len * 1.6, { gain: 0.03, attack: 0.005 });
      note(c, freq * 2.76, t, len * 0.5, { gain: 0.007, attack: 0.003 });
      break;
    case 'pluck':
      note(c, freq, t, len * 0.9, { type: 'triangle', gain: 0.034, attack: 0.004 });
      note(c, freq * 2, t, len * 0.3, { gain: 0.008, attack: 0.003 });
      break;
    case 'square':
      note(c, freq, t, len * 0.7, { type: 'square', gain: 0.011, attack: 0.006 });
      note(c, freq / 2, t, len * 0.7, { type: 'triangle', gain: 0.016, attack: 0.006 });
      break;
    default:
      note(c, freq, t, len, { gain: 0.03, attack: 0.03 });
  }
}

function shaker(c, t, gain) {
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 6500;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  src.connect(f).connect(g).connect(music.gain);
  src.start(t, Math.random() * 0.3);
  src.stop(t + 0.08);
}

function scheduler() {
  const c = ctx;
  if (!c || !music.on) return;
  const th = THEMES[music.theme] || THEMES.home;
  const eighth = 60 / th.bpm / 2;
  const scale = th.minor ? PENTA_MIN : PENTA_MAJ;
  const prog = th.minor ? PROG_MIN : PROG_MAJ;
  if (!music.motif) music.motif = motifFor(music.theme);
  while (music.next < c.currentTime + 0.3) {
    const t = music.next;
    const s = music.step;
    const bar = Math.floor(s / 8);
    const chord = prog[bar % 4];
    // Sections of 8 bars: intro (pads + bass), A (motif), B (free variation), A again...
    const section = Math.floor(bar / 8) % 4;
    if (s % 16 === 0) {
      // Pad: a soft chord every two bars.
      for (const n of chord) note(c, semi(th.root, n - 12), t, eighth * 16, { type: 'triangle', gain: 0.02, attack: 0.6 });
    }
    if (s % 8 === 0) note(c, semi(th.root, chord[0] - 24), t, eighth * 7, { gain: 0.05, attack: 0.05 });
    if (th.perc && section !== 0) {
      if (s % 8 === 0) note(c, 90, t, 0.18, { gain: 0.06, attack: 0.004 });
      if (s % 2 === 1) shaker(c, t, s % 4 === 3 ? 0.018 : 0.01);
    }
    if (section === 1 || section === 3) {
      // The motif, played twice per bar pair, an octave up on its second pass.
      const i = s % 16;
      if (i % 2 === 0) {
        const deg = music.motif[(i / 2) % 8];
        if (deg >= 0) lead(c, th, semi(th.root, scale[deg] + (bar % 4 === 3 ? 12 : 0)), t, eighth * 2);
        music.last = deg >= 0 ? deg : music.last;
      }
    } else if (section === 2 || bar > 1) {
      // Gentle random walk on the pentatonic scale, with rests.
      if (Math.random() < (s % 2 === 0 ? 0.6 : 0.25)) {
        music.last = Math.max(0, Math.min(scale.length - 1, music.last + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
        lead(c, th, semi(th.root, scale[music.last]), t, eighth * 2.2);
      }
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
  applyMusicLevel(1.2);
  music.timer = setInterval(scheduler, 100);
}

function stopMusic() {
  if (!music.on || !ctx) return;
  music.on = false;
  clearInterval(music.timer);
  applyMusicLevel(0.3);
}

/** Turn background music on/off (it only actually starts after a user gesture). */
export function setMusicEnabled(on) {
  music.wanted = on;
  if (on && ctx && ctx.state !== 'suspended' && !document.hidden) startMusic();
  if (!on) stopMusic();
}

/** Switch the musical theme (world index, 'home' or 'daily'), with a short crossfade. */
export function setMusicTheme(key) {
  const k = String(key);
  if (k === music.theme) return;
  if (!music.on || !ctx) {
    music.theme = k;
    music.motif = null;
    music.step = 0;
    return;
  }
  clearTimeout(music.switching);
  music.switching = setTimeout(() => {
    music.theme = k;
    music.motif = null;
    music.step = 0;
    music.next = Math.max(music.next, ctx.currentTime + 0.05);
    music.switching = 0;
    applyMusicLevel(0.5);
  }, 380);
  applyMusicLevel(0.12);
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

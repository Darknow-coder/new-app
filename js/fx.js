// Visual effects helpers: scenery, iris transitions, flying coins, number tweens.
// Everything animates transform/opacity only, so it stays smooth on phones.

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- animated scenery ---------- */
// Theme per world (index % 8) plus 'home' and 'daily'.
const THEMES = {
  home: { kind: 'orb', count: 7 },
  daily: { kind: 'twinkle', count: 22 },
  0: { kind: 'foam', count: 16 }, // Pebble Beach
  1: { kind: 'dust', count: 18 }, // Sunny Dunes
  2: { kind: 'ember', count: 22 }, // Ember Canyon
  3: { kind: 'bubble', count: 16 }, // Coral Reef
  4: { kind: 'twinkle', count: 26 }, // Violet Peaks
  5: { kind: 'snow', count: 26 }, // Glacier Bay
  6: { kind: 'leaf', count: 14 }, // Mossy Woods
  7: { kind: 'neon', count: 12 }, // Neon City
  8: { kind: 'leaf', count: 16 }, // Arrow Gardens
  9: { kind: 'dust', count: 18 }, // Sunset Mesa
  10: { kind: 'bubble', count: 20 }, // Storm Lagoon (rain)
  11: { kind: 'twinkle', count: 34 }, // Starlight Summit
  12: { kind: 'dust', count: 14 }, // Echo Valley
  13: { kind: 'foam', count: 14 }, // Floating Isles (clouds)
  14: { kind: 'ember', count: 16 }, // Clockwork Caves (sparks)
  15: { kind: 'twinkle', count: 28 }, // Rainbow Rift
};
const ORB_COLORS = ['var(--c0)', 'var(--c1)', 'var(--c2)', 'var(--c3)'];

/** Fill `host` (a .scenery element) with themed particles. Cheap to call repeatedly. */
export function buildScenery(host, themeKey, hue = 'var(--accent)') {
  const key = String(themeKey);
  if (host.dataset.theme === key) return;
  host.dataset.theme = key;
  host.style.setProperty('--hue', hue);
  const theme = THEMES[key] || THEMES.daily;
  const rnd = (a, b) => a + Math.random() * (b - a);
  let html = '<i class="glow g1"></i><i class="glow g2"></i>';
  for (let i = 0; i < theme.count; i++) {
    const style = [
      `left:${rnd(-5, 100).toFixed(1)}%`,
      `top:${rnd(-5, 100).toFixed(1)}%`,
      `--s:${rnd(0.5, 1.4).toFixed(2)}`,
      `--dur:${rnd(7, 16).toFixed(1)}s`,
      `--delay:${(-rnd(0, 16)).toFixed(1)}s`,
      `--drift:${rnd(-40, 40).toFixed(0)}px`,
      `--rot:${rnd(0, 360).toFixed(0)}deg`,
    ];
    if (theme.kind === 'orb') style.push(`--col:${ORB_COLORS[i % 4]}`);
    html += `<i class="sp sp-${theme.kind}" style="${style.join(';')}"></i>`;
  }
  host.innerHTML = html;
}

/* ---------- iris transition ---------- */
let irisBusy = false;
/** Close a coloured circle over the screen, run `swap`, then open it again. */
export function iris(swap, color = 'var(--accent)') {
  const el = document.getElementById('iris');
  if (reducedMotion() || irisBusy || !el) {
    swap();
    return;
  }
  irisBusy = true;
  el.style.setProperty('--iris', color);
  el.className = 'iris closing';
  setTimeout(() => {
    swap();
    el.className = 'iris opening';
    setTimeout(() => {
      el.className = 'iris';
      irisBusy = false;
    }, 420);
  }, 330);
}

/* ---------- number tween ---------- */
export function countTo(el, from, to, ms = 600, fmt = (v) => v) {
  if (reducedMotion() || from === to) {
    el.textContent = fmt(to);
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / ms);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(from + (to - from) * e));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- flying coins / icons ---------- */
/**
 * Fly `count` small icons from one element to another.
 * `layer` must be a container in the same stacking context (e.g. an open <dialog>, or document.body).
 */
export function flyIcons(fromEl, toEl, { count = 6, icon = 'i-coin', layer = document.body, onArrive } = {}) {
  if (!fromEl || !toEl) return;
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  const bx = b.left + b.width / 2;
  const by = b.top + b.height / 2;
  if (reducedMotion()) {
    onArrive?.(0);
    return;
  }
  for (let i = 0; i < count; i++) {
    const c = document.createElement('span');
    c.className = 'fly-icon';
    c.innerHTML = `<svg><use href="#${icon}"/></svg>`;
    c.style.left = `${ax}px`;
    c.style.top = `${ay}px`;
    layer.appendChild(c);
    const spread = 46;
    const mx = ax + (Math.random() - 0.5) * spread * 2;
    const my = ay + (Math.random() - 0.5) * spread * 2 - 20;
    const delay = i * 55;
    const anim = c.animate(
      [
        { transform: 'translate(-50%,-50%) scale(0.4)', opacity: 0 },
        { transform: `translate(calc(-50% + ${mx - ax}px), calc(-50% + ${my - ay}px)) scale(1.1)`, opacity: 1, offset: 0.35 },
        { transform: `translate(calc(-50% + ${bx - ax}px), calc(-50% + ${by - ay}px)) scale(0.7)`, opacity: 1 },
      ],
      { duration: 650, delay, easing: 'cubic-bezier(.5,0,.4,1)', fill: 'both' },
    );
    anim.onfinish = () => {
      c.remove();
      onArrive?.(i);
    };
  }
}

/** Little "+N" label that floats up from an element. */
export function floatText(el, text, layer = document.body) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const t = document.createElement('span');
  t.className = 'float-text';
  t.textContent = text;
  t.style.left = `${r.left + r.width / 2}px`;
  t.style.top = `${r.top}px`;
  layer.appendChild(t);
  setTimeout(() => t.remove(), 1000);
}

/**
 * Restart a CSS animation class on an element. No forced layout: reading offsetWidth
 * here used to cost a full layout of the page on every effect (100+ ms on slow phones).
 */
export function replay(el, cls) {
  if (!el) return;
  if (!el.classList.contains(cls)) {
    el.classList.add(cls);
    return;
  }
  el.classList.remove(cls);
  // Two frames: the removal must be rendered once for the animation to start over.
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add(cls)));
}

/** Burst of coloured particles inside `host` at (x%, y%) of the host. */
export function burst(host, x, y, { count = 14, colors = ['var(--c2)', '#fff'], dist = 90 } = {}) {
  if (reducedMotion()) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    p.className = 'burst-p';
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const r = dist * (0.5 + Math.random() * 0.7);
    p.style.left = `${x}%`;
    p.style.top = `${y}%`;
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--sx', `${Math.cos(ang) * r}px`);
    p.style.setProperty('--sy', `${Math.sin(ang) * r}px`);
    host.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

/* ---------- entrance choreography ---------- */
/**
 * Make matching elements rise in one after another. The class is removed when the
 * animation ends, so elements keep their own idle animations afterwards.
 */
export function stagger(root, selector, { step = 45, base = 0, cls = 'enter-rise' } = {}) {
  if (reducedMotion() || !root) return;
  const els = [...root.querySelectorAll(selector)].filter((el) => !el.hidden);
  if (!els.length) return;
  const start = () =>
    els.forEach((el, i) => {
      el.style.setProperty('--enter-delay', `${base + i * step}ms`);
      el.classList.add(cls);
      el.addEventListener('animationend', function done(e) {
        if (e.target !== el) return;
        el.classList.remove(cls);
        el.removeEventListener('animationend', done);
      });
    });
  // Usually the class is already gone (removed when the animation ended): start right away.
  // Otherwise remove it and restart two frames later, instead of forcing a full layout
  // (reading offsetWidth here cost 100+ ms per screen on slow phones).
  if (!els.some((el) => el.classList.contains(cls))) return start();
  for (const el of els) el.classList.remove(cls);
  requestAnimationFrame(() => requestAnimationFrame(start));
}

/* ---------- touch ripples on every button ---------- */
export function installRipples() {
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (reducedMotion()) return;
      const host = e.target.closest('button, .ripple-host');
      if (!host || host.disabled || host.classList.contains('no-ripple')) return;
      const r = host.getBoundingClientRect();
      const wrap = document.createElement('span');
      wrap.className = 'ripple-wrap';
      const dot = document.createElement('span');
      dot.className = 'ripple';
      const size = Math.max(r.width, r.height) * 2.2;
      dot.style.width = dot.style.height = `${size}px`;
      dot.style.left = `${e.clientX - r.left - size / 2}px`;
      dot.style.top = `${e.clientY - r.top - size / 2}px`;
      wrap.appendChild(dot);
      host.appendChild(wrap);
      setTimeout(() => wrap.remove(), 650);
    },
    { passive: true },
  );
}

/* ---------- lite mode for slow phones ---------- */
const LITE_KEY = 'marbl:lite';
/**
 * Turn off the costliest effects (backdrop blur, half the scenery particles) on phones
 * that can't keep up. Decided once from real frame times, then remembered.
 */
export function initLite() {
  const root = document.documentElement;
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(LITE_KEY));
  } catch {
    /* storage unavailable or old format */
  }
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) {
    root.classList.add('lite');
    return;
  }
  if (saved?.lite) root.classList.add('lite');
  // Re-measure once a week: a phone that was just busy at first launch shouldn't stay "lite".
  if (saved && Date.now() - saved.at < 7 * 864e5) return;
  // Sample ~2 s of frames shortly after start-up, while the home screen animates.
  setTimeout(() => {
    const dts = [];
    let last = performance.now();
    const tick = (t) => {
      dts.push(t - last);
      last = t;
      if (dts.length < 120 && !document.hidden) requestAnimationFrame(tick);
      else decide();
    };
    const decide = () => {
      if (dts.length < 60) return; // tab hidden: try again next launch
      dts.sort((a, b) => a - b);
      const median = dts[dts.length >> 1];
      const slow = median > 24;
      root.classList.toggle('lite', slow);
      try {
        localStorage.setItem(LITE_KEY, JSON.stringify({ lite: slow, at: Date.now() }));
      } catch {
        /* ignore */
      }
    };
    requestAnimationFrame(tick);
  }, 2500);
}

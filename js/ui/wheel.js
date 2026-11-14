// Lucky wheel: one free spin a day (plus an optional rewarded-ad spin when ads are on).
// Rewards are coins, boosters and chests; the odds favour small prizes.
import { t } from '../i18n.js';
import { save, store } from '../storage.js';
import { sfx } from '../audio.js';
import { burst, reducedMotion } from '../fx.js';
import { dateKey, msUntilTomorrow } from '../daily.js';
import { chestSVG } from '../chests.js';
import { rewardedLeft, showRewarded } from '../monetization.js';
import { $, buzz, fmtCountdown, openModal, toast, updateCoins } from './core.js';
import { openChestFlow } from './common.js';

export const WHEEL = [
  { kind: 'coins', n: 20, w: 26, col: '#ffcf3f' },
  { kind: 'hint', n: 1, w: 14, col: '#9a7bff' },
  { kind: 'coins', n: 40, w: 20, col: '#22c9b0' },
  { kind: 'rewind', n: 2, w: 12, col: '#ff8a5c' },
  { kind: 'coins', n: 100, w: 6, col: '#ff5d73' },
  { kind: 'freeze', n: 1, w: 8, col: '#5aaef0' },
  { kind: 'chest', tier: 'wood', w: 10, col: '#6cc85e' },
  { kind: 'chest', tier: 'silver', w: 4, col: '#c07bf0' },
];
const SEG = 360 / WHEEL.length;

const today = () => dateKey();
export const freeSpinReady = () => store.data.wheelDay !== today();

/** Weighted pick (rare prizes are rare). */
export function pickPrize(r = Math.random()) {
  const total = WHEEL.reduce((a, s) => a + s.w, 0);
  let x = r * total;
  for (let i = 0; i < WHEEL.length; i++) {
    x -= WHEEL[i].w;
    if (x < 0) return i;
  }
  return 0;
}

const prizeIcon = (s) =>
  s.kind === 'chest'
    ? `<span class="wp-chest">${chestSVG(s.tier)}</span>`
    : `<svg class="wp-ico ${s.kind}"><use href="#i-${s.kind === 'coins' ? 'coin' : s.kind}"/></svg><b>${s.kind === 'coins' ? s.n : `×${s.n}`}</b>`;

function buildDisc() {
  const disc = $('#wheel-disc');
  if (disc.dataset.built) return;
  disc.dataset.built = 1;
  const stops = WHEEL.map((s, i) => `${s.col} ${i * SEG}deg ${(i + 1) * SEG}deg`).join(',');
  disc.style.background = `conic-gradient(${stops})`;
  disc.innerHTML = WHEEL.map((s, i) => `<span class="wseg" style="--a:${i * SEG + SEG / 2}deg">${prizeIcon(s)}</span>`).join('') + WHEEL.map((s, i) => `<i class="wline" style="--a:${i * SEG}deg"></i>`).join('');
}

let angle = 0;
let spinning = false;

function renderButtons() {
  const free = freeSpinReady();
  const spin = $('#wheel-spin');
  spin.disabled = spinning || !free;
  spin.textContent = free ? t('wheelSpin') : t('wheelBack', { t: fmtCountdown(msUntilTomorrow()) });
  const ad = $('#wheel-ad');
  ad.hidden = free || !rewardedLeft('wheel');
  ad.disabled = spinning;
}

export function openWheel() {
  buildDisc();
  renderButtons();
  openModal('modal-wheel');
}

function grant(s) {
  if (s.kind === 'chest') {
    setTimeout(() => openChestFlow({ id: `wheel-${today()}-${Date.now()}`, tier: s.tier, title: t('wheelTitle') }), 500);
    return;
  }
  if (s.kind === 'coins') {
    store.addCoins(s.n);
    updateCoins(true);
  } else {
    store.booster(s.kind, s.n);
  }
  toast(t('wheelWon', { r: s.kind === 'coins' ? `${s.n} 🪙` : `${t(`${s.kind}Name`)} ×${s.n}` }));
}

async function spin(paid = false) {
  if (spinning) return;
  if (!paid) {
    if (!freeSpinReady()) return;
    store.data.wheelDay = today();
    save();
  }
  spinning = true;
  renderButtons();
  const i = pickPrize();
  const jitter = (Math.random() - 0.5) * SEG * 0.6;
  // Land segment i under the pointer at the top: rotate so its centre ends at 0°.
  const target = 360 - (i * SEG + SEG / 2) + jitter;
  const fast = reducedMotion();
  angle += (fast ? 360 : 360 * 5) + ((target - (angle % 360) + 360) % 360);
  const disc = $('#wheel-disc');
  const ms = fast ? 600 : 4200;
  disc.style.transition = `transform ${ms}ms cubic-bezier(0.15, 0.85, 0.25, 1)`;
  disc.style.transform = `rotate(${angle}deg)`;
  sfx.swish?.();
  // Ticks slow down with the wheel.
  if (!fast) for (let k = 0; k < 22; k++) setTimeout(() => sfx.tick(), ms * (1 - Math.pow(1 - k / 22, 0.45)) * 0.92);
  setTimeout(() => {
    spinning = false;
    const s = WHEEL[i];
    const wheel = $('#modal-wheel .wheel');
    sfx.coin();
    buzz([20, 40, 30]);
    burst(wheel, 50, 12, { count: 22, colors: [s.col, '#fff', 'var(--accent)'], dist: 110 });
    $('#wheel-prize').innerHTML = prizeIcon(s);
    $('#wheel-prize').classList.remove('show');
    void $('#wheel-prize').offsetWidth;
    $('#wheel-prize').classList.add('show');
    grant(s);
    renderButtons();
    renderWheelTile();
    // The shop may be open underneath: drop its free-spin card.
    document.querySelector('#modal-shop [data-free-wheel]')?.closest('.shop-cardlet')?.remove();
  }, ms + 80);
}

/** Home tile: glows with a badge while today's free spin waits. */
export function renderWheelTile() {
  const ready = freeSpinReady();
  $('#btn-wheel').classList.toggle('is-ready', ready);
  $('#wheel-badge').hidden = !ready;
}

$('#btn-wheel').addEventListener('click', () => {
  sfx.tap();
  openWheel();
});
$('#wheel-spin').addEventListener('click', () => spin(false));
$('#wheel-ad').addEventListener('click', async () => {
  if (spinning) return;
  if (await showRewarded('wheel')) spin(true);
  else renderButtons();
});
// Keep the countdown on the button fresh while the wheel is open.
setInterval(() => {
  if ($('#modal-wheel').open && !spinning) renderButtons();
}, 1000);

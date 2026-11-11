import { computeStats, store } from '../storage.js';
import { DAILY_ORDER, addDays, dailyLevel, puzzleNumber } from '../daily.js';
import { LANG, t } from '../i18n.js';
import { countTo } from '../fx.js';
import { $, DIFF_EMOJI, S, toast } from './core.js';
import { shareBase } from '../site.js';

export function shareText(key = S.today) {
  const stats = computeStats(S.today);
  const lines = [`Marbl #${puzzleNumber(key)}${stats.current > 1 ? ` 🔥${stats.current}` : ''}`];
  for (const d of DAILY_ORDER) {
    const e = store.dailyEntry(key, d);
    if (e?.done) {
      const par = e.par ?? dailyLevel(key, d).par;
      lines.push(`${DIFF_EMOJI[d]} ${'⭐'.repeat(e.stars)}${'▫️'.repeat(3 - e.stars)} ${e.moves}/${par}`);
    } else {
      lines.push(`${DIFF_EMOJI[d]} —`);
    }
  }
  lines.push(shareBase());
  return lines.join('\n');
}

export async function shareDay() {
  const text = shareText();
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ text });
      return;
    }
  } catch (e) {
    if (e?.name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast(t('copied'));
  } catch {
    // Last-resort fallback for older browsers / insecure contexts.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand && document.execCommand('copy');
    ta.remove();
    toast(ok ? t('copied') : t('shareFailed'));
  }
}

export function renderStats() {
  const s = computeStats(S.today);
  const items = [
    [s.played, 'statPlayed'],
    [s.current, 'statStreak'],
    [s.best, 'statBest'],
    [s.perfectDays, 'statPerfect'],
    [s.stars, 'statStars'],
    [s.levelReached, 'statLevel'],
  ];
  $('#stats-grid').innerHTML = items
    .map(([v, k]) => `<div class="stat"><b data-v="${v}">0</b><small>${t(k)}</small></div>`)
    .join('');
  setTimeout(() => {
    document.querySelectorAll('#stats-grid b').forEach((b, i) => setTimeout(() => countTo(b, 0, Number(b.dataset.v), 700), i * 60));
  }, 150);
  const wd = new Intl.DateTimeFormat(LANG, { weekday: 'narrow' });
  let week = '';
  for (let i = 6; i >= 0; i--) {
    const k = addDays(S.today, -i);
    const solved = DAILY_ORDER.filter((d) => store.dailyEntry(k, d)?.done).length;
    const [y, m, d] = k.split('-').map(Number);
    week += `<div class="day d${solved} ${i === 0 ? 'today' : ''}" title="${k}"><i></i>${wd.format(new Date(y, m - 1, d))}</div>`;
  }
  $('#stats-week').innerHTML = week;
}

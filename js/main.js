import './ui/core.js';
import './ui/common.js';
import './ui/home.js';
import './ui/game.js';
import './ui/result.js';
import './ui/mapview.js';
import './ui/progressui.js';
import './ui/collection.js';
import './ui/shop.js';
import './ui/settings.js';
import './ui/input.js';
import { openSharedLevel, openEditor } from './ui/editor.js';
import { openArchive } from './ui/archive.js';
import { openLeaderboard } from './ui/leaderboard-ui.js';
import { openFeedback } from './ui/feedback.js';
import { installSkinStyles } from './skins.js';
import { installRipples, reducedMotion } from './fx.js';
import { store } from './storage.js';
import { quests, season, track } from './progress.js';
import { openChest } from './chests.js';
import { $, S, applyStaticText, notify, showView } from './ui/core.js';
import { renderHome } from './ui/home.js';
import { challengeImage, hint, move, restart, rewind, startChallenge, startLevel, startTutorial, undo } from './ui/game.js';
import { openSeason } from './ui/progressui.js';
import { handleProgress } from './ui/common.js';
import { shareText } from './ui/settings.js';
import { openMap } from './ui/mapview.js';
import { openShop } from './ui/shop.js';

applyStaticText();

installSkinStyles();

installRipples();

renderHome();

// Cold-start splash: marbles drop in, then it lifts away.
const splash = $('#splash');

if (splash) {
  if (reducedMotion()) splash.remove();
  else {
    const hold = store.data.tutorialDone ? 900 : 1250;
    setTimeout(() => splash.classList.add('out'), hold);
    setTimeout(() => splash.remove(), hold + 600);
  }
}

const params = new URLSearchParams(location.search);

const chN = Number(params.get('defi'));

const chC = Number(params.get('c'));

const sharedLevel = params.get('l');
if (sharedLevel) {
  history.replaceState(null, '', location.pathname);
  showView('home');
  setTimeout(() => openSharedLevel(sharedLevel), 300);
} else if (chN >= 1 && chN <= 320 && chC >= 1 && chC <= 99) {
  history.replaceState(null, '', location.pathname);
  showView('home');
  setTimeout(() => startChallenge(chN, chC), 300);
} else if (!store.data.tutorialDone) {
  startTutorial(0);
} else {
  showView('home');
}

if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/localhost|127\.0\.0\.1/.test(location.hostname)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Debug hook for automated tests (harmless in production).
window.__marbl = { openFeedback, openLeaderboard, openArchive, openEditor, openSharedLevel, startChallenge, challengeImage, season, openSeason,
  track, handleProgress, notify, quests, get game() { return S.game; }, move, undo, restart, rewind, hint, shareText, store, startLevel, openMap, openShop, renderHome, openChest, setPendingUnlock: (n) => (S.pendingUnlock = n) };

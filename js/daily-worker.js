// Builds daily puzzles off the main thread (the generator + solver take ~0.5 s on a slow phone).
import { dailyLevel } from './daily.js';
import { encodeLevel } from './engine.js';

self.onmessage = (e) => {
  const { key, diff } = e.data;
  try {
    const l = dailyLevel(key, diff);
    self.postMessage({ key, diff, code: `${encodeLevel(l).join('/')}|${l.par}|${l.solution.join(',')}` });
  } catch (err) {
    self.postMessage({ key, diff, error: String(err.message || err) });
  }
};

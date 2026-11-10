// Runs the solver off the main thread (used by the level editor and shared levels).
import { parseLevel, solve } from './engine.js';

self.onmessage = (e) => {
  const { id, rows } = e.data;
  try {
    const level = parseLevel(rows, { par: 0, solution: [] });
    const info = {};
    const sol = solve(level, level.start, { maxDepth: 40, maxStates: 600000, info });
    self.postMessage({ id, par: sol ? sol.par : null, solution: sol ? sol.path : null, capped: !!info.capped });
  } catch (err) {
    self.postMessage({ id, error: String(err.message || err) });
  }
};

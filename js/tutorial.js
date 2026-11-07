import { parseLevel } from './engine.js';

// Hand-crafted onboarding: each level introduces exactly one idea.
export const TUTORIAL = [
  {
    tip: 'Swipe (or use the arrow keys) to tilt the board. Roll the marble into its hole.',
    rows: ['.....', '.....', 'A...a', '.....', '.....'],
  },
  {
    tip: 'Marbles roll until something stops them. Walls are your friends.',
    rows: ['a....', '.....', '..#..', '.....', '....A'],
  },
  {
    tip: 'Each marble only drops into the hole of its own colour. Everything rolls at once.',
    rows: ['A.#.b', '.....', '.....', '.....', 'a...B'],
  },
  {
    tip: 'Grey stones roll too but never sink. Use them as stoppers.',
    rows: ['A....', '.....', '..a..', 'S....', '#....'],
  },
].map((t) => ({ ...t, level: parseLevel(t.rows) }));

// Where the game officially lives. Share links (challenges, custom levels, daily
// results) always point here, even when the game runs inside an itch.io / game-portal
// iframe whose own address is temporary and not meant to be shared.
export const SITE_URL = 'https://darknow-coder.github.io/new-app/';

export function shareBase() {
  const h = location.hostname;
  if (h.endsWith('github.io') || /^(localhost|127\.0\.0\.1)$/.test(h)) {
    return location.origin + location.pathname.replace(/index\.html$/, '');
  }
  return SITE_URL;
}

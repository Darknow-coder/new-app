// Minimal canvas confetti — no dependencies, auto-stops, respects reduced motion.
const COLORS = ['#ff5d73', '#1fd1b9', '#ffc23d', '#9a7bff', '#ffffff'];

export function burstConfetti(canvas, count = 140) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const parts = Array.from({ length: count }, (_, i) => {
    const left = i % 2 === 0;
    return {
      x: left ? -10 : W + 10,
      y: H * (0.55 + Math.random() * 0.25),
      vx: (left ? 1 : -1) * (5 + Math.random() * 9),
      vy: -(9 + Math.random() * 11),
      r: 4 + Math.random() * 5,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: COLORS[i % COLORS.length],
      round: Math.random() < 0.35,
    };
  });
  const start = performance.now();
  function frame(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, W, H);
    const fade = Math.max(0, 1 - Math.max(0, elapsed - 1600) / 800);
    ctx.globalAlpha = fade;
    for (const p of parts) {
      p.vy += 0.38;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      }
      ctx.restore();
    }
    if (elapsed < 2400) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  }
  requestAnimationFrame(frame);
}

const slashes = [];
let canvas = null;
let ctx = null;
let rafId = null;

export function attachCanvas(canvasElement) {
  canvas = canvasElement;
  ctx = canvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}

export function detachCanvas() {
  window.removeEventListener("resize", resizeCanvas);
  cancelAnimationFrame(rafId);
  slashes.length = 0;
  ctx?.clearRect(0, 0, canvas.width, canvas.height);
}

export function triggerSlash({ angle = 0, intensity = 18 }) {
  if (!ctx || !canvas) return;
  const now = performance.now();
  const life = 500 + Math.min(intensity * 8, 800);
  slashes.push({
    angle,
    start: now,
    life,
    thickness: 6 + Math.min(intensity, 16) * 0.4,
    glow: 16 + intensity,
  });

  if (!rafId) {
    rafId = requestAnimationFrame(render);
  }
}

function render() {
  if (!ctx || !canvas) return;
  const now = performance.now();
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = slashes.length - 1; i >= 0; i -= 1) {
    const slash = slashes[i];
    const progress = (now - slash.start) / slash.life;
    if (progress >= 1) {
      slashes.splice(i, 1);
      continue;
    }

    const alpha = 1 - progress;
    drawSlash(slash, alpha);
  }

  if (slashes.length > 0) {
    rafId = requestAnimationFrame(render);
  } else {
    rafId = null;
  }
}

function drawSlash({ angle, thickness, glow }, alpha) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const len = Math.max(canvas.width, canvas.height) * 1.2;
  const dx = Math.cos(angle) * len;
  const dy = Math.sin(angle) * len;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const gradient = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
  gradient.addColorStop(0, `rgba(74, 227, 255, ${0.05 * alpha})`);
  gradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.65 * alpha})`);
  gradient.addColorStop(1, `rgba(74, 227, 255, ${0.05 * alpha})`);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = thickness;
  ctx.lineCap = "round";
  ctx.shadowColor = `rgba(74, 227, 255, ${0.45 * alpha})`;
  ctx.shadowBlur = glow;

  ctx.beginPath();
  ctx.moveTo(-len / 2, 0);
  ctx.lineTo(len / 2, 0);
  ctx.stroke();

  ctx.restore();
}

function resizeCanvas() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const { clientWidth, clientHeight } = canvas;
  canvas.width = clientWidth * dpr;
  canvas.height = clientHeight * dpr;
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }
}

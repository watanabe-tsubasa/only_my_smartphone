const DEFAULT_COLOR = { r: 180, g: 220, b: 255 };
const DEFAULT_LINE_WIDTH = 8;
const DEFAULT_FADE_DURATION = 450;

let canvasEl = null;
let ctx = null;
let animationFrameId = null;

function resizeCanvas() {
  if (!canvasEl || !ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvasEl.width = width * dpr;
  canvasEl.height = height * dpr;
  canvasEl.style.width = '100vw';
  canvasEl.style.height = '100vh';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function clearAnimationFrame() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function renderFade(startTimestamp, angleRad) {
  const duration = DEFAULT_FADE_DURATION;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const length = Math.hypot(width, height) * 1.2;

  function draw(timestamp) {
    const elapsed = timestamp - startTimestamp;
    const progress = Math.min(elapsed / duration, 1);
    const alpha = 1 - progress;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(angleRad);
    ctx.strokeStyle = `rgba(${DEFAULT_COLOR.r}, ${DEFAULT_COLOR.g}, ${DEFAULT_COLOR.b}, ${alpha})`;
    ctx.lineWidth = DEFAULT_LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-length, 0);
    ctx.lineTo(length, 0);
    ctx.stroke();
    ctx.restore();

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(draw);
    } else {
      animationFrameId = null;
      ctx.clearRect(0, 0, width, height);
    }
  }

  animationFrameId = requestAnimationFrame(draw);
}

/**
 * Initialize the slash canvas layer.
 */
export function setupSlashCanvas() {
  canvasEl = document.getElementById('slash-canvas');
  if (!canvasEl) return;

  ctx = canvasEl.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

/**
 * Draw a slash line that fades out.
 * @param {{ angle?: number }} detail
 */
export function renderSlash(detail = {}) {
  if (!ctx || !canvasEl) return;

  clearAnimationFrame();

  const angle = typeof detail.angle === 'number' ? detail.angle : 0;
  renderFade(performance.now(), angle);
}

/**
 * Handle a slash CustomEvent directly.
 * @param {CustomEvent} event
 */
export function handleSlashEvent(event) {
  renderSlash(event?.detail);
}

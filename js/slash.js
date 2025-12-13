const DEFAULT_FADE_DURATION = 350;
const BASE_LINE_WIDTH = 6;

/**
 * 画面全体に斬撃エフェクトを描画するレンダラー。
 * 斬撃イベントが発火した時のみ描画を開始し、時間経過でフェードアウトします。
 */
export class SlashRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fadeDuration = DEFAULT_FADE_DURATION;
    this.active = false;
    this.startTime = 0;
    this.angle = 0;

    this._boundRender = this._render.bind(this);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * レンダラーを現在のビューポートに合わせてリサイズします。
   */
  resize() {
    const { innerWidth, innerHeight, devicePixelRatio = 1 } = window;
    this.canvas.width = innerWidth * devicePixelRatio;
    this.canvas.height = innerHeight * devicePixelRatio;
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  /**
   * 斬撃イベントを受け取り、描画を開始します。
   * @param {number} [angleRad=0] - ラジアン角。0は右方向、Math.PI / 2 は下方向。
   */
  trigger(angleRad = 0) {
    this.angle = angleRad;
    this.startTime = performance.now();
    if (!this.active) {
      this.active = true;
      requestAnimationFrame(this._boundRender);
    }
  }

  _render(timestamp) {
    if (!this.active) return;

    const elapsed = timestamp - this.startTime;
    const progress = Math.min(elapsed / this.fadeDuration, 1);
    const alpha = 1 - progress;

    this._clear();

    if (alpha > 0) {
      this._drawSlashLine(alpha);
      requestAnimationFrame(this._boundRender);
    } else {
      this.active = false;
      this._clear();
    }
  }

  _clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _drawSlashLine(alpha) {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    const centerX = width / 2;
    const centerY = height / 2;

    const radius = Math.hypot(width, height);
    const dx = Math.cos(this.angle);
    const dy = Math.sin(this.angle);
    const x1 = centerX - dx * radius;
    const y1 = centerY - dy * radius;
    const x2 = centerX + dx * radius;
    const y2 = centerY + dy * radius;

    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.5, 'rgba(230, 245, 255, 0.9)');
    gradient.addColorStop(1, 'rgba(170, 215, 255, 0.9)');

    const thickness = BASE_LINE_WIDTH + Math.max(width, height) * 0.01;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(180, 220, 255, 0.7)';
    ctx.shadowBlur = Math.max(10, thickness * 0.8);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * SlashRenderer の簡易ファクトリー。
 * @param {HTMLCanvasElement} canvas
 * @returns {SlashRenderer}
 */
export function createSlashRenderer(canvas) {
  return new SlashRenderer(canvas);
}

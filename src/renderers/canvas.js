/**
 * SignalGraph — Canvas2D Renderer
 * 
 * High-performance rendering using Canvas2D. Handles DPR scaling,
 * smooth line rendering, and grid overlays.
 * 
 * Why Canvas over DOM: better for real-time data (high-frequency updates),
 * no layout thrashing, sub-pixel rendering, and easy gradient fills.
 * Why Canvas over WebGL: simpler, sufficient for 2D charts, better
 * browser support, no shader compilation.
 * 
 * Trade-off: Canvas pixelates at high zoom, no CSS transitions,
 * no accessibility tree participation (must add aria-label).
 */

const DEFAULTS = {
  padding: 16,
  lineColor: '#4f8cff',
  lineWidth: 2,
  gridColor: 'rgba(255,255,255,0.08)',
  bgColor: '#1a1a2e',
  textColor: 'rgba(255,255,255,0.6)',
  pointRadius: 3,
  fillGradient: true,
  animated: true,
};

export class CanvasRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;
  }

  get element() { return this.canvas; }

  mount(container, width, height) {
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Signal graph chart');
    this.ctx = this.canvas.getContext('2d');
    container.appendChild(this.canvas);
    this.resize(width, height);
  }

  unmount() {
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(data, opts = {}) {
    if (!this.ctx || data.length < 2) return;
    const ctx = this.ctx;
    const o = { ...DEFAULTS, ...opts };
    const { width, height } = this;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = o.bgColor;
    ctx.fillRect(0, 0, width, height);

    const p = o.padding;
    const plotW = width - 2 * p;
    const plotH = height - 2 * p;

    // Compute data bounds
    let min = data[0], max = data[0];
    for (let i = 1; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    const range = max - min || 1;

    // Map data to pixel coords
    const points = data.map((val, i) => ({
      x: p + (i / (data.length - 1)) * plotW,
      y: p + (1 - (val - min) / range) * plotH,
    }));

    // Grid lines (horizontal)
    ctx.strokeStyle = o.gridColor;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = p + (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(p, y);
      ctx.lineTo(p + plotW, y);
      ctx.stroke();

      // Y-axis labels
      const label = (max - (i / 4) * range).toFixed(1);
      ctx.fillStyle = o.textColor;
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(label, p - 4, y + 4);
    }

    // Filled area under line (gradient)
    if (o.fillGradient) {
      const grad = ctx.createLinearGradient(0, p, 0, p + plotH);
      grad.addColorStop(0, o.lineColor + '40');
      grad.addColorStop(1, o.lineColor + '00');
      ctx.beginPath();
      ctx.moveTo(points[0].x, p + plotH);
      for (const pt of points) ctx.lineTo(pt.x, pt.y);
      ctx.lineTo(points[points.length - 1].x, p + plotH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Line
    ctx.strokeStyle = o.lineColor;
    ctx.lineWidth = o.lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      i === 0 ? ctx.moveTo(points[i].x, points[i].y) : ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Data points
    if (points.length <= 60) {
      ctx.fillStyle = o.lineColor;
      for (const pt of points) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, o.pointRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

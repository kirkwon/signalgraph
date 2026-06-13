/**
 * SignalGraph — DOM Renderer
 * 
 * Pure-DOM rendering using divs and CSS transforms. Demonstrates
 * platform-level understanding by using the browser's own layout
 * engine for rendering — no canvas, no SVG, just positioned elements.
 * 
 * This is deliberately the least practical renderer but the most
 * instructive: it shows that rendering is just *data transformation*
 * at the platform level. Canvas draws pixels, SVG emits vectors,
 * DOM positions boxes — the abstraction is the same.
 * 
 * Use case: when you need CSS transitions, text selection,
 * or native browser form participation in your chart.
 */

const DEFAULTS = {
  padding: 16,
  lineColor: '#4f8cff',
  lineWidth: 2,
  gridColor: 'rgba(255,255,255,0.08)',
  bgColor: '#1a1a2e',
  textColor: 'rgba(255,255,255,0.6)',
  pointRadius: 3,
};

export class DOMRenderer {
  constructor() {
    this.root = null;
    this.width = 0;
    this.height = 0;
    this._lineEl = null;
    this._dotsEl = null;
  }

  get element() { return this.root; }

  mount(container, width, height) {
    this.root = document.createElement('div');
    this.root.style.position = 'relative';
    this.root.style.overflow = 'hidden';
    this.root.setAttribute('role', 'img');
    this.root.setAttribute('aria-label', 'Signal graph chart');
    container.appendChild(this.root);
    this.resize(width, height);
  }

  unmount() {
    this.root?.remove();
    this.root = null;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    if (!this.root) return;
    this.root.style.width = width + 'px';
    this.root.style.height = height + 'px';
  }

  render(data, opts = {}) {
    if (!this.root || data.length < 2) return;
    const o = { ...DEFAULTS, ...opts };
    const { width, height } = this;
    const root = this.root;

    // Clear
    root.innerHTML = '';
    root.style.background = o.bgColor;

    const p = o.padding;
    const plotW = width - 2 * p;
    const plotH = height - 2 * p;

    let min = data[0], max = data[0];
    for (let i = 1; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    const range = max - min || 1;

    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const y = p + (i / 4) * plotH;
      const grid = document.createElement('div');
      grid.style.cssText = `
        position:absolute;left:${p}px;top:${y}px;width:${plotW}px;height:0.5px;
        background:${o.gridColor};
      `;
      root.appendChild(grid);

      const label = document.createElement('span');
      label.style.cssText = `
        position:absolute;right:calc(100% - ${p - 4}px);top:${y - 4}px;
        font:10px monospace;color:${o.textColor};
      `;
      label.textContent = (max - (i / 4) * range).toFixed(1);
      root.appendChild(label);
    }

    // Build points
    const points = data.map((val, i) => ({
      x: p + (i / (data.length - 1)) * plotW,
      y: p + (1 - (val - min) / range) * plotH,
    }));

    // Line segments using positioned spans
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;inset:0;pointer-events:none;';

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      const seg = document.createElement('div');
      seg.style.cssText = `
        position:absolute;
        left:${a.x}px;top:${a.y}px;
        width:${len}px;height:${o.lineWidth}px;
        background:${o.lineColor};
        transform-origin:0 50%;
        transform:rotate(${angle}deg);
        border-radius:${o.lineWidth / 2}px;
      `;
      container.appendChild(seg);
    }

    // Data dots
    if (points.length <= 60) {
      for (const pt of points) {
        const dot = document.createElement('div');
        dot.style.cssText = `
          position:absolute;
          left:${pt.x - o.pointRadius}px;top:${pt.y - o.pointRadius}px;
          width:${o.pointRadius * 2}px;height:${o.pointRadius * 2}px;
          border-radius:50%;
          background:${o.lineColor};
        `;
        container.appendChild(dot);
      }
    }

    root.appendChild(container);
  }
}

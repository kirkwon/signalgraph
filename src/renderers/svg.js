/**
 * SignalGraph — SVG Renderer
 * 
 * Vector-based rendering using SVG. Better for accessibility, 
 * infinite zoom, CSS animations, and server-side rendering.
 * 
 * Trade-off vs Canvas: higher DOM overhead with >1000 points,
 * no access to pixel-level operations, no WebGL fallback.
 * SVG wins when data < 500 points and accessibility matters.
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
};

export class SVGRenderer {
  constructor() {
    this.svg = null;
    this.width = 0;
    this.height = 0;

    // Bind render for use as signal effect callback
    this.render = this.render.bind(this);
  }

  get element() { return this.svg; }

  mount(container, width, height) {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('aria-label', 'Signal graph chart');
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    container.appendChild(this.svg);
    this.resize(width, height);
  }

  unmount() {
    this.svg?.remove();
    this.svg = null;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    if (!this.svg) return;
    this.svg.setAttribute('width', width);
    this.svg.setAttribute('height', height);
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  render(data, opts = {}) {
    if (!this.svg || data.length < 2) return;
    const o = { ...DEFAULTS, ...opts };
    const { width, height } = this;
    const svg = this.svg;

    // Clear — remove all children
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const p = o.padding;
    const plotW = width - 2 * p;
    const plotH = height - 2 * p;

    // Background rect
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', width);
    bg.setAttribute('height', height);
    bg.setAttribute('fill', o.bgColor);
    svg.appendChild(bg);

    // Bounds
    let min = data[0], max = data[0];
    for (let i = 1; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    const range = max - min || 1;

    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const y = p + (i / 4) * plotH;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', p);
      line.setAttribute('y1', y);
      line.setAttribute('x2', p + plotW);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', o.gridColor);
      line.setAttribute('stroke-width', '0.5');
      svg.appendChild(line);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', p - 4);
      label.setAttribute('y', y + 4);
      label.setAttribute('fill', o.textColor);
      label.setAttribute('font-size', '10');
      label.setAttribute('font-family', 'monospace');
      label.setAttribute('text-anchor', 'end');
      label.textContent = (max - (i / 4) * range).toFixed(1);
      svg.appendChild(label);
    }

    // Build path data
    const points = data.map((val, i) => ({
      x: p + (i / (data.length - 1)) * plotW,
      y: p + (1 - (val - min) / range) * plotH,
    }));

    // Area fill
    if (o.fillGradient) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      grad.setAttribute('id', 'sg-fill');
      grad.setAttribute('x1', '0');
      grad.setAttribute('y1', '0');
      grad.setAttribute('x2', '0');
      grad.setAttribute('y2', '1');
      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', o.lineColor);
      stop1.setAttribute('stop-opacity', '0.25');
      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', o.lineColor);
      stop2.setAttribute('stop-opacity', '0');
      grad.appendChild(stop1);
      grad.appendChild(stop2);
      defs.appendChild(grad);
      svg.appendChild(defs);

      const areaD = ['M', points[0].x, p + plotH]
        .concat(points.flatMap(pt => ['L', pt.x, pt.y]))
        .concat(['L', points[points.length - 1].x, p + plotH, 'Z'])
        .join(' ');

      const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      area.setAttribute('d', areaD);
      area.setAttribute('fill', 'url(#sg-fill)');
      svg.appendChild(area);
    }

    // Line path
    const lineD = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', lineD);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', o.lineColor);
    path.setAttribute('stroke-width', o.lineWidth);
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-linecap', 'round');
    svg.appendChild(path);

    // Data points (only for small datasets)
    if (points.length <= 60) {
      for (const pt of points) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', pt.x);
        circle.setAttribute('cy', pt.y);
        circle.setAttribute('r', o.pointRadius);
        circle.setAttribute('fill', o.lineColor);
        svg.appendChild(circle);
      }
    }
  }
}

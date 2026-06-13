/**
 * SignalGraph — <signal-graph> Web Component
 * 
 * A reactive charting custom element built on platform primitives:
 *   - Custom Elements v1 (autonomous, not customized built-in)
 *   - Shadow DOM (closed mode — demonstrates encapsulation)
 *   - AdoptedStyleSheets (constructable stylesheets)
 *   - CSS Custom Properties for theming (platform-level API design)
 *   - ResizeObserver for responsive sizing
 *   - Reactive signals for internal state management
 * 
 * Architecture:
 *   <signal-graph>
 *     │
 *     ├── Shadow root (closed)
 *     │   ├── <style> (adopted stylesheet — shared across instances)
 *     │   └── <div class="container"> (renderer mounts here)
 *     │
 *     ├── Reactive state (signals, not class properties)
 *     │   ├── data signal        — current data array
 *     │   ├── renderer signal     — active renderer instance
 *     │   ├── options signal      — merged options (attrs + CSS custom props)
 *     │   └── dimensions signal   — width/height from ResizeObserver
 *     │
 *     └── Effect (re-renders when any signal changes)
 * 
 * No dependencies. ~250 lines. Runs in any modern browser.
 */

import { signal, computed, effect } from '../core/signal.js';
import { CanvasRenderer } from '../renderers/canvas.js';
import { SVGRenderer } from '../renderers/svg.js';
import { DOMRenderer } from '../renderers/dom.js';

const STYLESHEET = new CSSStyleSheet();
STYLESHEET.replaceSync(`
  :host {
    display: inline-block;
    width: 400px;
    height: 240px;
    contain: layout style paint;
    --sg-line-color: #4f8cff;
    --sg-grid-color: rgba(255,255,255,0.08);
    --sg-bg-color: #1a1a2e;
    --sg-text-color: rgba(255,255,255,0.6);
    --sg-line-width: 2;
  }

  .container {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--sg-text-color);
    font-family: system-ui, sans-serif;
    font-size: 14px;
  }

  canvas, svg {
    display: block;
  }
`);

const RENDERER_MAP = {
  canvas: CanvasRenderer,
  svg: SVGRenderer,
  dom: DOMRenderer,
};

export class SignalGraph extends HTMLElement {
  static observedAttributes = ['data', 'renderer', 'line-color', 'grid-color', 'bg-color'];

  constructor() {
    super();
    this._rendererInstance = null;

    // Closed shadow root — truly encapsulated
    this._shadow = this.attachShadow({ mode: 'closed' });
    this._shadow.adoptedStyleSheets = [STYLESHEET];

    // Container for renderer
    this._container = document.createElement('div');
    this._container.className = 'container';
    this._shadow.appendChild(this._container);

    // Reactive state
    this._data = signal([]);
    this._renderer = signal('canvas');
    this._options = signal({});

    // Computed dimensions
    this._width = signal(400);
    this._height = signal(240);

    // Effect: re-render when any relevant signal changes
    this._dispose = effect(() => {
      const data = this._data[0]();
      const rendererName = this._renderer[0]();
      const opts = this._options[0]();
      const w = this._width[0]();
      const h = this._height[0]();

      this._mountRenderer(rendererName);
      if (this._rendererInstance) {
        this._rendererInstance.resize(w, h);
        this._rendererInstance.render(data, opts);
      }
    });

    // ResizeObserver for responsive sizing
    this._resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0) this._width[1](Math.round(width));
      if (height > 0) this._height[1](Math.round(height));
    });
    this._resizeObserver.observe(this);
  }

  // ── Attribute Reflection ──────────────────────────────────────

  get data() { return this._data[0](); }
  set data(val) {
    const arr = Array.isArray(val) ? val : [];
    this._data[1](arr);
  }

  get renderer() { return this._renderer[0](); }
  set renderer(val) {
    if (RENDERER_MAP[val]) {
      this._renderer[1](val);
      this.setAttribute('renderer', val);
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;

    switch (name) {
      case 'data':
        try { this.data = JSON.parse(newVal); } catch { /* ignore */ }
        break;
      case 'renderer':
        if (newVal && RENDERER_MAP[newVal]) this._renderer[1](newVal);
        break;
      case 'line-color':
        this._updateOptions();
        break;
      case 'grid-color':
        this._updateOptions();
        break;
      case 'bg-color':
        this._updateOptions();
        break;
    }
  }

  connectedCallback() {
    this._readThemeFromCSS();
    this._updateOptions();
  }

  disconnectedCallback() {
    this._dispose?.();
    this._resizeObserver?.disconnect();
    this._unmountRenderer();
  }

  // ── Private ────────────────────────────────────────────────────

  _readThemeFromCSS() {
    const style = getComputedStyle(this);
    this._options[1]({
      lineColor: style.getPropertyValue('--sg-line-color').trim() || '#4f8cff',
      gridColor: style.getPropertyValue('--sg-grid-color').trim() || 'rgba(255,255,255,0.08)',
      bgColor: style.getPropertyValue('--sg-bg-color').trim() || '#1a1a2e',
      textColor: style.getPropertyValue('--sg-text-color').trim() || 'rgba(255,255,255,0.6)',
      lineWidth: parseFloat(style.getPropertyValue('--sg-line-width')) || 2,
    });
  }

  _updateOptions() {
    const current = this._options[0]();
    this._options[1]({
      ...current,
      lineColor: this.getAttribute('line-color') || current.lineColor,
      gridColor: this.getAttribute('grid-color') || current.gridColor,
      bgColor: this.getAttribute('bg-color') || current.bgColor,
    });
  }

  _mountRenderer(name) {
    if (this._rendererInstance) {
      const currentName = this._rendererInstance.constructor.name
        .replace('Renderer', '').toLowerCase();
      if (currentName === name) return; // Already mounted
      this._unmountRenderer();
    }

    const RendererClass = RENDERER_MAP[name];
    if (!RendererClass) {
      this._container.innerHTML = `<div class="fallback">Unknown renderer: ${name}</div>`;
      return;
    }

    this._rendererInstance = new RendererClass();
    this._rendererInstance.mount(
      this._container,
      this._width[0](),
      this._height[0]()
    );
  }

  _unmountRenderer() {
    this._rendererInstance?.unmount();
    this._rendererInstance = null;
  }
}

// Register
customElements.define('signal-graph', SignalGraph);

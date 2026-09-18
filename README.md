# SignalGraph

**Reactive data visualization — built on Web Components, zero dependencies.**

A framework-independent charting component that demonstrates deep browser platform knowledge: reactive signals from scratch, swappable rendering backends, Shadow DOM encapsulation, and a CSS custom properties theming API.

[Live Demo](https://kirkwon.github.io/signalgraph/) | [Why Signals Beat VDOM](docs/why-signals-beat-vdom.md) | [Shadow DOM Pitfalls](docs/shadow-dom-pitfalls.md)

---

## What This Demonstrates

| Skill | Evidence |
|-------|----------|
| **Browser fundamentals** | Reactive signal system (dependency tracking, glitch-free updates); ResizeObserver for responsive sizing; microtask timing for batching |
| **Web Components depth** | Custom Elements v1 lifecycle (`connectedCallback`, `attributeChangedCallback`, `disconnectedCallback`); Shadow DOM (closed mode); AdoptedStyleSheets; constructable stylesheets |
| **Platform abstractions** | Renderer interface decoupled from component — swap Canvas/SVG/DOM without touching the element |
| **Framework independence** | 0 dependencies, ~500 lines ES modules; runs in any modern browser via `<script type="module">` |
| **Library familiarity** | Pattern similar to Lit's reactive properties + Solid.js signals — built from scratch to prove fundamentals |

---

## Quick Start

```html
<script type="module" src="src/components/signal-graph.js"></script>

<signal-graph data="[10, 25, 45, 30, 50, 35]" renderer="canvas"></signal-graph>

<script>
  const graph = document.querySelector('signal-graph');
  graph.data = [3.1, 4.2, 5.9, 2.6, 1.8];
  graph.renderer = 'svg';
</script>
```

## Architecture

```
signal-graph (Custom Element)
├── Reactive core (src/core/)
│   ├── signal()       — Tracked getter/setter
│   ├── computed()     — Lazy derived values
│   └── effect()       — Auto-reacting side effects
├── Renderers (src/renderers/)
│   ├── base.js        — Abstract interface contract
│   ├── canvas.js      — Canvas2D (high-frequency, sub-pixel)
│   ├── svg.js         — SVG (vectors, accessibility)
│   └── dom.js         — Pure DOM (CSS transitions, learning tool)
├── Component (src/components/)
│   └── signal-graph.js — Custom Element + Shadow DOM
└── Styling
    └── CSS Custom Properties — platform-level theming API
```

## Renderer Comparison

| Renderer | Best For | Trade-off |
|----------|----------|-----------|
| Canvas | Real-time data, many points | No text selection, DPR scaling |
| SVG | Static/data viz, accessibility | DOM overhead at 1000+ points |
| DOM | Learning, CSS transitions | Most expensive for large data |

## Theming

```css
signal-graph {
  --sg-line-color: #6fcf97;
  --sg-bg-color: #1a1a2e;
  --sg-grid-color: rgba(255,255,255,0.05);
  --sg-line-width: 2;
}
```

CSS custom properties are the only CSS that crosses Shadow DOM boundaries — making them the correct platform primitive for component theming APIs.

---

## Project Structure

```
signalgraph/
├── index.html              — Interactive demo
├── src/
│   ├── core/
│   │   └── signal.js       — Reactive signal system
│   ├── renderers/
│   │   ├── base.js         — Renderer interface
│   │   ├── canvas.js       — Canvas2D backend
│   │   ├── svg.js          — SVG backend
│   │   └── dom.js          — DOM backend
│   └── components/
│       └── signal-graph.js — Web Component
└── docs/
    ├── why-signals-beat-vdom.md       — Technical essay
    └── shadow-dom-pitfalls.md         — Production reality
```

## No Build Step

```
git clone ...
open index.html      ← Works. That's it.
```

No npm install. No webpack. No vite. No node_modules. The component is ES modules loaded directly by the browser. This is intentional — it proves the code depends on nothing but the platform.

---

*Built to demonstrate Web Components fundamentals, reactive systems design, and platform-level abstraction thinking. Not a production charting library — a proof of depth.*

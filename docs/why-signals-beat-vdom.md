# Why Signals Beat Virtual DOM for UI

*A technical comparison of granular reactivity vs. VDOM reconciliation, from first principles.*

---

## The Core Difference

Both signals and virtual DOM solve the same problem: **how to update the UI when state changes.** But they approach it from opposite directions.

**Virtual DOM** (React): "Render everything, diff the result, patch the differences." You call a function that returns the entire UI tree, the framework diffs it against the last tree, and applies only the changed DOM operations.

**Signals** (Solid, Preact Signals, Vue 3, SignalGraph): "Track exactly what depends on what, update only those things." Each piece of state knows exactly which DOM nodes or effects depend on it. When state changes, only the precise dependent code re-runs.

These aren't just different implementations — they're different *complexity classes*.

---

## Why VDOM Has a Floor Cost

A React component re-render does:

1. **Re-execute the entire component function** — all JSX, all expressions
2. **Create a new VDOM tree** — allocate objects for every node
3. **Diff against previous tree** — compare every node pair
4. **Commit DOM changes** — apply the minimal mutation set

Steps 1-3 happen *even if nothing changed*. React doesn't know whether anything changed until it runs the function and diffs. This means even a trivial update to a single text node re-executes the entire parent component tree.

The cost floor of a VDOM re-render is O(n) where n = number of VDOM nodes in the subtree. For a list of 10,000 items changing one cell, React diffs all 10,000.

React's bailout mechanisms (`React.memo`, `useMemo`, `useCallback`) are manual optimizations to *avoid* this work. They work by short-circuiting before the render — which is effectively building a manual dependency graph.

---

## Why Signals Have No Floor Cost

A signal-based update does:

1. **Write a value** to a signal
2. **Notify subscribers** — iterate a set of effect callbacks
3. **Run only the effects** that read that signal

That's it. The cost is O(1) per subscriber — not O(n) per tree size. There is no diff. There is no tree walk. There is no "render all children to see if anything changed."

A signal update that affects one `<span>` text node does exactly: (a) set the value, (b) call the effect that sets `textContent`, (c) done. The other 9,999 list items don't execute anything.

**This is not an optimization.** This is the *default behavior*. You don't add `memo` to opt in — you have to actively opt out by putting effects in the wrong scope.

---

## The Compilation Question

Signals don't require a compiler. Solid.js uses one, but Vue 3's `ref()` and Preact Signals run in plain JS. SignalGraph's implementation runs in any browser with no build step.

But signals benefit enormously from a compiler: the compiler can *elide the wrapper entirely* for first-level bindings, turning `count()` into just `count` in the template. This is a perf optimization, not a correctness requirement.

VDOM, by contrast, fundamentally requires a compiler or a runtime template parser. You cannot JSX without a build step. This is why React's template syntax (`createElement`) is JS — it has to be.

---

## When VDOM Wins

VDOM has one genuine strength: **you don't need to think about granularity.** You write `<App />`, everything renders, it all works. Signals force you to think about where effects attach — the mental model is "this signal feeds this DOM node," not "this function returns this tree."

This matters for:
- **Rapid prototyping** — render the whole page, worry about perf later
- **Teams where junior engineers outnumber senior** — signals' precision can become fragility
- **Server rendering** — VDOM trees serialize naturally; signals' subscription graph does not (though this is a solved problem via serialization)

For any application where performance matters and the team understands reactivity, signals are strictly superior.

---

## The Benchmark That Matters

The [JS Framework Benchmark](https://krausest.github.io/js-framework-benchmark/) tests three operations:

| Operation | React (VDOM) | Solid (Signals) | Ratio |
|-----------|-------------|-----------------|-------|
| Create 10k rows | 2x slower | 1x | 2:1 |
| Partial update | 10x slower | 1x | 10:1 |
| Select row | 5x slower | 1x | 5:1 |

The partial update is the important one — it's the common case (editing a cell, updating a chart, ticking a counter). Signals win by an order of magnitude because they don't touch the 99.9% of the page that didn't change.

---

## The Takeaway

Signals don't beat VDOM because they're "more optimized." They beat VDOM because the problem they solve — "update exactly what changed" — has a lower computational floor than the problem VDOM solves — "render everything and diff."

If you're building framework-independent components (like SignalGraph), signals let you embed reactivity with zero-dependency overhead that VDOM cannot match. The component carries its own dependency graph, knows exactly what to update, and never needs to ask "what changed?" — it already knows.

— *Built from scratch in SignalGraph: ~100 lines of JS, no libraries, no build step, production-ready signal semantics.*


/**
 * SignalGraph — Reactive Signal System
 * 
 * Dependency-tracked reactive values, zero dependencies.
 * 
 * Architecture:
 *   signal(value)    → [read, write] — tracked getter + setter pair
 *   computed(fn)     → read — lazy derived value, cached until deps change
 *   effect(fn)       → disposer — runs fn, re-runs when deps change
 *   batch(fn)        → groups writes, runs effects once at end
 * 
 * The tracking mechanism uses a global "observing" pointer.
 * When a signal is read inside an effect or computed, the
 * effect registers itself as a subscriber. When the signal
 * is written, all subscribers are scheduled.
 * 
 * This is essentially the same mechanism as Solid.js, Preact Signals,
 * and Vue 3 — implemented from scratch to demonstrate fundamentals.
 */

let batchDepth = 0;
const pendingEffects = new Set();

/**
 * Track the currently executing effect/computed.
 * Set before fn runs, cleared after.
 */
let currentObserver = null;

/**
 * Create a reactive signal.
 * @param {*} initial - Initial value
 * @returns {[Function, Function]} [read, write]
 */
export function signal(initial) {
  let value = initial;
  // Each signal has a Set of Sets: each subscriber has its own Set
  // that this signal is added to, enabling O(1) cleanup.
  const subscribers = new Set();

  function read() {
    if (currentObserver) {
      // Register current observer as subscriber
      subscribers.add(currentObserver);
      // Let the observer know it depends on this signal
      currentObserver.deps.add(subscribers);
    }
    return value;
  }

  function write(next) {
    if (typeof next === 'function') {
      next = next(value);
    }
    if (Object.is(value, next)) return;
    value = next;

    // Notify all subscribers
    if (batchDepth > 0) {
      for (const sub of subscribers) pendingEffects.add(sub);
    } else {
      for (const sub of [...subscribers]) {
        if (typeof sub.execute === 'function') sub.execute();
        else sub();
      }
    }
  }

  return [read, write];
}

/**
 * Create a derived value that updates lazily.
 * Only recomputes when read AND a dependency has changed.
 * @param {Function} fn - Pure function that uses signals
 * @returns {Function} - Getter for the computed value
 */
export function computed(fn) {
  let value;
  let dirty = true;
  const dependents = new Set(); // effects/computeds that depend on this computed

  function read() {
    if (dirty) {
      const prev = currentObserver;
      currentObserver = { deps: dependents, execute: markDirty };
      try {
        value = fn();
        dirty = false;
      } finally {
        currentObserver = prev;
      }
    }
    if (currentObserver) {
      dependents.add(currentObserver);
      currentObserver.deps.add(dependents);
    }
    return value;
  }

  function markDirty() {
    dirty = true;
    for (const dep of [...dependents]) {
      if (batchDepth > 0) pendingEffects.add(dep);
      else dep.execute();
    }
  }

  // Run once to establish initial dependencies
  const prev = currentObserver;
  currentObserver = { deps: dependents, execute: markDirty };
  try {
    value = fn();
    dirty = false;
  } finally {
    currentObserver = prev;
  }

  return read;
}

/**
 * Run a function that may read signals, and re-run it
 * whenever those signals change. Returns a cleanup/dispose function.
 * @param {Function} fn - May return a cleanup function
 * @returns {Function} dispose
 */
export function effect(fn) {
  let cleanup;
  const deps = new Set(); // Set of subscriber Sets this effect belongs to

  function execute() {
    // Unsubscribe from all current dependencies
    for (const depSet of deps) depSet.delete(this);
    deps.clear();

    // Run cleanup from previous execution
    if (typeof cleanup === 'function') cleanup();

    // Re-run with tracking
    const prev = currentObserver;
    currentObserver = { deps, execute };
    try {
      cleanup = fn() || undefined;
    } finally {
      currentObserver = prev;
    }
  }

  // First run
  execute();

  return function dispose() {
    for (const depSet of deps) depSet.delete(execute);
    deps.clear();
    if (typeof cleanup === 'function') cleanup();
  };
}

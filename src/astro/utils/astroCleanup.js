export function createCleanupBag() {
  return { items: [], listeners: [], intervals: [] };
}

export function addDisposable(cleanupBag, item) {
  if (cleanupBag && item) cleanupBag.items.push(item);
  return item;
}

export function addEventListenerCleanup(cleanupBag, target, event, handler, options) {
  target?.addEventListener?.(event, handler, options);
  cleanupBag?.listeners.push({ target, event, handler, options });
}

export function addIntervalCleanup(cleanupBag, intervalId) {
  if (cleanupBag && intervalId != null) cleanupBag.intervals.push(intervalId);
}

export function cleanupAll(cleanupBag) {
  if (!cleanupBag) return;
  cleanupBag.listeners.forEach(({ target, event, handler, options }) => {
    target?.removeEventListener?.(event, handler, options);
  });
  cleanupBag.intervals.forEach(id => clearInterval(id));
  cleanupBag.items.forEach(item => {
    try {
      item.stop?.();
      item.dispose?.();
      item.remove?.();
    } catch (_) {}
  });
  cleanupBag.listeners = [];
  cleanupBag.intervals = [];
  cleanupBag.items = [];
}

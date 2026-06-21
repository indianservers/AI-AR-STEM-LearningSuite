export function createSkyCleanupBag() {
  return { disposables: new Set(), events: [], intervals: [], timeouts: [], subscriptions: [] };
}

export function addSkyDisposable(cleanupBag, item) {
  if (item) cleanupBag.disposables.add(item);
  return item;
}

export function addSkyEventCleanup(cleanupBag, target, eventName, handler, options) {
  target?.addEventListener?.(eventName, handler, options);
  cleanupBag.events.push(() => target?.removeEventListener?.(eventName, handler, options));
}

export const addSkyIntervalCleanup = (cleanupBag, intervalId) => cleanupBag.intervals.push(intervalId);
export const addSkyTimeoutCleanup = (cleanupBag, timeoutId) => cleanupBag.timeouts.push(timeoutId);
export const addSkySubscriptionCleanup = (cleanupBag, unsubscribe) => cleanupBag.subscriptions.push(unsubscribe);

export function cleanupSkyBag(cleanupBag) {
  cleanupBag.events.splice(0).forEach(fn => { try { fn(); } catch (_) {} });
  cleanupBag.subscriptions.splice(0).forEach(fn => { try { fn(); } catch (_) {} });
  cleanupBag.intervals.splice(0).forEach(id => clearInterval(id));
  cleanupBag.timeouts.splice(0).forEach(id => clearTimeout(id));
  cleanupBag.disposables.forEach(item => {
    try {
      item.stop?.();
      item.dispose?.();
    } catch (_) {}
  });
  cleanupBag.disposables.clear();
}

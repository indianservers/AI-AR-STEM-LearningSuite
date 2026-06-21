export function createRealtimeClock(callback, intervalMs) {
  const id = setInterval(() => callback(new Date()), intervalMs);
  callback(new Date());
  return id;
}

export function stopRealtimeClock(clockId) {
  if (clockId) clearInterval(clockId);
}

export function parseDateTimeInput(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function formatDateTimeForInput(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatSkyTime(date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
}

export const addHours = (date, hours) => new Date(date.getTime() + hours * 3600000);
export const addDays = (date, days) => new Date(date.getTime() + days * 86400000);

export function stepTime(date, amount, unit) {
  if (unit === 'hour') return addHours(date, amount);
  if (unit === 'day') return addDays(date, amount);
  if (unit === 'minute') return new Date(date.getTime() + amount * 60000);
  return new Date(date);
}

export function createTimeTravelController(state, callbacks = {}) {
  let timer = null;
  let speed = state.timeSpeed || 1;
  return {
    setTimeSpeed(nextSpeed) { speed = nextSpeed; callbacks.onSpeed?.(speed); },
    startTimeAnimation(nextSpeed = speed) {
      speed = nextSpeed;
      this.stopTimeAnimation();
      timer = setInterval(() => callbacks.onTick?.(speed), 1000);
      callbacks.onStart?.(speed);
      return timer;
    },
    stopTimeAnimation() {
      if (timer) clearInterval(timer);
      timer = null;
      callbacks.onStop?.();
    },
    get timer() { return timer; },
  };
}

export const setTimeSpeed = speed => Number(speed) || 1;
export const startTimeAnimation = (callback, speed = 10) => setInterval(() => callback(speed), 1000);
export const stopTimeAnimation = timer => clearInterval(timer);
export const formatTimeTravelLabel = (date, speed = 1) => `${formatSkyTime(date)} (${speed}x)`;

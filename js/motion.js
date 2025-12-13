const DEFAULT_THRESHOLD = 12; // m/s^2 equivalent, tunable after real-world measurement
const SLASH_EVENT_NAME = 'slash';

let lastAcceleration = null;
let isTracking = false;
let threshold = DEFAULT_THRESHOLD;
let dispatchTarget = typeof window !== 'undefined' ? window : null;

/**
 * Request permission for motion sensors when supported (e.g., iOS Safari).
 * @returns {Promise<'granted' | 'denied' | 'default'>}
 */
export function requestMotionPermission() {
  if (
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function'
  ) {
    return DeviceMotionEvent.requestPermission();
  }
  return Promise.resolve('granted');
}

/**
 * Begin listening for device motion events and dispatch slash events when
 * the acceleration delta crosses the configured threshold.
 * @param {object} [options]
 * @param {number} [options.threshold] - Minimum magnitude delta to trigger a slash.
 * @param {EventTarget} [options.target] - Dispatch target for slash events (defaults to window).
 */
export function startMotionTracking(options = {}) {
  if (isTracking) return;

  threshold = typeof options.threshold === 'number' ? options.threshold : DEFAULT_THRESHOLD;
  dispatchTarget = options.target || dispatchTarget || window;
  window.addEventListener('devicemotion', handleMotion, { passive: true });
  isTracking = true;
}

/**
 * Stop listening for device motion events and clear cached values.
 */
export function stopMotionTracking() {
  if (!isTracking) return;
  window.removeEventListener('devicemotion', handleMotion);
  isTracking = false;
  lastAcceleration = null;
}

function handleMotion(event) {
  const current = extractAcceleration(event);
  if (!current) return;

  if (!lastAcceleration) {
    lastAcceleration = current;
    return;
  }

  const dx = current.x - lastAcceleration.x;
  const dy = current.y - lastAcceleration.y;
  const dz = current.z - lastAcceleration.z;
  const magnitude = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);

  lastAcceleration = current;

  if (magnitude < threshold) return;

  const angle = Math.atan2(dy, dx);
  const direction = directionFromAngle(angle);

  dispatchTarget?.dispatchEvent(
    new CustomEvent(SLASH_EVENT_NAME, {
      detail: { angle, direction, magnitude, delta: { dx, dy, dz }, timestamp: event.timeStamp },
    })
  );
}

function extractAcceleration(event) {
  const accel = event.acceleration || event.accelerationIncludingGravity;
  if (!accel) return null;
  const { x, y, z } = accel;
  if ([x, y, z].some((value) => typeof value !== 'number')) return null;
  return { x, y, z };
}

function directionFromAngle(angleRad) {
  const deg = (angleRad * 180) / Math.PI;
  const normalized = (deg + 360) % 360;

  if (normalized >= 337.5 || normalized < 22.5) return 'right';
  if (normalized >= 22.5 && normalized < 67.5) return 'up-right';
  if (normalized >= 67.5 && normalized < 112.5) return 'up';
  if (normalized >= 112.5 && normalized < 157.5) return 'up-left';
  if (normalized >= 157.5 && normalized < 202.5) return 'left';
  if (normalized >= 202.5 && normalized < 247.5) return 'down-left';
  if (normalized >= 247.5 && normalized < 292.5) return 'down';
  return 'down-right';
}

export const slashEventName = SLASH_EVENT_NAME;

/**
 * Utility: derive the angle (radians) and categorical direction from dx/dy deltas.
 * @param {number} dx
 * @param {number} dy
 * @returns {{ angle: number, direction: string }}
 */
export function getDirectionFromDelta(dx, dy) {
  const angle = Math.atan2(dy, dx);
  return { angle, direction: directionFromAngle(angle) };
}

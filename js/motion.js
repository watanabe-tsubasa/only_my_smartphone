const DEFAULT_THRESHOLD = 12; // m/s^2 equivalent, tunable after real-world measurement
const SLASH_EVENT_NAME = 'slash';

let lastAcceleration = null;
let isTracking = false;
let threshold = DEFAULT_THRESHOLD;
let dispatchTarget = typeof window !== 'undefined' ? window : null;
let timeoutId = null;
let onTimeout = null;
let timeoutMs = 2500;

const UNSUPPORTED_REASON = 'unsupported';
const NO_EVENTS_REASON = 'no-events';

/**
 * Check whether DeviceMotion is available on this browser/OS.
 * @returns {{ supported: boolean; permissionRequired: boolean; reason?: string }}
 */
export function getMotionSupportInfo() {
  const hasDeviceMotionEvent = typeof DeviceMotionEvent !== 'undefined';
  const permissionRequired = hasDeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function';

  return {
    supported: hasDeviceMotionEvent,
    permissionRequired,
    reason: hasDeviceMotionEvent ? undefined : UNSUPPORTED_REASON,
  };
}

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
 * @param {number} [options.timeoutMs] - Duration to wait for the first event before triggering onTimeout.
 * @param {(info: { reason: string; timeoutMs: number }) => void} [options.onTimeout] - Callback invoked when no motion events arrive.
 */
export function startMotionTracking(options = {}) {
  const support = getMotionSupportInfo();
  if (!support.supported) {
    return { started: false, reason: UNSUPPORTED_REASON };
  }
  if (isTracking) return { started: true };

  threshold = typeof options.threshold === 'number' ? options.threshold : DEFAULT_THRESHOLD;
  dispatchTarget = options.target || dispatchTarget || window;
  timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 2500;
  onTimeout = typeof options.onTimeout === 'function' ? options.onTimeout : null;
  clearTimeout(timeoutId);
  timeoutId = window.setTimeout(() => {
    onTimeout?.({ reason: NO_EVENTS_REASON, timeoutMs });
  }, timeoutMs);
  window.addEventListener('devicemotion', handleMotion, { passive: true });
  isTracking = true;
  return { started: true };
}

/**
 * Stop listening for device motion events and clear cached values.
 */
export function stopMotionTracking() {
  if (!isTracking) return;
  window.removeEventListener('devicemotion', handleMotion);
  clearTimeout(timeoutId);
  timeoutId = null;
  isTracking = false;
  lastAcceleration = null;
}

function handleMotion(event) {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

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
export const motionFailureReasons = {
  UNSUPPORTED: UNSUPPORTED_REASON,
  NO_EVENTS: NO_EVENTS_REASON,
};

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

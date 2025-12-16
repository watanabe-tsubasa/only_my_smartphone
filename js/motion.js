const DEFAULT_THRESHOLD = 9.5; // m/s^2 equivalent, tuned from real-world measurement
const SLASH_EVENT_NAME = 'slash';

let lastAcceleration = null;
let isTracking = false;
let threshold = DEFAULT_THRESHOLD;
let dispatchTarget = typeof window !== 'undefined' ? window : null;
let timeoutId = null;
let onTimeout = null;
let timeoutMs = 2500;
let onDelta = null;

const UNSUPPORTED_REASON = 'unsupported';
const NO_EVENTS_REASON = 'no-events';
const SENSOR_PERMISSION_NAMES = ['accelerometer', 'gyroscope', 'magnetometer', 'ambient-light-sensor'];

/**
 * Check whether DeviceMotion is available on this browser/OS.
 * @returns {{ supported: boolean; permissionRequired: boolean; reason?: string }}
 */
export function getMotionSupportInfo() {
  const hasDeviceMotionEvent = typeof DeviceMotionEvent !== 'undefined';
  const motionPermissionSupported =
    hasDeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function';
  const orientationPermissionSupported =
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function';
  const permissionRequired = hasDeviceMotionEvent && (motionPermissionSupported || orientationPermissionSupported);

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
  return (async () => {
    const permissionRequesters = [];
    const sensorPermission = await checkSensorPermissionState();
    if (sensorPermission === 'denied') return 'denied';

    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function'
    ) {
      permissionRequesters.push(() => DeviceMotionEvent.requestPermission());
    }

    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      permissionRequesters.push(() => DeviceOrientationEvent.requestPermission());
    }

    if (permissionRequesters.length === 0) {
      return 'granted';
    }

    for (const requester of permissionRequesters) {
      try {
        const result = await requester();
        if (result === 'granted' || result === 'denied') return result;
      } catch (error) {
        console.warn('Motion permission request failed', error);
        return 'denied';
      }
    }

    return 'default';
  })();
}

async function checkSensorPermissionState() {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return null;

  for (const name of SENSOR_PERMISSION_NAMES) {
    try {
      const result = await navigator.permissions.query({ name });
      if (result?.state === 'denied') return 'denied';
    } catch (error) {
      // Ignore unsupported descriptors and continue checking others.
    }
  }

  return null;
}

/**
 * Begin listening for device motion events and dispatch slash events when
 * the acceleration delta crosses the configured threshold.
 * @param {object} [options]
 * @param {number} [options.threshold] - Minimum magnitude delta to trigger a slash.
 * @param {EventTarget} [options.target] - Dispatch target for slash events (defaults to window).
 * @param {number} [options.timeoutMs] - Duration to wait for the first event before triggering onTimeout.
 * @param {(info: { reason: string; timeoutMs: number }) => void} [options.onTimeout] - Callback invoked when no motion events arrive.
 * @param {(delta: { dx: number; dy: number; dz: number; magnitude: number; timestamp: number }) => void} [options.onDelta] - Callback invoked on each motion event with delta magnitude.
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
  onDelta = typeof options.onDelta === 'function' ? options.onDelta : null;
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
  onDelta = null;
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

  onDelta?.({ dx, dy, dz, magnitude, timestamp: event.timeStamp });

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

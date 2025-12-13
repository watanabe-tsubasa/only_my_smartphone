const MOTION_THRESHOLD = 14;
const COOL_DOWN_MS = 800;

let lastVector = null;
let lastTrigger = 0;
let handler = null;

export function isIOS() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
}

export async function requestMotionPermission() {
  if (typeof DeviceMotionEvent === "undefined") {
    throw new Error("DeviceMotionEvent がサポートされていません。");
  }

  if (typeof DeviceMotionEvent.requestPermission === "function") {
    const response = await DeviceMotionEvent.requestPermission();
    if (response !== "granted") {
      throw new Error("モーションの許可が得られませんでした。");
    }
  }
}

export function startMotionMonitoring(onSlash) {
  stopMotionMonitoring();

  handler = (event) => {
    const { accelerationIncludingGravity: acc } = event;
    if (!acc) return;

    const now = Date.now();
    const current = {
      x: acc.x ?? 0,
      y: acc.y ?? 0,
      z: acc.z ?? 0,
    };

    if (lastVector) {
      const dx = current.x - lastVector.x;
      const dy = current.y - lastVector.y;
      const dz = current.z - lastVector.z;
      const magnitude = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (magnitude > MOTION_THRESHOLD && now - lastTrigger > COOL_DOWN_MS) {
        lastTrigger = now;
        const angle = Math.atan2(dy, dx);
        onSlash({ angle, intensity: Math.min(magnitude, 30) });
      }
    }

    lastVector = current;
  };

  window.addEventListener("devicemotion", handler, { passive: true });
}

export function stopMotionMonitoring() {
  if (handler) {
    window.removeEventListener("devicemotion", handler);
  }
  handler = null;
  lastVector = null;
}

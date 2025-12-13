function formatNumber(value) {
  if (typeof value !== 'number') return '-';
  return value.toFixed(2);
}

function updateStatus(element, message, type = 'info') {
  element.textContent = message;
  element.dataset.type = type;
}

function handleMotion(event, accelEl) {
  const { accelerationIncludingGravity } = event;
  if (!accelerationIncludingGravity) return;

  const x = formatNumber(accelerationIncludingGravity.x);
  const y = formatNumber(accelerationIncludingGravity.y);
  const z = formatNumber(accelerationIncludingGravity.z);
  accelEl.textContent = `x: ${x}, y: ${y}, z: ${z}`;
}

function handleOrientation(event, orientationEl) {
  const { alpha, beta, gamma } = event;
  orientationEl.textContent = `alpha: ${formatNumber(alpha)} / beta: ${formatNumber(beta)} / gamma: ${formatNumber(gamma)}`;
}

async function requestPermissionIfNeeded() {
  const hasPermissionMethod = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';
  if (!hasPermissionMethod) return true;

  try {
    const result = await DeviceMotionEvent.requestPermission();
    return result === 'granted';
  } catch (error) {
    console.error('Motion permission error:', error);
    return false;
  }
}

export function initMotion({
  accelEl,
  orientationEl,
  statusEl,
  enableButton
}) {
  const onMotion = (event) => handleMotion(event, accelEl);
  const onOrientation = (event) => handleOrientation(event, orientationEl);

  enableButton.addEventListener('click', async () => {
    if (!('DeviceMotionEvent' in window) || !('DeviceOrientationEvent' in window)) {
      updateStatus(statusEl, 'モーション API に対応していません。', 'error');
      return;
    }

    updateStatus(statusEl, '許可を確認しています…');
    const allowed = await requestPermissionIfNeeded();
    if (!allowed) {
      updateStatus(statusEl, 'センサー利用が許可されませんでした。', 'error');
      return;
    }

    updateStatus(statusEl, '計測中');
    window.addEventListener('devicemotion', onMotion);
    window.addEventListener('deviceorientation', onOrientation);
    enableButton.disabled = true;
  });

  return {
    stop() {
      window.removeEventListener('devicemotion', onMotion);
      window.removeEventListener('deviceorientation', onOrientation);
      enableButton.disabled = false;
      updateStatus(statusEl, '停止中');
    }
  };
}

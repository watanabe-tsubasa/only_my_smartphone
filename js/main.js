import { startCamera } from './camera.js';
import { requestMotionPermission, startMotionTracking, slashEventName, stopMotionTracking } from './motion.js';
import { renderSlash, setupSlashCanvas } from './slash.js';

const statusText = document.getElementById('status');
const toggleButton = document.getElementById('toggle-motion');

function updateStatus(message) {
  if (statusText) {
    statusText.textContent = message;
  }
}

async function handleMotionToggle() {
  if (!toggleButton) return;

  if (toggleButton.dataset.active === 'true') {
    stopMotionTracking();
    toggleButton.dataset.active = 'false';
    toggleButton.textContent = '加速度検知を開始';
    updateStatus('加速度検知は停止中');
    return;
  }

  const permission = await requestMotionPermission();
  if (permission !== 'granted') {
    updateStatus('加速度センサーの許可が必要です');
    return;
  }

  startMotionTracking();
  toggleButton.dataset.active = 'true';
  toggleButton.textContent = '加速度検知を停止';
  updateStatus('加速度検知中');
}

function handleSlash(event) {
  const { direction, magnitude } = event.detail;
  updateStatus(`斬撃: ${direction} (Δ=${magnitude.toFixed(2)})`);
  renderSlash(event.detail);
}

document.addEventListener('DOMContentLoaded', async () => {
  await startCamera();
  setupSlashCanvas();

  toggleButton?.addEventListener('click', handleMotionToggle);
  window.addEventListener(slashEventName, handleSlash);

  updateStatus('加速度検知は停止中');
});

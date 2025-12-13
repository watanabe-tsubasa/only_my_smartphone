import { startCamera, stopCamera } from './camera.js';
import { requestMotionPermission, startMotionTracking, slashEventName, stopMotionTracking } from './motion.js';
import { renderSlash, setupSlashCanvas } from './slash.js';

const statusText = document.getElementById('status');
const toggleButton = document.getElementById('toggle-motion');
const slashAudio = document.getElementById('slash-audio');
const thresholdRange = document.getElementById('threshold-range');
const thresholdInput = document.getElementById('threshold-input');
const thresholdDisplay = document.getElementById('threshold-display');
const httpsNotice = document.getElementById('https-notice');
const motionPermissionHint = document.getElementById('motion-permission-hint');

const STORAGE_KEY_THRESHOLD = 'slash-threshold';
const DEFAULT_THRESHOLD = 12;

let audioInitialized = false;

function updateStatus(message) {
  if (statusText) {
    statusText.textContent = message;
  }
}

function showMotionHint(message) {
  if (!motionPermissionHint) return;
  motionPermissionHint.textContent = message;
  motionPermissionHint.hidden = false;
}

function hideMotionHint() {
  if (!motionPermissionHint) return;
  motionPermissionHint.hidden = true;
}

function loadStoredThreshold() {
  const stored = localStorage.getItem(STORAGE_KEY_THRESHOLD);
  const value = stored !== null ? Number.parseFloat(stored) : NaN;
  return Number.isFinite(value) ? value : null;
}

function persistThreshold(value) {
  if (!Number.isFinite(value)) return;
  localStorage.setItem(STORAGE_KEY_THRESHOLD, String(value));
}

function getThresholdValue() {
  if (!thresholdInput) return undefined;
  const value = Number.parseFloat(thresholdInput.value);
  return Number.isFinite(value) ? value : undefined;
}

function syncThresholdDisplay(value) {
  if (thresholdDisplay) {
    thresholdDisplay.textContent = Number.isFinite(value) ? `${value.toFixed(1)} Δ` : '--';
  }
}

function syncThresholdInputs(value) {
  if (!Number.isFinite(value)) return;
  if (thresholdRange) thresholdRange.value = value;
  if (thresholdInput) thresholdInput.value = value;
  syncThresholdDisplay(value);
}

async function initializeAudio() {
  if (audioInitialized || !slashAudio) return true;

  if (!slashAudio.getAttribute('src')) {
    updateStatus('音声ファイルが設定されていません。assets/slash.mp3 を配置してください。');
    return false;
  }

  try {
    slashAudio.load();
    const playPromise = slashAudio.play();

    if (playPromise instanceof Promise) {
      await playPromise;
    }

    slashAudio.pause();
    slashAudio.currentTime = 0;
    audioInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize audio', error);
    updateStatus('音声初期化に失敗しました。端末の設定を確認してください。');
    return false;
  }
}

function playSlashSound(magnitude = 0) {
  if (!audioInitialized || !slashAudio) return;

  const normalized = Math.min(Math.max(magnitude / 20, 0), 1);
  slashAudio.volume = Math.min(1, 0.35 + normalized * 0.55);
  slashAudio.currentTime = 0;

  try {
    const playPromise = slashAudio.play();
    if (playPromise instanceof Promise) {
      playPromise.catch((error) => {
        console.error('Failed to play slash sound', error);
        updateStatus('音声再生に失敗しました。ミュート設定を確認してください。');
      });
    }
  } catch (error) {
    console.error('Failed to play slash sound', error);
    updateStatus('音声再生に失敗しました。ミュート設定を確認してください。');
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

  await initializeAudio();
  const permission = await requestMotionPermission();
  if (permission !== 'granted') {
    updateStatus('加速度センサーの許可が必要です。許可後に再度ボタンを押してください。');
    showMotionHint(
      'iOS Safari では画面に触れるなどのユーザー操作が必要です。許可ダイアログが表示されたら許可してから「加速度検知を開始」を再度押してください。'
    );
    return;
  }

  const threshold = getThresholdValue();
  startMotionTracking({ threshold });
  toggleButton.dataset.active = 'true';
  toggleButton.textContent = '加速度検知を停止';
  updateStatus('加速度検知中');
  hideMotionHint();
}

function handleSlash(event) {
  const { direction, magnitude } = event.detail;
  updateStatus(`斬撃: ${direction} (Δ=${magnitude.toFixed(2)})`);
  renderSlash(event.detail);
  playSlashSound(magnitude);
}

document.addEventListener('DOMContentLoaded', async () => {
  await startCamera();
  setupSlashCanvas();

  if (
    httpsNotice &&
    location.protocol !== 'https:' &&
    location.hostname !== 'localhost' &&
    location.hostname !== '127.0.0.1'
  ) {
    httpsNotice.hidden = false;
  }

  const initialThreshold = loadStoredThreshold() ?? DEFAULT_THRESHOLD;
  syncThresholdInputs(initialThreshold);

  thresholdRange?.addEventListener('input', (event) => {
    const value = Number.parseFloat(event.target.value);
    if (!Number.isFinite(value)) return;
    thresholdInput.value = value;
    syncThresholdDisplay(value);
    persistThreshold(value);
  });

  thresholdInput?.addEventListener('input', (event) => {
    const value = Number.parseFloat(event.target.value);
    if (!Number.isFinite(value)) return;
    thresholdRange.value = value;
    syncThresholdDisplay(value);
    persistThreshold(value);
  });

  toggleButton?.addEventListener('click', handleMotionToggle);
  window.addEventListener(slashEventName, handleSlash);

  window.addEventListener('beforeunload', stopCamera);
  window.addEventListener('pagehide', stopCamera);

  updateStatus('加速度検知は停止中');
});

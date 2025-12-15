import { startCamera, stopCamera } from './camera.js';
import {
  getMotionSupportInfo,
  motionFailureReasons,
  requestMotionPermission,
  startMotionTracking,
  slashEventName,
  stopMotionTracking,
} from './motion.js';
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

  const support = getMotionSupportInfo();
  if (!support.supported) {
    updateStatus('この端末は加速度センサーに対応していません。');
    showMotionHint('センサー非搭載の端末では利用できません。別の端末やブラウザでお試しください。');
    return;
  }

  await initializeAudio();
  const permission = await requestMotionPermission();
  if (permission !== 'granted') {
    updateStatus('加速度センサーの許可が必要です。');
    showMotionHint(`ブラウザやOSの設定でモーション／加速度センサーの利用を許可してください。iOS Safari では画面に触れるなどの操作後に表示される許可ダイアログを承認し、「モーションと画面の向きにアクセス」をオンにしてください。許可後に「加速度検知を開始」を押してください。`);
    return;
  }

  const threshold = getThresholdValue();
  const { started, reason } = startMotionTracking({
    threshold,
    timeoutMs: 3000,
    onTimeout: handleMotionTimeout,
  });

  if (!started) {
    if (reason === motionFailureReasons.UNSUPPORTED) {
      updateStatus('加速度センサーに対応していないため開始できません。');
      showMotionHint('端末がセンサーに対応していないか、ブラウザがブロックしています。別の環境でお試しください。');
    }
    return;
  }

  toggleButton.dataset.active = 'true';
  toggleButton.textContent = '加速度検知を停止';
  updateStatus('加速度検知中。端末を軽く振って反応を確認してください。');
  hideMotionHint();
}

function handleMotionTimeout({ timeoutMs } = {}) {
  stopMotionTracking();
  if (toggleButton) {
    toggleButton.dataset.active = 'false';
    toggleButton.textContent = '加速度検知を開始';
  }
  updateStatus('加速度イベントを受信できませんでした。センサーがブロックされている可能性があります。');
  showMotionHint(`ブラウザの設定で「モーションと方向」や「加速度センサー」を許可してから再試行してください。必要に応じてページを再読み込みし、再度「加速度検知を開始」を押してください（待ち時間目安: ${timeoutMs ?? 0}ms）。`);
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

  document.addEventListener('visibilitychange', () => {
    const isActive = toggleButton?.dataset.active === 'true';

    if (document.hidden) {
      stopMotionTracking();
      if (isActive) {
        updateStatus('加速度検知は停止中');
      }
      return;
    }

    if (isActive) {
      const threshold = getThresholdValue();
      startMotionTracking({
        threshold,
        timeoutMs: 3000,
        onTimeout: handleMotionTimeout,
      });
      updateStatus('加速度検知中');
    }
  });

  window.addEventListener('beforeunload', stopCamera);
  window.addEventListener('pagehide', stopCamera);
  window.addEventListener('beforeunload', stopMotionTracking);
  window.addEventListener('pagehide', stopMotionTracking);

  updateStatus('加速度検知は停止中');
});

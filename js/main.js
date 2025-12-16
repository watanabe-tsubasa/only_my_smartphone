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
const magnitudeDisplay = document.getElementById('magnitude-display');
const permissionDisplay = document.getElementById('permission-display');
const motionStateDisplay = document.getElementById('motion-state-display');
const deltaXDisplay = document.getElementById('delta-x');
const deltaYDisplay = document.getElementById('delta-y');
const deltaZDisplay = document.getElementById('delta-z');
const deltaMagnitudeDisplay = document.getElementById('delta-magnitude');
const deltaTimestampDisplay = document.getElementById('delta-timestamp');
const httpsNotice = document.getElementById('https-notice');
const motionPermissionHint = document.getElementById('motion-permission-hint');

const STORAGE_KEY_THRESHOLD = 'slash-threshold';
const DEFAULT_THRESHOLD = 9.5;

let audioInitialized = false;
let audioEnabled = true;
let lastMotionDelta = null;
let motionState = '未確認';

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

function showPermissionGuidance(permissionState = 'default') {
  if (permissionState === 'denied') {
    showMotionHint(
      'ブラウザやOSの設定でモーションセンサーが無効化されています。iOSでは設定アプリ > Safari から「モーションと画面の向きにアクセス」をオンにし、Chrome系ではブラウザの設定 > サイトの設定 > 「モーションセンサー」や「モーションと方向」を許可してください。設定変更後にページを再読み込みし、「加速度検知を開始」を押してください。'
    );
    return;
  }

  showMotionHint(
    'この機能にはモーション／加速度センサーの許可が必要です。画面をタップするなど操作してから表示される許可ダイアログを承認してください。ダイアログが出ない場合は、設定アプリやブラウザのサイト設定で「モーションと画面の向き」「モーションセンサー」を有効にしてから再度「加速度検知を開始」を押してください。'
  );
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

function syncMagnitudeDisplay(value) {
  if (!magnitudeDisplay) return;
  magnitudeDisplay.textContent = Number.isFinite(value) ? `${value.toFixed(2)} Δ` : '--';
}

function updatePermissionDisplay(state) {
  if (!permissionDisplay) return;
  permissionDisplay.textContent = state;
}

function updateMotionState(state) {
  motionState = state;
  if (!motionStateDisplay) return;
  motionStateDisplay.textContent = state;
}

function formatDelta(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '--';
}

function formatTimestamp(timestamp) {
  if (!Number.isFinite(timestamp)) return '--';
  const wallClock = new Date(performance.timeOrigin + timestamp);
  return wallClock.toLocaleTimeString('ja-JP', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 2,
  });
}

function renderMotionOverlay(delta) {
  if (!deltaXDisplay || !deltaYDisplay || !deltaZDisplay || !deltaMagnitudeDisplay || !deltaTimestampDisplay) return;

  const { dx, dy, dz, magnitude, timestamp } = delta ?? {};
  deltaXDisplay.textContent = formatDelta(dx);
  deltaYDisplay.textContent = formatDelta(dy);
  deltaZDisplay.textContent = formatDelta(dz);
  deltaMagnitudeDisplay.textContent = Number.isFinite(magnitude) ? `${magnitude.toFixed(2)} Δ` : '--';
  deltaTimestampDisplay.textContent = formatTimestamp(timestamp);
}

function clearMotionOverlay() {
  renderMotionOverlay(null);
}

function renderLastMotionDelta() {
  if (lastMotionDelta) {
    renderMotionOverlay(lastMotionDelta);
    syncMagnitudeDisplay(lastMotionDelta.magnitude);
  } else {
    clearMotionOverlay();
    syncMagnitudeDisplay(null);
  }
}

async function initializeAudio() {
  if (audioInitialized || !audioEnabled) return true;
  if (!slashAudio || !slashAudio.getAttribute('src')) {
    audioEnabled = false;
    return true;
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
    console.warn('Failed to initialize audio; continuing without sound', error);
    audioEnabled = false;
    return true;
  }
}

function playSlashSound(magnitude = 0) {
  if (!audioInitialized || !audioEnabled || !slashAudio) return;

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
    syncMagnitudeDisplay(null);
    clearMotionOverlay();
    updateMotionState('停止中');
    return;
  }

  const support = getMotionSupportInfo();
  if (!support.supported) {
    updateStatus('この端末は加速度センサーに対応していません。');
    showMotionHint('センサー非搭載の端末では利用できません。別の端末やブラウザでお試しください。');
    updatePermissionDisplay('非対応');
    updateMotionState('非対応');
    return;
  }

  if (support.permissionRequired) {
    updatePermissionDisplay('許可確認中');
    updateMotionState('許可確認中');
  }

  await initializeAudio();
  const permission = await requestMotionPermission();
  if (permission === 'granted') {
    updatePermissionDisplay('許可済み');
    updateMotionState('許可済み');
    hideMotionHint();
  } else if (permission === 'denied') {
    updatePermissionDisplay('未許可/拒否');
    updateMotionState('拒否');
  } else {
    updatePermissionDisplay('未許可/拒否');
    updateMotionState('未確認');
  }
  if (permission !== 'granted') {
    updateStatus('加速度センサーの許可が必要です。');
    showPermissionGuidance(permission);
    return;
  }

  const threshold = getThresholdValue();
  const { started, reason } = startMotionTracking({
    threshold,
    timeoutMs: 3000,
    onTimeout: handleMotionTimeout,
    onDelta: handleMotionDelta,
  });

  if (!started) {
    if (reason === motionFailureReasons.UNSUPPORTED) {
      updateStatus('加速度センサーに対応していないため開始できません。');
      showMotionHint('端末がセンサーに対応していないか、ブラウザがブロックしています。別の環境でお試しください。');
      updateMotionState('非対応');
    }
    return;
  }

  toggleButton.dataset.active = 'true';
  toggleButton.textContent = '加速度検知を停止';
  updateStatus('加速度検知中。端末を軽く振って反応を確認してください。');
  hideMotionHint();
  updateMotionState(lastMotionDelta ? 'イベント受信中' : 'イベント待機中');
  renderLastMotionDelta();
}

function handleMotionTimeout({ timeoutMs } = {}) {
  stopMotionTracking();
  if (toggleButton) {
    toggleButton.dataset.active = 'false';
    toggleButton.textContent = '加速度検知を開始';
  }
  updateStatus('加速度イベントを受信できませんでした。センサーがブロックされている可能性があります。');
  showMotionHint(
    `ブラウザの設定で「モーションと方向」や「加速度センサー」を許可してから再試行してください。iOSでは設定アプリ > Safari から「モーションと画面の向きにアクセス」をオンにし、Chrome系ではサイトの設定からモーションセンサーを許可した上で、必要に応じてページを再読み込みして再度「加速度検知を開始」を押してください（待ち時間目安: ${
      timeoutMs ?? 0
    }ms）。`
  );
  syncMagnitudeDisplay(null);
  clearMotionOverlay();
  updateMotionState('イベントなし');
}

function handleSlash(event) {
  const { direction, magnitude } = event.detail;
  updateStatus(`斬撃: ${direction} (Δ=${magnitude.toFixed(2)})`);
  renderSlash(event.detail);
  playSlashSound(magnitude);
}

function handleMotionDelta(delta) {
  const { magnitude } = delta;
  lastMotionDelta = delta;
  updateMotionState('イベント受信中');
  renderMotionOverlay(lastMotionDelta);
  syncMagnitudeDisplay(magnitude);
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
  syncMagnitudeDisplay(null);

  const support = getMotionSupportInfo();
  if (!support.supported) {
    updatePermissionDisplay('非対応');
    updateMotionState('非対応');
  } else if (support.permissionRequired) {
    updatePermissionDisplay('未確認/要操作');
    updateMotionState('未確認');
  } else {
    updatePermissionDisplay('不要/自動許可');
    updateMotionState('停止中');
  }

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
      syncMagnitudeDisplay(null);
      clearMotionOverlay();
      updateMotionState('停止中');
      return;
    }

    if (isActive) {
      const threshold = getThresholdValue();
      const { started, reason } = startMotionTracking({
        threshold,
        timeoutMs: 3000,
        onTimeout: handleMotionTimeout,
        onDelta: handleMotionDelta,
      });
      if (started) {
        updateStatus('加速度検知中');
        updateMotionState(lastMotionDelta ? 'イベント受信中' : 'イベント待機中');
        renderLastMotionDelta();
      } else if (reason === motionFailureReasons.UNSUPPORTED) {
        updateMotionState('非対応');
      } else {
        updateMotionState('停止中');
      }
    }
  });

  window.addEventListener('beforeunload', stopCamera);
  window.addEventListener('pagehide', stopCamera);
  window.addEventListener('beforeunload', () => {
    stopMotionTracking();
    updateMotionState('停止中');
  });
  window.addEventListener('pagehide', () => {
    stopMotionTracking();
    updateMotionState('停止中');
  });

  updateStatus('加速度検知は停止中');
  clearMotionOverlay();
});

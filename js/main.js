import { startCamera } from './camera.js';
import { requestMotionPermission, startMotionTracking, slashEventName, stopMotionTracking } from './motion.js';
import { renderSlash, setupSlashCanvas } from './slash.js';

const statusText = document.getElementById('status');
const toggleButton = document.getElementById('toggle-motion');
const slashAudio = document.getElementById('slash-audio');

let audioInitialized = false;

function updateStatus(message) {
  if (statusText) {
    statusText.textContent = message;
  }
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
  playSlashSound(magnitude);
}

document.addEventListener('DOMContentLoaded', async () => {
  await startCamera();
  setupSlashCanvas();

  toggleButton?.addEventListener('click', handleMotionToggle);
  window.addEventListener(slashEventName, handleSlash);

  updateStatus('加速度検知は停止中');
});

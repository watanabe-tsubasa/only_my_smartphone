import { startCamera, stopCamera } from "./camera.js";
import { attachCanvas, triggerSlash } from "./slash.js";
import { isIOS, requestMotionPermission, startMotionMonitoring, stopMotionMonitoring } from "./motion.js";

const cameraEl = document.getElementById("camera");
const canvasEl = document.getElementById("slash-canvas");
const cameraStatusEl = document.getElementById("camera-status");
const motionStatusEl = document.getElementById("motion-status");
const retryCameraBtn = document.getElementById("retry-camera");
const requestMotionBtn = document.getElementById("request-motion");
const hintTextEl = document.getElementById("hint-text");
const guideOverlay = document.getElementById("guide-overlay");
const closeGuideBtn = document.getElementById("close-guide");

let guideShown = false;
let motionReady = false;
let cameraReady = false;

function showGuideOnce() {
  if (guideShown || localStorage.getItem("slash-guide-shown")) return;
  guideOverlay.classList.remove("hidden");
  guideShown = true;
  localStorage.setItem("slash-guide-shown", "1");
}

function hideGuide() {
  guideOverlay.classList.add("hidden");
}

function updateStatuses() {
  cameraStatusEl.textContent = cameraReady
    ? "カメラ準備完了"
    : "カメラの許可を確認しています…";
  motionStatusEl.textContent = motionReady
    ? "モーション取得中。スマホを振って斬撃！"
    : "モーションの許可を確認しています…";

  retryCameraBtn.classList.toggle("hidden", cameraReady);
  requestMotionBtn.classList.toggle("hidden", motionReady || !isIOS());
}

async function initCamera() {
  cameraStatusEl.textContent = "カメラの許可をリクエストしています…";
  retryCameraBtn.disabled = true;
  try {
    await startCamera(cameraEl);
    cameraReady = true;
    cameraStatusEl.textContent = "カメラ起動中";
  } catch (error) {
    cameraReady = false;
    cameraStatusEl.textContent = error?.message || "カメラの許可が必要です";
    retryCameraBtn.classList.remove("hidden");
  } finally {
    retryCameraBtn.disabled = false;
    updateStatuses();
    updateHint();
  }
}

async function enableMotionFromUserGesture() {
  requestMotionBtn.disabled = true;
  motionStatusEl.textContent = "モーション許可をリクエストしています…";
  try {
    await requestMotionPermission();
    startMotionMonitoring(triggerSlash);
    motionReady = true;
    motionStatusEl.textContent = "モーション取得中。スマホを振って斬撃！";
    showGuideOnce();
  } catch (error) {
    motionReady = false;
    motionStatusEl.textContent = error?.message || "モーションの許可が必要です";
    requestMotionBtn.classList.remove("hidden");
  } finally {
    requestMotionBtn.disabled = false;
    updateStatuses();
    updateHint();
  }
}

function setupMotion() {
  if (isIOS()) {
    requestMotionBtn.classList.remove("hidden");
    motionStatusEl.textContent = "iOSではボタンを押してモーション許可を与えてください";
    updateStatuses();
    updateHint();
  } else {
    try {
      startMotionMonitoring(triggerSlash);
      motionReady = true;
      motionStatusEl.textContent = "モーション取得中。スマホを振って斬撃！";
      showGuideOnce();
      updateStatuses();
      updateHint();
    } catch (error) {
      motionStatusEl.textContent = error?.message || "モーションを開始できませんでした";
    }
  }
}

function updateHint() {
  if (cameraReady && motionReady) {
    hintTextEl.textContent = "スマホを軽く振って斬撃を発生させよう";
  } else if (!cameraReady && !motionReady) {
    hintTextEl.textContent = "カメラとモーションの許可をオンにしてください";
  } else if (!cameraReady) {
    hintTextEl.textContent = "カメラ許可を再設定してください";
  } else {
    hintTextEl.textContent = "モーション許可が必要です";
  }
}

function bindEvents() {
  retryCameraBtn.addEventListener("click", () => {
    stopCamera(cameraEl);
    initCamera();
  });

  requestMotionBtn.addEventListener("click", enableMotionFromUserGesture);
  closeGuideBtn.addEventListener("click", hideGuide);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopMotionMonitoring();
      stopCamera(cameraEl);
    } else {
      if (cameraReady) {
        startCamera(cameraEl).catch(() => {});
      }
      if (motionReady) {
        startMotionMonitoring(triggerSlash);
      }
    }
  });
}

async function init() {
  attachCanvas(canvasEl);
  bindEvents();
  updateStatuses();
  updateHint();
  await initCamera();
  setupMotion();
}

window.addEventListener("DOMContentLoaded", init);

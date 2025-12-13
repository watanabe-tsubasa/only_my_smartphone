const state = {
  stream: null
};

function updateStatus(element, message, type = 'info') {
  element.textContent = message;
  element.dataset.type = type;
}

async function startCamera(videoEl, statusEl, startButton, stopButton) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    updateStatus(statusEl, 'このブラウザはカメラ API に対応していません。', 'error');
    return;
  }

  startButton.disabled = true;
  updateStatus(statusEl, 'カメラに接続しています…');

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    videoEl.srcObject = state.stream;
    await videoEl.play();
    updateStatus(statusEl, 'プレビュー中');
    stopButton.disabled = false;
  } catch (error) {
    console.error('Camera error:', error);
    updateStatus(statusEl, 'カメラの初期化に失敗しました。', 'error');
    startButton.disabled = false;
  }
}

function stopCamera(videoEl, statusEl, startButton, stopButton) {
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }

  videoEl.srcObject = null;
  updateStatus(statusEl, '停止中');
  startButton.disabled = false;
  stopButton.disabled = true;
}

export function initCamera({
  videoEl,
  statusEl,
  startButton,
  stopButton
}) {
  startButton.addEventListener('click', () => startCamera(videoEl, statusEl, startButton, stopButton));
  stopButton.addEventListener('click', () => stopCamera(videoEl, statusEl, startButton, stopButton));

  return {
    stop() {
      stopCamera(videoEl, statusEl, startButton, stopButton);
    }
  };
}

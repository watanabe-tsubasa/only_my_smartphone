const videoElement = document.getElementById('camera');
const statusText = document.getElementById('status');
const cameraPermissionDisplay = document.getElementById('camera-permission-display');
const cameraDialog = document.getElementById('camera-dialog');
const cameraDialogMessage = document.getElementById('camera-dialog-message');
const cameraRetryButton = document.getElementById('camera-retry');
const defaultRetryLabel = 'カメラを再試行';
let lastCameraPermissionState = null;

function updateStatus(message) {
  if (statusText) {
    statusText.textContent = message;
  }
}

function showCameraDialog(message, { allowRetry = true, retryLabel = defaultRetryLabel } = {}) {
  if (!cameraDialog || !cameraDialogMessage) return;

  cameraDialogMessage.textContent = message;
  cameraDialog.hidden = false;

  if (cameraRetryButton) {
    cameraRetryButton.textContent = retryLabel;
    cameraRetryButton.hidden = !allowRetry;
  }
}

function updateCameraPermissionDisplay(state) {
  if (!cameraPermissionDisplay) return;
  cameraPermissionDisplay.textContent = state;
}

function hideCameraDialog() {
  if (cameraDialog) {
    cameraDialog.hidden = true;
  }
}

cameraRetryButton?.addEventListener('click', () => {
  startCamera();
});

function renderCameraPermissionState(state) {
  if (!state) return;
  if (state === lastCameraPermissionState) return;

  lastCameraPermissionState = state;
  if (state === 'granted') {
    updateCameraPermissionDisplay('許可済み');
  } else if (state === 'denied') {
    updateCameraPermissionDisplay('拒否');
  } else if (state === 'prompt') {
    updateCameraPermissionDisplay('要許可');
  } else {
    updateCameraPermissionDisplay('未確認');
  }
}

async function getCameraPermissionState() {
  if (!navigator.permissions?.query) return null;

  try {
    const status = await navigator.permissions.query({ name: 'camera' });
    renderCameraPermissionState(status.state);
    status.onchange = () => renderCameraPermissionState(status.state);
    return status.state;
  } catch (error) {
    console.warn('Failed to read camera permission state', error);
    return null;
  }
}

/**
 * Start the rear camera stream and attach it to the video element.
 * Guards against repeated initialization.
 */
export async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    console.error('この端末はカメラ API に対応していません。');
    const message = 'この端末はカメラ API に非対応です。別の端末からお試しください。';
    updateStatus(message);
    updateCameraPermissionDisplay('非対応');
    showCameraDialog(message, { allowRetry: false });
    return false;
  }

  if (videoElement.srcObject) {
    stopCamera();
  }

  const permissionState = await getCameraPermissionState();
  if (permissionState && permissionState !== 'granted') {
    updateStatus('カメラの利用許可をリクエストしています。ブラウザのダイアログが表示されたら「許可」を選択してください。');
    showCameraDialog(
      'カメラのアクセス許可が必要です。「カメラを許可」をタップして、表示されるブラウザのダイアログでアクセスを許可してください。',
      { allowRetry: true, retryLabel: 'カメラを許可' }
    );
  } else {
    updateStatus('カメラを起動しています...');
  }

  try {
    updateCameraPermissionDisplay('確認中');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });

    videoElement.srcObject = stream;
    await videoElement.play();
    hideCameraDialog();
    updateStatus('カメラを起動しました');
    updateCameraPermissionDisplay('許可済み');
    return true;
  } catch (error) {
    console.error('カメラの起動に失敗しました:', error);
    const message =
      error?.name === 'NotAllowedError' || error?.name === 'SecurityError'
        ? 'カメラ許可が必要です。ブラウザの許可ダイアログで「許可」を選択するか、設定でカメラを有効にした後「カメラを許可」を押してください。'
        : 'カメラの起動に失敗しました。端末の設定やカメラの使用状況を確認し、再試行してください。';

    updateStatus(message);
    updateCameraPermissionDisplay(
      error?.name === 'NotAllowedError' || error?.name === 'SecurityError'
        ? '拒否'
        : 'エラー'
    );
    showCameraDialog(message, {
      allowRetry: true,
      retryLabel:
        error?.name === 'NotAllowedError' || error?.name === 'SecurityError' ? 'カメラを許可' : defaultRetryLabel
    });
    return false;
  }
}

/**
 * Stop the current camera stream and release media tracks.
 */
export function stopCamera() {
  const stream = videoElement.srcObject;
  if (!stream) return;

  if (stream instanceof MediaStream) {
    stream.getTracks().forEach((track) => track.stop());
  }

  videoElement.srcObject = null;
  updateCameraPermissionDisplay('停止中');
}

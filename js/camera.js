const videoElement = document.getElementById('camera');
const statusText = document.getElementById('status');
const cameraPermissionDisplay = document.getElementById('camera-permission-display');
const cameraDialog = document.getElementById('camera-dialog');
const cameraDialogMessage = document.getElementById('camera-dialog-message');
const cameraRetryButton = document.getElementById('camera-retry');

function updateStatus(message) {
  if (statusText) {
    statusText.textContent = message;
  }
}

function showCameraDialog(message, { allowRetry = true } = {}) {
  if (!cameraDialog || !cameraDialogMessage) return;

  cameraDialogMessage.textContent = message;
  cameraDialog.hidden = false;

  if (cameraRetryButton) {
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
        ? 'カメラ許可が必要です。ブラウザ設定で許可した後、再試行してください。'
        : 'カメラの起動に失敗しました。端末の設定やカメラの使用状況を確認し、再試行してください。';

    updateStatus(message);
    updateCameraPermissionDisplay(
      error?.name === 'NotAllowedError' || error?.name === 'SecurityError'
        ? '拒否'
        : 'エラー'
    );
    showCameraDialog(message, { allowRetry: true });
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

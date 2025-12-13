const videoElement = document.getElementById('camera');

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });

    videoElement.srcObject = stream;
    await videoElement.play();
  } catch (error) {
    console.error('カメラの起動に失敗しました:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    console.error('この端末はカメラ API に対応していません。');
    return;
  }

  startCamera();
});

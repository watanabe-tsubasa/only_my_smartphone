const videoElement = document.getElementById('camera');

/**
 * Start the rear camera stream and attach it to the video element.
 * Guards against repeated initialization.
 */
export async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    console.error('この端末はカメラ API に対応していません。');
    return;
  }

  if (videoElement.srcObject) return;

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

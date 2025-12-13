const videoConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

export async function startCamera(videoElement) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("カメラAPIがサポートされていません。");
  }

  const stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
  videoElement.srcObject = stream;
  await videoElement.play().catch(() => {});
  return stream;
}

export function stopCamera(videoElement) {
  const stream = videoElement.srcObject;
  if (stream && typeof stream.getTracks === "function") {
    stream.getTracks().forEach((track) => track.stop());
  }
  videoElement.srcObject = null;
}

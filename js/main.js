import { initCamera } from './camera.js';
import { initMotion } from './motion.js';
import { initSlash } from './slash.js';

const camera = initCamera({
  videoEl: document.querySelector('#cameraPreview'),
  statusEl: document.querySelector('#cameraStatus'),
  startButton: document.querySelector('#startCamera'),
  stopButton: document.querySelector('#stopCamera')
});

const motion = initMotion({
  accelEl: document.querySelector('#acceleration'),
  orientationEl: document.querySelector('#orientation'),
  statusEl: document.querySelector('#motionStatus'),
  enableButton: document.querySelector('#enableMotion')
});

const slash = initSlash({
  buttonEl: document.querySelector('#slashButton'),
  statusEl: document.querySelector('#slashStatus')
});

window.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    camera.stop();
    motion.stop();
    slash.stop();
  }
});

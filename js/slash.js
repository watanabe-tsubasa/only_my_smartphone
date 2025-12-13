function updateStatus(element, message, type = 'info') {
  element.textContent = message;
  element.dataset.type = type;
}

export function initSlash({
  buttonEl,
  statusEl,
  audioPath = 'assets/slash.mp3'
}) {
  const audio = new Audio(audioPath);
  audio.preload = 'auto';

  buttonEl.addEventListener('click', async () => {
    updateStatus(statusEl, '再生中…');
    buttonEl.disabled = true;
    try {
      await audio.play();
      updateStatus(statusEl, '再生完了');
    } catch (error) {
      console.error('Audio play error:', error);
      updateStatus(statusEl, '再生に失敗しました。', 'error');
    } finally {
      buttonEl.disabled = false;
    }
  });

  return {
    stop() {
      audio.pause();
      audio.currentTime = 0;
      updateStatus(statusEl, '停止中');
    }
  };
}

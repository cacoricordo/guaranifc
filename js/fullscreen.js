/* === Controle de aprimoramento esportivo === */
const overlay = document.getElementById("fullscreen-overlay");
const exitBtn = document.getElementById("exit-fullscreen-btn");

function enterFullscreen() {
  const el = document.documentElement; // fullscreen na página toda

  // ✅ iOS precisa ser direto e sem async/await
  if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen(); // Safari iOS
  } else if (el.requestFullscreen) {
    el.requestFullscreen(); // Chrome / Android / Desktop
  }

  overlay.style.display = "none";

  // ✅ Tenta travar landscape (Android / Chrome)
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock("landscape").catch(() => {});
  }
}

function exitFullscreen() {
  if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen(); // iOS Safari
  } else if (document.exitFullscreen) {
    document.exitFullscreen(); // Chrome / Android / Desktop
  }
}

overlay.addEventListener("click", enterFullscreen);
exitBtn.addEventListener("click", exitFullscreen);

document.addEventListener("fullscreenchange", () => {
  const isFullscreen =
    document.fullscreenElement || document.webkitFullscreenElement;

  if (!isFullscreen) {
    overlay.style.display = "flex";

    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  }
});


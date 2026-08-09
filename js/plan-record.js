/* ===== Plano gravado (jogada ensaiada) ===== */
(function() {
  const recordBtn = document.getElementById("plan-record-btn");
  const playBtn = document.getElementById("plan-play-btn");
  const pauseBtn = document.getElementById("plan-pause-btn");
  if (!recordBtn || !playBtn || !pauseBtn) return;

  const RECORD_LIMIT_MS = 60000;
  const RECORD_INTERVAL_MS = 100;

  let frames = [];
  let recordStart = 0;
  let recordInterval = null;
  let recordStopTimer = null;

  let playing = false;
  let paused = false;
  let playIndex = 0;
  let playOffset = 0;
  let playStart = 0;
  let playRaf = null;

  function getCirclePositions() {
    const circles = Array.from(document.querySelectorAll(".circle"));
    return circles.map((el) => {
      const style = window.getComputedStyle(el);
      let left = parseFloat(style.left);
      let top = parseFloat(style.top);
      if (Number.isNaN(left) || Number.isNaN(top)) {
        const rect = el.getBoundingClientRect();
        left = rect.left;
        top = rect.top;
      }
      return { id: el.id, left, top };
    });
  }

  function captureFrame() {
    frames.push({
      t: Date.now() - recordStart,
      positions: getCirclePositions()
    });
  }

  function setButtonState() {
    recordBtn.style.background = recordInterval ? "#e53935" : "#333";
    playBtn.style.background = playing && !paused ? "#28a745" : "#222";
    pauseBtn.style.background = paused ? "#f0ad4e" : "#222";
    recordBtn.textContent = recordInterval ? "● Gravando" : "● Record";
  }

  function stopPlayback() {
    if (playRaf) cancelAnimationFrame(playRaf);
    playing = false;
    paused = false;
    playIndex = 0;
    playOffset = 0;
    playStart = 0;
    playRaf = null;
    setButtonState();
  }

  function stopRecording() {
    if (recordInterval) clearInterval(recordInterval);
    if (recordStopTimer) clearTimeout(recordStopTimer);
    recordInterval = null;
    recordStopTimer = null;
    window.planRecordActive = false;
    setButtonState();
    window.planRecordFrames = frames;
    window.jogadaEnsaiada = frames;
  }

  function startRecording() {
    stopPlayback();
    frames = [];
    recordStart = Date.now();
    captureFrame();
    recordInterval = setInterval(captureFrame, RECORD_INTERVAL_MS);
    recordStopTimer = setTimeout(stopRecording, RECORD_LIMIT_MS);
    window.planRecordActive = true;
    window.planRecordClearDelay = RECORD_LIMIT_MS;
    setButtonState();
  }

  function applyFrame(frame) {
    frame.positions.forEach((pos) => {
      const el = document.getElementById(pos.id);
      if (!el) return;
      el.style.left = pos.left + "px";
      el.style.top = pos.top + "px";
    });
  }

  function playbackLoop(timestamp) {
    if (!playStart) playStart = timestamp - playOffset;
    const elapsed = timestamp - playStart;
    while (playIndex < frames.length && frames[playIndex].t <= elapsed) {
      applyFrame(frames[playIndex]);
      playIndex += 1;
    }
    if (playIndex >= frames.length) {
      stopPlayback();
      return;
    }
    playRaf = requestAnimationFrame(playbackLoop);
  }

  function startPlayback() {
    if (!frames.length) return;
    if (recordInterval) stopRecording();
    playing = true;
    paused = false;
    if (!playIndex) playOffset = 0;
    setButtonState();
    playRaf = requestAnimationFrame(playbackLoop);
  }

  function pausePlayback() {
    if (!playing || paused) return;
    paused = true;
    if (playRaf) cancelAnimationFrame(playRaf);
    const now = performance.now();
    if (playStart) playOffset = now - playStart;
    setButtonState();
  }

  recordBtn.addEventListener("click", () => {
    if (recordInterval) {
      stopRecording();
      return;
    }
    startRecording();
  });

  playBtn.addEventListener("click", () => {
    if (paused) {
      paused = false;
      playing = true;
      setButtonState();
      playRaf = requestAnimationFrame(playbackLoop);
      return;
    }
    if (playing) return;
    playIndex = 0;
    playStart = 0;
    startPlayback();
  });

  pauseBtn.addEventListener("click", () => {
    pausePlayback();
  });

  setButtonState();
  window.recordPlan = startRecording;
})();

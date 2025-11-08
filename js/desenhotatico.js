/* ===== Desenho Tático: correção para offset mobile (HiDPI + CSS size sync) ===== */
(function(){
  const canvas = document.getElementById("trace-canvas");
  const penBtn = document.getElementById("pen-path-btn");
  const socket = window.socket || (window.io ? io() : null);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Faz o canvas ocupar um tamanho CSS estável (se quiser, ajuste aqui)
  // Se preferir que o canvas seja responsivo, ajuste o CSS; aqui usamos o rect atual.
  function resizeCanvasForDisplay() {
    const ratio = window.devicePixelRatio || 1;
    // pega o tamanho CSS real do canvas (dependendo do layout)
    const rect = canvas.getBoundingClientRect();

    // forçar CSS width/height para o tamanho do rect (garante consistência)
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    // ajusta o buffer físico do canvas para HiDPI
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);

    // faz o ctx trabalhar em CSS pixels (transforma coords automaticamente)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  // chama no load e quando a viewport muda
  resizeCanvasForDisplay();
  window.addEventListener('resize', resizeCanvasForDisplay);
  // também quando há rolagem (às vezes rect muda por UI do navegador)
  window.addEventListener('scroll', () => {
    // atualização leve — só se o canvas estiver visível
    resizeCanvasForDisplay();
  }, { passive: true });

  // estado
  let penMode = false;
  let drawing = false;
  let currentPath = [];
  let pointerId = null;

  // Toggle pen button: ativa/desativa captura de eventos
  penBtn.addEventListener('click', () => {
    penMode = !penMode;
    penBtn.style.background = penMode ? "#33aaff" : "#222";
    canvas.style.pointerEvents = penMode ? "auto" : "none";
    penBtn.textContent = penMode ? "✎ Desenhando..." : "✎ Desenho Tático";
    if (penMode) {
      canvas.style.zIndex = "1000";
    } else {
      canvas.style.zIndex = "1";
    }
  });

  // evita scroll durante desenho
  canvas.style.touchAction = "none";

  // converte evento -> coordenada em CSS pixels relativa ao canvas
  function getCoordFromEvent(evt) {
    const rect = canvas.getBoundingClientRect();
    // pointer events: clientX/clientY
    if (evt.clientX !== undefined && evt.clientY !== undefined) {
      return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
    }
    // touch fallback
    if (evt.touches && evt.touches[0]) {
      return { x: evt.touches[0].clientX - rect.left, y: evt.touches[0].clientY - rect.top };
    }
    return { x: 0, y: 0 };
  }

  // pointer events (recomendado)
  canvas.addEventListener('pointerdown', (e) => {
    if (!penMode || !e.isPrimary) return;
    drawing = true;
    pointerId = e.pointerId;
    try { canvas.setPointerCapture(pointerId); } catch (er) {}
    const { x, y } = getCoordFromEvent(e);
    currentPath = [[x, y]];
    ctx.beginPath();
    ctx.moveTo(x, y);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!penMode || !drawing || e.pointerId !== pointerId) return;
    const { x, y } = getCoordFromEvent(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#ff3333";
    ctx.lineWidth = 4;
    ctx.stroke();
    currentPath.push([x, y]);
  });

  function finishDrawing(e) {
    if (!drawing) return;
    drawing = false;
    try { canvas.releasePointerCapture(pointerId); } catch (er) {}
    ctx.closePath();
    if (socket && currentPath.length > 1) {
      socket.emit('path_draw', { path: currentPath });
    }

    setTimeout(() => {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1.0;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }, 4000);

    currentPath = [];
    pointerId = null;
  }

  canvas.addEventListener('pointerup', finishDrawing);
  canvas.addEventListener('pointercancel', finishDrawing);
  canvas.addEventListener('pointerout', (e) => {
    if (drawing && e.pointerId === pointerId) finishDrawing(e);
  });

  // touch fallback (mantém compatibilidade)
  canvas.addEventListener('touchstart', (e) => {
    if (!penMode) return;
    e.preventDefault();
    const c = getCoordFromEvent(e);
    drawing = true;
    currentPath = [[c.x, c.y]];
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (!penMode || !drawing) return;
    e.preventDefault();
    const c = getCoordFromEvent(e);
    ctx.lineTo(c.x, c.y);
    ctx.strokeStyle = "#ff3333";
    ctx.lineWidth = 4;
    ctx.stroke();
    currentPath.push([c.x, c.y]);
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (!penMode || !drawing) return;
    e.preventDefault();
    drawing = false;
    ctx.closePath();

    if (socket && currentPath.length > 1) socket.emit('path_draw', { path: currentPath });
    setTimeout(() => {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1.0;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }, 4000);

    currentPath = [];
  }, { passive: false });

  // recebe e desenha paths de outros clientes (coord em CSS pixels)
  if (socket) {
    socket.on('path_draw', (data) => {
      if (!data || !Array.isArray(data.path) || data.path.length === 0) return;
      ctx.beginPath();
      for (let i = 0; i < data.path.length; i++) {
        const [x, y] = data.path[i];
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#ff3333";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.closePath();
      setTimeout(() => {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = 1.0;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }, 4000);
    });
  }
})();

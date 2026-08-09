const socket = io("https://guaranifc.onrender.com", {
  transports: ["websocket"],   //  fix --force; força WS, evita polling
  secure: true,
  reconnection: true
});

window.socket = socket;


socket.on("connect", () => {
  console.log("📡 Conectado ao servidor WebSocket");

  // ⚠️ NUNCA zere o PIN aqui!
  // Se já tem um PIN (ex.: a aba reconectou), reentra automaticamente.
  if (window.currentRoomCode) {
    console.log("🔄 Reentrando na sala privada:", window.currentRoomCode);
    socket.emit("join-room", window.currentRoomCode);
  }
});


  socket.on("disconnect", () => {
    console.log("🔌 Desconectado do servidor");
  });

  // 🔴 Quando o servidor emitir uma nova análise tática
  socket.on("tactical-analysis", (data) => {
    console.log("📊 Atualização tática recebida:", data);

    // Atualiza jogadores (ex: time verde/red)
    if (data.red) {
      for (const p of data.red) {
        const el = document.getElementById("circle" + p.id);
        if (el) {
          el.style.transition = "left 1s ease, top 1s ease";
          el.style.left = p.left + "px";
          el.style.top = p.top + "px";
        }
      }
    }
  });

// === Live Sync ** RECEBE MOVIMENTO DE JOGADORES DA SALA PRIVADA ===
socket.on("player-move", (data) => {

  console.log("🔔 RECEBIDO player-move:", data);

  // ignorar eventos da sala pública
  if (!window.currentRoomCode || data.room !== window.currentRoomCode) {
    console.log("⛔ ignorado (sala diferente)");
    return;
  }

  const el = document.getElementById(data.id);
  if (!el) {
    console.warn("❓ elemento não encontrado:", data.id);
    return;
  }

  el.style.left = data.left + "px";
  el.style.top  = data.top  + "px";
});

// ==== RECEBE path_draw da sala ====
socket.on("path_draw", (data) => {

  if (!window.currentRoomCode || data.room !== window.currentRoomCode) {
    console.log("⛔ path ignorado (outra sala)");
    return;
  }

  const canvas = document.getElementById("trace-canvas");
  const ctx = canvas.getContext("2d");

  ctx.beginPath();
  for (let i = 0; i < data.path.length; i++) {
      const [x, y] = data.path[i];
      (i === 0 ? ctx.moveTo : ctx.lineTo)(x, y);
  }
  ctx.strokeStyle = "#ff3333";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.closePath();
});


socket.on("ball-move", (data) => {
  if (data.room !== window.currentRoomCode) return;
  const el = document.getElementById(data.id);
  if (el) {
    el.style.transition = "left 0.2s linear, top 0.2s linear";
    el.style.left = data.left + "px";
    el.style.top = data.top + "px";
  }
  // ✅ GOLEIRO / BOLA NO EIXO Y
  const gk = document.getElementById("circle23");
  if (gk) {
    const targetY = data.top - 20; // ajusta centralização visual
    gk.style.left = "565px";       // fixa na trave (lado direito, seu campo é 600px)
    gk.style.transition = "top 0.25s ease-out";
    gk.style.top = `${targetY}px`;
  }
});

// ✅ Quando entrar na sala, atualiza o indicador
socket.on("joined-room", (roomCode) => {
  console.log("✅ Joined-room:", roomCode);
  window.currentRoomCode = roomCode; // garante PIN global sincronizado

  const box = document.getElementById("room-user-indicator");
  if (box) {
    box.style.display = "flex";
    box.innerHTML = `🔐 CT ${roomCode}<br>👥 1 jogador`;
  }
});

// ✅ Quando o servidor mandar o total de pessoas conectadas
socket.on("room-user-count", (total) => {
  const box = document.getElementById("room-user-indicator");
  box.style.display = "block";
  box.innerHTML = `🔐 CT ${window.currentRoomCode}<br>👥 ${total} jogador(es)`;
});

socket.on("supertrunfo-result", (data) => {
  const { winner, yourCard, enemyCard, attr } = data;

  const msg = `
    🎮 SUPER-TRUNFO RESULTADO\n
    Você: ${yourCard.name}
    Adversário: ${enemyCard.name}
    Categoria: ${attr}
    🏆 VENCEDOR: ${winner}
  `;
  alert(msg);
});



/* ===== CORE: movimento, socket, física e AI analyze ===== */
const socket = io("https://guaranifc.onrender.com", {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
});
window.socket = socket;

// === Utilitário: throttle ===
function throttle(fn, delay) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn(...args);
    }
  };
}

const circles = {};
const dragState = {};
let activeId = null;

// === Inicializa círculos (jogadores) ===
for (let i = 1; i <= 24; i++) {
  const el = document.getElementById("circle" + i);
  circles[i] = el;
  dragState[i] = { dragging: false, offsetX: 0, offsetY: 0 };
  if (!el) continue;
  el.style.position = el.style.position || "absolute";
  el.style.zIndex = "20";

  el.addEventListener("mousedown", (e) => {
    dragState[i].dragging = true;
    dragState[i].offsetX = e.offsetX;
    dragState[i].offsetY = e.offsetY;
    activeId = i;
  });

  el.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    const rect = el.getBoundingClientRect();
    dragState[i].dragging = true;
    dragState[i].offsetX = touch.clientX - rect.left;
    dragState[i].offsetY = touch.clientY - rect.top;
    activeId = i;
    e.preventDefault();
  }, { passive: false });
}

// === Física da bola ===
const emitBallMove = throttle((id, left, top) => {
  socket.emit("ball-move", { id, left, top });
}, 50);

const ball = document.getElementById("circle24");

// === Detecção de colisão ===
function checkCollision(playerEl, ballEl) {
  const pr = playerEl.getBoundingClientRect();
  const br = ballEl.getBoundingClientRect();
  const dx = pr.left - br.left;
  const dy = pr.top - br.top;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < 30;
}

/* ===== MOVIMENTO, COLISÃO E FÍSICA AVANÇADA (FIFA MODE) ===== */

let lastSpoken = {}; // cooldown das falas
let ballVelocity = { x: 0, y: 0 }; // vetor de velocidade da bola
let ballMoving = false;

// === Função de movimento e impacto ===
function moveElement(id, x, y) {
  const el = circles[id];
  if (!el) return;

  // 🟥 impede o juiz (circle12) de movimentar a bola ou ter impacto
  if (id === 12) return;

  // 🟢 permite o movimento da bola localmente
  const oldX = parseFloat(el.style.left || 0);
  const oldY = parseFloat(el.style.top || 0);

  el.style.left = x + "px";
  el.style.top = y + "px";

  // Se for a bola, apenas emite o movimento e sai (sem colisão)
  if (id === 24) {
    emitBallMove("circle24", x, y);
    return;
  }

  // detecta colisão jogador-bola
  if (checkCollision(el, ball)) {
    const now = Date.now();

    // fala uma vez por segundo
    if (!lastSpoken[id] || now - lastSpoken[id] > 1000) {
      speakPlayerNumber("circle" + id);
      lastSpoken[id] = now;
    }

    // === Cálculo do impacto proporcional à velocidade ===
    const vx = (x - oldX) * 0.6; // força (ajuste: 0.6–1.0)
    const vy = (y - oldY) * 0.6;
    ballVelocity.x = vx;
    ballVelocity.y = vy;
    ballMoving = true;
  }
}

// === Loop de física (inércia e atrito) ===
function updateBallPhysics() {
  if (!ballMoving) return;

  const ball = document.getElementById("circle24");
  if (!ball) return;

  let bx = parseFloat(ball.style.left || 0);
  let by = parseFloat(ball.style.top || 0);

  // aplica velocidade
  bx += ballVelocity.x;
  by += ballVelocity.y;

  // atrito (reduz a velocidade gradualmente)
  ballVelocity.x *= 0.94;
  ballVelocity.y *= 0.94;

  // se a velocidade for muito baixa, para a bola
  if (Math.abs(ballVelocity.x) < 0.05 && Math.abs(ballVelocity.y) < 0.05) {
    ballMoving = false;
  }

  // mantém dentro do campo (limites de tela)
  const field = document.getElementById("field") || document.body;
  const maxX = (field.clientWidth || window.innerWidth) - 40;
  const maxY = (field.clientHeight || window.innerHeight) - 40;
  bx = Math.max(0, Math.min(bx, maxX));
  by = Math.max(0, Math.min(by, maxY));

  // aplica posição
  ball.style.left = bx + "px";
  ball.style.top = by + "px";

  // envia posição ao servidor
  emitBallMove("circle24", bx, by);
}

// === Atualiza a física a cada frame ===
setInterval(updateBallPhysics, 30);

// === Movimento dos jogadores (desktop + touch) ===
const emitPlayerMove = throttle((id, left, top) => {
  socket.emit("player-move", { id, left, top });
}, 50);

document.addEventListener("mousemove", (e) => {
  if (!activeId) return;
  const i = activeId;
  const x = e.clientX - dragState[i].offsetX;
  const y = e.clientY - dragState[i].offsetY;
  moveElement(i, x, y);
  emitPlayerMove("circle" + i, x, y);
});

document.addEventListener("touchmove", (e) => {
  if (!activeId) return;
  const i = activeId;
  const touch = e.touches[0];
  const x = touch.clientX - dragState[i].offsetX;
  const y = touch.clientY - dragState[i].offsetY;
  moveElement(i, x, y);
  emitPlayerMove("circle" + i, x, y);
  e.preventDefault();
}, { passive: false });

function endDrag() {
  if (activeId) {
    dragState[activeId].dragging = false;
    activeId = null;
  }
}
document.addEventListener("mouseup", endDrag);
document.addEventListener("touchend", endDrag);

// === Recebe posições dos jogadores de outros clientes ===
socket.on("update_circle", (data) => {
  const el = document.getElementById("circle" + data.id);
  if (el) {
    el.style.left = data.left + "px";
    el.style.top = data.top + "px";
  }
});


const canvas = document.getElementById("trace-canvas");
const ctx = canvas?.getContext("2d", { willReadFrequently: true });

  // === RECEBE DESENHOS DE OUTROS USUÁRIOS ===
  if (window.socket) {
    socket.on("path_draw", (data) => {
      if (!data || !Array.isArray(data.path)) return;
      const rect = canvas.getBoundingClientRect();

      // Reconstrói coordenadas reais conforme o tamanho do canvas local
      const scaled = data.path.map(([nx, ny]) => [nx * rect.width, ny * rect.height]);

      // Cor por camada tática
      const color = data.layer === "defesa" 
        ? "rgba(51,153,255,0.9)"
        : data.layer === "bolaparada"
        ? "rgba(255,215,0,0.9)"
        : "rgba(255,51,51,0.9)"; // ataque padrão

      // Desenha suavizado e aplica fade local
      ctx.beginPath();
      ctx.moveTo(scaled[0][0], scaled[0][1]);
      for (let i = 1; i < scaled.length - 1; i++) {
        const xc = (scaled[i][0] + scaled[i + 1][0]) / 2;
        const yc = (scaled[i][1] + scaled[i + 1][1]) / 2;
        ctx.quadraticCurveTo(scaled[i][0], scaled[i][1], xc, yc);
      }
      ctx.lineTo(scaled[scaled.length - 1][0], scaled[scaled.length - 1][1]);
      ctx.strokeStyle = color;
      ctx.shadowColor = color.replace("0.9", "0.3");
      ctx.shadowBlur = 6;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.closePath();

      // 🔥 fade automático em 5s (sincronizado visualmente)
      setTimeout(() => {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.moveTo(scaled[0][0], scaled[0][1]);
        for (let i = 1; i < scaled.length - 1; i++) {
          const xc = (scaled[i][0] + scaled[i + 1][0]) / 2;
          const yc = (scaled[i][1] + scaled[i + 1][1]) / 2;
          ctx.quadraticCurveTo(scaled[i][0], scaled[i][1], xc, yc);
        }
        ctx.lineTo(scaled[scaled.length - 1][0], scaled[scaled.length - 1][1]);
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
      }, 5000);
    });
  }

  function animateTeam(prefix, positions) {
    for (const p of positions) {
      if (p.id === 23) continue;
      const el = document.getElementById(prefix + p.id);
      if (el) {
        el.style.transition = 'left 1s ease, top 1s ease';
        el.style.left = p.left + 'px';
        el.style.top = p.top + 'px';
      }
    }
  }

// === 🟢 BLOCO TÁTICO DINÂMICO (MOVE O TIME TODO) ===
function applyDynamicBlocks(greenPlayers, phase, opponentFormation) {
  let blockOffsetX = 0;
  switch ((phase || "").toLowerCase()) {
    case "ataque":    blockOffsetX = -80; break;
    case "defesa":    blockOffsetX =  80; break;
    case "transicao": blockOffsetX = -40; break;
  }
  if (opponentFormation === "4-4-2" || opponentFormation === "5-4-1") blockOffsetX = -100;
  else if (opponentFormation === "4-3-3" || opponentFormation === "4-2-3-1") blockOffsetX = 100;

  console.log(`🟢 Bloco aplicado: fase=${phase}, offset=${blockOffsetX}px`);

  greenPlayers.forEach(p => {
    const el = document.getElementById(`circle${p.id}`);
    if (!el) return;
    const newX = p.left + blockOffsetX;
    el.style.left = `${Math.max(20, Math.min(580, newX))}px`;
    el.style.top  = `${p.top}px`;
    p.left = Math.max(20, Math.min(580, newX));
  });
}

// === Função: envia imagem do campo para análise visual (IA Vision) ===
async function sendVisionTactic() {
  try {
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      console.warn("❌ Canvas não encontrado.");
      return;
    }

    const fieldImage = canvas.toDataURL("image/png");
    const possession = typeof getCurrentPossession === "function"
      ? getCurrentPossession()
      : "verde";

    const ball = typeof getBall === "function" ? getBall() : null;

    console.log("📸 Enviando imagem do campo para análise visual...");
    console.log("🖼️ fieldImage:", fieldImage.substring(0, 100));

    const green = getGuaraniPositions();
    const black = getOpponentPositions();

    const res = await fetch("https://guaranifc.onrender.com/ai/vision-tactic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldImage, possession, ball, green, black })
    });

    const data = await res.json();
    console.log("📊 Visão Tática (backend):", data);

    // ✅ Move o Verde pela visão da IA
    if (Array.isArray(data.green) && data.green.length > 0) {
      animateTeam("circle", data.green);

      applyDynamicBlocks(
        data.green,
        data.phase?.toLowerCase() || "defesa",
        data.opponentFormation || "4-4-2"
      );
    }

    // ✅ Abre popup do treinador
    if (data.coachComment && typeof showAbelCommentPopup === "function") {
      showAbelCommentPopup(data.coachComment);
    }
    
    return data;
  } catch (err) {
    console.error("❌ Erro ao enviar imagem para IA Vision:", err);
  }
}

    window.animateTeam = animateTeam;

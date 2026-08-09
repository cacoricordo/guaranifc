/* ===== CORE de aprimoramento esportivo: movimento, socket, física e AI analyze ===== */

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

// === DIMENSÃO DO CAMPO (pegando pelo elemento #field ou fallback para viewport) ===
const field = document.getElementById("field") || document.body;
window.FIELD_WIDTH  = field.clientWidth  || window.innerWidth;
window.FIELD_HEIGHT = field.clientHeight || window.innerHeight;
const FIELD_RIGHT_GOAL_X = FIELD_WIDTH - 20; // ajuste conforme seu campo

window.notify = window.notifyTop;

function isGoalRight(ballEl) {
  const goalEl = document.getElementById("gol2-square");
  if (!ballEl || !goalEl) return false;

  const ball = ballEl.getBoundingClientRect();
  const goal = goalEl.getBoundingClientRect();

  const passedLine = ball.right >= goal.left;                // passou da linha do gol
  const withinPosts = ball.top >= goal.top && ball.bottom <= goal.bottom; // entre as traves

  return passedLine && withinPosts;
}

const circles = {};
const dragState = {};
let activeId = null;

let movedDuringDrag = false;

window.trainingBallLock = false;
window.trainingPlayMode = false;
window.trainingForceShot = false;

// === Inicializa círculos (jogadores) ===
for (let i = 1; i <= 24; i++) {
  const el = document.getElementById("circle" + i);
  circles[i] = el;
  dragState[i] = { dragging: false, offsetX: 0, offsetY: 0 };
  if (!el) continue;
  const id = i;
  el.style.position = el.style.position || "absolute";
  el.style.zIndex = "20";

  el.addEventListener("mousedown", (e) => {
    if (i === 24 && window.trainingBallLock) return;
    dragState[id].dragging = true;
    dragState[id].offsetX = e.offsetX;
    dragState[id].offsetY = e.offsetY;
    activeId = id;
  });

  el.addEventListener("touchstart", (e) => {
    if (i === 24 && window.trainingBallLock) return;
    const touch = e.touches[0];
    const rect = el.getBoundingClientRect();
    dragState[i].dragging = true;
    dragState[i].offsetX = touch.clientX - rect.left;
    dragState[i].offsetY = touch.clientY - rect.top;
    activeId = i;
    e.preventDefault();
  }, { passive: false });
}

// === NOVO: Estado tático por jogador (D / M / A / número) ===
const circleTacticalState = {};
const circleOriginalNumber = {};

// === Inicializa labels originais ===
for (let i = 1; i <= 24; i++) {
  const el = document.getElementById("circle" + i);
  if (!el) continue;

// guarda o número original do círculo
  circleOriginalNumber[i] = el.textContent.trim() || "";
}

// === Ciclo de clique: Número → D → M → A → Número ===
function cycleTacticalRole(circleId) {
  const el = circles[circleId];
  if (!el) return;

  const current = circleTacticalState[circleId] || "NUM";

  let next;
  if (current === "NUM") next = "D";
  else if (current === "D") next = "M";
  else if (current === "M") next = "A";
  else next = "NUM";

  // salva estado
  circleTacticalState[circleId] = next;

  // renderiza text
  if (next === "NUM") {
    el.textContent = circleOriginalNumber[circleId];
    el.style.background = ""; // mantem seu estilo atual
  } else {
    el.textContent = next; // D / M / A
  }
}

// === Adiciona listeners (click) para cada círculo ===
for (let i = 1; i <= 24; i++) {
  const el = document.getElementById("circle" + i);
  if (!el) continue;

el.addEventListener("pointerup", (e) => {
  e.stopPropagation();

  if (movedDuringDrag) {
    movedDuringDrag = false;
    return;
  }

  if (i === 24) return;

  cycleTacticalRole(i);
});


}

// === Física da bola ===
const emitBallMove = throttle((id, left, top, room ) => {
	if (!window.currentRoomCode) return;
	socket.emit("ball-move", { id, left, top, room: window.currentRoomCode });
}, 50);

const ball = document.getElementById("circle24");

// === Detecção de colisão ===
function checkCollision(player, ball) {
  const pr = player.getBoundingClientRect();
  const br = ball.getBoundingClientRect();
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
    emitBallMove("circle24", x, y, window.currentRoomCode);

    // ✅ ATIVA física sempre que a bola for arrastada
    ballVelocity.x = 0;
    ballVelocity.y = 0;
    ballMoving = true;

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
    
   // 🟩 AUTO-CHUTE DA IA (time verde)
   if (window.trainingForceShot && id >= 13 && id <= 23) {
       aiAutoKickTowardsLeftGoal(el);
       return;
   }
    
    ballVelocity.x = vx;
    ballVelocity.y = vy;
    ballMoving = true;
  }
}

// === Loop de física (inércia e atrito) ===
function updateBallPhysics() {
  if (!ballMoving) return;
  console.log("⬅️ Loop da bola rodando", ballVelocity);

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
  const field = document.getElementById("background-square"); // <-- usa o campo real
  const maxX = (field.clientWidth || window.innerWidth) - 40;
  const maxY = (field.clientHeight || window.innerHeight) - 40;
  bx = Math.max(0, Math.min(bx, maxX));
  by = Math.max(0, Math.min(by, maxY));

  // aplica posição
  ball.style.left = bx + "px";
  ball.style.top = by + "px";
  console.log("Posição da bola:", bx, by);

  // ✅ DETECÇÃO DE GOL (bola passou COMPLETAMENTE do gol direito)
  if (isGoalRight(ball)) {
    console.log("✅ GOL DETECTADO");

    window.dispatchEvent(
      new CustomEvent("goal:scored", { detail: { side: "right" } })
    );

    ballMoving = false; // para a bola após o gol
    return;            // evita disparar múltiplos gols no mesmo lance
  }

  // envia posição ao servidor
  emitBallMove("circle24", bx, by, window.currentRoomCode);
}

// === Atualiza a física a cada frame ===
setInterval(updateBallPhysics, 30);

// === Movimento dos jogadores (desktop + touch) ===
const emitPlayerMove = throttle((id, left, top, room) => {
  if (!window.currentRoomCode) {
    console.log("⛔ não está em sala, não emitir");
    return;
  }

  const payload = { id, left, top, room: window.currentRoomCode };
  console.log("🚀 ENVIANDO player-move:", payload);
  socket.emit("player-move", payload);
}, 40);


document.addEventListener("mousemove", (e) => {
  if (!activeId) return;
  movedDuringDrag = true;
  const i = activeId;
  const x = e.clientX - dragState[i].offsetX;
  const y = e.clientY - dragState[i].offsetY;
  moveElement(i, x, y);
  emitPlayerMove("circle" + i, x, y, window.currentRoomCode);
});

document.addEventListener("touchmove", (e) => {
  if (!activeId) return;
  movedDuringDrag = true;
  const i = activeId;
  const touch = e.touches[0];
  const x = touch.clientX - dragState[i].offsetX;
  const y = touch.clientY - dragState[i].offsetY;
  moveElement(i, x, y);
  emitPlayerMove("circle" + i, x, y, window.currentRoomCode);
  e.preventDefault();
}, { passive: false });

function endDrag() {
  if (activeId) {
    dragState[activeId].dragging = false;
    activeId = null;
  }
  // reset mover detector
  movedDuringDrag = false;
}

document.addEventListener("mouseup", endDrag);
document.addEventListener("touchend", endDrag);

const canvas = document.getElementById("trace-canvas");
const ctx = canvas?.getContext("2d", { willReadFrequently: true });

// =========================================================
// ⚫ PEGAR POSIÇÕES DO TIME ADVERSÁRIO NO CAMPO ⚫
// =========================================================
function getOpponentPositions() {
  // detecta automaticamente se existe circleOpp1
  // ou usa circle1 a circle11 como ADVERSÁRIO!
  const black = [];
  for (let i = 1; i <= 11; i++) {
    let el = document.getElementById("circleOpp" + i);
    if (!el) el = document.getElementById("circle" + i); // fallback automático
    if (!el) continue;
    
    // pega estilos COMPUTADOS (o que realmente aparece na tela)
    const comp = window.getComputedStyle(el);
    const left = parseFloat(comp.left);
    const top  = parseFloat(comp.top);

    black.push({
      id: i,
      left: isNaN(left) ? 0 : left,
      top:  isNaN(top)  ? 0 : top
    });
  }
  return black;
}

// 🔥 Permitir usar pelo console:
if (typeof window !== "undefined") {
  window.getOpponentPositions = getOpponentPositions;
}


 // ================================================
 // === IA FINALIZA TREINO (verde corre e chuta) ===
 // ================================================
 window.triggerAITreinoFinisher = function () {
     if (!window.trainingPlayMode) return;

     const ball = document.getElementById("circle24");
     const bx = parseFloat(ball.style.left);
     const by = parseFloat(ball.style.top);

     // seleciona só jogadores VERDES (13 a 23)
     const green = [];
     for (let i = 13; i <= 23; i++) {
         const el = document.getElementById("circle" + i);
         if (!el) continue;
         green.push({
             id: i,
             el,
             x: parseFloat(el.style.left),
             y: parseFloat(el.style.top)
         });
     }

     // encontra o mais próximo da bola
     let best = null;
     let bestDist = 99999;
     for (const p of green) {
          const d = Math.hypot(p.x - bx, p.y - by);
        if (d < bestDist) {
             bestDist = d;
             best = p;
         }
     }
     if (!best) return;

     // jogador verde corre até a bola
     const steps = 28;
     const dur = 380;
     let n = 0;
     const stepX = (bx - best.x) / steps;
     const stepY = (by - best.y) / steps;

     const interval = setInterval(() => {
         n++;
         best.x += stepX;
         best.y += stepY;
		 moveElement(best.id, best.x, best.y);

         if (n >= steps) {
             clearInterval(interval);
             aiKickBallLeft();
         }
     }, dur / steps);
 };

 // IA chuta a bola para o GOL DA ESQUERDA
 function aiKickBallLeft() {
     const ball = document.getElementById("circle24");
     if (!ball) return;

     // força inicial do chute → direção esquerda
	 aiAutoKickTowardsLeftGoal();
	 
	 // após a bola ser chutada
	 setTimeout(() => {
     window.trainingForceShot = false;
   }, 800);
 }

function aiAutoKickTowardsLeftGoal(playerEl) {
    const ball = document.getElementById("circle24");
    const bx = parseFloat(ball.style.left);
    const by = parseFloat(ball.style.top);

    const goal = document.getElementById("gol-square");
    if (!goal) {
        console.warn("⚠️ gol-square não encontrado, chute cancelado.");
        return;
    }
    const gr = goal.getBoundingClientRect();
    const br = ball.getBoundingClientRect();

    // centro do gol
    const goalY = gr.top + (gr.height / 2);

// 💥 VELOCIDADE MONSTRA (POMBO SEM ASA)
   const dx = -18;    // muito mais força na horizontal
   const dy = (goalY - br.top) * 0.09; // correção vertical mais agressiva

   // 🌀 EFEITO DE ROTAÇÃO (rosca / trivela)
   // cria leve curvatura na bola conforme ela chega perto do gol
   let spin = (Math.random() * 2 - 1) * 0.6;   // rotação leve aleatória
   ball.style.transition = "transform 0.15s linear";
   ball.style.transform = `rotate(${spin}rad)`;  // faz a bola girar

   // leva essa rotação para o deslocamento físico
   const curve = (Math.random() * 2 - 1) * 0.8;
   ballVelocity.x = dx + curve;     // desvia durante a viagem
   ballVelocity.y = dy + curve * 0.4;  // chance de fazer “subir e cair”

   // 🪄 ANIMAÇÃO NO AR — sobe um pouco e cai fortemente
   ball.style.transition = "all 0.08s linear";
   ball.style.top = (by - 12) + "px";     // pequena subida
   setTimeout(() => {                     // e queda!
     ball.style.top = (by + 18) + "px";
    }, 150);

    ballMoving = true;
}
   
function animateTeam(prefix, positions, onComplete, phase = "defesa") {
  const fieldRect = document.getElementById("background-square").getBoundingClientRect();

  // === Caminho ondulado baseado na fase ===
  const { path: sheenPath, speed } = generateSheenPath(550, 150, phase);

  let frame = 0;
  const totalFrames = sheenPath.length;

  const interval = setInterval(() => {
    const point = sheenPath[frame];
    if (!point) {
      clearInterval(interval);
      if (onComplete) onComplete();
      return;
    }

    positions.forEach((p, idx) => {
      const el = document.getElementById(prefix + p.id);
      if (!el) return;

      const offsetY = Math.sin((frame / 6) + idx / 2) * 5;
      const offsetX = Math.cos((frame / 10) + idx / 3) * 2;

      moveElement(p.id, point.x + offsetX, point.y + offsetY);
    });

    frame++;
  }, speed);
}


/**
 * Anima a transição entre duas formações (ex: 4-4-2 → 4-3-3)
 * usando uma curva Sheen & Ghain (ش غ).
 */
function animateFormationTransition(prefix, fromFormation, toFormation, phase = "transicao", mode = "match") {
  const field = document.getElementById("background-square");
  const rect = field.getBoundingClientRect();
  
 const currentPos = {};
 document.querySelectorAll(`.${prefix}`).forEach(el => {
   const id = parseInt(el.id.replace(prefix, ""));
   currentPos[id] = {
     left: parseFloat(el.style.left),
     top:  parseFloat(el.style.top)
   };
 });

 // Gera a trajetória Sheen → Ghain → Diagonal
 const isTraining = mode === "training";
 const { path: sheenPath, speed } = window.generateSheenPath(
   isTraining ? 150 : 300,   // movimento mais curto no treino
   isTraining ? 30 : 50,     // menos oscilação
   phase,
   true
 );

  const fieldCenterX = rect.width / 2;
  const totalFrames = sheenPath.length;
  let frame = 0;

  const interval = setInterval(() => {
    const point = sheenPath[frame];
    if (!point) {
      clearInterval(interval);
      return;
    }

    // Interpola cada jogador entre as formações
    for (let i = 0; i < toFormation.length; i++) {
      const player = toFormation[i];
      const el = document.getElementById(prefix + player.id);
      if (!el) continue;

      const from = fromFormation.find(f => f.id === player.id);
      if (!from) continue;

      const progress = frame / totalFrames;
      const lerpX = from.prefferedZone[0] + (player.prefferedZone[0] - from.prefferedZone[0]) * progress;
      const lerpY = from.prefferedZone[1] + (player.prefferedZone[1] - from.prefferedZone[1]) * progress;

      // Oscilação leve durante movimento
      const offsetX = Math.cos((frame / 8) + i / 2) * 3;
      const offsetY = Math.sin((frame / 8) + i / 3) * 3;

      // Recentrar o time (Carlos Alberto Silva Style)
      const centerOffsetX = 0; // fieldCenterX - 300; // 600/2 - referência base
	
	  moveElement(player.id, (lerpX + point.x / 10 + offsetX), (lerpY + point.y / 10 + offsetY));

    }

    frame++;
  }, speed);
}

window.animateFormationTransition = animateFormationTransition;



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
	const fieldRect = document.getElementById("background-square").getBoundingClientRect();
    moveElement(p.id, p.left, p.top);
    p.left = Math.max(20, Math.min(580, newX));
  });
}

// ======================================================
// 🔍 PEGAR POSIÇÕES DO GUARANI — GUARDIÃO DO VISION 🔰
// ======================================================
function getGuaraniPositions() {
  const green = [];
  for (let i = 13; i <= 23; i++) {
    const el = document.getElementById("circle" + i);
    if (!el) continue;

    green.push({
      id: i,
      left: parseFloat(el.style.left) || 0,
      top: parseFloat(el.style.top) || 0
    });
  }
  return green;
}

// ======================================================
// DETECTA ELO TÁTICO NO CAMPO (ZAGA / MEIO / ATAQUE)
// ======================================================
function detectEloFormation(players, maxDist = 45) {
  if (!players || players.length < 4) return null;

  const roles = { zaga: [], meio: [], ataque: [] }; // AGORA FOI DECLARADO!
  const clusters = [];
  const visited = new Set();

  function bfsCluster(startIdx) {
    const queue = [players[startIdx]];
    const cluster = [];
    visited.add(startIdx);

    while (queue.length > 0) {
      const current = queue.shift();
      cluster.push(current);

      for (let i = 0; i < players.length; i++) {
        if (visited.has(i)) continue;
        const dx = players[i].left - current.left;
        const dy = players[i].top - current.top;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= maxDist) {
          visited.add(i);
          queue.push(players[i]);
        }
      }
    }
    return cluster;
  }

  // 🧊 monta clusters automáticos
  for (let i = 0; i < players.length; i++) {
    if (!visited.has(i)) {
      const cluster = bfsCluster(i);
      if (cluster.length >= 2) clusters.push(cluster);
    }
  }

// 📌 Coordenadas do campo (frações reais: 2/8 e 5/8)
const FIELD_WIDTH = 600;
const DEF_LIMIT = FIELD_WIDTH * (2/8);   // 150px
const MID_LIMIT = FIELD_WIDTH * (5/8);   // 375px

clusters.forEach(cluster => {
  const avgX = cluster.reduce((s, p) => s + p.left, 0) / cluster.length;

  // 1️⃣ Primeiro identifica a ZONA
  let zone = "ATT";
  if (avgX < DEF_LIMIT)      zone = "DEF";
  else if (avgX < MID_LIMIT) zone = "MID";

  // 2️⃣ Depois avalia TAMANHO do cluster
  if (zone === "DEF") {
    roles.zaga.push(...cluster);
  } 
  else if (zone === "MID") {
    roles.meio.push(...cluster);
  } 
  else {
    roles.ataque.push(...cluster);
  }
});


  return roles;
}

if (typeof window !== "undefined") {
  window.detectEloFormation = detectEloFormation;
}


// =====================================================
// INTERPRETA A FORMAÇÃO BASEADO NO ELO
// =====================================================
function interpretFormation(roles) {
  const z = roles.zaga?.length || 0;
  const m = roles.meio?.length || 0;
  const a = roles.ataque?.length || 0;

  // Reconhecimento automático de padrões profissionais
  if (z === 4 && m === 3 && a === 3) return "4-3-3";
  if (z === 4 && m === 1 && a === 4) return "4-1-4-1";
  if (z === 4 && m === 4 && a === 2) return "4-4-2";
  if (z === 4 && m === 2 && a === 4) return "4-2-4";
  if (z === 4 && m === 3 && a === 2) return "4-1-3-2";  // sua formação atual!
  if (z === 3 && m === 5 && a === 2) return "3-5-2";
  if (z === 5 && m === 3 && a === 2) return "5-3-2";

  // Fallback moderno (não fica preso em 4-4-2)
  return `${z}-${m}-${a}`;
}

if (typeof window !== "undefined") {
  window.interpretFormation = interpretFormation;
}

// ==============================================================
// 1) ANÁLISE POR TERÇOS DO CAMPO – ESTRUTURA BÁSICA
// ==============================================================
function analyzeFieldThirds(players) {
  const FIELD_WIDTH = 600;

  // NOVA DIVISÃO REAL – 2/8, 3/8, 3/8
  const DEF_LIMIT = FIELD_WIDTH * (2/8);   // 150px
  const MID_LIMIT = FIELD_WIDTH * (5/8);   // 375px

  const def = players.filter(p => p.left < DEF_LIMIT).length;
  const mid = players.filter(p => p.left >= DEF_LIMIT && p.left < MID_LIMIT).length;
  const att = players.filter(p => p.left >= MID_LIMIT).length;

  return { def, mid, att, shape: `${def}-${mid}-${att}` };
}


window.analyzeFieldThirds = analyzeFieldThirds;


// ======================================================
// IDENTIFICA GOLEIRO: jogador mais recuado do time
// ======================================================
function findGoalkeeper(players) {
  if (!players || players.length === 0) return null;
  // O mais à esquerda (time branco atacando da esquerda pra direita)
  return players.reduce((gk, p) => (p.left < gk.left ? p : gk), players[0]);
}

window.findGoalkeeper = findGoalkeeper;


// ==============================================================
// 2) SISTEMA TÁTICO HÍBRIDO – TERÇO + ELO + VISION
// ==============================================================
function detectHybridFormation(players) {
  if (window.isTrainingMode) {
  console.log("🚫 Híbrido desativado – modo treino!");
  return window.lastVisionFormation || "4-4-2";
  }
  if (!players || players.length < 4) return "indefinido";

  // 🧤 EXCLUIR O GOLEIRO DOS CÁLCULOS TÁTICOS
  const gk = findGoalkeeper(players);
  const playersNoGK = players.filter(p => p !== gk);
  console.log("🧤 Goleiro detectado:", gk);

  // 1️⃣ TERÇOS DO CAMPO – BASE
  const thirds = analyzeFieldThirds(playersNoGK);
  console.log("📊 Terços:", thirds.shape);

  // 2️⃣ ELO – SE TIVER, USA COMO VOTO (NÃO MAIS PRIORIDADE)
  const roles = detectEloFormation(playersNoGK);
  let eloFormation = null;
  if (roles && Object.values(roles).some(arr => arr.length > 0)) {
    eloFormation = interpretFormation(roles);
    console.log("🧠 ELO detectado:", eloFormation);
  }

  // 🏆 VOTAÇÃO ENTRE MÉTODOS
  const votes = {};
  const VALID_FORMATIONS = [
    '4-4-2', '4-1-4-1',
    '4-3-3', '4-2-3-1',
    '4-2-4', '3-5-2',
    '5-4-1', '4-5-1',
    '3-4-3', '5-3-2'
  ];

  const addVote = (form, weight) => {
    if (form && VALID_FORMATIONS.includes(form)) {
      votes[form] = (votes[form] || 0) + weight;
    }
  };

  // 👍 TERÇOS — peso 2
  addVote(thirds.shape, 2);

  // 👍 VISION — peso 2
  addVote(window.lastVisionFormation, 2);

  // 👍 ELO — peso 1 (se existir)
  if (eloFormation) addVote(eloFormation, 1);

  console.log("📊 VOTAÇÃO:", votes);

  // 🏆 Resultado final (quem tem mais votos)
  const bestFormation = Object.keys(votes)
    .sort((a, b) => votes[b] - votes[a])[0] || "4-4-2";

  console.log("🏆 Formação escolhida por votação:", bestFormation);

  return bestFormation;  // <-- AGORA É O ÚNICO return!!!
}


window.detectHybridFormation = detectHybridFormation;

function clearDebugVisual() {
  document.querySelectorAll(".debug-marker, .debug-line").forEach(el => el.remove());
  console.log("🧽 Debug visual LIMPO!");
}

// ============================================================
// DEBUG VISUAL – sem quebrar drag – compatível com ELO
// ============================================================
function debugVisual(players) {
  const field = document.getElementById("background-square");
  if (!field) return;

  // Remove debug anterior
  document.querySelectorAll(".debug-marker, .debug-line").forEach(el => el.remove());

  const FIELD_WIDTH = field.clientWidth || 600;
  const FIELD_HEIGHT = field.clientHeight || 300;

  // 🧠 NOVA DIVISÃO DO CAMPO — 2/8 - 3/8 - 3/8
  const DEF_LIMIT = FIELD_WIDTH * (2/8);  // 150px
  const MID_LIMIT = FIELD_WIDTH * (5/8);  // 375px

  // === DESENHA AS NOVAS LINHAS AMARELAS ===
  [DEF_LIMIT, MID_LIMIT].forEach(x => {
    const line = document.createElement("div");
    line.className = "debug-line";
    line.style.position = "absolute";
    line.style.left = x + "px";
    line.style.top = "0px";
    line.style.width = "2px";
    line.style.height = FIELD_HEIGHT + "px";
    line.style.background = "rgba(255, 255, 0, 0.7)";
    field.appendChild(line);
  });

  // === MARCA TODOS OS JOGADORES COM SETOR ===
  players.forEach(player => {
    const label =
      player.left < DEF_LIMIT ? "DEF" :
      player.left < MID_LIMIT ? "MID" :
      "ATT";

    createMarker(player, "white", label);
  });

  // === LINHA MÉDIA DA ZAGA (Se existir Elo detectado) ===
  const elo = detectEloFormation(players);
  if (elo?.zaga && elo.zaga.length >= 2) {
    const avgY = elo.zaga.reduce((s, p) => s + p.top, 0) / elo.zaga.length;
    const lineZ = document.createElement("div");
    lineZ.className = "debug-line";
    lineZ.style.position = "absolute";
    lineZ.style.left = "0px";
    lineZ.style.top = avgY + "px";
    lineZ.style.width = FIELD_WIDTH + "px";
    lineZ.style.height = "2px";
    lineZ.style.background = "rgba(255, 0, 0, 0.6)";
    field.appendChild(lineZ);

    elo.zaga.forEach(p => createMarker(p, "red", "ZAG"));
  }

  // === FUNÇÃO AUXILIAR ===
  function createMarker(p, color, text) {
    const el = document.createElement("div");
    el.className = "debug-marker";
    el.style.position = "absolute";
    el.style.left = p.left + "px";
    el.style.top = p.top + "px";
    el.style.padding = "2px 6px";
    el.style.borderRadius = "8px";
    el.style.background = color;
    el.style.color = "black";
    el.style.fontSize = "10px";
    el.style.transform = "translate(-50%, -50%)";
    el.style.zIndex = 9999;
    el.innerText = text;
    field.appendChild(el);
  }
}

// Permite usar no console:
window.debugVisual = debugVisual;

function interpretFormation(roles) {
  const z = roles.zaga?.length || 0;
  const m = roles.meio?.length || 0;
  const a = roles.ataque?.length || 0;

  // 4-1-3-2 (variação moderna do 4-4-2 losango)
  if (z === 4 && m === 3 && a === 2) return "4-1-3-2";

  // 4-3-3 clássico
  if (z === 4 && m === 3 && a === 3) return "4-3-3";

  // 4-1-4-1
  if (z === 4 && m === 4 && a === 1) return "4-1-4-1";

  // fallback moderno
  return `${z}-${m}-${a}`;
}


// ======================================================
// 🧠 ANALISAR TÁTICA (CHAMA BACKEND /ai/analyze)
// Aceita string ("4-4-2") ou objeto { opponentFormation, trainingMode }
// ======================================================
async function analyzeFormation(config) {
  let payload = {};

  if (typeof config === "string") {
    // chamada antiga: analyzeFormation("4-4-2")
    payload.opponentFormation = config;
  } else if (config && typeof config === "object") {
    // chamada nova: analyzeFormation({ opponentFormation, trainingMode })
    payload = { ...config };
  }

  payload.tacticalRoles = circleTacticalState;
  payload.room = window.currentRoomCode || null;

  const res = await fetch("https://guaranifc.onrender.com/ai/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  return data;
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
      body: JSON.stringify({ fieldImage, possession, ball, green, black, tacticalRoles: circleTacticalState })
    });

    const data = await res.json();
    console.log("📊 Visão Tática (backend):", data);

    // 🟡 SALVAR POSIÇÕES DO TIME ADVERSÁRIO PRA DEBUG VISUAL
	window.lastBlackPositions = black;  // black já está pegado antes no código
	
	// 🧪 🔍 DEBUG VISUAL — marca clusters, setores e zaga detectada
	if (typeof debugVisual === "function") {
	console.log("🔍 Debug Visual ativado com lastBlackPositions");
		debugVisual(window.lastBlackPositions);
	} else {
		console.warn("⚠ debugVisual() não encontrada no escopo!");
	}

    // ✅ Move o Verde pela visão da IA
    if (Array.isArray(data.green) && data.green.length > 0) {
      animateTeam("circle", data.green);

      applyDynamicBlocks(
        data.green,
        data.phase?.toLowerCase() || "defesa",
        data.opponentFormation || "4-4-2"
      );
    }

	// 🆕 Move / Atualiza o adversário visualmente
	if (Array.isArray(data.black) && data.black.length > 0) {
	animateTeam("circleOpp", data.black);  // <--- ISSO FALTAVA!
	}

    return data;
  } catch (err) {
    console.error("❌ Erro ao enviar imagem para IA Vision:", err);
  }
}

    window.animateTeam = animateTeam;
    window.getOpponentPositions = getOpponentPositions;


    // Garantir que notify é global
if (typeof window !== "undefined") {
  window.notify = notify;
}


// ====== Expor funções da IA para o FRONT ======
if (typeof window !== "undefined") {
  if (typeof sendVisionTactic === "function")     window.sendVisionTactic     = sendVisionTactic;
  if (typeof getGuaraniPositions === "function")  window.getGuaraniPositions  = getGuaraniPositions;
  if (typeof analyzeFormation === "function")     window.analyzeFormation     = analyzeFormation;
  if (typeof detectEloFormation === "function")   window.detectEloFormation  = detectEloFormation;

  console.log("⚡ Funções IA disponíveis para o front-end");
}

// ============================================================
// ANALISAR FORMAÇÃO — ENVIA PARA O BACKEND /ai/analyze
// ============================================================
async function analyzeFormation() {
  // 1) Coleta os jogadores adversários (black)
  const black = getOpponentPositions();
  if (!black || black.length === 0) {
    console.warn("❌ analyzeFormation(): sem jogadores.");
    return null;
  }

  // 2) Detecta formação TÁTICA AVANÇADA (ELO + terços + GK)
  const hybridFormation = detectHybridFormation(black);
  console.log("🧠 Formação híbrida detectada:", hybridFormation);

  // 3) Monta o body do POST — envia também tacticalRoles se tiver
  const body = {
    opponentFormationVision: hybridFormation,
    tacticalRoles: window.circleTacticalState || {},
    black,
    ball: window.lastBallPosition || {},
    room: window.currentRoomCode || null
  };

  // 4) Envia para o backend (IA)
  try {
    const response = await fetch("https://guaranifc.onrender.com/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log("📊 IA Analyze:", data);

    // 5) Recebe resposta e aplica reação tática
    if (data.green) {
      applyGreenPositions(data.green); // mover time verde no campo
    }

// 🔕 pop-up do treinador desativado no treino e no modo normal
// if (data.coachComment) showCoachComment(data.coachComment);

    return data;
  } catch (err) {
    console.error("Erro ao chamar /ai/analyze:", err);
    return null;
  }
}

// MOVIMENTAR TIME VERDE (RESPONDER NO CAMPO)
function applyGreenPositions(greenAI) {
  greenAI.forEach(p => {
    const el = document.getElementById("circle" + p.id);
    if (el) {
      el.style.left = p.left + "px";
      el.style.top  = p.top  + "px";
    }
  });
}

// ❌ BLOQUEADO DEFINITIVAMENTE
function showCoachComment(text) {
  console.log("🧠 coachComment BLOQUEADO:", text);
}


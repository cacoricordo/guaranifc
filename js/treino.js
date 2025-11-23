// js/treino.js — Jogo de Treino Tático (aprimoramento esportivo)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🔒 Estado global do treino — GARANTE que existe ANTES de analisarTentativa()
window.state = window.state || {
  active: false,
  mission: null,
  attempts: 0,
  usedHelpThisAttempt: false,
  solved: false
};

// Sanitizar agora:
let pts = Number(localStorage.getItem("inv_pts"));
let gls = Number(localStorage.getItem("inv_goals"));

if (isNaN(pts)) { pts = 0; localStorage.setItem("inv_pts", 0); }
if (isNaN(gls)) { gls = 0; localStorage.setItem("inv_goals", 0); }

window.state.points = pts;
window.state.goals = gls;
// syncHUD();

// GARANTE que o socket.io realmente conecta:
window.socket = window.socket || io();

console.log("🔌 socket.io conectado?", window.socket.connected);

// Conexão INVICTO/Supabase
const supabase = createClient(
  "https://pwaipoabevlfflqnqiqq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3YWlwb2FiZXZsZmZscW5xaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2OTY3MTksImV4cCI6MjA3ODI3MjcxOX0.14SjVGvcsd4Uta-78t_nPkSSdnhOfuynct7Lh3Jqg64"
);

let iaListenerAdded = false;

(() => {
  const MISSIONS = [
    "4-4-2", "4-3-3", "4-2-3-1", "4-2-4",
    "3-5-2", "5-4-1", "4-5-1", "3-4-3", "5-3-2", "4-1-4-1"
  ];

  // Estado do treino
  window.state = window.state || {
    active: false,
    mission: null,
    attempts: 0,           // tentativa corrente (1..4)
    usedHelpThisAttempt: false,   // pediu "treinador" antes da análise?
    solved: false,

    // placar
    points: Number(localStorage.getItem("inv_pts") || 0),
    goals:  Number(localStorage.getItem("inv_goals") || 0),
  };

  // UI
  const $btnTreino   = document.getElementById("treino-btn");
  const $pointsValue = document.getElementById("points-value");
  const $goalsValue  = document.getElementById("goals-value");
  const $starPoints  = document.getElementById("star-points");

  const $rankingModal = document.getElementById("ranking-modal");
  const $rankingClose = document.getElementById("ranking-close");
  const $rkName  = document.getElementById("rk-name");
  const $rkEmail = document.getElementById("rk-email");
  const $rkPass  = document.getElementById("rk-pass");
  const $rkSave  = document.getElementById("rk-save");
  const $rkList  = document.getElementById("rk-list");
  const rkTabs   = Array.from(document.querySelectorAll(".rk-tab"));

  const API_BASE = location.origin.includes("onrender.com") || location.origin.includes("localhost")
    ? location.origin
    : "https://guaranifc.onrender.com";

  // Helpers
  function notifyTop(msg, ms=7200){
    const n = document.getElementById("ai-notification");
    if (!n) return alert(msg);
    n.textContent = msg;
    n.style.display = "block";
    clearTimeout(n._t);
    n._t = setTimeout(() => n.style.display = "none", ms);
  }
    window.notifyTop = notifyTop;

  function syncHUD(){
    $pointsValue.textContent = window.state.points;
    $goalsValue.textContent  = window.state.goals;
    localStorage.setItem("inv_pts",   String(window.state.points));
    localStorage.setItem("inv_goals", String(window.state.goals));
  }
  window.syncHUD = syncHUD;
  syncHUD();

  function pickMission(){
    const r = Math.floor(Math.random() * MISSIONS.length);
    return MISSIONS[r];
  }

  let helpTimeout = null;
  let helpRequestCount = 0;

  // Pedido de ajuda do treinador (via chat)
  window.addEventListener("coach:help-requested", () => {
  if (!window.state.active || window.state.solved) return;

  window.state.usedHelpThisAttempt = true;

// 🧠 CONTAGEM CORRETA — VAI ATÉ **NO MÁXIMO 4**
window.state.attempts = (window.state.attempts || 0) + 1;
if (window.state.attempts > 4) window.state.attempts = 4;  // proteçao máxima
console.log(`📢 Tentativa nº ${window.state.attempts}`);

  // pontuação via ajuda
  scoreWithHelp(window.state.attempts);

  syncHUD();
  window.endTraining(true);

  setTimeout(startTraining, 1100);
});

  function startTraining(){
    window.state.active = true;
    window.state.mission = pickMission();
    window.state.attempts = 0;
    window.state.usedHelpThisAttempt = false;
    window.state.solved = false;
    window.state.attempts = 0;
    // 🧠 Ativa modo treinamento REAL
    window.isTrainingMode = true;
    // 🔐 Só adiciona 1 vez o listener da IA
    window.removeEventListener("ia:analyze:done", analisarTentativa);
    window.addEventListener("ia:analyze:done", analisarTentativa, { once: false });
    document.body.setAttribute("data-mode", "training");
          
    window.lastVisionFormation = null;
    console.log("🏋️ MODO TREINO ATIVO!");
    notifyTop(`🎯 Missão: faça a IA montar ${window.state.mission}. Mova o time de treino Branco e aperte "Análise IA".`);
      clearTimeout(helpTimeout);
	  helpTimeout = setTimeout(() => {
    if (typeof showAskForTraineeToHelp === "function") {
      showAskForTraineeToHelp();
    }
  }, 30000);
  }

function endTraining(success){
  window.state.active = false;
  // 🧮 Cálculo de pontos e saldo de gols
  const tent = window.state.attempts || 1;
  const usedHelp = window.state.usedHelpThisAttempt || false;
  let pontos = 0;
  let saldo = 0;

  if (success) {
    if (usedHelp) {
      pontos = 1;
      saldo = Math.max(3 - (tent - 1), 0);  // ajuda perde valor
    } else {
      pontos = 3;
      saldo = Math.max(3 - (tent - 1), 0);  // sem ajuda
    }
    
    // ----------------------------------------------------
    // 🏆 PATCH — MOSTRAR OVERLAY DA VITÓRIA AQUI:
    // ----------------------------------------------------
    if (typeof showVictoryOverlay === "function") {
      showVictoryOverlay(`🏆 Missão ${window.state.mission} concluída! +${pontos} pts | +${saldo} gols`);
    }
    // ----------------------------------------------------
    
  } else {
    // ⚽ Se ERROU a 4ª tentativa → IA CHUTA!
    if (tent >= 4) {
      pontos = 0;
      saldo = -1;
      triggerIAChute();        // função separada (abaixo!)
      // 🆕 NOVO: avisar que acabou e preparar próxima missão:
      notifyTop(`❌ Missão encerrada... A missão era ${window.state.mission}.  
    ⚽ IA chutou e fez -1 gol!  
    🕒 Preparando próxima missão...`);

      // ⚽ Aguarda 1s e chama o pop-up de nova missão!
      setTimeout(() => {
        if (typeof showNextMissionPopup === "function") {
          showNextMissionPopup();
        } else {
        // fallback direto pro treino
        startTraining();
        }
      }, 1200);
    }
  }

  console.log(`🏅 TREINO FINAL | Tent.: ${tent} | Pontos: ${pontos} | Saldo: ${saldo}`);

  // 📝 Mostra resultado bonito:
  const finalMsg = success
    ? `🎯 Missão cumprida! ${window.state.mission}`
    : `❌ Missão encerrada... A missão era ${window.state.mission}.`;

  notifyTop(`${finalMsg}  
  🧮 Tentativa: ${tent}  
  🏆 Pontos: ${pontos}  
  ⚽ Saldo de gols: ${saldo}`);
  
  // 🧹 RESET do treino (importante pra próxima missão!)
  window.state.attempts = 0;
  window.state.usedHelpThisAttempt = false;
  window.state.solved = false;
  window.removeEventListener("ia:analyze:done", analisarTentativa);
  window.isTrainingMode = false;

  iaListenerAdded = false;

  // ⚽ Se foi vitória → pausa antes de liberar nova missão
  if (success) {
    setTimeout(() => {
      console.log("🟢 Treino finalizado com SUCESSO. Aguardando próxima missão...");
    }, 1000);
  }
}

window.endTraining = endTraining; 

  // Regras de pontuação (SEM ajuda)
  function scoreNoHelp(attempt){
    // 1ª => +3 pts +3 gols
    // 2ª => +3 pts +2 gols
    // 3ª => +3 pts +1 gol
    // 4ª errada => -1 gol
    if (attempt === 1) { window.state.points += 3; window.state.goals += 3; }
    else if (attempt === 2) { window.state.points += 3; window.state.goals += 2; }
    else if (attempt === 3) { window.state.points += 3; window.state.goals += 1; }
    else if (attempt === 4) { window.state.points += 3; /* gols = 0 */ }
    // Se acertar na 4ª? Requisito não especificou.
    // Assumi: sem bônus de gols e sem pontos (ajuste se desejar).
  }
  
  window.scoreNoHelp = scoreNoHelp;

// ✅ Regras atualizadas (COM ajuda do treinador)
function scoreWithHelp(attempt){
  if (attempt === 1) { window.state.points += 1; window.state.goals += 3; }
  else if (attempt === 2) { window.state.points += 1; window.state.goals += 2; }
  else if (attempt === 3) { window.state.points += 1; window.state.goals += 1; }
  else if (attempt === 4) { window.state.points += 1; /* gols = 0 */ }
}

window.scoreWithHelp = scoreWithHelp;

function triggerIAChute() {
  aiKickBallLeft(); 
}

  // Clique no botão Treino
  $btnTreino?.addEventListener("click", () => {
    if (window.state.active) {
      notifyTop(`Missão em andamento: ${window.state.mission}. Aperte "Análise IA".`);
      return;
    }
    startTraining();
});

 
function showVictoryOverlay(text = "Missão encerrada! Parabéns!") {
  const overlay = document.getElementById("victory-overlay");
  const victoryText = document.getElementById("victory-text");
  const model = document.getElementById("victory-model");

  if (!overlay) {
    console.warn("⚠ overlay NÃO encontrado no DOM");
    return;
  }
  
  // 🌟 Carregar modelo GLB com segurança
  if (model) {
    model.src = "./models/vitoria.glb";       // ou /models/victoria.glb
    console.log("📦 Modelo 3D carregado:", model.src);
  } else {
    console.warn("⚠ victory-model NÃO encontrado no DOM!");
  }

  victoryText.textContent = text;
  overlay.style.display = "flex";

  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
  });
}

function closeVictoryOverlay() {
  const overlay = document.getElementById("victory-overlay");

  if (!overlay) return;

  overlay.style.opacity = "0";
  // 💡 Agora só esconde depois de clicar em OK no pop-up de missão
  setTimeout(() => {
    overlay.style.display = "none";
  }, 800);

  // 📌 NOVO POP-UP: só segue após clicar em OK
  setTimeout(() => {
    showNextMissionPopup();
  }, 900);
}

// 🆕 POP-UP NOVA MISSÃO (com botão OK)
function showNextMissionPopup() {
  const box = document.createElement("div");
  box.style = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.75);
    display:flex;
    align-items:center;
    justify-content:center;
    flex-direction:column;
    z-index:200001;
    backdrop-filter: blur(4px);
    color:white;
    font-size:1.6em;
    text-align:center;
  `;
  box.innerHTML = `
    <div>⚽ Preparado para a <b>próxima missão</b>?</div>
    <button id="btn-next-mission" style="
      margin-top:25px;
      padding:10px 20px;
      background:#28a745;
      border:none;
      border-radius:10px;
      font-size:1em;
      color:white;
      cursor:pointer;
      box-shadow:0 0 8px rgba(0,0,0,0.4);
    ">OK</button>
  `;
  document.body.appendChild(box);

  document.getElementById("btn-next-mission").onclick = () => {
    box.remove();
    if (typeof startTraining === "function") startTraining(); // 🧠 NOVA MISSÃO
  };
}

// ⚠ IMPORTANTE! Exportar para escopo global:
window.showVictoryOverlay = showVictoryOverlay;
window.closeVictoryOverlay = closeVictoryOverlay;


  // === Pop-up oferecendo ajuda do treinador ===
	function showAskForTraineeToHelp() {
	notifyTop("🧠 Quer ajuda do treinador? Escreva no chat: 'monte um 4-3-3'");
	}


// ======== RANKING (SUPABASE) ========


// Renderiza lista no modal
function renderRanking(list){
  if (!Array.isArray(list) || !list.length) {
    $rkList.innerHTML = `<div style="opacity:.8;">Sem dados ainda.</div>`;
    return;
  }

  const rows = list.map((r,i) => `
    <div style="display:grid;grid-template-columns:26px 1fr auto auto;gap:8px;padding:6px 0;border-bottom:1px solid #2a2a2a;">
      <div style="opacity:.8;">${i+1}º</div>
      <div>
        <div style="font-weight:600;">${r.name}</div>
        <div style="font-size:12px;opacity:.7;">${r.email}</div>
      </div>
      <div>⭐ ${r.points}</div>
      <div>✨ ${r.goals}</div>
    </div>
  `).join("");

  $rkList.innerHTML = rows;
}

// Carrega ranking do Supabase
async function fetchRanking(){
  const { data, error } = await supabase
    .from("ranking")
    .select("*")
    .order("points", { ascending: false })
    .limit(30);

  if (error){
    console.error(error);
    return;
  }

  renderRanking(data);
}

// Clique abre modal do ranking
$starPoints?.addEventListener("click", () => {
  $rankingModal.style.display = "flex";
  fetchRanking();
});

// Fechar modal
$rankingClose?.addEventListener("click", () => {
  $rankingModal.style.display = "none";
});

// Salvar score no Supabase (login + cadastro + upsert)
$rkSave?.addEventListener("click", async () => {
  const name  = ($rkName.value  || "").trim();
  const email = ($rkEmail.value || "").trim();
  const pass  = ($rkPass.value  || "").trim();

  if (!name || !email || !pass) {
    notifyTop("Preencha nome, e-mail e senha.");
    return;
  }

  if (pass.length < 6) {
    notifyTop("Senha deve ter no mínimo 6 caracteres.");
    return;
  }

  // 1) tenta login
  let { data: authUser, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  // 2) se não existir, cria
  if (authError?.message === "Invalid login credentials") {
    let { data: newUser, error: signupError } = await supabase.auth.signUp({
      email,
      password: pass,
    });

    if (signupError) {
      notifyTop("Erro ao criar conta.");
      console.error(signupError);
      return;
    }

    authUser = newUser;
  }

  // 3) grava score no ranking
  const { error: insertError } = await supabase
    .from("ranking")
    .upsert({
      name,
      email,
      points: window.state.points,
      goals: window.state.goals
    });

  if (insertError) {
    notifyTop("Erro ao salvar no ranking.");
    console.error(insertError);
    return;
  }

  notifyTop("Pontuação salva no ranking! ✅");
  fetchRanking();
});
})();

// 📢 Quando o treinador ajudar → animar como no modo normal
window.addEventListener("coach:help-requested", () => {
  if (!window.isTrainingMode) return;
  console.log("💬 Treinador deu ajuda — animando formação correta!");

  if (!window.state?.mission) return;

  const targetFormation = window.state.mission; // missão atual do treino
  const formations = window.FORMATIONS || {};

  const from = formations[window.lastFormation || "4-4-2"];
  const to = formations[targetFormation];

  if (from && to) {
    // 👉 animação igual ao MODO NORMAL
    animateFormationTransition("circle", from, to, "analiseTreino");
    window.lastFormation = targetFormation;
  }
});

// === FUNÇÃO PRINCIPAL DE ANÁLISE NO TREINO ===
function analisarTentativa({ detail }) {
  const st = window.state;   
  if (!st.active) return; // segurança

  const isCorrect = detail?.detectedFormation === st.mission;
  
  // 🔢 Incrementa TENTATIVAS
  st.attempts = (st.attempts || 0) + 1;
  if (st.attempts > 4) st.attempts = 4;
  console.log(`📢 Tentativa nº ${st.attempts}`);

  // 🧽 Remover debug antes da próxima tentativa
  if (typeof clearDebugVisual === "function") clearDebugVisual();

  // 🟢 ACERTOU
  if (isCorrect) {
    const saldo = Math.max(3 - (st.attempts - 1), 0);
    if (!window.state.usedHelpThisAttempt) {
    scoreNoHelp(st.attempts);
  } else {
    scoreWithHelp(st.attempts);
  }
  syncHUD();
  window.endTraining(true);

    if (typeof showVictoryOverlay === "function") {
    showVictoryOverlay(`🏆 Mandou bem! +3 pontos, +${saldo} gols`);
    }
    return;
  }

  // 🔴 ERROU
  if (st.attempts < 3) {
    notifyTop(`❌ Ainda não é ${st.mission}. Tentativa ${st.attempts}/4`);
    return;
  }

  if (st.attempts === 3) {
    notifyTop(`⚠️ Última chance! Tentativa 3/4`);
    return;
  }

  // 🟥 4ª TENTATIVA = IA CHUTA!
   if (st.attempts >= 4) {
     notifyTop(`🟥 Errou! Tentativa 4/4 — ⚽ -1 gol pró!`);
     window.state.goals -= 1;   // <— DESCONTO IMEDIATO
     syncHUD();                 // <— ATUALIZAR HUD
     window.removeEventListener("ia:analyze:done", analisarTentativa);
     window.state.active = false;
     setTimeout(() => aiKickBallLeft(), 900);
     window.endTraining(false);
     return;
   }
}


// ⚠️ NÃO use direto: const socket = window.socket;

// 🚀 Aguarda o socket existir antes de registrar o listener
function waitForSocketAndListen(attempt = 0) {
  if (attempt > 20) {
    console.warn("❌ socket.io não carregou!");
    return;
  }

  // socket ainda não existe?
  if (!window.socket || !window.socket.connected) {
    console.log("⏳ Aguardando socket...", attempt);
    return setTimeout(() => waitForSocketAndListen(attempt + 1), 300);
  }

  //quando carregar, registra:
  const socket = window.socket;
  console.log("🟢 SOCKET OK — Listener da ALEXA ativado!");

  socket.on("alexa-formation", ({ formation }) => {
    console.log("📡 Recebido via socket:", formation);
    notifyTop(`🎙️ Alexa solicitou: ${formation}`);

    const formations = window.FORMATIONS || {};
    const to = formations[formation];

    if (to) {
      animateFormationTransition("circleOpp", null, to, "alexa");
    } else {
      notifyTop("⚠️ Formação não encontrada: " + formation);
    }
  });
}

// ⏩ INICIA
waitForSocketAndListen();

// ---------------------------------------
// REGISTRADOR DE LISTENER ALEXA FINAL
// ---------------------------------------
(function ensureAlexaSocketListener() {
  function tryRegister(attempt = 0) {
    const socket = window.socket;

    if (!socket || !socket.connected) {
      console.warn(`⏳ Aguardando socket... tentativa ${attempt}`);
      return setTimeout(() => tryRegister(attempt + 1), 300);
    }

    if (socket._hasAlexaListener) {
      console.log("🔁 Listener Alexa já registrado.");
      return;
    }

    socket._hasAlexaListener = true;
    console.log("🟢 Alexa listener conectado via socket.io");

    socket.on("alexa-formation", (data) => {
      console.log("📡 RECEBIDO EVENTO ALEXA:", data);

      const formation = data?.formation || data;
      notifyTop(`🎙️ Alexa solicitou: ${formation}`);

      const formations = window.FORMATIONS || {};
      const to = formations[formation];

      if (to) {
        animateFormationTransition("circleOpp", null, to, "alexa");
      } else {
        notifyTop("⚠️ Formação não encontrada: " + formation);
      }
    });
  }

  tryRegister();
})();





// js/treino.js — Jogo de Treino Tático (aprimoramento esportivo)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getRandomLevel1 } from "../fase/level1.js";

// 🔥 CT-VIRTUAL TRAINERS (SEGURAMENTE)
window.TRAINERS = window.TRAINERS || null;

// tenta carregar do GLOBAL (trainers.js)
if (window.LEVELS) {
  window.TRAINERS = Object.values(window.LEVELS);
}

// tenta API do Go (se existir)
fetch("http://127.0.0.1:8080/api/ct-virtual/trainers")
  .then(async (r) => {
    if (!r.ok) throw new Error("API falhou");
    window.TRAINERS = (await r.json()).levels;
  })
  .catch(() => {
    console.warn("⚠ API OFF — usando trainers locais");
  });

// 🔒 Estado global do treino
window.state = window.state || {
  active: false,
  mission: null,
  attempts: 0,
  usedHelpThisAttempt: false,
  solved: false
};


  
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

async function syncWithBackend() {
  const email = localStorage.getItem("user_email");
  if (!email) return;
  
  await fetch("http://localhost:8080/api/tokens/mint-from-goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      gols_tokens: window.state.goals
    })
  });
}

async function tryMintToWallet() {
  if (!window.ethereum) return;

  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  const wallet = accounts[0];
  const gols = window.state.goals || 0;

  // 1) Envia para backend GO (banco de dados + log)
  await fetch("http://localhost:8080/api/tokens/mint-from-goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: localStorage.getItem("user_email"),
      goals_delta: gols,
      source: "training"
    })
  });

  // 2) MINT ON-CHAIN (Sepolia)
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();

  const contract = new ethers.Contract(
    GOLS_ADDRESS,
    GOLS_ERC20_ABI,
    signer
  );

  const tx = await contract.mintGoal(
    ethers.parseEther(String(gols)) // 18 decimais
  );

  await tx.wait();

  notifyTop(`🔗 ${gols} GOLS mintados on-chain! <br> Carteira: ${wallet}`, 6000);
}

async function updateHUDOnChain() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  const wallet = accounts[0];
  const contract = new ethers.Contract(GOLS_ADDRESS, GOLS_ERC20_ABI, provider);
  const balance = await contract.balanceOf(wallet);

  const gols = ethers.formatUnits(balance, 18);
  document.getElementById("goals-value").textContent = gols;  // ⚽ HUD
}
window.updateHUDOnChain = updateHUDOnChain;

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
  syncWithBackend();
  tryMintToWallet();
  updateHUDOnChain();

  setTimeout(startTraining, 1100);
});

// ===============================================================
// 📌 AJUSTE DE FORMATAÇÃO — MUITO IMPORTANTE!
// Remove espaço, hífen Unicode, caracteres invisíveis etc.
// ===============================================================
function normalizeFormation(str = "") {
  return String(str)
    .trim()
    .replace(/[–—‒_]/g, "-")  // troca HÍFENS ruins por "-"
    .replace(/\s+/g, "");     // remove TODOS os espaços
}

window.normalizeFormation = normalizeFormation;  // deixa GLOBAL


function isCorrectLevel1(mission, detected) {
  const MAP = {
    "4-3-3": ["4-4-2", "3-5-2"],
    "4-4-2": ["3-5-2", "4-3-3"],
    "3-5-2": ["4-4-2", "4-3-3"]
  };
  return MAP[mission]?.includes(detected);
}
 
// ================================================
// ✔ LÓGICA OFICIAL DE TREINADORES (por LEVEL)
// ================================================
function isCorrectLevel(mission, detectedGuarani, opponent) {
  const level    = window.gameLevel || 1;
  const trainers = window.TRAINERS || [];

  if (!trainers.length) {
    console.warn("❌ TRAINERS não carregados!");
    return false;
  }

  // Normalize everything
  mission         = normalizeFormation(mission);
  detectedGuarani = normalizeFormation(detectedGuarani);
  opponent        = normalizeFormation(opponent);

  const trainer = trainers[level - 1];

  console.log("🧪 DEBUG LEVEL:", level);
  console.log("🧪 mission:", mission);
  console.log("🧪 detectedGuarani:", detectedGuarani);
  console.log("🧪 opponent:", opponent);
  console.log("🧪 trainer:", trainer?.name);

  // LEVEL 1 — SUB-20 (comparação pelo adversário)
  if (level === 1) {
    const valid = trainer.validAnswers?.[mission];
    return valid ? valid.includes(opponent) : false;
  }

  // LEVEL 2 — CARLOS ALBERTO SILVA (comparação pelo GUARANI)
  if (level === 2) {
    return trainer.responseTo?.[mission] === detectedGuarani;
  }

  // LEVEL 3 — TELÊ SANTANA (comparação PELO ADVERSÁRIO!)
  if (level === 3) {
    return trainer.responseTo?.[mission] === opponent;
  }

  // LEVEL 4–5 — filosofia real → comparação pelo GUARANI
  if (level >= 4) {
    return trainer.responseTo?.[mission] === detectedGuarani;
  }
  
  if (window.gameLevelUp) {
   const nft = window.TRAINERS_NFT.find(t => t.id === window.gameLevelUp);
   if (nft) {
      // salva NFT no localStorage
      const bag = JSON.parse(localStorage.getItem("inv_nft") || "[]");
      bag.push(nft);
      localStorage.setItem("inv_nft", JSON.stringify(bag));

      notifyTop(`🃏 Você ganhou o NFT: ${nft.name}!`);
   }
}

  return false;
}

window.isCorrectLevel = isCorrectLevel;

function startTraining() {
  if (!TRAINERS) {
    console.warn("⏳ Aguardando treinadores carregarem...");
    setTimeout(startTraining, 500);
    return;
  }
  window.gameLevel = window.gameLevel || 1;
  window.state.active = true;
  window.state.attempts = 0;
  window.state.usedHelpThisAttempt = false;
  window.state.solved = false;
  window.isTrainingMode = true;

  // 🎯 A MISSÃO (ex: 4-3-3, 3-5-2...)
  window.state.mission = getRandomLevel1();

  // 🧠 PEGA O TREINADOR ATUAL
  const L = TRAINERS 
    ? TRAINERS[window.gameLevel - 1] 
    : (typeof LEVELS !== "undefined" ? LEVELS[window.gameLevel] : null);

  // 🤔 Garantia de segurança
  if (!L) console.warn("‼ Nenhum treinador encontrado! Check LEVELS/API.");

  // 🔥 HUD DO TREINADOR ATIVO
  notifyTop(`
    🧠 Treinador: <b>${L?.name || "Modo Sub-20"}</b><br>
    📌 Filosofia: ${L?.philosophy || "Aprendizado tático inicial (2 respostas possíveis)"}<br>
    🎯 Missão: <u>${window.state.mission}</u>
  `);

  // 🔄 Eventos de análise da IA
  window.removeEventListener("ia:analyze:done", analisarTentativa);
  window.addEventListener("ia:analyze:done", analisarTentativa);

  document.body.setAttribute("data-mode", "training");
  window.lastVisionFormation = null;

  console.log("🏋️ MODO TREINO ATIVO!", "Level:", window.gameLevel);

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
    
// === SISTEMA INVICTO — HAT TRICK TÁTICO ===
if (success) {
  window.state.correctsStreak = (window.state.correctsStreak || 0) + 1;  
} else {
  window.state.correctsStreak = 0; // ERROU? ZERA TUDO!
}

console.log("🎯 Sequência de acertos:", window.state.correctsStreak);

// === HAT-TRICK? → SUBIR DE FASE ===
if (window.state.correctsStreak >= 3) {
  window.gameLevel = 2;
  notifyTop("💥 HAT-TRICK TÁTICO! CT PROFISSIONAL DESBLOQUEADO!");
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
      triggerIAChute();
      // 🆕 Próxima missão:
      notifyTop(`❌ Missão encerrada... A missão era ${window.state.mission}.  
    ⚽ IA chutou e fez -1 gol!  
    🕒 Preparando próxima missão...`);

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
  
  if (model) {
    model.src = "./models/vitoria.glb";
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
  setTimeout(() => {
    overlay.style.display = "none";
  }, 800);

  setTimeout(() => {
    showNextMissionPopup();
  }, 900);
}

// 🆕 POP-UP NOVA MISSÃO
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

window.showVictoryOverlay = showVictoryOverlay;
window.closeVictoryOverlay = closeVictoryOverlay;


// === Pop-up oferecendo ajuda do treinador ===
function showAskForTraineeToHelp() {
	notifyTop("🧠 Quer ajuda do treinador? Escreva no chat: 'monte um 4-3-3'");
}


// ======== RANKING (SUPABASE) ========
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
      <div>💰 ${r.goals}</div>
    </div>
  `).join("");

  $rkList.innerHTML = rows;
}

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

$starPoints?.addEventListener("click", () => {
  $rankingModal.style.display = "flex";
  fetchRanking();
});

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

  let { data: authUser, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

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
// ⚽ ANÁLISE DA TENTATIVA (função principal)
function analisarTentativa({ detail }) {
  const st = window.state;
  if (!st.active) return;

  // 👀 Formação detectada pela IA:
  const detected = detail?.detectedFormation;
  const opponent = detail?.opponentFormation;
  console.log("🔍 FORMAÇÃO DETECTADA:", detected);
  console.log("🎯 MISSÃO:", st.mission);
  console.log("📌 NÍVEL ATUAL:", window.gameLevel);
  
  // LOG DEBUG MUITO IMPORTANTE:
console.log("🎯 LOG VERDADEIRO DA RODADA");
console.log("mission                =", st.mission, st.mission.length);
console.log("detectedFormation     =", detected, detected.length);
console.log("opponentFormation     =", opponent, opponent.length);
console.log("normalize(mission)    =", normalizeFormation(st.mission));
console.log("normalize(detected)   =", normalizeFormation(detected));
console.log("normalize(opponent)   =", normalizeFormation(opponent));
console.log("✔ RESPOSTA FINAL      =", isCorrectLevel(st.mission, detected, opponent));

  // =======================================================
  // 🧠 VALIDAR POR LEVEL (o coração do CT Virtual!)
  // =======================================================
  let isCorrect = false;

  if (typeof isCorrectLevel === "function") {
    isCorrect = isCorrectLevel(st.mission, detected, opponent);
  } else {
    console.error("❌ ERRO: 'isCorrectLevel' NÃO ENCONTRADA!");
  }

  console.log("✔ É CORRETO?", isCorrect);
  // =======================================================

  // 🔢 Incrementa tentativas
  st.attempts = (st.attempts || 0) + 1;
  if (st.attempts > 4) st.attempts = 4;
  console.log(`📢 Tentativa nº ${st.attempts}`);

  // limpa debug visual (se existir)
  if (typeof clearDebugVisual === "function") clearDebugVisual();

  // ==========================================
  // 🟢 ACERTOU → PONTUAÇÃO + HAT-TRICK
  // ==========================================
  if (isCorrect) {
    let saldo = Math.max(3 - (st.attempts - 1), 0);

    if (!st.usedHelpThisAttempt) scoreNoHelp(st.attempts);
    else scoreWithHelp(st.attempts);

    syncHUD();

    // 🧠 CONTAGEM DE ACERTOS CONSECUTIVOS
    st.correctsStreak = (st.correctsStreak || 0) + 1;

    // SUBIR DE NIVEL COM 3 ACERTOS (HAT-TRICK TÁTICO!)
    if (st.correctsStreak >= 3) {
      window.gameLevel = Math.min(window.gameLevel + 1, 5);
      notifyTop(`💥 HAT-TRICK TÁTICO! Você evoluiu para o nível ${window.gameLevel}!`);
      st.correctsStreak = 0;
    }

    // Finalizar Treino
    window.endTraining(true);
    if (typeof showVictoryOverlay === "function") {
      showVictoryOverlay(`🏆 Mandou bem! +3 pontos, +${saldo} gols`);
    }
    return;
  }

  // ==========================================
  // 🔴 ERROU → ZERAR STREAK e continuar
  // ==========================================
  st.correctsStreak = 0;

  if (st.attempts < 3) {
    notifyTop(`❌ Ainda não é ${st.mission}. Tentativa ${st.attempts}/4`);
    return;
  }

  if (st.attempts === 3) {
    notifyTop(`⚠️ Última chance! Tentativa 3/4`);
    return;
  }

  // ==========================================
  // 🟥 TENTATIVA FINAL → IA CHUTA A BOLA!
  // ==========================================
  if (st.attempts >= 4) {
    notifyTop(`🟥 4/4 — ⚽ -1 gol pró!`);
    st.goals = (st.goals || 0) - 1;
    syncHUD();

    window.removeEventListener("ia:analyze:done", analisarTentativa);
    st.active = false;

    setTimeout(() => aiKickBallLeft(), 900);
    window.endTraining(false);
    return;
  }
}



window.state.mission = getRandomLevel1();

window.pickLevel1Mission = function () {
  const level1 = ["4-3-3","4-4-2","3-5-2"];
  return level1[Math.floor(Math.random() * level1.length)];
};


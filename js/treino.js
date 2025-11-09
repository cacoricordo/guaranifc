// js/treino.js — Jogo de Treino Tático (missões + pontuação + ranking)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Conexão INVICTO/Supabase
const supabase = createClient(
  "https://pwaipoabevlfflqnqiqq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3YWlwb2FiZXZsZmZscW5xaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2OTY3MTksImV4cCI6MjA3ODI3MjcxOX0.14SjVGvcsd4Uta-78t_nPkSSdnhOfuynct7Lh3Jqg64"
);

(() => {
  const MISSIONS = [
    "4-4-2", "4-3-3", "4-2-3-1", "4-2-4",
    "3-5-2", "5-4-1", "4-5-1", "3-4-3", "5-3-2", "4-1-4-1"
  ];

  // Estado do treino
  const state = {
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

  function syncHUD(){
    $pointsValue.textContent = state.points;
    $goalsValue.textContent  = state.goals;
    localStorage.setItem("inv_pts",   String(state.points));
    localStorage.setItem("inv_goals", String(state.goals));
  }
  syncHUD();

  function pickMission(){
    const r = Math.floor(Math.random() * MISSIONS.length);
    return MISSIONS[r];
  }

  let helpTimeout = null;
  let helpRequestCount = 0;

  // Pedido de ajuda do treinador (via chat)
  window.addEventListener("coach:help-requested", () => {
  if (!state.active || state.solved) return;

  state.usedHelpThisAttempt = true;

  // força contabilizar tentativa ao pedir ajuda
  state.attempts = Math.min(4, state.attempts + 1);

  // pontuação via ajuda
  scoreWithHelp(state.attempts);

  syncHUD();
  endTraining(true);

  setTimeout(startTraining, 1100);
});

  function startTraining(){
    state.active = true;
    state.mission = pickMission();
    state.attempts = 0;
    state.usedHelpThisAttempt = false;
    state.solved = false;
    notifyTop(`🎯 Missão: faça a IA montar ${state.mission}. Mova o time de treino Branco e aperte "Análise IA".`);
      clearTimeout(helpTimeout);
  helpTimeout = setTimeout(() => {
    if (typeof showAskForTraineeToHelp === "function") {
      showAskForTraineeToHelp();
    }
  }, 30000);
  }

  function endTraining(success){
    state.active = false;
    if (success) {
      notifyTop(`✅ Missão cumprida! ${state.mission}`);
    } else {
      notifyTop(`❌ Missão encerrada. A missão era ${state.mission}.`);
    }
  }

  // Regras de pontuação (SEM ajuda)
  function scoreNoHelp(attempt){
    // 1ª => +3 pts +3 gols
    // 2ª => +3 pts +2 gols
    // 3ª => +3 pts +1 gol
    // 4ª errada => -1 gol
    if (attempt === 1) { state.points += 3; state.goals += 3; }
    else if (attempt === 2) { state.points += 3; state.goals += 2; }
    else if (attempt === 3) { state.points += 3; state.goals += 1; }
    // Se acertar na 4ª? Requisito não especificou.
    // Assumi: sem bônus de gols e sem pontos (ajuste se desejar).
  }

// ✅ Regras atualizadas (COM ajuda do treinador)
function scoreWithHelp(attempt){
  if (attempt === 1) { state.points += 1; state.goals += 3; }
  else if (attempt === 2) { state.points += 1; state.goals += 2; }
  else if (attempt === 3) { state.points += 1; state.goals += 1; }
  else if (attempt === 4) { state.points += 1; /* gols = 0 */ }
}

  // Clique no botão Treino
  $btnTreino?.addEventListener("click", () => {
    if (state.active) {
      notifyTop(`Missão em andamento: ${state.mission}. Aperte "Análise IA".`);
      return;
    }
    startTraining();
  });

  // Resultado da IA após “Análise IA”
  window.addEventListener("ia:analyze:done", (ev) => {
    if (!state.active || state.solved) return;
    const data = ev.detail || {};
    const detected = (data?.detectedFormation || "").trim();
    if (!detected) return;

    // Contabiliza tentativa
    state.attempts = Math.min(4, state.attempts + 1);

    // Acertou a missão?
    const success = detected === state.mission;

    if (success) {
      if (state.usedHelpThisAttempt) {
        scoreWithHelp(state.attempts);
      } else {
        scoreNoHelp(state.attempts);
      }
      syncHUD();
      state.solved = true;
      endTraining(true);

      // auto-encadeia nova missão (opcional). Comente se não quiser.
      setTimeout(startTraining, 1100);
      return;
    }

    // Errou
    if (state.attempts < 3) {
      // Ainda tem tentativas “normais”
      notifyTop(`❌ Ainda não é ${state.mission}. Tentativa ${state.attempts}/3.`);
      // reset ajuda p/ próxima tentativa
      state.usedHelpThisAttempt = false;
      return;
    }

    if (state.attempts === 3) {
      // Oferece “última tentativa” (4ª)
      notifyTop(`⚠️ Última chance opcional (4ª). Se errar, perde 1 gol pró. Ajuste e aperte "Análise IA" de novo.`);
      // reset ajuda p/ próxima tentativa
      state.usedHelpThisAttempt = false;
      return;
    }

    // 4ª tentativa e errou ⇒ penalidade
    if (state.attempts >= 4) {
      state.goals = Math.max(0, state.goals - 1);
      syncHUD();
      notifyTop(`🚫 4ª errada: -1 gol pró. Missão encerrada.`);
      endTraining(false);
    }
  });

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

// Salvar score + auth
$rkSave?.addEventListener("click", async () => {

  const name  = ($rkName.value  || "").trim();
  const email = ($rkEmail.value || "").trim();
  const pass  = ($rkPass.value  || "").trim();

  if (!name || !email || !pass) {
    notifyTop("Preencha nome, e-mail e senha.");
    return;
  }

  // 1 — login / signup (automático)
  const { data: authUser, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  }).catch(async () => {
    return supabase.auth.signUp({ email, password: pass });
  });

  if (authError) {
    notifyTop("Erro na autenticação.");
    console.error(authError);
    return;
  }

  // 2 — grava score no banco
  if (error){
    notifyTop("Erro ao salvar no ranking.");
    console.error(error);
  } else {
    notifyTop("Pontuação salva no ranking! ✅");
    fetchRanking();
  }
});

})();


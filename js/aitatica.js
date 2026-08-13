// === Aitatica.js — IA Tática v13.3 ===


// Arquivo final com escopo correto (com base no BACKUP)

// fallback de notify para não quebrar a IA
if (typeof notify !== "function") {
  window.notify = (msg, time = 2500) => {
    console.warn("notify():", msg);
  };
}

// ===============================
// ⚽ 1. Garantir carregamento de FORMATIONS
// ===============================
async function ensureFormationsReady() {
  if (window.FORMATIONS) return true;

  console.warn("⏳ FORMATIONS ainda não pronto. Aguardando evento...");

  return new Promise((resolve) => {

    window.addEventListener("formations_ready", () => {
      console.log("🔥 FORMATIONS prontas por EVENTO!");
      resolve(true);
    }, { once: true });

    let tries = 0;
    const interval = setInterval(() => {
      if (window.FORMATIONS) {
        clearInterval(interval);
        console.log("🔥 FORMATIONS prontas por POLLING!");
        resolve(true);
      }
      if (tries++ > 40) {
        clearInterval(interval);
        console.error("❌ FORMATIONS não carregou!");
        resolve(false);
      }
    }, 200);
  });
}

// ============================
// 📌 HUD TÁTICO – elementos do DOM
// ============================
 const hudBox        = document.getElementById("tactical-hud");
 const hudFormations = document.getElementById("hud-formations");
 const hudPhase      = document.getElementById("hud-phase");
 const hudBlock      = document.getElementById("hud-block");

if (!hudBox) {
  console.warn("⚠ hudBox não encontrado no DOM!");
}

// ============================
// ♻️ HELIA CACHE (anti-flood)
// ============================
const HELIA_CACHE_TTL = 15000; // 15s para repetir sem chamar Vision

function normalizePositions(list = []) {
  return list.map((p) => ({
    id: p.id,
    left: Math.round((Number(p.left) || 0) * 10) / 10,
    top: Math.round((Number(p.top) || 0) * 10) / 10
  }));
}

function captureHeliaSnapshot() {
  const green = typeof getGuaraniPositions === "function" ? normalizePositions(getGuaraniPositions() || []) : [];
  const black = typeof getOpponentPositions === "function" ? normalizePositions(getOpponentPositions() || []) : [];
  const ball = typeof getBall === "function" ? getBall() : null;
  return { green, black, ball };
}

function heliaKey(snapshot) {
  try {
    return JSON.stringify(snapshot);
  } catch {
    return null;
  }
}

function readHeliaCache(key) {
  const cache = window.heliaCache;
  if (!cache || cache.key !== key) return null;
  if (Date.now() - cache.ts > HELIA_CACHE_TTL) return null;
  return cache;
}

function saveHeliaCache(key, data, snapshot) {
  if (!key || !data) return;
  window.heliaCache = { key, data, snapshot, ts: Date.now() };
}

function mapWhiteTeamToBackend(points) {
  const canvas = document.getElementById("trace-canvas");
  if (!canvas || canvas.height <= canvas.width) return points;

  const mapPoint = (point) => ({
    ...point,
    left: canvas.height - (Number(point.top) || 0),
    top: Number(point.left) || 0
  });
  return Array.isArray(points) ? points.map(mapPoint) : mapPoint(points);
}


// ==============================
// 🧠 FUNÇÃO PRINCIPAL DA IA VISION
// ==============================
async function startVision() {
	try {
    if (typeof notify === "function") notify("🤖 Careca avaliando o adversário...", 3000);
    else console.warn("🤖 Careca avaliando o adversário...");

    // 0️⃣ Snapshot atual do campo para cache anti-flood
    const snapshot = captureHeliaSnapshot();
    const cacheKey = heliaKey(snapshot);
    const cached = cacheKey ? readHeliaCache(cacheKey) : null;

    // 1️⃣ Envia imagem + posições para a IA Vision (ou usa cache)
    let visionData = null;
    if (cached?.data) {
      visionData = cached.data;
      window.lastBlackPositions = cached.snapshot?.black || window.lastBlackPositions;
      console.log("♻️ Helia cache HIT — reaproveitando visão (sem Google Vision)");
    } else {
      visionData = await sendVisionTactic(); // UMA VEZ APENAS!
      saveHeliaCache(cacheKey, visionData, snapshot);
    }

    if (!visionData) {
      throw new Error("vision-data-empty");
    }
    console.log("📊 Visão Tática (backend):", visionData);

    // 🧠 Salvar visão (para votação híbrida no core.js)
    window.lastVisionFormation =
      visionData?.opponentFormation || null;
    console.log("🧠 Formação da visão registrada:", window.lastVisionFormation);

    // 2️⃣ ANALISAR VIA IA TÁTICA
    const data = await analyzeFormation({
    opponentFormation: window.lastVisionFormation,
    // Apenas os dez jogadores de linha brancos (circle2..circle11), já
    // orientados para que o terço inferior seja a defesa.
    black: mapWhiteTeamToBackend(snapshot.black),
    green: mapWhiteTeamToBackend(snapshot.green),
    ball: snapshot.ball ? mapWhiteTeamToBackend(snapshot.ball) : null,
    trainingMode: window.isTrainingMode || false
    });

    console.log("🔥 RAW data da IA:", JSON.stringify(data, null, 2));
    console.log("📊 IA Analyze:", data);

    // Se houver card/mission ativa, Guarani assume SEMPRE a formação do card
    if (window.currentMissionCard?.formation) {
      const mf = (window.currentMissionCard.formation || "").trim();
      data.detectedFormation = mf;   // Guarani (card) fixa na formação do card
      console.log("🎯 Forçando Guarani/Card para formação da missão:", mf);
    }

    // 🔥 Premia missão de card se formação do treino bateu a missão atual
    if (window.currentMissionCard && window.missionsData) {
      const mission = window.currentMissionCard;
      const rewards = mission.rewards || {};
    // ===============================
    // 🥇 REGRA DE OURO — CARD = GUARANI | PLAYER = BRANCO
    // ===============================

    // 🃏 Formação do CARD → aplicada ao GUARANI
    const cardFormationKey = (mission.formation || "").trim();
    const cardFormation = cardFormationKey.toUpperCase();

  // 🟢 GUARANI (time do card) – formação detectada
  const guaraniFormation = (data?.detectedFormation || "").trim().toUpperCase();

  // ⚪ PLAYER (time branco que combate)
  const playerFormation = (data?.opponentFormation || "").trim().toUpperCase();

  // ✅ PLAYER PRECISA TER RESPOSTA VÁLIDA NO MAPA
  const reward = rewards[playerFormation];

  console.log("🃏 Card (Guarani):", cardFormation);
  console.log("🟢 Guarani Detectado:", guaraniFormation);
  console.log("⚪ Player (Branco):", playerFormation);
  console.log("🎯 Reward Encontrado:", reward || "NENHUM");

  // ✅ CONDIÇÃO FINAL DE VITÓRIA: player usou formação válida (independente do detector do Guarani)
  if (reward) {

if (typeof window.updateScoreFromCard === "function") {
  window.updateScoreFromCard(reward.pts, reward.goals);
}

if (typeof addCardToNFTList === "function") {
  addCardToNFTList(mission.id);
}

console.log(
  `🏅 VITÓRIA SOBRE O CARD ${mission.id} | Player ${playerFormation} venceu ${cardFormation}`
);

// ✅ BLOQUEIO ANTI FARM (card só dá uma vez)
window.collectedCards = window.collectedCards || [];
if (!window.collectedCards.includes(mission.id)) {
  window.collectedCards.push(mission.id);
  try {
    const email = (typeof window.getLoggedUser === "function" ? window.getLoggedUser()?.email : null) || localStorage.getItem("user_email") || "anon";
    const key = `ctv-collected-${email}`;
    localStorage.setItem(key, JSON.stringify(window.collectedCards));
  } catch (err) {
    console.warn("Não foi possível salvar collectedCards por usuário:", err);
  }
}

// ✅ Se conquistou todos os cards, dispara overlay de vitória global
if (window.collectedCards.length >= (window.missionsData?.length || 0)) {
  if (typeof window.showVictoryOverlay === "function") {
    window.showVictoryOverlay("Você conquistou todos os cards! 🏆");
  }
 } else if (typeof window.showVictoryOverlay === "function") {
   window.showVictoryOverlay(`Card ${mission.id} conquistado!`, mission.id);
}

// 🔄 ALINHA O GUARANI EXATAMENTE NO ESQUEMA DO CARD (VISUAL DO BOSS)
const formations = window.FORMATIONS || {};
const toFormation =
  formations[cardFormationKey] ||
  formations[cardFormation] ||
  null;

const fromFormation =
  formations[guaraniFormation] ||
  formations[playerFormation] ||
  formations["4-4-2"] ||
  null;

if (toFormation && fromFormation && typeof animateFormationTransition === "function") {
  const mode = window.trainingPlayMode ? "training" : "match";
  animateFormationTransition("circle", fromFormation, toFormation, mode);
}

// 🚀 PRÓXIMA MISSÃO
        if (typeof window.startCardMission === "function") {
          window.startCardMission();
        }
      } else {
        console.log(
    "❌ SEM PRÊMIO | Motivos:",
    {
      playerFormation,
      cardFormation,
      rewardDisponivel: !!reward
    }
  );
      }
    }

// === Atualiza HUD se estiver pronto ===
if (hudBox) {
  hudBox.style.display = "block";
  hudBox.style.opacity = "1";

  if (hudFormations) {
    const mission = window.currentMissionCard || null;
    const missionTag = mission ? `Card ${mission.id} (${(mission.formation || "?")})` : "Card/Adversário";
    const oppForm = mission?.formation || data?.opponentFormation || "?";
    const invictoForm = window.lastVotedFormation || data?.detectedFormation || "?";
    hudFormations.textContent = `${missionTag}: ${oppForm} | Time Invicto: ${invictoForm}`;
  }
  if (hudPhase) {
    hudPhase.textContent = `Fase: ${data?.phase?.toUpperCase() || "?"}`;
  }
  if (hudBlock) {
    hudBlock.textContent = `Bloco: ${data?.bloco || "?"} | Compactação: ${data?.compactacao || "?"}`;
  }
  
  if (window.isTrainingMode) {
   console.log("🏋️ MODO TREINO — enviado ‘ia:analyze:done’");
   window.dispatchEvent(new CustomEvent("ia:analyze:done", { detail: data }));
 }

  // 🧹 Evita vários timeouts acumulados
  if (window.hudTimeout) {
    clearTimeout(window.hudTimeout);
  }

  // 🕒 Fecha HUD automaticamente em 10s
  window.hudTimeout = setTimeout(() => {
    if (hudBox) {
      hudBox.style.display = "none";
      console.log("🕒 HUD fechado automaticamente.");
    }
  }, 10000);

} else {
  console.warn("⚠ HUD não está pronto no DOM!");
}


    // 4️⃣ Chama formações do Guarani (o segredo agora)
    const formations = window.FORMATIONS || {};

    let toFormation = formations[data?.detectedFormation] || null;

// ===========================================
// 🔥 SE NÃO ESTAMOS EM TREINO → IA autônoma
// ===========================================
if (!window.isTrainingMode && !toFormation) {
  const possession       = data?.possession || "preto";
  const opponentFormation = data?.opponentFormation || "4-4-2";

  if (possession === "verde") {
    switch (opponentFormation) {
      case "5-4-1":
      case "5-3-2": toFormation = formations["4-2-3-1"]; break;
      case "4-4-2": toFormation = formations["4-3-3"];   break;
      case "4-3-3": toFormation = formations["4-2-3-1"]; break;
      case "4-2-4": toFormation = formations["4-1-4-1"]; break;
      case "4-1-4-1": toFormation = formations["4-2-3-1"]; break;
      case "3-5-2": toFormation = formations["4-3-3"]; break;
      case "3-4-3": toFormation = formations["4-2-4"]; break;
      default:     toFormation = formations["4-3-3"]; break;
    }
  } else {
    switch (opponentFormation) {
      case "4-2-4":
      case "4-3-3": toFormation = formations["4-1-4-1"]; break;
      case "5-4-1":
      case "5-3-2": toFormation = formations["4-4-2"]; break;
      case "4-4-2": 
      default:     toFormation = formations["4-5-1"]; break;
    }
  }

  console.warn("📌 Formação adaptada taticamente (modo IA livre):", toFormation);
}

// ===========================================
// 💪 MODO TREINO — usar TREINADORES (Níveis)
// ===========================================
if (window.isTrainingMode && !toFormation) {
  const level = window.gameLevel || 1;
  const trainers = window.TRAINERS;

  const trainer = trainers[level - 1];
  const resposta = trainer?.responseTo?.[data?.opponentFormation];

  if (resposta) {
    toFormation = formations[resposta];
    console.log(`🎓 Treinador (${trainer.name}) decidiu: ${resposta}`);
  } else {
    console.warn("⚠ Treinador não tem resposta para", data?.opponentFormation);
  }
}


    // 5️⃣ Anima transição no campo
    const fromFormation = formations[data?.lastFormation || "4-4-2"];
    if (fromFormation && toFormation) {

    const mode = window.trainingPlayMode ? "training" : "match";
    animateFormationTransition("circle", fromFormation, toFormation, mode);
 }

  } catch (err) {
    console.error("AI analyze error:", err);
    if (typeof notify === "function") notify("❌ Falha na análise da IA!", 3000);
  }
}


// ===============================
// 🟢 3. Clique ÚNICO do Botão IA
// ===============================

function showAITip(btn) {
  if (!btn || btn.dataset.aiTipShown === "true") return;
  btn.dataset.aiTipShown = "true";

  const tip = document.createElement("div");
  tip.className = "ai-tip-dialog";
  tip.textContent = "Qual esquema-tático combate o CARD? Monte o time e clique aqui!";
  document.body.appendChild(tip);

  const btnRect = btn.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  const margin = 12;
  const top = btnRect.top - tipRect.height - margin + 20; // desloca 50px para baixo em relação ao anterior
  // Alinha o tooltip pela direita do botão
  const left = btnRect.right - tipRect.width;

  tip.style.top = `${Math.max(8, top)}px`;
  tip.style.left = `${Math.max(8, left)}px`;
  tip.style.transform = "none";

  setTimeout(() => tip.remove(), 7000);
}

const aiBtn = document.getElementById('ai-analise-btn');

if (aiBtn) {
  setTimeout(() => showAITip(aiBtn), 15000);

  aiBtn.addEventListener('click', async function () {
  if (aiBtn.disabled) return;
  if (window.cardPotActive) {
    notify?.("🔴 Há cards apostados. Confirme no botão OK verde.", 2000);
  }

  aiBtn.disabled = true;

  // Visual: usa classe loading (sem mexer em textContent)
  aiBtn.classList.add('loading');
  aiBtn.setAttribute('aria-busy', 'true');

  // failsafe para não ficar travado em loading
  let resetTimeout = setTimeout(() => {
    aiBtn.disabled = false;
    aiBtn.classList.remove('loading');
    aiBtn.removeAttribute('aria-busy');
    notify?.("⏳ IA demorou. Tente novamente.", 3000);
  }, 12000);

  if (typeof window.autoPossessionShoot === "function") {
    window.autoPossessionShoot();
  }

  // Se houve colisão jogador-bola há < 2s, força chute ao gol direito
  if (typeof window.wasRecentBallTouch === "function" && window.wasRecentBallTouch(2000)) {
    let action = "shoot";
    let teammate = null;
    if (typeof window.chooseForwardTeammate === "function") {
      teammate = window.chooseForwardTeammate(window.lastBallTouch?.by);
    }
    if (teammate && typeof window.passBallToTarget === "function") {
      window.passBallToTarget(teammate);
      action = "pass";
      if (typeof notify === "function") notify("🎯 Passe automático para o jogador à frente!", 2000);
    } else if (typeof window.kickBallToRightGoal === "function") {
      window.kickBallToRightGoal();
      if (typeof notify === "function") notify("🚀 Chute automático para o gol!", 2000);
    }
    if (typeof window.consumeLastBallTouch === "function") {
      window.consumeLastBallTouch();
    }
  }

  // Posição fixa do goleiro do Guarani após clicar na IA
  const gk = document.getElementById("circle23");
  if (gk) {
    gk.style.left = "181px";
    gk.style.top = "15px";
    gk.style.setProperty("left", "181px", "important");
    gk.style.setProperty("top", "15px", "important");
  }

  const ok = await ensureFormationsReady();
  if (!ok) {
    notify("❌ FORMATIONS não carregou — tente novamente.", 4000);
    aiBtn.disabled = false;
    aiBtn.classList.remove('loading');
    aiBtn.removeAttribute('aria-busy');
    return;
  }

  try {
    // chama a rotina principal (startVision) com timeout de segurança
    const timeoutMs = 10000;
    await Promise.race([
      startVision(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("vision-timeout")), timeoutMs))
    ]);
  } catch (err) {
    console.error("IA falhou:", err);
    notify?.(err?.message === "vision-timeout" ? "⏳ IA demorou. Tente novamente." : "❌ Falha na IA!", 4000);
  } finally {
    clearTimeout(resetTimeout);
    // garante restauração do estado visual
    aiBtn.disabled = false;
    aiBtn.classList.remove('loading');
    aiBtn.removeAttribute('aria-busy');
    // mantém o ícone estável no HTML (⚙️) — não sobrescrevemos textContent
  }
  });
} else {
  console.warn("⚠ Botão de análise da IA não encontrado no DOM!");
}

// ===============================
// FIM do aitatica.js (versão estável)
// ===============================
console.log("🧠 Aitatica.js v13.3 carregado com sucesso!");

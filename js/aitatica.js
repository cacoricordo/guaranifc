// === Aitatica.js — IA Tática v12.3 ===


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


// ==============================
// 🧠 FUNÇÃO PRINCIPAL DA IA VISION
// ==============================
async function startVision() {
	try {
    if (typeof notify === "function") notify("🤖 Careca avaliando o adversário...", 3000);
    else console.warn("🤖 Careca avaliando o adversário...");

    // 1️⃣ Envia imagem + posições para a IA Vision
    const visionData = await sendVisionTactic(); // UMA VEZ APENAS!
    console.log("📊 Visão Tática (backend):", visionData);

    // 🧠 Salvar visão (para votação híbrida no core.js)
    window.lastVisionFormation =
      visionData?.opponentFormation || null;
    console.log("🧠 Formação da visão registrada:", window.lastVisionFormation);

    // 2️⃣ ANALISAR VIA IA TÁTICA
    const data = await analyzeFormation({
    opponentFormation: window.lastVisionFormation,
    trainingMode: window.isTrainingMode || false
    });

    console.log("🔥 RAW data da IA:", JSON.stringify(data, null, 2));
    console.log("📊 IA Analyze:", data);

// === Atualiza HUD se estiver pronto ===
if (hudBox) {
  hudBox.style.display = "block";
  hudBox.style.opacity = "1";

  if (hudFormations) {
    hudFormations.textContent = `Adversário: ${data?.opponentFormation || "?"} | Guarani: ${data?.detectedFormation || "?"}`;
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

    // 🔥 Se IA não retornou formação → aplicamos lógica tática
    if (!toFormation) {
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

      console.warn("📌 Formação adaptada taticamente:", toFormation);
    }

    // 5️⃣ Anima transição no campo
    const fromFormation = formations[data?.lastFormation || "4-4-2"];
    if (fromFormation && toFormation) {

    const mode = window.trainingPlayMode ? "training" : "match";
    animateFormationTransition("circle", fromFormation, toFormation, mode);
 }
   window.dispatchEvent(new CustomEvent("ia:analyze:done", {
     detail: data
   }));
   console.log("📢 IA notify treino com:", data.detectedFormation);
  } catch (err) {
    console.error("AI analyze error:", err);
    if (typeof notify === "function") notify("❌ Falha na análise da IA!", 3000);
  }
}


// ===============================
// 🟢 3. Clique ÚNICO do Botão IA
// ===============================

const aiBtn = document.getElementById('ai-analise-btn');

aiBtn.addEventListener('click', async function () {
  if (aiBtn.disabled) return; 
  aiBtn.disabled = true;
  aiBtn.textContent = "Carregando";

  const ok = await ensureFormationsReady();
  if (!ok) {
    notify("❌ FORMATIONS não carregou — tente novamente.", 4000);
    aiBtn.disabled = false;
    aiBtn.textContent = "Análise IA";
    return;
  }

  try {
    aiBtn.textContent = "⚙️";
    await startVision();
  } catch (err) {
    console.error("IA falhou:", err);
    notify?.("❌ Falha na IA!", 4000);
  } finally {
    // 🔑 SEMPRE volta ao normal!
    aiBtn.disabled = false;
    aiBtn.textContent = "Análise IA";
  }
});

// ===============================
// FIM do aitatica.js (versão estável)
// ===============================
console.log("🧠 Aitatica.js v12.3 carregado com sucesso!");

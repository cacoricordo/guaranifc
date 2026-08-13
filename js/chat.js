// =============================================
// CHAT DO TREINADOR - INVICTOS / GUARANI FC
// =============================================

// Elementos principais
const coachChat     = document.getElementById('chat-container');
const chatHeader    = document.getElementById('chat-header');
const chatBody      = document.getElementById('chat-body');
const chatInputArea = document.getElementById('chat-input-area');
const chatInput     = document.getElementById('chat-input');
const chatSend      = document.getElementById('chat-send');

// === Layout padrão do chat ===
const DEFAULT_CHAT_STYLE = {
  position: "fixed",
  bottom: "20px",
  right: "50px",
  left: "",
  top: "",
  width: "300px",
  height: "70vh"
};

function dockChat() {
  Object.assign(coachChat.style, DEFAULT_CHAT_STYLE);
  coachChat.style.zIndex = "2147483647";
  chatBody.style.display = "block";
  chatInputArea.style.display = "flex";
  chatOpen = true;
}

let chatOpen = false;
let welcomeMessageShown = false;

const WELCOME_MESSAGE = "Boa pra nós! Bem vindo(a) à Bliblioteca Futebolísica do professor Carlos Alberto Silva! Sou uma IA criada para ser canal construtivo entre torcedor e comissão técnica! Você agora faz parte da comissão técnica. Use a mesa tática para explanar sua idéias táticas. Agora quando você xingar o jogador estará xingando à si próprio. *..na vitória ou na derrota, HSG!*";
const COLD_BOOT_MESSAGE = "Aguarde um momento estou carregando o servidor da Biblioteca! 1 minutinho, se assobiar viro o jogo ou subo pro ataque. Não adianda reclamar! O sistema é lento.";

function openChat() {
  dockChat();
  if (!welcomeMessageShown) {
    appendMessage("bot", WELCOME_MESSAGE);
    welcomeMessageShown = true;
  }
}

function minimizeChat() {
  coachChat.style.height = "48px";     // apenas cabeçalho
  // No celular os botões ficam no rodapé. O chat minimizado não pode ficar
  // acima deles e capturar todos os toques.
  coachChat.style.zIndex = "9000";
  chatBody.style.display = "none";      // esconde histórico
  chatInputArea.style.display = "none"; // esconde input
  chatOpen = false;
}

// ✅ inicia minimizado
minimizeChat();

// Alterna abertura ao clicar no cabeçalho
chatHeader.addEventListener("click", () => {
  if (chatOpen) minimizeChat();
  else openChat();
});

// ----------------------------------------------------
// 3. Funções de Chat e API
// ----------------------------------------------------
const url_render = 'https://guaranifc.onrender.com';

function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.style.marginBottom = "8px";
  msg.innerHTML = sender === "user"
    ? `<div style="text-align:right;"><span style="background:#0066cc;padding:6px 10px;border-radius:8px;display:inline-block;">${text}</span></div>`
    : `<div style="text-align:left;"><span style="background:#333;padding:6px 10px;border-radius:8px;display:inline-block;">${text}</span></div>`;
  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// ----------------------------------------------------
// Envio da mensagem e integração com IA da Biblioteca C.A.Silva
// ----------------------------------------------------
chatSend.addEventListener("click", async () => {
  const message = chatInput.value.trim();
  if (!message) return;

  appendMessage("user", message);
  chatInput.value = "";

  const coldBootTimer = setTimeout(() => {
    appendMessage("bot", COLD_BOOT_MESSAGE);
  }, 6000);

  try {
    const res = await fetch(`${url_render}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    clearTimeout(coldBootTimer);
    const data = await res.json();
    appendMessage("bot", data.reply || "A Biblioteca C.A.Silva ficou em silêncio...");

    // volta ao estado original (aberto e dockado)
    dockChat();
    chatBody.scrollTop = chatBody.scrollHeight;

    // ⚽ Se a Biblioteca C.A.Silva retornou uma formação, monta imediatamente (sem esperar IA)
    if (data.formationRequested) {
      console.log("⚽ Comando tático do chat:", data.formationRequested);
      window.dispatchEvent(new CustomEvent("coach:help-requested"));

      // 🔧 Normaliza a formação
      let formationKey = (data.formationRequested || "4-4-2")
        .toString()
        .replace(/[–—−]/g, "-")
        .replace(/\s+/g, "");
      console.log("✅ Formação normalizada:", formationKey);

      const formationBase = window.FORMATIONS?.[formationKey];
      if (formationBase && Array.isArray(formationBase)) {
        const formationPositions = formationBase.map(p => ({
          id: p.id,
          left: (p.prefferedZone && p.prefferedZone[0]) || (p.left ?? 300),
          top:  (p.prefferedZone && p.prefferedZone[1]) || (p.top  ?? 150)
        }));

        // Monta direto o time no campo, mesmo sem IA
        console.log("🚀 Montando formação inicial (sem IA):", formationKey);
        animateTeam("circle", formationPositions);
        const hud = document.getElementById("hud-formations");
        if (hud) hud.innerText = `Guarani FC: ${formationKey}`;
        window.lastFormation = formationKey;
      }

      // 🔁 Agora chama a IA para refinar a tática (transições, blocos, etc.)
      fetch(`${url_render}/ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualFormation: formationKey,
          possession: "vermelho",
          opponentFormationVision: null
        })
      })
        .then(r => r.json())
        .then(result => {
          const field = document.getElementById("background-square");
          if (field) {
            document.body.style.pointerEvents = "none";
            field.style.transition = "opacity 0.3s ease";
            field.style.opacity = "0.8";
          }

          // Verifica formações válidas
          const formationBaseAI = window.FORMATIONS?.[formationKey];
          const formationPositionsAI = (formationBaseAI || []).map(p => ({
            id: p.id,
            left: (p.prefferedZone && p.prefferedZone[0]) || (p.left ?? 300),
            top:  (p.prefferedZone && p.prefferedZone[1]) || (p.top  ?? 150)
          }));

          const prevKey = window.lastFormation || null;
          const anyCircle = document.querySelector("#circle13, #circle14, #circle15, #circle16, #circle17, #circle18, #circle19, #circle20, #circle21, #circle22");

          if (!anyCircle || !prevKey) {
            console.log("🚀 Nenhum time ativo. IA montando:", formationKey);
            animateTeam("circle", formationPositionsAI);
          } else {
            try {
              console.log(`🔄 IA: ${prevKey} → ${formationKey}`);
              animateFormationTransition(
                "circle",
                window.FORMATIONS[prevKey],
                window.FORMATIONS[formationKey],
                (result.phase || "transicao").toLowerCase()
              );
            } catch (err) {
              console.warn("⚠️ animateFormationTransition falhou:", err);
              animateTeam("circle", formationPositionsAI);
            }
          }

          // Aplica blocos dinâmicos
          const phase = (result.phase || "transicao").toLowerCase();
          applyDynamicBlocks(formationPositionsAI, phase, result.opponentFormation || "4-4-2");

          // Atualiza HUD
          const hud = document.getElementById("hud-formations");
          if (hud) hud.innerText = `Adversário: ${result.opponentFormation || "?"} | Guarani FC: ${formationKey}`;
          window.lastFormation = formationKey;

          // Libera campo
          setTimeout(() => {
            if (field) field.style.opacity = "1";
            document.body.style.pointerEvents = "auto";
          }, 500);
        })
        .catch(e => {
          appendMessage("bot", "Erro de comunicação com a Biblioteca C.A.Silva.");
          console.error(e);
        });
    }
  } catch (e) {
    clearTimeout(coldBootTimer);
    appendMessage("bot", "Erro de comunicação com a Biblioteca C.A.Silva.");
    console.error(e);
  }
});


// ----------------------------------------------------
// Eventos extras (teclado, gols, mobile)
// ----------------------------------------------------
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") chatSend.click();
});

let lastGoalTime = 0;
window.addEventListener("goal:scored", (ev) => {
  const now = Date.now();
  if (now - lastGoalTime < 2000) return; // evita spam
  lastGoalTime = now;
  appendMessage("bot", "GOOOOOOOOOOOOOOOOOL DO BUGRE!!! 💚⚽");
});

// Expande o chat no mobile quando o teclado aparece
chatInput.addEventListener("focus", () => {
  openChat();
  setTimeout(() => {
    chatBody.scrollTop = chatBody.scrollHeight;
  }, 350);
});

let keyboardMode = false;
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    if (!chatOpen) return;
    const viewportH = window.visualViewport.height;
    const totalH = window.innerHeight;
    const kbHeight = totalH - viewportH;
    const keyboardOpen = kbHeight > 120;

    if (keyboardOpen) {
      keyboardMode = true;
      Object.assign(coachChat.style, {
        position: "fixed",
        left: "0px",
        right: "0px",
        top: "0px",
        bottom: kbHeight + "px",
        width: "100vw",
        height: viewportH + "px"
      });
      chatBody.style.height = (viewportH - 90) + "px";
    } else if (keyboardMode) {
      keyboardMode = false;
      dockChat();
    }
  });
}

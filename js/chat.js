const coachChat     = document.getElementById('chat-container');
const chatHeader    = document.getElementById('chat-header');
const chatBody      = document.getElementById('chat-body');
const chatInputArea = document.getElementById('chat-input-area');
const chatInput     = document.getElementById('chat-input');
const chatSend      = document.getElementById('chat-send');
let chatOpen = false;

function openChat() {
  coachChat.style.height = "70vh";       // ✅ maximiza ao abrir
  chatBody.style.display = "block";      // mostra mensagens
  chatInputArea.style.display = "flex";  // mostra input
  chatOpen = true;
}

function minimizeChat() {
  // diminui o container (visual do header apenas)
  coachChat.style.height = "48px";     // ✅ só cabeçalho
  chatBody.style.display = "none";      // esconde histórico
  chatInputArea.style.display = "none"; // esconde input
  chatOpen = false;
}


// ✅ inicia minimizado
minimizeChat();

chatHeader.addEventListener("click", () => {
  if (chatOpen) minimizeChat();
  else openChat();
});


// ----------------------------------------------------
// 3. Funções de Chat e API (Permanece quase igual)
// ----------------------------------------------------
const url_render = 'https://guaranifc.onrender.com';

function appendMessage(sender, text){
    // ... (sua função appendMessage)
    const msg = document.createElement("div");
    msg.style.marginBottom = "8px";
    msg.innerHTML = sender === "user"
        ? `<div style="text-align:right;"><span style="background:#0066cc;padding:6px 10px;border-radius:8px;display:inline-block;">${text}</span></div>`
        : `<div style="text-align:left;"><span style="background:#333;padding:6px 10px;border-radius:8px;display:inline-block;">${text}</span></div>`;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
}

chatSend.addEventListener("click", async ()=>{
  const message = chatInput.value.trim();
  if (!message) return;

  appendMessage("user", message);
  chatInput.value = "";

  try {

    const res = await fetch(`https://guaranifc.onrender.com/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    appendMessage("bot", data.reply || "O Careca, ficou em silêncio...");

    // ✅ Se o Careca, retornou uma formação, aciona IA Tática
    if (data.formationRequested){
      console.log("⚽ Comando tático do chat:", data.formationRequested);
      window.dispatchEvent(new CustomEvent("coach:help-requested"));

fetch(`${url_render}/ai/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        manualFormation: data.formationRequested,
        possession: "vermelho",
        opponentFormationVision: null
    })
})
.then(res => res.json())
.then(result => {
    console.table(result.green);
    console.log("📦 IA retornou formação:", result);

    if (result.green) {
        // ✅ Move imediatamente os jogadores no gramado
        animateTeam("circle", result.green);
    }

    // ✅ Atualiza HUD
    const hud = document.getElementById("hud-formations");
    hud.innerText = `Adversário: ${result.opponentFormation} | Guarani FC: ${result.detectedFormation}`;
});

    }

  } catch (e) {
    appendMessage("bot","Erro de comunicação com o Careca,.");
    console.error(e);
  }
});

chatInput.addEventListener("keydown", (e)=>{
  if(e.key === "Enter"){
    chatSend.click();
  }
});

let lastGoalTime = 0;

window.addEventListener("goal:scored", (ev) => {
  const now = Date.now();
  if (now - lastGoalTime < 2000) return; // evita spam de gol
  lastGoalTime = now;

  appendMessage("bot", "GOOOOOOOOOOOOOOOOOL DO BUGRE!!! 💚⚽");
});


// expande o chat quando o teclado aparece (mobile)
chatInput.addEventListener("focus", () => {
  openChat();
  setTimeout(() => {
    chatBody.scrollTop = chatBody.scrollHeight;
  }, 350);
});


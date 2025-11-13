let currentRoomCode = null;

// criando aprimoramento esportivo
const criarCampoBtn = document.getElementById("btn-criar-campo");

// botão de compartilhar WhatsApp (já existente)
const shareBtn = document.getElementById("whatsapp-share");

// elementos do modal de PIN
const modal = document.getElementById("rt-room-modal");
const input = document.getElementById("rt-room-input");

// Cria Campo → gera PIN
criarCampoBtn.addEventListener("click", (e) => {
  e.preventDefault();

  const pin = Math.floor(1000 + Math.random() * 9000);
  window.currentRoomCode = pin;
  input.value = pin;

  const msg = `https://www.osinvictos.com.br/dashboard/guaranifc/ <br>PIN para entrar na Mesa Tática 👇\n\n🔐 Código: *${pin}*`;
  shareBtn.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

  modal.style.display = "flex";
});

// CANCELAR PIN — fecha o modal
document.getElementById("rt-room-cancel").onclick = () => {
  modal.style.display = "none";
};

shareBtn.addEventListener("click", (e) => {
  if (!window.currentRoomCode) {
    e.preventDefault();
    alert("Crie um campo tático primeiro para gerar o PIN.");
  }
});

// CONFIRMAR PIN
document.getElementById("rt-room-confirm").onclick = () => {
  const pin = input.value.trim();
  if (pin.length !== 4) {
    alert("Digite um PIN de 4 dígitos.");
    return;
  }

  window.currentRoomCode = pin;

  const emitJoin = () => {
    console.log("🚀 EMITINDO join-room:", pin);
    socket.emit("join-room", pin);
  };

  if (socket && socket.connected) {
    emitJoin();
  } else {
    socket.once("connect", emitJoin);
  }

  modal.style.display = "none";
};

// supertrunfo.js
import "./trainers_nft.js"; // coleção NFT

const btn = document.getElementById("btn-supertrunfo");
const popup = document.getElementById("popup-supertrunfo");
const myCard = document.getElementById("my-card");
const myAttr = document.getElementById("my-attr");
const sendBtn = document.getElementById("st-send");

// Abre popup
btn.onclick = () => {
  popup.style.display = "flex";

  // Preenche dropdown com os 48 cards
  myCard.innerHTML = "";
  window.TRAINERS_NFT.forEach(t => {
    const op = document.createElement("option");
    op.value = t.id;
    op.textContent = `${t.name}`;
    myCard.appendChild(op);
  });
};

// Fecha clicando fora
popup.onclick = (e) => {
  if (e.target === popup) popup.style.display = "none";
};

// Envia sua jogada via WebSocket para sala privada
sendBtn.onclick = () => {
  const cardId = Number(myCard.value);
  const attr = myAttr.value;
  const card = window.TRAINERS_NFT.find(t => t.id === cardId);

  socket.emit("supertrunfo-play", {
    room: window.currentRoomCode,
    player: localStorage.getItem("user_email") || "anon",
    card,
    attr
  });

  alert("Jogada enviada! Aguarde o adversário.");
};

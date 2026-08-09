import { OWNER_WALLET } from "./.env.js";

const GOLS_ADDRESS = "0xfC6526BF078CC632a9564741dA6dDC11ecA896b4";
const GOLS_ERC20_ABI = window.GOLS_ERC20_ABI;

// =============================================================
// ===== FUNÇÃO SEGURA PARA ESPERAR O DOM CARREGAR =============
// =============================================================
function onReady(fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn);
}

// =============================================================
// ====== MARKETPLACE + API ====================================
// =============================================================
async function setupMarketplace() {
  const marketBtn = document.getElementById("btn-market");
  const popupMarket = document.getElementById("popup-market");
  const closeMarket = document.getElementById("close-market");
  const marketItemsDiv = document.getElementById("market-items");
  const balanceBtn = document.getElementById("btn-show-gols-balance");

  if (!marketBtn || !popupMarket) return;

  marketBtn.addEventListener("click", async () => {
    popupMarket.style.display = "flex";
    console.log("🛒 Abrindo marketplace...");

try {
  const API_BASE = location.origin;
  const res = await fetch(`http://127.0.0.1:8080/api/market`, {
    headers: { "Accept": "application/json" }
  });

  const text = await res.text();
  let items = [];
  try {
    items = JSON.parse(text); // Se for JSON válido → OK!
  } catch (e) {
    console.warn("⚠ Resposta NÃO é JSON válido:", text);
    marketItemsDiv.innerHTML = `
      <div style="color:red;">
        ⚠ Erro na API Marketplace:<br>
        <pre>${text}</pre>
      </div>
    `;
    return;
  }

  // Renderização dos cards
  marketItemsDiv.innerHTML = "";
  items.forEach(item => {
    const card = document.createElement("div");
    card.style.cssText = `
      background:#222;padding:10px;border:1px solid #333;
      border-radius:8px;margin-bottom:12px;
    `;
    card.innerHTML = `
      <b>${item.title}</b><br>
      <small>${item.description || ""}</small><br>
      <span style="color:#ffd700;font-weight:700;">
        ${item.price_tokens} ✨
      </span><br><br>
      <button class="ai-button buy-btn" 
        data-id="${item.id}" 
        data-price="${item.price_tokens}"
        style="width:100%">
        Comprar
      </button>
    `;
    marketItemsDiv.appendChild(card);
  });


	document.querySelectorAll(".buy-btn").forEach(btn => {
	btn.addEventListener("click", async () => {
    const id = btn.getAttribute("data-id");
    const price = btn.getAttribute("data-price");

    // CHAMA só transação pelo contrato ERC20
    await buyItem(id, price);
  });
});


    } catch (err) {
      console.error("⚠ Erro API MARKET:", err);
      marketItemsDiv.innerHTML = `<div style="color:red;">Erro ao carregar marketplace!</div>`;
    }
  });

  closeMarket?.addEventListener("click", () => {
    popupMarket.style.display = "none";
  });

  if (balanceBtn) {
    balanceBtn.addEventListener("click", () => getGolsBalance());
  }

  console.log("✔ Marketplace pronto!");
}

// =============================================================
// ======= BALANCE GOLS ========================================
// =============================================================
async function getGolsBalance() {
  if (!window.ethereum) {
    notifyTop("⚠ MetaMask não detectada!");
    return;
  }
  
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0xaa36a7" }], // Sepolia
  });

  if (typeof ethers === "undefined") {
    notifyTop("⚠ ethers.js não carregou. Adicione a CDN no HTML!");
    return;
  }

  try {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    const wallet = accounts[0];

    const provider = new ethers.BrowserProvider(window.ethereum); // v6
    const contract = new ethers.Contract(GOLS_ADDRESS, window.GOLS_ERC20_ABI, provider);

    const balance = await contract.balanceOf(wallet);
    const gols = ethers.formatUnits(balance, 18);

    notifyTop(`💰 Você tem ${gols} GOLS on-chain!`);
  } catch (err) {
    console.error("⚠ Erro ao pegar saldo:", err);
    notifyTop("⚠ Erro ao conectar MetaMask!");
  }
}
window.getGolsBalance = getGolsBalance;


// =============================================================
// ======= GOLS COMPRAM (CORRETO NO ETHERS V6) =================
// =============================================================
async function buyItem(itemId, price) {
  if (!window.ethereum) {
    notifyTop("⚠ MetaMask não detectada!");
    return;
  }

  // 1) Conectar carteira
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  const wallet = accounts[0];

  // 2) Provider + signer (VERSÃO CORRETA V6 ETHERS.JS)
  const provider = new ethers.BrowserProvider(window.ethereum);  // V6
  const signer   = await provider.getSigner();                    // V6

  // 3) Instanciar contrato ERC20
  const contract = new ethers.Contract(
    GOLS_ADDRESS,
    GOLS_ERC20_ABI,
    signer
  );

  // 4) Transferência real de GOLS
  const tx = await contract.transfer(
    OWNER_WALLET,
    ethers.parseEther(String(price))
  );
  await tx.wait();

  notifyTop(`🛒 Compra realizada!  
    🔁 Tx: ${tx.hash}  
    👛 Pagamento: ${wallet}  
    👉 Para: ${OWNER_WALLET}`);
}



// =============================================================
// ====== INICIAR TODOS OS SISTEMAS ============================
// =============================================================
onReady(() => {
  console.log("DOM pronto, iniciando sistemas...");
  setupMarketplace();
});

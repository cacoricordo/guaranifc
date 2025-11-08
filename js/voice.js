/* === SpeechSynthesis Initialization (Speech Fix Pro) === */
let voicesReady = false;
let selectedVoice = null;

// Inicializa as vozes (chamado depois de interação do usuário)
function initSpeech() {
  // Tenta carregar lista de vozes
  const loadVoices = () => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Prioriza voz em pt-BR (Luciana / Felipe)
      selectedVoice = voices.find(v => v.lang === "pt-BR") || voices[0];
      voicesReady = true;
      console.log("✅ Voz carregada:", selectedVoice.name);
    } else {
      // Caso não estejam disponíveis ainda, tenta de novo
      setTimeout(loadVoices, 300);
    }
  };
  loadVoices();

  // Hack para ativar contexto de áudio
  const utter = new SpeechSynthesisUtterance("");
  speechSynthesis.speak(utter);
}

// Ativa no primeiro clique/touch do usuário
window.addEventListener("click", initSpeech, { once: true });
window.addEventListener("touchstart", initSpeech, { once: true });

// === Função global para falar ===
function speakPlayerNumber(playerId) {
  if (!voicesReady) {
    console.warn("⚠️ Voz ainda não inicializada, ignorando fala.");
    return;
  }
  const number = playerId.replace("circle", "");
  const utter = new SpeechSynthesisUtterance("Jogador " + number);
  utter.lang = "pt-BR";
  utter.rate = 1.0;
  if (selectedVoice) utter.voice = selectedVoice;
  speechSynthesis.speak(utter);
}

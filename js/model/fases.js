// === model/fases.js – IA TÁTICA REAL ===

// FASE 1 – APRENDIZ SUB-20 (apenas leitura tática)
export const LEVEL1 = {
  name: "Modo Sub-20 — Leitura Tática Básica",
  philosophy: "Ler padrão tático e reagir com 2 opções possíveis",
  validAnswers: {
    "4-3-3": ["4-4-2", "3-5-2"],
    "4-4-2": ["3-5-2", "4-3-3"],
    "3-5-2": ["4-4-2", "4-3-3"]
  }
};

// FASE 2 – CARLOS ALBERTO SILVA
export const LEVEL2 = {
  name: "Carlos Alberto Silva",
  philosophy: "Equilíbrio entre defesa e ataque",
  baseFormation: "4-4-2",
  responseTo: {
    "4-3-3": "4-4-2",     // compactação e marcação de zona
    "3-5-2": "4-3-3",     // pressão e amplitude
    "4-2-3-1": "4-4-2"
  }
};

// FASE 3 – TELÊ SANTANA
export const LEVEL3 = {
  name: "Telê Santana",
  philosophy: "Posse de bola + protagonismo ofensivo",
  baseFormation: "4-3-3",
  responseTo: {
    "4-3-3": "3-5-2",     // superioridade numérica no meio
    "4-4-2": "4-3-3",     // superar linha de 4
    "3-5-2": "4-3-3"      // total controle do jogo
  }
};

// FASE 4 – FILIPE LUÍS
export const LEVEL4 = {
  name: "Filipe Luís",
  philosophy: "Pressão pós-perda + bloco médio-alto",
  baseFormation: "3-4-3",
  responseTo: {
    "4-3-3": "3-4-3",
    "4-4-2": "3-5-2",
    "3-5-2": "3-4-3"
  }
};

// FASE 5 – ABEL FERREIRA
export const LEVEL5 = {
  name: "Abel Ferreira",
  philosophy: "Transição ofensiva rápida e bloco baixo",
  baseFormation: "5-3-2",
  responseTo: {
    "4-3-3": "5-3-2",
    "4-4-2": "3-5-2",
    "3-5-2": "5-3-2"
  }
};

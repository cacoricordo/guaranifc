// === trainers.js — versão GLOBAL (SEM export/import!) ===

// LEVEL 1 – SUB-20
const LEVEL1 = {
  name: "Modo Sub-20 — Leitura Tática Básica",
  philosophy: "Ler padrão tático e reagir com 2 opções possíveis",
  validAnswers: {
    "4-3-3": ["4-4-2", "3-5-2"],
    "4-4-2": ["3-5-2", "4-3-3"],
    "3-5-2": ["4-4-2", "4-3-3"]
  }
};

// LEVEL 2 – CARLOS ALBERTO SILVA
const LEVEL2 = {
  name: "Carlos Alberto Silva",
  philosophy: "Equilíbrio entre defesa e ataque",
  baseFormation: "4-4-2",
  responseTo: {
    "4-3-3": "4-4-2",
    "3-5-2": "4-3-3",
    "4-2-3-1": "4-4-2"
  }
};

// LEVEL 3 – TELÊ SANTANA
const LEVEL3 = {
  name: "Telê Santana",
  philosophy: "Posse de bola e liberdade criativa",
  baseFormation: "4-3-3",
  responseTo: {
    "4-3-3": "3-5-2",
    "4-4-2": "4-3-3",
    "3-5-2": "4-3-3"
  }
};

// LEVEL 4 – FILIPE LUÍS
const LEVEL4 = {
  name: "Filipe Luís",
  philosophy: "Pressão pós-perda + construção baixa",
  baseFormation: "3-4-3",
  responseTo: {
    "4-3-3": "3-4-3",
    "4-4-2": "3-5-2",
    "3-5-2": "3-4-3"
  }
};

// LEVEL 5 – ABEL FERREIRA
const LEVEL5 = {
  name: "Abel Ferreira",
  philosophy: "Reação defensiva + contra-golpe rápido",
  baseFormation: "5-3-2",
  responseTo: {
    "4-3-3": "5-3-2",
    "3-5-2": "4-3-3"
  }
};

// ===== EXPORTAR PARA O WINDOW (GLOBAL) =====
window.LEVELS = {
  1: LEVEL1,
  2: LEVEL2,
  3: LEVEL3,
  4: LEVEL4,
  5: LEVEL5
};

window.getResponseFromTrainer = function(level, oppFormation) {
  const L = window.LEVELS[level];
  return (L && L.responseTo) ? L.responseTo[oppFormation] : null;
};

console.log("📡 Trainers.js carregado com sucesso (GLOBAL MODE)");

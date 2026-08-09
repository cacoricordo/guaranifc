
// server.js — AI Tática v12.2 (Render + Realtime WebSocket)
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import formations from "./js/formations.mjs";
import vision from "@google-cloud/vision";

// Garante que FORMATIONS existe no backend
global.FORMATIONS = global.FORMATIONS || {};
global.FORMATIONS = formations;
console.log('⚽ FORMATIONS pronta no backend:', Object.keys(global.FORMATIONS));

dotenv.config();

function isTacticallyValid(form) {
  if (!form) return false;
  const parts = form.split("-").map(Number);
  if (parts.some(isNaN)) return false;
  const total = parts.reduce((s, n) => s + n, 0);
 
  // mínimo 8 (sem GK), máximo 10 (sem GK + com GK possível)
  return total >= 8 && total <= 10;   
}

let visionClient;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  visionClient = new vision.ImageAnnotatorClient({ credentials: creds });
} else {
  visionClient = new vision.ImageAnnotatorClient();
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "https://www.osinvictos.com.br",
      "https://osinvictos.com.br",
      "https://guaranifc.onrender.com",
      "localhost:10000",
      "*"
    ],
    methods: ["GET", "POST"]
  }
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// === Configuração de diretórios ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Middleware ===
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// === Serve o frontend ===
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// === Constantes ===
const FIELD_WIDTH = 600;
const FIELD_HEIGHT = 300;
const VALID_FORMATIONS = [
  "4-4-2",
  "4-1-4-1",
  "4-3-3",
  "4-2-3-1",
  "4-2-4",
  "3-5-2",
  "5-4-1",
  "4-5-1",
  "3-4-3",
  "5-3-2"
];

function findGoalkeeper(players = []) {
  if (!Array.isArray(players) || players.length === 0) return null;
  return players.reduce((gk, p) => (p.left < gk.left ? p : gk), players[0]);
}

function analyzeFieldThirds(players = []) {
  if (!Array.isArray(players) || players.length === 0) {
    return { def: 0, mid: 0, att: 0, shape: null };
  }

  const defLimit = FIELD_WIDTH * (2 / 8);
  const midLimit = FIELD_WIDTH * (5 / 8);

  const def = players.filter((p) => p.left < defLimit).length;
  const mid = players.filter((p) => p.left >= defLimit && p.left < midLimit).length;
  const att = players.filter((p) => p.left >= midLimit).length;

  return { def, mid, att, shape: `${def}-${mid}-${att}` };
}

function groupPlayersByAxis(players = [], axis = "left", threshold = 28) {
  if (!Array.isArray(players) || players.length === 0) return [];

  const sorted = [...players].sort((a, b) => a[axis] - b[axis]);
  const groups = [];

  for (const player of sorted) {
    const current = groups[groups.length - 1];
    if (!current) {
      groups.push({ players: [player], center: player[axis] });
      continue;
    }

    if (Math.abs(player[axis] - current.center) <= threshold) {
      current.players.push(player);
      current.center =
        current.players.reduce((sum, p) => sum + p[axis], 0) / current.players.length;
    } else {
      groups.push({ players: [player], center: player[axis] });
    }
  }

  return groups;
}

function detectFormationByLines(players = []) {
  const groups = groupPlayersByAxis(players, "left", 30);
  if (!groups.length) return null;

  const signature = groups.map((g) => g.players.length).join("-");
  return VALID_FORMATIONS.includes(signature) ? signature : null;
}

function getMirroredFormationTemplate(formationKey) {
  const formation = global.FORMATIONS?.[formationKey];
  if (!Array.isArray(formation)) return null;

  return formation.map((pos) => ({
    id: pos.id,
    left: FIELD_WIDTH - pos.prefferedZone[0],
    top: pos.prefferedZone[1]
  }));
}

function scoreFormationTemplate(players = [], formationKey) {
  const refs = getMirroredFormationTemplate(formationKey);
  if (!refs || !players.length || refs.length !== players.length) {
    return Number.POSITIVE_INFINITY;
  }

  const remaining = [...refs];
  let total = 0;

  for (const player of players) {
    let bestIdx = -1;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i++) {
      const ref = remaining[i];
      const dx = player.left - ref.left;
      const dy = player.top - ref.top;
      const dist = Math.hypot(dx, dy);

      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) return Number.POSITIVE_INFINITY;
    total += bestDist;
    remaining.splice(bestIdx, 1);
  }

  return total / players.length;
}

function detectFormationByTemplate(players = []) {
  if (!Array.isArray(players) || players.length !== 10) {
    return { formation: null, score: Number.POSITIVE_INFINITY };
  }

  let best = { formation: null, score: Number.POSITIVE_INFINITY };

  for (const formationKey of VALID_FORMATIONS) {
    const score = scoreFormationTemplate(players, formationKey);
    if (score < best.score) {
      best = { formation: formationKey, score };
    }
  }

  return best;
}

function voteFormation(candidates = []) {
  const votes = {};

  for (const { formation, weight = 1 } of candidates) {
    if (!formation || !VALID_FORMATIONS.includes(formation)) continue;
    votes[formation] = (votes[formation] || 0) + weight;
  }

  const sorted = Object.keys(votes).sort((a, b) => votes[b] - votes[a]);
  return {
    formation: sorted[0] || null,
    votes
  };
}


// === IA: Detector geométrico FIFA 2D ===
function detectOpponentFormationAdvanced(players) {
  if (!players || players.length < 4) return "4-4-2";

  const sortedByX = [...players].sort((a, b) => a.left - b.left);
  const noGK = sortedByX.slice(1); // drop leftmost
  const thirds = analyzeFieldThirds(noGK);
  const lineFormation = detectFormationByLines(noGK);
  const roles = detectEloFormation(noGK);
  const eloFormation = roles ? interpretFormation(roles) : null;
  const templateMatch = detectFormationByTemplate(noGK);

  const voted = voteFormation([
    { formation: lineFormation, weight: 3 },
    { formation: templateMatch.formation, weight: templateMatch.score < 55 ? 3 : 2 },
    { formation: eloFormation, weight: 2 },
    { formation: thirds.shape, weight: 1 }
  ]);

  console.log("📡 detectOpponentFormationAdvanced:", {
    thirds: thirds.shape,
    lineFormation,
    eloFormation,
    templateFormation: templateMatch.formation,
    templateScore: Number.isFinite(templateMatch.score) ? templateMatch.score.toFixed(2) : "inf",
    votes: voted.votes
  });

  return voted.formation || templateMatch.formation || lineFormation || eloFormation || "4-2-3-1";
}


function detectEloFormation(players, maxDist = 70) {  // maxDist maior para tolerância real
  if (!players || players.length < 4) return null;

  const roles = { zaga: [], meio: [], ataque: [] };
  const clusters = [];
  const visited = new Set();

  function bfsCluster(startIdx) {
    const queue = [players[startIdx]];
    const cluster = [];
    visited.add(startIdx);

    while (queue.length > 0) {
      const current = queue.shift();
      cluster.push(current);
      for (let i = 0; i < players.length; i++) {
        if (visited.has(i)) continue;
        const dx = players[i].left - current.left;
        const dy = players[i].top - current.top;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= maxDist) {
          visited.add(i);
          queue.push(players[i]);
        }
      }
    }
    return cluster;
  }

  for (let i = 0; i < players.length; i++) {
    if (!visited.has(i)) {
      const cluster = bfsCluster(i);
      if (cluster.length >= 2) clusters.push(cluster);
    }
  }

  const FIELD_WIDTH = 600;
  const DEF_LIMIT = FIELD_WIDTH * (2 / 8);
  const MID_LIMIT = FIELD_WIDTH * (5 / 8);

  clusters.forEach(cluster => {
    const avgX = cluster.reduce((s, p) => s + p.left, 0) / cluster.length;
    if (avgX < DEF_LIMIT) {
      roles.zaga.push(...cluster);
    } else if (avgX < MID_LIMIT) {
      roles.meio.push(...cluster);
    } else {
      roles.ataque.push(...cluster);
    }
  });

  if (!roles.zaga.length || !roles.meio.length || !roles.ataque.length) {
    players.forEach(player => {
      if (player.left < DEF_LIMIT) roles.zaga.push(player);
      else if (player.left < MID_LIMIT) roles.meio.push(player);
      else roles.ataque.push(player);
    });
  }

  roles.zaga = Array.from(new Set(roles.zaga));
  roles.meio = Array.from(new Set(roles.meio));
  roles.ataque = Array.from(new Set(roles.ataque));

  return roles;
}

function interpretFormation(roles) {
  const z = roles?.zaga?.length || 0;
  const m = roles?.meio?.length || 0;
  const a = roles?.ataque?.length || 0;

  if (z === 4 && m === 3 && a === 2) return "4-1-3-2";
  if (z === 4 && m === 4 && a === 2) return "4-4-2";
  if (z === 4 && m === 3 && a === 3) return "4-3-3";
  if (z === 4 && m === 2 && a === 4) return "4-2-4";
  if (z === 4 && m === 5 && a === 1) return "4-5-1";
  if (z === 5 && m === 3 && a === 2) return "5-3-2";
  if (z === 3 && m === 5 && a === 2) return "3-5-2";
  if (z === 3 && m === 4 && a === 3) return "3-4-3";
  if (z === 4 && m === 1 && a === 4) return "4-1-4-1";
  if (z === 4 && m === 2 && a === 3) return "4-2-3-1";

  return `${z}-${m}-${a}`;
}


// === Fase / Bloco / Compactação ===
function detectPhase(possession, opponentFormation) {

  // Quando a posse é do Guarani (verde), fase é ataque por padrão
  if (possession === "verde") {
    return { phase: "Ataque", bloco: "Alto", compactacao: "Larga" };
  }

  // ✅ Formações defensivas (bloco baixo, retranca)
  const blocoBaixo = ["5-4-1", "5-3-2", "4-5-1", "4-1-4-1"];
  
  // ✅ Formações equilibradas (bloco médio)
  const blocoMedio = ["4-4-2", "4-3-3", "3-5-2", "3-4-3"];
  
  // ✅ Formações ofensivas (linha alta, amplitude para contra-ataque)
  const blocoAlto = ["4-2-3-1", "4-2-4"];

  if (blocoBaixo.includes(opponentFormation)) {
    return { phase: "Defesa", bloco: "Baixo", compactacao: "Curta" };
  }

  if (blocoMedio.includes(opponentFormation)) {
    return { phase: "Transição", bloco: "Médio", compactacao: "Média" };
  }

  if (blocoAlto.includes(opponentFormation)) {
    return { phase: "Ataque", bloco: "Alto", compactacao: "Larga" };
  }

  // fallback padrão
  return { phase: "Defesa", bloco: "Baixo", compactacao: "Curta" };
}


// === Contra-formação — Filosofia Carlos Alberto Silva (mesclada com contra-ataque IA) ===
function chooseCounterFormation(opponentFormation, possession = "verde", phase = "") {

  // NOVO: Evita espelhamento ineficiente (4-4-2 x 4-4-2)
  if (opponentFormation === "4-4-2" && phase === "Ataque") {
    console.log("⚠️ Espelhamento detectado (4-4-2 x 4-4-2). Mudando para 4-3-3 para atacar half-spaces.");
    return "4-3-3";  // ganho de profundidade + meio mais forte
  }

  // ⚡ 1) DETECÇÃO DE CONTRA-ATAQUE (RECUPERAÇÃO DE BOLA) ========================
  const vulneraveisContraAtaque = ["4-2-4", "3-4-3", "4-3-3", "4-2-3-1"];

  if (phase === "Defesa" && possession === "verde" && vulneraveisContraAtaque.includes(opponentFormation)) {
    console.log("⚡ TRANSIÇÃO RÁPIDA ATIVADA (contra-ataque)!");
    return "4-2-4"; // explosão vertical — muita profundidade
  }


  // 🍃 2) FILOSOFIA CARLOS ALBERTO SILVA — MANTIDA E RESPEITADA ===================
  if (possession === "verde") {  // COM POSSE
    switch (opponentFormation) {

      case "5-4-1":
      case "5-3-2":
        return "4-2-3-1"; // infiltração paciente

      case "4-4-2":
        return "4-3-3";   // atacar half-spaces

      case "4-3-3":
        return "4-2-3-1"; // cortar triangulação

      case "4-2-4":
        return "4-1-4-1"; // ganhar meio

      case "4-1-4-1":
        return "4-2-3-1"; // camisa 10 vem ditar ritmo

      case "3-5-2":
        return "4-3-3";  // amplitude máxima

      case "3-4-3":
        return "4-2-4";  // atacar costas dos alas

      default:
        return "4-3-3";  // postura base
    }
  }

  // ❌ 3) SEM POSSE DE BOLA (ORGANIZAÇÃO DEFENSIVA) ==============================
  else {  
    switch (opponentFormation) {

      case "4-3-3":
        return "4-5-1"; // fechar meio

      case "4-2-3-1":
        return "4-4-2"; // encaixe no 10

      case "4-1-4-1":
        return "4-3-3"; // cortar linha do volante

      case "4-4-2":
        return "4-4-2"; // espelhamento seguro

      case "3-5-2":
        return "5-4-1"; // cobrir atacantes duplos

      case "3-4-3":
        return "5-3-2"; // alas recuam

      case "4-2-4":
        return "4-1-4-1"; // proteger transição

      default:
        return "4-4-2"; // disciplina
    }
  }
}



// === Monta o Verde (direita → esquerda) ===// === Monta o Verde (direita → esquerda) ===
// Inteligência posicional baseada em:
// - formação
// - fase (ataque/defesa)
// - posição da bola (através de "ball.left / ball.top")
// - Filosofia Carlos Alberto Silva (organização + superioridade no setor da bola)

function buildGreenFromFormation(formationKey, ball, phase = "defesa") {
  const formation = global.FORMATIONS[formationKey] || global.FORMATIONS["4-3-3"];
  const greenAI = [];

  const BALL_X = ball?.left ?? FIELD_WIDTH / 2;
  const BALL_Y = ball?.top ?? FIELD_HEIGHT / 2;

  let offsetX = 0;
  let compactY = 0;

  // Offset horizontal por formação (linha mais alta ou mais baixa)
  const offsetRules = {
    "4-1-4-1": 30,
    "4-2-3-1": 20,
    "4-4-2": 10,
    "4-3-3": 10,
    "3-5-2": 60,
    "4-2-4": 100,
    "5-4-1": 40,
    "5-3-2": 45,
    "3-4-3": 65
  };

  offsetX = offsetRules[formationKey] || 10;

  // Compactação vertical dependente da fase
  compactY = phase === "defesa" ? 40 : 0;

  for (const pos of formation) {
    const jitter = Math.random() * 4 - 2;

    // === Ajuste posicional no eixo X (compacta ou expande conforme fase)
    let baseX = phase === "ataque"
      ? pos.prefferedZone[0] - offsetX
      : pos.prefferedZone[0] + offsetX;

    // === Inteligência posicional: move o jogador na direção da bola
    const influence = formationKey === "4-1-4-1" && pos.id === 16
      ? 0.40 // volante da saída 3+1 se aproxima mais
      : 0.25 // os demais se movem menos

    baseX = baseX * (1 - influence) + BALL_X * influence;

    // === Compactação vertical (setor da bola)
    const baseY = pos.prefferedZone[1] + (BALL_Y - pos.prefferedZone[1]) * 0.20 - compactY;

    greenAI.push({
      id: pos.id,
      left: Math.max(20, Math.min(FIELD_WIDTH - 20, baseX)),
      top: Math.max(25, Math.min(FIELD_HEIGHT - 25, baseY + jitter))
    });
  }

  // === Goleiro fica alinhado com a bola e eixo do campo
  greenAI.push({
    id: 23,
    left: FIELD_WIDTH - 30,
    top: BALL_Y
  });

  return { greenAI };
}


// ---------------------------------------------------------------
// === CLASSIFICAÇÃO TÁTICA POR TERÇOS DO CAMPO (DEF / MID / ATT)
// ---------------------------------------------------------------
function classifyByThird(players){
  const DEF_LIMIT = FIELD_WIDTH / 3;       // 1º terço (defesa)
  const MID_LIMIT = (FIELD_WIDTH / 3) * 2; // 2º terço (meio)

  let def = 0, mid = 0, att = 0;

  for (const p of players) {
    if (p.left < DEF_LIMIT) def++;
    else if (p.left < MID_LIMIT) mid++;
    else att++;
  }

  return { def, mid, att };
}


// === DETECÇÃO REAL POR POSIÇÃO (SEM D/M/A) ===
// Divide o campo em terços e conta aglomerações
function detectFormationAuto(greenPlayers, fieldWidth = 600, fieldHeight = 300) {
  const DEF_LINE = fieldHeight * 0.35;  // abaixo → defesa
  const MID_LINE = fieldHeight * 0.65;  // meio
  // acima disso → ataque

  let d = 0, m = 0, a = 0;

  for (const p of greenPlayers) {
    if (p.top < DEF_LINE) d++;
    else if (p.top < MID_LINE) m++;
    else a++;
  }

  const signature = `${d}-${m}-${a}`;
  console.log("📌 Assinatura visual detectada:", signature);

  const map = {
    "4-4-2": "4-4-2",
    "4-3-3": "4-3-3",
    "3-5-2": "3-5-2",
    "4-2-3-1": "4-2-3-1",
    "3-4-3": "3-4-3",
    "4-2-4": "4-2-4",
    "4-1-4-1": "4-1-4-1",
    "5-3-2": "5-3-2",
    "5-4-1": "5-4-1"
  };

  return map[signature] || "UNKNOWN"; // fallback
}


// === Função de correspondência com tolerância espacial (hitTest) ===
function detectFormationByProximity(players, tolerance = 30) {
  if (!players || players.length === 0) return "UNKNOWN";

  const formations = Object.keys(global.FORMATIONS || {});
  let bestMatch = { formation: "UNKNOWN", score: 0 };

  for (const key of formations) {
    const positions = (global.FORMATIONS)[key];
    let hits = 0;

    for (const p of players) {
      for (const ref of positions) {
        const dx = p.x - ref.prefferedZone[0];
        const dy = p.y - ref.prefferedZone[1];
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= tolerance) {
          hits++;
          break; // conta apenas uma correspondência por jogador
        }
      }
    }

    const score = hits / positions.length;
    if (score > bestMatch.score) {
      bestMatch = { formation: key, score };
    }
  }

  console.log(`📊 Proximidade: melhor correspondência = ${bestMatch.formation} (${(bestMatch.score * 100).toFixed(1)}%)`);
  return bestMatch.formation;
}


    // --- DETECTA PRESSÃO NA ÁREA DEFENSIVA ---
    function emergencyBlockIfUnderPressure(ball, blackPlayers) {
    // Verde defende À DIREITA do campo
    const AREA_GOLEIRO_X = FIELD_WIDTH - 90;  // ~ Grande Área (ajuste fino se quiser)

    // Se a bola estiver dentro dessa área
    const ballInArea = ball.left >= AREA_GOLEIRO_X;

    // Algum adversário colidindo / muito próximo da bola?
    const blackClose = blackPlayers.some(p => {
      return Math.hypot(p.left - ball.left, p.top - ball.top) < 35; // colisão / pressão
    });

    if (!ballInArea || !blackClose) return null;

    console.log("🚨 Pressão na área detectada! Guarani fecha duas linhas de 3.");

    // --- Monta duas linhas de 3 dentro da área ---
    const LINE_X = FIELD_WIDTH - 45; // quase em cima do goleiro

    const emergency = [
    // Linha 1 (mais à frente)
    { id: 16, left: LINE_X - 15, top: FIELD_HEIGHT / 2 - 45 },
    { id: 14, left: LINE_X - 15, top: FIELD_HEIGHT / 2 },
    { id: 15, left: LINE_X - 15, top: FIELD_HEIGHT / 2 + 45 },

    // Linha 2 (mais próxima do goleiro)
    { id: 13, left: LINE_X, top: FIELD_HEIGHT / 2 - 45 },
    { id: 18, left: LINE_X, top: FIELD_HEIGHT / 2 },
    { id: 17, left: LINE_X, top: FIELD_HEIGHT / 2 + 45 },

    // Goleiro parado na linha central
    { id: 23, left: FIELD_WIDTH - 30, top: FIELD_HEIGHT / 2 }
  ];

  return emergency;
}

// === Fala do Treinador ===
let lastFormation = "";
let lastPhase = "";
function abelSpeech(opponentFormation, detectedFormation, phase, bloco, compactacao) {
  const intro = ["Repara comigo:", "É claro o que está acontecendo:", "Eles mudaram o jogo:", "A gente sabe como reagir:"];
  const corpo = [`Eles estão num ${opponentFormation}, e nós estamos num ${detectedFormation}.`, `Adaptamos pro ${detectedFormation} contra o ${opponentFormation}.`];
  const contexto = [`Fase ${phase.toLowerCase()}, bloco ${bloco.toLowerCase()}, compactação ${compactacao.toLowerCase()}.`];
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  return `${pick(intro)} ${pick(corpo)} ${pick(contexto)}`;
}

// === DETECTOR TÁTICO COM CLUSTERING (sem depender de D/M/A) ===
// detecta linhas defensivas, meio-campo e ataque, mesmo tortos

function detectFormationByClustering(players) {
  if (!players || players.length < 6) return "UNKNOWN";
  const noGK = players.length === 11 ? players.filter((p) => p !== findGoalkeeper(players)) : players;
  const lineFormation = detectFormationByLines(noGK);
  if (lineFormation) {
    console.log("📌 Assinatura por linhas:", lineFormation);
    return lineFormation;
  }

  const templateMatch = detectFormationByTemplate(noGK);
  console.log("📌 Clustering fallback/template:", templateMatch);
  return templateMatch.formation || "UNKNOWN";
}

function detectHybridFormation(players) {
  if (!players || players.length < 4) return "indefinido";

  // 🧤 GK
  const gk = findGoalkeeper(players);
  const playersNoGK = players.filter(p => p !== gk);

  // 📊 TERÇOS
  const thirds = analyzeFieldThirds(playersNoGK);
  const { def, mid, att } = thirds;

  // 🔗 ELO
  const roles = detectEloFormation(playersNoGK);
  let eloFormation = null;
  if (roles && Object.values(roles).some(arr => arr.length > 0)) {
    eloFormation = interpretFormation(roles);
  }
  const lineFormation = detectFormationByLines(playersNoGK);
  const templateMatch = detectFormationByTemplate(playersNoGK);
  const tercosFormation = `${def}-${mid}-${att}`;

  const voted = voteFormation([
    { formation: lineFormation, weight: 3 },
    { formation: templateMatch.formation, weight: templateMatch.score < 55 ? 3 : 2 },
    { formation: eloFormation, weight: 2 },
    { formation: tercosFormation, weight: 1 }
  ]);

  console.log("🧠 Hybrid detector:", {
    thirds: tercosFormation,
    lineFormation,
    eloFormation,
    templateFormation: templateMatch.formation,
    templateScore: Number.isFinite(templateMatch.score) ? templateMatch.score.toFixed(2) : "inf",
    votes: voted.votes
  });

  if (voted.formation && isTacticallyValid(voted.formation)) {
    return voted.formation;
  }

  console.warn("⚠ nenhum válido — fallback 4-2-3-1");
  return templateMatch.formation || "4-2-3-1";
}



// === Endpoint IA ===
app.post("/ai/analyze", async (req, res) => {
  try {
   if (!global.FORMATIONS || Object.keys(global.FORMATIONS).length === 0) {
     console.log("♻️ Recuperando FORMATIONS após reinicialização…");
     const formationsModule = await import('./js/formations.mjs');
     global.FORMATIONS = formationsModule.default || formationsModule;
     console.log("⚽ FORMATIONS RECARREGADAS:", Object.keys(global.FORMATIONS));
   }

	     const {
         green = [],
         black = [],
         ball = {},
         possession = "preto",
         tacticalRoles = {},
         opponentFormation: opponentFormationInput = null,
         opponentFormationVision: opponentFormationVisionInput = null
       } = req.body;
       const opponentFormationHint = opponentFormationVisionInput || opponentFormationInput || null;

	     const gk = findGoalkeeper(black);
	     const playersNoGK = black.filter(p => p !== gk);
	     console.log("🧤 Backend GK detectado:", gk);

	     // 🔒 Fallback SEGURO – SEMPRE EXISTE
	     let detectedFormation = "4-4-2";

	     // 🔍 IA TÁTICA HÍBRIDA (Terço + ELO + GK)
	     const hybridFormation = playersNoGK.length >= 4 ? detectHybridFormation(playersNoGK) : null;
	     if (hybridFormation && hybridFormation !== "indefinido") {
	     detectedFormation = hybridFormation;
	     console.log("🧠 Formação detectada via IA HÍBRIDA (ELO + terços + GK):", hybridFormation);
	   }
	   
// --- RESULTADOS DISPONÍVEIS --- //
const viaVision = opponentFormationHint;
const viaTerços = playersNoGK.length ? analyzeFieldThirds(playersNoGK)?.shape : null;
const viaHibrida = hybridFormation;
const viaLinhas = playersNoGK.length ? detectFormationByLines(playersNoGK) : null;
const viaTemplate = playersNoGK.length ? detectFormationByTemplate(playersNoGK) : { formation: null, score: Number.POSITIVE_INFINITY };
const viaCluster = black && black.length >= 6 ? detectFormationByClustering(black) : null;

const votedFormation = voteFormation([
  { formation: viaVision, weight: 3 },
  { formation: viaHibrida, weight: 3 },
  { formation: viaLinhas, weight: 2 },
  { formation: viaCluster, weight: 2 },
  { formation: viaTemplate.formation, weight: viaTemplate.score < 55 ? 2 : 1 },
  { formation: viaTerços, weight: 1 }
]);

console.log("📊 Votação tática:", {
  viaVision,
  viaHibrida,
  viaLinhas,
  viaCluster,
  viaTemplate: viaTemplate.formation,
  viaTemplateScore: Number.isFinite(viaTemplate.score) ? viaTemplate.score.toFixed(2) : "inf",
  viaTerços,
  votes: votedFormation.votes
});

detectedFormation = votedFormation.formation || detectedFormation;

   
 // ⚖️ Etapa de validação — se for inválido (ex: 2-2-0, 0-3-3...) → usar VISION!
 if (!isTacticallyValid(detectedFormation)) {
   console.warn("⚠ Formação suspeita:", detectedFormation);
   const viaVision = detectOpponentFormationAdvanced(black); // VISION entra aqui!
   if (isTacticallyValid(viaVision)) {
     detectedFormation = viaVision;
     console.log("🧠 Formação confirmada via Vision:", viaVision);
   } else {
     console.warn("⚠ Vision também falhou → fallback moderno: 4-2-3-1");
     detectedFormation = "4-2-3-1";  // padrão FIFA/Tite
   }
 }
     
	     const opponentFormation = (opponentFormationHint && opponentFormationHint !== "null")
	       ? opponentFormationHint
	       : detectOpponentFormationAdvanced(black);

	     // === 1) SE O USUÁRIO DEFINIR D/M/A → ISSO SOBRESCREVE A LEITURA AUTOMÁTICA ===
	     if (tacticalRoles && Object.keys(tacticalRoles).length > 0) {
  let d = 0, m = 0, a = 0;
  for (const id in tacticalRoles) {
    const role = tacticalRoles[id];
    if (role === "D") d++;
    if (role === "M") m++;
    if (role === "A") a++;
  }
  const manualSignature = `${d}-${m}-${a}`;
  const formationMap = {
    "4-4-2": "4-4-2",
    "4-3-3": "4-3-3",
    "4-2-3-1": "4-2-3-1",
    "3-5-2": "3-5-2",
    "3-4-3": "3-4-3",
    "5-4-1": "5-4-1",
    "5-3-2": "5-3-2",
    "4-2-4": "4-2-4",
    "4-5-1": "4-5-1",
    "4-1-4-1": "4-1-4-1"
  };
  if (formationMap[manualSignature]) {
    detectedFormation = formationMap[manualSignature];
     console.log("🎯 Formação AJUSTADA via tacticalRoles:", detectedFormation);
  }
}

// === 2) Se o chat pedir manualmente → SOBRESCREVE TUDO
if (req.body.manualFormation) {
  detectedFormation = req.body.manualFormation;
}


// === 3) Detecta fase ANTES da contraformação ===
const { phase, bloco, compactacao } = detectPhase(possession, opponentFormation);

// === 4) Só reage taticamente SE NÃO for treino
if (!req.body.trainingMode && detectedFormation === opponentFormation) {
  detectedFormation = chooseCounterFormation(opponentFormation, possession, phase);
  console.log("⚽ Formação ALTERADA por reação tática:", detectedFormation);
} else {
  console.log(
    req.body.trainingMode
      ? "🎓 Modo TREINO — sem contra-formação, mantendo detecção/clustering"
      : "🧠 Mantendo formação detectada visualmente (clustering): " + detectedFormation
  );
}


    // === 5) Só agora gera o posicionamento real do Guarani ===
    const { greenAI } = buildGreenFromFormation(
      detectedFormation,
      ball,
      possession === "verde" ? "ataque" : "defesa"
    );
    let coachComment = "";
    if (opponentFormation !== lastFormation || phase !== lastPhase) {
      coachComment = abelSpeech(opponentFormation, detectedFormation, phase, bloco, compactacao);
      lastFormation = opponentFormation;
      lastPhase = phase;
    }
    // ✅ Checa defesa de emergência
    const emergency = emergencyBlockIfUnderPressure(ball, black);
    if (emergency) {
      return res.json({
        opponentFormation,
        detectedFormation,
        phase: "defesa",
        bloco: "BAIXO",
        compactacao: "ULTRA",
        green: emergency,
        coachComment: "Calma! Fechamos duas linhas de três dentro da área!"
        });
      }

    res.json({ opponentFormation, detectedFormation, phase, bloco, compactacao, trainingMode: true, coachComment, tacticalRoles, green: greenAI });
  } catch (err) {
    console.error("Erro /ai/analyze", err);
    res.status(500).json({ error: "Erro interno IA", details: err.message });
  }
});

// === IA VISUAL + AÇÃO TÁTICA REAL ===
app.post("/ai/vision-tactic", async (req, res) => {
  try {
	if (!global.FORMATIONS || Object.keys(global.FORMATIONS).length === 0) {
      console.error("❌ FORMATIONS indisponível (vision-tactic)");
      return res.status(500).json({ error: "FORMATIONS indisponível no backend" });
    }
    const { fieldImage, ball, green, black, tacticalRoles = {} } = req.body;
    
    // ============================================
  // 1) PRIORIDADE: SE O FRONT JÁ MANDOU COORDENADAS DO TIME ADVERSÁRIO
// ============================================
  if (Array.isArray(black) && black.length >= 4) {
   console.log("📌 Coordenadas do adversário recebidas — pulando visão.");

   // Detecta elo: zaga, meio, ataque
   const roles = detectEloFormation(black);  

   // Interpreta a formação tática real
   const formation = interpretFormation(roles);

   return res.json({
     opponentFormation: formation,
     detectedFormation: formation,
     playersDetected: black.length,
     ballDetected: !!ball,
     coachComment: `Formação detectada: ${formation} (via ELO + terços)`,
     green: await generateResponseForGreen(formation) // sua lógica
   });
 }

    console.log("📸 Enviando imagem para Google Vision...");

    let players = [];
    let ballDetected = false;

    try {
      const [result] = await client.objectLocalization({
        image: { content: fieldImage } // base64
      });

      const objects = result.localizedObjectAnnotations ?? [];
      console.log("🧠 Google detectou:", objects.map(o => o.name));

      players = objects
        .filter(o => o.name === "Person")
        .map(o => ({
          x: Math.round(o.boundingPoly.normalizedVertices[0].x * 600),
          y: Math.round(o.boundingPoly.normalizedVertices[0].y * 300)
        }));

      ballDetected = objects.some(o => o.name === "Sports ball");
    } catch (visionErr) {
      console.warn("⚠️ Erro no Google Vision, ativando fallback...");
    }

    // ✅ FALLBACK: se Vision detectou poucos jogadores (< 6), usa o desenho (black)
    if (players.length < 6) {
      console.log(`⚠️ Vision detectou só ${players.length} jogadores → usando FALLBACK geométrico`);
      players = black; // usa as coordenadas que vieram do front
    }
  //  ⚽ DETECÇÃO POR ELO  — INTELIGÊNCIA TÁTICA REAL
 const roles = detectEloFormation(players);  // players agora = black[]
 const eloFormation = interpretFormation(roles);

 if (eloFormation !== "4-2-3-1") { // Se não for fallback, aceitamos!
   return res.json({
     opponentFormation: eloFormation,
     detectedFormation: eloFormation,
     playersDetected: players.length,
     ballDetected,
     coachComment: `Formação detectada via ELO: ${eloFormation}`,
     green: await generateResponseForGreen(eloFormation)
   });
 }
 console.log("⚠️ ELO não fechou formação — deixando fallback continuar…");

    // Aplica seu algoritmo tático existente
    const { def, mid, att } = classifyByThird(players);
	// Avalia também por proximidade espacial (hitTest)
	let formationOpponent = detectFormationByProximity(players, 25); // raio ~25px
	// === NOVO MÓDULO: refinamento via tacticalRoles (D/M/A do front) ===
	if (tacticalRoles && Object.keys(tacticalRoles).length > 0) {
    console.log("🎯 TacticalRoles recebidos:", tacticalRoles);

    let countD = 0, countM = 0, countA = 0;

    // Conta quantos jogadores estão marcados manualmente
    for (const k in tacticalRoles) {
      if (tacticalRoles[k] === "D") countD++;
      if (tacticalRoles[k] === "M") countM++;
      if (tacticalRoles[k] === "A") countA++;
    }

    // Monta assinatura manual (ex: 4-4-2 vira algo como: 4D - 4M - 2A)
    const signature = `${countD}-${countM}-${countA}`;
    console.log("🎯 Assinatura manual:", signature);

    // Regras decisórias baseadas na escolha do usuário
    const manualMap = {
      "4-4-2": "4-4-2",
      "4-3-3": "4-3-3",
      "4-2-3-1": "4-2-3-1",
      "3-5-2": "3-5-2",
      "3-4-3": "3-4-3",
      "5-4-1": "5-4-1",
      "5-3-2": "5-3-2",
      "4-2-4": "4-2-4",
      "4-5-1": "4-5-1",
      "4-1-4-1": "4-1-4-1"
    };

    if (manualMap[signature]) {
      console.log("📌 Formação ajustada pelos TacticalRoles:", manualMap[signature]);
      formationOpponent = manualMap[signature];
    }
}

	
	if (!formationOpponent || formationOpponent === "UNKNOWN") {
	formationOpponent = detectFormationByThirds(def, mid, att);
	}

    // FALLBACK quando retorna UNKNOWN ou vazio
    if (!formationOpponent || formationOpponent === "UNKNOWN") {
      console.log("⚠️ Formação indeterminada → usando fallback avançado");
      formationOpponent = detectOpponentFormationAdvanced(players) ?? "4-4-2";
    }

    // NOVO: adiciona prompt descritivo para a IA tática (explicativo)
    const visionPrompt = `
			Você é um analista tático de futebol.
			Além das coordenadas espaciais, você recebe rótulos humanos:
			D = defesa, M = meio, A = ataque.
			Esses rótulos indicam a intenção e função tática do jogador.

			Use:
			- terços do campo (defesa, meio, ataque)
			- agrupamento geométrico
			- D/M/A quando existir como reforço

			Os sistemas possíveis são:
			4-4-2, 4-3-3, 4-2-3-1, 3-5-2, 3-4-3, 5-4-1, 5-3-2, 4-2-4, 4-5-1, 4-1-4-1.

			Responda somente com o nome da formação.
			`;

    console.log("📋 Prompt tático de observação configurado:", visionPrompt);

    // (futuramente, você pode enviar o prompt e players para outro modelo, tipo Gemini ou GPT)

    // 🕒 Atraso para sincronizar feedback no front
    setTimeout(() => {
      return res.json({
        opponentFormation: formationOpponent,
        playersDetected: players.length,
        ballDetected,
        coachComment:
          players.length < 6
            ? "Fallback ativado (geométrico)."
            : "Formação detectada via Google Vision."
      });
    }, 5000); // 5s de delay visual
  } catch (err) {
    console.error("❌ Erro Vision:", err);
    res.status(500).json({ error: "Falha no Vision", details: err.message });
  }
});

// === Socket.IO realtime ===
io.on("connection", (socket) => {

  console.log("🟢 Novo cliente conectado:", socket.id);

  socket.on("join-room", async (room) => {
    console.log("📥 SERVER RECEBEU join-room:", room);

    // sai de todas as salas antes de entrar na nova
    [...socket.rooms]
      .filter(r => r !== socket.id)
      .forEach(r => socket.leave(r));

    socket.join(room);
    socket.emit("joined-room", room);

    const clients = await io.in(room).fetchSockets();
    io.to(room).emit("room-user-count", clients.length);

    console.log("📤 ENVIANDO room-user-count:", clients.length);
  });

  // ✅ movimento de players
socket.on("player-move", (data) => {
  console.log("📤 SERVER recebeu player-move:", data);

  if (!data.room) {
    console.log("⛔ ignorado (sem room)");
    return;
  }

  socket.to(data.room).emit("player-move", data);
});


  // ✅ movimento da bola
  socket.on("ball-move", (data) => {
    if (!data.room) return;
    socket.to(data.room).emit("ball-move", data);
  });

  // ✅ desenho tático
  socket.on("path_draw", (data) => {
    if (!data.room) return;
    socket.to(data.room).emit("path_draw", data);
  });


socket.on("disconnect", async () => {
  console.log("🔴 DISCONNECT:", socket.id);

  // quando desconectar, atualiza o contador da(s) sala(s)
  for (const r of socket.rooms) {
    if (r !== socket.id) {
      const clients = await io.in(r).fetchSockets();
      io.to(r).emit("room-user-count", clients.length);
    }
  }
});
});// ✅ Socket real-time para aprimoramento esportivo

// === Endpoint de chat da Biblioteca C.A.Silva (usando OpenAI) ===


const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!groq.apiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY ausente no servidor" });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // 🔥 rápido e gratuito
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: `
Você é a biblioteca Carlos Alberto Silva, finado treinador do Guarani Futebol Clube.
Seu foco é disciplina tática, organização defensiva e inteligência coletiva.
Você ensina, não critica.
Você explica conceitos com clareza e autoridade.
Você valoriza o equilíbrio entre defesa e ataque.
`
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "A Biblioteca C.A.Silva ficou em silêncio...";

    // Detecta formação no texto do usuário
    function extractFormation(text) {
      const regex = /\b(4-4-2|4-3-3|4-2-3-1|3-5-2|5-4-1|4-5-1|4-2-4|3-4-3|5-3-2)\b/gi;
      return text.match(regex)?.[0] ?? null;
    }

    res.json({
      reply,
      formationRequested: extractFormation(message) || null
    });

  } catch (err) {
    console.error("Erro no /api/chat:", err);
    res.status(500).json({
      error: "Falha na comunicação com o Groq",
      details: err.message
    });
  }
});




// ===============================================
// ✅ SISTEMA DE RANKING (em memória por enquanto)
// ===============================================

const rankingStore = []; // { name, email, hash, points, goals, ts }

// Função simples pra "hash" da senha (base64 só para demo)
function hashPass(s) {
  return Buffer.from(s).toString("base64");
}

// Verifica se a pontuação está dentro do período solicitado
function isWithinRange(timestamp, range) {
  const now = new Date();

  if (range === "daily") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return timestamp >= start.getTime();
  }

  if (range === "weekly") {
    const first = now.getDate() - now.getDay() + 1; // 2a feira
    const start = new Date(now.getFullYear(), now.getMonth(), first);
    return timestamp >= start.getTime();
  }

  if (range === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return timestamp >= start.getTime();
  }

  return true;
}

/**
 * ✅ Salva pontuação no ranking
 * Body esperado:
 * {
 *   name: "Fulano",
 *   email: "a@b.com",
 *   pass: "123",
 *   points: 12,
 *   goals: 7
 * }
 */
app.post("/ranking/score", (req, res) => {
  const { name, email, pass, points, goals } = req.body;

  if (!name || !email || !pass) {
    return res.status(400).json({ error: "Nome, email e senha são obrigatórios." });
  }

  const hash = hashPass(pass);

  let user = rankingStore.find(u => u.email === email);

  if (!user) {
    // cria novo
    user = {
      name,
      email,
      hash,
      points: Number(points || 0),
      goals: Number(goals || 0),
      ts: Date.now()
    };
    rankingStore.push(user);
  } else {
    // usuário já existe → verifica senha
    if (user.hash !== hash) {
      return res.status(403).json({ error: "Senha incorreta para este usuário" });
    }

    // permite atualizar nome + pontuação
    user.name = name;
    user.points = Number(points || 0);
    user.goals = Number(goals || 0);
    user.ts = Date.now();
  }

  res.json({ ok: true });
});

/**
 * ✅ Lista ranking
 * GET /ranking?range=daily
 * GET /ranking?range=weekly
 * GET /ranking?range=monthly
 */
app.get("/ranking", (req, res) => {
  const range = req.query.range || "daily";

  const filtered = rankingStore
    .filter(user => isWithinRange(user.ts, range))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.goals - a.goals;
    })
    .slice(0, 50); // limite (top 50)

  res.json({ top: filtered });
});


// === Inicializa Render ===
const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, () => console.log(`✅ AI TÁTICA v12.2 + Realtime rodando na porta ${PORT}`));

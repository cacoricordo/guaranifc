// ===== ⚽ Tactical AI 4.2.2-FIX =====
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// === Inicialização do servidor ===
const app = express();
app.use(cors());
app.use(bodyParser.json());

// === Suporte a caminhos absolutos (necessário para Render e ES Modules) ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Servir o frontend estático (index.html + assets) ===
app.use(express.static(__dirname));

// === Rota padrão: abre o index.html ===
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


app.use(cors());
app.use(bodyParser.json());

const FIELD_WIDTH = 600;
const FIELD_HEIGHT = 300;
const CENTER_X = FIELD_WIDTH / 2;

// === Agrupamento espacial (Tactical Detection 4.2.2-FIX) ===
function detectFormationAdvanced(players) {
  if (!players || players.length < 8) return "4-3-3";

  const RADIUS = 100;
  const clusters = [];

  // Encontrar cluster próximo
  function findCluster(px, py) {
    for (const c of clusters) {
      const dx = px - c.centerX;
      const dy = py - c.centerY;
      if (Math.sqrt(dx * dx + dy * dy) < RADIUS) return c;
    }
    return null;
  }

  // Agrupa jogadores em linhas (com suavização)
  for (const p of players) {
    const c = findCluster(p.left, p.top);
    if (c) {
      c.players.push(p);
      c.centerX = (c.centerX * (c.players.length - 1) + p.left) / c.players.length;
      c.centerY = (c.centerY * (c.players.length - 1) + p.top) / c.players.length;
    } else {
      clusters.push({ players: [p], centerX: p.left, centerY: p.top });
    }
  }

  // === Merge de linhas próximas (como linhas defensivas e de meio campo) ===
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const dx = clusters[i].centerX - clusters[j].centerX;
        const dy = clusters[i].centerY - clusters[j].centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          clusters[i].players.push(...clusters[j].players);
          clusters[i].centerX =
            clusters[i].players.reduce((s, c) => s + c.left, 0) / clusters[i].players.length;
          clusters[i].centerY =
            clusters[i].players.reduce((s, c) => s + c.top, 0) / clusters[i].players.length;
          clusters.splice(j, 1);
          merged = true;
          break;
        }
      }
      if (merged) break;
    }
  }

  // === Ordena linhas da defesa pro ataque (eixo X crescente)
  clusters.sort((a, b) => a.centerX - b.centerX);
  const counts = clusters.map(c => c.players.length);

  // === Heurísticas baseadas em número de linhas e jogadores
  const signature = counts.join('-');

  if (signature.startsWith('4-4-2')) return "4-4-2";
  if (signature.startsWith('3-5-2')) return "3-5-2";
  if (signature.startsWith('4-2-3-1')) return "4-2-3-1";
  if (signature.startsWith('5-3-2')) return "5-3-2";
  if (signature.startsWith('3-4-3')) return "3-4-3";
  if (signature.startsWith('4-3-3')) return "4-3-3";

  // === Análise espacial por X médio (distância entre linhas)
  const spacing = [];
  for (let i = 1; i < clusters.length; i++) {
    spacing.push(clusters[i].centerX - clusters[i - 1].centerX);
  }
  const avgSpacing = spacing.reduce((s, d) => s + d, 0) / (spacing.length || 1);

  if (clusters.length === 3 && avgSpacing < 120) return "4-4-2";
  if (clusters.length === 3 && avgSpacing > 160) return "4-3-3";
  if (clusters.length === 4) return "4-2-3-1";

  return "4-4-2";
}

// === FORMATIONS base ===
const FORMATIONS = {
  "4-4-2": [
    { id:13, zone:[70, 80] }, { id:14, zone:[70, 220] },
    { id:15, zone:[100, 130] }, { id:16, zone:[100, 170] },
    { id:17, zone:[200, 80] }, { id:18, zone:[200, 130] },
    { id:19, zone:[200, 170] }, { id:20, zone:[200, 220] },
    { id:21, zone:[320, 120] }, { id:22, zone:[320, 180] }
  ],
  "4-3-3": [
    { id:13, zone:[80,80] }, { id:14, zone:[80,220] },
    { id:15, zone:[100,130] }, { id:16, zone:[100,170] },
    { id:17, zone:[210,100] }, { id:18, zone:[210,150] }, { id:19, zone:[210,200] },
    { id:20, zone:[320,80] }, { id:21, zone:[330,150] }, { id:22, zone:[320,220] }
  ],
  "4-2-3-1": [
    { id:13, zone:[70,80] }, { id:14, zone:[70,220] },
    { id:15, zone:[100,130] }, { id:16, zone:[100,170] },
    { id:17, zone:[180,120] }, { id:18, zone:[180,180] },
    { id:19, zone:[240,100] }, { id:20, zone:[240,150] }, { id:21, zone:[240,200] },
    { id:22, zone:[320,150] }
  ]
};

// === Monta o time vermelho ===
function buildRedFromFormation(formationKey, ball, green) {
  const formation = FORMATIONS[formationKey] || FORMATIONS["4-3-3"];
  const red = [];

  for (const pos of formation) {
    const jitter = Math.random() * 8 - 4;
    red.push({
      id: pos.id,
      left: FIELD_WIDTH - pos.zone[0],
      top: pos.zone[1] + jitter
    });
  }

  // Goleiro
const gkTop = (ball && typeof ball.top === 'number')
  ? FIELD_HEIGHT / 2 + (ball.top - FIELD_HEIGHT / 2) * 0.3 // 30% do movimento da bola
  : FIELD_HEIGHT / 2;

red.unshift({
  id: 23,
  left: FIELD_WIDTH - 10,
  top: gkTop
});

  return { red };
}

// === Endpoint principal ===
app.post("/ai/analyze", async (req, res) => {
  try {
    const { green = [], black = [], ball = {} } = req.body;
    const detectedFormation = detectFormationAdvanced(black.length ? black : green);

    const { red } = buildRedFromFormation(detectedFormation, ball, green);

    res.json({
      detectedFormation,
      red
    });
  } catch (err) {
    console.error("[AI ANALYZE ERROR]", err);
    res.status(500).json({ error: "Erro interno na IA" });
  }
});

// === Inicialização do Servidor ===
const PORT = 10000;
app.listen(PORT, () => console.log(`🚀 AI Tática 4.2.2-FIX rodando na porta ${PORT}`));


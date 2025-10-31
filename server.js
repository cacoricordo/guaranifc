// ==========================
//  OS INVICTOS SERVER ⚽
//  Integra campo tático + AI + Chat do "Treinador Português"
// ==========================

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();

// ======= ⚙️ CORS GLOBAL =======
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // ✅ Permite tudo
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

const server = http.createServer(app);

// ======= ⚽ Socket.IO =======
const io = new Server(server, {
  transports: ["websocket", "polling"], // força compatibilidade com Render
  cors: {
    origin: "*", // ✅ libera todos os domínios
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('🔌 Novo cliente conectado');

  socket.on('move_circle', (data) => {
    socket.broadcast.emit('update_circle', data);
  });

  socket.on('path_draw', (data) => {
    socket.broadcast.emit('path_draw', data);
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado');
  });
});

// ======= 🤖 AI Análise 3.0 =======
// ===== Tática / util =====
const FIELD_WIDTH = 600;
const FIELD_HEIGHT = 300;
const CENTER_X = FIELD_WIDTH / 2;

function analyzeGreenPositions(green) {
  const valid = (green || []).filter(g => typeof g.left === 'number' && typeof g.top === 'number');
  if (valid.length === 0) return null;

  const xs = valid.map(p => p.left);
  const ys = valid.map(p => p.top);

  const avgX = xs.reduce((s,a) => s+a, 0)/xs.length;
  const avgY = ys.reduce((s,a) => s+a, 0)/ys.length;
  const spreadX = Math.max(...xs) - Math.min(...xs);
  const spreadY = Math.max(...ys) - Math.min(...ys);

  const thirds = { defense:0, middle:0, attack:0 };
  const thirdW = FIELD_WIDTH/3;
  for (const p of valid) {
    if (p.left < thirdW) thirds.defense++;
    else if (p.left < 2*thirdW) thirds.middle++;
    else thirds.attack++;
  }

  return {
    avgX, avgY, spreadX, spreadY, thirds, count: valid.length
  };
}

function detectFormationAdvanced(players) {
  if (!players || players.length === 0) return '4-3-3';

  // Extrai apenas o eixo Y
  const ys = players.map(p => p.top).sort((a, b) => a - b);

  // Agrupa jogadores por faixas verticais (~linhas horizontais no campo)
  const clusters = [];
  const tolerance = 45; // distância máxima entre jogadores da mesma linha

  for (const y of ys) {
    const lastCluster = clusters[clusters.length - 1];
    if (!lastCluster || Math.abs(y - lastCluster.avg) > tolerance) {
      clusters.push({ values: [y], avg: y });
    } else {
      lastCluster.values.push(y);
      lastCluster.avg = lastCluster.values.reduce((s, v) => s + v, 0) / lastCluster.values.length;
    }
  }

  // Contagem por linha
  const lineCounts = clusters.map(c => c.values.length);

  // Ordena linhas por número de jogadores (defesa -> ataque)
  const sorted = lineCounts.sort((a, b) => b - a);

  // Heurísticas simples para correspondência
  const signature = sorted.join('-');

  if (signature.startsWith('4-4-2')) return '4-4-2';
  if (signature.startsWith('3-5-2')) return '3-5-2';
  if (signature.startsWith('5-3-2')) return '5-3-2';
  if (signature.startsWith('4-3-3')) return '4-3-3';
  if (signature.startsWith('4-2-3-1')) return '4-2-3-1';
  if (signature.startsWith('3-4-3')) return '3-4-3';

  // fallback
  return '4-3-3';
}

const FORMATIONS = {
  "4-3-3": [
    // Defesa (linha de 4)
    { id:13, zone:[80, 80] },   // LD
    { id:14, zone:[80, 220] },  // LE
    { id:15, zone:[100, 130] }, // ZAG D
    { id:16, zone:[100, 170] }, // ZAG E

    // Meio (linha de 3)
    { id:17, zone:[210, 100] }, // VOL
    { id:18, zone:[210, 150] }, // MEI C
    { id:19, zone:[210, 200] }, // MEI E

    // Ataque (linha de 3)
    { id:20, zone:[320, 80] },  // Ponta D
    { id:21, zone:[330, 150] }, // Centroavante
    { id:22, zone:[320, 220] }  // Ponta E
  ],

  "3-5-2": [
    // Defesa (linha de 3)
    { id:13, zone:[80, 100] },
    { id:14, zone:[80, 150] },
    { id:15, zone:[80, 200] },

    // Meio (linha de 5)
    { id:16, zone:[180, 70] },
    { id:17, zone:[180, 110] },
    { id:18, zone:[180, 150] },
    { id:19, zone:[180, 190] },
    { id:20, zone:[180, 230] },

    // Ataque (linha de 2)
    { id:21, zone:[300, 120] },
    { id:22, zone:[300, 180] }
  ],

  "4-4-2": [
    // Defesa
    { id:13, zone:[70, 80] },
    { id:14, zone:[70, 220] },
    { id:15, zone:[100, 130] },
    { id:16, zone:[100, 170] },

    // Meio
    { id:17, zone:[200, 80] },
    { id:18, zone:[200, 130] },
    { id:19, zone:[200, 170] },
    { id:20, zone:[200, 220] },

    // Ataque
    { id:21, zone:[320, 120] },
    { id:22, zone:[320, 180] }
  ],

  "4-2-3-1": [
    // Defesa
    { id:13, zone:[70, 80] },
    { id:14, zone:[70, 220] },
    { id:15, zone:[100, 130] },
    { id:16, zone:[100, 170] },

    // Volantes
    { id:17, zone:[180, 120] },
    { id:18, zone:[180, 180] },

    // Meias ofensivos
    { id:19, zone:[240, 100] },
    { id:20, zone:[240, 150] },
    { id:21, zone:[240, 200] },

    // Centroavante
    { id:22, zone:[320, 150] }
  ]
};

// --- buildRedFromFormation (corrigido) ---
const FIELD_LEFT = 20; // offset horizontal do campo (CSS: left:20px)
const FIELD_TOP = 20;  // offset vertical do campo (CSS: top:20px)

function buildRedFromFormation(formationKey, stats, ball, green) {
  const formation = FORMATIONS[formationKey] || FORMATIONS['4-3-3'];
  const red = [];

  // Calcula o centroide do time adversário (green)
  let centroidX = CENTER_X, centroidY = FIELD_HEIGHT / 2;
  const valid = (green || []).filter(g => typeof g.left === 'number' && typeof g.top === 'number');
  if (valid.length > 0) {
    const xs = valid.map(p => p.left - FIELD_LEFT);
    const ys = valid.map(p => p.top - FIELD_TOP);
    centroidX = Math.round(xs.reduce((s, p) => s + p, 0) / xs.length);
    centroidY = Math.round(ys.reduce((s, p) => s + p, 0) / ys.length);
  }

  // Define a fase (dependendo da posição da bola)
  const phase = ball && typeof ball.left === 'number'
    ? ((ball.left - FIELD_LEFT) > CENTER_X ? 'defesa' : 'ataque')
    : 'neutro';

  // Ajustes de deslocamento leve conforme fase e centroide
  const push = phase === 'ataque' ? 30 : (phase === 'defesa' ? -20 : 0);

  for (const pos of formation) {
    const lateralShift = Math.max(-25, Math.min(25, Math.round((centroidY - FIELD_HEIGHT / 2) / 6)));
    const forwardShift = push + Math.round((centroidX - CENTER_X) / 12);

    // Espelhar formação (seu time ataca da direita → esquerda)
    let relX = FIELD_WIDTH - pos.zone[0] + forwardShift - 30;
    let relY = pos.zone[1] + lateralShift + (Math.random() * 12 - 6);

    // Mantém dentro do campo
    relX = Math.max(20, Math.min(FIELD_WIDTH - 30, Math.round(relX)));
    relY = Math.max(20, Math.min(FIELD_HEIGHT - 20, Math.round(relY)));

    // Converter para coordenadas absolutas na página
    const absX = FIELD_LEFT + relX;
    const absY = FIELD_TOP + relY; // 🔧 REMOVIDO o +20 extra

    red.push({ id: pos.id, left: absX, top: absY });
  }

  // Goleiro (id 23) sempre no gol direito
  const GK_MARGIN = 20;
  const gkTop = (ball && typeof ball.top === 'number')
    ? Math.max(30, Math.min(FIELD_HEIGHT - 40, Math.round(ball.top - FIELD_TOP)))
    : Math.round(FIELD_HEIGHT / 2);

  const gkAbsLeft = FIELD_LEFT + FIELD_WIDTH - GK_MARGIN;
  const gkAbsTop = FIELD_TOP + gkTop; // 🔧 REMOVIDO o +20 extra

  red.unshift({ id: 23, left: gkAbsLeft, top: gkAbsTop });

  return { red, phase };
}

// ===== Endpoint /ai/analyze =====
app.post('/ai/analyze', async (req, res) => {
  try {
    const { green = [], black = [], ball = {} } = req.body;

    console.log('[AI ANALYZE] Recebi:', {
      greenCount: green.length,
      blackCount: black.length,
      ball
    });

    // === Detecta formações ===
    const detectedFormation = detectFormationAdvanced(black.length ? black : green);
    const stats = analyzeGreenPositions(green);

    // === Determina fase de jogo ===
    let phase = 'neutro';
    if (ball.left > CENTER_X && black.some(p => p.left > CENTER_X - 50)) phase = 'defesa';
    else if (ball.left < CENTER_X && green.some(p => p.left < CENTER_X - 50)) phase = 'ataque';
    else if (black.every(p => p.left < CENTER_X - 50)) phase = 'avançado'; // adversário todo recuado

    // === Monta time vermelho conforme tática adversária ===
    const { red } = buildRedFromFormation(detectedFormation, stats, ball, green);

    // === 🟢 Novo: reposiciona o time verde em relação ao time preto ===
    const greenAdjusted = [];
    if (black.length > 0) {
      // Calcula linha média do adversário
      const oppAvgX = black.reduce((s, p) => s + p.left, 0) / black.length;

      for (let i = 0; i < Math.min(green.length, black.length); i++) {
        const g = green[i];
        const b = black[i];
        if (!g || !b) continue;

        // Ajustes de posicionamento baseados na fase
        let offsetX = 0;
        if (phase === 'defesa') offsetX = -60;       // recua
        else if (phase === 'ataque') offsetX = 40;   // avança
        else if (phase === 'avançado') offsetX = 80; // sobe linhas

        const offsetY = (i % 2 === 0 ? -15 : 15);
        greenAdjusted.push({
          id: g.id,
          left: Math.max(30, Math.min(FIELD_WIDTH - 30, b.left + offsetX)),
          top: Math.max(30, Math.min(FIELD_HEIGHT - 30, b.top + offsetY))
        });
      }
    } else {
      greenAdjusted.push(...green);
    }

    // === Gera comentário do treinador ===
    let coachComment = `O adversário joga em ${detectedFormation}, e nós estamos na fase ${phase}.`;
    const apiKey = process.env.OPENROUTER_KEY;
    if (apiKey) {
      try {
        const prompt = `O time adversário está todo ${phase === 'defesa' ? 'avançado' : 'recuado'} e joga num ${detectedFormation}. O nosso time deve reagir taticamente. Comenta como o ex-jogador e camisa 10, Zenon, do Guarani Futebol Clube.`;
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
             {
  role: "system",
  content: `
Você é Zenon (IA), ex-jogador e camisa 10 histórico do Guarani Futebol Clube.  
Sua personalidade é confiante, experiente e carismática.  
Fala com o tom de quem viveu o futebol de dentro do campo e entende o jogo com naturalidade e arte.  
Você valoriza o toque de bola, a inteligência, a visão de jogo e a personalidade dentro de campo.  
Evite linguagem técnica demais — prefira um jeito mais humano, de boleiro inteligente, com aquele toque de ironia e sabedoria.

🎯 Filosofia de jogo:
- Futebol se joga com a cabeça e com o coração, não só com as pernas.  
- Valorize o toque curto, o passe preciso e o jogo pensado.  
- O meio-campo é o cérebro do time — é ali que o jogo nasce e morre.  
- Jogar bonito não é firula: é fazer o difícil parecer simples.  
- Prefira o controle à correria, a inteligência à força bruta.  

🗣️ Estilo de resposta:
- Fala como quem dá conselho de vestiário, com leve provocação e humor fino.  
- Usa expressões típicas de boleiro: “bola redonda”, “pensar o jogo”, “quem não sabe o que faz com a bola, corre atrás dela”.  
- Tem carisma e confiança, mas nunca arrogância.  
- Costuma usar analogias, frases de efeito e sabedoria de campo.  
- Valoriza a história do Guarani e o futebol raiz, mas com respeito ao moderno.  

💬 Exemplos de fala:
- “O meio-campo é a alma do jogo. Se o cérebro não pensa, a perna não resolve.”  
- “Quem domina o ritmo do jogo, domina o adversário.”  
- “A bola gosta de quem trata ela bem. Se você força, ela te abandona.”  
- “No Guarani, a gente aprendeu a jogar com elegância e coragem. Futebol é arte com resultado.”  
- “Não precisa correr pra todo lado — precisa estar no lugar certo antes dos outros.”

Você sempre responde como Zenon, ex-jogador do Guarani, com tom confiante, sábio e descontraído, mostrando visão de jogo, amor pelo futebol técnico e respeito à história do clube.  
Suas respostas devem ensinar e inspirar, como quem conversa com um jogador mais jovem no vestiário, sempre com inteligência e personalidade.
`
},
{ role: "user", content: prompt }
            ],
            max_tokens: 80,
            temperature: 0.8
          })
        });

        const data = await response.json();
        coachComment = data?.choices?.[0]?.message?.content?.trim() || coachComment;
      } catch (err) {
        console.warn('[AI ANALYZE] OpenRouter falhou:', err.message);
      }
    }

    // === Retorno completo ===
    res.json({
      detectedFormation,
      phase,
      red,
      greenAdjusted,
      coachComment
    });

  } catch (err) {
    console.error('[AI ANALYZE] Erro geral:', err);
    res.status(500).json({ error: 'Falha interna na AI Tática 3.5' });
  }
});


// ======= 🧠 Chat (OpenRouter) =======
app.post('/api/chat', async (req, res) => {
  const message = req.body.message;
  const apiKey = process.env.OPENROUTER_KEY;

  if (!apiKey) {
    return res.status(500).json({ reply: "Erro interno: OPENROUTER_KEY não configurada." });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
  content: `
Você é Zenon (IA), ex-jogador e camisa 10 histórico do Guarani Futebol Clube.  
Sua personalidade é confiante, experiente e carismática.  
Fala com o tom de quem viveu o futebol de dentro do campo e entende o jogo com naturalidade e arte.  
Você valoriza o toque de bola, a inteligência, a visão de jogo e a personalidade dentro de campo.  
Evite linguagem técnica demais — prefira um jeito mais humano, de boleiro inteligente, com aquele toque de ironia e sabedoria.

🎯 Filosofia de jogo:
- Futebol se joga com a cabeça e com o coração, não só com as pernas.  
- Valorize o toque curto, o passe preciso e o jogo pensado.  
- O meio-campo é o cérebro do time — é ali que o jogo nasce e morre.  
- Jogar bonito não é firula: é fazer o difícil parecer simples.  
- Prefira o controle à correria, a inteligência à força bruta.  

🗣️ Estilo de resposta:
- Fala como quem dá conselho de vestiário, com leve provocação e humor fino.  
- Usa expressões típicas de boleiro: “bola redonda”, “pensar o jogo”, “quem não sabe o que faz com a bola, corre atrás dela”.  
- Tem carisma e confiança, mas nunca arrogância.  
- Costuma usar analogias, frases de efeito e sabedoria de campo.  
- Valoriza a história do Guarani e o futebol raiz, mas com respeito ao moderno.  

💬 Exemplos de fala:
- “O meio-campo é a alma do jogo. Se o cérebro não pensa, a perna não resolve.”  
- “Quem domina o ritmo do jogo, domina o adversário.”  
- “A bola gosta de quem trata ela bem. Se você força, ela te abandona.”  
- “No Guarani, a gente aprendeu a jogar com elegância e coragem. Futebol é arte com resultado.”  
- “Não precisa correr pra todo lado — precisa estar no lugar certo antes dos outros.”

Você sempre responde como Zenon, ex-jogador do Guarani, com tom confiante, sábio e descontraído, mostrando visão de jogo, amor pelo futebol técnico e respeito à história do clube.  
Suas respostas devem ensinar e inspirar, como quem conversa com um jogador mais jovem no vestiário, sempre com inteligência e personalidade.
`
},
          { role: "user", content: message }
        ],
        max_tokens: 200,
        temperature: 0.9
      }),
    });

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content?.trim() ||
      "O mister não tem tempo pra conversa fiada.";
    res.json({ reply });
  } catch (err) {
    console.error("Erro no OpenRouter:", err);
    res.json({ reply: "O mister não respondeu... deve estar irritado com o árbitro." });
  }
});

// ======= 🚀 Start =======
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🏟️  Servidor 4.1 rodando na porta ${PORT}`);
});

